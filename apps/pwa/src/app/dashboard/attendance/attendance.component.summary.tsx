'use client';

import type { ComponentProps } from 'react';
import { StatTile } from './attendance.component.layout';
import { ReportSummary } from './attendance.types';
import { fa, hm } from './attendance.util';

/** The period summary above a day list. */
export function ReportSummaryTiles({
  summary,
  compact = false,
  personal = false,
  daily = false,
}: {
  summary: ReportSummary;
  compact?: boolean;
  personal?: boolean;
  /** «بدون ثبت»: days, not hours — nothing here is a time of day or an hour count. */
  daily?: boolean;
}) {
  if (daily) return <DailySummaryTiles summary={summary} compact={compact} />;

  const personalBalanceHint =
    summary.balance < 0
      ? 'کسری نسبت به موظفی سپری‌شده'
      : summary.balance > 0
      ? 'مازاد نسبت به موظفی سپری‌شده'
      : 'مطابق موظفی سپری‌شده';
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
      hint: compact ? (personal ? personalBalanceHint : 'اختلاف با موظفی سپری‌شده') : undefined,
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
  // «بدون ثبت»: how many working days were declared — undeclared ones count as absence.
  if (summary.untrackedDays > 0) {
    tiles.splice(2, 0, {
      key: 'declared',
      label: 'اعلام حضور',
      value: `${fa(summary.declaredDays)} از ${fa(summary.untrackedDays)} روز`,
      hint: summary.undeclaredDays ? `${fa(summary.undeclaredDays)} روز اعلام‌نشده (غیبت)` : undefined,
      tone: summary.undeclaredDays ? 'warning' : 'success',
    });
  }
  const primaryKeys = [
    'worked',
    'balance',
    ...(summary.untrackedDays > 0 ? ['declared'] : []),
    'absent',
    personal ? 'leave' : 'overtime',
  ];
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
        <summary className="cursor-pointer rounded-lg text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          {personal ? 'آمار بیشتر: تاخیر، دورکاری و اضافه کار' : 'آمار بیشتر: تاخیر، مرخصی و دورکاری'}
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {tiles.filter((tile) => !primaryKeys.includes(tile.key)).map(renderTile)}
        </div>
      </details>
    </section>
  );
}

/** The summary for someone in «بدون ثبت»: how many days, never how many hours. */
function DailySummaryTiles({ summary, compact }: { summary: ReportSummary; compact: boolean }) {
  const days = (value: number) => `${fa(value)} روز`;
  const tiles: Array<ComponentProps<typeof StatTile> & { key: string }> = [
    {
      key: 'attended',
      label: 'حضور',
      value: `${fa(summary.attendedDays)} از ${fa(summary.requiredDays)} روز`,
      hint: summary.undeclaredDays ? `${fa(summary.undeclaredDays)} روز اعلام‌نشده (غیبت)` : 'روزهای کاری تا امروز',
      tone: summary.undeclaredDays ? 'warning' : 'success',
    },
    {
      key: 'absent',
      label: 'غیبت',
      value: days(summary.absentDays),
      tone: summary.absentDays ? 'danger' : 'neutral',
    },
    { key: 'leave', label: 'مرخصی', value: days(summary.leaveDays) },
    { key: 'mission', label: 'ماموریت', value: days(summary.missionDays) },
    {
      key: 'remote',
      label: 'دورکاری',
      value: days(summary.remoteDays),
      hint: summary.remotePendingDays ? `${fa(summary.remotePendingDays)} روز در انتظار تایید` : undefined,
    },
    ...(summary.overtime
      ? [{ key: 'overtime', label: 'اضافه کار', value: hm(summary.overtime), tone: 'success' as const }]
      : []),
  ];

  return (
    <section aria-label="خلاصه حضور" className="space-y-3">
      {/* Few short tiles: all of them in one row from tablet width up. */}
      <div
        className="grid grid-cols-2 gap-2 md:[grid-template-columns:repeat(var(--tiles),minmax(0,1fr))]"
        style={{ '--tiles': tiles.length } as React.CSSProperties}
      >
        {tiles.map(({ key, ...props }) => (
          <StatTile key={key} {...props} dense />
        ))}
      </div>
    </section>
  );
}
