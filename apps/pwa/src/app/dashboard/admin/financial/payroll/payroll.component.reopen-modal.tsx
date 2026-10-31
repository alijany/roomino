'use client';

import { FormModal } from '@/app/dashboard/attendance/attendance.component.layout';
import { Button, Input } from '@/ui/atoms';
import { useState } from 'react';

/**
 * Asks why a final month or line is being opened again. The reason is kept with
 * the line, so a later reader of the payslip knows what was corrected and why.
 */
export function ReopenModal({
  title,
  message,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const ready = reason.trim().length >= 3;

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button className="flex-1" disabled={!ready || busy} onClick={() => onConfirm(reason.trim())}>
            {busy ? 'در حال انجام...' : 'بازکردن قطعی'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <p className="rounded-xl bg-amber-50 p-3 text-sm leading-7 text-amber-800">{message}</p>
      <Input
        textarea
        rows={3}
        label="دلیل بازکردن (الزامی)"
        placeholder="مثلاً: مساعده‌ی فراموش‌شده، اشتباه در ساعت اضافه‌کار…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={255}
        autoFocus
      />
    </FormModal>
  );
}
