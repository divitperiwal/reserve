import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Avatar, Badge, ButtonLink, EmptyState, Logo, Segmented, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { num } from '../../lib/format';
import { useT, type T } from '../../lib/i18n';
import { badgeName, kgText } from '../../lib/impact';
import type { Leaderboard } from '../../lib/types';
import s from './leaderboard.module.css';

type Result = { days: number; data?: Leaderboard };

export default function LeaderboardPage() {
  const { user } = useAuth();
  const t = useT();
  const [days, setDays] = useState<7 | 30>(30);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .leaderboard(days)
      .then((data) => alive && setResult({ days, data }))
      .catch(() => alive && setResult({ days }));
    return () => {
      alive = false;
    };
  }, [days]);

  const current = result?.days === days ? result : null;
  const data = current?.data ?? null;
  const totals = [
    { label: t('Meals rescued'), value: data ? num(data.meals) : null },
    { label: t('Food rescued'), value: data ? kgText(data.foodKg) : null },
    { label: t('CO₂e avoided'), value: data ? kgText(data.co2Kg) : null },
  ];

  return (
    <div className={s.page}>
      <header className={s.nav}>
        <div className={s.navInner}>
          <Logo />
          <ButtonLink to={user ? homeFor(user.role) : '/auth'} variant="ghost" size="sm">
            {user ? t('Open dashboard') : t('Sign in')}
          </ButtonLink>
        </div>
      </header>

      <main className={s.main}>
        <div className={s.head}>
          <h1>{t('Leaderboard')}</h1>
          <Segmented
            label={t('Period')}
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: t('{n} days', { n: 7 }) },
              { value: 30, label: t('{n} days', { n: 30 }) },
            ]}
          />
        </div>

        {current && !data ? (
          <EmptyState icon={Trophy} title={t('Couldn’t load the leaderboard')}>
            {t('Check your connection and try again.')}
          </EmptyState>
        ) : (
          <>
            <dl className={s.totals} aria-busy={!data}>
              {totals.map((x) => (
                <div key={x.label}>
                  <dt>{x.label}</dt>
                  <dd>{x.value ?? <Skeleton w={96} h={32} r={8} />}</dd>
                </div>
              ))}
            </dl>

            <div className={s.tables}>
              <section aria-labelledby="lb-vol">
                <h2 id="lb-vol">{t('Volunteers')}</h2>
                {!data ? (
                  <Skeleton h={220} r={16} />
                ) : (
                  <Table
                    t={t}
                    label={t('Volunteers')}
                    empty={t('No deliveries in this period yet.')}
                    head={[t('Pickups'), t('Meals')]}
                    rows={data.volunteers.map((v) => ({ id: v.id, name: v.name, initials: v.initials, badge: v.badge, cells: [num(v.pickups), num(v.meals)] }))}
                  />
                )}
              </section>
              <section aria-labelledby="lb-don">
                <h2 id="lb-don">{t('Donors')}</h2>
                {!data ? (
                  <Skeleton h={220} r={16} />
                ) : (
                  <Table
                    t={t}
                    label={t('Donors')}
                    empty={t('No donations in this period yet.')}
                    head={[t('Donations'), t('Meals')]}
                    rows={data.donors.map((d) => ({ id: d.id, name: d.name, initials: d.initials, cells: [num(d.donations), num(d.meals)] }))}
                  />
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

interface Row {
  id: number;
  name: string;
  initials: string;
  badge?: string;
  cells: string[];
}

function Table({ label, head, rows, empty, t }: { label: string; head: [string, string]; rows: Row[]; empty: string; t: T }) {
  if (rows.length === 0) return <p className={s.empty}>{empty}</p>;
  return (
    <table className={s.table} aria-label={label}>
      <thead>
        <tr>
          <th scope="col">{t('Rank')}</th>
          <th scope="col">{t('Name')}</th>
          {head.map((h) => (
            <th key={h} scope="col" className={s.num}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id}>
            <td className={s.rank}>{i + 1}</td>
            <td>
              <span className={s.who}>
                <Avatar initials={r.initials} size={32} tone={i === 0 ? 'basil' : 'soft'} />
                <span className={s.whoName}>{r.name}</span>
                {r.badge && <Badge tone="fresh">{badgeName(r.badge, t)}</Badge>}
              </span>
            </td>
            {r.cells.map((c, j) => (
              <td key={j} className={s.num}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
