import { z } from 'zod';
import type { Json, Tables } from '@/integrations/supabase/types';

export const STAGES = ['planned', 'gate_checked_in', 'escort_attached', 'in_transit', 'delivered'] as const;
export const stageLabel = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
export const DetailsSchema = z.object({
  pickup: z.string().default(''), endTime: z.string().default(''), consignee: z.string().default(''), bl: z.string().default(''),
  driverPhone: z.string().default(''), escortPhone: z.string().default(''), rta: z.string().default(''), dot: z.string().default(''), token: z.string().default(''), customs: z.string().default(''),
  cargo: z.string().default(''), notes: z.string().default(''), route: z.string().default(''),
  weight: z.number().nonnegative().default(0), tare: z.number().nonnegative().default(0), length: z.number().nonnegative().default(0), width: z.number().nonnegative().default(0), height: z.number().nonnegative().default(0),
  lineLimit: z.number().nonnegative().default(0), plannedLines: z.number().nonnegative().default(0),
  routeVerified: z.boolean().default(false), escortVerified: z.boolean().default(false), utilitiesVerified: z.boolean().default(false),
  freeUntil: z.string().default(''), detentionUntil: z.string().default(''), dailyStorage: z.number().nonnegative().default(0), dailyDetention: z.number().nonnegative().default(0),
  wind: z.number().nonnegative().default(0), visibility: z.number().nonnegative().default(0), windLimit: z.number().nonnegative().default(0), visibilityLimit: z.number().nonnegative().default(0), weatherSource: z.string().default(''), weatherTime: z.string().default(''), weatherHold: z.boolean().default(false),
  trn: z.string().default(''), quoteDays: z.number().int().min(1).max(365).default(14), mobilization: z.number().nonnegative().default(0), quoteTerms: z.string().default('Subject to route survey, authority approvals and equipment availability. Cancellation and waiting charges require written agreement.'),
  items: z.array(z.object({ id: z.string(), name: z.string(), price: z.number().nonnegative(), unit: z.string(), qty: z.number().int().positive() })).default([]),
});
export type Details = z.infer<typeof DetailsSchema>;
export type Job = Tables<'operations_jobs'>;
export type Document = { path: string; name: string; kind: string; at: string };
export type Pod = { receiver: string; remarks: string; at: string; signature: string; photos: string[] };
export const readDetails = (j: Job) => DetailsSchema.parse(j.details);
export function documents(value: Json): Document[] { return z.array(z.object({ path: z.string(), name: z.string(), kind: z.string(), at: z.string() })).parse(value); }
export function axlePlan(cargo: number, tare: number, limit: number, lines: number) {
  if (cargo <= 0 || tare < 0 || limit <= 0) return null;
  const gross = cargo + tare;
  const required = Math.ceil(gross / limit);
  return { gross, required, perLine: lines > 0 ? gross / lines : null, sufficient: lines >= required };
}
export function exposure(until: string, rate: number, now: number) {
  const deadline = Date.parse(until);
  if (!until || !Number.isFinite(deadline)) return null;
  const hours = (deadline - now) / 3600000;
  const days = Math.max(0, Math.ceil(-hours / 24));
  return { hours, days, cost: days * rate };
}
export function weatherReview(d: Details, now: number) {
  if (!d.weatherTime || !d.weatherSource || d.windLimit <= 0 || d.visibilityLimit <= 0) return 'unverified';
  const age = now - Date.parse(d.weatherTime);
  if (!Number.isFinite(age) || age < 0 || age > 3600000) return 'stale';
  return d.weatherHold || d.wind >= d.windLimit || d.visibility < d.visibilityLimit ? 'hold' : 'reviewed';
}
export function driverPacket(j: Job, d: Details, link: string) {
  return `${j.reference} — SGM DISPATCH PACKET\n${j.origin} → ${j.destination}\nCargo: ${d.cargo || 'Not recorded'}\nPickup (GST): ${d.pickup || 'Not recorded'}\nEnd (GST): ${d.endTime || 'Not recorded'}\nWeight: ${d.weight} t; L/W/H: ${d.length}/${d.width}/${d.height} m\nRTA ROW: ${d.rta || 'Not recorded'}\nAbu Dhabi permit: ${d.dot || 'Not recorded'}\ne-Token: ${d.token || 'Not recorded'}\nCustoms: ${d.customs || 'Not recorded'}\nEscort: ${d.escortPhone || 'Not recorded'}\nApproved route: ${d.route || 'Not verified'}\nDocuments & delivery: ${link}\nReview original permits before movement. This packet is not an authority approval.`;
}