import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireRole } from './lib/auth';
import { ToastProvider } from './components/ui';
import { I18nProvider } from './lib/i18n';

const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const AuthPage = lazy(() => import('./features/auth/AuthPage'));
const VolunteerApp = lazy(() => import('./features/volunteer/VolunteerApp'));
const DonorApp = lazy(() => import('./features/donor/DonorApp'));
const NgoApp = lazy(() => import('./features/ngo/NgoApp'));
const TrackPage = lazy(() => import('./features/tracking/TrackPage'));
const LeaderboardPage = lazy(() => import('./features/leaderboard/LeaderboardPage'));
const CertificatePage = lazy(() => import('./features/impact/CertificatePage'));

export default function App() {
  return (
    <I18nProvider>
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
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/certificate" element={<RequireRole roles={['DONOR', 'NGO', 'VOLUNTEER']}><CertificatePage /></RequireRole>} />
                <Route path="*"element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </I18nProvider>
  );
}
