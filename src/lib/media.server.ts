import { createOpenAI } from '@ai-sdk/openai';
import { Output, streamText } from 'ai';
import { createLovableAiGatewayRunIdFetch } from './ai-run-id.server';
import { MediaAnalysisSchema, type MediaAnalysis } from './media';

const INSTRUCTIONS = `You are a careful UAE heavy-haul cargo media review assistant for SGM Global Line Logistics.
Review the supplied photo or sampled video frames. Return only visible observations and explicitly readable markings.
Never estimate weight or dimensions from appearance. Populate weightTonnes or dimensions only when a readable data plate/document explicitly states that exact value; convert explicitly marked lb/ft/in units accurately and mention the conversion in readableMarkings. Never treat GVW, trailer gross weight or axle capacity as cargo weight.
Describe cargo/equipment type cautiously when unclear. Record manufacturer, model and serial only when readable.
For condition and securing, describe only visible evidence (for example visible dents, loose chain, missing edge protector or blocked label). Never declare cargo safe, roadworthy, compliant, undamaged or ready to move. Never certify lashings, lifting points, axle loads or permits from media. Recommend a competent physical inspection whenever relevant.
Trailer suggestions are preliminary planning guidance only and must be null when weight/dimensions are unknown. Videos are sampled frames, not continuous footage or audio; state this limitation in the summary when frames are supplied.
Keep every list concise and specific. Use empty arrays where there is no visible evidence. Never invent values.`;

export async function analyzeCargoMedia(input: { apiKey: string; mode: 'quote' | 'driver'; frames: string[]; runId?: string }): Promise<MediaAnalysis> {
  const gateway = createLovableAiGatewayRunIdFetch(input.runId);
  const provider = createOpenAI({
    baseURL: 'https://ai.gateway.lovable.dev/v1',
    apiKey: input.apiKey,
    headers: { 'Lovable-API-Key': input.apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    fetch: gateway.fetch,
  });
  const task = input.mode === 'quote'
    ? 'Extract details useful for a customer quotation and list the information still required. The dispatcher/customer must review every value before applying it.'
    : 'Review visible cargo condition and securing for a driver pre-trip check. Give practical observations for the competent person to verify; do not clear the vehicle for departure.';
  const result = streamText({
    model: provider.responses('openai/gpt-6-astra'),
    instructions: INSTRUCTIONS,
    messages: [{ role: 'user', content: [
      { type: 'text', text: `${task}\n${input.frames.length > 1 ? 'These are sampled frames from one short video.' : 'This is one uploaded/captured photo.'}` },
      ...input.frames.map(frame => ({ type: 'image' as const, image: new URL(frame) })),
    ] }],
    output: Output.object({ schema: MediaAnalysisSchema }),
    maxRetries: 0,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', store: false, include: ['reasoning.encrypted_content'] } },
  });
  return await result.output;
}
