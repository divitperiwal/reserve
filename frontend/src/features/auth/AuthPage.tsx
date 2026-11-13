import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Bike, Building2, Store, type LucideIcon } from 'lucide-react';
import { Group, Logo, Row, Segmented, Sheet, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import type { Role } from '../../lib/types';
import { parseRole, readError, useFinishAuth } from './authUtils';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';
import s from './AuthPage.module.css';

const demos: { role: Role; phone: string; name: string; sub: string; icon: LucideIcon }[] = [
  { role: 'DONOR', phone: '9840100001', name: 'Donor', sub: 'Post surplus food', icon: Store },
  { role: 'VOLUNTEER', phone: '9840100002', name: 'Volunteer', sub: 'Claim and deliver pickups', icon: Bike },
  { role: 'NGO', phone: '9840100003', name: 'NGO', sub: 'Receive deliveries', icon: Building2 },
];

const mosaic = ['biryani', 'idli', 'bread', 'meals', 'paneer', 'vegetables', 'curd-rice', 'cake', 'chapati'];

const stats = [
  { value: '12,400', label: 'meals rescued' },
  { value: '38', label: 'kitchens' },
  { value: '210', label: 'volunteers' },
];

// Photo mosaic with the promise and static impact numbers
function BrandPanel() {
  return (
    <aside className={s.brand}>
      <div className={s.mosaic} aria-hidden>
        {mosaic.map((name, i) => (
          <img key={name} src={`/food/${name}.jpg`} alt="" draggable={false} loading={i < 4 ? 'eager' : 'lazy'} />
        ))}
      </div>
      <div className={s.brandBody}>
        <Logo className={s.brandLogo} size={32} />
        <div className={s.pitch}>
          <p className={s.promise}>Good food should reach a plate, not a bin.</p>
          <p className={s.promiseSub}>Donors post surplus, volunteers deliver it, kitchens serve it.</p>
        </div>
        <dl className={s.stats}>
          {stats.map(({ value, label }) => (
            <div key={label} className={s.stat}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}

export default function AuthPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const initialRole = parseRole(params.get('role'));
  const [tab, setTab] = useState<'in' | 'up'>(initialRole ? 'up' : 'in');
  const [demoOpen, setDemoOpen] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div className={s.page}>
      <main className={s.pane}>
        <div className={s.column}>
          <div className={s.head}>
            <h1 className={s.title}>{tab === 'in' ? 'Welcome back' : 'Join ReServe'}</h1>
            <p className={s.sub}>{tab === 'in' ? 'Sign in to pick up where you left off.' : 'It takes about a minute.'}</p>
          </div>
          <Segmented
            block
            label="Account"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'in', label: 'Sign in' },
              { value: 'up', label: 'Create account' },
            ]}
          />
          {tab === 'in' ? <SignIn /> : <SignUp initialRole={initialRole} />}
          <button type="button" className={s.demo} onClick={() => setDemoOpen(true)}>
            Try a demo account
          </button>
          <a className={s.credit} href="/food/credits.html" target="_blank" rel="noreferrer">
            Food photos from Wikimedia Commons
          </a>
        </div>
      </main>
      <BrandPanel />
      <DemoSheet open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}

function DemoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const finish = useFinishAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<Role | null>(null);

  const use = async (role: Role, phone: string) => {
    setBusy(role);
    try {
      finish(await api.login(phone, 'reserve123'));
    } catch (err) {
      toast(readError(err).message ?? 'Could not sign in', { error: true });
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Demo accounts">
      <p className={s.sheetLead}>Explore ReServe from each side. Nothing you do here affects real pickups.</p>
      <Group>
        {demos.map(({ role, phone, name, sub, icon: Icon }) => (
          <Row
            key={role}
            leading={
              <span className={s.demoIcon}>
                <Icon size={20} strokeWidth={1.75} aria-hidden />
              </span>
            }
            title={name}
            subtitle={busy === role ? 'Signing in' : sub}
            onClick={() => !busy && use(role, phone)}
          />
        ))}
      </Group>
    </Sheet>
  );
}
