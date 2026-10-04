'use client';

import { StatTile } from './attendance.component.layout';
import { ReportSummary } from './attendance.types';
import { fa, hm } from './attendance.util';

/** The period summary above a day list. */
export function ReportSummaryTiles({ summary }: { summary: ReportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
      <StatTile label="کارکرد" value={hm(summary.worked)} hint={`موظفی تا امروز ${hm(summary.required)}`} />
      <StatTile
        label="اختلاف"
        value={hm(summary.balance)}
        tone={summary.balance < 0 ? 'danger' : 'success'}
      />
      <StatTile
        label="تاخیر"
        value={hm(summary.delayMinutes)}
        hint={`${fa(summary.delayCount)} روز`}
        tone={summary.delayMinutes ? 'warning' : 'neutral'}
      />
      <StatTile
        label="تعجیل"
        value={hm(summary.earlyMinutes)}
        hint={`${fa(summary.earlyCount)} روز`}
        tone={summary.earlyMinutes ? 'warning' : 'neutral'}
      />
      <StatTile
        label="غیبت"
        value={`${fa(summary.absentDays)} روز`}
        hint={summary.incompleteDays ? `${fa(summary.incompleteDays)} روز ناقص` : undefined}
        tone={summary.absentDays ? 'danger' : 'neutral'}
      />
      <StatTile label="اضافه کار" value={hm(summary.overtime)} tone={summary.overtime ? 'success' : 'neutral'} />
      <StatTile label="مرخصی" value={hm(summary.leaveMinutes)} hint={`${fa(summary.leaveDays)} روز کامل`} />
      <StatTile label="دورکاری" value={hm(summary.remoteMinutes)} hint={`${fa(summary.remoteDays)} روز`} />
      <StatTile label="ماموریت" value={`${fa(summary.missionDays)} روز`} />
      <StatTile label="روز حضور" value={fa(summary.presentDays)} />
    </div>
  );
}
