import { formatMoney } from '@/libs/format/format.util';
import { Badge, Button, CurrencyInput, Input } from '@/ui/atoms';
import { DatePickerField } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { fromCivilDate, tehranToday, toCivilDate } from '../attendance/attendance.util';
import { periodLabel } from '../admin/financial/financial.util';
import { useRemoveSettlement, useSettleAdvance } from './advance-request.api';
import { AdvanceSettlement, AdvanceSettlementPiece } from './advance-request.types';
import { formatJalali } from './advance-request.util';

const META = {
  unsettled: { label: 'تسویه نشده', tone: 'neutral' },
  partial: { label: 'بخشی تسویه شده', tone: 'warning' },
  settled: { label: 'تسویه شده', tone: 'success' },
} as const;

/** Where an approved advance stands against the pay it is taken off. */
export function SettlementBadge({ settlement }: { settlement?: AdvanceSettlement | null }) {
  if (!settlement) return <span className="text-slate-400">—</span>;
  const meta = META[settlement.status];
  return (
    <Badge tone={meta.tone} className="whitespace-nowrap">
      {meta.label}
    </Badge>
  );
}

/** Finance records money paid back by hand: how much, the day, and a note. */
function SettleForm({ requestId, remaining, onChanged }: { requestId: number; remaining: number; onChanged: () => void }) {
  const settle = useSettleAdvance();
  const [amount, setAmount] = useState(remaining);
  const [paidOn, setPaidOn] = useState(tehranToday());
  const [note, setNote] = useState('');
  const valid = amount > 0 && amount <= remaining;

  const handleSave = async () => {
    try {
      await settle.submit({ id: requestId, data: { amount, paidOn, note: note.trim() || undefined } });
      toast.success('تسویه ثبت شد');
      setNote('');
      onChanged();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'ثبت تسویه انجام نشد');
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-3">
      <div className="text-sm font-semibold text-slate-700">ثبت تسویه (پرداخت خارج از حقوق)</div>
      <div className="grid items-end gap-3 sm:grid-cols-2">
        <CurrencyInput label="مبلغ تسویه" unit="rial" value={amount} onValueChange={(v) => setAmount(v ?? 0)} />
        <DatePickerField
          label="تاریخ تسویه"
          className="w-full justify-start gap-2 !h-11 lg:!h-10"
          value={fromCivilDate(paidOn)}
          onSelect={(d) => setPaidOn(toCivilDate(d))}
        />
      </div>
      <Input label="توضیح (اختیاری)" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} />
      {amount > remaining && <p className="text-xs text-rose-500">بیشتر از مانده‌ی مساعده است.</p>}
      <Button size="sm" disabled={!valid || settle.isLoading} onClick={handleSave}>
        {settle.isLoading ? 'در حال ثبت...' : 'ثبت تسویه'}
      </Button>
    </div>
  );
}

/**
 * The settlement in full: status, what is left, the date it closed, every
 * piece (off a pay month, or by hand) and, for finance, a way to settle more.
 */
export function SettlementDetails({
  settlement,
  requestId,
  canSettle,
  onChanged,
}: {
  settlement?: AdvanceSettlement | null;
  requestId: number;
  canSettle: boolean;
  onChanged: () => void;
}) {
  const remove = useRemoveSettlement();
  const [removing, setRemoving] = useState<AdvanceSettlementPiece | null>(null);
  if (!settlement) return null;

  const handleRemove = async () => {
    if (!removing) return;
    try {
      await remove.submit({ id: requestId, settlementId: removing.id });
      toast.success('تسویه حذف شد');
      onChanged();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'حذف انجام نشد');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-700">تسویه</h4>
        <SettlementBadge settlement={settlement} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-400">تسویه شده تا الان</dt>
          <dd className="font-semibold text-slate-800">{formatMoney(settlement.deducted)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">مانده</dt>
          <dd className="font-semibold text-slate-800">{formatMoney(settlement.remaining)}</dd>
        </div>
        {settlement.settledAt && (
          <div className="col-span-2">
            <dt className="text-xs text-slate-400">تاریخ تسویه کامل</dt>
            <dd className="font-semibold text-slate-800">{formatJalali(settlement.settledAt)}</dd>
          </div>
        )}
      </dl>
      {settlement.deductions.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">
          {settlement.deductions.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 text-slate-600">
                {d.kind === 'payroll' && d.period ? `کسر از حقوق ${periodLabel(d.period)}` : 'تسویه دستی'}
                {d.note ? <span className="text-xs text-slate-400"> · {d.note}</span> : null}
                {d.recordedBy ? <span className="text-xs text-slate-400"> · {d.recordedBy}</span> : null}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{formatJalali(d.at)}</span>
                <strong className="tabular-nums text-slate-800">{formatMoney(d.amount)}</strong>
                {canSettle && d.kind === 'manual' && (
                  <button
                    type="button"
                    aria-label="حذف تسویه"
                    disabled={remove.isLoading}
                    className="text-rose-500"
                    onClick={() => setRemoving(d)}
                  >
                    <IconTrash className="size-4" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">هنوز تسویه‌ای ثبت نشده است.</p>
      )}
      {canSettle && settlement.remaining > 0 && (
        <SettleForm requestId={requestId} remaining={settlement.remaining} onChanged={onChanged} />
      )}
      <ConfirmModal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        title="حذف تسویه"
        message={`تسویه‌ی ${formatMoney(removing?.amount ?? 0)} حذف شود؟ مبلغ دوباره جزو مانده‌ی مساعده می‌شود.`}
        confirmButtonText="حذف"
        cancelButtonText="بازگشت"
        isLoading={remove.isLoading}
      />
    </section>
  );
}
