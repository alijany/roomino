import { Badge } from '@/ui/atoms';
import { STATUS_META } from './finance.constants';
import { PaymentRequestStatus } from './finance.types';

export function StatusBadge({
  status,
  size = 'sm',
}: {
  status: PaymentRequestStatus;
  size?: 'sm' | 'md';
}) {
  const meta = STATUS_META[status];

  if (!meta) {
    return <Badge tone="neutral" size={size}>{status}</Badge>;
  }

  return (
    <Badge tone={meta.tone} size={size} className="whitespace-nowrap">
      {meta.label}
    </Badge>
  );
}
