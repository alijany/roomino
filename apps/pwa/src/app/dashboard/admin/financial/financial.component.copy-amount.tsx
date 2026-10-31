'use client';

import { toast } from 'react-toastify';
import { rial } from './financial.util';

/**
 * An amount that copies itself on click: plain digits in rial, no separators,
 * so it pastes straight into a bank or accounting form.
 */
export function CopyAmount({ value, className = '' }: { value: number; className?: string }) {
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(Math.round(value)));
      toast.success('مبلغ کپی شد', { autoClose: 1200 });
    } catch {
      toast.error('کپی نشد');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`tabular-nums ${className}`}
    >
      {rial(value)}
    </button>
  );
}

/** A sheba (or any code) that copies itself on click, left-to-right as written. */
export function CopyText({ value, className = '' }: { value: string; className?: string }) {
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      toast.success('کپی شد', { autoClose: 1200 });
    } catch {
      toast.error('کپی نشد');
    }
  };

  return (
    <button type="button" dir="ltr" onClick={copy} className={`tabular-nums ${className}`}>
      {value}
    </button>
  );
}
