'use client';

import { Button } from '@/ui/atoms';
import { DateRangePicker } from '@/ui/molecules';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import { PeriodQuery } from './attendance.types';
import {
  currentJalaliMonth,
  fa,
  fromCivilDate,
  jalaliMonthName,
  jalaliMonthRange,
  shiftJalaliMonth,
  toCivilDate,
} from './attendance.util';

/**
 * A Jalali month with previous/next, or — when `allowRange` — a custom
 * from/to. Switching to a range starts from the month on screen.
 */
export function PeriodPicker({
  value,
  onChange,
  allowRange = false,
  allowFuture = false,
}: {
  value: PeriodQuery;
  onChange: (value: PeriodQuery) => void;
  allowRange?: boolean;
  allowFuture?: boolean;
}) {
  const [mode, setMode] = useState<'month' | 'range'>(value.from ? 'range' : 'month');
  const now = currentJalaliMonth();
  const y = value.y ?? now.y;
  const m = value.m ?? now.m;
  const isCurrent = y === now.y && m === now.m;

  const go = (delta: number) => onChange(shiftJalaliMonth(y, m, delta));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowRange && (
        <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
          {(['month', 'range'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                if (item === 'range') onChange(jalaliMonthRange(y, m));
                else onChange({ y, m });
              }}
              className={`rounded-lg px-3 py-1 ${mode === item ? 'bg-white font-semibold text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              {item === 'month' ? 'ماهانه' : 'بازه دلخواه'}
            </button>
          ))}
        </div>
      )}

      {mode === 'month' ? (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="!px-2" onClick={() => go(-1)} aria-label="ماه قبل">
            <IconChevronRight className="size-4" />
          </Button>
          <span className="min-w-28 text-center font-semibold text-slate-700">
            {jalaliMonthName(m)} {fa(y)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="!px-2"
            disabled={isCurrent && !allowFuture}
            onClick={() => go(1)}
            aria-label="ماه بعد"
          >
            <IconChevronLeft className="size-4" />
          </Button>
        </div>
      ) : (
        <DateRangePicker
          from={fromCivilDate(value.from ?? jalaliMonthRange(y, m).from)}
          to={fromCivilDate(value.to ?? jalaliMonthRange(y, m).to)}
          onChange={({ from, to }) => onChange({ from: toCivilDate(from), to: toCivilDate(to) })}
        />
      )}
    </div>
  );
}
