'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { IconCalendarCheck, IconClockEdit } from '@tabler/icons-react';
import { useState } from 'react';
import { RequestForm, RequestPrefill } from './attendance.component.request-form';
import { MyToday, RequestType } from './attendance.types';
import { clockMinutes, fa, Punch, tehranClockNow, tehranToday } from './attendance.util';

/** Why there's no check-in button, with the admin's note if they left one. */
export function ScheduleModeNotice({ note, className }: { note?: string | null; className?: string }) {
  return (
    <div className={cn('flex gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800', className)}>
      <IconCalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="lg:inline">حضور شما طبق شیفت حساب می‌شود و ثبت ورود و خروج لازم نیست. فقط تأخیر، خروج زودتر، مرخصی یا اضافه‌کار را ثبت کنید.</p>
        {/* Its own line on a phone; on desktop it fits beside the explanation. */}
        {note && <p className="mt-1 font-medium lg:ms-1 lg:mt-0 lg:inline">{fa(note)}</p>}
      </div>
    </div>
  );
}

/**
 * Under a time: requested and awaiting review, rejected, taken from the
 * shift (schedule mode), or a remote day.
 */
export function PunchHint({ punch, remote, presumed }: { punch: Punch; remote?: boolean; presumed?: boolean }) {
  if (punch.pending) return <span className="text-amber-600">در انتظار تایید</span>;
  if (punch.rejected) return <span className="text-rose-600">درخواست رد شد</span>;
  if (presumed && !punch.time) return <span className="text-emerald-600">طبق شیفت</span>;
  if (remote) return <span className="text-sky-600">دورکاری</span>;
  return null;
}

/**
 * Schedule mode's only action: report what differed from the shift. Opens
 * the request form as manual attendance for today at the time of the tap —
 * a check-in in the first half of the shift (arrived late), a check-out in
 * the second (leaving early). The type can be switched there to leave or
 * overtime.
 */
export function ScheduleModeAction({
  today,
  punches,
  onChange,
  compact,
}: {
  today: MyToday;
  punches: { in: Punch; out: Punch };
  onChange: () => void;
  /** In a desktop row: a regular-height button, the hint as its tooltip. */
  compact?: boolean;
}) {
  const [prefill, setPrefill] = useState<RequestPrefill | null>(null);
  const rejected = punches.in.rejected ?? punches.out.rejected;

  const open = () => {
    const now = tehranClockNow();
    const middle = today.shiftStart && today.shiftEnd
      ? (clockMinutes(today.shiftStart) + clockMinutes(today.shiftEnd)) / 2
      : 12 * 60;
    const direction = !punches.in.time && clockMinutes(now) < middle ? 'in' : 'out';
    setPrefill({
      type: RequestType.MANUAL_ATTENDANCE,
      date: today.date ?? tehranToday(),
      direction,
      // Taken at the tap, not at render — the page may have been open a while.
      time: now,
    });
  };

  return (
    <div className="space-y-2">
      {rejected && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700" role="status">
          درخواست {rejected.direction === 'in' ? 'ورود' : 'خروج'} ساعت {fa(rejected.time)} رد شد
          {rejected.reviewNote ? `: ${fa(rejected.reviewNote)}.` : '.'}
        </p>
      )}
      <Button
        size="lg"
        variant="outline"
        className={cn('w-full gap-2', compact && 'lg:min-h-10 lg:px-4 lg:text-sm')}
        title={compact ? 'برای مرخصی یا اضافه‌کار، نوع درخواست را در همین فرم عوض کنید.' : undefined}
        onClick={open}
      >
        <IconClockEdit className="size-5" aria-hidden="true" />
        ثبت تأخیر یا خروج زودتر
      </Button>
      <p className={cn('text-center text-[11px] leading-5 text-slate-400', compact && 'lg:hidden')}>
        برای مرخصی یا اضافه‌کار، نوع درخواست را در همین فرم عوض کنید.
      </p>

      {prefill && (
        <RequestForm
          isOpen
          prefill={prefill}
          onClose={() => setPrefill(null)}
          onSuccess={onChange}
        />
      )}
    </div>
  );
}

/** For reviewers on the board: why nobody has checked in today. */
export function ScheduleModeBoardNotice() {
  return (
    <div className="flex gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
      <IconCalendarCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <p>
        حالت «حضور طبق شیفت» فعال است: کسی ورود و خروج ثبت نمی‌کند و هر کس مرخصی یا غیبتِ ثبت‌شده نداشته باشد
        حاضر حساب می‌شود. غیبت را از «اصلاح تردد» با گزینه «غایب بود» ثبت کنید.
      </p>
    </div>
  );
}
