'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconArrowRight, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useEmployee, useEmployeeReport } from '../../attendance.api';
import { PageHeader, Panel } from '../../attendance.component.layout';
import { MemberReport } from '../../attendance.component.member-report';
import { LEAVE_TYPE_LABELS, WEEKDAY_LABELS } from '../../attendance.constants';
import { PeriodQuery } from '../../attendance.types';
import { currentJalaliMonth, fa, hm, jalaliLabel } from '../../attendance.util';

/** One employee for admin/HR: profile, leave balances and the full report. */
export default function EmployeeReportPage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = Number(id);
  const [period, setPeriod] = useState<PeriodQuery>(currentJalaliMonth());
  const employee = useEmployee(employeeId);
  const report = useEmployeeReport(employeeId, period);
  const e = employee.data;

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendancePerformance.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconUser className="size-6" />}
            title={e?.user.name ?? 'گزارش پرسنل'}
            subtitle={e ? `${fa(e.personnelCode)} · ${e.jobTitle ?? e.jobGroup?.name ?? ''}` : undefined}
            actions={
              <Link href="/dashboard/attendance/performance">
                <Button variant="outline" size="sm" className="gap-1">
                  <IconArrowRight className="size-4" />
                  بازگشت
                </Button>
              </Link>
            }
          />

          <DataView data={e} error={employee.error} isLoading={employee.isLoading} onRetry={employee.refresh}>
            {e && (
              <div className="space-y-3">
                <Panel className="gap-3">
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div><dt className="text-slate-500">محل کار</dt><dd>{e.workplace?.name ?? '—'}</dd></div>
                    <div><dt className="text-slate-500">گروه شغلی</dt><dd>{e.jobGroup?.name ?? '—'}</dd></div>
                    <div>
                      <dt className="text-slate-500">شیفت فعلی</dt>
                      <dd>{e.currentShift ? `${e.currentShift.name} (از ${jalaliLabel(e.currentShift.startDate)})` : '—'}</dd>
                    </div>
                    <div><dt className="text-slate-500">سیاست کاری</dt><dd>{e.workPolicy?.name ?? '—'}</dd></div>
                    <div>
                      <dt className="text-slate-500">دورکاری ثابت</dt>
                      <dd>{e.remoteDays.length ? e.remoteDays.map((d) => WEEKDAY_LABELS[d]).join('، ') : '—'}</dd>
                    </div>
                    <div><dt className="text-slate-500">موبایل</dt><dd dir="ltr" className="text-right">{fa(e.user.phone) || '—'}</dd></div>
                  </dl>
                  {e.leaveBalances.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-sm">
                      {e.leaveBalances.map((b) => (
                        <span key={b.id} className="rounded-xl bg-slate-50 px-3 py-1.5">
                          {LEAVE_TYPE_LABELS[b.leaveType]} {fa(b.year)}: مانده{' '}
                          <b className="tabular-nums">{hm(b.remainingMinutes)}</b> · استفاده {hm(b.usedMinutes)}
                        </span>
                      ))}
                    </div>
                  )}
                </Panel>

                <MemberReport
                  employee={{ id: e.id, name: e.user.name, personnelCode: e.personnelCode }}
                  period={period}
                  onPeriodChange={setPeriod}
                  report={report}
                  reviewBase="/attendance/requests"
                  correctionBase="/attendance/reports/employees"
                  exportPath={`/attendance/reports/employees/${e.id}/export`}
                  canGrant
                />
              </div>
            )}
          </DataView>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
