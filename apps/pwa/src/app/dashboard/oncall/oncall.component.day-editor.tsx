'use client';

import { Button, Dropdown } from '@/ui/atoms';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { FormModal } from '../attendance/attendance.component.layout';
import { UserBrief } from '../attendance/attendance.types';
import { errorMessage, jalaliLabel } from '../attendance/attendance.util';
import { saveOnCallDay } from './oncall.api';
import { ClockSelect } from './oncall.component.clock-select';
import { OnCallDay, OnCallEntryInput } from './oncall.types';
import { DAY_TYPE_LABELS, clockMinutes, minutesLabel } from './oncall.util';

/** One day: who is on call and for which hours; several people may share it. */
export function OnCallDayEditor({
  day,
  eligible,
  onClose,
  onSaved,
}: {
  day: OnCallDay;
  eligible: UserBrief[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<OnCallEntryInput[]>(
    day.entries.map((e) => ({ userId: e.user.id, start: e.start, end: e.end })),
  );
  const [saving, setSaving] = useState(false);

  const update = (index: number, change: Partial<OnCallEntryInput>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...change } : row)));

  const invalid = rows.some((r) => !r.userId || clockMinutes(r.start) >= clockMinutes(r.end));
  const overlaps = rows.some((a, i) =>
    rows.some((b, j) => j > i && a.start < b.end && b.start < a.end),
  );
  const total = rows.reduce((sum, r) => sum + Math.max(0, clockMinutes(r.end) - clockMinutes(r.start)), 0);

  const addRow = () => {
    const slot = day.defaultSlots[0] ?? { start: '17:30', end: '23:00' };
    const free = eligible.find((p) => !rows.some((r) => r.userId === p.id));
    if (free) setRows((prev) => [...prev, { userId: free.id, ...slot }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveOnCallDay(day.date, rows);
      toast.success('کشیک این روز ذخیره شد');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'ذخیره انجام نشد'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title={`کشیک ${jalaliLabel(day.date)} — ${day.holidayTitle ?? DAY_TYPE_LABELS[day.type]}`}
      footer={
        <>
          <Button className="flex-1" disabled={saving || invalid} onClick={handleSave}>
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      {rows.length === 0 && <p className="text-sm text-slate-400">هنوز کسی برای این روز انتخاب نشده است.</p>}
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2">
            <div className="min-w-0 flex-1 basis-36">
              <Dropdown
                variant="outline"
                items={eligible.map((p) => ({
                  label: p.name ?? '',
                  value: p.id,
                  disabled: rows.some((r, i) => i !== index && r.userId === p.id),
                }))}
                value={row.userId}
                onChange={(value) => {
                  if (value) update(index, { userId: value });
                }}
              />
            </div>
            <span className="text-xs text-slate-400">از</span>
            <ClockSelect value={row.start} onChange={(start) => update(index, { start })} />
            <span className="text-xs text-slate-400">تا</span>
            <ClockSelect value={row.end} onChange={(end) => update(index, { end })} />
            <Button
              variant="outline"
              size="sm"
              className="!px-2 border-none text-rose-500"
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              aria-label="حذف"
            >
              <IconTrash className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" size="sm" className="gap-1" disabled={rows.length >= eligible.length} onClick={addRow}>
          <IconPlus className="size-4" />
          افزودن نفر
        </Button>
        <span className="text-xs text-slate-500">جمع این روز: {minutesLabel(total)} ساعت</span>
      </div>
      {overlaps && (
        <p className="rounded-xl bg-amber-50 p-2.5 text-xs leading-6 text-amber-700">
          ساعت دو نفر همپوشانی دارد. اگر عمدی است ادامه دهید.
        </p>
      )}
      {rows.some((r) => clockMinutes(r.start) >= clockMinutes(r.end)) && (
        <p className="text-xs text-rose-600">ساعت شروع باید پیش از ساعت پایان باشد.</p>
      )}
      {day.defaultSlots.length > 0 && (
        <button
          type="button"
          className="text-xs text-brand-600 hover:underline"
          onClick={() => setRows((prev) => (prev[0] ? day.defaultSlots.map((slot) => ({ userId: prev[0].userId, ...slot })) : prev))}
        >
          برگرداندن به ساعت پیش‌فرض این روز
        </button>
      )}
    </FormModal>
  );
}
