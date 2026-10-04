import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { EmployeeShiftEntity } from '../entities/employee-shift.entity';
import { ShiftEntity } from '../entities/shift.entity';
import {
  composeInstant,
  iranWeekday,
  minutesBetween,
} from './attendance-time.util';

export interface DaySchedule {
  start: Date | null;
  end: Date | null;
  /** Scheduled minutes, both parts of a split shift together. */
  scheduled: number;
}

const OFF: DaySchedule = { start: null, end: null, scheduled: 0 };

/**
 * The assignment in force on a civil date: the latest one that started on or
 * before it and hasn't ended. Expects `assignments` with `shift.days` loaded.
 */
export function shiftOn(
  assignments: EmployeeShiftEntity[],
  date: string,
): ShiftEntity | null {
  let current: EmployeeShiftEntity | null = null;

  for (const assignment of assignments) {
    if (assignment.startDate > date) continue;
    if (assignment.endDate && assignment.endDate < date) continue;
    if (!current || assignment.startDate > current.startDate) {
      current = assignment;
    }
  }

  return current?.shift ?? null;
}

/** Scheduled start, end and minutes of a person's shift on a civil date. */
export function scheduleFor(
  assignments: EmployeeShiftEntity[],
  date: string,
): DaySchedule {
  const shift = shiftOn(assignments, date);
  if (!shift) return OFF;

  const weekday = iranWeekday(date);
  const day = shift.days.getItems().find((d) => d.dayOfWeek === weekday);
  if (!day || !day.isActive || !day.startTime || !day.endTime) return OFF;

  const start = composeInstant(date, day.startTime);
  let end = composeInstant(date, day.endTime);
  let minutes = minutesBetween(start, end);

  if (day.hasSecondPart && day.secondStartTime && day.secondEndTime) {
    const secondStart = composeInstant(date, day.secondStartTime);
    end = composeInstant(date, day.secondEndTime);
    minutes += minutesBetween(secondStart, end);
  }

  return { start, end, scheduled: Math.max(0, minutes) };
}

/** Whether a civil date is one of a person's fixed weekly remote days. */
export function isFixedRemoteDay(
  profile: EmployeeProfileEntity,
  date: string,
): boolean {
  return (profile.remoteDays ?? []).map(Number).includes(iranWeekday(date));
}
