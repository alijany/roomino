'use client';

import type { ComponentProps } from 'react';
import { StatTile } from './attendance.component.layout';
import { ReportSummary } from './attendance.types';
import { fa, hm } from './attendance.util';

/** The period summary above a day list. */
export function ReportSummaryTiles({ summary, compact = false }: { summary: ReportSummary; compact?: boolean }) {
  const tiles: Array<ComponentProps<typeof StatTile> & { key: string }> = [
    {
      key: 'worked',
      label: 'کارکرد',
      value: hm(summary.worked),
      hint: `${compact ? 'موظفی سپری‌شده' : 'موظفی تا امروز'} ${hm(summary.required)}`,
    },
    {
      key: 'balance',
      label: compact ? 'تراز کارکرد' : 'اختلاف',
      value: <bdi dir="ltr">{hm(summary.balance)}</bdi>,
      hint: compact ? 'اختلاف با موظفی سپری‌شده' : undefined,
      tone: summary.balance < 0 ? 'danger' : 'success',
    },
    {
      key: 'delay',
      label: 'تاخیر',
      value: hm(summary.delayMinutes),
      hint: `${fa(summary.delayCount)} روز`,
      tone: summary.delayMinutes ? 'warning' : 'neutral',
    },
    {
      key: 'early',
      label: 'تعجیل',
      value: hm(summary.earlyMinutes),
      hint: `${fa(summary.earlyCount)} روز`,
      tone: summary.earlyMinutes ? 'warning' : 'neutral',
    },
    {
      key: 'absent',
      label: 'غیبت',
      value: `${fa(summary.absentDays)} روز`,
      hint: summary.incompleteDays ? `${fa(summary.incompleteDays)} روز ناقص` : undefined,
      tone: summary.absentDays ? 'danger' : 'neutral',
    },
    {
      key: 'overtime',
      label: 'اضافه کار',
      value: hm(summary.overtime),
      tone: summary.overtime ? 'success' : 'neutral',
    },
    {
      key: 'leave',
      label: 'مرخصی',
      value: hm(summary.leaveMinutes),
      hint: `${fa(summary.leaveDays)} روز کامل`,
    },
    {
      key: 'remote',
      label: 'دورکاری',
      value: hm(summary.remoteMinutes),
      hint: `${fa(summary.remoteDays)} روز`,
    },
    {
      key: 'mission',
      label: 'ماموریت',
      value: `${fa(summary.missionDays)} روز`,
    },
    { key: 'present', label: 'روز حضور', value: fa(summary.presentDays) },
  ];
  const primaryKeys = ['worked', 'balance', 'absent', 'overtime'];
  const renderTile = ({ key, ...props }: (typeof tiles)[number]) => <StatTile key={key} {...props} />;

  if (!compact) {
    return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{tiles.map(renderTile)}</div>;
  }

  return (
    <section aria-label="خلاصه کارکرد" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.filter((tile) => primaryKeys.includes(tile.key)).map(renderTile)}
      </div>
      <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <summary className="cursor-pointer rounded-lg text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
          آمار بیشتر: تاخیر، مرخصی و دورکاری
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {tiles.filter((tile) => !primaryKeys.includes(tile.key)).map(renderTile)}
        </div>
      </details>
    </section>
  );
}
