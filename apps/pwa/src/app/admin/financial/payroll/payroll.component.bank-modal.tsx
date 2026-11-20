'use client';

import { FormModal } from '@/app/dashboard/attendance/attendance.component.layout';
import { Button } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, Table } from '@/ui/molecules';
import { IconCheck, IconDownload } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CopyAmount, CopyText } from '../financial.component.copy-amount';
import { downloadFile, periodLabel, rial } from '../financial.util';
import { useBankMonth, useSettlePayrollLine, useUnsettlePayrollLine } from './payroll.api';
import { SettleModal } from './payroll.component.settle-modal';
import { jalaliLabel } from '@/app/dashboard/attendance/attendance.util';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { BankRow } from './payroll.types';

/**
 * The month's bank transfers: one row for each person's salary and, where
 * there are extras, one for those, with the sheba, the amount and the
 * description to type into the bank — and the same as an Excel file.
 */
export function BankModal({ period, onClose, onChanged }: { period: number; onClose: () => void; onChanged?: () => void }) {
  const { data, error, isLoading, refresh } = useBankMonth(period);
  const settle = useSettlePayrollLine();
  const unsettle = useUnsettlePayrollLine();
  const [settling, setSettling] = useState<BankRow | null>(null);
  const [unsettling, setUnsettling] = useState<BankRow | null>(null);
  const changed = () => {
    refresh();
    onChanged?.();
  };
  const [downloading, setDownloading] = useState(false);
  /** Which transfers to show: all, only salaries, or only extras. */
  const [kind, setKind] = useState<'all' | BankRow['kind']>('all');
  /** Rows the operator turned off; everything is on to begin with. */
  const [off, setOff] = useState<Set<string>>(new Set());

  const keyOf = (r: BankRow) => `${r.lineId}:${r.kind}`;
  const shown = useMemo(() => (data?.rows ?? []).filter((r) => kind === 'all' || r.kind === kind), [data, kind]);
  const chosen = useMemo(() => shown.filter((r) => !off.has(keyOf(r))), [shown, off]);
  const allChosen = shown.length > 0 && chosen.length === shown.length;

  const toggle = (r: BankRow) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(keyOf(r))) next.delete(keyOf(r));
      else next.add(keyOf(r));
      return next;
    });
  const toggleAll = () =>
    setOff((prev) => {
      const next = new Set(prev);
      shown.forEach((r) => (allChosen ? next.add(keyOf(r)) : next.delete(keyOf(r))));
      return next;
    });

  const sum = (rows: BankRow[], k?: BankRow['kind']) => rows.filter((r) => !k || r.kind === k).reduce((t, r) => t + r.amount, 0);
  const lines = (rows: BankRow[]) => new Set(rows.map((r) => r.lineId));
  const missingSheba = lines(chosen.filter((r) => !r.sheba)).size;
  const drafts = lines(chosen.filter((r) => r.status === 'draft')).size;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Every row chosen is the whole file; otherwise only what is ticked.
      const query = chosen.length === (data?.rows.length ?? 0) ? '' : `?rows=${chosen.map(keyOf).join(',')}`;
      await downloadFile(`/admin/finance/payroll/${period}/bank/xlsx${query}`, `payroll-${period}-bank.xlsx`);
    } catch (e) {
      toast.error((e as Error)?.message ?? 'دریافت فایل ناموفق بود');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      xl
      title={`خروجی بانک — ${periodLabel(period)}`}
      footer={
        <>
          <Button className="flex-1 gap-1" disabled={!chosen.length || downloading} onClick={handleDownload}>
            <IconDownload className="size-4" />
            {downloading ? 'در حال ساخت فایل...' : `دریافت فایل Excel (${chosen.length.toLocaleString('fa-IR')} ردیف)`}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            بستن
          </Button>
        </>
      }
    >
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => !d?.rows.length}
        emptyMessage="برای این ماه ردیفی نیست."
        onRetry={refresh}
      >
        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Tile label="تعداد تراکنش" value={chosen.length.toLocaleString('fa-IR')} />
              <Tile label="جمع حقوق" value={rial(sum(chosen, 'salary'))} unit />
              <Tile label="جمع اضافات" value={rial(sum(chosen, 'extras'))} unit />
              <Tile label="جمع کل" value={rial(sum(chosen))} unit strong />
            </div>

            {(missingSheba > 0 || drafts > 0) && (
              <ul className="space-y-2 text-sm">
                {missingSheba > 0 && (
                  <li className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700">
                    {missingSheba.toLocaleString('fa-IR')} نفر شماره شبا ندارند؛ ردیفشان با شبای خالی آمده است. شبا را در صفحه‌ی کاربر ثبت کنید.
                  </li>
                )}
                {drafts > 0 && (
                  <li className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                    {drafts.toLocaleString('fa-IR')} ردیف هنوز قطعی نشده است؛ شرح آن‌ها «(پیش‌نویس)» دارد و ممکن است مبلغ تغییر کند.
                  </li>
                )}
              </ul>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-sm" role="group" aria-label="نوع تراکنش">
                {([
                  ['all', 'همه'],
                  ['salary', 'فقط حقوق'],
                  ['extras', 'فقط اضافات'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={kind === value}
                    onClick={() => setKind(value)}
                    className={`rounded-lg px-3 py-1.5 ${kind === value ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                {chosen.length.toLocaleString('fa-IR')} از {shown.length.toLocaleString('fa-IR')} ردیف انتخاب شده
              </span>
            </div>

            <Table
              rows={shown}
              rowKey={keyOf}
              columns={[
                {
                  key: 'select',
                  header: (
                    <input
                      type="checkbox"
                      className="size-4"
                      aria-label="انتخاب همه"
                      checked={allChosen}
                      onChange={toggleAll}
                    />
                  ),
                  render: (r) => (
                    <input
                      type="checkbox"
                      className="size-4"
                      aria-label={`انتخاب ${r.name ?? ''}`}
                      checked={!off.has(keyOf(r))}
                      onChange={() => toggle(r)}
                    />
                  ),
                },
                { key: 'no', header: 'ردیف', numeric: true, hideOnMobile: true, render: (r) => r.no.toLocaleString('fa-IR') },
                { key: 'name', header: 'نام', render: (r) => r.name ?? '—' },
                {
                  key: 'sheba',
                  header: 'شماره شبا',
                  render: (r) =>
                    r.sheba ? <CopyText value={r.sheba} /> : <Badge tone="danger">ندارد</Badge>,
                },
                {
                  key: 'amount',
                  header: (
                    <>
                      مبلغ <span className="text-[10px] font-normal text-slate-400">(ریال)</span>
                    </>
                  ),
                  numeric: true,
                  render: (r) => <strong><CopyAmount value={r.amount} /></strong>,
                },
                { key: 'description', header: 'شرح', render: (r) => r.description },
                {
                  key: 'paid',
                  header: 'تسویه',
                  render: (r) =>
                    r.status !== 'final' ? (
                      <span className="text-xs text-slate-400">بعد از قطعی شدن</span>
                    ) : r.paidOn ? (
                      <button
                        type="button"
                        title="لغو تسویه"
                        onClick={() => setUnsettling(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                      >
                        <IconCheck className="size-3" />
                        {jalaliLabel(r.paidOn)}
                      </button>
                    ) : (
                      <Button size="sm" variant="outline" className="!px-2 text-xs" onClick={() => setSettling(r)}>
                        تسویه شد
                      </Button>
                    ),
                },
                {
                  key: 'kind',
                  header: 'نوع',
                  hideOnMobile: true,
                  render: (r) => <Badge tone={r.kind === 'extras' ? 'info' : 'neutral'}>{r.kind === 'extras' ? 'اضافات' : 'حقوق'}</Badge>,
                },
              ]}
            />
          </div>
        )}
      </DataView>
      {settling && (
        <SettleModal
          title={`تسویه‌ی ${settling.name ?? ''}`}
          message={`${settling.description} — ${rial(settling.amount)} ریال`}
          initialKind={settling.kind}
          busy={settle.isLoading}
          onClose={() => setSettling(null)}
          onConfirm={(kind, date) =>
            settle
              .submit({ id: settling.lineId, kind, date })
              .then(() => {
                toast.success('تسویه ثبت شد');
                setSettling(null);
                changed();
              })
              .catch((e: Error) => toast.error(e?.message ?? 'تسویه انجام نشد'))
          }
        />
      )}
      <ConfirmModal
        isOpen={!!unsettling}
        onClose={() => setUnsettling(null)}
        onConfirm={() =>
          unsettling &&
          unsettle
            .submit({ id: unsettling.lineId, kind: unsettling.kind })
            .then(() => {
              toast.success('تسویه لغو شد');
              changed();
            })
            .catch((e: Error) => toast.error(e?.message ?? 'لغو تسویه انجام نشد'))
            .finally(() => setUnsettling(null))
        }
        title="لغو تسویه"
        message="علامت تسویه‌ی این پرداخت برداشته می‌شود. ادامه می‌دهید؟"
        confirmButtonText="لغو تسویه"
        isLoading={unsettle.isLoading}
      />
    </FormModal>
  );
}

function Tile({ label, value, unit, strong }: { label: string; value: string; unit?: boolean; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-2.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 tabular-nums ${strong ? 'text-base font-bold text-slate-900' : 'text-base font-semibold text-slate-700'}`}>
        {value} {unit && <span className="text-[10px] font-normal text-slate-400">ریال</span>}
      </div>
    </div>
  );
}
