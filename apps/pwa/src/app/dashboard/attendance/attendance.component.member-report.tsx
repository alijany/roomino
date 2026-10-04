'use client';

import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconDownload } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CorrectionBase, ReviewBase } from './attendance.api';
import { DayList } from './attendance.component.day-list';
import { Panel } from './attendance.component.layout';
import { PeriodPicker } from './attendance.component.period-picker';
import { RequestForm } from './attendance.component.request-form';
import { CorrectionModal, RequestDetailModal, ReviewActions } from './attendance.component.review';
import { ReportSummaryTiles } from './attendance.component.summary';
import { DAY_FILTERS, DayFilter } from './attendance.constants';
import { AttendanceRequest, PeriodQuery, Report, ReportDay } from './attendance.types';
import { downloadCsv, filterDays } from './attendance.util';

/**
 * One person's report for someone who manages them — admin/HR or a team
 * approver. Unlike the self-service report it shows the whole period in
 * order (future grants included) and allows corrections and reviews.
 */
export function MemberReport({
  employee,
  period,
  onPeriodChange,
  report,
  reviewBase,
  correctionBase,
  exportPath,
  canGrant = false,
}: {
  employee: { id: number; name: string | null; personnelCode: string };
  period: PeriodQuery;
  onPeriodChange: (period: PeriodQuery) => void;
  report: { data?: Report; error?: unknown; isLoading: boolean; refresh: () => void };
  reviewBase: ReviewBase;
  correctionBase: CorrectionBase;
  exportPath: string;
  canGrant?: boolean;
}) {
  const [filter, setFilter] = useState<DayFilter>('all');
  const [correcting, setCorrecting] = useState<ReportDay | null>(null);
  const [granting, setGranting] = useState<ReportDay | null>(null);
  const [viewing, setViewing] = useState<AttendanceRequest | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { data, error, isLoading, refresh } = report;

  const days = useMemo(() => filterDays(data?.days ?? [], filter), [data, filter]);

  const handleExport = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadCsv(exportPath, period, `attendance-${employee.personnelCode}-${data.period.from}.csv`);
    } catch (exportError) {
      toast.error((exportError as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const reviewDone = () => {
    setViewing(null);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PeriodPicker value={period} onChange={onPeriodChange} allowRange allowFuture />
        <Button variant="outline" size="sm" className="gap-1" disabled={downloading} onClick={handleExport}>
          <IconDownload className="size-4" />
          خروجی اکسل
        </Button>
      </div>

      <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
        {data && (
          <div className="space-y-3">
            <ReportSummaryTiles summary={data.summary} />
            <Panel className="gap-3">
              <Tabs tabs={[...DAY_FILTERS]} defaultTab="all" onTabChange={(id) => setFilter(id as DayFilter)} />
              <DayList
                days={days}
                actions={{
                  onCorrect: setCorrecting,
                  onGrant: canGrant ? setGranting : undefined,
                  onViewRequest: setViewing,
                  renderReview: (request) => (
                    <ReviewActions request={request} base={reviewBase} onDone={reviewDone} />
                  ),
                }}
              />
            </Panel>
          </div>
        )}
      </DataView>

      {correcting && (
        <CorrectionModal
          key={correcting.date}
          base={correctionBase}
          target={{
            employeeId: employee.id,
            name: employee.name,
            date: correcting.date,
            checkIn: correcting.checkIn,
            checkOut: correcting.checkOut,
          }}
          onClose={() => setCorrecting(null)}
          onDone={refresh}
        />
      )}

      {granting && (
        <RequestForm
          isOpen
          grantFor={{ id: employee.id, name: employee.name }}
          prefill={{ date: granting.date }}
          onClose={() => setGranting(null)}
          onSuccess={refresh}
        />
      )}

      <RequestDetailModal
        request={viewing}
        onClose={() => setViewing(null)}
        actions={viewing && <ReviewActions request={viewing} base={reviewBase} onDone={reviewDone} size="md" />}
      />
    </div>
  );
}
