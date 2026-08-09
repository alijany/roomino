'use client';

import { Button } from '@/ui/atoms';
import { Modal } from '@/ui/atoms/ui.modal';
import { Calendar } from '@/ui/molecules';
import { TZDate } from '@date-fns/tz';
import { IconCalendar, IconX } from '@tabler/icons-react';
import { format, subYears } from 'date-fns-jalali';
import { useState } from 'react';

const TEHRAN_TZ = 'Asia/Tehran';

interface ReportDateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (range: { from: Date; to: Date }) => void;
}

interface DateFieldProps {
  label: string;
  value: Date;
  minSelectableDate: Date;
  onSelect: (date: Date) => void;
}

/** Single-day picker reusing the shared Calendar; unlike ReservationDatePicker
 * this allows past dates — historical usage is the whole point of a report. */
function DateField({ label, value, minSelectableDate, onSelect }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
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
          minSelectableDate={minSelectableDate}
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

export function ReportDateRangePicker({ from, to, onChange }: ReportDateRangePickerProps) {
  const minSelectableDate = subYears(TZDate.tz(TEHRAN_TZ, new Date()), 2);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateField
        label="از تاریخ"
        value={from}
        minSelectableDate={minSelectableDate}
        onSelect={(date) => onChange({ from: date, to })}
      />
      <DateField
        label="تا تاریخ"
        value={to}
        minSelectableDate={minSelectableDate}
        onSelect={(date) => onChange({ from, to: date })}
      />
    </div>
  );
}
