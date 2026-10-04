'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconCalendarStats, IconDownload } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useMyBalances, useMyReport } from '../attendance.api';
import { DayList } from '../attendance.component.day-list';
import { PageHeader, Panel } from '../attendance.component.layout';
import { AttendanceProfileGate } from '../attendance.component.profile-gate';
import { PeriodPicker } from '../attendance.component.period-picker';
import { RequestForm, RequestPrefill } from '../attendance.component.request-form';
import { ReportSummaryTiles } from '../attendance.component.summary';
import { DAY_FILTERS, DayFilter, LEAVE_TYPE_LABELS } from '../attendance.constants';
import { PeriodQuery, RequestType } from '../attendance.types';
import { currentJalaliMonth, downloadCsv, fa, filterDays, hm } from '../attendance.util';

/**
 * کارکرد من — the caller's month, newest day first, future days hidden.
 * A day that needs fixing offers a manual-attendance request pre-filled.
 */
export default function MyReportPage() {
  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <AttendanceProfileGate title="کارکرد من" icon={<IconCalendarStats className="size-6" />}>
          <MyReportContent />
        </AttendanceProfileGate>
      </DashbaordLayout>
    </ProtectedRoute>
  );
}

function MyReportContent() {
  const [period, setPeriod] = useState<PeriodQuery>(currentJalaliMonth());
  const [filter, setFilter] = useState<DayFilter>('all');
  const [prefill, setPrefill] = useState<RequestPrefill | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, error, isLoading, refresh } = useMyReport(period);
  const { data: balances } = useMyBalances();

  const days = useMemo(
    () => filterDays((data?.days ?? []).filter((d) => !d.isFuture).reverse(), filter),
    [data, filter],
  );

  const handleExport = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadCsv('/attendance/me/report/export', period, `attendance-${data.period.from}.csv`);
    } catch (exportError) {
      toast.error((exportError as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="flex grow flex-col gap-3 overflow-auto pb-6">
        <PageHeader
          icon={<IconCalendarStats className="size-6" />}
          title="کارکرد من"
          subtitle="ورود و خروج، تاخیر، مرخصی و دورکاری هر روز"
          actions={
            <>
              <PeriodPicker value={period} onChange={setPeriod} />
              <Button variant="outline" size="sm" className="gap-1" disabled={downloading || !data} onClick={handleExport}>
                <IconDownload className="size-4" />
                خروجی اکسل
              </Button>
            </>
          }
        />

        <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
          {data && (
            <div className="space-y-3">
              <ReportSummaryTiles summary={data.summary} />

              {balances && balances.items.length > 0 && (
                <Panel className="gap-2">
                  <div className="font-semibold text-slate-700">مانده مرخصی</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {balances.items.map((b) => (
                      <div key={b.id} className="rounded-xl bg-slate-50 px-3 py-2">
                        <span className="text-slate-500">
                          {LEAVE_TYPE_LABELS[b.leaveType]} {fa(b.year)}:
                        </span>{' '}
                        <span className="font-semibold tabular-nums">{hm(b.remainingMinutes)}</span>
                        <span className="text-xs text-slate-400"> از {hm(b.accruedMinutes + b.carriedOverMinutes)}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              <Panel className="gap-3">
                <Tabs tabs={[...DAY_FILTERS]} defaultTab="all" onTabChange={(id) => setFilter(id as DayFilter)} />
                <DayList
                  days={days}
                  workplace={data.workplace}
                  actions={{
                    onRequestFix: (day) =>
                      setPrefill({ type: RequestType.MANUAL_ATTENDANCE, date: day.date, direction: day.fixDirection }),
                  }}
                />
              </Panel>
            </div>
          )}
        </DataView>
      </div>

      {prefill && (
        <RequestForm
          isOpen
          prefill={prefill}
          onClose={() => setPrefill(null)}
          onSuccess={refresh}
        />
      )}
    </>
  );
}
