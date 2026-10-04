'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input } from '@/ui/atoms';
import { DataView, Table } from '@/ui/molecules';
import { IconDownload, IconReportSearch, IconSearch } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useJobGroups, usePerformance, useWorkplaces } from '../attendance.api';
import { PageHeader, Panel, StatTile } from '../attendance.component.layout';
import { PeriodPicker } from '../attendance.component.period-picker';
import { PerformanceQuery, PerformanceRow } from '../attendance.types';
import { currentJalaliMonth, downloadCsv, fa, hm } from '../attendance.util';

const sum = (rows: PerformanceRow[], pick: (r: PerformanceRow) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

/** گزارش کارکرد پرسنل — everyone's month (or range) in one table. */
export default function PerformancePage() {
  const router = useRouter();
  const [query, setQuery] = useState<PerformanceQuery>(currentJalaliMonth());
  const [downloading, setDownloading] = useState(false);
  const { data, error, isLoading, refresh } = usePerformance(query);
  const { data: workplaces } = useWorkplaces();
  const { data: groups } = useJobGroups();
  const rows = data?.items ?? [];

  const handleExport = async () => {
    setDownloading(true);
    try {
      await downloadCsv(
        '/attendance/reports/performance/export',
        query,
        `performance-${data?.period.from ?? ''}.csv`,
      );
    } catch (exportError) {
      toast.error((exportError as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const setPeriod = (period: PerformanceQuery) =>
    setQuery((prev) => ({
      workplaceId: prev.workplaceId,
      jobGroupId: prev.jobGroupId,
      text: prev.text,
      ...period,
    }));

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendancePerformance.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconReportSearch className="size-6" />}
            title="گزارش کارکرد پرسنل"
            subtitle={data ? fa(data.period.label) : undefined}
            actions={
              <Button variant="outline" size="sm" className="gap-1" disabled={downloading} onClick={handleExport}>
                <IconDownload className="size-4" />
                خروجی اکسل
              </Button>
            }
          />

          <Panel className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PeriodPicker value={query} onChange={setPeriod} allowRange />
              <div className="sm:w-56">
                <Input
                  icon={<IconSearch className="size-4 text-slate-400" />}
                  placeholder="نام یا کد پرسنلی"
                  value={query.text ?? ''}
                  onChange={(e) => setQuery((prev) => ({ ...prev, text: e.target.value || undefined }))}
                />
              </div>
              <div className="sm:w-44">
                <Dropdown
                  items={[
                    { label: 'همه محل‌ها', value: null },
                    ...(workplaces?.items ?? []).map((w) => ({ label: w.name, value: w.id })),
                  ]}
                  value={query.workplaceId ?? null}
                  onChange={(value) => setQuery((prev) => ({ ...prev, workplaceId: value ?? undefined }))}
                  placeholder="همه محل‌ها"
                  variant="outline"
                />
              </div>
              <div className="sm:w-44">
                <Dropdown
                  items={[
                    { label: 'همه گروه‌ها', value: null },
                    ...(groups?.items ?? []).map((g) => ({ label: g.name, value: g.id })),
                  ]}
                  value={query.jobGroupId ?? null}
                  onChange={(value) => setQuery((prev) => ({ ...prev, jobGroupId: value ?? undefined }))}
                  placeholder="همه گروه‌ها"
                  variant="outline"
                />
              </div>
            </div>

            <DataView
              data={data}
              error={error}
              isLoading={isLoading}
              isEmpty={(d) => !d?.items.length}
              emptyMessage="پرسنل فعالی با این فیلترها نیست."
              onRetry={refresh}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <StatTile label="جمع کارکرد" value={hm(sum(rows, (r) => r.summary.worked))} />
                  <StatTile label="جمع اختلاف" value={hm(sum(rows, (r) => r.summary.balance))} />
                  <StatTile label="جمع تاخیر" value={hm(sum(rows, (r) => r.summary.delayMinutes))} />
                  <StatTile label="روزهای غیبت" value={fa(sum(rows, (r) => r.summary.absentDays))} />
                  <StatTile label="جمع اضافه کار" value={hm(sum(rows, (r) => r.summary.overtime))} />
                </div>

                <Table
                  rows={rows}
                  rowKey={(r) => r.employee.id}
                  onRowClick={(r) => router.push(`/dashboard/attendance/performance/${r.employee.id}`)}
                  columns={[
                    {
                      key: 'name',
                      header: 'پرسنل',
                      render: (r) => (
                        <div>
                          <div className="font-medium text-slate-800">{r.employee.name}</div>
                          <div className="text-xs text-slate-400">
                            {fa(r.employee.personnelCode)} · {r.workplace ?? '—'}
                          </div>
                        </div>
                      ),
                    },
                    { key: 'present', header: 'حضور', render: (r) => fa(r.summary.presentDays), numeric: true },
                    { key: 'worked', header: 'کارکرد', render: (r) => hm(r.summary.worked), numeric: true },
                    { key: 'required', header: 'موظفی', render: (r) => hm(r.summary.required), numeric: true, hideOnMobile: true },
                    {
                      key: 'balance',
                      header: 'اختلاف',
                      numeric: true,
                      render: (r) => (
                        <span className={r.summary.balance < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {hm(r.summary.balance)}
                        </span>
                      ),
                    },
                    { key: 'delay', header: 'تاخیر', render: (r) => hm(r.summary.delayMinutes), numeric: true },
                    { key: 'absent', header: 'غیبت', render: (r) => fa(r.summary.absentDays), numeric: true },
                    { key: 'leave', header: 'مرخصی', render: (r) => hm(r.summary.leaveMinutes), numeric: true, hideOnMobile: true },
                    { key: 'remote', header: 'دورکاری', render: (r) => hm(r.summary.remoteMinutes), numeric: true, hideOnMobile: true },
                    { key: 'overtime', header: 'اضافه کار', render: (r) => hm(r.summary.overtime), numeric: true },
                    {
                      key: 'pending',
                      header: 'در انتظار',
                      numeric: true,
                      render: (r) => (r.pending ? <span className="text-amber-600">{fa(r.pending)}</span> : '—'),
                    },
                  ]}
                />
              </div>
            </DataView>
          </Panel>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
