'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { IconAlertTriangle, IconCheck, IconClockPlus, IconCurrentLocation, IconHome, IconUserOff } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useWithdrawPresence } from './attendance.api';
import { usePresenceFlow } from './attendance.hook.presence';
import { LocationIssueNotice } from './attendance.component.location-issue';
import { RequestForm, RequestPrefill } from './attendance.component.request-form';
import { AttendanceMode, DayStatus, MyToday, OvertimeSuggestion, RequestStatus, RequestType } from './attendance.types';
import { durationLabel, errorMessage, fa, jalaliLabel } from './attendance.util';

/** The day's status text for someone in «بدون ثبت» whose day isn't a plain working day. */
export function awayLabel(status: DayStatus | null | undefined): string | null {
  if (status === DayStatus.ON_LEAVE) return 'مرخصی';
  if (status === DayStatus.MISSION) return 'ماموریت';
  if (status === DayStatus.REMOTE) return 'دورکاری';
  return null;
}

/** What a check-out past the shift's end turned into — a line the person can read at a glance. */
export function overtimeLine(suggestion: OvertimeSuggestion): string {
  const time = durationLabel(suggestion.minutes);
  return suggestion.status === RequestStatus.APPROVED
    ? `${time} اضافه‌کار خودکار برای امروز ثبت شد.`
    : `${time} اضافه‌کار برای تایید مدیر پیشنهاد شد.`;
}

/** Today's overtime, as a quiet notice under the day's times. */
export function OvertimeNotice({ suggestion, className }: { suggestion: OvertimeSuggestion; className?: string }) {
  const approved = suggestion.status === RequestStatus.APPROVED;
  return (
    <p
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs leading-5',
        approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
        className,
      )}
    >
      <IconClockPlus className="size-4 shrink-0" aria-hidden="true" />
      {overtimeLine(suggestion)}
    </p>
  );
}

/** One line for «منعطف»: why nothing says «late». */
export function FlexibleHint({ className }: { className?: string }) {
  return (
    <p className={cn('rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800', className)}>
      ساعت ورود و خروج شما آزاد است؛ فقط مجموع ساعت کار با ساعت شیفت سنجیده می‌شود.
    </p>
  );
}

/**
 * «دیروز خروج ثبت نشد»: the way to put a forgotten check-out right in one
 * step — the manual check-out request, already filled in with the day and
 * the shift's end.
 */
export function MissingCheckOutNotice({
  today,
  onChange,
  className,
}: {
  today: MyToday;
  onChange: () => void;
  className?: string;
}) {
  const missing = today.missingCheckOut;
  const [prefill, setPrefill] = useState<RequestPrefill | null>(null);

  if (!missing || today.attendanceMode === AttendanceMode.UNTRACKED) return null;

  return (
    <div className={cn('rounded-xl bg-amber-50 p-3 text-sm text-amber-800', className)} role="status">
      <p className="flex items-start gap-2">
        <IconAlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          در روز <span className="tabular-nums">{jalaliLabel(missing.date)}</span> ورود ثبت شده
          {missing.checkIn ? ` (ساعت ${fa(missing.checkIn)})` : ''} ولی خروج ثبت نشده است.
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="mt-2 w-full bg-white sm:w-auto"
        onClick={() =>
          setPrefill({
            type: RequestType.MANUAL_ATTENDANCE,
            date: missing.date,
            direction: 'out',
            time: missing.shiftEnd ?? undefined,
          })
        }
      >
        ثبت خروج آن روز
      </Button>
      {prefill && (
        <RequestForm isOpen prefill={prefill} onClose={() => setPrefill(null)} onSuccess={onChange} />
      )}
    </div>
  );
}

/**
 * Today for someone in «بدون ثبت»: no check-in, just «امروز هستم» — being at
 * work, said the way a check-in is (from the workplace; or as remote work,
 * which files the remote day) with no time recorded — or «امروز نیستم», which
 * opens the request form for today. Once said, only the confirmation shows.
 */
export function UntrackedActions({ today, onChange }: { today: MyToday; onChange: () => void }) {
  const flow = usePresenceFlow(onChange);
  const withdraw = useWithdrawPresence();
  const [formOpen, setFormOpen] = useState(false);

  const away = awayLabel(today.todayStatus);
  const workingDay = Boolean(today.shiftStart) && !today.holiday;
  const declared = Boolean(today.presence?.declared);
  const remote = today.presence?.workMode === 'remote';
  const busy = flow.busy || withdraw.isLoading;

  const handleWithdraw = async () => {
    try {
      await withdraw.submit(undefined);
      onChange();
    } catch (error) {
      toast.error(errorMessage(error, 'بازگرداندن انجام نشد'));
    }
  };

  if (!workingDay) {
    return <p className="rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-500">امروز روز کاری شما نیست.</p>;
  }
  if (away) {
    return (
      <p className="rounded-xl bg-sky-50 p-3 text-center text-sm text-sky-700">
        برای امروز {away} ثبت شده است؛ نیازی به اعلام حضور نیست.
      </p>
    );
  }

  if (declared) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
        <span className="flex items-center gap-2 font-medium">
          <IconCheck className="size-4" aria-hidden="true" />
          {remote ? 'حضور دورکاری امروز اعلام شد' : 'حضور امروز اعلام شد'}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={handleWithdraw}
          className="text-xs text-emerald-700/80 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          بازگرداندن
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* The answers side by side, the same size. */}
      <div className="grid grid-cols-3 gap-2">
        <Button size="lg" className="gap-1.5 !px-2 text-sm sm:text-base" disabled={busy} aria-busy={busy} onClick={() => flow.say()}>
          {flow.locating ? (
            <IconCurrentLocation className="size-5 animate-pulse" aria-hidden="true" />
          ) : (
            <IconCheck className="size-5" aria-hidden="true" />
          )}
          {flow.locating ? 'در حال دریافت...' : 'امروز هستم'}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-1.5 !px-2 text-sm sm:text-base"
          disabled={busy}
          onClick={() => flow.say(true)}
        >
          <IconHome className="size-5" aria-hidden="true" />
          دورکاری
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-1.5 !px-2 text-sm sm:text-base"
          disabled={busy}
          onClick={() => setFormOpen(true)}
        >
          <IconUserOff className="size-5" aria-hidden="true" />
          امروز نیستم
        </Button>
      </div>

      {flow.locationIssue && (
        <LocationIssueNotice issue={flow.locationIssue} busy={busy} onRetry={flow.retryLocation} />
      )}
      {flow.lastError && (
        <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          <p>{fa(flow.lastError)}</p>
          {flow.offerRemote && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" className="gap-1" disabled={busy} onClick={() => flow.say(true)}>
                <IconHome className="size-4" aria-hidden="true" />
                اعلام حضور دورکاری
              </Button>
              <span className="text-xs text-rose-600">
                اگر امروز دورکاری مجاز نداشته باشید، درخواست دورکاری برای تایید مدیر ارسال می‌شود.
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[11px] leading-5 text-slate-400">
        «دورکاری» حضور امروز را از بیرون محل کار اعلام می‌کند و برای تایید مدیر ارسال می‌شود؛ «امروز نیستم» فرم مرخصی، ماموریت یا درخواست دیگر را باز می‌کند.
      </p>
      <RequestForm
        key={String(formOpen)}
        isOpen={formOpen}
        prefill={{ date: today.date }}
        onClose={() => setFormOpen(false)}
        onSuccess={onChange}
      />
    </div>
  );
}
