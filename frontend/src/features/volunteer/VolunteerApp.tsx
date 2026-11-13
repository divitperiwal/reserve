import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { VolunteerContext, type VolunteerState } from './context';
import { useActivePickupState } from './hooks';
import { Shell } from './Shell';
import TaskPage from './TaskPage';
import f from './rider.module.css';

const ImpactPage = lazy(() => import('./ImpactPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const ActivePickupPage = lazy(() => import('./ActivePickupPage'));

export default function VolunteerApp() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { active, setActive, loaded } = useActivePickupState(user!.id);
  const [skipped, setSkipped] = useState<number[]>([]);

  const setOnDuty = useCallback(
    async (on: boolean) => {
      const prev = user!;
      setUser({ ...prev, onDuty: on });
      try {
        setUser(await api.updateMe({ onDuty: on }));
        toast(on ? 'You’re online' : 'You’re offline');
      } catch (e) {
        setUser(prev);
        toast((e as Error).message, { error: true });
      }
    },
    [user, setUser, toast],
  );

  const updateProfile = useCallback(
    async (patch: { name?: string; vehicle?: string }) => {
      try {
        setUser(await api.updateMe(patch));
        toast('Saved');
        return true;
      } catch (e) {
        toast((e as Error).message, { error: true });
        return false;
      }
    },
    [setUser, toast],
  );

  const value = useMemo<VolunteerState | null>(
    () => (user ? { user, active, activeLoaded: loaded, setActive, skipped, setSkipped, setOnDuty, updateProfile } : null),
    [user, active, loaded, setActive, skipped, setSkipped, setOnDuty, updateProfile],
  );

  if (!value) return null;
  return (
    <VolunteerContext.Provider value={value}>
      <div className={f.frame}>
        <div className={f.phone}>
          <Suspense fallback={null}>
            <Routes>
          <Route path="pickup/:id" element={<ActivePickupPage />} />
          <Route element={<Shell />}>
            <Route index element={<TaskPage />} />
            <Route path="impact" element={<ImpactPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/volunteer" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </VolunteerContext.Provider>
  );
}
