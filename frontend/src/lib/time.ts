import { useEffect, useState } from 'react';
import type { Urgency } from './types';

const HOUR = 3_600_000;

export function urgencyOf(bestBefore: string, now = Date.now()): Urgency {
  const left = new Date(bestBefore).getTime() - now;
  if (left <= 0) return 'EXPIRED';
  if (left < 2 * HOUR) return 'CRITICAL';
  if (left < 6 * HOUR) return 'SOON';
  return 'FRESH';
}

export const urgencyLabel: Record<Urgency, string> = {
  CRITICAL: 'Critical',
  SOON: 'Soon',
  FRESH: 'Fresh',
  EXPIRED: 'Expired',
};

// Share one 1s ticker across every countdown on the page
const subs = new Set<(n: number) => void>();
let timer: number | undefined;
function subscribe(fn: (n: number) => void) {
  subs.add(fn);
  if (!timer) timer = window.setInterval(() => subs.forEach((s) => s(Date.now())), 1000);
  return () => {
    subs.delete(fn);
    if (!subs.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribe(setNow), []);
  return now;
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function shortLeft(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m left`;
  return `${h}h ${String(m).padStart(2, '0')}m left`;
}

export function timeOfDay(iso: string, now = Date.now()): string {
  const d = new Date(iso);
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const today = new Date(now);
  const tomorrow = new Date(now + 24 * HOUR);
  if (d.toDateString() === today.toDateString()) return t;
  if (d.toDateString() === tomorrow.toDateString()) return `${t} tmrw`;
  return `${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${t}`;
}

export function ago(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Fraction of shelf life still remaining, from creation to best-before
export function lifeLeft(createdAt: string, bestBefore: string, now = Date.now()): number {
  const start = new Date(createdAt).getTime();
  const end = new Date(bestBefore).getTime();
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (end - now) / (end - start)));
}
