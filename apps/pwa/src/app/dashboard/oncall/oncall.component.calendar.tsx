'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Avatar } from '@/ui/atoms';
import { fa } from '../attendance/attendance.util';
import { OnCallDay, OnCallSchedule } from './oncall.types';
import { DAY_TYPE_LABELS, DAY_TYPE_TINT, WEEKDAY_SHORT, clockLabel, isDefaultFor } from './oncall.util';
import { jalaliMonthName, tehranToday } from '../attendance/attendance.util';

/** What a drag from the people list carries. */
export const DRAG_USER = 'application/x-oncall-user';

/**
 * The period as a month grid, شنبه on the right. A person dragged from the
 * list onto a day takes that day (Shift adds them next to who is there); a
 * click opens the day to set hours and people.
 */
export function OnCallCalendar({
  schedule,
  readOnly,
  mineDates,
  onlyMine = false,
  view = 'auto',
  onDropUser,
  onOpenDay,
}: {
  schedule: OnCallSchedule;
  readOnly: boolean;
  /** Days that are the viewer's own, ringed; used in the member view. */
  mineDates?: Set<string>;
  /** Fade every day that is not the viewer's own. */
  onlyMine?: boolean;
  /** `auto` follows the screen: a list on a phone, the grid from tablet up. */
  view?: 'auto' | 'calendar' | 'list';
  onDropUser: (day: OnCallDay, userId: number, add: boolean) => void;
  onOpenDay: (day: OnCallDay) => void;
}) {
  const days = schedule.days;
  const today = tehranToday();
  const lead = days[0]?.weekday ?? 0;

  return (
    <>
      <div className={view === 'auto' ? 'sm:hidden' : view === 'list' ? '' : 'hidden'}>
        <DayList
          days={days}
          today={today}
          mineDates={mineDates}
          onlyMine={onlyMine}
          onOpenDay={onOpenDay}
        />
      </div>
      <div className={view === 'auto' ? 'hidden sm:block' : view === 'calendar' ? '' : 'hidden'}>
      <div className="grid grid-cols-7 gap-1 pb-1.5 text-center text-[11px] font-medium text-slate-400 sm:gap-1.5 sm:text-xs">
        {WEEKDAY_SHORT.map((name) => (
          <div key={name}>{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {days.map((day, i) => (
          <DayCell
            key={day.date}
            day={day}
            showMonth={i === 0 || day.jalaliDay === 1}
            readOnly={readOnly}
            mine={mineDates?.has(day.date) ?? false}
            past={day.date < today}
            today={day.date === today}
            faded={onlyMine && !mineDates?.has(day.date)}
            onDropUser={onDropUser}
            onOpen={onOpenDay}
          />
        ))}
      </div>
      </div>
    </>
  );
}

/** On a phone the grid is too tight to read: the period as a list, one day per row. */
function DayList({
  days,
  today,
  mineDates,
  onlyMine,
  onOpenDay,
}: {
  days: OnCallDay[];
  today: string;
  mineDates?: Set<string>;
  onlyMine: boolean;
  onOpenDay: (day: OnCallDay) => void;
}) {
  const shown = onlyMine ? days.filter((d) => mineDates?.has(d.date)) : days;
  if (shown.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">در این دوره کشیکی برای شما نیست.</p>;
  }

  return (
    <div className="space-y-1.5">
      {shown.map((day, i) => {
        const isToday = day.date === today;
        const past = day.date < today;
        const mine = mineDates?.has(day.date) ?? false;
        const off = day.type === 'holiday' || day.type === 'friday';
        const newMonth = i === 0 || shown[i - 1].jalaliMonth !== day.jalaliMonth;

        return (
          <div key={day.date}>
            {newMonth && (
              <div className="px-1 pb-1 pt-2 text-xs font-semibold text-slate-500">{jalaliMonthName(day.jalaliMonth)}</div>
            )}
            <button
              type="button"
              onClick={() => onOpenDay(day)}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-2.5 text-start transition-colors',
                past ? 'border-slate-200 bg-slate-50 grayscale-[50%]' : cn('border-slate-200', DAY_TYPE_TINT[day.type]),
                mine && 'border-brand-300 bg-brand-50/70',
                isToday && '!border-brand-500 ring-2 ring-brand-200',
              )}
            >
              <div className="flex w-11 shrink-0 flex-col items-center leading-tight">
                <span className="text-[10px] text-slate-400">{WEEKDAY_SHORT[day.weekday]}</span>
                <span className={cn('text-lg font-bold', off ? 'text-rose-600' : 'text-slate-800')}>{fa(day.jalaliDay)}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {day.entries.length === 0 ? (
                  <span className="text-xs text-slate-300">بدون کشیک</span>
                ) : (
                  day.entries.map((e, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <Avatar src={e.user.profilePicture} name={e.user.name} className="size-5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{e.user.name ?? fa(e.user.phone)}</span>
                      <span dir="ltr" className="shrink-0 text-xs text-slate-500">
                        {clockLabel(e.start)}–{clockLabel(e.end)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {(isToday || day.type === 'holiday') && (
                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', isToday ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500')}>
                  {isToday ? 'امروز' : 'تعطیل'}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DayCell({
  day,
  showMonth,
  readOnly,
  mine,
  faded,
  past,
  today,
  onDropUser,
  onOpen,
}: {
  day: OnCallDay;
  showMonth: boolean;
  readOnly: boolean;
  mine: boolean;
  faded: boolean;
  /** Already gone: a little greyer than the days still to come. */
  past: boolean;
  today: boolean;
  onDropUser: (day: OnCallDay, userId: number, add: boolean) => void;
  onOpen: (day: OnCallDay) => void;
}) {
  const custom = day.entries.length > 0 && !isSimpleDefault(day);
  const people = new Map(day.entries.map((e) => [e.user.id, e.user]));
  const off = day.type === 'holiday' || day.type === 'friday';

  return (
    <button
      type="button"
      onClick={() => onOpen(day)}
      onDragOver={(e) => {
        if (!readOnly && e.dataTransfer.types.includes(DRAG_USER)) e.preventDefault();
      }}
      onDrop={(e) => {
        const id = Number(e.dataTransfer.getData(DRAG_USER));
        if (readOnly || !id) return;
        e.preventDefault();
        onDropUser(day, id, e.shiftKey);
      }}
      className={cn(
        'flex min-h-24 flex-col gap-1.5 rounded-xl border p-1.5 text-start transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:min-h-28 sm:p-2',
        past ? 'border-slate-200 bg-slate-50 grayscale-[50%]' : cn('border-slate-200', DAY_TYPE_TINT[day.type]),
        mine && 'border-brand-300 bg-brand-50/70',
        today && '!border-brand-500 ring-2 ring-brand-200',
        faded && 'opacity-30 [&>*:not(:first-child)]:invisible',
      )}
      title={day.holidayTitle ?? DAY_TYPE_LABELS[day.type]}
      aria-current={today ? 'date' : undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
            today ? 'bg-brand-600 text-white' : off ? 'text-rose-600' : 'text-slate-700',
          )}
        >
          {fa(day.jalaliDay)}
        </span>
        <span className={cn('truncate text-[10px]', today ? 'rounded bg-rose-50 px-1 font-medium text-rose-600' : 'text-slate-400')}>
          {today ? 'امروز' : showMonth ? jalaliMonthName(day.jalaliMonth) : day.type === 'holiday' ? 'تعطیل' : ''}
        </span>
      </div>

      {day.entries.length === 0 ? (
        <span className="m-auto text-[11px] text-slate-300">—</span>
      ) : (
        <div className="space-y-1">
          {[...people.values()].slice(0, 3).map((user) => (
            <div key={user.id} className="flex items-center gap-1 rounded-md bg-white px-1 py-0.5 shadow-[0_0_0_1px_rgb(226_232_240)]">
              <Avatar src={user.profilePicture} name={user.name} className="size-4 shrink-0" />
              <span className="truncate text-[11px] text-slate-700">{user.name?.split(' ')[0] ?? fa(user.phone)}</span>
            </div>
          ))}
          {people.size > 3 && <span className="text-[10px] text-slate-400">+{fa(people.size - 3)} نفر</span>}
          {(custom || people.size > 1) && (
            <div className="text-[10px] leading-4 text-slate-400">
              {day.entries.slice(0, 2).map((e, i) => (
                <div key={i} dir="ltr" className="text-start">
                  {clockLabel(e.start)}–{clockLabel(e.end)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

/** One person, on the day's default hours: nothing worth printing under the name. */
function isSimpleDefault(day: OnCallDay): boolean {
  const ids = new Set(day.entries.map((e) => e.user.id));
  return ids.size === 1 && isDefaultFor(day.entries, day.defaultSlots);
}
