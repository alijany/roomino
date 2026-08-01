'use client';

import { SLOT, minutesToHHmm } from '@/libs/meeting/meeting.time';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
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

export function ReservationBoard({ date, data, error, isLoading, refresh }: BoardProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [ownSelection, setOwnSelection] = useState<OwnSelection | null>(null);
  const [infoSelection, setInfoSelection] = useState<OwnSelection | null>(null);

  // Clear any pending selection when the day changes.
  useEffect(() => {
    setSelection(null);
  }, [date]);

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
    <div className="relative grow flex flex-col">
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
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-slate-700">{room.roomName}</div>
                {room.capacity != null && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
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
