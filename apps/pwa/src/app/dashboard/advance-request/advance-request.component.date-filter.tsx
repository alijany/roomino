'use client';

import { Dropdown } from '@/ui/atoms';
import { DatePickerField } from '@/ui/molecules/date-picker-field';
import { DATE_FILTER_OPTIONS, useDateFilter } from './advance-request.hook.use-date-filter';

export function DateFilterControls({
  filter,
  onChange,
}: {
  filter: ReturnType<typeof useDateFilter>;
  onChange?: () => void;
}) {
  const { mode, setMode, customFrom, setCustomFrom, customTo, setCustomTo } = filter;

  return (
    <>
      <div className="sm:w-56">
        <Dropdown
          items={DATE_FILTER_OPTIONS}
          value={mode}
          onChange={(value) => {
            setMode(value ?? 'all');
            onChange?.();
          }}
          placeholder="همه تاریخ‌ها"
          variant="outline"
        />
      </div>

      {mode === 'custom' && (
        <>
          <div className="sm:w-48">
            <DatePickerField
              label="از تاریخ"
              value={customFrom ?? new Date()}
              onSelect={(date) => {
                setCustomFrom(date);
                onChange?.();
              }}
            />
          </div>
          <div className="sm:w-48">
            <DatePickerField
              label="تا تاریخ"
              value={customTo ?? new Date()}
              onSelect={(date) => {
                setCustomTo(date);
                onChange?.();
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
