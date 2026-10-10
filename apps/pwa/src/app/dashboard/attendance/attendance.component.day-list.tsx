'use client';

import { Button } from '@/ui/atoms';
import { IconChevronDown, IconEye, IconPencil, IconPlus } from '@tabler/icons-react';
import { ReactNode, useId, useState } from 'react';
import { BadgeTone } from '@/ui/atoms/ui.badge';
import { DayStatusBadge, RequestStatusBadge } from './attendance.component.layout';
import { AttendanceMap, MAP_COLORS, MapPoint } from './attendance.component.map';
import { DAY_STATUS_META } from './attendance.constants';
import { AttendanceRequest, DayStatus, ReportDay, WorkplacePin } from './attendance.types';
import { fa, hm, jalaliDateTime } from './attendance.util';

export interface DayActions {
  /** Record/correct check-in and check-out (admin, HR, team approver). */
  onCorrect?: (day: ReportDay) => void;
  /** Grant leave/remote work for this day (admin, HR). */
  onGrant?: (day: ReportDay) => void;
  /** Ask for a fix yourself — opens a manual-attendance request. */
  onRequestFix?: (day: ReportDay) => void;
  onViewRequest?: (request: AttendanceRequest) => void;
  /** Approve/reject controls for a pending request. */
  renderReview?: (request: AttendanceRequest) => ReactNode;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  if (!value) return null;
  return (
    <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] ${tone}`}>
      {label} <span className="font-semibold tabular-nums">{hm(value)}</span>
    </span>
  );
}

/** Start-edge accent per status tone, so problem days stand out while scanning. */
const ACCENT: Record<BadgeTone, string> = {
  success: 'border-s-emerald-400',
  danger: 'border-s-rose-400',
  warning: 'border-s-amber-400',
  info: 'border-s-sky-400',
  neutral: 'border-s-transparent',
  muted: 'border-s-transparent',
};

/** Days nobody had to be at work — shown quieter than working days. */
const OFF_STATUSES = [DayStatus.HOLIDAY, DayStatus.NO_SHIFT, DayStatus.FUTURE];

/** Check-in or check-out; "ثبت نشده" only where one was expected. */
function TimeCell({ label, value, missing, className }: { label: string; value: string | null; missing: boolean; className: string }) {
  return (
    <div className={`flex items-baseline gap-1 text-sm tabular-nums md:row-start-1 ${className}`}>
      <span className="text-xs text-slate-400 md:sr-only">{label}</span>
      {value ? (
        <span className="text-slate-700">{fa(value)}</span>
      ) : missing ? (
        <span className="text-xs font-medium text-rose-500">ثبت نشده</span>
      ) : (
        <span className="text-slate-300">—</span>
      )}
    </div>
  );
}

/** Check-in (green) and check-out (red) as recorded by GPS. */
function dayPoints(day: ReportDay): MapPoint[] {
  const a = day.attendance;
  if (!a) return [];
  const points: MapPoint[] = [];
  if (a.checkInLat != null && a.checkInLng != null) {
    points.push({ lat: a.checkInLat, lng: a.checkInLng, label: `ورود ${fa(a.checkIn)}`, color: MAP_COLORS.checkIn, permanent: true, labelSide: 'top' });
  }
  if (a.checkOutLat != null && a.checkOutLng != null) {
    points.push({ lat: a.checkOutLat, lng: a.checkOutLng, label: `خروج ${fa(a.checkOut)}`, color: MAP_COLORS.checkOut, permanent: true, labelSide: 'bottom' });
  }
  return points;
}

/** Where a day's check-in and check-out happened, against the workplace radius. */
function DayMap({ day, workplace }: { day: ReportDay; workplace?: WorkplacePin | null }) {
  const points = dayPoints(day);
  if (!points.length) return null;
  const site = day.attendance?.workplace ?? workplace;

  return (
    <AttendanceMap
      label={`محل ورود و خروج ${fa(day.jalali)}`}
      className="h-60"
      circle={site ? { lat: site.lat, lng: site.lng, radius: site.radiusMeters, label: site.name } : null}
      points={points}
    />
  );
}

/**
 * One row per day: status, check-in/out and the minutes that matter, with
 * the day's requests, attendance audit and check-in map on expand.
 */
export function DayList({
  days,
  actions = {},
  quickActions = false,
  workplace,
}: {
  days: ReportDay[];
  actions?: DayActions;
  quickActions?: boolean;
  /** The person's workplace — the map's fallback when a day has none. */
  workplace?: WorkplacePin | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const listId = useId();

  if (!days.length) {
    return <p className="py-10 text-center text-sm text-slate-400">روزی با این فیلتر وجود ندارد.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 md:grid md:grid-cols-[minmax(7.5rem,auto)_4rem_4rem_4rem_auto_minmax(0,1fr)_1rem_auto] md:gap-x-4">
      <li
        aria-hidden="true"
        className="hidden bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 md:col-span-full md:grid md:grid-cols-subgrid md:border-s-4 md:border-s-transparent"
      >
        <span>روز</span>
        <span>ورود</span>
        <span>خروج</span>
        <span>کارکرد</span>
        <span>وضعیت</span>
        <span>جزئیات</span>
      </li>
      {days.map((day) => {
        const expanded = open === day.date;
        const audit = day.attendance?.editedBy;
        const tone = DAY_STATUS_META[day.status].tone;
        const quiet = OFF_STATUSES.includes(day.status) && !day.requests.length && !day.attendance;
        const expectPresence = [DayStatus.ABSENT, DayStatus.INCOMPLETE].includes(day.status);
        const showCorrect = quickActions && actions.onCorrect && !day.isFuture;
        const showRequestFix = quickActions && actions.onRequestFix && day.needsFix && !day.isFuture;

        return (
          <li
            key={day.date}
            className={`border-s-4 md:col-span-full md:grid md:grid-cols-subgrid ${ACCENT[tone]} ${
              day.isToday ? 'bg-sky-50/50' : quiet ? 'bg-slate-50/60' : 'bg-white'
            }`}
          >
            <div className="flex items-center gap-2 md:col-span-full md:grid md:grid-cols-subgrid">
              <button
                type="button"
                className={`flex min-w-0 flex-1 flex-col gap-2 rounded-lg px-3 text-right hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 md:col-span-7 md:grid md:grid-cols-subgrid md:items-center md:gap-y-0 md:px-4 ${
                  quiet ? 'py-2 text-slate-400' : 'py-3'
                }`}
                onClick={() => setOpen(expanded ? null : day.date)}
                aria-expanded={expanded}
                aria-controls={`${listId}-${day.date}`}
              >
                <div className="flex items-center gap-2 md:contents">
                  <div className="min-w-0 md:col-start-1 md:row-start-1">
                    <div className={`flex items-center gap-1.5 font-medium tabular-nums ${quiet ? 'text-slate-500' : 'text-slate-800'}`}>
                      {fa(day.jalali)}
                      {day.isToday && (
                        <span className="rounded-full bg-sky-100 px-1.5 py-px text-[10px] font-semibold text-sky-700">امروز</span>
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {day.weekday}
                      {day.holiday && ` · ${day.holiday}`}
                    </div>
                  </div>
                  <div className="ms-auto flex items-center gap-1 md:col-start-5 md:row-start-1 md:ms-0">
                    <DayStatusBadge status={day.status} />
                  </div>
                  <IconChevronDown
                    className={`size-4 shrink-0 text-slate-400 transition-transform md:col-start-7 md:row-start-1 ${expanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {!quiet && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:contents">
                    <TimeCell label="ورود" value={day.checkIn} missing={expectPresence} className="md:col-start-2" />
                    <TimeCell
                      label="خروج"
                      value={day.checkOut}
                      missing={expectPresence && !day.isToday}
                      className="md:col-start-3"
                    />
                    <div className="flex items-baseline gap-1 text-sm tabular-nums md:col-start-4 md:row-start-1">
                      <span className="text-xs text-slate-400 md:sr-only">کارکرد</span>
                      <span className={day.worked ? 'font-semibold text-slate-700' : 'text-slate-300'}>
                        {day.worked ? hm(day.worked) : '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 md:col-start-6 md:row-start-1">
                      <Metric label="تاخیر" value={day.delay} tone="bg-rose-50 text-rose-600" />
                      <Metric label="تعجیل" value={day.early} tone="bg-rose-50 text-rose-600" />
                      <Metric label="اضافه‌کار" value={day.overtime} tone="bg-emerald-50 text-emerald-700" />
                      <Metric label="مرخصی" value={day.leaveMinutes} tone="bg-sky-50 text-sky-700" />
                      <Metric label="دورکاری" value={day.remote} tone="bg-sky-50 text-sky-700" />
                      {day.hasPending && (
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                          درخواست در انتظار
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
              {(showCorrect || showRequestFix) && (
                <div className="flex shrink-0 items-center gap-2 pe-3 md:col-start-8 md:row-start-1 md:pe-4">
                  {showCorrect && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-10 gap-1"
                      onClick={() => actions.onCorrect?.(day)}
                      aria-label={`اصلاح تردد ${fa(day.jalali)}`}
                    >
                      <IconPencil className="size-4" />
                      <span className="hidden sm:inline">اصلاح</span>
                    </Button>
                  )}
                  {showRequestFix && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-10 gap-1 border-amber-300 text-amber-800"
                      onClick={() => actions.onRequestFix?.(day)}
                      aria-label={`درخواست ثبت ${day.fixDirection === 'out' ? 'خروج' : 'ورود'} ${fa(day.jalali)}`}
                    >
                      <IconPlus className="size-4" aria-hidden="true" />
                      <span className="hidden sm:inline">ثبت {day.fixDirection === 'out' ? 'خروج' : 'ورود'}</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {expanded && (
              <div
                id={`${listId}-${day.date}`}
                className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-3 py-3 text-sm md:col-span-full md:px-4"
              >
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
                  <span>
                    شیفت:{' '}
                    {day.holiday ? (
                      <span className="text-slate-500">تعطیل رسمی — {day.holiday}</span>
                    ) : day.shiftStart ? (
                      <span className="tabular-nums">
                        {fa(day.shiftStart)} تا {fa(day.shiftEnd)}
                      </span>
                    ) : (
                      'بدون شیفت'
                    )}
                  </span>
                  {day.scheduled > 0 && <span>موظفی: {hm(day.scheduled)}</span>}
                  {day.workMode === 'remote' && <span className="text-sky-600">ورود دورکاری</span>}
                  {day.fixedRemote && <span className="text-sky-600">روز دورکاری ثابت</span>}
                  {day.attendance?.checkInDistanceM != null && (
                    <span>فاصله ورود: {fa(day.attendance.checkInDistanceM)} متر</span>
                  )}
                  {day.attendance?.checkInSource === 'manual' && <span>ورود دستی</span>}
                  {day.attendance?.checkOutSource === 'manual' && <span>خروج دستی</span>}
                </div>

                <DayMap day={day} workplace={workplace} />

                {audit && (
                  <p className="rounded-lg bg-white p-2 text-xs text-slate-500">
                    اصلاح‌شده توسط {audit.name ?? '—'} در {jalaliDateTime(day.attendance?.editedAt)}
                    {day.attendance?.editNote ? ` — ${day.attendance.editNote}` : ''}
                  </p>
                )}

                {day.requests.length > 0 && (
                  <ul className="space-y-2">
                    {day.requests.map((request) => (
                      <li key={request.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2">
                        <span className="font-medium text-slate-700">{request.typeLabel}</span>
                        <span className="text-xs tabular-nums text-slate-500">{fa(request.periodLabel)}</span>
                        <RequestStatusBadge status={request.status} />
                        <div className="mr-auto flex items-center gap-1">
                          {actions.renderReview?.(request)}
                          {actions.onViewRequest && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="!px-2"
                              onClick={() => actions.onViewRequest?.(request)}
                              aria-label="جزئیات درخواست"
                            >
                              <IconEye className="size-4" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-2">
                  {actions.onCorrect && !day.isFuture && !quickActions && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => actions.onCorrect?.(day)}>
                      <IconPencil className="size-4" />
                      ثبت / اصلاح تردد
                    </Button>
                  )}
                  {actions.onGrant && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => actions.onGrant?.(day)}>
                      <IconPlus className="size-4" />
                      ثبت مرخصی / دورکاری
                    </Button>
                  )}
                  {actions.onRequestFix && day.needsFix && !day.isFuture && !quickActions && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => actions.onRequestFix?.(day)}>
                      <IconPlus className="size-4" />
                      درخواست تردد دستی ({day.fixDirection === 'out' ? 'خروج' : 'ورود'})
                    </Button>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
