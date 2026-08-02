'use client';

import { minutesToHHmm } from '@/libs/meeting/meeting.time';
import { cn } from '@/libs/style/style.util.helpers';
import { IconClock, IconLock, IconPhone, IconUser } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AvailabilitySlot } from './reservations.types';

interface SlotCellProps {
  slot: AvailabilitySlot;
  selected: boolean;
  onSelect: (slot: AvailabilitySlot) => void;
  onOpenOwn: (slot: AvailabilitySlot) => void;
  onOpenInfo: (slot: AvailabilitySlot) => void;
}

const POPOVER_WIDTH = 224; // w-56
const GAP = 8;
const APPROX_HEIGHT = 170;
const MARGIN = 8;

export function SlotCell({
  slot,
  selected,
  onSelect,
  onOpenOwn,
  onOpenInfo,
}: SlotCellProps) {
  const { status, reservation, lockTitle } = slot;
  const isOwn = reservation?.isOwn ?? false;
  const hasPopover = status === 'reserved' || status === 'locked';

  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const openPopover = () => {
    const el = btnRef.current;
    if (!el || !hasPopover) return;
    const r = el.getBoundingClientRect();
    const left = Math.min(
      Math.max(r.left + r.width / 2, POPOVER_WIDTH / 2 + MARGIN),
      window.innerWidth - POPOVER_WIDTH / 2 - MARGIN,
    );
    const placeBelow = r.top < APPROX_HEIGHT + GAP;
    const top = placeBelow ? r.bottom + GAP : r.top - GAP;
    setCoords({ top, left, placement: placeBelow ? 'bottom' : 'top' });
  };
  const closePopover = () => setCoords(null);

  const handleClick = () => {
    if (status === 'available') onSelect(slot);
    else if (status === 'reserved') {
      isOwn ? onOpenOwn(slot) : onOpenInfo(slot);
    }
  };

  const timeRange = `${minutesToHHmm(slot.startMinutes)} تا ${minutesToHHmm(slot.endMinutes)}`;

  const inCellLabel =
    status === 'reserved'
      ? isOwn
        ? reservation?.title || 'شما'
        : reservation?.ownerName || 'رزرو'
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        dir="rtl"
        aria-label={timeRange}
        aria-disabled={status === 'locked'}
        onClick={handleClick}
        onMouseEnter={openPopover}
        onMouseLeave={closePopover}
        onFocus={openPopover}
        onBlur={closePopover}
        className={cn(
          'h-11 w-full rounded-xl border text-[11px] font-medium transition-colors flex flex-col items-center justify-center gap-0.5 px-1',
          {
            'border-primary bg-primary text-white shadow-sm cursor-pointer':
              status === 'available' && selected,
            'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 cursor-pointer':
              status === 'available' && !selected,
            'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer':
              status === 'reserved' && isOwn,
            'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer':
              status === 'reserved' && !isOwn,
            'border-amber-200 bg-amber-100 text-amber-600 cursor-default bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(217,119,6,0.12)_5px,rgba(217,119,6,0.12)_10px)]':
              status === 'locked',
          },
        )}
      >
        <span className="font-semibold tabular-nums">
          {minutesToHHmm(slot.startMinutes)}
        </span>
        {status === 'locked' ? (
          <IconLock className="size-3" />
        ) : inCellLabel ? (
          <span className="max-w-full truncate text-[9px]">{inCellLabel}</span>
        ) : null}
      </button>

      {/* Portal popover — fixed to the viewport so it is never clipped by the
          board's overflow and never causes horizontal scroll. */}
      {hasPopover &&
        coords &&
        createPortal(
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform:
                coords.placement === 'top'
                  ? 'translate(-50%, -100%)'
                  : 'translate(-50%, 0)',
            }}
            className="pointer-events-none z-[60] w-56"
          >
            <div className="rounded-xl bg-slate-900 p-3 text-right text-xs text-white shadow-xl ring-1 ring-white/10 space-y-2">
              {status === 'locked' ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {lockTitle || 'قفل تکرارشونده'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200">
                      <IconLock className="size-3" /> قفل هفتگی
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/60">
                    <IconClock className="size-3.5" />
                    <span className="tabular-nums">{timeRange}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {reservation?.title || 'بدون عنوان'}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px]',
                        isOwn ? 'bg-primary/30 text-white' : 'bg-white/10 text-white/70',
                      )}
                    >
                      {isOwn ? 'رزرو شما' : 'رزرو شده'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/70">
                    <IconUser className="size-3.5" />
                    <span>{reservation?.ownerName}</span>
                  </div>
                  {reservation?.purpose && (
                    <div className="text-white/60 leading-relaxed line-clamp-3">
                      {reservation.purpose}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-white/60">
                    <IconClock className="size-3.5" />
                    <span className="tabular-nums">{timeRange}</span>
                  </div>
                  {!isOwn && reservation?.ownerPhone && (
                    <div
                      className="flex items-center gap-1.5 border-t border-white/10 pt-2 text-white/70"
                      dir="ltr"
                    >
                      <IconPhone className="size-3.5" />
                      <span className="tabular-nums">{reservation.ownerPhone}</span>
                    </div>
                  )}
                  {!isOwn && (
                    <div className="text-[10px] text-white/40">
                      برای مشاهده و تماس کلیک کنید
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
