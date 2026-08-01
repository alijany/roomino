'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { IconLock } from '@tabler/icons-react';
import { AvailabilitySlot } from './reservations.types';

interface SlotCellProps {
  slot: AvailabilitySlot;
  onBook: (slot: AvailabilitySlot) => void;
  onOpenOwn: (slot: AvailabilitySlot) => void;
}

export function SlotCell({ slot, onBook, onOpenOwn }: SlotCellProps) {
  const { status, reservation, lockTitle } = slot;
  const isOwn = reservation?.isOwn ?? false;

  const clickable = status === 'available' || (status === 'reserved' && isOwn);

  const handleClick = () => {
    if (status === 'available') onBook(slot);
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
        'h-10 w-full rounded-lg border text-[11px] font-medium transition-colors flex items-center justify-center px-1 truncate',
        {
          'border-emerald-200 bg-emerald-50/60 text-emerald-600 hover:bg-emerald-100 cursor-pointer':
            status === 'available',
          'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer':
            status === 'reserved' && isOwn,
          'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed':
            status === 'reserved' && !isOwn,
          'border-amber-200 bg-amber-100 text-amber-600 cursor-not-allowed bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(217,119,6,0.12)_5px,rgba(217,119,6,0.12)_10px)]':
            status === 'locked',
        },
      )}
    >
      {status === 'locked' ? (
        <IconLock className="size-3.5" />
      ) : status === 'reserved' ? (
        <span className="truncate">{isOwn ? reservation?.title || 'شما' : '—'}</span>
      ) : null}
    </button>
  );
}
