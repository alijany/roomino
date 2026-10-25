import { AttendanceMode } from '../attendance.constants';
import { EmployeeModePeriodEntity } from '../entities/employee-mode-period.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';

/**
 * The mode a person was in on a civil date: the latest period that had
 * started by then. Before the first period — and for anyone with no history
 * at all — it is `tracked`, which is how every profile began.
 */
export function modeOn(
  periods: ReadonlyArray<Pick<EmployeeModePeriodEntity, 'mode' | 'startDate'>>,
  date: string,
): AttendanceMode {
  let best: (typeof periods)[number] | null = null;
  for (const period of periods) {
    if (
      period.startDate <= date &&
      (!best || period.startDate > best.startDate)
    ) {
      best = period;
    }
  }
  return best?.mode ?? AttendanceMode.TRACKED;
}

/**
 * The mode a profile *should* be in now: its own override, else its job
 * group's, else `tracked`. `jobGroup` must be loaded.
 */
export function resolveMode(profile: EmployeeProfileEntity): AttendanceMode {
  return (
    profile.attendanceModeOverride ??
    profile.jobGroup?.attendanceMode ??
    AttendanceMode.TRACKED
  );
}
