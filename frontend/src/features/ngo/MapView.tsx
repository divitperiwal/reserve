import { Link } from 'react-router-dom';
import { Bike } from 'lucide-react';
import { LiveMap, type Pin } from '../../components/map/LiveMap';
import { FoodThumb } from '../../components/dash';
import { useAuth } from '../../lib/auth';
import { etaMinutes, firstName, useOnTheWay } from './useDeliveries';
import s from './map.module.css';

const OVERLAY = 376;

// Full-height map of riders heading here, with a list of arriving deliveries beside it
export function MapView() {
  const { user } = useAuth();
  const { list } = useOnTheWay();
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  const kitchen = { lat: user?.lat ?? 12.9, lng: user?.lng ?? 80.1 };

  const pins: Pin[] = [{ id: 'ngo', lat: kitchen.lat, lng: kitchen.lng, kind: 'ngo', label: 'You' }];
  list.forEach((d) => {
    const at = d.lastLocation ?? (d.status === 'PICKED_UP' ? null : { lat: d.lat, lng: d.lng });
    if (d.status === 'CLAIMED') pins.push({ id: `donor-${d.id}`, lat: d.lat, lng: d.lng, kind: 'donor' });
    if (at) pins.push({ id: `rider-${d.id}`, lat: at.lat, lng: at.lng, kind: 'rider', label: d.volunteer && firstName(d.volunteer.name) });
  });

  return (
    <div className={s.page}>
      <LiveMap pins={pins} padding={80} padLeft={wide ? OVERLAY : 0} />
      <section className={s.card} aria-label="Arriving deliveries">
        <header className={s.head}>
          <h1 className={s.title}>Arriving</h1>
          <span className={s.count}>{list.length}</span>
        </header>
        {list.length === 0 ? (
          <p className={s.empty}>
            <Bike size={18} strokeWidth={1.75} aria-hidden />
            No one is heading here right now.
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
                      {d.volunteer ? firstName(d.volunteer.name) : 'Volunteer'}, {d.status === 'PICKED_UP' ? 'on the way' : 'picking up'}
                    </span>
                  </span>
                  <span className={s.eta}>
                    <strong>{etaMinutes(d, kitchen)}</strong> min
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/ngo/deliveries" className={s.more}>
          All deliveries
        </Link>
      </section>
    </div>
  );
}
