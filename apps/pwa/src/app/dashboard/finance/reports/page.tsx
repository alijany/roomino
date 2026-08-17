'use client';

import { getToken } from '@/components/auth/auth.utils.tokens';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { withQuery } from '@/libs/api/api.util.query';
import { formatForeign, formatMoney } from '@/libs/format/format.util';
import { Button, Dropdown } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconDownload, IconReportMoney } from '@tabler/icons-react';
import { format as formatJalaliDate } from 'date-fns-jalali';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { API_URL } from '../../../../../constants';
import { useMonthlyReport } from '../finance.api';
import { TotalsTable } from '../finance.component.charts';
import { Currency } from '../finance.types';

/** The last 12 Jalali months, newest first, as {label, gregorian year+month}. */
function useMonthOptions() {
  return useMemo(() => {
    const options: Array<{ label: string; value: string }> = [];
    const cursor = new Date();

    for (let i = 0; i < 12; i += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
      options.push({
        // Shown in Jalali because that is the month the reader thinks in; the
        // value stays Gregorian because that is what the API ranges on.
        label: formatJalaliDate(date, 'MMMM yyyy'),
        value: `${date.getFullYear()}-${date.getMonth() + 1}`,
      });
    }

    return options;
  }, []);
}

/**
 * گزارش ماهانه — the month-close page.
 *
 * Every figure is what actually left the account. The variance table is the
 * point of the page: it is where FX moves and vendor surprises show up.
 */
export default function FinanceReportsPage() {
  const options = useMonthOptions();
  const [selected, setSelected] = useState(options[0]?.value ?? '');
  const [downloading, setDownloading] = useState(false);

  const [year, month] = selected.split('-').map(Number);
  const { data, error, isLoading, refresh } = useMonthlyReport(year, month);

  const jalaliLabel =
    options.find((option) => option.value === selected)?.label ?? '';

  /**
   * The export endpoint is authenticated, so it cannot be a plain link — fetch
   * it with the bearer token and hand the browser a blob.
   */
  const handleExport = async () => {
    if (!data) return;
    setDownloading(true);

    try {
      const url = withQuery(`${API_URL}/finance/reports/export`, {
        from: data.period.from,
        to: data.period.to,
      });

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!response.ok) {
        throw new Error('دریافت فایل خروجی ناموفق بود');
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `finance-${selected}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (exportError) {
      toast.error((exportError as Error)?.message ?? 'دریافت فایل خروجی ناموفق بود');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.financeReports.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconReportMoney className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">گزارش ماهانه</h1>
              <p className="text-sm text-slate-500">
                بستن ماه: چه چیزی، به چه کسی و از کدام حساب پرداخت شد.
              </p>
            </div>

            <div className="w-44">
              <Dropdown
                items={options}
                value={selected}
                onChange={(value) => setSelected(value as string)}
                variant="outline"
              />
            </div>

            <Button
              variant="outline"
              className="gap-2"
              disabled={!data || downloading}
              onClick={handleExport}
            >
              <IconDownload className="size-4" />
              {downloading ? 'در حال آماده‌سازی...' : 'خروجی اکسل'}
            </Button>
          </div>

          <DataView
            data={data}
            error={error}
            isLoading={isLoading}
            variant="inline"
            onRetry={refresh}
          >
            {data && (
              <div className="space-y-3">
                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Summary label="جمع پرداخت" value={formatMoney(data.summary.totalRial)} />
                  <Summary
                    label="تعداد پرداخت"
                    value={data.summary.count.toLocaleString('fa-IR')}
                  />
                  <Summary
                    label="کارمزد پرداخت‌ها"
                    value={formatMoney(data.summary.feesRial)}
                  />
                  <Summary
                    label="پرداخت‌نشده در پایان ماه"
                    value={data.stillUnpaid.count.toLocaleString('fa-IR')}
                    sub={formatMoney(data.stillUnpaid.totalRial)}
                  />
                </section>

                {data.foreign.count > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-3 font-bold text-slate-800">پرداخت‌های ارزی</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
                      <Field label="جمع ریالی" value={formatMoney(data.foreign.totalRial)} />
                      <Field label="کارمزد واسط" value={formatMoney(data.foreign.feesRial)} />
                      <Field
                        label="تعداد"
                        value={data.foreign.count.toLocaleString('fa-IR')}
                      />
                      <Field
                        label="میانگین نرخ"
                        value={`${data.foreign.averageRateRial.toLocaleString('fa-IR')} ریال`}
                      />
                    </div>
                  </section>
                )}

                <div className="grid gap-3 lg:grid-cols-2">
                  <ReportTable
                    title="بر اساس دسته هزینه"
                    rows={data.byCategory}
                    nameHeader="دسته"
                  />
                  <ReportTable
                    title="بر اساس منبع پرداخت"
                    rows={data.bySource}
                    nameHeader="منبع"
                  />
                </div>

                <ReportTable
                  title="بر اساس طرف‌حساب"
                  rows={data.byVendor}
                  nameHeader="طرف‌حساب"
                />

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="mb-1 font-bold text-slate-800">
                    اختلاف مبلغ درخواست و پرداخت
                  </h2>
                  <p className="mb-4 text-xs text-slate-500">
                    مواردی که مبلغ پرداخت‌شده با مبلغ درخواست‌شده یکی نبوده — معمولاً
                    به‌دلیل تغییر نرخ ارز یا صورت‌حساب متفاوت طرف‌حساب.
                  </p>

                  {data.variance.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">
                      همه پرداخت‌ها دقیقاً برابر مبلغ درخواست‌شده بودند.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs text-slate-500">
                            <th className="py-2 text-right font-medium">عنوان</th>
                            <th className="py-2 text-left font-medium">درخواست</th>
                            <th className="py-2 text-left font-medium">پرداخت‌شده</th>
                            <th className="py-2 text-left font-medium">نرخ</th>
                            <th className="py-2 text-left font-medium">کارمزد</th>
                            <th className="py-2 text-right font-medium">واسط</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.variance.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-slate-100 last:border-0"
                            >
                              <td className="py-2 text-slate-700">{row.title}</td>
                              <td className="py-2 text-left tabular-nums text-slate-600">
                                {row.currency === Currency.IRR
                                  ? formatMoney(row.requestedMinor)
                                  : formatForeign(row.requestedMinor, row.currency)}
                              </td>
                              <td className="py-2 text-left tabular-nums font-medium text-slate-800">
                                {formatMoney(row.settledRial)}
                              </td>
                              <td
                                dir="ltr"
                                className="py-2 text-left tabular-nums text-slate-500"
                              >
                                {row.fxRateRialPerUnit
                                  ? row.fxRateRialPerUnit.toLocaleString('en-US')
                                  : '—'}
                              </td>
                              <td className="py-2 text-left tabular-nums text-slate-500">
                                {row.feeRial ? formatMoney(row.feeRial) : '—'}
                              </td>
                              <td className="py-2 text-slate-500">
                                {row.intermediary || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <p className="px-1 text-xs text-slate-400">
                  گزارش {jalaliLabel} — همه مبالغ بر اساس پرداخت واقعی ثبت‌شده است.
                </p>
              </div>
            )}
          </DataView>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function Summary({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="tabular-nums font-medium text-slate-800">{value}</div>
    </div>
  );
}

function ReportTable({
  title,
  rows,
  nameHeader,
}: {
  title: string;
  rows: Parameters<typeof TotalsTable>[0]['rows'];
  nameHeader: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-bold text-slate-800">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          پرداختی در این ماه ثبت نشده است.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <TotalsTable rows={rows} nameHeader={nameHeader} />
        </div>
      )}
    </section>
  );
}
