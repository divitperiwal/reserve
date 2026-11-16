import { Row, Toggle } from '../../components/ui';
import type { PushSetting } from '../../lib/push';

export function NotificationsRow({ push, subtitle }: { push: PushSetting; subtitle: string }) {
  return (
    <Row
      title="Notifications"
      subtitle={push.blocked ? 'Blocked in your browser settings' : subtitle}
      trailing={<Toggle label="Notifications" checked={push.on} disabled={push.busy || push.blocked} onChange={push.toggle} />}
      chevron={false}
    />
  );
}
