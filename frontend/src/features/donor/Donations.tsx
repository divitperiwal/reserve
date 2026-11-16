import { useState } from 'react';
import { Plus, Soup } from 'lucide-react';
import { Button, ButtonLink, EmptyState, Segmented, Skeleton } from '../../components/ui';
import { Kpi, KpiRow, Page, Panel, Topbar } from '../../components/dash';
import { num } from '../../lib/format';
import { useT } from '../../lib/i18n';
import type { Donation } from '../../lib/types';
import { DonationSheet } from './DonationSheet';
import { DonationTable } from './DonationTable';
import { useDonorData } from './DonorData';
import { isLive } from './donorKit';
import s from './pages.module.css';

type Filter = 'all' | 'live' | 'delivered' | 'expired';

const matches: Record<Filter, (d: Donation) => boolean> = {
  all: () => true,
  live: isLive,
  delivered: (d) => d.status === 'DELIVERED',
  expired: (d) => d.status === 'EXPIRED',
};
const titles: Record<Filter, string> = { all: 'All donations', live: 'Live donations', delivered: 'Delivered donations', expired: 'Expired donations' };
const empties: Record<Filter, string> = {
  all: 'Food you post shows up here.',
  live: 'Food you post stays here until it’s delivered.',
  delivered: 'Delivered donations land here.',
  expired: 'Nothing has expired. Nice.',
};

export default function Donations() {
  const { items, error, reload } = useDonorData();
  const t = useT();
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<number | null>(null);
  const list = (items ?? []).filter(matches[filter]);
  const delivered = (items ?? []).filter(matches.delivered);
  const live = (items ?? []).filter(isLive);
  const meals = delivered.reduce((a, d) => a + d.meals, 0);
  const open = items?.find((d) => d.id === openId) ?? null;
  const val = (n: number) => (items ? num(n) : '–');

  return (
    <Page>
      <Topbar
        title={t('Donations')}
        subtitle={t('Everything you have posted')}
        actions={
          <ButtonLink to="/donor/new" icon={<Plus size={18} strokeWidth={2.25} aria-hidden />}>
            {t('Post food')}
          </ButtonLink>
        }
      />

      <KpiRow>
        <Kpi label={t('Total posted')} value={val(items?.length ?? 0)} />
        <Kpi label={t('Delivered')} value={val(delivered.length)} />
        <Kpi label={t('Live now')} value={val(live.length)} tone={live.length ? 'basil' : undefined} />
        <Kpi label={t('Meals shared')} value={val(meals)} />
      </KpiRow>

      {!items && error ? (
        <EmptyState icon={Soup} title={t('Couldn’t load your donations')} action={<Button variant="secondary" onClick={reload}>{t('Try again')}</Button>}>
          {error}
        </EmptyState>
      ) : (
        <>
          <div className={s.filters}>
            <Segmented
              label={t('Show')}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('All') },
                { value: 'live', label: t('Live') },
                { value: 'delivered', label: t('Delivered') },
                { value: 'expired', label: t('Expired') },
              ]}
            />
          </div>
          <Panel title={t(titles[filter])} action={items && <span className={s.count}>{list.length}</span>} flush>
            {!items ? (
              <div className={s.skel}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} h={48} r={10} />
                ))}
              </div>
            ) : (
              <DonationTable items={list} onOpen={setOpenId} label={t(titles[filter])} empty={t(empties[filter])} />
            )}
          </Panel>
        </>
      )}

      <DonationSheet d={open} onClose={() => setOpenId(null)} />
    </Page>
  );
}
