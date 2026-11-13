import { useEffect, useMemo, useState } from 'react';
import { Award, PackageCheck } from 'lucide-react';
import { FoodThumb } from '../../components/dash';
import { Progress, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { num, qty } from '../../lib/format';
import type { Donation } from '../../lib/types';
import { dayWord } from '../donor/donorKit';
import { useVolunteer } from './context';
import { useMyStats } from './hooks';
import s from './volunteer.module.css';

const DAY = 86_400_000;
const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Last seven days of deliveries, oldest first
function weekBars(history: Donation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const start = +today - (6 - i) * DAY;
    const count = history.filter((d) => {
      const t = +new Date(d.deliveredAt ?? d.createdAt);
      return t >= start && t < start + DAY;
    }).length;
    return { label: weekdays[new Date(start).getDay()]!, count };
  });
}

export default function ImpactPage() {
  const { user } = useVolunteer();
  const { stats } = useMyStats();
  const [history, setHistory] = useState<Donation[] | null>(null);

  useEffect(() => {
    api
      .mine()
      .then((list) => setHistory(list.filter((d) => d.status === 'DELIVERED').sort((a, b) => +new Date(b.deliveredAt ?? 0) - +new Date(a.deliveredAt ?? 0))))
      .catch(() => setHistory([]));
  }, []);

  const badge = stats?.nextBadge;
  const week = useMemo(() => weekBars(history ?? []), [history]);
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  const peak = Math.max(1, ...week.map((d) => d.count));
  const kitchens = new Set((history ?? []).map((d) => d.ngo?.id).filter(Boolean)).size;

  return (
    <div className={s.page}>
      <header className={s.head}>
        <h1>Impact</h1>
        <p>{stats ? stats.monthLabel : <Skeleton w={96} h={14} />}</p>
      </header>

      <section className={s.hero} aria-label="This month">
        <span className={s.heroLabel}>Meals delivered this month</span>
        <strong className={s.heroNum}>{stats ? num(stats.meals) : '–'}</strong>
        <dl className={s.heroStats}>
          <div>
            <dt>Pickups</dt>
            <dd>{stats ? num(stats.pickups) : '–'}</dd>
          </div>
          <div>
            <dt>Rank nearby</dt>
            <dd>{stats ? (stats.rank ? `#${stats.rank}` : '–') : '–'}</dd>
          </div>
        </dl>
      </section>

      {badge && (
        <section className={s.card} aria-label="Next badge">
          <div className={s.badge}>
            <span className={s.badgeIcon}>
              <Award size={24} strokeWidth={1.75} aria-hidden />
            </span>
            <div className={s.badgeText}>
              <span className={s.kicker}>Next badge</span>
              <strong>{badge.name}</strong>
            </div>
            <span className={s.badgeCount}>
              {badge.current}
              <small> of {badge.target}</small>
            </span>
          </div>
          <Progress value={badge.current / badge.target} label={`${badge.name} progress`} />
          <p className={s.badgeNote}>{badge.target > badge.current ? `${badge.target - badge.current} more to go` : 'Earned'}</p>
        </section>
      )}

      <section className={s.card} aria-label="This week">
        <div className={s.cardHead}>
          <h2>This week</h2>
          <span>{history ? `${weekTotal} ${weekTotal === 1 ? 'delivery' : 'deliveries'}` : ''}</span>
        </div>
        <div className={s.bars}>
          {week.map((d, i) => (
            <div key={i} className={s.bar}>
              <span className={s.barTrack}>
                <span className={s.barFill} data-on={d.count > 0 || undefined} style={{ height: `${Math.max(8, (d.count / peak) * 100)}%` }} />
              </span>
              <span className={s.barLabel}>{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Lifetime">
        <h2 className={s.sectionTitle}>Lifetime</h2>
        <dl className={s.totalGrid}>
          <div>
            <dt>Pickups</dt>
            <dd>{num(user.rescues)}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>{user.rating ? user.rating.toFixed(1) : '–'}</dd>
          </div>
          <div>
            <dt>Kitchens</dt>
            <dd>{history ? kitchens : '–'}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Recent deliveries">
        <h2 className={s.sectionTitle}>Recent deliveries</h2>
        {!history ? (
          <div className={s.list}>
            <div className={s.item}>
              <Skeleton w={52} h={52} r={14} />
              <span className={s.skelText}>
                <Skeleton w="60%" h={15} />
                <Skeleton w="40%" h={12} />
              </span>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <PackageCheck size={24} strokeWidth={1.75} aria-hidden />
            </span>
            <strong>No deliveries yet</strong>
            <p>Your first delivery shows up here.</p>
          </div>
        ) : (
          <ul className={s.list}>
            {history.slice(0, 20).map((d) => (
              <li key={d.id} className={s.item}>
                <FoodThumb d={d} size={52} />
                <span className={s.itemText}>
                  <strong>{d.title}</strong>
                  <span>{`${qty(d)} to ${d.ngo?.name ?? 'a kitchen'}`}</span>
                </span>
                <span className={s.itemDay}>{dayWord(d.deliveredAt ?? d.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
