'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { tehranDateString } from '@/libs/meeting/meeting.time';
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns-jalali';
import { useMemo, useState } from 'react';
import { useAvailability } from './reservations.api';
import { ReservationBoard } from './reservations.component.board';
import { ReservationDatePicker } from './reservations.component.date-picker';
import { WeekPicker } from './reservations.component.week-picker';

export default function ReservationsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    TZDate.tz('Asia/Tehran', new Date()),
  );

  const dateStr = useMemo(() => tehranDateString(selectedDate), [selectedDate]);
  const { data, error, isLoading, refresh } = useAvailability(dateStr);

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.reservations.roles}>
      <DashbaordLayout>
        <div className="space-y-3 grow flex flex-col overflow-auto">
          <div className="p-4 rounded-2xl bg-white flex items-center gap-4 justify-between">
            <div className="font-bold grow">رزرو اتاق جلسات</div>
            <div className="text-sm text-slate-500">
              {format(selectedDate, 'EEEE d MMMM yyyy')}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-3">
            {/* Mobile: week strip. Desktop: full month calendar. */}
            <div className="p-4 rounded-2xl bg-white h-fit lg:hidden">
              <WeekPicker selected={selectedDate} onSelect={setSelectedDate} />
            </div>
            <div className="p-4 rounded-2xl bg-white h-fit hidden lg:block">
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
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
