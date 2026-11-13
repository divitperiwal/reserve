import { useState } from 'react';
import { Bike, Map as MapIcon } from 'lucide-react';
import { Badge, Button, ButtonLink, EmptyState, Segmented, Skeleton } from '../../components/ui';
import { Columns, FoodThumb, Page, Panel, SectionHead, Topbar } from '../../components/dash';
import { useAuth } from '../../lib/auth';
import { num, qty } from '../../lib/format';
import { useStreamStatus } from '../../lib/stream';
import { timeOfDay } from '../../lib/time';
import type { Donation } from '../../lib/types';
import { Arrival } from './Arrival';
import { ConfirmSheet } from './ConfirmSheet';
import { etaMinutes, useDeliveries, useOnTheWay } from './useDeliveries';
import s from './deliveries.module.css';
import t from './today.module.css';

type Filter = 'incoming' | 'received' | 'all';

const PAGE = 25;
const WEEK = 7 * 24 * 3_600_000;
const receivedAt = (d: Donation) => d.deliveredAt ?? d.createdAt;
const isLate = (d: Donation) => !!d.deliveredAt && +new Date(d.deliveredAt) > +new Date(d.bestBefore);

export function Deliveries() {
  const { user } = useAuth();
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
    <div className={t.arriving}>
      {incoming.map((d) => (
        <Arrival key={d.id} d={d} eta={etaMinutes(d, kitchen)} onConfirm={() => setConfirming(d)} />
      ))}
    </div>
  ) : (
    <div className={t.empty}>
      <Bike size={22} strokeWidth={1.75} aria-hidden />
      <span>Nothing is on the way. When a volunteer claims food for your kitchen, it shows up here.</span>
    </div>
  );

  return (
    <Page>
      <Topbar
        title="Deliveries"
        subtitle={
          <>
            <span className={t.dot} data-on={live || undefined} aria-hidden />
            {live ? 'Live' : 'Connecting'}
          </>
        }
        actions={
          <ButtonLink to="/ngo/map" variant="secondary" size="sm" icon={<MapIcon size={16} strokeWidth={2} aria-hidden />}>
            Live map
          </ButtonLink>
        }
      />

      <div className={s.filters}>
        <Segmented
          label="Show"
          value={shown}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'incoming', label: `Incoming${incoming.length ? ` ${incoming.length}` : ''}` },
            { value: 'received', label: 'Received' },
          ]}
        />
      </div>

      <Columns
        main={
          loading && !items.length ? (
            <Skeleton h={160} r={18} />
          ) : error && !items.length ? (
            <EmptyState icon={Bike} title="Couldn’t load deliveries" action={<Button variant="secondary" onClick={reload}>Try again</Button>}>
              {error}
            </EmptyState>
          ) : (
            <>
              {shown !== 'received' && (
                <section className={s.block}>
                  {shown === 'all' && <SectionHead title="Incoming" count={incoming.length} />}
                  {arriving}
                </section>
              )}
              {shown !== 'incoming' && (
                <Panel title="Received" action={<span className={s.count}>{received.length}</span>} flush>
                  <ReceivedTable items={received.slice(0, limit)} />
                  {received.length > limit && (
                    <div className={s.more}>
                      <Button variant="secondary" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
                        Show more
                      </Button>
                    </div>
                  )}
                </Panel>
              )}
            </>
          )
        }
        side={
          <Panel title="This week">
            <dl className={s.impact}>
              <div>
                <dt>Received</dt>
                <dd>{num(week.length)}</dd>
              </div>
              <div>
                <dt>Meals</dt>
                <dd>{num(weekMeals)}</dd>
              </div>
              <div>
                <dt>On the way</dt>
                <dd>{num(incoming.length)}</dd>
              </div>
              <div>
                <dt>Past best-before</dt>
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
function ReceivedTable({ items }: { items: Donation[] }) {
  if (!items.length) return <p className={s.quiet}>Food delivered to your kitchen shows up here.</p>;
  return (
    <div className={s.table} role="table" aria-label="Received deliveries">
      <div className={s.thead} role="row">
        <span role="columnheader">Food</span>
        <span role="columnheader">Donor</span>
        <span role="columnheader">Volunteer</span>
        <span role="columnheader">Meals</span>
        <span role="columnheader">Received</span>
        <span role="columnheader">Timing</span>
      </div>
      {items.map((d) => (
        <div key={d.id} className={s.tr} role="row">
          <span className={s.food} role="cell">
            <FoodThumb d={d} size={40} />
            <span>
              <strong>{d.title}</strong>
              <em>
                {qty(d)}
                <span className={s.phoneOnly}>, from {d.donor.name}</span>
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
            {d.deliveredAt ? timeOfDay(d.deliveredAt) : '–'}
          </span>
          <span role="cell" className={s.timing}>
            <Badge tone={isLate(d) ? 'critical' : 'fresh'}>{isLate(d) ? 'Late' : 'On time'}</Badge>
          </span>
        </div>
      ))}
    </div>
  );
}
