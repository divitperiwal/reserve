import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useNow } from '../../lib/time';
import type { Category, CreateDonation, Diet, Donation, SafetyCheck, Unit, User } from '../../lib/types';
import { dateKey, joinDateTime, roundQuarter, shelfLife, timeKey, weightFor, whenPhrase } from './donorKit';

export interface PostValues {
  title: string;
  diet: Diet;
  category: Category;
  quantity: number;
  unit: Unit;
  photoUrl: string;
  address: string;
  lat: number;
  lng: number;
  note: string;
  bestBefore: string;
  pickupFrom: string;
  pickupUntil: string;
  checks: SafetyCheck[];
}

export type FieldKey = 'title' | 'quantity' | 'address' | 'bestBefore' | 'pickupFrom' | 'pickupUntil' | 'checks';
export type TimeKey = 'bestBefore' | 'pickupFrom' | 'pickupUntil';

export const SAFETY: { key: SafetyCheck; label: string }[] = [
  { key: 'COVERED', label: 'Covered and stored cleanly' },
  { key: 'SAFE_TEMP', label: 'Kept at a safe temperature' },
  { key: 'NO_RETURNS', label: 'Nothing returned from plates' },
  { key: 'ALLERGENS_NOTED', label: 'Allergens noted in the name or note' },
];

export const STEPS = ['What are you donating?', 'How much is there?', 'When should it be picked up?', 'Where is the pickup?', 'Is it safe to share?', 'Review and post'] as const;

const STEP_FIELDS: FieldKey[][] = [['title'], ['quantity'], ['bestBefore', 'pickupFrom', 'pickupUntil'], ['address'], ['checks'], []];
const TIMES: TimeKey[] = ['bestBefore', 'pickupFrom', 'pickupUntil'];
const DRAFT_KEY = 'reserve.donor.draft.v3';
const MIN = 60_000;
const HOUR = 60 * MIN;

// Latest valid pickup end: 30 minutes before best before, or best before itself when the window is shorter
const fixUntil = (from: number, best: number) => new Date(best - 30 * MIN > from ? best - 30 * MIN : best).toISOString();

// Pickup ends 30 minutes before best before, or 3 hours after it starts, whichever is sooner
function suggestUntil(from: string, best: string) {
  if (!from) return '';
  const f = new Date(from).getTime();
  const b = best ? new Date(best).getTime() : Infinity;
  const until = roundQuarter(Math.min(b - 30 * MIN, f + 3 * HOUR), false);
  return new Date(until > f ? until : Number.isFinite(b) ? b : f + HOUR).toISOString();
}

function defaults(user: User | null): PostValues {
  return {
    title: '',
    diet: 'VEG',
    category: 'COOKED',
    quantity: 10,
    unit: 'SERVINGS',
    photoUrl: '',
    address: user?.address ?? '',
    lat: user?.lat ?? 0,
    lng: user?.lng ?? 0,
    note: '',
    bestBefore: '',
    pickupFrom: '',
    pickupUntil: '',
    checks: [],
  };
}

function readDraft(): Partial<PostValues> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<PostValues>) : null;
  } catch {
    return null;
  }
}

function writeDraft(v: PostValues | null) {
  try {
    if (v) localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // storage blocked, the draft just lives in memory
  }
}

// Draft times only carry over while they are still in the future
function restore(base: PostValues, draft: Partial<PostValues>): PostValues {
  const merged: PostValues = { ...base };
  (Object.keys(base) as (keyof PostValues)[]).forEach((k) => {
    if (draft[k] !== undefined) (merged as unknown as Record<string, unknown>)[k] = draft[k];
  });
  TIMES.forEach((k) => {
    merged[k] = draft[k] && new Date(draft[k]!).getTime() > Date.now() ? draft[k]! : base[k];
  });
  return merged;
}

export interface TimingIssue {
  until: string;
  best: string;
  fix: string;
}

function validate(v: PostValues, now: number) {
  const e: Partial<Record<FieldKey, string>> = {};
  let issue: TimingIssue | null = null;
  const title = v.title.trim();
  if (!title) e.title = 'Add a name for the food';
  else if (title.length > 80) e.title = 'Keep the name under 80 characters';
  if (!Number.isInteger(v.quantity) || v.quantity < 1) e.quantity = 'Set at least 1';
  else if (v.quantity > 9999) e.quantity = 'That is more than we can list at once';
  if (!v.address.trim()) e.address = 'Add the pickup address';

  const t = (k: TimeKey) => (v[k] ? new Date(v[k]).getTime() : NaN);
  const best = t('bestBefore');
  const from = t('pickupFrom');
  const until = t('pickupUntil');
  if (Number.isNaN(best)) e.bestBefore = 'Set a best before time';
  else if (best <= now) e.bestBefore = 'Best before has to be later than now';
  if (Number.isNaN(from)) e.pickupFrom = 'Set when pickup can start';
  if (Number.isNaN(until)) e.pickupUntil = 'Set when pickup ends';
  else if (!Number.isNaN(from) && until <= from) e.pickupUntil = 'Pickup has to end after it starts';
  else if (!Number.isNaN(best) && until > best) {
    e.pickupUntil = 'Pickup has to end before best before';
    issue = { until: whenPhrase(until), best: whenPhrase(best), fix: fixUntil(from, best) };
  } else if (until <= now) e.pickupUntil = 'This pickup window has already ended';
  const left = SAFETY.length - v.checks.length;
  if (left > 0) e.checks = left === 1 ? '1 check left' : `${left} checks left`;
  return { errors: e, issue };
}

function mapServerFields(fields: Record<string, string>) {
  const out: Partial<Record<FieldKey, string>> = {};
  Object.entries(fields).forEach(([k, msg]) => {
    if (k === 'safetyChecks') out.checks = msg;
    else if (k === 'lat' || k === 'lng' || k === 'address') out.address = msg;
    else if (k === 'weightKg' || k === 'unit' || k === 'quantity') out.quantity = msg;
    else if (k === 'bestBefore' || k === 'pickupFrom' || k === 'pickupUntil') out[k] = msg;
    else out.title = msg;
  });
  return out;
}

type RepostKey = 'title' | 'diet' | 'category' | 'quantity' | 'unit' | 'photoUrl' | 'address' | 'lat' | 'lng' | 'note';
export type Repost = Pick<PostValues, RepostKey>;

// A repost carries the food details only, so times are autofilled fresh
export const toRepost = (d: Donation): Repost => ({
  title: d.title,
  diet: d.diet,
  category: d.category,
  quantity: d.quantity,
  unit: d.unit,
  photoUrl: d.photoUrl ?? '',
  address: d.address,
  lat: d.lat,
  lng: d.lng,
  note: d.note ?? '',
});

export function usePostForm(user: User | null) {
  const now = useNow();
  const location = useLocation();
  const navigate = useNavigate();
  const repost = (location.state as { repost?: Repost } | null)?.repost;
  const [restored, setRestored] = useState(() => !repost && !!readDraft()?.title);
  const [initial] = useState<PostValues>(() => {
    const base = defaults(user);
    if (repost) return { ...base, ...repost };
    const draft = readDraft();
    return draft ? restore(base, draft) : base;
  });
  const [values, setValues] = useState<PostValues>(initial);
  const edited = useRef(new Set<TimeKey>(TIMES.filter((k) => initial[k])));
  const [autofilled, setAutofilled] = useState<Category | null>(null);
  const [touched, setTouched] = useState<Set<FieldKey>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [server, setServer] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (repost) navigate('.', { replace: true, state: null });
  }, [repost, navigate]);

  useEffect(() => {
    if (!user) return;
    setValues((v) => (v.address ? v : { ...v, address: user.address, lat: user.lat, lng: user.lng }));
  }, [user]);

  useEffect(() => {
    const id = window.setTimeout(() => writeDraft(values), 300);
    return () => window.clearTimeout(id);
  }, [values]);

  const { errors, issue } = useMemo(() => validate(values, now), [values, now]);

  const set = useCallback(<K extends keyof PostValues>(key: K, value: PostValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setServer((sv) => {
      if (!(key in sv)) return sv;
      const next = { ...sv };
      delete next[key as FieldKey];
      return next;
    });
    setFormError(null);
  }, []);

  const setWhen = useCallback((key: TimeKey, iso: string) => {
    edited.current.add(key);
    setValues((v) => {
      const next: PostValues = { ...v, [key]: iso };
      if (key === 'pickupFrom' && !edited.current.has('pickupUntil')) next.pickupUntil = suggestUntil(next.pickupFrom, next.bestBefore);
      if (key === 'bestBefore' && iso && next.pickupFrom && next.pickupUntil) {
        if (!edited.current.has('pickupUntil')) next.pickupUntil = suggestUntil(next.pickupFrom, iso);
        else if (new Date(next.pickupUntil) > new Date(iso)) next.pickupUntil = fixUntil(new Date(next.pickupFrom).getTime(), new Date(iso).getTime());
      }
      return next;
    });
    setServer((sv) => ({ ...sv, [key]: undefined }));
    setFormError(null);
  }, []);

  const setWindow = useCallback((pickupFrom: string, pickupUntil: string) => {
    edited.current.add('pickupFrom').add('pickupUntil');
    setValues((v) => ({ ...v, pickupFrom, pickupUntil }));
    setServer((sv) => ({ ...sv, pickupFrom: undefined, pickupUntil: undefined }));
  }, []);

  const setTime = (key: TimeKey, hhmm: string) => hhmm && setWhen(key, joinDateTime(dateKey(values[key] || Date.now()), hhmm));
  const setDate = (key: TimeKey, date: string) => setWhen(key, joinDateTime(date, timeKey(values[key]) || timeKey(new Date(roundQuarter(Date.now(), true)).toISOString())));

  const autofillTimes = useCallback(() => {
    const t = Date.now();
    const e = edited.current;
    setValues((v) => {
      const pickupFrom = e.has('pickupFrom') ? v.pickupFrom : new Date(roundQuarter(t, true)).toISOString();
      const bestBefore = e.has('bestBefore') ? v.bestBefore : new Date(roundQuarter(t + shelfLife[v.category].hours * HOUR, true)).toISOString();
      const pickupUntil = e.has('pickupUntil') ? v.pickupUntil : suggestUntil(pickupFrom, bestBefore);
      return { ...v, pickupFrom, bestBefore, pickupUntil };
    });
    setAutofilled(TIMES.every((k) => e.has(k)) ? null : values.category);
  }, [values.category]);

  const touch = useCallback((key: FieldKey) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key))), []);

  const error = (key: FieldKey) => {
    const shown = touched.has(key) || (TIMES.includes(key as TimeKey) && !!values[key as TimeKey]);
    return server[key] ?? (shown ? errors[key] : undefined);
  };

  const stepBlocker = (step: number) => {
    const key = STEP_FIELDS[step]?.find((k) => errors[k] || server[k]);
    if (key) return server[key] ?? errors[key]!;
    if (step === STEPS.length - 1 && uploading) return 'Waiting for the photo to upload';
    return null;
  };

  const discardDraft = () => {
    writeDraft(null);
    setValues(defaults(user));
    edited.current.clear();
    setAutofilled(null);
    setRestored(false);
    setTouched(new Set());
  };

  // Posts the donation; on a field error it returns the step to jump back to
  const submit = async (): Promise<{ created?: Donation; step?: number }> => {
    const payload: CreateDonation = {
      title: values.title.trim(),
      diet: values.diet,
      category: values.category,
      quantity: values.quantity,
      unit: values.unit,
      weightKg: Math.round(weightFor(values.quantity, values.unit) * 100) / 100,
      photoUrl: values.photoUrl || undefined,
      note: values.note.trim() || undefined,
      address: values.address.trim(),
      lat: values.lat,
      lng: values.lng,
      bestBefore: values.bestBefore,
      pickupFrom: values.pickupFrom,
      pickupUntil: values.pickupUntil,
      safetyChecks: values.checks,
    };
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await api.createDonation(payload);
      writeDraft(null);
      return { created };
    } catch (err) {
      const fields = err instanceof ApiError && err.fields ? mapServerFields(err.fields) : {};
      setServer(fields);
      const step = STEP_FIELDS.findIndex((keys) => keys.some((k) => fields[k]));
      if (step >= 0) {
        setTouched(new Set(Object.keys(fields) as FieldKey[]));
        return { step };
      }
      setFormError((err as Error).message);
      return {};
    } finally {
      setSubmitting(false);
    }
  };

  return {
    values,
    set,
    setTime,
    setWhen,
    setDate,
    setWindow,
    autofillTimes,
    autofilled,
    touch,
    error,
    issue,
    stepBlocker,
    submitting,
    uploading,
    setUploading,
    formError,
    restored,
    dismissRestored: () => setRestored(false),
    discardDraft,
    submit,
    now,
  };
}

export type PostForm = ReturnType<typeof usePostForm>;
