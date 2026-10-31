'use client';

import { Dropdown } from '@/ui/atoms';
import { MONTHS, currentPeriod, monthOf, toPeriod, yearOf } from './financial.util';

/** A Jalali month: month name and year, as one `140507`-style number. */
export function PeriodPicker({ label, value, onChange }: { label: string; value: number; onChange: (period: number) => void }) {
  const thisYear = yearOf(currentPeriod());
  const years = Array.from({ length: 8 }, (_, i) => thisYear + 1 - i);
  if (!years.includes(yearOf(value))) years.push(yearOf(value));

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Dropdown
            items={MONTHS.map((name, i) => ({ value: i + 1, label: name }))}
            value={monthOf(value)}
            onChange={(m) => {
              if (m) onChange(toPeriod(yearOf(value), Number(m)));
            }}
            variant="outline"
          />
        </div>
        <div className="w-28">
          <Dropdown
            items={years.sort((a, b) => b - a).map((y) => ({ value: y, label: y.toLocaleString('fa-IR', { useGrouping: false }) }))}
            value={yearOf(value)}
            onChange={(y) => {
              if (y) onChange(toPeriod(Number(y), monthOf(value)));
            }}
            variant="outline"
          />
        </div>
      </div>
    </div>
  );
}
