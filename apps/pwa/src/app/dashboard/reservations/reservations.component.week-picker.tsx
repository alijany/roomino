'use client';

import { WEEKDAYS, tehranDateString } from '@/libs/meeting/meeting.time';
import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { TZDate } from '@date-fns/tz';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import {
  addDays,
  addWeeks,
  format,
  isBefore,
  startOfDay,
  startOfWeek,
} from 'date-fns-jalali';
import { useMemo, useState } from 'react';

interface WeekPickerProps {
  selected: Date;
  onSelect: (date: Date) => void;
}

const TEHRAN_TZ = 'Asia/Tehran';

/**
 * Compact Jalali week strip (شنبه…جمعه) with week navigation — used on mobile
 * in place of the full month calendar. Same contract as ReservationDatePicker.
 */
export function WeekPicker({ selected, onSelect }: WeekPickerProps) {
  const today = startOfDay(TZDate.tz(TEHRAN_TZ, new Date()));
  const [anchor, setAnchor] = useState<Date>(selected);

  const days = useMemo(() => {
    const start = startOfWeek(new TZDate(anchor, TEHRAN_TZ), { weekStartsOn: 6 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const selectedKey = tehranDateString(selected);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="border-none !px-2"
          onClick={() => setAnchor(addWeeks(anchor, -1))}
          aria-label="هفته قبل"
        >
          <IconChevronRight className="size-5" />
        </Button>
        <h2 className="font-semibold text-sm text-slate-600">
          {format(days[0], 'MMMM yyyy')}
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="border-none !px-2"
          onClick={() => setAnchor(addWeeks(anchor, 1))}
          aria-label="هفته بعد"
        >
          <IconChevronLeft className="size-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const jalaliWeekday = (new TZDate(day, TEHRAN_TZ).getDay() + 1) % 7;
          const isPast = isBefore(startOfDay(day), today);
          const isSelected = tehranDateString(day) === selectedKey;
          return (
            <button
              key={day.getTime()}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(day)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors',
                {
                  'border-primary bg-primary text-white': isSelected,
                  'border-slate-200 hover:bg-slate-50 text-slate-600':
                    !isSelected && !isPast,
                  'border-transparent text-slate-300 cursor-not-allowed': isPast,
                },
              )}
            >
              <span className="text-[10px]">{WEEKDAYS[jalaliWeekday]}</span>
              <span className="text-sm font-semibold tabular-nums">
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
