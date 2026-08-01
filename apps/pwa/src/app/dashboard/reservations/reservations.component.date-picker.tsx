'use client';

import { Calendar } from '@/ui/molecules';

interface DatePickerProps {
  selected: Date;
  onSelect: (date: Date) => void;
}

/**
 * Single-day wrapper around the shared Jalali `Calendar` molecule.
 * The Calendar is multi-select; we keep only the most recently clicked day.
 */
export function ReservationDatePicker({ selected, onSelect }: DatePickerProps) {
  return (
    <Calendar
      selectedDates={[selected]}
      onSelectDates={(dates) => {
        const next = dates[dates.length - 1] ?? selected;
        onSelect(next);
      }}
    />
  );
}
