'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import {
  IconArrowLeft,
  IconCalendarStats,
  IconCurrentLocation,
  IconFingerprint,
  IconHome,
  IconLogin,
  IconLogout,
  IconMailbox,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMyToday } from './attendance.api';
import { PunchHint, ScheduleModeAction, ScheduleModeNotice } from './attendance.component.schedule-mode';
import { REMOTE_STATUS_LABELS } from './attendance.constants';
import { useCheckInFlow } from './attendance.hook.check-in';
import { MyToday } from './attendance.types';
import { clockMinutes, durationLabel, fa, hm, tehranClockNow, todayPunches } from './attendance.util';

/**
 * Today's attendance on the dashboard home: where the day stands and the one
 * action that comes next, a thumb's reach from opening the app. People
 * without an attendance profile don't get the card at all.
 */
export function AttendanceTodayWidget() {
  const { data, error, isLoading, refresh } = useMyToday();

  if (data && !data.hasProfile) return null;

  return (
    // `shrink-0`: it sits in the dashboard's scrolling flex column, where
    // `overflow-hidden` (for the progress hairline) would let it be squashed.
    <section aria-labelledby="attendance-widget-title" className="ui-surface relative shrink-0 overflow-hidden p-4 lg:px-5 lg:py-4">
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        onRetry={refresh}
        variant="inline"
        errorTitle="وضعیت حضور بارگذاری نشد"
      >
        {data && <WidgetBody today={data} onChange={refresh} />}
      </DataView>
    </section>
  );
}

type DayState = 'out' | 'late' | 'working' | 'schedule' | 'done' | 'off';

const STATE_META: Record<DayState, { label: string; className: string; dot: string }> = {
  out: { label: 'در انتظار ورود', className: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  late: { label: 'ورود ثبت نشده', className: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  working: { label: 'در حال کار', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  schedule: { label: 'طبق شیفت', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  done: { label: 'تکمیل شد', className: 'bg-brand-50 text-brand-700', dot: 'bg-brand-500' },
  off: { label: 'بدون شیفت', className: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
};

/** Tehran wall-clock minutes, re-read every `ms` — for the live counter and the shift's end. */
function useNowMinutes(ms = 30_000) {
  const [now, setNow] = useState(() => clockMinutes(tehranClockNow()));
  useEffect(() => {
    const tick = () => setNow(clockMinutes(tehranClockNow()));
    const timer = setInterval(tick, ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

function WidgetBody({ today, onChange }: { today: MyToday; onChange: () => void }) {
  const { locating, busy, offerRemote, lastError, doCheckIn, doCheckOut } = useCheckInFlow(onChange);
  const att = today.attendance;
  const scheduleMode = Boolean(today.scheduleMode);
  // In schedule mode a requested time (an exception) shows until it's
  // approved, and a missing one is the shift's; in direct mode only what's
  // recorded counts.
  const punches = todayPunches(today, scheduleMode);
  const onShift = Boolean(today.shiftStart && today.shiftEnd) && !today.holiday;
  const presumed = scheduleMode && onShift;
  const nowMinutes = useNowMinutes();

  const inTime = punches.in.time ?? (presumed ? today.shiftStart ?? null : null);
  const outTime = punches.out.time ?? (presumed ? today.shiftEnd ?? null : null);
  const shiftOver = onShift && nowMinutes >= clockMinutes(today.shiftEnd!);
  const checkedIn = Boolean(inTime) && (!presumed || nowMinutes >= clockMinutes(inTime!));
  const checkedOut = Boolean(punches.out.time) || (presumed && shiftOver);

  const shiftMinutes = onShift
    ? clockMinutes(today.shiftEnd!) - clockMinutes(today.shiftStart!)
    : 0;
  const end = punches.out.time
    ? clockMinutes(punches.out.time)
    : presumed ? Math.min(nowMinutes, clockMinutes(today.shiftEnd!)) : nowMinutes;
  const worked = checkedIn && inTime ? Math.max(0, end - clockMinutes(inTime)) : 0;
  const progress = shiftMinutes > 0 ? Math.min(100, Math.round((worked / shiftMinutes) * 100)) : 0;

  const state: DayState = scheduleMode
    ? !onShift ? 'off' : checkedOut ? 'done' : 'schedule'
    : checkedOut
      ? 'done'
      : checkedIn
        ? 'working'
        : !onShift
          ? 'off'
          : nowMinutes > clockMinutes(today.shiftStart!)
            ? 'late'
            : 'out';
  const live = (state === 'working' || state === 'schedule') && checkedIn;
  const meta = STATE_META[state];
  const stateLabel = state === 'off' && today.holiday ? 'تعطیل' : meta.label;

  const shiftLabel = today.holiday
    ? `تعطیل — ${today.holiday}`
    : today.shiftStart
      ? `شیفت ${fa(today.shiftStart)} تا ${fa(today.shiftEnd)}`
      : 'بدون شیفت';

  const showProgress = shiftMinutes > 0 && checkedIn;
  const progressBarClass = cn(
    'h-full transition-[width] duration-500 motion-reduce:transition-none',
    state === 'done' ? 'bg-brand-500' : 'bg-emerald-500',
  );
  // Desktop button: a regular-height action in a row, not a thumb target.
  const desktopAction = 'lg:min-h-10 lg:px-4 lg:text-sm';

  return (
    // Phones stack top to bottom. Wide screens put identity, times, action
    // and shortcuts on one row (RTL, so identity on the right); a narrower
    // desktop, beside the sidebar, uses two rows — identity and shortcuts,
    // then times and action. Any notice or error spans a row below.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-center lg:gap-x-4 lg:gap-y-3 xl:grid-cols-[auto_minmax(0,1fr)_13rem_auto]">
      <div className="flex min-w-0 items-center gap-3 lg:col-start-1 lg:row-start-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
          <IconFingerprint className="size-5" />
        </span>
        <div className="min-w-0 grow">
          <h2 id="attendance-widget-title" className="font-bold text-slate-800">حضور امروز</h2>
          <p className="mt-0.5 truncate text-xs text-slate-500" title={shiftLabel}>
            {shiftLabel}
          </p>
        </div>
        <span
          role="status"
          className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', meta.className)}
        >
          <span className="relative flex size-2" aria-hidden="true">
            {live && (
              <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden', meta.dot)} />
            )}
            <span className={cn('relative inline-flex size-2 rounded-full', meta.dot)} />
          </span>
          {stateLabel}
        </span>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200/70 rounded-2xl bg-slate-50 py-3 text-center ring-1 ring-inset ring-slate-200/60 lg:col-start-1 lg:row-start-2 lg:py-2 xl:col-start-2 xl:row-start-1">
        <TimeCell
          label="ورود"
          value={fa(inTime) || '--:--'}
          hint={<PunchHint punch={punches.in} presumed={presumed} remote={att?.workMode === 'remote' && Boolean(att.checkIn)} />}
        />
        <TimeCell label="خروج" value={fa(outTime) || '--:--'} hint={<PunchHint punch={punches.out} presumed={presumed} />} />
        <TimeCell label="مدت حضور" value={checkedIn ? hm(worked) : '--:--'} accent={live} />
      </dl>

      {showProgress && (
        <>
          <div className="space-y-1 lg:hidden">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="پیشرفت شیفت امروز"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={cn(progressBarClass, 'rounded-full')} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-400">
              {fa(progress)}٪ از {durationLabel(shiftMinutes)} شیفت امروز
            </p>
          </div>
          {/* Desktop: a hairline along the card's bottom edge, no room taken. */}
          <div
            className="absolute inset-x-0 bottom-0 hidden h-1 bg-slate-100 lg:block"
            title={`${fa(progress)}٪ از ${durationLabel(shiftMinutes)} شیفت امروز`}
            aria-hidden="true"
          >
            <div className={progressBarClass} style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {scheduleMode ? (
        <ScheduleModeNotice note={today.scheduleModeNote} className="lg:col-span-full lg:row-start-3 xl:row-start-2" />
      ) : today.remoteStatus && (
        <p className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-700 lg:col-span-full lg:row-start-3 xl:row-start-2">
          <IconHome className="size-4 shrink-0" aria-hidden="true" />
          {REMOTE_STATUS_LABELS[today.remoteStatus]}
        </p>
      )}

      <div className="lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1">
        {presumed ? (
          <ScheduleModeAction today={today} punches={punches} onChange={onChange} compact />
        ) : checkedOut || scheduleMode ? (
          <Link
            href="/dashboard/attendance/my-report"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:min-h-10"
          >
            <IconCalendarStats className="size-5" aria-hidden="true" />
            مشاهده کارکرد من
          </Link>
        ) : (
          <Button
            size="lg"
            variant={!checkedIn && state === 'off' ? 'outline' : 'primary'}
            className={cn('w-full gap-2', desktopAction, checkedIn && 'bg-slate-900 shadow-none hover:bg-slate-800')}
            disabled={busy}
            aria-busy={busy}
            onClick={() => (checkedIn ? doCheckOut() : doCheckIn())}
          >
            {locating
              ? <IconCurrentLocation className="size-5 animate-pulse" aria-hidden="true" />
              : checkedIn
                ? <IconLogout className="size-5" aria-hidden="true" />
                : <IconLogin className="size-5" aria-hidden="true" />}
            {locating ? 'در حال دریافت موقعیت...' : checkedIn ? 'ثبت خروج' : 'ثبت ورود'}
          </Button>
        )}
      </div>

      {lastError && !scheduleMode && (
        <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-full lg:row-start-4 xl:row-start-3" role="alert">
          <p>{fa(lastError)}</p>
          {offerRemote && !checkedIn && (
            <Button size="sm" className="mt-3 w-full gap-1 sm:w-auto" disabled={busy} onClick={() => doCheckIn(true)}>
              <IconHome className="size-4" aria-hidden="true" />
              ثبت ورود دورکاری
            </Button>
          )}
        </div>
      )}

      <nav
        aria-label="میانبرهای حضور و غیاب"
        className="-mx-1 flex flex-wrap gap-2 border-t border-slate-100 px-1 pt-3 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:flex-nowrap lg:justify-end lg:gap-1 lg:border-0 lg:p-0 xl:col-start-4"
      >
        <Shortcut href="/dashboard/attendance/my-requests" icon={<IconMailbox className="size-4" />} badge={today.pendingRequests}>
          درخواست مرخصی و تردد
        </Shortcut>
        <Shortcut href="/dashboard/attendance" icon={<IconArrowLeft className="size-4" />} trailing>
          جزئیات و نقشه
        </Shortcut>
      </nav>
    </div>
  );
}

function TimeCell({ label, value, hint, accent }: { label: string; value: string; hint?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0 px-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className={cn('mt-0.5 text-lg font-bold tabular-nums', accent ? 'text-emerald-600' : 'text-slate-800')}>
        {value}
      </dd>
      {hint && <dd className="text-[11px]">{hint}</dd>}
    </div>
  );
}

/**
 * A link under the card on phones; on desktop an icon button at the end of
 * the row, its label kept for screen readers and as a tooltip.
 */
function Shortcut({
  href,
  icon,
  trailing,
  badge,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  trailing?: boolean;
  /** A count awaiting attention — pending requests. */
  badge?: number;
  children: string;
}) {
  return (
    <Link
      href={href}
      title={children}
      className={cn(
        'relative inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        'lg:size-10 lg:justify-center lg:px-0',
        trailing ? 'ms-auto flex-row-reverse text-brand-700 hover:text-brand-800 lg:ms-0' : 'bg-slate-50',
      )}
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <span className="lg:sr-only">{children}</span>
      {Boolean(badge) && (
        <>
          <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-700 lg:hidden">
            {fa(badge)} در انتظار
          </span>
          <span className="absolute -end-1 -top-1 hidden min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-semibold leading-4 text-white lg:block">
            {fa(badge)}
            <span className="sr-only"> در انتظار</span>
          </span>
        </>
      )}
    </Link>
  );
}
