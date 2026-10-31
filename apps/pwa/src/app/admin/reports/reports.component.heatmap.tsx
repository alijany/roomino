'use client';

import { IconTable, IconGrid3x3 } from '@tabler/icons-react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { HeatmapCell, RoomUsageHeatmapResponse } from './reports.types';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Sequential blue ramp (steps 100→700, light→dark) plus a near-surface swatch
// for "no usage" — magnitude scale, not a categorical palette.
const COLOR_RANGES = [
  { from: 0, to: 0, color: '#f4f6fa', name: 'بدون رزرو' },
  { from: 1, to: 20, color: '#cde2fb', name: '۱ تا ۲۰٪' },
  { from: 21, to: 40, color: '#9ec5f4', name: '۲۱ تا ۴۰٪' },
  { from: 41, to: 60, color: '#5598e7', name: '۴۱ تا ۶۰٪' },
  { from: 61, to: 80, color: '#2a78d6', name: '۶۱ تا ۸۰٪' },
  { from: 81, to: 100, color: '#184f95', name: '۸۱ تا ۱۰۰٪' },
];

interface HeatmapDataPoint {
  x: string;
  y: number;
  meta: HeatmapCell;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface RoomUsageHeatmapProps {
  data: RoomUsageHeatmapResponse;
}

export function RoomUsageHeatmap({ data }: RoomUsageHeatmapProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const series = useMemo(
    () =>
      data.rooms.map((room) => ({
        name: room.roomName,
        data: data.buckets.map((bucket, index) => ({
          x: bucket.label,
          y: Math.round(room.values[index].occupancyRate * 100),
          meta: room.values[index],
        })),
      })),
    [data],
  );

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'heatmap',
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: { width: 3, colors: ['#ffffff'] },
      legend: { show: true, position: 'bottom', fontFamily: 'inherit', markers: { size: 6 } },
      plotOptions: {
        heatmap: {
          radius: 2,
          colorScale: { ranges: COLOR_RANGES },
        },
      },
      xaxis: {
        type: 'category',
        labels: { style: { colors: '#52514e', fontSize: '12px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: '#52514e', fontSize: '12px' } },
      },
      grid: { show: false, padding: { left: 8, right: 8 } },
      tooltip: {
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const point = w.config.series[seriesIndex]?.data?.[dataPointIndex] as
            | HeatmapDataPoint
            | undefined;
          if (!point) return '';
          const roomName = w.config.series[seriesIndex]?.name ?? '';
          return `
            <div style="padding:8px 12px;font-family:inherit;direction:rtl;text-align:right;min-width:150px">
              <div style="font-weight:700;font-size:14px;color:#0b0b0b">${point.y}% اشغال</div>
              <div style="font-size:12px;color:#52514e;margin-top:2px">${escapeHtml(String(roomName))} — ${escapeHtml(point.x)}</div>
              <div style="font-size:11px;color:#898781;margin-top:2px">${point.meta.count} رزرو · ${point.meta.minutes} دقیقه</div>
            </div>
          `;
        },
      },
    }),
    [],
  );

  const height = Math.max(220, data.rooms.length * 56 + 80);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          {view === 'chart' ? (
            <>
              <IconTable className="size-4" />
              نمایش جدولی
            </>
          ) : (
            <>
              <IconGrid3x3 className="size-4" />
              نمایش نمودار
            </>
          )}
        </button>
      </div>

      {view === 'chart' ? (
        <ReactApexChart type="heatmap" options={options} series={series} height={height} />
      ) : (
        <RoomUsageTable data={data} />
      )}
    </div>
  );
}

function RoomUsageTable({ data }: { data: RoomUsageHeatmapResponse }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500">
            <th className="sticky right-0 bg-slate-50 px-3 py-2 text-right font-medium">اتاق</th>
            {data.buckets.map((bucket) => (
              <th key={bucket.key} className="px-3 py-2 text-center font-medium tabular-nums">
                {bucket.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rooms.map((room) => (
            <tr key={room.roomId} className="border-t border-slate-100">
              <td className="sticky right-0 bg-white px-3 py-2 font-medium text-slate-700">
                {room.roomName}
              </td>
              {room.values.map((cell, index) => (
                <td
                  key={data.buckets[index].key}
                  className="px-3 py-2 text-center tabular-nums text-slate-600"
                >
                  {Math.round(cell.occupancyRate * 100)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
