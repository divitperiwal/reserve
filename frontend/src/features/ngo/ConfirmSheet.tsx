import { useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { useT } from '../../lib/i18n';
import type { Donation } from '../../lib/types';
import { CodeSheet } from '../tracking/codes';
import { firstName, lateText, pastBestBefore, useDeliveries } from './useDeliveries';

export function ConfirmSheet({ delivery, onClose }: { delivery: Donation | null; onClose: () => void }) {
  const { upsert } = useDeliveries();
  const toast = useToast();
  const t = useT();
  const who = delivery?.volunteer ? firstName(delivery.volunteer.name) : t('the volunteer');
  return (
    <CodeSheet
      open={!!delivery}
      donationId={delivery?.id ?? 0}
      onClose={onClose}
      title={t('Confirm delivery')}
      hint={t('Enter the 4-digit code {name} shows you.', { name: who })}
      warning={delivery && pastBestBefore(delivery) ? t(lateText) : undefined}
      onSubmit={async (code) => {
        upsert(await api.confirmDelivery(delivery!.id, code));
        toast(t('{title} received. Thank you.', { title: delivery!.title }));
      }}
    />
  );
}
