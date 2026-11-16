import { Link } from 'react-router-dom';
import { useState } from 'react';
import { CircleMarker } from 'react-leaflet';
import { Bike, Flame } from 'lucide-react';
import { Segmented } from '../../components/ui';
import { LiveMap, type Pin } from '../../components/map/LiveMap';
import { FoodThumb } from '../../components/dash';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { pointRadius } from '../../lib/forecast';
import { etaMinutes, firstName, useOnTheWay } from './useDeliveries';
import { useSurplus } from './useSurplus';
import s from './map.module.css';

const OVERLAY = 376;

// Full-height map of riders heading here, with a list of arriving deliveries beside it
export function MapView() {
  const { user } = useAuth();
  const { list } = useOnTheWay();
  const t = useT();
  const [history, setHistory] = useState(false);
  const [days, setDays] = useState<30 | 56>(56);
  const surplus = useSurplus(days, history);
  const extent: [number, number][] = history && surplus.data ? surplus.data.points.map((pt) => [pt.lat, pt.lng]) : [];
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  const kitchen = { lat: user?.lat ?? 12.9, lng: user?.lng ?? 80.1 };

  const pins: Pin[] = [{ id: 'ngo', lat: kitchen.lat, lng: kitchen.lng, kind: 'ngo', label: t('You') }];
  list.forEach((d) => {
    const at = d.lastLocation ?? (d.status === 'PICKED_UP' ? null : { lat: d.lat, lng: d.lng });
    if (d.status === 'CLAIMED') pins.push({ id: `donor-${d.id}`, lat: d.lat, lng: d.lng, kind: 'donor' });
    if (at) pins.push({ id: `rider-${d.id}`, lat: at.lat, lng: at.lng, kind: 'rider', label: d.volunteer && firstName(d.volunteer.name) });
  });

  return (
    <div className={s.page}>
      <LiveMap pins={pins} fitExtra={extent} padding={80} padLeft={wide ? OVERLAY : 0}>
        {history &&
          surplus.data?.points.map((pt, i) => {
            const color = pt.status === 'DELIVERED' ? '#3a7d44' : '#d93025';
            return (
              <CircleMarker
                key={`${days}-${i}`}
                center={[pt.lat, pt.lng]}
                radius={pointRadius(pt.kg)}
                pathOptions={{ color, fillColor: color, weight: 1, fillOpacity: 0.35 }}
              />
            );
          })}
      </LiveMap>
      <div className={s.history}>
        <button type="button" className={s.historyBtn} aria-pressed={history} onClick={() => setHistory((h) => !h)}>
          <Flame size={16} strokeWidth={1.75} aria-hidden />
          {t('History')}
        </button>
        {history && (
          <>
            <div className={s.period}>
              <Segmented
                label={t('History period')}
                value={days}
                onChange={setDays}
                options={[
                  { value: 30, label: t('{n} days', { n: 30 }) },
                  { value: 56, label: t('{n} days', { n: 56 }) },
                ]}
              />
            </div>
            <ul className={s.legend} aria-label={t('Legend')}>
              <li>
                <span className={s.dot} data-kind="rescued" aria-hidden />
                {t('Rescued')}
              </li>
              <li>
                <span className={s.dot} data-kind="expired" aria-hidden />
                {t('Expired')}
              </li>
            </ul>
            {surplus.error && <p className={s.historyError}>{t('Couldn’t load history.')}</p>}
          </>
        )}
      </div>
      <section className={s.card} aria-label={t('Arriving deliveries')}>
        <header className={s.head}>
          <h1 className={s.title}>{t('Arriving')}</h1>
          <span className={s.count}>{list.length}</span>
        </header>
        {list.length === 0 ? (
          <p className={s.empty}>
            <Bike size={18} strokeWidth={1.75} aria-hidden />
            {t('No one is heading here right now.')}
          </p>
        ) : (
          <ul className={s.list}>
            {list.map((d) => (
              <li key={d.id}>
                <Link to={`/track/${d.id}`} className={s.item}>
                  <FoodThumb d={d} size={44} />
                  <span className={s.itemText}>
                    <strong>{d.title}</strong>
                    <span>
                      {d.volunteer ? firstName(d.volunteer.name) : t('Volunteer')}, {d.status === 'PICKED_UP' ? t('on the way') : t('picking up')}
                    </span>
                  </span>
                  <span className={s.eta}>
                    <strong>{etaMinutes(d, kitchen)}</strong> {t('min')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/ngo/deliveries" className={s.more}>
          {t('All deliveries')}
        </Link>
      </section>
    </div>
  );
}
