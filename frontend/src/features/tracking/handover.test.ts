import { describe, expect, it } from 'vitest';
import { formatHandover, parseHandover } from './handover';

describe('handover payload', () => {
  it('formats id and code', () => {
    expect(formatHandover(42, '0731')).toBe('reserve:42:0731');
  });

  it('round trips through parse', () => {
    expect(parseHandover(formatHandover(42, '0731'))).toEqual({ donationId: 42, code: '0731' });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseHandover(' reserve:7:1234\n')).toEqual({ donationId: 7, code: '1234' });
  });

  it('rejects anything else', () => {
    for (const bad of ['', 'hello', 'reserve:7', 'reserve:x:1234', 'reserve:7:123', 'reserve:7:12345', 'other:7:1234']) {
      expect(parseHandover(bad)).toBeNull();
    }
  });
});
