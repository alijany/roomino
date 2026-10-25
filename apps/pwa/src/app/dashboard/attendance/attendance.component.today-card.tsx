'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import {
  IconCalendarStats,
  IconCurrentLocation,
  IconFingerprint,
  IconHome,
  IconLogin,
  IconLogout,
  IconMapPin,
  IconPlus,
  IconUsersGroup,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { useMyToday } from './attendance.api';
import { LocationIssueNotice } from './attendance.component.location-issue';
import {
  awayLabel,
  FlexibleHint,
  MissingCheckOutNotice,
  OvertimeNotice,
  UntrackedActions,
} from './attendance.component.mode-today';
import { RequestForm } from './attendance.component.request-form';
import { PunchHint, ScheduleModeAction, ScheduleModeNotice } from './attendance.component.schedule-mode';
import { REMOTE_STATUS_LABELS } from './attendance.constants';
import { useCheckInFlow } from './attendance.hook.check-in';
import { DayState, useTodayStatus } from './attendance.hook.today-status';
import { AttendanceMode, MyToday } from './attendance.types';
import { durationLabel, fa, hm } from './attendance.util';

const STATE_META: Record<DayState, { label: string; className: string; dot: string }> = {
  out: { label: 'در انتظار ورود', className: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  late: { label: 'ورود ثبت نشده', className: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  working: { label: 'در حال کار', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  schedule: { label: 'طبق شیفت', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  done: { label: 'تکمیل شد', className: 'bg-brand-50 text-brand-700', dot: 'bg-brand-500' },
  off: { label: 'بدون شیفت', className: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  declared: { label: 'حاضر — اعلام شد', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  awaiting: { label: 'در انتظار اعلام', className: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  away: { label: 'خارج از محل', className: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
};

/**
 * Today's attendance as a card: status and shift on top, the day's times in
 * the middle, the actions you reach for in the footer. Sized by its parent —
 * the dashboard gives it half the row (6 of 12 columns). People without an
 * attendance profile don't get the card at all.
 */
export function AttendanceTodayCard({ className }: { className?: string }) {
  const { data, error, isLoading, refresh } = useMyToday();

  if (data && !data.hasProfile) return null;

  return (
    <section
      aria-labelledby="attendance-card-title"
      className={cn('ui-surface flex shrink-0 flex-col overflow-hidden', className)}
    >
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        onRetry={refresh}
        variant="inline"
        errorTitle="وضعیت حضور بارگذاری نشد"
      >
        {data && <CardBody today={data} onChange={refresh} />}
      </DataView>
    </section>
  );
}

function CardBody({ today, onChange }: { today: MyToday; onChange: () => void }) {
  const { locating, busy, offerRemote, lastError, locationIssue, retryLocation, doCheckIn, doCheckOut } = useCheckInFlow(onChange);
  const status = useTodayStatus(today);
  const [formOpen, setFormOpen] = useState(false);
  const { mode, untracked, scheduleMode, punches, presumed, inTime, outTime, checkedIn, checkedOut, shiftMinutes, worked, progress, state, live } = status;
  const att = today.attendance;
  const meta = STATE_META[state];
  const stateLabel =
    state === 'off' && today.holiday
      ? 'تعطیل'
      : state === 'away'
        ? awayLabel(today.todayStatus) ?? meta.label
        : meta.label;
  const shiftLabel = today.holiday
    ? `تعطیل — ${today.holiday}`
    : today.shiftStart
      ? `شیفت ${fa(today.shiftStart)} تا ${fa(today.shiftEnd)}`
      : 'بدون شیفت';

  return (
    <>
      <header className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
          <IconFingerprint className="size-5" />
        </span>
        <div className="min-w-0 grow">
          <h2 id="attendance-card-title" className="font-bold text-slate-800">حضور امروز</h2>
          <p className="mt-0.5 truncate text-xs text-slate-500" title={shiftLabel}>{shiftLabel}</p>
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
      </header>

      <div className="space-y-3 px-4 pb-4">
        <MissingCheckOutNotice today={today} onChange={onChange} />

        {!untracked && (
        <dl className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200/70 rounded-2xl bg-slate-50 py-3 text-center ring-1 ring-inset ring-slate-200/60">
          <TimeCell
            label="ورود"
            value={fa(inTime) || '--:--'}
            hint={<PunchHint punch={punches.in} presumed={presumed} remote={att?.workMode === 'remote' && Boolean(att.checkIn)} />}
          />
          <TimeCell label="خروج" value={fa(outTime) || '--:--'} hint={<PunchHint punch={punches.out} presumed={presumed} />} />
          <TimeCell label="مدت حضور" value={checkedIn ? hm(worked) : '--:--'} accent={live} />
        </dl>
        )}

        {mode === AttendanceMode.FLEXIBLE && !scheduleMode && <FlexibleHint />}
        {today.overtimeSuggestion && <OvertimeNotice suggestion={today.overtimeSuggestion} />}

        {!untracked && shiftMinutes > 0 && checkedIn && (
          <div className="space-y-1">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="پیشرفت شیفت امروز"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', state === 'done' ? 'bg-brand-500' : 'bg-emerald-500')}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {fa(progress)}٪ از {durationLabel(shiftMinutes)} شیفت امروز
            </p>
          </div>
        )}

        {scheduleMode ? (
          <ScheduleModeNotice note={today.scheduleModeNote} />
        ) : today.remoteStatus && (
          <p className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-700">
            <IconHome className="size-4 shrink-0" aria-hidden="true" />
            {REMOTE_STATUS_LABELS[today.remoteStatus]}
          </p>
        )}

        {untracked ? (
          <UntrackedActions today={today} onChange={onChange} />
        ) : (
        <div className="w-full">
          {presumed ? (
            <ScheduleModeAction today={today} punches={punches} onChange={onChange} compact />
          ) : checkedOut || scheduleMode ? (
            <FooterLink href="/dashboard/attendance/my-report" icon={<IconCalendarStats className="size-4" />} primary>
              مشاهده کارکرد من
            </FooterLink>
          ) : (
            <Button
              size="lg"
              variant={!checkedIn && state === 'off' ? 'outline' : 'primary'}
              className={cn('w-full gap-2 lg:min-h-10 lg:text-sm', checkedIn && 'bg-slate-900 shadow-none hover:bg-slate-800')}
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
        )}

        {locationIssue && !scheduleMode && !untracked && (
          <LocationIssueNotice issue={locationIssue} busy={busy} onRetry={retryLocation} />
        )}

        {lastError && !scheduleMode && !untracked && (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            <p>{fa(lastError)}</p>
            {offerRemote && !checkedIn && (
              <Button size="sm" className="mt-3 w-full gap-1 sm:w-auto" disabled={busy} onClick={() => doCheckIn(true)}>
                <IconHome className="size-4" aria-hidden="true" />
                ثبت ورود دورکاری
              </Button>
            )}
          </div>
        )}
      </div>

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 p-3">
        <nav aria-label="میانبرهای حضور و غیاب" className="grid w-full grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2">
          <FooterButton icon={<IconPlus className="size-4" />} onClick={() => setFormOpen(true)}>
            درخواست جدید
          </FooterButton>
          {!checkedOut && !scheduleMode && (
            <FooterLink href="/dashboard/attendance/my-report" icon={<IconCalendarStats className="size-4" />}>
              کارکرد من
            </FooterLink>
          )}
          {today.isApprover && (
            <FooterLink href="/dashboard/attendance/team" icon={<IconUsersGroup className="size-4" />}>
              تیم من
            </FooterLink>
          )}
          <FooterLink href="/dashboard/attendance" icon={<IconMapPin className="size-4" />}>
            جزئیات
          </FooterLink>
        </nav>
      </footer>

      <RequestForm key={String(formOpen)} isOpen={formOpen} onClose={() => setFormOpen(false)} onSuccess={onChange} />
    </>
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

const footerItemClass = (primary?: boolean) =>
  cn(
    'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
    primary
      ? 'w-full bg-slate-100 font-medium text-slate-700 hover:bg-slate-200'
      : 'grow border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800',
  );

function FooterButton({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: string;
}) {
  return (
    <button type="button" onClick={onClick} className={footerItemClass()}>
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      {children}
    </button>
  );
}

function FooterLink({
  href,
  icon,
  primary,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
  children: string;
}) {
  return (
    <Link href={href} className={footerItemClass(primary)}>
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      {children}
    </Link>
  );
}
