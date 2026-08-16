'use client';

import { Button } from '@/ui/atoms/ui.button';
import { Modal } from '@/ui/atoms/ui.modal';
import { Calendar } from '@/ui/molecules/calendar';
import { TZDate } from '@date-fns/tz';
import { IconCalendar, IconX } from '@tabler/icons-react';
import { format, subYears } from 'date-fns-jalali';
import { useState } from 'react';

export const TEHRAN_TZ = 'Asia/Tehran';

interface DatePickerFieldProps {
  label: string;
  value: Date;
  onSelect: (date: Date) => void;
  /** Defaults to two years back — reports look at history, deadlines look forward. */
  minSelectableDate?: Date;
  className?: string;
  disabled?: boolean;
}

/**
 * Single-day Jalali picker built on the shared Calendar, lifted out of the
 * reports domain when the finance module became its second consumer.
 *
 * Displays Jalali (`yyyy/MM/dd`); the Date it hands back is a normal instant,
 * so callers keep working in Gregorian ISO at the API boundary.
 */
export function DatePickerField({
  label,
  value,
  onSelect,
  minSelectableDate,
  className,
  disabled,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const min = minSelectableDate ?? subYears(TZDate.tz(TEHRAN_TZ, new Date()), 2);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className={className ?? 'gap-2'}
        onClick={() => setIsOpen(true)}
      >
        <IconCalendar className="size-4 text-slate-400" />
        <span className="text-slate-500">{label}:</span>
        <span className="font-semibold tabular-nums text-slate-700">
          {format(value, 'yyyy/MM/dd')}
        </span>
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="bg-white p-4 lg:w-[360px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-sm text-slate-700">{label}</span>
          <Button
            type="button"
            variant="outline"
            className="!px-2 border-none"
            onClick={() => setIsOpen(false)}
          >
            <IconX className="size-4" />
          </Button>
        </div>
        <Calendar
          selectedDates={[value]}
          minSelectableDate={min}
          onSelectDates={(dates) => {
            const next = dates[dates.length - 1];
            if (next) {
              onSelect(next);
              setIsOpen(false);
            }
          }}
        />
      </Modal>
    </>
  );
}

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (range: { from: Date; to: Date }) => void;
  minSelectableDate?: Date;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  minSelectableDate,
}: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DatePickerField
        label="از تاریخ"
        value={from}
        minSelectableDate={minSelectableDate}
        onSelect={(date) => onChange({ from: date, to })}
      />
      <DatePickerField
        label="تا تاریخ"
        value={to}
        minSelectableDate={minSelectableDate}
        onSelect={(date) => onChange({ from, to: date })}
      />
    </div>
  );
}
