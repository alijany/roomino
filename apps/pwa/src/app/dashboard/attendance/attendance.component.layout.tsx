'use client';

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
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
        {icon}
      </div>
      <div className="min-w-0 grow">
        <h1 className="font-bold text-slate-800">{title}</h1>
        {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** White panel under the header. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col rounded-2xl bg-white p-3 lg:p-4 ${className}`}>{children}</div>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent}`}>{value}</div>
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
          // Bottom sheet on phones: keep the actions clear of the home indicator.
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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

/** `<input type="time">`, LTR, styled like the other inputs. */
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
      <input
        type="time"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left tabular-nums text-slate-700 focus:border-slate-400 focus:outline-none"
      />
    </Field>
  );
}
