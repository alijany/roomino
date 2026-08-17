'use client';

import { formatMoney, formatMoneyCompact } from '@/libs/format/format.util';
import { cn } from '@/libs/style/style.util.helpers';
import { ApexOptions } from 'apexcharts';
import { IconChartBar, IconTable } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { ReactNode, useMemo, useState } from 'react';
import { NamedTotal, TrendPoint } from './finance.types';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

/**
 * Validated categorical slots — blue and orange, checked for CVD separation and
 * contrast against a white surface. Two series is the whole palette here; a
 * third category would fold into "سایر" rather than take a generated hue.
 */
const SERIES_DOMESTIC = '#2a78d6';
const SERIES_FOREIGN = '#eb6834';

/** Single-hue sequential for magnitude comparisons (one series, no legend). */
const SEQUENTIAL = '#2a78d6';

const GRID = '#e2e8f0';
const AXIS_TEXT = '#64748b';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** RTL tooltip shell, matching the room-usage heatmap already in the app. */
function tooltipShell(title: string, rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<div style="display:flex;gap:12px;justify-content:space-between">
           <span style="color:#64748b">${escapeHtml(label)}</span>
           <span style="font-weight:600">${escapeHtml(value)}</span>
         </div>`
    )
    .join('');

  return `<div style="direction:rtl;text-align:right;padding:8px 12px;font-size:12px">
            <div style="font-weight:700;margin-bottom:4px">${escapeHtml(title)}</div>
            ${body}
          </div>`;
}

const BASE_OPTIONS: ApexOptions = {
  chart: {
    fontFamily: 'inherit',
    toolbar: { show: false },
    animations: { enabled: false },
    zoom: { enabled: false },
  },
  grid: { borderColor: GRID, strokeDashArray: 3 },
  dataLabels: { enabled: false },
  legend: { fontFamily: 'inherit', labels: { colors: AXIS_TEXT } },
};

/**
 * Chart with a table alternative. The toggle is not decoration — it is how a
 * screen-reader user, or anyone who needs exact figures, reads the same data.
 */
export function ChartCard({
  title,
  subtitle,
  chart,
  table,
  isEmpty,
  emptyMessage = 'داده‌ای برای این بازه نیست',
}: {
  title: string;
  subtitle?: string;
  chart: ReactNode;
  table: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        {!isEmpty && (
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            {(
              [
                ['chart', <IconChartBar key="c" className="size-4" />, 'نمودار'],
                ['table', <IconTable key="t" className="size-4" />, 'جدول'],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={view === id}
                title={label}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                  view === id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isEmpty ? (
        <p className="py-8 text-center text-sm text-slate-400">{emptyMessage}</p>
      ) : view === 'chart' ? (
        chart
      ) : (
        <div className="overflow-x-auto">{table}</div>
      )}
    </section>
  );
}

/** 12-month spend, split domestic vs foreign. Stacked — the total is the point. */
export function SpendTrendChart({ points }: { points: TrendPoint[] }) {
  const options = useMemo<ApexOptions>(
    () => ({
      ...BASE_OPTIONS,
      chart: { ...BASE_OPTIONS.chart, type: 'bar', stacked: true },
      colors: [SERIES_DOMESTIC, SERIES_FOREIGN],
      plotOptions: {
        bar: {
          columnWidth: '55%',
          borderRadius: 4,
          borderRadiusApplication: 'end',
          // A 2px surface gap between stacked segments, so the boundary reads
          // without relying on the hue difference alone.
          borderRadiusWhenStacked: 'all',
        },
      },
      stroke: { show: true, width: 2, colors: ['#ffffff'] },
      xaxis: {
        categories: points.map((p) => p.month),
        labels: { style: { colors: AXIS_TEXT, fontSize: '11px' } },
        axisBorder: { color: GRID },
        axisTicks: { color: GRID },
      },
      yaxis: {
        labels: {
          style: { colors: AXIS_TEXT, fontSize: '11px' },
          formatter: (value: number) => formatMoneyCompact(value, { withUnit: false }),
        },
      },
      legend: { ...BASE_OPTIONS.legend, position: 'top', horizontalAlign: 'left' },
      tooltip: {
        custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
          const point = points[dataPointIndex];
          if (!point) return '';
          return tooltipShell(point.month, [
            ['داخلی', formatMoney(point.domesticRial)],
            ['ارزی', formatMoney(point.foreignRial)],
            ['جمع', formatMoney(point.totalRial)],
            ['تعداد پرداخت', point.count.toLocaleString('fa-IR')],
          ]);
        },
      },
    }),
    [points]
  );

  const series = useMemo(
    () => [
      { name: 'داخلی', data: points.map((p) => p.domesticRial) },
      { name: 'ارزی', data: points.map((p) => p.foreignRial) },
    ],
    [points]
  );

  return <ReactApexChart options={options} series={series} type="bar" height={300} />;
}

/**
 * Magnitude comparison, horizontal so long Persian names have room.
 *
 * One series, one hue — this answers "what cost the most", not "which category
 * is which", so categorical colour would be noise.
 */
export function RankedBarChart({
  rows,
  height = 300,
}: {
  rows: NamedTotal[];
  height?: number;
}) {
  const options = useMemo<ApexOptions>(
    () => ({
      ...BASE_OPTIONS,
      chart: { ...BASE_OPTIONS.chart, type: 'bar' },
      colors: [SEQUENTIAL],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '62%',
          borderRadius: 4,
          borderRadiusApplication: 'end',
        },
      },
      xaxis: {
        categories: rows.map((row) => row.name),
        labels: {
          style: { colors: AXIS_TEXT, fontSize: '11px' },
          formatter: (value: string) =>
            formatMoneyCompact(Number(value), { withUnit: false }),
        },
        axisBorder: { color: GRID },
        axisTicks: { color: GRID },
      },
      yaxis: {
        labels: { style: { colors: AXIS_TEXT, fontSize: '11px' } },
      },
      tooltip: {
        custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
          const row = rows[dataPointIndex];
          if (!row) return '';
          return tooltipShell(row.name, [
            ['مبلغ', formatMoney(row.totalRial)],
            ['تعداد پرداخت', row.count.toLocaleString('fa-IR')],
          ]);
        },
      },
    }),
    [rows]
  );

  const series = useMemo(
    () => [{ name: 'مبلغ', data: rows.map((row) => row.totalRial) }],
    [rows]
  );

  return <ReactApexChart options={options} series={series} type="bar" height={height} />;
}

/** The table alternative behind every chart above. */
export function TotalsTable({
  rows,
  nameHeader,
}: {
  rows: NamedTotal[];
  nameHeader: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.totalRial, 0);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs text-slate-500">
          <th className="py-2 text-right font-medium">{nameHeader}</th>
          <th className="py-2 text-left font-medium">مبلغ</th>
          <th className="py-2 text-left font-medium">سهم</th>
          <th className="py-2 text-left font-medium">تعداد</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name} className="border-b border-slate-100 last:border-0">
            <td className="py-2 text-slate-700">{row.name}</td>
            <td className="py-2 text-left tabular-nums text-slate-800">
              {formatMoney(row.totalRial)}
            </td>
            <td className="py-2 text-left tabular-nums text-slate-500">
              {total > 0
                ? `${Math.round((row.totalRial / total) * 100).toLocaleString('fa-IR')}٪`
                : '—'}
            </td>
            <td className="py-2 text-left tabular-nums text-slate-500">
              {row.count.toLocaleString('fa-IR')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TrendTable({ points }: { points: TrendPoint[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs text-slate-500">
          <th className="py-2 text-right font-medium">ماه</th>
          <th className="py-2 text-left font-medium">داخلی</th>
          <th className="py-2 text-left font-medium">ارزی</th>
          <th className="py-2 text-left font-medium">جمع</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.month} className="border-b border-slate-100 last:border-0">
            <td className="py-2 tabular-nums text-slate-700">{point.month}</td>
            <td className="py-2 text-left tabular-nums text-slate-600">
              {formatMoney(point.domesticRial)}
            </td>
            <td className="py-2 text-left tabular-nums text-slate-600">
              {formatMoney(point.foreignRial)}
            </td>
            <td className="py-2 text-left tabular-nums font-medium text-slate-800">
              {formatMoney(point.totalRial)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
