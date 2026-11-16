import { describe, expect, it } from 'vitest';
import { pointRadius, slotWords } from './forecast';

const at = (h: number, m = 0) => new Date(2026, 10, 21, h, m).toISOString();

describe('forecast words', () => {
  it('writes the day and the time window', () => {
    expect(slotWords(at(20), at(23))).toBe('Sat 8 pm to 11 pm');
    expect(slotWords(at(9), at(12))).toBe('Sat 9 am to 12 pm');
    expect(slotWords(at(21), new Date(2026, 10, 22, 0).toISOString())).toBe('Sat 9 pm to 12 am');
  });

  it('keeps minutes when the slot is not on the hour', () => {
    expect(slotWords(at(18, 30), at(21, 30))).toBe('Sat 6:30 pm to 9:30 pm');
  });

  it('grows the circle with the square root of the weight, within bounds', () => {
    expect(pointRadius(0)).toBe(5);
    expect(pointRadius(16)).toBe(14);
    expect(pointRadius(100000)).toBe(28);
  });
});
