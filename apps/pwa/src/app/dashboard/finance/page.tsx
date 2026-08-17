'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { formatForeign, formatMoney } from '@/libs/format/format.util';
import { Button } from '@/ui/atoms';
import { DataView, DateRangePicker } from '@/ui/molecules';
import { IconChartPie, IconExternalLink } from '@tabler/icons-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  useFinanceDashboard,
  useSpendByCategory,
  useSpendByVendor,
  useSpendTrend,
  useUpcomingCommitments,
} from './finance.api';
import {
  ChartCard,
  RankedBarChart,
  SpendTrendChart,
  TotalsTable,
  TrendTable,
} from './finance.component.charts';
import { StatTile } from './finance.component.stat-tile';
import { FINANCE_ROUTES } from './finance.constants';
import { Currency } from './finance.types';
import { formatJalali } from './finance.util';

/**
 * پیشخوان مالی — eight numbers and four charts.
 *
 * Deliberately short. Forty metrics on one screen is not a dashboard, and the
 * question this page answers is "what needs attention this month".
 */
export default function FinanceDashboardPage() {
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });

  const query = useMemo(
    () => ({ from: range.from.toISOString(), to: range.to.toISOString() }),
    [range]
  );

  const dashboard = useFinanceDashboard(query);
  const categories = useSpendByCategory(query);
  const vendors = useSpendByVendor(query);
  const trend = useSpendTrend(12);
  const upcoming = useUpcomingCommitments(30);

  const data = dashboard.data;

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.financeDashboard.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconChartPie className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">پیشخوان مالی</h1>
              <p className="text-sm text-slate-500">
                خلاصه پرداخت‌های شرکت در بازه انتخاب‌شده.
              </p>
            </div>
            <DateRangePicker
              from={range.from}
              to={range.to}
              onChange={(next) => setRange(next)}
            />
            <Link href={FINANCE_ROUTES.reports}>
              <Button variant="outline" className="gap-2">
                گزارش ماهانه
                <IconExternalLink className="size-4" />
              </Button>
            </Link>
          </div>

          {/* KPIs */}
          <DataView
            data={data}
            error={dashboard.error}
            isLoading={dashboard.isLoading}
            variant="inline"
            onRetry={dashboard.refresh}
          >
            {data && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                  label="پرداخت‌شده در این بازه"
                  value={formatMoney(data.paid.totalRial)}
                  sub={`${data.paid.count.toLocaleString('fa-IR')} پرداخت`}
                  changePercent={data.paid.changePercent}
                  invertChange
                />
                <StatTile
                  label="در انتظار تأیید"
                  value={data.pendingApproval.count.toLocaleString('fa-IR')}
                  sub={formatMoney(data.pendingApproval.totalRial)}
                />
                <StatTile
                  label="آماده پرداخت"
                  value={data.readyToPay.count.toLocaleString('fa-IR')}
                  sub={formatMoney(data.readyToPay.totalRial)}
                />
                <StatTile
                  label="سررسید گذشته"
                  value={data.overdueCount.toLocaleString('fa-IR')}
                  sub={data.overdueCount > 0 ? 'نیازمند رسیدگی' : 'موردی نیست'}
                  alert={data.overdueCount > 0}
                />
                <StatTile
                  label="تعهدات ۳۰ روز آینده"
                  value={formatMoney(data.upcoming30DaysRial)}
                  sub="تأییدشده و زمان‌بندی‌شده"
                />
                <StatTile
                  label="هزینه دوره‌ای فعال"
                  value={data.recurring.activeCount.toLocaleString('fa-IR')}
                  sub={`ماهانه ${formatMoney(data.recurring.monthlyRunRateRial)}`}
                />
                <StatTile
                  label="میانگین زمان تأیید"
                  value={`${data.averageApprovalDays.toLocaleString('fa-IR')} روز`}
                  sub="از ارسال تا تأیید نهایی"
                />
                <StatTile
                  label="هزینه ارزی این بازه"
                  value={formatMoney(data.foreignSpend.totalRial)}
                  sub={`کارمزد ${formatMoney(data.foreignSpend.feesRial)}`}
                />
              </div>
            )}
          </DataView>

          {/* Trend */}
          <DataView
            data={trend.data}
            error={trend.error}
            isLoading={trend.isLoading}
            variant="inline"
            onRetry={trend.refresh}
          >
            <ChartCard
              title="روند پرداخت ۱۲ ماه گذشته"
              subtitle="بر اساس مبلغ واقعاً پرداخت‌شده، به تفکیک داخلی و ارزی"
              isEmpty={!trend.data?.items.length}
              chart={<SpendTrendChart points={trend.data?.items ?? []} />}
              table={<TrendTable points={trend.data?.items ?? []} />}
            />
          </DataView>

          <div className="grid gap-3 lg:grid-cols-2">
            <DataView
              data={categories.data}
              error={categories.error}
              isLoading={categories.isLoading}
              variant="inline"
              onRetry={categories.refresh}
            >
              <ChartCard
                title="هزینه بر اساس دسته"
                isEmpty={!categories.data?.items.length}
                chart={<RankedBarChart rows={categories.data?.items ?? []} />}
                table={
                  <TotalsTable
                    rows={categories.data?.items ?? []}
                    nameHeader="دسته هزینه"
                  />
                }
              />
            </DataView>

            <DataView
              data={vendors.data}
              error={vendors.error}
              isLoading={vendors.isLoading}
              variant="inline"
              onRetry={vendors.refresh}
            >
              <ChartCard
                title="بیشترین طرف‌حساب‌ها"
                isEmpty={!vendors.data?.items.length}
                chart={<RankedBarChart rows={vendors.data?.items ?? []} />}
                table={
                  <TotalsTable
                    rows={vendors.data?.items ?? []}
                    nameHeader="طرف‌حساب"
                  />
                }
              />
            </DataView>
          </div>

          {/* Upcoming */}
          <DataView
            data={upcoming.data}
            error={upcoming.error}
            isLoading={upcoming.isLoading}
            variant="inline"
            onRetry={upcoming.refresh}
          >
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-1 font-bold text-slate-800">تعهدات ۳۰ روز آینده</h2>
              <p className="mb-4 text-xs text-slate-500">
                آنچه تأیید شده یا در راه است، به‌علاوه هزینه‌های دوره‌ای که هنوز
                درخواستشان ساخته نشده.
              </p>

              {(upcoming.data?.requests.length ?? 0) === 0 &&
              (upcoming.data?.schedules.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  تعهدی برای ۳۰ روز آینده ثبت نشده است.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcoming.data?.requests.map((item) => (
                    <li
                      key={`r-${item.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <Link
                        href={FINANCE_ROUTES.request(item.id)}
                        className="font-medium text-slate-800 hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <span className="text-xs text-slate-500">
                        {item.vendorName}
                      </span>
                      <span className="tabular-nums text-slate-700">
                        {item.currency === Currency.IRR
                          ? formatMoney(item.amountMinor)
                          : formatForeign(item.amountMinor, item.currency)}
                      </span>
                      <span className="text-xs tabular-nums text-slate-500">
                        {formatJalali(item.dueDate)}
                      </span>
                    </li>
                  ))}

                  {upcoming.data?.schedules.map((item) => (
                    <li
                      key={`s-${item.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-600">
                        {item.title}
                        <span className="mr-2 text-xs text-slate-400">
                          (هزینه دوره‌ای)
                        </span>
                      </span>
                      <span className="text-xs text-slate-500">{item.vendorName}</span>
                      <span className="tabular-nums text-slate-700">
                        {item.currency === Currency.IRR
                          ? formatMoney(item.amountMinor)
                          : formatForeign(item.amountMinor, item.currency)}
                      </span>
                      <span className="text-xs tabular-nums text-slate-500">
                        {formatJalali(item.nextDueDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </DataView>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
