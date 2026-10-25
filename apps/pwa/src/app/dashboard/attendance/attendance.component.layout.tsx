'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Button, Modal } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { IconX } from '@tabler/icons-react';
import { ReactNode } from 'react';
import {
  BOARD_STATUS_META,
  DAY_STATUS_META,
  REQUEST_STATUS_META,
} from './attendance.constants';
import { BoardStatus, DayStatus, RequestStatus } from './attendance.types';

/** The header card every dashboard page opens with. */
export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ui-page-header">
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
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const accent = {
    neutral: 'text-slate-800',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    info: 'text-sky-600',
  }[tone];

  return (
    <div className="ui-surface p-3 lg:p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1.5 text-lg font-bold tabular-nums tracking-tight lg:text-xl ${accent}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
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

export function DayStatusBadge({ status }: { status: DayStatus }) {
  const meta = DAY_STATUS_META[status];
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
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={`rounded-t-2xl bg-white ${wide ? 'lg:min-w-[720px]' : 'lg:min-w-[480px]'}`}
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

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const selectClass =
  'min-w-0 grow cursor-pointer appearance-none bg-transparent px-1 py-2 text-center tabular-nums focus:outline-none disabled:cursor-default disabled:text-slate-300';

/**
 * A 24-hour `"HH:mm"` picker. The native `<input type="time">` follows the
 * browser's locale and shows AM/PM, which a 24-hour workplace can't use.
 */
export function TimeInput({
  value,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const [h = '', m = ''] = value ? value.split(':') : [];

  return (
    <div
      dir="ltr"
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center rounded-xl border border-slate-200 bg-white px-2 text-slate-700 focus-within:border-slate-400',
        disabled && 'bg-slate-50',
        className,
      )}
    >
      <select
        aria-label="ساعت"
        className={selectClass}
        disabled={disabled}
        value={h}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:${m || '00'}` : '')}
      >
        <option value="">--</option>
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <span aria-hidden="true" className="text-slate-400">:</span>
      <select
        aria-label="دقیقه"
        className={selectClass}
        disabled={disabled}
        value={m}
        onChange={(e) => onChange(e.target.value ? `${h || '00'}:${e.target.value}` : '')}
      >
        <option value="">--</option>
        {MINUTES.map((minute) => (
          <option key={minute} value={minute}>{minute}</option>
        ))}
      </select>
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
