'use client';

import { BackButton } from '@/ui/molecules/back-button';
import { cn } from '@/libs/style/style.util.helpers';
import { Button, Modal } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { IconX } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';
import {
  ATTENDANCE_MODE_META,
  BOARD_STATUS_META,
  DAY_STATUS_META,
  REQUEST_STATUS_META,
} from './attendance.constants';
import { AttendanceMode, BoardStatus, DayStatus, RequestStatus } from './attendance.types';

/** The header card every dashboard page opens with. */
export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  back,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Where an inner page goes back to: an icon button before the title. */
  back?: { href: string; label: string };
}) {
  return (
    <div className="ui-page-header">
      {back && <BackButton href={back.href} label={back.label} />}
      <div className="ui-page-icon">
        {icon}
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <h1>{title}</h1>
        {subtitle && <div>{subtitle}</div>}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&>*]:grow sm:[&>*]:grow-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/** White panel under the header. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ui-surface flex flex-col p-3 lg:p-4 ${className}`}>{children}</div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  dense = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  /** Tighter padding and type, for a row of several tiles. */
  dense?: boolean;
}) {
  const accent = {
    neutral: 'text-slate-800',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    info: 'text-sky-600',
  }[tone];

  return (
    <div className={dense ? 'ui-surface p-2.5' : 'ui-surface p-3 lg:p-4'}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 font-bold tabular-nums tracking-tight ${dense ? 'text-base' : 'mt-1.5 text-lg lg:text-xl'} ${accent}`}>{value}</div>
      {hint && <div className={`mt-1 text-slate-400 ${dense ? 'text-[11px] leading-4' : 'text-xs'}`}>{hint}</div>}
    </div>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const meta = REQUEST_STATUS_META[status];
  return (
    <Badge tone={meta.tone} className="whitespace-nowrap">
      {meta.label}
    </Badge>
  );
}

export function DayStatusBadge({ status, undeclared }: { status: DayStatus; undeclared?: boolean }) {
  const meta = DAY_STATUS_META[status];
  return (
    <Badge tone={meta.tone} className="whitespace-nowrap">
      {/* «بدون ثبت», a past day nobody declared: absent until a reviewer confirms it. */}
      {undeclared ? 'غایب (اعلام نشده)' : meta.label}
    </Badge>
  );
}

/** Small badge of a person's attendance mode — shown only where it isn't the default. */
export function AttendanceModeBadge({ mode }: { mode: AttendanceMode }) {
  const meta = ATTENDANCE_MODE_META[mode];
  return (
    <Badge tone={meta.tone} className="whitespace-nowrap">
      {meta.label}
    </Badge>
  );
}

export function BoardStatusBadge({ status }: { status: BoardStatus }) {
  const meta = BOARD_STATUS_META[status];
  return (
    <Badge tone={meta.tone} className="whitespace-nowrap">
      {meta.label}
    </Badge>
  );
}

/** Modal with the title bar / scrolling body / footer layout used across the dashboard. */
export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  wide = false,
  xl = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Wider still, for a form with two panels side by side. */
  xl?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={`rounded-t-2xl bg-white ${xl ? 'lg:min-w-[1040px]' : wide ? 'lg:min-w-[720px]' : 'lg:min-w-[480px]'}`}
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 p-5">
          <h3 className="min-w-0 break-words font-bold text-lg text-slate-800">{title}</h3>
          <Button variant="outline" className="shrink-0 !px-2" onClick={onClose} aria-label="بستن">
            <IconX className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 grow space-y-4 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-100 p-5">
            {footer}
          </div>
        )}
      </div>
    </Modal>
  );
}

/** A labelled field wrapper for controls that aren't `<Input>`. */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// Working hours, and quarter-hour minutes: what a day's times are in practice.
const HOURS = Array.from({ length: 10 }, (_, i) => String(i + 8).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const selectClass =
  'w-full min-w-0 cursor-pointer appearance-none bg-transparent px-1 pb-1.5 pt-0.5 text-center tabular-nums focus:outline-none disabled:cursor-default disabled:text-slate-300';

/**
 * A 24-hour `"HH:mm"` picker. The native `<input type="time">` follows the
 * browser's locale and shows AM/PM, which a 24-hour workplace can't use.
 *
 * Two labelled lists, hour on the left and minutes on the right, like a clock. Picking an
 * hour fills the minutes with 00; picking minutes first leaves the hour open and
 * the value empty, so a time is never made up from a half-finished choice.
 */
export function TimeInput({
  value,
  onChange,
  disabled,
  className,
  compact,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** Without the small labels, for a row of many times. */
  compact?: boolean;
  'aria-label'?: string;
}) {
  const [valueH = '', valueM = ''] = value ? value.split(':') : [];
  // Minutes chosen before an hour; kept here until the hour comes.
  const [pendingM, setPendingM] = useState('');
  const h = valueH;
  // Minutes read 00 until chosen.
  const m = valueM || pendingM || '00';
  const hourMissing = !h && !!pendingM;
  // A time saved outside the lists (an old 18:20) is still shown, not blanked.
  const hours = h && !HOURS.includes(h) ? [...HOURS, h].sort() : HOURS;
  const minutes = !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES;

  const setHour = (hour: string) => {
    if (!hour) {
      setPendingM(m);
      onChange('');
      return;
    }
    setPendingM('');
    onChange(`${hour}:${m || '00'}`);
  };
  const setMinute = (minute: string) => {
    if (!h) {
      setPendingM(minute);
      return;
    }
    onChange(`${h}:${minute}`);
  };

  const box = cn(
    'min-w-0 flex-1 rounded-xl border bg-white px-2 text-slate-700 focus-within:border-slate-400',
    !compact && 'pt-1',
    compact && 'py-1',
    disabled && 'bg-slate-50',
  );

  return (
    <div dir="ltr" role="group" aria-label={ariaLabel} className={cn('flex items-stretch gap-2', className)}>
      <div className={cn(box, hourMissing ? 'border-amber-400' : 'border-slate-200')}>
        {!compact && <div className="text-center text-[11px] text-slate-400">ساعت</div>}
        <select
          aria-label="ساعت"
          className={selectClass}
          disabled={disabled}
          value={h}
          onChange={(e) => setHour(e.target.value)}
        >
          <option value="">--</option>
          {hours.map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>
      </div>
      <div className={cn(box, 'border-slate-200')}>
        {!compact && <div className="text-center text-[11px] text-slate-400">دقیقه</div>}
        <select
          aria-label="دقیقه"
          className={selectClass}
          disabled={disabled}
          value={m}
          onChange={(e) => setMinute(e.target.value)}
        >
          {minutes.map((minute) => (
            <option key={minute} value={minute}>{minute}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** A labelled 24-hour time field. */
export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <TimeInput value={value} onChange={onChange} />
    </Field>
  );
}
