import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { LiveMap, type Pin } from '../../components/map/LiveMap';
import type { Donation, GeoPoint } from '../../lib/types';
import { isActive, riderAt, type LatLng } from './geo';

const CARD_DESKTOP = '(min-width: 1024px)';

// Fit the stops once per status so live pings never fight the user's panning; leave room for the card
function FitRoute({ points, fitKey }: { points: LatLng[]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const frame = requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
      const size = map.getSize();
      const desktop = window.matchMedia(CARD_DESKTOP).matches;
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, {
        paddingTopLeft: desktop ? [380 + 16 + 56, 56] : [40, 72],
        paddingBottomRight: desktop ? [56, 56] : [40, Math.round(size.y * 0.5)],
        maxZoom: 16,
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);
  return null;
}

export function RouteMap({ d, trail, fallback }: { d: Donation; trail: GeoPoint[]; fallback?: LatLng | null }) {
  const moving = isActive(d.status);
  const rider = riderAt(d, trail) ?? (moving ? fallback ?? null : null);
  const ngo = d.ngo;

  const pins: Pin[] = [{ id: 'donor', lat: d.lat, lng: d.lng, kind: 'donor', label: d.donor.name }];
  if (ngo) pins.push({ id: 'ngo', lat: ngo.lat, lng: ngo.lng, kind: 'ngo', label: ngo.name });
  if (rider && moving) pins.push({ id: 'rider', lat: rider.lat, lng: rider.lng, kind: 'rider' });

  const covered = trail.map((p) => [p.lat, p.lng] as [number, number]);
  const remaining: [number, number][] = [];
  if (moving && rider) {
    remaining.push([rider.lat, rider.lng]);
    if (d.status === 'CLAIMED') remaining.push([d.lat, d.lng]);
    if (ngo) remaining.push([ngo.lat, ngo.lng]);
  } else if ((d.status === 'AVAILABLE' || d.status === 'ACCEPTED') && ngo) {
    remaining.push([d.lat, d.lng], [ngo.lat, ngo.lng]);
  }

  const fitPoints: LatLng[] = [{ lat: d.lat, lng: d.lng }];
  if (ngo) fitPoints.push(ngo);
  if (rider && moving) fitPoints.push(rider);

  return (
    <LiveMap pins={pins} covered={covered} remaining={remaining} fit={false} center={[d.lat, d.lng]} zoom={14}>
      <FitRoute points={fitPoints} fitKey={`${d.id}-${d.status}-${rider ? 'r' : 'n'}`} />
    </LiveMap>
  );
}
