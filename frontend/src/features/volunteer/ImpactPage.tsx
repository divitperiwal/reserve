import { useEffect, useMemo, useState } from 'react';
import { Award, PackageCheck } from 'lucide-react';
import { FoodThumb } from '../../components/dash';
import { Badge, Group, Progress, Row, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { num, qty } from '../../lib/format';
import { dateLocale, useT } from '../../lib/i18n';
import { badgeName, kgText, monthName } from '../../lib/impact';
import type { Donation } from '../../lib/types';
import { dayWord } from '../donor/donorKit';
import { useVolunteer } from './context';
import { useMyStats } from './hooks';
import s from './volunteer.module.css';

const DAY = 86_400_000;

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
    return { start, count };
  });
}

export default function ImpactPage() {
  const { user } = useVolunteer();
  const { stats } = useMyStats();
  const [history, setHistory] = useState<Donation[] | null>(null);
  const t = useT();

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
        <h1>{t('Impact')}</h1>
        <p>{stats ? monthName() : <Skeleton w={96} h={14} />}</p>
      </header>

      <section className={s.hero} aria-label={t('This month')}>
        <span className={s.heroLabel}>{t('Meals delivered this month')}</span>
        <strong className={s.heroNum}>{stats ? num(stats.meals) : '–'}</strong>
        <dl className={s.heroStats}>
          <div>
            <dt>{t('Pickups')}</dt>
            <dd>{stats ? num(stats.pickups) : '–'}</dd>
          </div>
          <div>
            <dt>{t('Rank nearby')}</dt>
            <dd>{stats ? (stats.rank ? `#${stats.rank}` : '–') : '–'}</dd>
          </div>
        </dl>
      </section>

      {badge && (
        <section className={s.card} aria-label={t('Next badge')}>
          <div className={s.badge}>
            <span className={s.badgeIcon}>
              <Award size={24} strokeWidth={1.75} aria-hidden />
            </span>
            <div className={s.badgeText}>
              <span className={s.kicker}>{t('Next badge')}</span>
              <strong>{badgeName(badge.name, t)}</strong>
            </div>
            <span className={s.badgeCount}>
              {badge.current}
              <small> {t('of {n}', { n: badge.target })}</small>
            </span>
          </div>
          <Progress value={badge.current / badge.target} label={t('{badge} progress', { badge: badgeName(badge.name, t) })} />
          <p className={s.badgeNote}>{badge.target > badge.current ? t('{n} more to go', { n: badge.target - badge.current }) : t('Earned')}</p>
        </section>
      )}

      <section aria-label={t('Earned badges')}>
        <h2 className={s.sectionTitle}>{t('Earned badges')}</h2>
        {!stats ? (
          <Skeleton h={32} r={16} />
        ) : stats.earnedBadges.length === 0 ? (
          <p className={s.note}>{t('Your first badge comes after 5 pickups.')}</p>
        ) : (
          <div className={s.badgeRow}>
            {stats.earnedBadges.map((b) => (
              <Badge key={b} tone="fresh">
                <Award size={14} strokeWidth={2} aria-hidden />
                {badgeName(b, t)}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <section aria-label={t('All time')}>
        <h2 className={s.sectionTitle}>{t('All time')}</h2>
        <dl className={s.totalGrid}>
          <div>
            <dt>{t('Meals')}</dt>
            <dd>{stats ? num(stats.allTime.meals) : <Skeleton w={56} h={24} />}</dd>
          </div>
          <div>
            <dt>{t('Food')}</dt>
            <dd>{stats ? kgText(stats.allTime.foodKg) : <Skeleton w={56} h={24} />}</dd>
          </div>
          <div>
            <dt>{t('CO₂e avoided')}</dt>
            <dd>{stats ? kgText(stats.allTime.co2Kg) : <Skeleton w={56} h={24} />}</dd>
          </div>
        </dl>
      </section>

      <Group>
        <Row title={t('Leaderboard')} to="/leaderboard" />
        <Row title={t('Download certificate')} to="/certificate" />
      </Group>

      <section className={s.card} aria-label={t('This week')}>
        <div className={s.cardHead}>
          <h2>{t('This week')}</h2>
          <span>{history ? (weekTotal === 1 ? t('1 delivery') : t('{n} deliveries', { n: weekTotal })) : ''}</span>
        </div>
        <div className={s.bars}>
          {week.map((d, i) => (
            <div key={i} className={s.bar}>
              <span className={s.barTrack}>
                <span className={s.barFill} data-on={d.count > 0 || undefined} style={{ height: `${Math.max(8, (d.count / peak) * 100)}%` }} />
              </span>
              <span className={s.barLabel}>{new Date(d.start).toLocaleDateString(dateLocale(), { weekday: 'narrow' })}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label={t('Lifetime')}>
        <h2 className={s.sectionTitle}>{t('Lifetime')}</h2>
        <dl className={s.totalGrid}>
          <div>
            <dt>{t('Pickups')}</dt>
            <dd>{num(user.rescues)}</dd>
          </div>
          <div>
            <dt>{t('Rating')}</dt>
            <dd>{user.rating ? user.rating.toFixed(1) : '–'}</dd>
          </div>
          <div>
            <dt>{t('Kitchens')}</dt>
            <dd>{history ? kitchens : '–'}</dd>
          </div>
        </dl>
      </section>

      <section aria-label={t('Recent deliveries')}>
        <h2 className={s.sectionTitle}>{t('Recent deliveries')}</h2>
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
            <strong>{t('No deliveries yet')}</strong>
            <p>{t('Your first delivery shows up here.')}</p>
          </div>
        ) : (
          <ul className={s.list}>
            {history.slice(0, 20).map((d) => (
              <li key={d.id} className={s.item}>
                <FoodThumb d={d} size={52} />
                <span className={s.itemText}>
                  <strong>{d.title}</strong>
                  <span>{t('{qty} to {ngo}', { qty: qty(d, t), ngo: d.ngo?.name ?? t('a kitchen') })}</span>
                </span>
                <span className={s.itemDay}>{dayWord(d.deliveredAt ?? d.createdAt, t)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
