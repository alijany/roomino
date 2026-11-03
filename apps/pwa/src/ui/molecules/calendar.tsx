"use client";

import { Button } from "@/ui/atoms";
import { TZDate } from '@date-fns/tz';
import { addDays, addMonths, addYears, eachDayOfInterval, format, isBefore, startOfDay, startOfMonth } from "date-fns-jalali";
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";

type CalendarProps = {
  selectedDates: Date[];
  onSelectDates: (dates: Date[]) => void;
  minSelectableDate?: Date;
  disabledDates?: Date[];
  onViewMonthChange?: (daysInMonth: Date[]) => void;
};

const daysInWeek: string[] = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function Calendar({
  selectedDates,
  onSelectDates,
  minSelectableDate,
  disabledDates = [],
  onViewMonthChange,
}: CalendarProps) {
  const now = TZDate.tz('Asia/Tehran', new Date());
  const defaultMinDate: Date = startOfDay(now);
  const minDate: Date = minSelectableDate
    ? startOfDay(minSelectableDate)
    : defaultMinDate;
  const today: Date = startOfDay(now);
  const [viewMonth, setViewMonth] = useState<Date>(today);

  // Calculate the first day of the month and its day-of-week (1-7)
  const daysInMonth: Date[] = useMemo(() => {
    const firstDayOfMonth: Date = startOfMonth(viewMonth);
    const dayOfWeek: number = firstDayOfMonth.getDay();
    const startDay = addDays(firstDayOfMonth, - (dayOfWeek + 1));
    const endDay = addDays(startDay, 41);
    const daysInMonth: Date[] = eachDayOfInterval({
      start: startDay,
      end: endDay,
    });
    return daysInMonth;
  }, [viewMonth]);

  // Call onViewMonthChange when viewMonth or daysInMonth changes
  useEffect(() => {
    if (onViewMonthChange) {
      onViewMonthChange(daysInMonth);
    }
  }, [daysInMonth, onViewMonthChange]);

  // Helper function to check if a date is disabled
  const isDateDisabled = (date: Date): boolean => {
    return disabledDates.some((disabledDate) =>
      format(disabledDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const toggleDateSelection = (date: Date) => {
    if (isBefore(date, minDate) || isDateDisabled(date)) return;    // check both conditions
    onSelectDates(
      selectedDates.some((d) => format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
        ? selectedDates.filter((d) => format(d, "yyyy-MM-dd") !== format(date, "yyyy-MM-dd"))
        : [...selectedDates, date]
    );
  };

  return (
    <div className="bg-white rounded-2xl w-full h-full space-y-2 lg:space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="outline" className="border-none !px-2" size="sm" title="سال قبل" aria-label="سال قبل" onClick={() => setViewMonth(addYears(viewMonth, -1))}>
            <IconChevronsRight />
          </Button>
          <Button variant="outline" className="border-none" size="sm" onClick={() => setViewMonth(addMonths(viewMonth, -1))}>
            <IconChevronRight />
            <span>ماه قبل</span>
          </Button>
        </div>
        <h2 className="font-semibold">{format(viewMonth, "MMMM yyyy")}</h2>
        <div className="flex items-center">
          <Button variant="outline" className="border-none" size="sm" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
            <span>ماه بعد</span>
            <IconChevronLeft />
          </Button>
          <Button variant="outline" className="border-none !px-2" size="sm" title="سال بعد" aria-label="سال بعد" onClick={() => setViewMonth(addYears(viewMonth, 1))}>
            <IconChevronsLeft />
          </Button>
        </div>
      </div>

      <hr />

      <div className="grid grid-cols-7 text-center font-semibold">
        {daysInWeek.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 lg:gap-3">
        {daysInMonth.map((date, index) => {
          const isPast: boolean = isBefore(date, minDate);
          const isDisabled: boolean = isDateDisabled(date);      // check if date is disabled
          const isSelected: boolean = selectedDates.some((d) => format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
          return (
            <Button
              key={index}
              variant={isSelected ? "secondary" : "ghost"}
              className="rounded-2xl"
              disabled={isPast || isDisabled}                    // disable if past or explicitly disabled
              onClick={() => toggleDateSelection(date)}
            >
              {format(date, "d")}
            </Button>
          );
        })}
      </div>
    </div>
  );
}