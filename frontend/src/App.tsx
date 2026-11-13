import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireRole } from './lib/auth';
import { ToastProvider } from './components/ui';

const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const AuthPage = lazy(() => import('./features/auth/AuthPage'));
const VolunteerApp = lazy(() => import('./features/volunteer/VolunteerApp'));
const DonorApp = lazy(() => import('./features/donor/DonorApp'));
const NgoApp = lazy(() => import('./features/ngo/NgoApp'));
const TrackPage = lazy(() => import('./features/tracking/TrackPage'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/volunteer/*" element={<RequireRole roles={['VOLUNTEER']}><VolunteerApp /></RequireRole>} />
              <Route path="/donor/*" element={<RequireRole roles={['DONOR']}><DonorApp /></RequireRole>} />
              <Route path="/ngo/*" element={<RequireRole roles={['NGO']}><NgoApp /></RequireRole>} />
              <Route path="/track/:id" element={<RequireRole roles={['DONOR', 'NGO', 'VOLUNTEER']}><TrackPage /></RequireRole>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
