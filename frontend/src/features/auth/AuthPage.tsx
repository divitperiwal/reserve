import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { LanguageSwitch, Logo, Segmented } from '../../components/ui';
import { homeFor, useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { parseRole } from './authUtils';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';
import s from './AuthPage.module.css';

const mosaic = ['biryani', 'idli', 'bread', 'meals', 'paneer', 'vegetables', 'curd-rice', 'cake', 'chapati'];

const stats = [
  { value: '12,400', label: 'meals rescued' },
  { value: '38', label: 'kitchens' },
  { value: '210', label: 'volunteers' },
];

// Photo mosaic with the promise and static impact numbers
function BrandPanel() {
  const t = useT();
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
          <p className={s.promise}>{t('Good food should reach a plate, not a bin.')}</p>
          <p className={s.promiseSub}>{t('Donors post surplus, volunteers deliver it, kitchens serve it.')}</p>
        </div>
        <dl className={s.stats}>
          {stats.map(({ value, label }) => (
            <div key={label} className={s.stat}>
              <dt>{t(label)}</dt>
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
  const t = useT();
  const [params] = useSearchParams();
  const initialRole = parseRole(params.get('role'));
  const [tab, setTab] = useState<'in' | 'up'>(initialRole ? 'up' : 'in');

  if (loading) return null;
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div className={s.page}>
      <main className={s.pane}>
        <div className={s.column}>
          <div className={s.langRow}>
            <LanguageSwitch compact />
          </div>
          <div className={s.head}>
            <h1 className={s.title}>{t(tab === 'in' ? 'Welcome back' : 'Join ReServe')}</h1>
            <p className={s.sub}>{t(tab === 'in' ? 'Sign in to pick up where you left off.' : 'It takes about a minute.')}</p>
          </div>
          <Segmented
            block
            label={t('Account')}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'in', label: t('Sign in') },
              { value: 'up', label: t('Create account') },
            ]}
          />
          {tab === 'in' ? <SignIn /> : <SignUp initialRole={initialRole} />}
          <a className={s.credit} href="/food/credits.html" target="_blank" rel="noreferrer">
            {t('Food photos from Wikimedia Commons')}
          </a>
        </div>
      </main>
      <BrandPanel />
    </div>
  );
}
