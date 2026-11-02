'use client';

import { Button, CurrencyInput, Dropdown, ToggleSwitch } from '@/ui/atoms';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useSaveSupplementary, useSetSupplementaryEnabled } from './payroll-settings.api';
import { SupplementaryPolicy } from './payroll-settings.types';

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const START_ITEMS = MONTHS.map((label, i) => ({ value: i + 1, label }));
const END_ITEMS = [{ value: 0, label: 'تا پایان سال' }, ...START_ITEMS];

/**
 * The year's supplementary-insurance policy: from which month to which, and
 * the monthly premium. Who takes it is set on each person's page; the whole
 * premium comes off the take-home in each month of the range.
 */
export function SupplementaryPanel({
  year,
  policy,
  enabled,
  readOnly,
  onSaved,
  onToggled,
}: {
  year: number;
  policy: SupplementaryPolicy;
  /** The switch for the whole insurance; the fields below and on the person's page show only while it is on. */
  enabled: boolean;
  readOnly?: boolean;
  onSaved: () => void;
  onToggled: () => void;
}) {
  const save = useSaveSupplementary();
  const toggle = useSetSupplementaryEnabled();
  const [start, setStart] = useState<number>(policy.startMonth ?? 1);
  const [end, setEnd] = useState<number>(policy.endMonth ?? 0);
  const [amount, setAmount] = useState<number>(policy.amount);

  const unchanged = start === (policy.startMonth ?? 1) && end === (policy.endMonth ?? 0) && amount === policy.amount;
  const invalid = end !== 0 && end < start;

  const handleSave = async () => {
    try {
      await save.submit({ year, data: { startMonth: start, endMonth: end === 0 ? null : end, amount } });
      toast.success('بیمه تکمیلی ذخیره شد');
      onSaved();
    } catch (error) {
      toast.error((error as Error)?.message ?? 'ذخیره انجام نشد');
    }
  };

  const handleToggle = async (on: boolean) => {
    try {
      await toggle.submit(on);
      toast.success(on ? 'بیمه تکمیلی فعال شد' : 'بیمه تکمیلی غیرفعال شد');
      onToggled();
    } catch (error) {
      toast.error((error as Error)?.message ?? 'ذخیره انجام نشد');
    }
  };

  return (
    <section className="ui-surface space-y-4 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-700">بیمه تکمیلی</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-400">
            با روشن‌بودن، فیلدهای آن در صفحه‌ی کاربر نمایان می‌شود و مبلغ هر ماهِ بازه‌ی زیر از خالص دریافتی کسانی که فعال شده‌اند کم می‌شود. با خاموش‌کردن، از ماه‌های قطعی‌نشده کسر برداشته می‌شود. این کلید برای همه‌ی سال‌هاست.
          </p>
        </div>
        <ToggleSwitch aria-label="بیمه تکمیلی" checked={enabled} disabled={readOnly || toggle.isLoading} onChange={(on) => void handleToggle(on)} />
      </div>
      {enabled && (
      <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-slate-700">از ماه</div>
          <Dropdown items={START_ITEMS} value={start} onChange={(v) => {
              if (v) setStart(Number(v));
            }} variant="outline" disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-slate-700">تا ماه</div>
          <Dropdown items={END_ITEMS} value={end} onChange={(v) => setEnd(Number(v ?? 0))} variant="outline" disabled={readOnly} />
        </div>
        <CurrencyInput label="مبلغ ماهانه (ریال)" unit="rial" value={amount} disabled={readOnly} onValueChange={(v) => setAmount(v ?? 0)} />
      </div>
      {invalid && <p className="text-xs text-rose-600">ماه پایان نمی‌تواند قبل از ماه شروع باشد.</p>}
      {!readOnly && (
        <div className="flex justify-end">
          <Button disabled={save.isLoading || unchanged || invalid} onClick={handleSave}>
            {save.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
        </div>
      )}
      </>
      )}
    </section>
  );
}
