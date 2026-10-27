import { Badge } from '@/ui/atoms';
import { STATUS_META } from './advance-request.constants';
import { AdvanceRequestStatus } from './advance-request.types';

export function StatusBadge({
  status,
  size = 'sm',
}: {
  status: AdvanceRequestStatus;
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
