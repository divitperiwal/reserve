import { useEffect, type ReactNode } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';

export type PinKind = 'donor' | 'ngo' | 'rider' | 'critical' | 'soon' | 'fresh' | 'me';

export interface Pin {
  id: string | number;
  lat: number;
  lng: number;
  kind: PinKind;
  label?: string;
  onClick?: () => void;
}

const iconCache = new Map<string, L.DivIcon>();

function pinIcon(kind: PinKind, label?: string) {
  const key = `${kind}|${label ?? ''}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const tag = label ? `<span class="rs-pin-label">${label.replace(/</g, '&lt;')}</span>` : '';
    icon = L.divIcon({
      className: kind === 'rider' ? 'rs-pin-wrap rs-glide' : 'rs-pin-wrap',
      html: `<span class="rs-pin rs-pin-${kind}"></span>${tag}`,
      iconSize: [0, 0],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

// Keep every pin in view whenever the set of points changes
function FitBounds({ points, padding, padLeft }: { points: [number, number][]; padding: number; padLeft: number }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0]!, Math.max(map.getZoom(), 14), { animate: true });
    else map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [padding + padLeft, padding], paddingBottomRight: [padding, padding], animate: true, maxZoom: 16 });
    return () => {
      try {
        map.stop();
      } catch {
        // Already removed: Leaflet stops its own animations on remove
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, padding, padLeft]);
  return null;
}

interface LiveMapProps {
  pins: Pin[];
  covered?: [number, number][];
  remaining?: [number, number][];
  radius?: { lat: number; lng: number; km: number };
  fit?: boolean;
  padding?: number;
  padLeft?: number;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
}

export function LiveMap({
  pins,
  covered,
  remaining,
  radius,
  fit = true,
  padding = 48,
  padLeft = 0,
  center,
  zoom = 13,
  interactive = true,
  className,
  children,
}: LiveMapProps) {
  const first = center ?? (pins[0] ? ([pins[0].lat, pins[0].lng] as [number, number]) : ([12.9, 80.1] as [number, number]));
  return (
    <MapContainer
      center={first}
      zoom={zoom}
      zoomControl={false}
      attributionControl
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      className={`map-warm ${className ?? ''}`}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {radius && <RadiusCircle {...radius} />}
      {remaining && remaining.length > 1 && (
        <Polyline positions={remaining} pathOptions={{ color: '#9a9a94', weight: 3, dashArray: '2 10', lineCap: 'round' }} />
      )}
      {covered && covered.length > 1 && (
        <Polyline positions={covered} pathOptions={{ color: '#3a7d44', weight: 4, lineCap: 'round', lineJoin: 'round' }} />
      )}
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p.kind, p.label)}
          eventHandlers={p.onClick ? { click: p.onClick } : undefined}
          keyboard={!!p.onClick}
        >
          {!p.label && p.onClick && <Tooltip direction="top" offset={[0, -10]}>Open</Tooltip>}
        </Marker>
      ))}
      {fit && <FitBounds points={pins.map((p) => [p.lat, p.lng])} padding={padding} padLeft={padLeft} />}
      {children}
    </MapContainer>
  );
}

function RadiusCircle({ lat, lng, km }: { lat: number; lng: number; km: number }) {
  const map = useMap();
  useEffect(() => {
    const c = L.circle([lat, lng], {
      radius: km * 1000,
      color: '#181814',
      weight: 1.5,
      dashArray: '4 6',
      fillColor: '#181814',
      fillOpacity: 0.04,
    }).addTo(map);
    return () => {
      c.remove();
    };
  }, [lat, lng, km, map]);
  return null;
}
