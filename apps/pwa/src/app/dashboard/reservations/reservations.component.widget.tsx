'use client';

import { tehranDateString } from '@/libs/meeting/meeting.time';
import { cn } from '@/libs/style/style.util.helpers';
import { DataView } from '@/ui/molecules';
import { IconDoor } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAvailability } from './reservations.api';
import { ReservationBoard } from './reservations.component.board';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Room booking as one compact dashboard card: a tab per room, today or
 * tomorrow, and the chosen room's status and slots with booking right there.
 * Sized by its parent — the dashboard gives it half the row. The full-page
 * version, with the whole week, is `ReservationsView`.
 */
export function ReservationsWidget({ className }: { className?: string }) {
  const [day, setDay] = useState<'today' | 'tomorrow'>('today');
  const [roomId, setRoomId] = useState<number | null>(null);

  const dates = useMemo(() => {
    const now = new Date();
    return {
      today: tehranDateString(now),
      tomorrow: tehranDateString(new Date(now.getTime() + DAY_MS)),
    };
  }, []);
  const date = dates[day];

  const { data, error, isLoading, refresh } = useAvailability(
    date,
    undefined,
    day === 'today' ? { refreshInterval: 60000 } : undefined,
  );

  // Open on the first room, and fall back to it if the chosen one is gone.
  useEffect(() => {
    if (!data?.rooms.length) return;
    if (roomId == null || !data.rooms.some((r) => r.roomId === roomId)) {
      setRoomId(data.rooms[0].roomId);
    }
  }, [data, roomId]);

  return (
    <section
      aria-labelledby="reservations-widget-title"
      className={cn('ui-surface flex shrink-0 flex-col overflow-hidden', className)}
    >
      <header className="flex flex-wrap items-center gap-3 p-4 pb-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
          <IconDoor className="size-5" />
        </span>
        <div className="min-w-0 grow">
          <h2 id="reservations-widget-title" className="font-bold text-slate-800">رزرو اتاق جلسات</h2>
          <Link href="/dashboard/reservations" className="text-xs text-brand-700 hover:underline">
            همه‌ی روزها و رزروهای من
          </Link>
        </div>
        <div role="group" aria-label="روز" className="flex shrink-0 rounded-xl bg-slate-100 p-1 text-sm">
          {(['today', 'tomorrow'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={day === value}
              onClick={() => setDay(value)}
              className={cn(
                'rounded-lg px-3 py-1 font-medium transition-colors',
                day === value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {value === 'today' ? 'امروز' : 'فردا'}
            </button>
          ))}
        </div>
      </header>

      {data && data.rooms.length > 1 && (
        <div role="tablist" aria-label="اتاق‌ها" className="flex gap-1.5 overflow-x-auto px-4 pb-3">
          {data.rooms.map((room) => (
            <button
              key={room.roomId}
              type="button"
              role="tab"
              aria-selected={room.roomId === roomId}
              onClick={() => setRoomId(room.roomId)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                room.roomId === roomId
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {room.roomName}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-[26rem] min-h-0 overflow-y-auto overscroll-contain border-t border-slate-100 bg-slate-50/60 p-3">
        <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
          {roomId != null && (
            <ReservationBoard
              date={date}
              onlyRoomId={roomId}
              data={data}
              error={error}
              isLoading={isLoading}
              refresh={refresh}
            />
          )}
        </DataView>
      </div>
    </section>
  );
}
