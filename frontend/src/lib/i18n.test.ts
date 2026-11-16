import { describe, expect, it } from 'vitest';
import { shownError } from './api';
import { unitName } from './format';
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

  it('has the same keys in both dictionaries', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(ta).sort());
  });

  it('translates browser-raised errors and leaves server messages alone', () => {
    const t = (text: string, vars?: Record<string, string | number>) => translate('ta', text, vars, { 'Upload failed': 'பதிவேற்றம் தோல்வி', 'Request failed ({status})': 'கோரிக்கை தோல்வி ({status})' });
    expect(shownError('Upload failed', t)).toBe('பதிவேற்றம் தோல்வி');
    expect(shownError('Request failed (502)', t)).toBe('கோரிக்கை தோல்வி (502)');
    expect(shownError('Phone already registered', t)).toBe('Phone already registered');
  });

  it('keeps kg untranslated and uses the singular for one', () => {
    const t = (text: string) => `<${text}>`;
    expect(unitName('KG', t, 1)).toBe('kg');
    expect(unitName('PACKS', t, 1)).toBe('<pack>');
    expect(unitName('PACKS', t, 3)).toBe('<packs>');
  });

  it('has a ta and hi entry for every t() string in the source', () => {
    const files = import.meta.glob(['../**/*.{ts,tsx}', '!../locales/**', '!../**/*.test.*'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const local = new Set(['bestBefore', 'pickupFrom', 'pickupUntil']);
    const keys = new Set<string>();
    for (const src of Object.values(files)) {
      for (const call of src.matchAll(/\b(?:t|tr)\(/g)) {
        let depth = 1;
        let quote = '';
        let i = call.index + call[0].length;
        const start = i;
        // First argument only: stop at the top-level comma, skipping commas inside strings
        for (; i < src.length; i++) {
          const c = src[i]!;
          if (quote) {
            if (c === '\\') i++;
            else if (c === quote) quote = '';
          } else if (c === "'" || c === '"') quote = c;
          else if (c === '(') depth++;
          else if (c === ')' && --depth === 0) break;
          else if (c === ',' && depth === 1) break;
        }
        const arg = src.slice(start, i);
        for (const m of arg.matchAll(/(^|[?:]|\?\?|\|\|)\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) keys.add((m[2] ?? m[3])!.replaceAll("\\'", "'"));
      }
    }
    expect(keys.size).toBeGreaterThan(300);
    for (const key of keys) {
      if (local.has(key)) continue;
      expect(ta, key).toHaveProperty([key]);
      expect(hi, key).toHaveProperty([key]);
    }
  });
});
