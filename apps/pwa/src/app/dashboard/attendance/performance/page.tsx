'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconDownload, IconReportSearch, IconSearch, IconX } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useJobGroups, usePerformance, useWorkplaces } from '../attendance.api';
import { PageHeader, Panel, StatTile } from '../attendance.component.layout';
import { PerformanceTable } from '../attendance.component.performance-table';
import { PeriodPicker } from '../attendance.component.period-picker';
import { PerformanceQuery, PeriodQuery } from '../attendance.types';
import { downloadCsv, fa, hm, latin } from '../attendance.util';
import {
  filterPerformanceRows,
  PERFORMANCE_FILTERS,
  PerformanceFilter,
  PerformanceSort,
  performanceQueryFromSearch,
  performanceViewFromSearch,
  performanceTotals,
  sortPerformanceRows,
} from '../attendance.util.performance';

export default function PerformancePage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendancePerformance.roles}>
      <DashbaordLayout>
        <Suspense fallback={<DataView isLoading />}>
          <PerformanceContent />
        </Suspense>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function PerformanceContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<PerformanceQuery>(() => performanceQueryFromSearch(searchParams));
  const [search, setSearch] = useState(query.text ?? '');
  const [filter, setFilter] = useState<PerformanceFilter>(() => performanceViewFromSearch(searchParams).filter);
  const [sort, setSort] = useState<PerformanceSort>(() => performanceViewFromSearch(searchParams).sort);
  const [detailed, setDetailed] = useState(() => performanceViewFromSearch(searchParams).detailed);
  const [downloading, setDownloading] = useState(false);
  const { data, error, isLoading, refresh } = usePerformance(query);
  const { data: workplaces } = useWorkplaces();
  const { data: groups } = useJobGroups();
  const searchText = latin(search.trim());
  const searchPending = searchText !== (query.text ?? '');
  const hasFilters = Boolean(search.trim() || query.workplaceId || query.jobGroupId || filter !== 'all');
  const rows = useMemo(() => data?.items ?? [], [data]);
  const visibleRows = useMemo(
    () => sortPerformanceRows(filterPerformanceRows(rows, filter), sort),
    [rows, filter, sort],
  );
  const totals = useMemo(() => performanceTotals(visibleRows), [visibleRows]);

  useEffect(() => {
    if (!searchPending) return;
    const timer = setTimeout(() => setQuery((prev) => ({ ...prev, text: searchText || undefined })), 350);
    return () => clearTimeout(timer);
  }, [searchText, searchPending]);

  const clearFilters = () => {
    setSearch('');
    setFilter('all');
    setQuery((prev) => ({ ...prev, text: undefined, workplaceId: undefined, jobGroupId: undefined }));
  };
  const setPeriod = (period: PeriodQuery) =>
    setQuery((prev) => ({ workplaceId: prev.workplaceId, jobGroupId: prev.jobGroupId, text: prev.text, ...period }));
  const exportDisabled = downloading || !data || !rows.length || isLoading || Boolean(error) || searchPending;
  const handleExport = async () => {
    if (exportDisabled) return;
    setDownloading(true);
    try {
      await downloadCsv('/attendance/reports/performance/export', query, `performance-${data?.period.from}.csv`);
    } catch (exportError) {
      toast.error((exportError as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex grow flex-col gap-3 overflow-auto pb-6">
      <PageHeader
        icon={<IconReportSearch className="size-6" />}
        title="گزارش کارکرد پرسنل"
        subtitle="مقایسه کارکرد، پیگیری غیبت و بررسی درخواست‌های پرسنل فعال"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 gap-1"
            disabled={exportDisabled}
            onClick={handleExport}
          >
            <IconDownload className="size-4" />
            {downloading ? 'در حال دریافت…' : `CSV همه نتایج${data ? ` (${fa(rows.length)} پرسنل)` : ''}`}
          </Button>
        }
      />

      <Panel className="gap-4 border border-slate-200 lg:sticky lg:top-0 lg:z-10 lg:shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800">دوره گزارش</h2>
            <p className="mt-1 text-xs text-slate-500">
              {data ? fa(data.period.label) : 'انتخاب ماه یا بازه دلخواه'} · مدت‌ها: ساعت:دقیقه
            </p>
          </div>
          <PeriodPicker value={query} onChange={setPeriod} allowRange />
        </div>
        <div className="grid items-end gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_200px_200px_auto]">
          <Input
            label="جستجوی پرسنل"
            id="performance-search"
            packageId="performance-search"
            type="search"
            icon={<IconSearch className="size-4 text-slate-400" />}
            placeholder="نام، کد پرسنلی یا موبایل"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div role="group" aria-labelledby="performance-workplace-label">
            <p className="mb-2 text-sm font-medium text-slate-700" id="performance-workplace-label">
              محل کار
            </p>
            <Dropdown
              items={[
                { label: 'همه محل‌ها', value: null },
                ...(workplaces?.items ?? []).map((item) => ({ label: item.name, value: item.id })),
              ]}
              value={query.workplaceId ?? null}
              onChange={(value) => setQuery((prev) => ({ ...prev, workplaceId: value ?? undefined }))}
              variant="outline"
              buttonClassName="min-h-10 text-sm"
            />
          </div>
          <div role="group" aria-labelledby="performance-group-label">
            <p className="mb-2 text-sm font-medium text-slate-700" id="performance-group-label">
              گروه شغلی
            </p>
            <Dropdown
              items={[
                { label: 'همه گروه‌ها', value: null },
                ...(groups?.items ?? []).map((item) => ({ label: item.name, value: item.id })),
              ]}
              value={query.jobGroupId ?? null}
              onChange={(value) => setQuery((prev) => ({ ...prev, jobGroupId: value ?? undefined }))}
              variant="outline"
              buttonClassName="min-h-10 text-sm"
            />
          </div>
          {hasFilters && (
            <Button variant="outline" size="sm" className="min-h-10 gap-1" onClick={clearFilters}>
              <IconX className="size-4" />
              پاک کردن فیلترها
            </Button>
          )}
        </div>
        {searchPending && (
          <p role="status" className="text-xs text-slate-500">
            در حال جستجو…
          </p>
        )}
      </Panel>

      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(value) => !value.items.length}
        emptyMessage={
          hasFilters
            ? 'پرسنلی با این جستجو یا فیلترها پیدا نشد. فیلترها را پاک کنید یا تغییر دهید.'
            : 'هنوز پرسنل فعالی برای گزارش کارکرد ثبت نشده است.'
        }
        onRetry={refresh}
      >
        {data && (
          <div className="space-y-3">
            <Panel className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-800">کارکرد پرسنل</h2>
                <div className="w-full sm:w-56" role="group" aria-label="مرتب‌سازی پرسنل">
                  <Dropdown<PerformanceSort>
                    items={[
                      { label: 'نیازمند پیگیری اول', value: 'attention' },
                      { label: 'نام پرسنل', value: 'name' },
                      { label: 'بیشترین کسری اول', value: 'balance' },
                      { label: 'بیشترین کارکرد اول', value: 'worked' },
                    ]}
                    value={sort}
                    onChange={(value) => setSort(value ?? 'attention')}
                    variant="outline"
                    buttonClassName="min-h-10 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر وضعیت کارکرد">
                {PERFORMANCE_FILTERS.map((item) => (
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
                    <span className="tabular-nums">{fa(filterPerformanceRows(rows, item.id).length)}</span>
                  </button>
                ))}
              </div>
              <p role="status" className="text-xs text-slate-500">
                نمایش {fa(visibleRows.length)} از {fa(rows.length)} پرسنل · خلاصه زیر مربوط به پرسنل نمایش‌داده‌شده است.
              </p>
            </Panel>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatTile
                label="جمع کارکرد"
                value={<bdi dir="ltr">{hm(totals.worked)}</bdi>}
                hint={
                  <>
                    موظفی سپری‌شده <bdi dir="ltr">{hm(totals.required)}</bdi>
                  </>
                }
              />
              <StatTile
                label="پرسنل دارای کسری"
                value={`${fa(totals.deficit)} نفر`}
                tone={totals.deficit ? 'danger' : 'neutral'}
              />
              <StatTile
                label="روزهای غیبت"
                value={`${fa(totals.absent)} روز`}
                tone={totals.absent ? 'danger' : 'neutral'}
              />
              <StatTile
                label="درخواست در انتظار"
                value={fa(totals.pending)}
                hint="همه تاریخ‌ها"
                tone={totals.pending ? 'warning' : 'neutral'}
              />
            </div>
            <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <summary className="cursor-pointer rounded text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                آمار بیشتر: تراز، تاخیر و اضافه کار
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <StatTile
                  label="جمع تراز کارکرد"
                  value={<bdi dir="ltr">{hm(totals.balance)}</bdi>}
                  tone={totals.balance < 0 ? 'danger' : 'neutral'}
                />
                <StatTile label="جمع تاخیر" value={<bdi dir="ltr">{hm(totals.delay)}</bdi>} />
                <StatTile label="جمع اضافه کار" value={<bdi dir="ltr">{hm(totals.overtime)}</bdi>} />
              </div>
            </details>
            <Panel className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-800">جزئیات پرسنل</h3>
                <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={detailed}
                    onChange={(event) => setDetailed(event.target.checked)}
                    className="size-4 accent-orange-500"
                  />
                  نمایش ستون‌های بیشتر
                </label>
              </div>
              <p className="text-xs text-slate-500">
                تراز بر اساس موظفی سپری‌شده محاسبه می‌شود. درخواست‌های در انتظار مربوط به همه تاریخ‌ها هستند.
              </p>
              {filter !== 'all' && (
                <p className="text-xs text-slate-500">
                  خروجی CSV شامل همه {fa(rows.length)} پرسنل مطابق جستجو، محل کار و گروه شغلی است.
                </p>
              )}
              {visibleRows.length ? (
                <PerformanceTable rows={visibleRows} query={query} view={{ filter, sort, detailed }} />
              ) : (
                <div className="space-y-3 rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  <p className="text-sm text-slate-500">پرسنلی با این وضعیت در نتایج فعلی نیست.</p>
                  <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                    نمایش همه نتایج
                  </Button>
                </div>
              )}
            </Panel>
          </div>
        )}
      </DataView>
    </div>
  );
}
