'use client';

import { Button } from '@/ui/atoms';
import { IconChevronDown, IconEye, IconPencil, IconPlus } from '@tabler/icons-react';
import { ReactNode, useId, useState } from 'react';
import { DayStatusBadge, RequestStatusBadge } from './attendance.component.layout';
import { AttendanceMap, MAP_COLORS, MapPoint } from './attendance.component.map';
import { AttendanceRequest, ReportDay, WorkplacePin } from './attendance.types';
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

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  if (!value) return null;
  return (
    <span className={`whitespace-nowrap text-xs ${tone ?? 'text-slate-500'}`}>
      {label} <span className="font-semibold tabular-nums">{hm(value)}</span>
    </span>
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
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {days.map((day) => {
        const expanded = open === day.date;
        const audit = day.attendance?.editedBy;

        return (
          <li key={day.date} className={day.isToday ? 'bg-sky-50/40' : ''}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-3 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 lg:px-4"
                onClick={() => setOpen(expanded ? null : day.date)}
                aria-expanded={expanded}
                aria-controls={`${listId}-${day.date}`}
              >
                <div className="w-28 shrink-0">
                  <div className="font-medium tabular-nums text-slate-800">{fa(day.jalali)}</div>
                  <div className="text-xs text-slate-400">
                    {day.weekday}
                    {day.isToday && ' · امروز'}
                  </div>
                </div>

                <div className="w-36 shrink-0 text-sm tabular-nums text-slate-600">
                  {day.checkIn || day.checkOut ? (
                    <span>
                      {fa(day.checkIn ?? '--:--')} ← {fa(day.checkOut ?? '--:--')}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <DayStatusBadge status={day.status} />
                  {day.hasPending && <span className="text-[11px] text-amber-600">درخواست در انتظار</span>}
                </div>

                <div className="flex grow flex-wrap items-center gap-x-3 gap-y-1">
                  <Metric label="کارکرد" value={day.worked} />
                  <Metric label="تاخیر" value={day.delay} tone="text-rose-500" />
                  <Metric label="تعجیل" value={day.early} tone="text-rose-500" />
                  <Metric label="اضافه‌کار" value={day.overtime} tone="text-emerald-600" />
                  <Metric label="مرخصی" value={day.leaveMinutes} tone="text-sky-600" />
                  <Metric label="دورکاری" value={day.remote} tone="text-sky-600" />
                </div>

                <IconChevronDown
                  className={`size-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
              {quickActions && actions.onCorrect && !day.isFuture && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-3 min-h-10 shrink-0 gap-1 lg:ml-4"
                  onClick={() => actions.onCorrect?.(day)}
                  aria-label={`اصلاح تردد ${fa(day.jalali)}`}
                >
                  <IconPencil className="size-4" />
                  <span className="hidden sm:inline">اصلاح</span>
                </Button>
              )}
            </div>

            {expanded && (
              <div
                id={`${listId}-${day.date}`}
                className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-3 py-3 text-sm lg:px-4"
              >
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
                  <span>
                    شیفت:{' '}
                    {day.holiday ? (
                      <span className="text-slate-500">تعطیل — {day.holiday}</span>
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
                  {actions.onRequestFix && day.needsFix && (
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
