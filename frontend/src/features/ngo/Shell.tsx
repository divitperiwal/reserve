import type { ReactNode } from 'react';
import { ChartColumn, CircleUserRound, House, Map as MapIcon, Truck } from 'lucide-react';
import { AppShell } from '../../components/shell/AppShell';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { useOnTheWay } from './useDeliveries';

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { list } = useOnTheWay();
  const t = useT();
  return (
    <AppShell
      home="/ngo"
      nav={[
        { to: '/ngo', label: t('Today'), icon: House, end: true, count: list.length },
        { to: '/ngo/deliveries', label: t('Deliveries'), icon: Truck },
        { to: '/ngo/insights', label: t('Insights'), icon: ChartColumn },
        { to: '/ngo/map', label: t('Map'), icon: MapIcon, tab: false },
        { to: '/ngo/profile', label: t('Profile'), icon: CircleUserRound },
      ]}
      account={user ? { initials: user.initials, name: user.name, sub: t(user.orgType ?? 'NGO'), to: '/ngo/profile' } : undefined}
    >
      {children}
    </AppShell>
  );
}
