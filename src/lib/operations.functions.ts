import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import { documents, type Job, type Pod } from './operations';

const Token = z.object({ token: z.string().uuid() });
export const trackJob = createServerFn({ method: 'GET' }).inputValidator(i => Token.parse(i)).handler(async ({ data }) => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const url = process.env['SUPABASE_URL'];
  if (!key || !url) throw new Error('Tracking unavailable.');
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const h = new Headers(init?.headers); if (h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization'); h.set('apikey', key); return fetch(input, { ...init, headers: h });
  } } });
  const result = await client.rpc('read_operations_tracking', { _token: data.token });
  if (result.error) throw new Error('Tracking unavailable.');
  return result.data as { reference: string; origin: string; destination: string; stage: string; milestones: { stage: string; at: string }[]; updated_at: string } | null;
});

export const driverJob = createServerFn({ method: 'GET' }).inputValidator(i => Token.parse(i)).handler(async ({ data }) => {
  // Capability token grants narrowly scoped access to this job, never to other owner data.
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const result = await supabaseAdmin.rpc('authorize_operations_driver', { _token: data.token });
  if (result.error || !result.data) return null;
  const j = result.data as unknown as Job;
  const files = await Promise.all(documents(j.documents).map(async f => {
    if (!f.path.startsWith(`${j.user_id}/${j.id}/`)) return null;
    const r = await supabaseAdmin.storage.from('dispatch-documents').createSignedUrl(f.path, 300);
    return r.data ? { name: f.name, kind: f.kind, url: r.data.signedUrl } : null;
  }));
  return { reference: j.reference, origin: j.origin, destination: j.destination, stage: j.stage, details: j.details, delivered: Boolean(j.pod), files: files.filter(f => f !== null) };
});

const Image = z.string().max(4200000).regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/);
export const completeDelivery = createServerFn({ method: 'POST' }).inputValidator(i => z.object({ token: z.string().uuid(), receiver: z.string().trim().min(2).max(200), remarks: z.string().max(2000), signature: Image, photos: z.array(Image).length(2) }).parse(i)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const r = await supabaseAdmin.rpc('authorize_operations_driver', { _token: data.token });
  if (r.error || !r.data) throw new Error('Dispatch pass expired or revoked.');
  const j = r.data as unknown as Job;
  if (j.pod) throw new Error('Delivery has already been recorded.');
  const paths: string[] = [];
  try {
    for (const [i, image] of [data.signature, ...data.photos].entries()) {
      const comma = image.indexOf(','); const type = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      const decoded = atob(image.slice(comma + 1)); const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
      const isPng = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (bytes.length > 3000000 || (type === 'image/png' ? !isPng : !isJpeg)) throw new Error('Invalid or oversized image.');
      const path = `${j.user_id}/${j.id}/pod-${crypto.randomUUID()}-${i}.${type === 'image/png' ? 'png' : 'jpg'}`;
      const uploaded = await supabaseAdmin.storage.from('dispatch-documents').upload(path, bytes, { contentType: type });
      if (uploaded.error) throw new Error('Photo upload failed. Please retry.');
      paths.push(path);
    }
    const signature = paths[0]; if (!signature) throw new Error('Signature missing.');
    const pod: Pod = { receiver: data.receiver, remarks: data.remarks, at: new Date().toISOString(), signature, photos: paths.slice(1) };
    const saved = await supabaseAdmin.rpc('complete_operations_delivery', { _token: data.token, _pod: pod });
    if (saved.error || !saved.data) throw new Error('Delivery was not saved. Refresh the dispatch pass.');
    return { ok: true };
  } catch (error) {
    if (paths.length) await supabaseAdmin.storage.from('dispatch-documents').remove(paths);
    throw error;
  }
});