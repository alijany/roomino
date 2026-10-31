'use client';

import { FormModal } from '@/app/dashboard/attendance/attendance.component.layout';
import { Button, CurrencyInput, Input, ToggleSwitch } from '@/ui/atoms';
import { PickableUser, UserPicker } from '@/components/users/users.component.user-picker';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { usePayrollYear } from '../payroll-settings/payroll-settings.api';
import { useRecordSalaryChange, useSalaryOverview, useUpdateSalaryProposal } from './salary-history.api';
import { PeriodPicker } from '../financial.component.period-picker';
import { SalaryChange } from './salary-history.types';
import { applyPercent, currentPeriod, percentLabel, periodLabel, rial, toLatinNumber, yearOf } from '../financial.util';

/**
 * One person's new salary from a month on. Type the new salary or the percent
 * and the other follows, as in the sheet; what is sent is the salary.
 */
export function ChangeForm({
  editing,
  onClose,
  onSaved,
}: {
  /** An open proposal to edit; the person is fixed. */
  editing?: SalaryChange;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [period, setPeriod] = useState(editing?.period ?? currentPeriod());
  const [picked, setPicked] = useState<PickableUser | null>(editing?.user ?? null);
  const [propose, setPropose] = useState(Boolean(editing));
  const [salary, setSalary] = useState(0);
  const [percent, setPercent] = useState('');
  const [note, setNote] = useState(editing?.note ?? '');
  const overview = useSalaryOverview(period);
  const record = useRecordSalaryChange();
  const update = useUpdateSalaryProposal();

  // The legal minimum monthly wage of the chosen month's year, from the payroll settings.
  const settings = usePayrollYear(yearOf(period));
  const minimum = settings.data?.items.find((i) => i.key === 'minMonthly')?.value ?? null;

  // What the person earns in the chosen month, from the overview.
  const row = overview.data?.items.find((r) => r.user.id === picked?.id) ?? null;
  const current = row?.salary ?? null;

  // A person or month changes what the salary is now; start from it (or the proposal being edited).
  useEffect(() => {
    const start = editing?.salary ?? current ?? 0;
    setSalary(start);
    // An edited proposal already differs from the current salary; show by how much.
    setPercent(current && start && start !== current ? String(Math.round(((start - current) / current) * 10_000) / 100) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.id, current]);

  const onPercent = (raw: string) => {
    const value = toLatinNumber(raw);
    setPercent(value);
    const p = Number(value);
    if (current && value !== '' && value !== '-' && Number.isFinite(p)) setSalary(applyPercent(current, p));
  };
  /** The «حقوق پایه» choice: the year's minimum monthly wage, as the settings have it. */
  const chooseBaseSalary = () => {
    if (minimum === null) return;
    onSalary(minimum);
    if (!note.trim()) setNote(`حقوق پایه (حداقل مزد ${yearOf(period).toLocaleString('fa-IR', { useGrouping: false })})`);
  };
  const onSalary = (value: number) => {
    setSalary(value);
    setPercent(current && value ? String(Math.round(((value - current) / current) * 10_000) / 100) : '');
  };

  const stale = row?.since != null && row.since >= period;
  const ready = Boolean(row) && salary > 0 && salary !== current && !stale;

  const handleSave = async () => {
    if (!row) return;
    try {
      if (editing) {
        await update.submit({ id: editing.id, data: { period, salary, note: note.trim() } });
        toast.success('پیشنهاد ویرایش شد');
      } else {
        await record.submit({ userId: row.user.id, period, salary, propose: propose || undefined, note: note.trim() || undefined });
        toast.success(propose ? 'پیشنهاد ثبت شد' : 'تغییر حقوق ثبت شد');
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error((error as Error)?.message ?? 'ثبت انجام نشد');
    }
  };

  const pick = (user: PickableUser | null) => {
    setPicked(user);
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      wide
      title={editing ? 'ویرایش پیشنهاد حقوق' : 'ثبت تغییر حقوق'}
      footer={
        <>
          <Button className="flex-1" disabled={!ready || record.isLoading || update.isLoading} onClick={handleSave}>
            {record.isLoading || update.isLoading ? 'در حال ثبت...' : editing ? 'ذخیره' : propose ? 'ثبت پیشنهاد' : 'ثبت'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <PeriodPicker label="از ماه" value={period} onChange={setPeriod} />

      <UserPicker label="کاربر" value={picked} onChange={pick} disabled={Boolean(editing)} />

      {row && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3">
          <p className="text-sm text-slate-600">
            حقوق {row.user.name ?? 'این نفر'} در {periodLabel(period)}: <strong>{current ? rial(current) : 'ثبت نشده'}</strong>
            {row.since ? ` (از ${periodLabel(row.since)})` : ''}
          </p>
          {stale && <p className="text-sm text-rose-600">آخرین تغییر در {periodLabel(row.since)} است؛ ماه بعد از آن را انتخاب کنید.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <CurrencyInput label="حقوق جدید" unit="rial" value={salary} onValueChange={(v) => onSalary(v ?? 0)} />
            <Input
              label={current ? 'درصد تغییر (٪)' : 'درصد تغییر (پس از ثبت اولین حقوق)'}
              dir="ltr"
              className="text-left"
              inputMode="decimal"
              disabled={!current}
              value={percent}
              onChange={(e) => onPercent(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={minimum === null}
              onClick={chooseBaseSalary}
            >
              حقوق پایه (حداقل مزد {yearOf(period).toLocaleString('fa-IR', { useGrouping: false })})
            </Button>
            <span className="text-xs text-slate-500">
              {minimum === null
                ? 'تنظیمات این سال در «تنظیمات حقوق و دستمزد» نیست'
                : `${rial(minimum)} ریال از تنظیمات${settings.data && !settings.data.exists ? ' (مقدار رسمی؛ هنوز ذخیره نشده)' : ''}`}
            </span>
          </div>
          {current && salary > 0 && salary !== current && (
            <p className="text-xs text-slate-500">
              {rial(current)} ← {rial(salary)} ({percentLabel(Math.round(((salary - current) / current) * 10_000) / 100)})
            </p>
          )}
        </div>
      )}

      <Input label="توضیحات (اختیاری)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />

      {!editing && (
        <div className="rounded-xl bg-sky-50 p-3">
          <div dir="rtl" className="flex items-center gap-3">
          <ToggleSwitch
            size="sm"
            aria-label="ثبت به‌صورت پیشنهادی"
            checked={propose}
            onChange={setPropose}
          />
          <span className="text-sm font-medium text-slate-700">ثبت به‌صورت پیشنهادی (هنوز قطعی نیست)</span>
        </div>
          <p className="mt-1.5 text-xs text-slate-500">
            پیشنهاد در هیچ حقوقی اثر نمی‌گذارد و تا قطعی‌شدن آزادانه ویرایش یا حذف می‌شود.
          </p>
        </div>
      )}
    </FormModal>
  );
}
