'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { IconCheck } from '@tabler/icons-react';
import { ATTENDANCE_MODES, ATTENDANCE_MODE_META } from './attendance.constants';
import { AttendanceMode } from './attendance.types';

/**
 * Choose how presence is recorded: three cards, the chosen one explained
 * underneath. For a person, `inherit` adds a first card that follows the job
 * group (`value` null) and names what that currently means.
 */
export function AttendanceModePicker({
  value,
  onChange,
  inherit,
  disabled,
}: {
  value: AttendanceMode | null;
  onChange: (mode: AttendanceMode | null) => void;
  inherit?: { groupName: string | null; mode: AttendanceMode };
  disabled?: boolean;
}) {
  const options: Array<{
    id: AttendanceMode | 'inherit';
    value: AttendanceMode | null;
    title: string;
    summary: string;
  }> = [
    ...(inherit
      ? [
          {
            id: 'inherit' as const,
            value: null,
            title: 'طبق گروه شغلی',
            summary: inherit.groupName
              ? `«${inherit.groupName}»: ${ATTENDANCE_MODE_META[inherit.mode].label}`
              : `بدون گروه: ${ATTENDANCE_MODE_META[inherit.mode].label}`,
          },
        ]
      : []),
    ...ATTENDANCE_MODES.map((mode) => ({
      id: mode,
      value: mode,
      title: ATTENDANCE_MODE_META[mode].label,
      summary: ATTENDANCE_MODE_META[mode].summary,
    })),
  ];

  const explained = value ?? inherit?.mode ?? AttendanceMode.TRACKED;

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="نوع حضور"
        className={cn('grid gap-2', inherit ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex min-h-16 flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60',
                selected
                  ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                {option.title}
                {selected && <IconCheck className="size-4 shrink-0 text-brand-600" aria-hidden="true" />}
              </span>
              <span className="text-xs leading-5 text-slate-500">{option.summary}</span>
            </button>
          );
        })}
      </div>
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">
        {ATTENDANCE_MODE_META[explained].detail}
      </p>
    </div>
  );
}
