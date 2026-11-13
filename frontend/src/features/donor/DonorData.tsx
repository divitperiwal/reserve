import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { qty } from '../../lib/format';
import { useStream } from '../../lib/stream';
import type { Donation } from '../../lib/types';
import { useToast } from '../../components/ui';
import { firstName } from './donorKit';

interface DonorData {
  items: Donation[] | null;
  error: string | null;
  reload: () => void;
  upsert: (d: Donation) => void;
}

const Ctx = createContext<DonorData | null>(null);

function announce(prev: Donation | undefined, next: Donation) {
  const accepted = `${next.ngo?.name ?? 'A kitchen'} accepted ${qty(next)} of ${next.title}`;
  if (!prev) return next.status === 'ACCEPTED' ? accepted : null;
  if (prev.status === next.status) return null;
  const who = next.volunteer ? firstName(next.volunteer.name) : 'A volunteer';
  if (next.status === 'ACCEPTED') return prev.status === 'CLAIMED' ? `${next.title} needs a new volunteer` : accepted;
  if (next.status === 'CLAIMED') return `${who} claimed your ${next.title}`;
  if (next.status === 'DELIVERED') return `${next.title} was delivered${next.ngo ? ` to ${next.ngo.name}` : ''}`;
  if (next.status === 'EXPIRED') return `${next.title} expired before it was picked up`;
  if (next.status === 'AVAILABLE' && prev.status === 'ACCEPTED') return `${next.title} is waiting for a kitchen again`;
  return null;
}

// Owns the donor's donation list once, so every screen stays in sync with the stream
export function DonorDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Donation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const reload = useCallback(() => {
    setError(null);
    api
      .mine()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(reload, [reload]);

  const upsert = useCallback((d: Donation) => {
    setItems((xs) => {
      if (!xs) return xs;
      return xs.some((x) => x.id === d.id) ? xs.map((x) => (x.id === d.id ? { ...x, ...d } : x)) : [d, ...xs];
    });
  }, []);

  useStream({
    donation: (d) => {
      if (d.donor?.id !== user?.id) return;
      const known = itemsRef.current;
      const msg = known && announce(known.find((x) => x.id === d.id), d);
      if (msg) toast(msg);
      upsert(d);
    },
  });

  const value = useMemo(() => ({ items, error, reload, upsert }), [items, error, reload, upsert]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDonorData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDonorData must be used inside DonorDataProvider');
  return ctx;
}
