import { useState } from 'react';
import { Bike, Map as MapIcon } from 'lucide-react';
import { Badge, Button, ButtonLink, EmptyState, Segmented, Skeleton } from '../../components/ui';
import { Columns, FoodThumb, Page, Panel, SectionHead, Topbar } from '../../components/dash';
import { shownError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { num, qty } from '../../lib/format';
import { useT, type T } from '../../lib/i18n';
import { useStreamStatus } from '../../lib/stream';
import { timeOfDay } from '../../lib/time';
import type { Donation } from '../../lib/types';
import { Arrival } from './Arrival';
import { ConfirmSheet } from './ConfirmSheet';
import { etaMinutes, useDeliveries, useOnTheWay } from './useDeliveries';
import s from './deliveries.module.css';
import c from './today.module.css';

type Filter = 'incoming' | 'received' | 'all';

const PAGE = 25;
const WEEK = 7 * 24 * 3_600_000;
const receivedAt = (d: Donation) => d.deliveredAt ?? d.createdAt;
const isLate = (d: Donation) => !!d.deliveredAt && +new Date(d.deliveredAt) > +new Date(d.bestBefore);

export function Deliveries() {
  const { user } = useAuth();
  const t = useT();
  const live = useStreamStatus();
  const { items } = useDeliveries();
  const { list: incoming, loading, error, reload } = useOnTheWay();
  const [filter, setFilter] = useState<Filter | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [confirming, setConfirming] = useState<Donation | null>(null);
  const kitchen = { lat: user?.lat ?? 0, lng: user?.lng ?? 0 };

  const received = items.filter((d) => d.status === 'DELIVERED').sort((a, b) => +new Date(receivedAt(b)) - +new Date(receivedAt(a)));
  const week = received.filter((d) => Date.now() - +new Date(receivedAt(d)) < WEEK);
  const weekMeals = week.reduce((a, d) => a + d.meals, 0);
  const weekLate = week.filter(isLate).length;
  const shown: Filter = filter ?? 'all';

  const arriving = incoming.length ? (
    <div className={c.arriving}>
      {incoming.map((d) => (
        <Arrival key={d.id} d={d} eta={etaMinutes(d, kitchen)} onConfirm={() => setConfirming(d)} />
      ))}
    </div>
  ) : (
    <div className={c.empty}>
      <Bike size={22} strokeWidth={1.75} aria-hidden />
      <span>{t('Nothing is on the way. When a volunteer claims food for your kitchen, it shows up here.')}</span>
    </div>
  );

  return (
    <Page>
      <Topbar
        title={t('Deliveries')}
        subtitle={
          <>
            <span className={c.dot} data-on={live || undefined} aria-hidden />
            {live ? t('Live') : t('Connecting')}
          </>
        }
        actions={
          <ButtonLink to="/ngo/map" variant="secondary" size="sm" icon={<MapIcon size={16} strokeWidth={2} aria-hidden />}>
            {t('Live map')}
          </ButtonLink>
        }
      />

      <div className={s.filters}>
        <Segmented
          label={t('Show')}
          value={shown}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('All') },
            { value: 'incoming', label: incoming.length ? t('Incoming {n}', { n: incoming.length }) : t('Incoming') },
            { value: 'received', label: t('Received') },
          ]}
        />
      </div>

      <Columns
        main={
          loading && !items.length ? (
            <Skeleton h={160} r={18} />
          ) : error && !items.length ? (
            <EmptyState icon={Bike} title={t('Couldn’t load deliveries')} action={<Button variant="secondary" onClick={reload}>{t('Try again')}</Button>}>
              {shownError(error, t)}
            </EmptyState>
          ) : (
            <>
              {shown !== 'received' && (
                <section className={s.block}>
                  {shown === 'all' && <SectionHead title={t('Incoming')} count={incoming.length} />}
                  {arriving}
                </section>
              )}
              {shown !== 'incoming' && (
                <Panel title={t('Received')} action={<span className={s.count}>{received.length}</span>} flush>
                  <ReceivedTable items={received.slice(0, limit)} t={t} />
                  {received.length > limit && (
                    <div className={s.more}>
                      <Button variant="secondary" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
                        {t('Show more')}
                      </Button>
                    </div>
                  )}
                </Panel>
              )}
            </>
          )
        }
        side={
          <Panel title={t('This week')}>
            <dl className={s.impact}>
              <div>
                <dt>{t('Received')}</dt>
                <dd>{num(week.length)}</dd>
              </div>
              <div>
                <dt>{t('Meals')}</dt>
                <dd>{num(weekMeals)}</dd>
              </div>
              <div>
                <dt>{t('On the way')}</dt>
                <dd>{num(incoming.length)}</dd>
              </div>
              <div>
                <dt>{t('Past best-before')}</dt>
                <dd>{num(weekLate)}</dd>
              </div>
            </dl>
          </Panel>
        }
      />
      <ConfirmSheet delivery={confirming} onClose={() => setConfirming(null)} />
    </Page>
  );
}

// Delivered history as a table on tablets and up, compact rows on phones
function ReceivedTable({ items, t }: { items: Donation[]; t: T }) {
  if (!items.length) return <p className={s.quiet}>{t('Food delivered to your kitchen shows up here.')}</p>;
  return (
    <div className={s.table} role="table" aria-label={t('Received deliveries')}>
      <div className={s.thead} role="row">
        <span role="columnheader">{t('Food')}</span>
        <span role="columnheader">{t('Donor')}</span>
        <span role="columnheader">{t('Volunteer')}</span>
        <span role="columnheader">{t('Meals')}</span>
        <span role="columnheader">{t('Received')}</span>
        <span role="columnheader">{t('Timing')}</span>
      </div>
      {items.map((d) => (
        <div key={d.id} className={s.tr} role="row">
          <span className={s.food} role="cell">
            <FoodThumb d={d} size={40} />
            <span>
              <strong>{d.title}</strong>
              <em>
                {qty(d, t)}
                <span className={s.phoneOnly}>{t(', from {donor}', { donor: d.donor.name })}</span>
              </em>
            </span>
          </span>
          <span role="cell" className={s.cellMuted}>
            {d.donor.name}
          </span>
          <span role="cell" className={s.cellMuted}>
            {d.volunteer?.name ?? '–'}
          </span>
          <span role="cell" className={s.num}>
            {num(d.meals)}
          </span>
          <span role="cell" className={s.cellMuted}>
            {d.deliveredAt ? timeOfDay(d.deliveredAt, t) : '–'}
          </span>
          <span role="cell" className={s.timing}>
            <Badge tone={isLate(d) ? 'critical' : 'fresh'}>{isLate(d) ? t('Late') : t('On time')}</Badge>
          </span>
        </div>
      ))}
    </div>
  );
}
