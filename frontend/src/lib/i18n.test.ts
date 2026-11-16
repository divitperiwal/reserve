import { describe, expect, it } from 'vitest';
import { fill, translate } from './i18n';
import { hi } from '../locales/hi';
import { ta } from '../locales/ta';

describe('translate', () => {
  it('uses the dictionary entry and fills placeholders', () => {
    expect(translate('ta', 'Step {step} of 3', { step: 2 }, { 'Step {step} of 3': 'படி {step} / 3' })).toBe('படி 2 / 3');
  });

  it('falls back to the English text when the key is missing', () => {
    expect(translate('hi', '{n} kitchens nearby', { n: 4 }, {})).toBe('4 kitchens nearby');
    expect(translate('en', 'Sign in')).toBe('Sign in');
  });

  it('leaves unknown placeholders in place', () => {
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}');
    expect(fill('No vars {x}')).toBe('No vars {x}');
  });

  it('keeps every placeholder in both dictionaries', () => {
    const marks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const dict of [ta, hi]) {
      for (const [key, value] of Object.entries(dict)) expect(marks(value), key).toBe(marks(key));
    }
  });
});
