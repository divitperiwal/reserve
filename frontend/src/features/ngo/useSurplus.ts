import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { SurplusMap } from '../../lib/types';

// Load the surplus map; skipped while disabled so the map only fetches history once it is switched on
export function useSurplus(days: number, enabled = true) {
  const [data, setData] = useState<SurplusMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api
      .surplus(days)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [days, enabled]);

  return { data, error };
}
