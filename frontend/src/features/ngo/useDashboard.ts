import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useStream } from '../../lib/stream';
import type { DashboardStats } from '../../lib/types';

export type Days = 7 | 30;

// Fetch dashboard stats and refetch (debounced) whenever a delivery lands
export function useDashboard(days: Days) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [tick, setTick] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setPending(true);
    api
      .dashboard(days)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setPending(false));
    return () => {
      alive = false;
    };
  }, [days, tick]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useStream({
    activity: (a) => {
      if (a.type !== 'DELIVERED' && a.type !== 'EXPIRED' && a.type !== 'POSTED') return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(refresh, 1500);
    },
  });

  return { data, error, pending, refresh };
}

export const asPct = (v: number) => (v <= 1 && v > 0 ? v * 100 : v);

export function weight(kg: number): [string, string] {
  return kg >= 1000 ? [(kg / 1000).toFixed(1), 't'] : [String(Math.round(kg)), 'kg'];
}
