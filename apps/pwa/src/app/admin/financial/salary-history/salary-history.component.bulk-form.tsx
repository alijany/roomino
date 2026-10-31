'use client';

import { FormModal } from '@/app/dashboard/attendance/attendance.component.layout';
import { Button, Dropdown, Input, ToggleSwitch } from '@/ui/atoms';
import { PersonLabel } from '@/ui/molecules';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useBulkSalaryRaise, useSalaryOverview } from './salary-history.api';
import { PeriodPicker } from '../financial.component.period-picker';
import { applyPercent, currentPeriod, periodLabel, rial, toLatinNumber } from '../financial.util';

const ROUNDING = [
  { value: 1, label: 'بدون گرد کردن' },
  { value: 10_000, label: 'به ۱۰,۰۰۰ ریال' },
  { value: 100_000, label: 'به ۱۰۰,۰۰۰ ریال' },
  { value: 1_000_000, label: 'به ۱,۰۰۰,۰۰۰ ریال' },
];

/** The same percent for several people at once; shows what each will earn before anything is saved. */
export function BulkForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [period, setPeriod] = useState(currentPeriod());
  const [percent, setPercent] = useState('10');
  const [roundTo, setRoundTo] = useState(10_000);
  const [note, setNote] = useState('');
  const [propose, setPropose] = useState(false);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const overview = useSalaryOverview(period);
  const raise = useBulkSalaryRaise();

  // Only people with a salary that was last changed before the chosen month can get a raise.
  const rows = (overview.data?.items ?? []).filter((r) => r.salary !== null && !r.endDate);
  const canRaise = (r: (typeof rows)[number]) =>
    (r.since ?? 0) < period && !(r.proposal && (propose || r.proposal.period === period));
  const eligible = rows.filter(canRaise);
  const p = Number(percent);
  const valid = Number.isFinite(p) && p > 0;

  // A different month changes who is eligible.
  useEffect(() => {
    setChosen((prev) => new Set([...prev].filter((id) => eligible.some((r) => r.user.id === id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview.data, propose]);

  const toggle = (id: number) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allChosen = eligible.length > 0 && eligible.every((r) => chosen.has(r.user.id));

  const handleSave = async () => {
    try {
      const result = await raise.submit({
        userIds: [...chosen],
        period,
        percent: p,
        roundTo,
        propose: propose || undefined,
        note: note.trim() || undefined,
      });
      toast.success(`${propose ? 'پیشنهاد افزایش' : 'افزایش حقوق'} ${result.created.toLocaleString('fa-IR')} نفر ثبت شد`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error((error as Error)?.message ?? 'افزایش گروهی انجام نشد');
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      wide
      title="افزایش گروهی حقوق"
      footer={
        <>
          <Button className="flex-1" disabled={!valid || !chosen.size || raise.isLoading} onClick={handleSave}>
            {raise.isLoading ? 'در حال ثبت...' : chosen.size ? `${propose ? 'ثبت پیشنهاد' : 'ثبت'} برای ${chosen.size.toLocaleString('fa-IR')} نفر` : 'ثبت'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <PeriodPicker label="از ماه" value={period} onChange={setPeriod} />
        <Input
          label="درصد افزایش (٪)"
          dir="ltr"
          className="text-left"
          inputMode="decimal"
          value={percent}
          onChange={(e) => setPercent(toLatinNumber(e.target.value))}
        />
      </div>
      <div className="space-y-1.5">
        <div className="text-sm font-medium text-slate-700">گرد کردن حقوق جدید</div>
        <Dropdown
          items={ROUNDING}
          value={roundTo}
          onChange={(v) => {
            if (v) setRoundTo(Number(v));
          }}
          variant="outline"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">افراد ({eligible.length.toLocaleString('fa-IR')} نفر مشمول)</div>
          <button
            type="button"
            className="text-xs text-sky-600"
            onClick={() => setChosen(allChosen ? new Set() : new Set(eligible.map((r) => r.user.id)))}
          >
            {allChosen ? 'برداشتن همه' : 'انتخاب همه'}
          </button>
        </div>
        <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {rows.map((r) => {
            const can = canRaise(r);
            return (
              <label key={r.user.id} className={`flex items-center gap-3 px-3 py-2 ${can ? 'cursor-pointer' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  className="size-4"
                  disabled={!can}
                  checked={chosen.has(r.user.id)}
                  onChange={() => toggle(r.user.id)}
                />
                <div className="min-w-0 grow">
                  <PersonLabel name={r.user.name} picture={r.user.profilePicture} detail={r.user.personnelCode ?? undefined} />
                </div>
                <div className="shrink-0 text-end text-xs tabular-nums">
                  {can ? (
                    <>
                      <span className="text-slate-400">{rial(r.salary)}</span>
                      {valid && <div className="font-semibold text-emerald-600">{rial(applyPercent(r.salary as number, p, roundTo))}</div>}
                    </>
                  ) : (
                    <span className="text-slate-400">{r.proposal && (r.since ?? 0) < period ? 'پیشنهاد باز دارد' : `آخرین تغییر ${periodLabel(r.since)}`}</span>
                  )}
                </div>
              </label>
            );
          })}
          {overview.data && !rows.length && <p className="p-4 text-center text-sm text-slate-400">هنوز حقوقی برای کسی ثبت نشده است.</p>}
        </div>
      </div>

      <Input label="توضیحات (اختیاری)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />

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
          پیشنهادها در هیچ حقوقی اثر نمی‌گذارند؛ بعد از توافق از صفحه‌ی تاریخچه قطعی می‌شوند.
        </p>
      </div>
    </FormModal>
  );
}
