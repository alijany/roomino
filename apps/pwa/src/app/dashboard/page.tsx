'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { useAuth } from '@/components/auth/auth.context.provider';
import { Role } from '@/components/auth/auth.constants.roles';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { DataView } from '@/ui/molecules';
import { TZDate } from '@date-fns/tz';
import {
  IconCalendarEvent,
  IconChevronLeft,
  IconClock,
  IconDoor,
  IconUsers,
} from '@tabler/icons-react';
import { format } from 'date-fns-jalali';
import Link from 'next/link';
import { useMyReservations } from './reservations/reservations.api';
import { MyReservation } from './reservations/reservations.types';

const TEHRAN_TZ = 'Asia/Tehran';

function jalaliDate(iso: string): string {
  return format(new TZDate(new Date(iso), TEHRAN_TZ), 'EEEE d MMMM');
}
function jalaliTime(iso: string): string {
  return format(new TZDate(new Date(iso), TEHRAN_TZ), 'HH:mm');
}

const QUICK_ACTIONS = [
  { key: 'reservations', item: RouteItems.reservations, icon: <IconCalendarEvent className="size-6" />, adminOnly: false },
  { key: 'rooms', item: RouteItems.rooms, icon: <IconDoor className="size-6" />, adminOnly: true },
  { key: 'users', item: RouteItems.users, icon: <IconUsers className="size-6" />, adminOnly: true },
];

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const { data, error, isLoading, refresh } = useMyReservations();

  const today = format(TZDate.tz(TEHRAN_TZ, new Date()), 'EEEE d MMMM yyyy');
  const actions = QUICK_ACTIONS.filter((a) => !a.adminOnly || hasRole(Role.ADMIN));

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.dashboard.roles}>
      <DashbaordLayout>
        <div className="space-y-3 grow flex flex-col overflow-auto">
          {/* Greeting */}
          <div className="p-5 rounded-2xl bg-gradient-to-l from-primary/10 to-white border border-slate-100">
            <div className="text-lg font-bold text-slate-800">
              سلام، {user?.firstName || 'کاربر'} 👋
            </div>
            <div className="text-sm text-slate-500 mt-1">{today}</div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actions.map(({ key, item, icon }) => (
              <Link
                key={key}
                href={item.href}
                className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-3 hover:border-primary/40 hover:shadow-sm transition"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {icon}
                </div>
                <div className="grow font-semibold text-slate-700">{item.label}</div>
                <IconChevronLeft className="size-5 text-slate-300" />
              </Link>
            ))}
          </div>

          {/* Upcoming reservations */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100 grow flex flex-col">
            <div className="font-bold text-slate-700 mb-3">رزروهای پیش روی شما</div>
            <DataView
              data={data}
              error={error}
              isLoading={isLoading}
              className="flex flex-col gap-2"
              emptyMessage="رزرو پیش رویی ندارید"
              isEmpty={(d) => !d?.items.length}
              onRetry={refresh}
            >
              {data?.items?.map((res: MyReservation) => (
                <div
                  key={res.id}
                  className="px-4 py-3 rounded-2xl border border-slate-100 flex items-center gap-3 justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-700">
                      {res.room?.name ?? 'اتاق'}
                      {res.title && (
                        <span className="text-slate-400 font-normal"> · {res.title}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{jalaliDate(res.startAt)}</div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-slate-500 tabular-nums">
                    <IconClock className="size-4 text-slate-400" />
                    {jalaliTime(res.startAt)} تا {jalaliTime(res.endAt)}
                  </div>
                </div>
              ))}
            </DataView>
          </div>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
