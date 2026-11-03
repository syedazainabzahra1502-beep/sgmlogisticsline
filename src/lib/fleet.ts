import type { Tables } from '@/integrations/supabase/types';

export type FleetAsset = Tables<'fleet_assets'>;
export type ExpiryState = 'expired' | 'due' | 'valid' | 'unknown';

/** Days until a document expires, measured in whole Dubai calendar days. */
export function daysLeft(expires: string | null, now: number): number | null {
  if (!expires) return null;
  const today = new Date(new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' })).getTime();
  return Math.round((Date.parse(expires) - today) / 86400000);
}

/** Expired = past date; due = within 30 days (renewal window); valid otherwise. */
export function expiryState(expires: string | null, now: number): ExpiryState {
  const d = daysLeft(expires, now);
  if (d === null) return 'unknown';
  if (d < 0) return 'expired';
  if (d <= 30) return 'due';
  return 'valid';
}
