'use client';

import { BOARD_END, BOARD_START, SLOT, minutesToHHmm, tehranDateString } from '@/libs/meeting/meeting.time';
import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { TZDate } from '@date-fns/tz';
import { IconUsers, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { BookModal } from './reservations.component.book-modal';
import { ReservationInfoModal } from './reservations.component.info-modal';
import { ReservationModal } from './reservations.component.reservation-modal';
import { SlotCell } from './reservations.component.slot-cell';
import {
  AvailabilityResponse,
  AvailabilityRoom,
  AvailabilitySlot,
  SlotStatus,
} from './reservations.types';

interface BoardProps {
  date: string;
  data?: AvailabilityResponse;
  error: unknown;
  isLoading: boolean;
  refresh: () => void;
}

interface Selection {
  roomId: number;
  slots: number[]; // sorted start-minutes, contiguous
}

interface OwnSelection {
  room: AvailabilityRoom;
  slot: AvailabilitySlot;
}

function nowMinutesTehran(): number {
  const z = TZDate.tz('Asia/Tehran', new Date());
  return z.getHours() * 60 + z.getMinutes();
}

interface RoomNowStatus {
  status: SlotStatus | 'closed';
  until: number | null;
  ownerLabel?: string;
  isOwn?: boolean;
  lockTitle?: string;
}

function computeNowStatus(room: AvailabilityRoom, nowMinutes: number, outsideHours: boolean): RoomNowStatus {
  if (outsideHours) return { status: 'closed', until: null };

  const idx = room.slots.findIndex((s) => nowMinutes >= s.startMinutes && nowMinutes < s.endMinutes);
  if (idx === -1) return { status: 'closed', until: null };

  const current = room.slots[idx];
  let until = current.endMinutes;
  for (let i = idx + 1; i < room.slots.length; i++) {
    const s = room.slots[i];
    if (s.startMinutes !== until || s.status !== current.status) break;
    if (current.status === 'reserved' && s.reservation?.id !== current.reservation?.id) break;
    until = s.endMinutes;
  }

  return {
    status: current.status,
    until,
    ownerLabel: current.reservation?.isOwn ? 'شما' : current.reservation?.ownerName,
    isOwn: current.reservation?.isOwn,
    lockTitle: current.lockTitle,
  };
}

const STATUS_STYLES: Record<RoomNowStatus['status'], { dot: string; badge: string; label: string }> = {
  available: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600', label: 'آزاد' },
  reserved: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-600', label: 'رزرو شده' },
  locked: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600', label: 'قفل شده' },
  closed: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-500', label: 'خارج از ساعت کاری' },
};

function RoomNowBadge({ room, nowMinutes, outsideHours }: { room: AvailabilityRoom; nowMinutes: number; outsideHours: boolean }) {
  const now = computeNowStatus(room, nowMinutes, outsideHours);
  const style = STATUS_STYLES[now.status];
  const badgeLabel = now.status === 'reserved' && now.isOwn ? 'رزرو شما' : style.label;

  const detail =
    now.status === 'reserved'
      ? now.ownerLabel || 'رزرو'
      : now.status === 'locked'
        ? now.lockTitle || 'قفل هفتگی'
        : now.status === 'available' && now.until != null
          ? now.until >= BOARD_END
            ? 'تا پایان ساعات کاری'
            : `تا ${minutesToHHmm(now.until)}`
          : null;

  return (
    <>
      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', style.badge)}>
        <span className={cn('size-1.5 rounded-full', style.dot)} />
        {badgeLabel}
      </span>
      {detail && <span className="text-[11px] text-slate-400 truncate tabular-nums">{detail}</span>}
    </>
  );
}

export function ReservationBoard({ date, data, error, isLoading, refresh }: BoardProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [ownSelection, setOwnSelection] = useState<OwnSelection | null>(null);
  const [infoSelection, setInfoSelection] = useState<OwnSelection | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => nowMinutesTehran());
  const [today, setToday] = useState(() => tehranDateString(new Date()));

  // Clear any pending selection when the day changes.
  useEffect(() => {
    setSelection(null);
  }, [date]);

  // Keep the "right now" status fresh while the board stays open.
  useEffect(() => {
    const id = setInterval(() => {
      setNowMinutes(nowMinutesTehran());
      setToday(tehranDateString(new Date()));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const isToday = date === today;
  const outsideHours = nowMinutes < BOARD_START || nowMinutes >= BOARD_END;

  const toggleSlot = (roomId: number, startMinutes: number) => {
    setSelection((prev) => {
      // New room or empty selection → start fresh.
      if (!prev || prev.roomId !== roomId) {
        return { roomId, slots: [startMinutes] };
      }
      const slots = prev.slots;
      const min = slots[0];
      const max = slots[slots.length - 1];

      if (slots.includes(startMinutes)) {
        // Shrink from an endpoint; interior click restarts at that slot.
        if (startMinutes === min) {
          const next = slots.slice(1);
          return next.length ? { roomId, slots: next } : null;
        }
        if (startMinutes === max) {
          const next = slots.slice(0, -1);
          return next.length ? { roomId, slots: next } : null;
        }
        return { roomId, slots: [startMinutes] };
      }

      // Extend only to an immediately-adjacent slot; otherwise restart.
      if (startMinutes === min - SLOT) return { roomId, slots: [startMinutes, ...slots] };
      if (startMinutes === max + SLOT) return { roomId, slots: [...slots, startMinutes] };
      return { roomId, slots: [startMinutes] };
    });
  };

  const openOwn = (room: AvailabilityRoom, slot: AvailabilitySlot) => {
    setSelection(null);
    setOwnSelection({ room, slot });
  };

  const selectedRoom =
    selection && data?.rooms.find((r) => r.roomId === selection.roomId);
  const selStart = selection ? selection.slots[0] : 0;
  const selEnd = selection ? selection.slots[selection.slots.length - 1] + SLOT : 0;

  return (
    <div className="relative grow flex flex-col overflow-x-clip">
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        emptyMessage="اتاقی برای نمایش وجود ندارد"
        isEmpty={(d) => !d?.rooms.length}
        onRetry={refresh}
      >
        <div className="space-y-3 pb-4">
          {data?.rooms.map((room) => (
            <div key={room.roomId} className="p-4 rounded-2xl border border-slate-100 bg-white">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <div className="font-semibold text-slate-700 truncate">{room.roomName}</div>
                  {isToday && (
                    <RoomNowBadge room={room} nowMinutes={nowMinutes} outsideHours={outsideHours} />
                  )}
                </div>
                {room.capacity != null && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                    <IconUsers className="size-4" />
                    {room.capacity} نفر
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {room.slots.map((slot) => (
                  <SlotCell
                    key={slot.startMinutes}
                    slot={slot}
                    selected={
                      selection?.roomId === room.roomId &&
                      selection.slots.includes(slot.startMinutes)
                    }
                    onSelect={(s) => toggleSlot(room.roomId, s.startMinutes)}
                    onOpenOwn={(s) => openOwn(room, s)}
                    onOpenInfo={(s) => setInfoSelection({ room, slot: s })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DataView>


      {/* Selection action bar */}
      {selection && selectedRoom && (
        <div className="sticky bottom-0 max-w-3xl flex flex-col lg:flex-row lg:justify-between items-center gap-3 rounded-2xl bg-slate-900 text-white shadow-lg px-4 py-3">
          <div className="text-sm">
            <span className="font-semibold">{selectedRoom.roomName}</span>
            <span className="mx-2 text-white/50">·</span>
            <span className="tabular-nums">
              {minutesToHHmm(selStart)} تا {minutesToHHmm(selEnd)}
            </span>
          </div>
          <div className='flex gap-3 items-center w-full lg:w-auto'>
            <Button size="sm" className='grow' variant="white" onClick={() => setCreateOpen(true)}>
              ثبت رزرو
            </Button>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="p-1.5 rounded-lg hover:bg-white/10"
              aria-label="پاک کردن انتخاب"
            >
              <IconX className="size-5" />
            </button>
          </div>
        </div>
      )}

      {createOpen && selection && selectedRoom && (
        <BookModal
          date={date}
          roomId={selectedRoom.roomId}
          roomName={selectedRoom.roomName}
          startMinutes={selStart}
          endMinutes={selEnd}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            setSelection(null);
            refresh();
          }}
        />
      )}

      {ownSelection && ownSelection.slot.reservation && (
        <ReservationModal
          date={date}
          room={ownSelection.room}
          slot={ownSelection.slot}
          onClose={() => setOwnSelection(null)}
          onChanged={() => {
            setOwnSelection(null);
            refresh();
          }}
        />
      )}

      {infoSelection && infoSelection.slot.reservation && (
        <ReservationInfoModal
          room={infoSelection.room}
          slot={infoSelection.slot}
          onClose={() => setInfoSelection(null)}
        />
      )}
    </div>
  );
}
