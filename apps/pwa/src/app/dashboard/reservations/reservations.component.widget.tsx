'use client';

import { tehranDateString } from '@/libs/meeting/meeting.time';
import { cn } from '@/libs/style/style.util.helpers';
import { TZDate } from '@date-fns/tz';
import { IconDoor } from '@tabler/icons-react';
import { format } from 'date-fns-jalali';
import { useMemo, useState } from 'react';
import { useAvailability } from './reservations.api';
import { ReservationBoard } from './reservations.component.board';
import { WeekPicker } from './reservations.component.week-picker';

/**
 * Room booking as one dashboard card: title and day on top, a week strip to
 * pick the day, then the rooms' slots in a scrolling area. Sized by its
 * parent — the dashboard gives it half the row. The full-page version is
 * `ReservationsView`.
 */
export function ReservationsWidget({ className }: { className?: string }) {
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    TZDate.tz('Asia/Tehran', new Date()),
  );

  const dateStr = useMemo(() => tehranDateString(selectedDate), [selectedDate]);
  const isToday = useMemo(() => dateStr === tehranDateString(new Date()), [dateStr]);
  const { data, error, isLoading, refresh } = useAvailability(
    dateStr,
    undefined,
    isToday ? { refreshInterval: 60000 } : undefined,
  );

  return (
    <section
      aria-labelledby="reservations-widget-title"
      className={cn('ui-surface flex shrink-0 flex-col overflow-hidden', className)}
    >
      <header className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
          <IconDoor className="size-5" />
        </span>
        <div className="min-w-0 grow">
          <h2 id="reservations-widget-title" className="font-bold text-slate-800">رزرو اتاق جلسات</h2>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {format(selectedDate, 'EEEE d MMMM yyyy')}
          </p>
        </div>
      </header>

      <div className="px-4 pb-3">
        <WeekPicker selected={selectedDate} onSelect={setSelectedDate} />
      </div>

      <div className="max-h-[32rem] min-h-0 overflow-y-auto overscroll-contain border-t border-slate-100 bg-slate-50/60 p-3">
        <ReservationBoard
          date={dateStr}
          data={data}
          error={error}
          isLoading={isLoading}
          refresh={refresh}
        />
      </div>
    </section>
  );
}
