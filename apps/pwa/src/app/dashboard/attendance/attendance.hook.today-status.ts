import { useEffect, useState } from 'react';
import { AttendanceMode, DayStatus, MyToday } from './attendance.types';
import { clockMinutes, tehranClockNow, todayPunches } from './attendance.util';

export type DayState =
  | 'out'
  | 'late'
  | 'working'
  | 'schedule'
  | 'done'
  | 'off'
  /** «بدون ثبت»: declared today. */
  | 'declared'
  /** «بدون ثبت»: not declared yet. */
  | 'awaiting'
  /** Leave, a mission or remote work covers today. */
  | 'away';

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

/**
 * Where today stands: the punches as shown (schedule mode presumes the
 * shift's own times), how long has been worked, and the resulting state.
 * Same rules as the dashboard strip, for any card that wants them.
 */
export function useTodayStatus(today: MyToday) {
  const scheduleMode = Boolean(today.scheduleMode);
  const mode = today.attendanceMode ?? AttendanceMode.TRACKED;
  // «بدون ثبت» has no punches — unless company-wide schedule mode, which
  // already says so for everyone.
  const untracked = mode === AttendanceMode.UNTRACKED && !scheduleMode;
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

  const shiftMinutes = onShift ? clockMinutes(today.shiftEnd!) - clockMinutes(today.shiftStart!) : 0;
  const end = punches.out.time
    ? clockMinutes(punches.out.time)
    : presumed ? Math.min(nowMinutes, clockMinutes(today.shiftEnd!)) : nowMinutes;
  const worked = checkedIn && inTime ? Math.max(0, end - clockMinutes(inTime)) : 0;
  const progress = shiftMinutes > 0 ? Math.min(100, Math.round((worked / shiftMinutes) * 100)) : 0;

  const away = [DayStatus.ON_LEAVE, DayStatus.MISSION, DayStatus.REMOTE].includes(
    today.todayStatus as DayStatus,
  );
  const state: DayState = untracked
    ? !onShift
      ? 'off'
      : away
        ? 'away'
        : today.presence?.declared
          ? 'declared'
          : 'awaiting'
    : scheduleMode
    ? !onShift ? 'off' : checkedOut ? 'done' : 'schedule'
    : checkedOut
      ? 'done'
      : checkedIn
        ? 'working'
        : !onShift
          ? 'off'
          : // Only «ساعت‌دار» are late; «منعطف» may still come in.
            mode === AttendanceMode.TRACKED && nowMinutes > clockMinutes(today.shiftStart!)
            ? 'late'
            : 'out';

  return {
    mode,
    untracked,
    scheduleMode,
    punches,
    presumed,
    inTime,
    outTime,
    checkedIn,
    checkedOut,
    shiftMinutes,
    worked,
    progress,
    state,
    live: (state === 'working' || state === 'schedule') && checkedIn,
  };
}
