import { describe, expect, it } from 'vitest';
import { kgText, longDate, roleWording } from './impact';

describe('impact formatting', () => {
  it('words each role for the certificate', () => {
    expect(roleWording.VOLUNTEER).toBe('Volunteer');
    expect(roleWording.DONOR).toBe('Food donor');
    expect(roleWording.NGO).toBe('Partner kitchen');
  });

  it('shows kilograms with at most one decimal and Indian grouping', () => {
    expect(kgText(12.34)).toBe('12.3 kg');
    expect(kgText(0)).toBe('0 kg');
    expect(kgText(123456.7)).toBe('1,23,456.7 kg');
  });

  it('writes a long date without dashes', () => {
    expect(longDate('2026-03-05T10:00:00Z')).toBe('5 March 2026');
  });
});
