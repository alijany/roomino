'use client';

import { tehranDateString } from '@/libs/meeting/meeting.time';
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns-jalali';
import { ReactNode, useMemo, useState } from 'react';
import { useAvailability } from './reservations.api';
import { ReservationBoard } from './reservations.component.board';
import { ReservationDatePicker } from './reservations.component.date-picker';
import { WeekPicker } from './reservations.component.week-picker';

/**
 * The room-booking screen without its page shell, so the dashboard home can
 * put its own cards above it (`top`) and scroll them together.
 */
export function ReservationsView({ top }: { top?: ReactNode }) {
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
    <div className="space-y-3 grow flex flex-col overflow-auto">
      {top}

      <div className="p-4 ui-surface flex items-center gap-4 justify-between">
        <div className="font-bold grow">رزرو اتاق جلسات</div>
        <div className="text-sm text-slate-500">
          {format(selectedDate, 'EEEE d MMMM yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-3">
        {/* Mobile: week strip. Desktop: full month calendar. */}
        <div className="p-4 ui-surface h-fit lg:hidden">
          <WeekPicker selected={selectedDate} onSelect={setSelectedDate} />
        </div>
        <div className="p-4 ui-surface h-fit hidden lg:block lg:sticky top-0">
          <ReservationDatePicker selected={selectedDate} onSelect={setSelectedDate} />
        </div>

        <ReservationBoard
          date={dateStr}
          data={data}
          error={error}
          isLoading={isLoading}
          refresh={refresh}
        />
      </div>
    </div>
  );
}
