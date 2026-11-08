import { createServerFn, getRequest } from '@tanstack/react-start';
import { z } from 'zod';
import type { MediaAnalysis } from './media';

const Frame = z.string().max(2_800_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/);
const Frames = z.array(Frame).min(1).max(3).refine(files => files.reduce((n, f) => n + f.length, 0) <= 7_500_000, 'Combined media is too large.');
type Result = { ok: true; analysis: MediaAnalysis } | { ok: false; error: string };

function failure(e: unknown): Result {
  const status = (e as { statusCode?: number; status?: number }).statusCode ?? (e as { status?: number }).status;
  console.error('cargo media AI error', status, e);
  if (status === 429) return { ok: false, error: 'The media reviewer is busy. Try again in a minute.' };
  if (status === 402) return { ok: false, error: 'AI credits have run out. Add credits in workspace billing to continue.' };
  if (status === 403) return { ok: false, error: 'AI media access is not enabled for this workspace.' };
  return { ok: false, error: 'This media could not be reviewed. Use a clear, well-lit close-up and try again.' };
}

async function analyze(mode: 'quote' | 'driver', frames: string[]): Promise<Result> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) return { ok: false, error: 'AI media review is not configured.' };
  try {
    const [{ analyzeCargoMedia }, { getLovableAiGatewayRunId }] = await Promise.all([import('./media.server'), import('./ai-run-id.server')]);
    return { ok: true, analysis: await analyzeCargoMedia({ apiKey, mode, frames, runId: getLovableAiGatewayRunId(getRequest()) }) };
  } catch (e) { return failure(e); }
}

/** Public quote assistance. Bounded to three compressed frames; media and results are not saved. */
export const analyzeQuoteMedia = createServerFn({ method: 'POST' })
  .inputValidator(i => z.object({ frames: Frames }).parse(i))
  .handler(({ data }) => analyze('quote', data.frames));

/** Driver-only review using the same revocable job capability as the dispatch pass. */
export const analyzeDriverMedia = createServerFn({ method: 'POST' })
  .inputValidator(i => z.object({ token: z.string().uuid(), frames: Frames }).parse(i))
  .handler(async ({ data }): Promise<Result> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const access = await supabaseAdmin.rpc('authorize_operations_driver', { _token: data.token });
    if (access.error || !access.data) return { ok: false, error: 'Dispatch pass expired or revoked.' };
    return analyze('driver', data.frames);
  });
