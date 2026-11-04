import { describe, expect, it } from 'vitest';
import { expiryState } from './fleet';

const now = Date.parse('2026-11-03T10:00:00Z'); // 14:00 Dubai, 3 Nov 2026

describe('fleet document expiry', () => {
  it('flags a past date as expired', () => expect(expiryState('2026-11-02', now)).toBe('expired'));
  it('flags 30 days or less as due for renewal', () => expect(expiryState('2026-12-03', now)).toBe('due'));
  it('treats more than 30 days as valid', () => expect(expiryState('2026-12-04', now)).toBe('valid'));
  it('reports missing dates as unknown', () => expect(expiryState(null, now)).toBe('unknown'));
});
