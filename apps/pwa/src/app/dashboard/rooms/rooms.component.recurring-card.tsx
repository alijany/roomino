'use client';

import { WEEKDAYS, minutesToHHmm } from '@/libs/meeting/meeting.time';
import {
  IconCalendarRepeat,
  IconClock,
  IconDoor,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Recurring } from './rooms.types';

interface RecurringCardProps {
  item: Recurring;
  onOpen: (item: Recurring) => void;
}

const POPOVER_WIDTH = 240; // w-60
const GAP = 8;
const APPROX_HEIGHT = 140;
const MARGIN = 8;

export function RecurringCard({ item, onOpen }: RecurringCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const openPopover = () => {
    const el = cardRef.current;
    if (!el) return;
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

  const timeRange = `${minutesToHHmm(item.startMinutes)} تا ${minutesToHHmm(item.endMinutes)}`;

  return (
    <>
      <button
        ref={cardRef}
        type="button"
        onClick={() => onOpen(item)}
        onMouseEnter={openPopover}
        onMouseLeave={closePopover}
        onFocus={openPopover}
        onBlur={closePopover}
        className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-right transition hover:border-amber-200 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)]"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <IconCalendarRepeat className="size-6" />
        </div>
        <div className="grow min-w-0 space-y-1">
          <h3 className="font-semibold text-slate-800 truncate">{item.title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <IconDoor className="size-3.5" />
              {item.room?.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <IconCalendarRepeat className="size-3.5" />
              هر {WEEKDAYS[item.weekday]}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <IconClock className="size-3.5" />
              {timeRange}
            </span>
          </div>
        </div>
      </button>

      {/* Portal popover — fixed to the viewport, clamped, flips below near
          the top edge; never clipped and never causes horizontal scroll. */}
      {coords &&
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
            className="pointer-events-none z-[60] w-60"
          >
            <div className="rounded-xl bg-slate-900 p-3 text-right text-xs text-white shadow-xl ring-1 ring-white/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{item.title}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200">
                  <IconCalendarRepeat className="size-3" /> قفل هفتگی
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70">
                <IconDoor className="size-3.5" />
                <span>{item.room?.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/60">
                <IconCalendarRepeat className="size-3.5" />
                <span>هر {WEEKDAYS[item.weekday]}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/60">
                <IconClock className="size-3.5" />
                <span className="tabular-nums">{timeRange}</span>
              </div>
              <div className="text-[10px] text-white/40">برای مشاهده و حذف کلیک کنید</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
