'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { useAuth } from '@/components/auth/auth.context.provider';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView } from '@/ui/molecules';
import { IconArrowRight, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useEmployee, useEmployeeReport } from '../../attendance.api';
import { PageHeader } from '../../attendance.component.layout';
import { MemberReport } from '../../attendance.component.member-report';
import { LEAVE_TYPE_LABELS, WEEKDAY_LABELS } from '../../attendance.constants';
import { PeriodQuery } from '../../attendance.types';
import { fa, hm, jalaliLabel } from '../../attendance.util';
import {
  performanceHref,
  performanceQueryFromSearch,
  performanceViewFromSearch,
  reportPeriodFromSearch,
} from '../../attendance.util.performance';

/** One employee for admin/HR: profile, leave balances and the full report. */
export default function EmployeeReportPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendancePerformance.roles}>
      <DashbaordLayout>
        <Suspense fallback={<DataView isLoading />}>
          <EmployeeReportContent />
        </Suspense>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function EmployeeReportContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const employeeId = Number(id);
  const [period, setPeriod] = useState<PeriodQuery>(() => reportPeriodFromSearch(searchParams));
  const employee = useEmployee(employeeId);
  const report = useEmployeeReport(employeeId, period);
  const e = employee.data;
  const isSelf = user?.id === e?.user.id;
  const refresh = () => {
    employee.refresh();
    report.refresh();
  };

  return (
    <div className="flex grow flex-col gap-3 overflow-auto pb-6">
      <PageHeader
        icon={<IconUser className="size-6" />}
        title={e ? `کارکرد ${e.user.name ?? 'پرسنل'}` : 'گزارش پرسنل'}
        subtitle={
          e && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span>کد پرسنلی {fa(e.personnelCode)}</span>
              {(e.jobTitle ?? e.jobGroup?.name) && <span>· {e.jobTitle ?? e.jobGroup?.name}</span>}
              <Badge tone={e.active ? 'success' : 'muted'}>{e.active ? 'فعال' : 'غیرفعال'}</Badge>
            </div>
          )
        }
        actions={
          <Link
            href={performanceHref(
              {
                ...performanceQueryFromSearch(searchParams),
                y: undefined,
                m: undefined,
                from: undefined,
                to: undefined,
                ...period,
              },
              undefined,
              performanceViewFromSearch(searchParams),
            )}
            className="flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <IconArrowRight className="size-4" />
            همه پرسنل
          </Link>
        }
      />

      <DataView data={e} error={employee.error} isLoading={employee.isLoading} onRetry={employee.refresh}>
        {e && (
          <div className="space-y-3">
            <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <summary className="cursor-pointer rounded-lg text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                اطلاعات کاری و مانده مرخصی
              </summary>
              <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm text-slate-800 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="text-slate-500">محل کار</dt>
                  <dd>{e.workplace?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">گروه شغلی</dt>
                  <dd>{e.jobGroup?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">شیفت فعلی</dt>
                  <dd>
                    {e.currentShift ? `${e.currentShift.name} (از ${jalaliLabel(e.currentShift.startDate)})` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">سیاست کاری</dt>
                  <dd>{e.workPolicy?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">دورکاری ثابت</dt>
                  <dd>{e.remoteDays.length ? e.remoteDays.map((d) => WEEKDAY_LABELS[d]).join('، ') : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">موبایل</dt>
                  <dd>
                    <bdi dir="ltr">{fa(e.user.phone) || '—'}</bdi>
                  </dd>
                </div>
              </dl>
              {e.leaveBalances.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-sm">
                  {e.leaveBalances.map((b) => (
                    <span key={b.id} className="rounded-xl bg-slate-50 px-3 py-1.5">
                      {LEAVE_TYPE_LABELS[b.leaveType]} {fa(b.year)}: مانده{' '}
                      <bdi dir="ltr" className="font-bold tabular-nums">
                        {hm(b.remainingMinutes)}
                      </bdi>{' '}
                      · استفاده {hm(b.usedMinutes)}
                    </span>
                  ))}
                </div>
              )}
            </details>

            <MemberReport
              key={e.id}
              employee={{
                id: e.id,
                name: e.user.name,
                personnelCode: e.personnelCode,
              }}
              period={period}
              onPeriodChange={setPeriod}
              report={{ ...report, refresh }}
              reviewBase="/attendance/requests"
              correctionBase="/attendance/reports/employees"
              exportPath={`/attendance/reports/employees/${e.id}/export`}
              canGrant={!isSelf}
              canReview={!isSelf}
              managementView
            />
          </div>
        )}
      </DataView>
    </div>
  );
}
