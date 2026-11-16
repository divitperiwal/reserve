import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { ButtonLink, Skeleton } from '../../components/ui';
import { Panel } from '../../components/dash';
import { api } from '../../lib/api';
import { num } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { kgText } from '../../lib/impact';
import type { MyStats } from '../../lib/types';
import s from './impact.module.css';

export function ImpactCard({ mealsLabel }: { mealsLabel: string }) {
  const t = useT();
  const [stats, setStats] = useState<MyStats | null>(null);
  useEffect(() => {
    api.myStats().then(setStats).catch(() => setStats(null));
  }, []);
  const all = stats?.allTime;

  return (
    <Panel title={t('All-time impact')}>
      <dl className={s.totals}>
        <div>
          <dt>{mealsLabel}</dt>
          <dd>{all ? num(all.meals) : <Skeleton w={56} h={28} />}</dd>
        </div>
        <div>
          <dt>{t('Food')}</dt>
          <dd>{all ? kgText(all.foodKg) : <Skeleton w={72} h={28} />}</dd>
        </div>
        <div>
          <dt>{t('CO₂e avoided')}</dt>
          <dd>{all ? kgText(all.co2Kg) : <Skeleton w={72} h={28} />}</dd>
        </div>
      </dl>
      <ButtonLink to="/certificate" variant="tinted" block icon={<Award size={18} strokeWidth={2} aria-hidden />}>
        {t('Download certificate')}
      </ButtonLink>
    </Panel>
  );
}
