'use client';

import { minutesToHHmm } from '@/libs/meeting/meeting.time';
import { cn } from '@/libs/style/style.util.helpers';
import { IconLock } from '@tabler/icons-react';
import { AvailabilitySlot } from './reservations.types';

interface SlotCellProps {
  slot: AvailabilitySlot;
  selected: boolean;
  onSelect: (slot: AvailabilitySlot) => void;
  onOpenOwn: (slot: AvailabilitySlot) => void;
}

export function SlotCell({ slot, selected, onSelect, onOpenOwn }: SlotCellProps) {
  const { status, reservation, lockTitle } = slot;
  const isOwn = reservation?.isOwn ?? false;

  const clickable = status === 'available' || (status === 'reserved' && isOwn);

  const handleClick = () => {
    if (status === 'available') onSelect(slot);
    else if (status === 'reserved' && isOwn) onOpenOwn(slot);
  };

  const title =
    status === 'locked'
      ? lockTitle
      : status === 'reserved'
        ? isOwn
          ? reservation?.title || 'رزرو شما'
          : `رزرو ${reservation?.ownerName ?? ''}`.trim()
        : 'آزاد';

  return (
    <button
      type="button"
      dir="rtl"
      title={title}
      disabled={!clickable}
      onClick={handleClick}
      className={cn(
        'h-11 w-full rounded-xl border text-[11px] font-medium transition-colors flex flex-col items-center justify-center gap-0.5 px-1',
        {
          // selected takes visual priority
          'border-primary bg-primary text-white shadow-sm cursor-pointer':
            status === 'available' && selected,
          'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 cursor-pointer':
            status === 'available' && !selected,
          'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer':
            status === 'reserved' && isOwn,
          'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed':
            status === 'reserved' && !isOwn,
          'border-amber-200 bg-amber-100 text-amber-600 cursor-not-allowed bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(217,119,6,0.12)_5px,rgba(217,119,6,0.12)_10px)]':
            status === 'locked',
        },
      )}
    >
      <span className="font-semibold tabular-nums">{minutesToHHmm(slot.startMinutes)}</span>
      {status === 'locked' ? (
        <IconLock className="size-3" />
      ) : status === 'reserved' ? (
        <span className="max-w-full truncate text-[9px]">
          {isOwn ? reservation?.title || 'شما' : 'رزرو'}
        </span>
      ) : null}
    </button>
  );
}
