'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { DataView } from '@/ui/molecules';
import { IconLayoutDashboard } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useBoard } from '../attendance.api';
import { BoardTable } from '../attendance.component.board';
import { ScheduleModeBoardNotice } from '../attendance.component.schedule-mode';
import { PageHeader, Panel, RequestStatusBadge, StatTile } from '../attendance.component.layout';
import { RequestDetailModal, ReviewActions } from '../attendance.component.review';
import { AttendanceRequest } from '../attendance.types';
import { fa, jalaliLabel } from '../attendance.util';

/** وضعیت امروز — who is in, who is late, what is waiting. Refreshes every minute. */
export default function BoardPage() {
  const router = useRouter();
  const { data, error, isLoading, refresh } = useBoard();
  const [viewing, setViewing] = useState<AttendanceRequest | null>(null);

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendanceBoard.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconLayoutDashboard className="size-6" />}
            title="وضعیت امروز پرسنل"
            subtitle={data ? `${jalaliLabel(data.date)}${data.holiday ? ` — تعطیل: ${data.holiday}` : ''}` : undefined}
          />

          <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
            {data && (
              <div className="space-y-3">
                {data.scheduleMode && <ScheduleModeBoardNotice />}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatTile label="پرسنل فعال" value={fa(data.stats.employees)} />
                  <StatTile label="حاضر" value={fa(data.stats.present)} tone="success" />
                  <StatTile label="ورود ثبت نشده" value={fa(data.stats.missing)} tone={data.stats.missing ? 'danger' : 'neutral'} />
                  <StatTile label="درخواست در انتظار" value={fa(data.stats.pending)} tone={data.stats.pending ? 'warning' : 'neutral'} />
                </div>
                {data.stats.notDeclared > 0 && !data.scheduleMode && (
                  <p className="rounded-2xl bg-slate-50 px-4 py-2.5 text-xs leading-6 text-slate-600">
                    {fa(data.stats.notDeclared)} نفر از پرسنلِ «بدون ثبت» هنوز حضور امروز را اعلام نکرده‌اند. امروز هنوز
                    تمام نشده است؛ روزی که تا پایانش اعلام نشود غیبت حساب می‌شود و در بازبینی آخر ماه از گزارش فرد
                    می‌توانید حاضر بودنش را تایید کنید.
                  </p>
                )}

                <div className="grid gap-3 xl:grid-cols-3">
                  <Panel className="xl:col-span-2">
                    {data.rows.length ? (
                      <BoardTable
                        rows={data.rows}
                        onOpen={(row) => router.push(`/dashboard/attendance/performance/${row.employee.id}`)}
                      />
                    ) : (
                      <p className="py-10 text-center text-sm text-slate-400">هنوز پرسنلی تعریف نشده است.</p>
                    )}
                  </Panel>

                  <Panel className="gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">آخرین درخواست‌ها</span>
                      <Link href="/dashboard/attendance/requests" className="text-xs text-sky-600">
                        همه
                      </Link>
                    </div>
                    {data.pendingRequests?.length ? (
                      <ul className="divide-y divide-slate-100 text-sm">
                        {data.pendingRequests.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => setViewing(r)}
                              className="flex w-full items-center justify-between gap-2 rounded-lg py-2 text-right transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-700">{r.employee?.name}</div>
                                <div className="text-xs text-slate-500">
                                  {r.typeLabel} · <span className="tabular-nums">{fa(r.periodLabel)}</span>
                                </div>
                              </div>
                              <RequestStatusBadge status={r.status} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-400">درخواستی در انتظار نیست.</p>
                    )}
                  </Panel>
                </div>
              </div>
            )}
          </DataView>
        </div>
        <RequestDetailModal
          request={viewing}
          onClose={() => setViewing(null)}
          actions={
            viewing && (
              <ReviewActions
                request={viewing}
                base="/attendance/requests"
                size="md"
                onDone={() => {
                  setViewing(null);
                  refresh();
                }}
              />
            )
          }
        />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
