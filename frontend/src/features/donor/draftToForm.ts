import type { DonationDraft } from '../../lib/types';
import type { PostValues, TimeKey } from './usePostForm';

const MINUTE = 60_000;
const MAX_MINUTES = 7 * 24 * 60;

export type DraftPatch = Partial<Pick<PostValues, 'title' | 'diet' | 'category' | 'quantity' | 'unit' | 'note' | TimeKey>>;

const atMinutes = (now: number, minutes: number) => new Date(now + Math.min(minutes, MAX_MINUTES) * MINUTE).toISOString();

// Only fields present in the draft are returned, and safety checks are never part of it
export function draftToForm(draft: DonationDraft, now: number): DraftPatch {
  const patch: DraftPatch = {};
  const title = draft.title?.trim();
  if (title) patch.title = title.slice(0, 80);
  if (draft.diet) patch.diet = draft.diet;
  if (draft.category) patch.category = draft.category;
  if (draft.quantity !== undefined && draft.quantity !== null) patch.quantity = Math.max(1, Math.min(9999, Math.round(draft.quantity)));
  if (draft.unit) patch.unit = draft.unit;
  const note = draft.note?.trim();
  if (note) patch.note = note.slice(0, 500);
  const times: [TimeKey, number | undefined][] = [
    ['bestBefore', draft.bestBeforeMinutes],
    ['pickupFrom', draft.pickupFromMinutes],
    ['pickupUntil', draft.pickupUntilMinutes],
  ];
  times.forEach(([key, minutes]) => {
    if (typeof minutes === 'number' && Number.isFinite(minutes)) patch[key] = atMinutes(now, Math.max(0, minutes));
  });
  return patch;
}
