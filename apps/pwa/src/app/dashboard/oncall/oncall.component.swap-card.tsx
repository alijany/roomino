'use client';

import { Badge } from '@/ui/atoms/ui.badge';
import { fa } from '../attendance/attendance.util';
import { OnCallSwap } from './oncall.types';

const STATUS_LABEL = { pending: 'در انتظار', accepted: 'پذیرفته شد', declined: 'نپذیرفت', cancelled: 'لغو شد' } as const;
const STATUS_TONE = { pending: 'warning', accepted: 'success', declined: 'danger', cancelled: 'muted' } as const;

export const StatusBadge = ({ status, coordinated = false }: { status: OnCallSwap['status']; coordinated?: boolean }) =>
  coordinated && status === 'accepted' ? (
    <Badge tone="info">هماهنگ‌شده</Badge>
  ) : (
    <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
  );

/**
 * One request in words. Told to the person it concerns, the other side reads
 * «شما»: `viewer` says which side is reading.
 */
export function swapSentence(s: OnCallSwap, viewer?: 'requester' | 'target'): string {
  const from = viewer === 'requester' ? 'شما' : (s.requester?.name ?? 'همکار');
  const to = viewer === 'target' ? 'شما' : (s.target?.name ?? 'همکار');
  const gives = viewer === 'requester' ? 'می‌دهید' : 'می‌دهد';
  if (s.kind === 'swap') return `${from}: ${fa(s.requesterJalali)} ⇄ ${to}: ${fa(s.targetJalali)}`;
  if (s.kind === 'partial') {
    return `${from} ساعت ${fa(s.startTime)} تا ${fa(s.endTime)} کشیک ${fa(s.requesterJalali)} را به ${to} ${gives}`;
  }
  return `${from} کشیک ${fa(s.requesterJalali)} را به ${to} ${gives}`;
}
