'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import {
  IconBeach,
  IconCurrentLocation,
  IconFingerprint,
  IconHome,
  IconLogin,
  IconLogout,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useHolidays, useMyToday } from './attendance.api';
import { LocationIssueNotice } from './attendance.component.location-issue';
import {
  FlexibleHint,
  MissingCheckOutNotice,
  OvertimeNotice,
  UntrackedActions,
} from './attendance.component.mode-today';
import { PageHeader, Panel, StatTile } from './attendance.component.layout';
import { AttendanceProfileUnavailable, AttendanceTeamLink } from './attendance.component.profile-gate';
import { PunchHint, ScheduleModeAction, ScheduleModeNotice } from './attendance.component.schedule-mode';
import { REMOTE_STATUS_LABELS } from './attendance.constants';
import { useCheckInFlow } from './attendance.hook.check-in';
import { AttendanceMode, MyToday } from './attendance.types';
import { fa, hm, jalaliLabel, todayPunches } from './attendance.util';

/**
 * ورود و خروج — the employee's day: check in/out with GPS, today's shift,
 * the month at a glance. Approvers also get the way into "my team".
 */
export default function AttendanceHomePage() {
  const { data, error, isLoading, refresh } = useMyToday();

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconFingerprint className="size-6" />}
            title="ورود و خروج"
            subtitle={data?.date ? `امروز ${jalaliLabel(data.date)}` : 'ثبت حضور روزانه'}
          />

          <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
            {data && !data.hasProfile ? <AttendanceProfileUnavailable isApprover={data.isApprover} /> : data && <Today today={data} onChange={refresh} />}
          </DataView>
        </div>
      </DashbaordLayout>
    </ProtectedRoute>
  );
}

function Today({ today, onChange }: { today: MyToday; onChange: () => void }) {
  const { locating, busy, offerRemote, lastError, locationIssue, retryLocation, doCheckIn, doCheckOut } = useCheckInFlow(onChange);
  const { data: holidays } = useHolidays({ upcoming: 3 });

  const att = today.attendance;
  const month = today.month;
  const scheduleMode = Boolean(today.scheduleMode);
  // «بدون ثبت» has no check-in at all — «امروز هستم» takes its place.
  const mode = today.attendanceMode ?? AttendanceMode.TRACKED;
  const untracked = mode === AttendanceMode.UNTRACKED && !scheduleMode;
  const punches = todayPunches(today, scheduleMode);
  // Schedule mode: a time nobody recorded is the shift's.
  const presumed = scheduleMode && Boolean(today.shiftStart) && !today.holiday;
  const inTime = punches.in.time ?? (presumed ? today.shiftStart : null);
  const outTime = punches.out.time ?? (presumed ? today.shiftEnd : null);

  const done = Boolean(att?.checkIn && att?.checkOut);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
      <Panel className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm text-slate-500">شیفت امروز</div>
            <div className="font-semibold tabular-nums text-slate-800">
              {today.holiday
                ? `تعطیل — ${today.holiday}`
                : today.shiftStart
                  ? `${fa(today.shiftStart)} تا ${fa(today.shiftEnd)}`
                  : 'بدون شیفت'}
            </div>
          </div>
          {today.workplace && (
            <div className="text-left text-sm text-slate-500">
              {today.workplace.name}
              <div className="text-xs text-slate-400">
                شعاع مجاز {fa(today.workplace.radiusMeters)} متر
              </div>
            </div>
          )}
        </div>

        <MissingCheckOutNotice today={today} onChange={onChange} />

        {scheduleMode ? (
          <ScheduleModeNotice note={today.scheduleModeNote} className="text-sm" />
        ) : mode === AttendanceMode.FLEXIBLE ? (
          <FlexibleHint />
        ) : today.remoteStatus && !untracked && (
          <p className="flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-700">
            <IconHome className="size-4" />
            {REMOTE_STATUS_LABELS[today.remoteStatus]}
          </p>
        )}

        {!untracked && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-inset ring-slate-200/60">
            <div className="text-xs text-slate-500">ورود</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{fa(inTime) || '--:--'}</div>
            <div className="text-xs">
              <PunchHint punch={punches.in} presumed={presumed} remote={att?.workMode === 'remote' && Boolean(att.checkIn)} />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-inset ring-slate-200/60">
            <div className="text-xs text-slate-500">خروج</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{fa(outTime) || '--:--'}</div>
            <div className="text-xs">
              <PunchHint punch={punches.out} presumed={presumed} />
            </div>
          </div>
        </div>
        )}

        {today.overtimeSuggestion && <OvertimeNotice suggestion={today.overtimeSuggestion} />}

        {locationIssue && !scheduleMode && !untracked && (
          <LocationIssueNotice issue={locationIssue} busy={busy} onRetry={retryLocation} />
        )}

        {lastError && !scheduleMode && !untracked && (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <p>{fa(lastError)}</p>
            {offerRemote && !att?.checkIn && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" className="gap-1" disabled={busy} onClick={() => doCheckIn(true)}>
                  <IconHome className="size-4" />
                  ثبت ورود دورکاری
                </Button>
                <span className="text-xs text-rose-600">
                  اگر امروز دورکاری مجاز نداشته باشید، درخواست دورکاری برای تایید مدیر ارسال می‌شود.
                </span>
              </div>
            )}
          </div>
        )}

        {untracked ? (
          <UntrackedActions today={today} onChange={onChange} />
        ) : scheduleMode ? (
          presumed && <ScheduleModeAction today={today} punches={punches} onChange={onChange} />
        ) : done ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-center text-sm text-emerald-700">
            ورود و خروج امروز ثبت شده است.
          </p>
        ) : !att?.checkIn ? (
          <Button size="lg" className="w-full gap-2 text-base" disabled={busy} onClick={() => doCheckIn()}>
            {locating ? <IconCurrentLocation className="size-5 animate-pulse" /> : <IconLogin className="size-5" />}
            {locating ? 'در حال دریافت موقعیت...' : 'ثبت ورود'}
          </Button>
        ) : (
          <Button size="lg" className="w-full gap-2 bg-slate-900 text-base shadow-none hover:bg-slate-800" disabled={busy} onClick={doCheckOut}>
            {locating ? <IconCurrentLocation className="size-5 animate-pulse" /> : <IconLogout className="size-5" />}
            {locating ? 'در حال دریافت موقعیت...' : 'ثبت خروج'}
          </Button>
        )}
      </Panel>

      </div>

      <div className="space-y-3">
        {today.isApprover && <AttendanceTeamLink />}

        {month && (
          <Panel className="gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">{fa(month.label)}</span>
              <Link href="/dashboard/attendance/my-report" className="text-xs text-sky-600">
                گزارش کامل
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {month.daily ? (
                <>
                  <StatTile label="حضور" value={`${fa(month.attendedDays)} از ${fa(month.requiredDays)} روز`} />
                  <StatTile label="غیبت" value={`${fa(month.absentDays)} روز`} tone={month.absentDays ? 'danger' : 'neutral'} />
                  <StatTile label="مرخصی" value={`${fa(month.leaveDays)} روز`} />
                  <StatTile label="دورکاری" value={`${fa(month.remoteDays)} روز`} />
                </>
              ) : (
                <>
                  <StatTile label="کارکرد" value={hm(month.worked)} />
                  <StatTile label="اختلاف" value={hm(month.balance)} tone={month.balance < 0 ? 'danger' : 'success'} />
                  <StatTile label="اضافه کار" value={hm(month.overtime)} />
                  <StatTile label="غیبت" value={hm(month.absence)} tone={month.absence ? 'danger' : 'neutral'} />
                </>
              )}
            </div>
            <Link
              href="/dashboard/attendance/my-requests"
              className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
            >
              <span>درخواست‌های در دست بررسی</span>
              <span className="font-semibold">{fa(today.pendingRequests ?? 0)}</span>
            </Link>
          </Panel>
        )}

        {holidays && holidays.items.length > 0 && (
          <Panel className="gap-2">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <IconBeach className="size-4" />
              تعطیلات پیش رو
            </div>
            <ul className="space-y-1 text-sm">
              {holidays.items.map((holiday) => (
                <li key={holiday.id} className="flex justify-between gap-2 text-slate-600">
                  <span className="truncate">{holiday.title}</span>
                  <span className="shrink-0 tabular-nums text-slate-400">{fa(holiday.jalali)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
