import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { PublicStats } from '../../lib/types';

export type StatsState = { status: 'loading' } | { status: 'ok'; data: PublicStats } | { status: 'error' };

export function usePublicStats(): StatsState {
  const [state, setState] = useState<StatsState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    api
      .publicStats()
      .then((data) => alive && setState({ status: 'ok', data }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
