import type { ReactNode } from 'react';
import { ChartColumn, CircleUserRound, House, Map as MapIcon, Truck } from 'lucide-react';
import { AppShell } from '../../components/shell/AppShell';
import { useAuth } from '../../lib/auth';
import { useOnTheWay } from './useDeliveries';

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { list } = useOnTheWay();
  return (
    <AppShell
      home="/ngo"
      nav={[
        { to: '/ngo', label: 'Today', icon: House, end: true, count: list.length },
        { to: '/ngo/deliveries', label: 'Deliveries', icon: Truck },
        { to: '/ngo/insights', label: 'Insights', icon: ChartColumn },
        { to: '/ngo/map', label: 'Map', icon: MapIcon, tab: false },
        { to: '/ngo/profile', label: 'Profile', icon: CircleUserRound },
      ]}
      account={user ? { initials: user.initials, name: user.name, sub: user.orgType ?? 'NGO', to: '/ngo/profile' } : undefined}
    >
      {children}
    </AppShell>
  );
}
