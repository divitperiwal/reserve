import { useToast } from '../../components/ui';
import { api } from '../../lib/api';
import type { Donation } from '../../lib/types';
import { CodeSheet } from '../tracking/codes';
import { firstName, lateText, pastBestBefore, useDeliveries } from './useDeliveries';

export function ConfirmSheet({ delivery, onClose }: { delivery: Donation | null; onClose: () => void }) {
  const { upsert } = useDeliveries();
  const toast = useToast();
  const who = delivery?.volunteer ? firstName(delivery.volunteer.name) : 'the volunteer';
  return (
    <CodeSheet
      open={!!delivery}
      onClose={onClose}
      title="Confirm delivery"
      hint={`Enter the 4-digit code ${who} shows you.`}
      warning={delivery && pastBestBefore(delivery) ? lateText : undefined}
      onSubmit={async (code) => {
        upsert(await api.confirmDelivery(delivery!.id, code));
        toast(`${delivery!.title} received. Thank you.`);
      }}
    />
  );
}
