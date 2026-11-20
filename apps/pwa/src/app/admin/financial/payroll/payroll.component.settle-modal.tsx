'use client';

import { FormModal } from '@/app/dashboard/attendance/attendance.component.layout';
import { fromCivilDate, tehranToday, toCivilDate } from '@/app/dashboard/attendance/attendance.util';
import { Button } from '@/ui/atoms';
import { DatePickerField } from '@/ui/molecules';
import { useState } from 'react';
import { SettleKind } from './payroll.types';

const KIND_LABEL: Record<SettleKind, string> = { both: 'حقوق و اضافات', salary: 'فقط حقوق', extras: 'فقط اضافات' };

/**
 * Asks the day a salary / extras transfer was paid (today by default). With
 * `kinds` the finance person also chooses what is being settled.
 */
export function SettleModal({
  title,
  message,
  kinds,
  initialKind,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  kinds?: SettleKind[];
  initialKind: SettleKind;
  busy: boolean;
  onConfirm: (kind: SettleKind, date: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(tehranToday());
  const [kind, setKind] = useState<SettleKind>(initialKind);

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button className="flex-1" disabled={busy} onClick={() => onConfirm(kind, date)}>
            {busy ? 'در حال ثبت...' : 'تسویه شد'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <p className="rounded-xl bg-emerald-50 p-3 text-sm leading-7 text-emerald-800">{message}</p>
      {kinds && (
        <div className="flex gap-2">
          {kinds.map((k) => (
            <Button key={k} variant={kind === k ? 'primary' : 'outline'} size="sm" className="flex-1" onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </Button>
          ))}
        </div>
      )}
      <div>
        <div className="mb-1.5 text-sm font-medium text-slate-700">تاریخ تسویه</div>
        <DatePickerField
          hideLabel
          className="w-full justify-start gap-2 !px-3"
          label="تاریخ تسویه"
          value={fromCivilDate(date)}
          onSelect={(d) => setDate(toCivilDate(d))}
          minSelectableDate={new Date('2000-01-01')}
        />
      </div>
    </FormModal>
  );
}
