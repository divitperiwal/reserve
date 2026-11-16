import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Bike, Map as MapIcon, PauseCircle } from 'lucide-react';
import { Avatar, Button, ButtonLink, EmptyState, Skeleton, Toggle, useToast } from '../../components/ui';
import { Columns, Kpi, KpiRow, Page, Panel, SectionHead, Topbar } from '../../components/dash';
import { api, shownError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { num } from '../../lib/format';
import { useT } from '../../lib/i18n';
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
  const t = useT();
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
        toast(on ? t('You are accepting food') : t('You are not accepting food'));
      } catch (e) {
        setUser(prev);
        toast((e as Error).message, { error: true });
      }
    },
    [user, setUser, toast, t],
  );

  return (
    <Page>
      <Topbar
        title={t('Today')}
        subtitle={
          <>
            <span className={s.dot} data-on={live || undefined} aria-hidden />
            {live ? t('{name}, live', { name: user?.name ?? '' }) : t('{name}, connecting', { name: user?.name ?? '' })}
          </>
        }
        actions={
          <>
            <span className={s.accepting}>
              {t('Accepting food')}
              <Toggle label={t('Accepting food')} checked={user?.acceptingFood ?? true} onChange={setAccepting} />
            </span>
            <ButtonLink to="/ngo/map" variant="secondary" size="sm" icon={<MapIcon size={16} strokeWidth={2} aria-hidden />}>
              {t('Live map')}
            </ButtonLink>
          </>
        }
      />

      {user && !user.acceptingFood && (
        <p className={s.banner} role="status">
          <PauseCircle size={18} strokeWidth={1.75} aria-hidden />
          {t('You are not taking new food. Turn on Accepting food to accept posts.')}
        </p>
      )}

      <KpiRow>
        <Kpi label={t('Arriving')} value={list.length} tone={list.length ? 'basil' : undefined} note={list.length ? t('On the way to you') : t('Nothing on the way')} />
        <Kpi
          label={t('Meals this week')}
          value={data ? num(data.mealsRescued) : '–'}
          note={
            data && delta !== 0 ? (
              <span className={delta > 0 ? `${s.delta} ${s.up}` : s.delta}>
                <Arrow size={13} strokeWidth={2.25} aria-hidden /> {t('{n}% vs last week', { n: Math.abs(delta) })}
              </span>
            ) : (
              t('Last {n} days', { n: 7 })
            )
          }
        />
        <Kpi label={t('Food received')} value={kg} unit={unit} note={t('Last {n} days', { n: 7 })} />
        <Kpi label={t('Before expiry')} value={data ? Math.round(asPct(data.deliveredBeforeExpiryPct)) : '–'} unit="%" note={data ? t('Median pickup {n} min', { n: Math.round(data.medianPickupMinutes) }) : undefined} />
      </KpiRow>

      <Columns
        main={
          <>
            <AvailablePanel />
            <WaitingPanel />
            <section className={s.block}>
              <SectionHead title={t('Arriving')} count={list.length} />
              {loading && !list.length ? (
                <Skeleton h={120} r={18} />
              ) : error && !list.length ? (
                <EmptyState icon={Bike} title={t('Couldn’t load deliveries')} action={<Button variant="secondary" onClick={reload}>{t('Try again')}</Button>}>
                  {shownError(error, t)}
                </EmptyState>
              ) : list.length === 0 ? (
                <div className={s.empty}>
                  <Bike size={22} strokeWidth={1.75} aria-hidden />
                  <span>{t('When a volunteer claims food for your kitchen, it shows up here with an arrival time.')}</span>
                </div>
              ) : (
                <div className={s.arriving}>
                  {list.map((d) => (
                    <Arrival key={d.id} d={d} eta={etaMinutes(d, kitchen)} onConfirm={() => setConfirming(d)} />
                  ))}
                </div>
              )}
            </section>

            <Panel title={t('Meals per day')} action={<Link to="/ngo/insights" className={s.link}>{t('Insights')}</Link>}>
              {data ? <BarChart data={data.perDay} hideCaption /> : <Skeleton h={220} r={12} />}
            </Panel>
          </>
        }
        side={
          <>
            <ActivityPanel />
            <Panel title={t('Top volunteers')} flush>
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
                        <em>{t('{n} pickups', { n: v.pickups })}</em>
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

const feedText: Record<Activity['type'], string> = {
  POSTED: '{name} posted {title}',
  ACCEPTED: '{name} accepted {title}',
  CLAIMED: '{name} claimed {title}',
  PICKED_UP: '{name} picked up {title}',
  DELIVERED: '{name} delivered {title}',
  EXPIRED: '{name} expired unclaimed',
  RELEASED: '{name} released {title}',
};

function ActivityPanel() {
  const [items, setItems] = useState<Activity[] | null>(null);
  const now = useNow();
  const t = useT();
  useEffect(() => {
    api.activity(8).then(setItems).catch(() => setItems([]));
  }, []);
  useStream({ activity: (a) => setItems((xs) => (xs ? [a, ...xs.filter((x) => x.id !== a.id)].slice(0, 8) : xs)) });

  return (
    <Panel title={t('Live activity')} action={<Link to="/ngo/deliveries" className={s.link}>{t('Deliveries')}</Link>} flush>
      {!items ? (
        <div className={s.pad}>
          <Skeleton h={40} />
        </div>
      ) : (
        <ul className={s.feed}>
          {items.map((a) => {
            const [before, after] = t(feedText[a.type], { name: '{name}', title: a.donationTitle }).split('{name}');
            return (
              <li key={a.id} className={s.feedItem} data-type={a.type}>
                <span className={s.feedDot} aria-hidden />
                <span className={s.feedText}>
                  {before}
                  <strong>{a.type === 'EXPIRED' ? a.donationTitle : a.actorName}</strong>
                  {after}
                </span>
                <span className={s.ago}>{ago(a.at, t, now)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
