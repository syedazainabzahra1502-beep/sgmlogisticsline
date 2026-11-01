import { describe, it, expect } from 'vitest';
import { axlePlan, exposure, weatherReview, DetailsSchema } from './operations';
describe('Operational calculations', () => {
  it('uses the entered axle-line limit and includes tare', () => {
    expect(axlePlan(85, 19, 13, 8)).toEqual({ gross: 104, required: 8, perLine: 13, sufficient: true });
    expect(axlePlan(85, 19, 10, 8)?.sufficient).toBe(false);
    expect(axlePlan(85, 19, 0, 8)).toBeNull();
  });
  it('counts each started day only after the entered deadline', () => {
    const until = '2026-11-01T00:00:00+04:00';
    expect(exposure(until, 1200, Date.parse(until))?.cost).toBe(0);
    expect(exposure(until, 1200, Date.parse(until) + 1)?.cost).toBe(1200);
    expect(exposure(until, 1200, Date.parse(until) + 86400001)?.cost).toBe(2400);
  });
  it('never treats missing or stale weather as clearance', () => {
    const d = DetailsSchema.parse({});
    expect(weatherReview(d, Date.now())).toBe('unverified');
    const now = Date.parse('2026-11-01T10:00:00Z');
    const fresh = { ...d, weatherTime: '2026-11-01T09:30:00Z', weatherSource: 'Dispatch desk', windLimit: 25, visibilityLimit: 1000, wind: 26, visibility: 5000 };
    expect(weatherReview(fresh, now)).toBe('hold');
    expect(weatherReview(fresh, now + 3600000)).toBe('stale');
  });
});