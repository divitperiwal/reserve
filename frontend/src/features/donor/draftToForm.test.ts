import { describe, expect, it } from 'vitest';
import { draftToForm } from './draftToForm';

const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);

describe('draftToForm', () => {
  it('fills only the fields the draft contains', () => {
    expect(draftToForm({ title: ' Veg biryani ', quantity: 12 }, NOW)).toEqual({ title: 'Veg biryani', quantity: 12 });
    expect(draftToForm({}, NOW)).toEqual({});
  });

  it('turns minutes into ISO times counted from now', () => {
    const patch = draftToForm({ bestBeforeMinutes: 240, pickupFromMinutes: 0, pickupUntilMinutes: 90 }, NOW);
    expect(patch.bestBefore).toBe('2026-11-16T16:00:00.000Z');
    expect(patch.pickupFrom).toBe('2026-11-16T12:00:00.000Z');
    expect(patch.pickupUntil).toBe('2026-11-16T13:30:00.000Z');
  });

  it('keeps values inside the form limits and never sets safety checks', () => {
    const patch = draftToForm({ quantity: 0.2, title: 'x'.repeat(120), pickupFromMinutes: -30 }, NOW);
    expect(patch.quantity).toBe(1);
    expect(patch.title).toHaveLength(80);
    expect(patch.pickupFrom).toBe('2026-11-16T12:00:00.000Z');
    expect('checks' in patch).toBe(false);
  });

  it('carries diet, category, unit and note', () => {
    expect(draftToForm({ diet: 'NON_VEG', category: 'BAKERY', unit: 'PACKS', note: 'Contains nuts' }, NOW)).toEqual({
      diet: 'NON_VEG',
      category: 'BAKERY',
      unit: 'PACKS',
      note: 'Contains nuts',
    });
  });
});
