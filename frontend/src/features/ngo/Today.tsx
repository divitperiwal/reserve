import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Bike, Map as MapIcon, PauseCircle } from 'lucide-react';
import { Avatar, Button, ButtonLink, EmptyState, Skeleton, Toggle, useToast } from '../../components/ui';
import { Columns, Kpi, KpiRow, Page, Panel, SectionHead, Topbar } from '../../components/dash';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { num } from '../../lib/format';
import { useStream, useStreamStatus } from '../../lib/stream';
import { ago, useNow } from '../../lib/time';
import type { Activity, Donation } from '../../lib/types';
import { Arrival } from './Arrival';
import { AvailablePanel, WaitingPanel } from './Available';
import { BarChart } from './BarChart';
import { ConfirmSheet } from './ConfirmSheet';
import { asPct, useDashboard, weight } from './useDashboard';
import { etaMinutes, useOnTheWay } from './useDeliveries';
import s from './today.module.css';

export function Today() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const live = useStreamStatus();
  const { list, loading, error, reload } = useOnTheWay();
  const { data } = useDashboard(7);
  const [confirming, setConfirming] = useState<Donation | null>(null);
  const kitchen = { lat: user?.lat ?? 0, lng: user?.lng ?? 0 };
  const [kg, unit] = data ? weight(data.foodKg) : ['–', ''];
  const delta = data ? Math.round(data.mealsDeltaPct) : 0;
  const Arrow = delta >= 0 ? ArrowUpRight : ArrowDownRight;

  // Optimistic toggle, rolled back if the save fails
  const setAccepting = useCallback(
    async (on: boolean) => {
      const prev = user!;
      setUser({ ...prev, acceptingFood: on });
      try {
        setUser(await api.updateMe({ acceptingFood: on }));
        toast(on ? 'You are accepting food' : 'You are not accepting food');
      } catch (e) {
        setUser(prev);
        toast((e as Error).message, { error: true });
      }
    },
    [user, setUser, toast],
  );

  return (
    <Page>
      <Topbar
        title="Today"
        subtitle={
          <>
            <span className={s.dot} data-on={live || undefined} aria-hidden />
            {user?.name}, {live ? 'live' : 'connecting'}
          </>
        }
        actions={
          <>
            <span className={s.accepting}>
              Accepting food
              <Toggle label="Accepting food" checked={user?.acceptingFood ?? true} onChange={setAccepting} />
            </span>
            <ButtonLink to="/ngo/map" variant="secondary" size="sm" icon={<MapIcon size={16} strokeWidth={2} aria-hidden />}>
              Live map
            </ButtonLink>
          </>
        }
      />

      {user && !user.acceptingFood && (
        <p className={s.banner} role="status">
          <PauseCircle size={18} strokeWidth={1.75} aria-hidden />
          You are not taking new food. Turn on Accepting food to accept posts.
        </p>
      )}

      <KpiRow>
        <Kpi label="Arriving" value={list.length} tone={list.length ? 'basil' : undefined} note={list.length ? 'On the way to you' : 'Nothing on the way'} />
        <Kpi
          label="Meals this week"
          value={data ? num(data.mealsRescued) : '–'}
          note={
            data && delta !== 0 ? (
              <span className={delta > 0 ? `${s.delta} ${s.up}` : s.delta}>
                <Arrow size={13} strokeWidth={2.25} aria-hidden /> {Math.abs(delta)}% vs last week
              </span>
            ) : (
              'Last 7 days'
            )
          }
        />
        <Kpi label="Food received" value={kg} unit={unit} note="Last 7 days" />
        <Kpi label="Before expiry" value={data ? Math.round(asPct(data.deliveredBeforeExpiryPct)) : '–'} unit="%" note={data ? `Median pickup ${Math.round(data.medianPickupMinutes)} min` : undefined} />
      </KpiRow>

      <Columns
        main={
          <>
            <AvailablePanel />
            <WaitingPanel />
            <section className={s.block}>
              <SectionHead title="Arriving" count={list.length} />
              {loading && !list.length ? (
                <Skeleton h={120} r={18} />
              ) : error && !list.length ? (
                <EmptyState icon={Bike} title="Couldn’t load deliveries" action={<Button variant="secondary" onClick={reload}>Try again</Button>}>
                  {error}
                </EmptyState>
              ) : list.length === 0 ? (
                <div className={s.empty}>
                  <Bike size={22} strokeWidth={1.75} aria-hidden />
                  <span>When a volunteer claims food for your kitchen, it shows up here with an arrival time.</span>
                </div>
              ) : (
                <div className={s.arriving}>
                  {list.map((d) => (
                    <Arrival key={d.id} d={d} eta={etaMinutes(d, kitchen)} onConfirm={() => setConfirming(d)} />
                  ))}
                </div>
              )}
            </section>

            <Panel title="Meals per day" action={<Link to="/ngo/insights" className={s.link}>Insights</Link>}>
              {data ? <BarChart data={data.perDay} hideCaption /> : <Skeleton h={220} r={12} />}
            </Panel>
          </>
        }
        side={
          <>
            <ActivityPanel />
            <Panel title="Top volunteers" flush>
              {!data ? (
                <div className={s.pad}>
                  <Skeleton h={40} />
                </div>
              ) : (
                <ol className={s.people}>
                  {data.topVolunteers.slice(0, 5).map((v, i) => (
                    <li key={v.id}>
                      <span className={s.rank}>{i + 1}</span>
                      <Avatar initials={v.initials} size={32} />
                      <span className={s.personText}>
                        <strong>{v.name}</strong>
                        <em>{v.pickups} pickups</em>
                      </span>
                      <span className={s.meals}>{num(v.meals)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </>
        }
      />
      <ConfirmSheet delivery={confirming} onClose={() => setConfirming(null)} />
    </Page>
  );
}

const verb: Record<Activity['type'], string> = { POSTED: 'posted', ACCEPTED: 'accepted', CLAIMED: 'claimed', PICKED_UP: 'picked up', DELIVERED: 'delivered', EXPIRED: 'lost', RELEASED: 'released' };

function ActivityPanel() {
  const [items, setItems] = useState<Activity[] | null>(null);
  const now = useNow();
  useEffect(() => {
    api.activity(8).then(setItems).catch(() => setItems([]));
  }, []);
  useStream({ activity: (a) => setItems((xs) => (xs ? [a, ...xs.filter((x) => x.id !== a.id)].slice(0, 8) : xs)) });

  return (
    <Panel title="Live activity" action={<Link to="/ngo/deliveries" className={s.link}>Deliveries</Link>} flush>
      {!items ? (
        <div className={s.pad}>
          <Skeleton h={40} />
        </div>
      ) : (
        <ul className={s.feed}>
          {items.map((a) => (
            <li key={a.id} className={s.feedItem} data-type={a.type}>
              <span className={s.feedDot} aria-hidden />
              <span className={s.feedText}>
                {a.type === 'EXPIRED' ? (
                  <>
                    <strong>{a.donationTitle}</strong> expired unclaimed
                  </>
                ) : (
                  <>
                    <strong>{a.actorName}</strong> {verb[a.type]} {a.donationTitle}
                  </>
                )}
              </span>
              <span className={s.ago}>{ago(a.at, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
