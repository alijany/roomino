'use client';

import { Button, Input } from '@/ui/atoms';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { CorrectionBase, useConfirmPresence } from './attendance.api';
import { FormModal } from './attendance.component.layout';
import { errorMessage, fa, jalaliLabel } from './attendance.util';

/**
 * «حاضر بود» — the month-end clean-up for people in «بدون ثبت»: a past
 * working day nobody declared counts as absent until a reviewer confirms it.
 * One day or all of a period's undeclared days at once, with an optional note.
 */
export function ConfirmPresenceModal({
  employee,
  dates,
  base,
  onClose,
  onDone,
}: {
  employee: { id: number; name: string | null };
  dates: string[];
  base: CorrectionBase;
  onClose: () => void;
  onDone: () => void;
}) {
  const confirm = useConfirmPresence(base);
  const [note, setNote] = useState('');
  const many = dates.length > 1;

  const handleConfirm = async () => {
    try {
      await confirm.submit({ id: employee.id, dates, note: note.trim() || undefined });
      toast.success(many ? `حضور ${fa(dates.length)} روز تایید شد` : 'حضور آن روز تایید شد');
      onDone();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'تایید حضور انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title="حاضر بود"
      footer={
        <>
          <Button className="flex-1" disabled={confirm.isLoading || !dates.length} onClick={handleConfirm}>
            {confirm.isLoading ? 'در حال ثبت...' : many ? `تایید حضور ${fa(dates.length)} روز` : 'تایید حضور'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <p className="text-sm leading-7 text-slate-600">
        {employee.name ?? 'این فرد'} {many ? 'در روزهای زیر' : 'در این روز'} حضور را اعلام نکرده بود و غیبت حساب می‌شد.
        با تایید، {many ? 'این روزها' : 'این روز'} حاضر (طبق شیفت) حساب می‌شود.
      </p>
      <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto" aria-label="روزهای انتخاب‌شده">
        {dates.map((date) => (
          <li key={date} className="rounded-lg bg-slate-100 px-2 py-1 text-xs tabular-nums text-slate-700">
            {jalaliLabel(date)}
          </li>
        ))}
      </ul>
      <Input textarea label="یادداشت (اختیاری)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
    </FormModal>
  );
}
