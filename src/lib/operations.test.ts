import { describe, it, expect } from 'vitest';
import { margin, routeHazards, loadClass, pretripComplete, PRETRIP, axlePlan, exposure, weatherReview, DetailsSchema } from './operations';
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
  it('computes margin on revenue before VAT and flags losses', () => {
    expect(margin(10000, [3000, 2000])).toEqual({ revenue: 10000, cost: 5000, net: 5000, pct: 50, loss: false });
    expect(margin(1000, [1500]).loss).toBe(true);
    expect(margin(0, [100]).pct).toBeNull();
  });
  it('flags route hazards at the planning triggers', () => {
    expect(routeHazards({ weight: 30, width: 3, height: 3.5, length: 12 })).toEqual([]);
    expect(routeHazards({ weight: 30, width: 3.6, height: 3.5, length: 12 })).toHaveLength(1);
    expect(routeHazards({ weight: 70, tare: 15, width: 3, height: 5.2, length: 30 })).toHaveLength(4);
    expect(loadClass({ weight: 90, width: 3, height: 3, length: 10 })).toMatch(/modular/);
    expect(loadClass({ weight: 0, width: 0, height: 0, length: 0 })).toBeNull();
  });
  it('requires every pre-trip item before delivery', () => {
    expect(pretripComplete(PRETRIP.map(() => true))).toBe(true);
    expect(pretripComplete(PRETRIP.map((_, i) => i > 0))).toBe(false);
  });
});
