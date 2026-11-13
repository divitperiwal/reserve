import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CircleUserRound, House, List, Plus } from 'lucide-react';
import { AppShell } from '../../components/shell/AppShell';
import { useAuth } from '../../lib/auth';
import { DonorDataProvider, useDonorData } from './DonorData';
import { isLive } from './donorKit';
import Home from './Home';
import PostFlow from './PostFlow';
import Donations from './Donations';
import Profile from './Profile';

function Shell() {
  const { user } = useAuth();
  const { items } = useDonorData();
  const posting = useLocation().pathname.startsWith('/donor/new');
  const live = items?.filter(isLive).length ?? 0;
  return (
    <AppShell
      home="/donor"
      hideTabs={posting}
      nav={[
        { to: '/donor', label: 'Home', icon: House, end: true },
        { to: '/donor/new', label: 'Post food', icon: Plus },
        { to: '/donor/donations', label: 'Donations', icon: List, count: live },
        { to: '/donor/profile', label: 'Profile', icon: CircleUserRound },
      ]}
      account={user ? { initials: user.initials, name: user.name, sub: user.orgType ?? 'Donor', to: '/donor/profile' } : undefined}
    >
      <Routes>
        <Route index element={<Home />} />
        <Route path="new" element={<PostFlow />} />
        <Route path="donations" element={<Donations />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/donor" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function DonorApp() {
  return (
    <DonorDataProvider>
      <Shell />
    </DonorDataProvider>
  );
}
