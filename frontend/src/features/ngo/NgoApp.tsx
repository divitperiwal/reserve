import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './Shell';
import { Today } from './Today';
import { Deliveries } from './Deliveries';
import { Insights } from './Insights';
import { MapView } from './MapView';
import { Profile } from './Profile';
import { DeliveriesProvider } from './useDeliveries';

export default function NgoApp() {
  return (
    <DeliveriesProvider>
      <Shell>
        <Routes>
          <Route index element={<Today />} />
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="activity" element={<Navigate to="/ngo/deliveries" replace />} />
          <Route path="insights" element={<Insights />} />
          <Route path="map" element={<MapView />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/ngo" replace />} />
        </Routes>
      </Shell>
    </DeliveriesProvider>
  );
}
