'use client';

import { Button, Dropdown } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconAlertCircle, IconDownload, IconPlus, IconUserCheck } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CorrectionBase, ReviewBase, useRevokePresence } from './attendance.api';
import { DayList } from './attendance.component.day-list';
import { Panel } from './attendance.component.layout';
import { PeriodPicker } from './attendance.component.period-picker';
import { ConfirmPresenceModal } from './attendance.component.presence-review';
import { RequestForm } from './attendance.component.request-form';
import { CorrectionModal, RequestDetailModal, ReviewActions } from './attendance.component.review';
import { ReportSummaryTiles } from './attendance.component.summary';
import { DAY_FILTERS } from './attendance.constants';
import { AttendanceMode, AttendanceRequest, PeriodQuery, Report, ReportDay } from './attendance.types';
import { downloadCsv, errorMessage, fa } from './attendance.util';
import {
  filterMemberDays,
  MemberDayFilter,
  pendingReportRequests,
  visibleMemberDays,
} from './attendance.util.report-view';

/**
 * One person's report for someone who manages them — admin/HR or a team
 * approver. Management view prioritizes recent days and tasks; team view
 * keeps the whole period in chronological order, including future grants.
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
  canReview = true,
  managementView = false,
}: {
  employee: { id: number; name: string | null; personnelCode: string };
  period: PeriodQuery;
  onPeriodChange: (period: PeriodQuery) => void;
  report: {
    data?: Report;
    error?: unknown;
    isLoading: boolean;
    refresh: () => void;
  };
  reviewBase: ReviewBase;
  correctionBase: CorrectionBase;
  exportPath: string;
  canGrant?: boolean;
  canReview?: boolean;
  managementView?: boolean;
}) {
  const [filter, setFilter] = useState<MemberDayFilter>('all');
  const [showFuture, setShowFuture] = useState(!managementView);
  const [newestFirst, setNewestFirst] = useState(managementView);
  const [correcting, setCorrecting] = useState<ReportDay | null>(null);
  const [granting, setGranting] = useState<ReportDay | 'new' | null>(null);
  const [viewing, setViewing] = useState<AttendanceRequest | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmingPresence, setConfirmingPresence] = useState<string[] | null>(null);
  const revoke = useRevokePresence(correctionBase);
  const { data, error, isLoading, refresh } = report;

  const scopedDays = useMemo(
    () => visibleMemberDays(data?.days ?? [], showFuture, newestFirst),
    [data, showFuture, newestFirst],
  );
  const days = useMemo(() => filterMemberDays(scopedDays, filter), [scopedDays, filter]);
  const pending = useMemo(() => pendingReportRequests(data?.days ?? []), [data]);
  // «بدون ثبت» is read in days — no times, no hours.
  const daily = data?.attendanceMode === AttendanceMode.UNTRACKED;
  // «بدون ثبت»: past working days nobody declared — absent until confirmed.
  const undeclared = useMemo(() => (data?.days ?? []).filter((day) => day.undeclared), [data]);
  const needsFix = data?.days.filter((day) => !day.isFuture && day.needsFix).length ?? 0;
  const futurePlanned = data?.days.filter((day) => day.isFuture && day.requests.length > 0).length ?? 0;
  const futureDays = data?.days.filter((day) => day.isFuture).length ?? 0;
  const filters: Array<{ id: MemberDayFilter; label: string }> = [
    ...DAY_FILTERS.slice(0, 2),
    { id: 'pending', label: 'در انتظار بررسی' },
    ...(undeclared.length ? [{ id: 'undeclared' as const, label: 'اعلام‌نشده' }] : []),
    ...DAY_FILTERS.slice(2),
  ];

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

  const handleRevoke = async (day: ReportDay) => {
    try {
      await revoke.submit({ id: employee.id, date: day.date });
      toast.success('اعلام حضور آن روز برگردانده شد');
      refresh();
    } catch (revokeError) {
      toast.error(errorMessage(revokeError, 'بازگرداندن انجام نشد'));
    }
  };

  const reviewDone = () => {
    setViewing(null);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div
        className={
          managementView
            ? 'sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
            : 'flex flex-wrap items-center justify-between gap-2'
        }
      >
        {managementView && (
          <div className="w-full">
            <h2 className="font-semibold text-slate-800">گزارش کارکرد</h2>
            <p className="mt-1 text-xs text-slate-500">
              {data ? fa(data.period.label) : 'انتخاب دوره گزارش'} · {daily ? 'به‌صورت روز، بدون ساعت.' : 'مدت‌ها به صورت ساعت:دقیقه نمایش داده می‌شوند.'}
            </p>
          </div>
        )}
        <PeriodPicker value={period} onChange={onPeriodChange} allowRange allowFuture />
        <div className="flex flex-wrap items-center gap-2">
          {managementView && canGrant && (
            <Button
              size="sm"
              className="min-h-10 gap-1"
              disabled={!data || isLoading || Boolean(error)}
              onClick={() => setGranting('new')}
            >
              <IconPlus className="size-4" />
              ثبت مرخصی / دورکاری
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 gap-1"
            disabled={downloading || !data || isLoading || Boolean(error)}
            onClick={handleExport}
          >
            <IconDownload className="size-4" />
            {downloading ? 'در حال دریافت…' : managementView ? 'خروجی CSV' : 'خروجی اکسل'}
          </Button>
        </div>
      </div>

      <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
        {data && (
          <div className="space-y-3">
            <ReportSummaryTiles summary={data.summary} compact={managementView} daily={daily} />
            {canReview && undeclared.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <IconUserCheck className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
                <span className="text-sm font-medium text-amber-800">
                  {fa(undeclared.length)} روز اعلام‌نشده؛ تا تایید شما غیبت حساب می‌شود
                </span>
                <Button
                  size="sm"
                  className="min-h-10"
                  onClick={() => setConfirmingPresence(undeclared.map((day) => day.date))}
                >
                  حاضر بود برای همه‌ی این روزها
                </Button>
                {managementView && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 border-amber-300 text-amber-800"
                    onClick={() => {
                      setShowFuture(false);
                      setFilter('undeclared');
                    }}
                  >
                    فقط همین روزها را نشان بده
                  </Button>
                )}
              </div>
            )}
            {managementView && (needsFix > 0 || pending.length > 0) && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <IconAlertCircle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
                <span className="text-sm font-medium text-amber-800">نیازمند پیگیری در این بازه</span>
                {needsFix > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 border-amber-300 text-amber-800"
                    onClick={() => {
                      setShowFuture(false);
                      setFilter('issues');
                    }}
                  >
                    {fa(needsFix)} روز نیازمند اصلاح
                  </Button>
                )}
                {pending.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 border-amber-300 text-amber-800"
                    onClick={() => {
                      setShowFuture(true);
                      setFilter('pending');
                    }}
                  >
                    {fa(pending.length)} درخواست در انتظار بررسی
                  </Button>
                )}
              </div>
            )}
            <Panel className="gap-3">
              {managementView ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">تردد روزانه</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={showFuture}
                          onChange={(event) => setShowFuture(event.target.checked)}
                          className="size-4 accent-brand-600"
                        />
                        نمایش روزهای آینده
                      </label>
                      <div className="w-40">
                        <Dropdown
                          items={[
                            { label: 'جدیدترین روز اول', value: true },
                            { label: 'قدیمی‌ترین روز اول', value: false },
                          ]}
                          value={newestFirst}
                          onChange={(value) => setNewestFirst(value ?? true)}
                          variant="outline"
                          size="sm"
                          buttonClassName="min-h-10 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر روزهای گزارش">
                    {filters.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={filter === item.id}
                        onClick={() => setFilter(item.id)}
                        className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                          filter === item.id
                            ? 'border-brand-200 bg-brand-50 font-semibold text-brand-800'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                        <span className="tabular-nums">{fa(filterMemberDays(scopedDays, item.id).length)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500" role="status">
                    {fa(days.length)} روز از {fa(scopedDays.length)} روز · برای مشاهده درخواست‌ها و جزئیات هر روز، روی
                    آن کلیک کنید.
                    {!showFuture &&
                      futureDays > 0 &&
                      ` ${fa(futureDays)} روز آینده پنهان است${
                        futurePlanned ? `؛ ${fa(futurePlanned)} روز دارای درخواست` : ''
                      }.`}
                  </p>
                  {filter !== 'all' && days.length === 0 && (
                    <Button variant="outline" size="sm" className="self-start" onClick={() => setFilter('all')}>
                      پاک کردن فیلتر
                    </Button>
                  )}
                </>
              ) : (
                <Tabs tabs={[...DAY_FILTERS]} defaultTab="all" onTabChange={(id) => setFilter(id as MemberDayFilter)} />
              )}
              <DayList
                days={days}
                daily={daily}
                workplace={data.workplace}
                quickActions={managementView}
                actions={{
                  onCorrect: setCorrecting,
                  onConfirmPresence: canReview ? (day) => setConfirmingPresence([day.date]) : undefined,
                  onRevokePresence: canReview ? handleRevoke : undefined,
                  onGrant: canGrant ? setGranting : undefined,
                  onViewRequest: setViewing,
                  renderReview: canReview
                    ? (request) => <ReviewActions request={request} base={reviewBase} onDone={reviewDone} />
                    : undefined,
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

      {confirmingPresence && (
        <ConfirmPresenceModal
          employee={employee}
          dates={confirmingPresence}
          base={correctionBase}
          onClose={() => setConfirmingPresence(null)}
          onDone={refresh}
        />
      )}

      {granting && (
        <RequestForm
          isOpen
          grantFor={{ id: employee.id, name: employee.name }}
          prefill={granting === 'new' ? undefined : { date: granting.date }}
          onClose={() => setGranting(null)}
          onSuccess={refresh}
        />
      )}

      <RequestDetailModal
        request={viewing}
        onClose={() => setViewing(null)}
        actions={
          viewing && canReview && <ReviewActions request={viewing} base={reviewBase} onDone={reviewDone} size="md" />
        }
      />
    </div>
  );
}
