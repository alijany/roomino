'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconAlertCircle, IconCalendarStats, IconDownload, IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useMyBalances, useMyReport } from '../attendance.api';
import { DayList } from '../attendance.component.day-list';
import { PageHeader, Panel } from '../attendance.component.layout';
import { AttendanceProfileGate } from '../attendance.component.profile-gate';
import { PeriodPicker } from '../attendance.component.period-picker';
import { RequestForm, RequestPrefill } from '../attendance.component.request-form';
import { RequestDetailModal } from '../attendance.component.review';
import { ReportSummaryTiles } from '../attendance.component.summary';
import { DAY_FILTERS, LEAVE_TYPE_LABELS } from '../attendance.constants';
import { AttendanceRequest, PeriodQuery, RequestType } from '../attendance.types';
import { currentJalaliMonth, downloadCsv, fa, hm } from '../attendance.util';
import {
  filterMemberDays,
  MemberDayFilter,
  pendingReportRequests,
  visibleMemberDays,
} from '../attendance.util.report-view';

/** The caller's period, with recent days and missing-entry requests first. */
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
  const [filter, setFilter] = useState<MemberDayFilter>('all');
  const [showFuture, setShowFuture] = useState(false);
  const [form, setForm] = useState<RequestPrefill | 'new' | null>(null);
  const [viewing, setViewing] = useState<AttendanceRequest | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { data, error, isLoading, refresh } = useMyReport(period);
  const balances = useMyBalances();

  const scopedDays = useMemo(() => visibleMemberDays(data?.days ?? [], showFuture, true), [data, showFuture]);
  const days = useMemo(() => filterMemberDays(scopedDays, filter), [scopedDays, filter]);
  const needsFix = data?.days.filter((day) => !day.isFuture && day.needsFix).length ?? 0;
  const pending = useMemo(() => pendingReportRequests(data?.days ?? []), [data]);
  const futureDays = data?.days.filter((day) => day.isFuture).length ?? 0;
  const elapsedDays = data?.days.filter((day) => !day.isFuture).length ?? 0;
  const filters: Array<{ id: MemberDayFilter; label: string }> = [
    ...DAY_FILTERS.slice(0, 2),
    { id: 'pending', label: 'در انتظار بررسی' },
    ...DAY_FILTERS.slice(2),
  ];
  const now = currentJalaliMonth();
  const isCurrentMonth = !period.from && period.y === now.y && period.m === now.m;
  const exportDisabled = downloading || !data || !elapsedDays || isLoading || Boolean(error);
  const refreshAll = () => {
    refresh();
    balances.refresh();
  };

  const handleExport = async () => {
    if (exportDisabled || !data) return;
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
          subtitle="کارکرد و تردد خود را بررسی کنید و برای ورود یا خروج جاافتاده درخواست بفرستید."
          actions={
            <>
              <Link
                href="/dashboard/attendance/my-requests"
                className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                درخواست‌های من
              </Link>
              <Button size="sm" className="min-h-10 gap-1" onClick={() => setForm('new')}>
                <IconPlus className="size-4" />
                درخواست جدید
              </Button>
            </>
          }
        />

        <Panel className="gap-3 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">دوره گزارش</h2>
              <p className="mt-1 text-xs text-slate-500">
                {data ? fa(data.period.label) : 'انتخاب ماه یا بازه دلخواه'} · مدت‌ها: ساعت:دقیقه
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PeriodPicker key={period.from ? 'range' : 'month'} value={period} onChange={setPeriod} allowRange />
              {!isCurrentMonth && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-10"
                  onClick={() => setPeriod(currentJalaliMonth())}
                >
                  ماه جاری
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 gap-1"
              disabled={exportDisabled}
              onClick={handleExport}
              title="خروجی همه روزهای سپری‌شده دوره، مستقل از فیلتر روزها"
            >
              <IconDownload className="size-4" />
              {downloading ? 'در حال دریافت…' : 'خروجی CSV'}
            </Button>
          </div>
        </Panel>

        <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
          {data && (
            <div className="space-y-3">
              <ReportSummaryTiles summary={data.summary} compact personal />
              {(needsFix > 0 || pending.length > 0) && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <IconAlertCircle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
                  <div className="min-w-0 grow">
                    <h2 className="text-sm font-semibold text-amber-800">پیگیری در این دوره</h2>
                    <p className="mt-1 text-xs text-amber-700">
                      درخواست ثبت ورود و خروج پس از تایید بررسی‌کننده در کارکرد اعمال می‌شود.
                    </p>
                  </div>
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

              <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <summary className="cursor-pointer rounded text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                  مانده فعلی مرخصی
                </summary>
                <p className="my-3 text-xs text-slate-500">
                  این مانده مربوط به وضعیت فعلی مرخصی است و با تغییر دوره گزارش تغییر نمی‌کند. مدت‌ها به صورت ساعت:دقیقه
                  هستند.
                </p>
                <DataView
                  data={balances.data}
                  error={balances.error}
                  isLoading={balances.isLoading}
                  onRetry={balances.refresh}
                  variant="inline"
                  isEmpty={(value) => !value.items.length}
                  emptyMessage="مانده مرخصی برای شما ثبت نشده است."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {balances.data?.items.map((balance) => (
                      <div key={balance.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                        <div className="text-slate-600">
                          {LEAVE_TYPE_LABELS[balance.leaveType]} · {fa(balance.year)}
                        </div>
                        <div className="mt-1 font-semibold text-slate-800">
                          مانده{' '}
                          <bdi dir="ltr" className="tabular-nums">
                            {hm(balance.remainingMinutes)}
                          </bdi>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          استفاده‌شده <bdi dir="ltr">{hm(balance.usedMinutes)}</bdi> · سهمیه{' '}
                          <bdi dir="ltr">{hm(balance.accruedMinutes + balance.carriedOverMinutes)}</bdi>
                        </div>
                      </div>
                    ))}
                  </div>
                </DataView>
              </details>

              <Panel className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold text-slate-800">تردد روزانه</h2>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={showFuture}
                      onChange={(event) => setShowFuture(event.target.checked)}
                      className="size-4 accent-orange-500"
                    />
                    نمایش روزهای آینده
                  </label>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر روزهای کارکرد من">
                  {filters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                      className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                        filter === item.id
                          ? 'border-orange-200 bg-orange-50 font-semibold text-orange-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                      <span className="tabular-nums">{fa(filterMemberDays(scopedDays, item.id).length)}</span>
                    </button>
                  ))}
                </div>
                <p role="status" className="text-xs text-slate-500">
                  {fa(days.length)} از {fa(scopedDays.length)} روز · جدیدترین اول · برای جزئیات و نقشه تردد روی هر روز
                  بزنید.
                  {!showFuture && futureDays > 0 && ` ${fa(futureDays)} روز آینده پنهان است.`}
                </p>
                {!scopedDays.length && !showFuture ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    در این دوره هنوز روز سپری‌شده‌ای وجود ندارد. برای دیدن برنامه و درخواست‌ها، نمایش روزهای آینده را
                    فعال کنید.
                  </p>
                ) : (
                  <DayList
                    days={days}
                    workplace={data.workplace}
                    quickActions
                    actions={{
                      onRequestFix: (day) =>
                        setForm({ type: RequestType.MANUAL_ATTENDANCE, date: day.date, direction: day.fixDirection }),
                      onViewRequest: setViewing,
                    }}
                  />
                )}
              </Panel>
            </div>
          )}
        </DataView>
      </div>
      {form && (
        <RequestForm
          isOpen
          prefill={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
          onSuccess={refreshAll}
        />
      )}
      <RequestDetailModal request={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
