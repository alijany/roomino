'use client';

import { minutesToHHmm } from '@/libs/meeting/meeting.time';
import { DataView } from '@/ui/molecules';
import { useState } from 'react';
import { BookModal } from './reservations.component.book-modal';
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
  room: AvailabilityRoom;
  slot: AvailabilitySlot;
}

export function ReservationBoard({ date, data, error, isLoading, refresh }: BoardProps) {
  const [booking, setBooking] = useState<Selection | null>(null);
  const [ownSelection, setOwnSelection] = useState<Selection | null>(null);

  const slotStarts = data?.slotStarts ?? [];
  const gridCols = `minmax(130px, 1.2fr) repeat(${slotStarts.length}, minmax(52px, 1fr))`;

  return (
    <>
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        emptyMessage="اتاقی برای نمایش وجود ندارد"
        isEmpty={(d) => !d?.rooms.length}
        onRetry={refresh}
      >
        <div className="overflow-x-auto">
          <div className="min-w-max space-y-1" dir="rtl">
            {/* Header: time labels */}
            <div className="grid gap-1" style={{ gridTemplateColumns: gridCols }}>
              <div className="sticky right-0 z-10 bg-white px-2 py-2 text-sm font-semibold text-slate-500">
                اتاق
              </div>
              {slotStarts.map((m) => (
                <div
                  key={m}
                  className="py-2 text-center text-[11px] font-medium text-slate-400"
                >
                  {minutesToHHmm(m)}
                </div>
              ))}
            </div>

            {/* Rows: one per room */}
            {data?.rooms.map((room) => (
              <div
                key={room.roomId}
                className="grid gap-1 items-center"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="sticky right-0 z-10 bg-white px-2 py-1">
                  <div className="font-semibold text-slate-700 text-sm truncate">
                    {room.roomName}
                  </div>
                  {room.capacity != null && (
                    <div className="text-[11px] text-slate-400">{room.capacity} نفر</div>
                  )}
                </div>
                {room.slots.map((slot) => (
                  <SlotCell
                    key={slot.startMinutes}
                    slot={slot}
                    onBook={(s) => setBooking({ room, slot: s })}
                    onOpenOwn={(s) => setOwnSelection({ room, slot: s })}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </DataView>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-4 text-xs text-slate-500">
        <LegendDot className="border-emerald-200 bg-emerald-50/60" label="آزاد" />
        <LegendDot className="border-primary/30 bg-primary/10" label="رزرو شما" />
        <LegendDot className="border-slate-200 bg-slate-100" label="رزرو دیگران" />
        <LegendDot className="border-amber-200 bg-amber-100" label="قفل تکرارشونده" />
      </div>

      {booking && (
        <BookModal
          date={date}
          room={booking.room}
          slot={booking.slot}
          onClose={() => setBooking(null)}
          onSuccess={() => {
            setBooking(null);
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
    </>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block size-3 rounded border ${className}`} />
      {label}
    </span>
  );
}
