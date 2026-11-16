import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { ButtonLink, Button, LogoMark } from '../../components/ui';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { num } from '../../lib/format';
import { kgText, longDate, roleWording } from '../../lib/impact';
import type { MyStats } from '../../lib/types';
import s from './impact.module.css';

export default function CertificatePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [today] = useState(() => new Date());

  useEffect(() => {
    api.myStats().then(setStats).catch(() => setFailed(true));
  }, []);

  if (!user) return null;
  const all = stats?.allTime;
  if (!all) {
    return <p className={s.state}>{failed ? 'Couldn’t load your certificate. Try again later.' : 'Preparing your certificate'}</p>;
  }

  return (
    <div className={s.sheet}>
      <div className={s.toolbar}>
        <ButtonLink to={homeFor(user.role)} variant="secondary" icon={<ArrowLeft size={18} strokeWidth={2} aria-hidden />}>
          Back
        </ButtonLink>
        <Button icon={<Printer size={18} strokeWidth={2} aria-hidden />} onClick={() => window.print()}>
          Save as PDF
        </Button>
      </div>

      <article className={s.cert} aria-label="Impact certificate">
        <span className={s.mark}>
          <LogoMark size={36} />
          ReServe
        </span>
        <p className={s.kicker}>Certificate of impact</p>
        <h1 className={s.name}>{user.name}</h1>
        <p className={s.role}>{roleWording[user.role]}</p>
        <h2 className={s.title}>Helped rescue surplus food for people who need it</h2>
        <dl className={s.figures}>
          <div>
            <dt>Meals</dt>
            <dd>{num(all.meals)}</dd>
          </div>
          <div>
            <dt>Food rescued</dt>
            <dd>{kgText(all.foodKg)}</dd>
          </div>
          <div>
            <dt>CO₂e avoided</dt>
            <dd>{kgText(all.co2Kg)}</dd>
          </div>
        </dl>
        <p className={s.foot}>
          <span>Member since {longDate(all.since)}</span>
          <span>Issued {longDate(today)}</span>
        </p>
      </article>
    </div>
  );
}
