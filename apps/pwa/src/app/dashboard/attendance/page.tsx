'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import {
  IconArrowLeft,
  IconBeach,
  IconCurrentLocation,
  IconFingerprint,
  IconHome,
  IconLogin,
  IconLogout,
  IconUsersGroup,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useCheckIn, useCheckOut, useHolidays, useMyToday } from './attendance.api';
import { PageHeader, Panel, StatTile } from './attendance.component.layout';
import { REMOTE_STATUS_LABELS } from './attendance.constants';
import { CheckResult, MyToday } from './attendance.types';
import { errorMessage, fa, getPosition, hm, jalaliLabel } from './attendance.util';

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
            {data && !data.hasProfile ? <NoProfile today={data} /> : data && <Today today={data} onChange={refresh} />}
          </DataView>
        </div>
      </DashbaordLayout>
    </ProtectedRoute>
  );
}

function TeamLink() {
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

function NoProfile({ today }: { today: MyToday }) {
  return (
    <div className="space-y-3">
      <Panel className="items-center py-10 text-center">
        <p className="font-semibold text-slate-700">
          پروفایل حضور و غیاب برای شما تعریف نشده یا غیرفعال است.
        </p>
        <p className="mt-1 text-sm text-slate-500">برای ثبت ورود و خروج با منابع انسانی تماس بگیرید.</p>
      </Panel>
      {today.isApprover && <TeamLink />}
    </div>
  );
}

function Today({ today, onChange }: { today: MyToday; onChange: () => void }) {
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [locating, setLocating] = useState(false);
  const [offerRemote, setOfferRemote] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { data: holidays } = useHolidays({ upcoming: 3 });

  const att = today.attendance;
  const busy = locating || checkIn.isLoading || checkOut.isLoading;
  const month = today.month;

  /**
   * Position is optional: without it the server decides (no GPS rule, a
   * remote day, or a refusal that offers remote check-in).
   */
  const locate = async () => {
    setLocating(true);
    try {
      return await getPosition();
    } catch (error) {
      toast.warning((error as Error).message);
      return {};
    } finally {
      setLocating(false);
    }
  };

  const handle = (result: CheckResult) => {
    if (result.success) {
      toast.success(result.message);
      setOfferRemote(false);
      setLastError(null);
      onChange();
    } else {
      setLastError(result.message);
      setOfferRemote(Boolean(result.canRemote));
    }
  };

  const doCheckIn = async (remote = false) => {
    const position = await locate();
    try {
      handle(await checkIn.submit({ ...position, remote: remote || undefined }));
    } catch (error) {
      toast.error(errorMessage(error, 'ثبت ورود انجام نشد'));
    }
  };

  const doCheckOut = async () => {
    const position = await locate();
    try {
      handle(await checkOut.submit(position));
    } catch (error) {
      toast.error(errorMessage(error, 'ثبت خروج انجام نشد'));
    }
  };

  const done = Boolean(att?.checkIn && att?.checkOut);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel className="gap-4 lg:col-span-2">
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

        {today.remoteStatus && (
          <p className="flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-700">
            <IconHome className="size-4" />
            {REMOTE_STATUS_LABELS[today.remoteStatus]}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <div className="text-xs text-slate-500">ورود</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{fa(att?.checkIn) || '--:--'}</div>
            {att?.workMode === 'remote' && att.checkIn && <div className="text-xs text-sky-600">دورکاری</div>}
            {att?.checkInDistanceM != null && (
              <div className="text-xs text-slate-400">{fa(att.checkInDistanceM)} متر از محل کار</div>
            )}
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <div className="text-xs text-slate-500">خروج</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{fa(att?.checkOut) || '--:--'}</div>
          </div>
        </div>

        {lastError && (
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

        {done ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-center text-sm text-emerald-700">
            ورود و خروج امروز ثبت شده است.
          </p>
        ) : !att?.checkIn ? (
          <Button size="lg" className="gap-2" disabled={busy} onClick={() => doCheckIn()}>
            {locating ? <IconCurrentLocation className="size-5 animate-pulse" /> : <IconLogin className="size-5" />}
            {locating ? 'در حال دریافت موقعیت...' : 'ثبت ورود'}
          </Button>
        ) : (
          <Button size="lg" variant="secondary" className="gap-2" disabled={busy} onClick={doCheckOut}>
            {locating ? <IconCurrentLocation className="size-5 animate-pulse" /> : <IconLogout className="size-5" />}
            {locating ? 'در حال دریافت موقعیت...' : 'ثبت خروج'}
          </Button>
        )}
      </Panel>

      <div className="space-y-3">
        {today.isApprover && <TeamLink />}

        {month && (
          <Panel className="gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">{fa(month.label)}</span>
              <Link href="/dashboard/attendance/my-report" className="text-xs text-sky-600">
                گزارش کامل
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="کارکرد" value={hm(month.worked)} />
              <StatTile label="اختلاف" value={hm(month.balance)} tone={month.balance < 0 ? 'danger' : 'success'} />
              <StatTile label="اضافه کار" value={hm(month.overtime)} />
              <StatTile label="غیبت" value={hm(month.absence)} tone={month.absence ? 'danger' : 'neutral'} />
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
