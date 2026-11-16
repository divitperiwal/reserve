import { Row, Toggle } from '../../components/ui';
import { useT } from '../../lib/i18n';
import type { PushSetting } from '../../lib/push';

export function NotificationsRow({ push, subtitle }: { push: PushSetting; subtitle: string }) {
  const t = useT();
  return (
    <Row
      title={t('Notifications')}
      subtitle={push.blocked ? t('Blocked in your browser settings') : subtitle}
      trailing={<Toggle label={t('Notifications')} checked={push.on} disabled={push.busy || push.blocked} onChange={push.toggle} />}
      chevron={false}
    />
  );
}
