import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { ButtonLink, Button, LogoMark } from '../../components/ui';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { num } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { kgText, longDate, roleWording } from '../../lib/impact';
import type { MyStats } from '../../lib/types';
import s from './impact.module.css';

export default function CertificatePage() {
  const { user } = useAuth();
  const t = useT();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [today] = useState(() => new Date());

  useEffect(() => {
    api.myStats().then(setStats).catch(() => setFailed(true));
  }, []);

  if (!user) return null;
  const all = stats?.allTime;
  if (!all) {
    return <p className={s.state}>{failed ? t('Couldn’t load your certificate. Try again later.') : t('Preparing your certificate')}</p>;
  }

  return (
    <div className={s.sheet}>
      <div className={s.toolbar}>
        <ButtonLink to={homeFor(user.role)} variant="secondary" icon={<ArrowLeft size={18} strokeWidth={2} aria-hidden />}>
          {t('Back')}
        </ButtonLink>
        <Button icon={<Printer size={18} strokeWidth={2} aria-hidden />} onClick={() => window.print()}>
          {t('Save as PDF')}
        </Button>
      </div>

      <article className={s.cert} aria-label={t('Impact certificate')}>
        <span className={s.mark}>
          <LogoMark size={36} />
          ReServe
        </span>
        <p className={s.kicker}>{t('Certificate of impact')}</p>
        <h1 className={s.name}>{user.name}</h1>
        <p className={s.role}>{t(roleWording[user.role])}</p>
        <h2 className={s.title}>{t('Helped rescue surplus food for people who need it')}</h2>
        <dl className={s.figures}>
          <div>
            <dt>{t('Meals')}</dt>
            <dd>{num(all.meals)}</dd>
          </div>
          <div>
            <dt>{t('Food rescued')}</dt>
            <dd>{kgText(all.foodKg)}</dd>
          </div>
          <div>
            <dt>{t('CO₂e avoided')}</dt>
            <dd>{kgText(all.co2Kg)}</dd>
          </div>
        </dl>
        <p className={s.foot}>
          <span>{t('Member since {date}', { date: longDate(all.since) })}</span>
          <span>{t('Issued {date}', { date: longDate(today) })}</span>
        </p>
      </article>
    </div>
  );
}
