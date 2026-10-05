'use client';

import { DataView } from '@/ui/molecules';
import { IconArrowLeft, IconUsersGroup } from '@tabler/icons-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMyToday } from './attendance.api';
import { PageHeader, Panel } from './attendance.component.layout';

/** Mount personal attendance tools only after an active profile is confirmed. */
export function AttendanceProfileGate({
  children,
  title,
  icon,
}: {
  children: ReactNode;
  title: string;
  icon: ReactNode;
}) {
  const { data, error, isLoading, refresh } = useMyToday();

  return (
    <DataView
      data={data}
      error={error}
      isLoading={isLoading}
      onRetry={refresh}
      className="flex min-h-0 grow flex-col gap-3 overflow-auto"
    >
      {data?.hasProfile ? children : data && (
        <>
          <PageHeader icon={icon} title={title} />
          <AttendanceProfileUnavailable isApprover={data.isApprover} />
        </>
      )}
    </DataView>
  );
}

export function AttendanceTeamLink() {
  return (
    <Link
      href="/dashboard/attendance/team"
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300"
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        <IconUsersGroup className="size-5" />
      </div>
      <div className="grow">
        <div className="font-semibold text-slate-800">تیم من</div>
        <div className="text-xs text-slate-500">وضعیت امروز، درخواست‌ها و گزارش کارکرد اعضای گروه</div>
      </div>
      <IconArrowLeft className="size-4 text-slate-400" />
    </Link>
  );
}

export function AttendanceProfileUnavailable({ isApprover }: { isApprover: boolean }) {
  return (
    <div className="space-y-3">
      <Panel className="items-center py-10 text-center">
        <p className="font-semibold text-slate-700">
          پروفایل حضور و غیاب برای شما تعریف نشده یا غیرفعال است.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          برای فعال‌سازی حضور و غیاب، مشاهده کارکرد و ثبت درخواست با منابع انسانی تماس بگیرید.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 rounded-xl px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          بازگشت به پیشخوان
        </Link>
      </Panel>
      {isApprover && <AttendanceTeamLink />}
    </div>
  );
}
