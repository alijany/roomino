'use client';

import { Button, CurrencyInput, Input } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { IconChevronDown } from '@tabler/icons-react';
import { jalaliLabel } from '@/app/dashboard/attendance/attendance.util';
import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { toast } from 'react-toastify';
import { CopyAmount, CopyText } from '../financial.component.copy-amount';
import { useApplyAdvance, useLineAdvances, useUnapplyAdvance } from './payroll.api';
import { periodLabel, rial, toLatinNumber } from '../financial.util';
import { AdvanceItem, Payslip, UpdatePayrollLineDto } from './payroll.types';

/** The inputs of a line as the form holds them: hours and days as typed text. */
export interface LineFormState {
  days: string;
  missionDays: string;
  nightHours: string;
  holidayHours: string;
  deficitHours: string;
  leaveRemainDays: string;
  overtimeHours: string;
  bonus: number;
  advance: number;
  loan: number;
  otherDeductions: number;
  payEidi: boolean;
  settle: boolean;
  note: string;
}

export const formOf = (l: Payslip): LineFormState => ({
  days: String(l.days),
  missionDays: String(l.missionDays),
  nightHours: String(l.nightHours),
  holidayHours: String(l.holidayHours),
  deficitHours: String(l.deficitHours),
  leaveRemainDays: String(l.leaveRemainDays),
  overtimeHours: String(l.overtimeHours),
  bonus: l.bonus,
  advance: l.advance,
  loan: l.loan,
  otherDeductions: l.otherDeductions,
  payEidi: l.payEidi,
  settle: l.settle,
  note: l.note ?? '',
});

export const dataOf = (f: LineFormState): UpdatePayrollLineDto => ({
  days: Number(f.days) || 0,
  missionDays: Number(f.missionDays) || 0,
  nightHours: Number(f.nightHours) || 0,
  holidayHours: Number(f.holidayHours) || 0,
  deficitHours: Number(f.deficitHours) || 0,
  leaveRemainDays: Number(f.leaveRemainDays) || 0,
  overtimeHours: Number(f.overtimeHours) || 0,
  bonus: f.bonus,
  advance: f.advance,
  loan: f.loan,
  otherDeductions: f.otherDeductions,
  payEidi: f.payEidi,
  settle: f.settle,
  note: f.note.trim(),
});

/** Whether any of the rarely changed inputs differs from its everyday value. */
export const hasUncommonInputs = (f: LineFormState) =>
  Number(f.days) !== 30 ||
  [f.missionDays, f.nightHours, f.holidayHours, f.deficitHours, f.leaveRemainDays].some((v) => Number(v) !== 0) ||
  f.otherDeductions !== 0 ||
  f.payEidi ||
  f.settle ||
  f.note.trim() !== '';

type Setter = <K extends keyof LineFormState>(key: K, value: LineFormState[K]) => void;

function Card({ title, hint, children, action, className = '' }: { className?: string; title?: string; hint?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={`ui-surface space-y-4 p-4 lg:p-5 ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A number typed as text: Persian digits and a decimal point both work. */
function NumberField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <Input
      label={label}
      dir="ltr"
      className="text-left"
      inputMode="decimal"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(toLatinNumber(e.target.value))}
    />
  );
}

/** What changes most from month to month: bonus, overtime, advance, instalment. */
export function CommonInputs({ form, set, locked, flat }: { form: LineFormState; set: Setter; locked: boolean; flat: boolean }) {
  return (
    <>
      <div className={`grid grid-cols-2 gap-3 ${flat ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        <CurrencyInput label="پاداش / پورسانت" unit="rial" value={form.bonus} disabled={locked} onValueChange={(v) => set('bonus', v ?? 0)} />
        {!flat && <NumberField label="اضافه‌کار (ساعت)" value={form.overtimeHours} onChange={(v) => set('overtimeHours', v)} disabled={locked} />}
        <CurrencyInput label="مساعده" unit="rial" value={form.advance} disabled={locked} onValueChange={(v) => set('advance', v ?? 0)} />
        <CurrencyInput label="قسط وام" unit="rial" value={form.loan} disabled={locked} onValueChange={(v) => set('loan', v ?? 0)} />
      </div>
    </>
  );
}

/** What rarely changes: tucked away, and open by itself when something here is not the everyday value. */
export function RareInputs({
  form,
  set,
  locked,
  open,
  onToggle,
  flat,
}: {
  form: LineFormState;
  set: Setter;
  locked: boolean;
  flat: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-start"
      >
        <span>
          <span className="block font-semibold text-slate-800">بیشتر</span>
          <span className="block text-xs text-slate-400">
            {flat ? 'روز کار، کسری، سایر کسورات و توضیحات' : 'روز کار، ماموریت، شب‌کاری، تعطیل‌کاری، کسری، سایر کسورات، عیدی و تسویه'}
            {hasUncommonInputs(form) && !open ? ' — مقدار تغییرکرده دارد' : ''}
          </span>
        </span>
        <IconChevronDown className={`size-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField label="روز کار" value={form.days} onChange={(v) => set('days', v)} disabled={locked} />
            {!flat && (
              <>
                <NumberField label="مأموریت (روز)" value={form.missionDays} onChange={(v) => set('missionDays', v)} disabled={locked} />
                <NumberField label="شب‌کاری (ساعت)" value={form.nightHours} onChange={(v) => set('nightHours', v)} disabled={locked} />
                <NumberField label="تعطیل‌کاری (ساعت)" value={form.holidayHours} onChange={(v) => set('holidayHours', v)} disabled={locked} />
              </>
            )}
            <NumberField label="کسری کار (ساعت)" value={form.deficitHours} onChange={(v) => set('deficitHours', v)} disabled={locked} />
            <CurrencyInput label="سایر کسورات" unit="rial" value={form.otherDeductions} disabled={locked} onValueChange={(v) => set('otherDeductions', v ?? 0)} />
          </div>
          {!flat && <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" checked={form.payEidi} disabled={locked} onChange={(e) => set('payEidi', e.target.checked)} />
              پرداخت عیدی و سنوات (معمولاً اسفند)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" checked={form.settle} disabled={locked} onChange={(e) => set('settle', e.target.checked)} />
              تسویه حساب (ماه پایان همکاری)
            </label>
            {form.settle && (
              <div className="sm:col-span-2">
                <NumberField label="مانده‌ی مرخصی (روز)" value={form.leaveRemainDays} onChange={(v) => set('leaveRemainDays', v)} disabled={locked} />
              </div>
            )}
          </div>}
          <Input label="توضیحات" value={form.note} disabled={locked} onChange={(e) => set('note', e.target.value)} maxLength={255} />
        </div>
      )}
    </div>
  );
}

/** How the month is paid: the transfers with the bank details, and the file for this person. */
export function PaymentCard({ slip }: { slip: Payslip }) {
  const label = periodLabel(slip.period);
  const draft = slip.status === 'draft' ? ' (پیش‌نویس)' : '';
  const salary = slip.net - slip.extras;
  const transfers = [
    { kind: 'حقوق', amount: salary, text: `حقوق ${label}${draft}`, tone: 'neutral' as const },
    ...(slip.extras > 0 ? [{ kind: 'اضافات', amount: slip.extras, text: `اضافات ${label}${draft}`, tone: 'info' as const }] : []),
  ].filter((t) => t.amount > 0);
  const sheba = slip.identity.sheba;

  return (
    <Card
      title="تفکیک پرداخت و مشخصات بانکی"
      hint="هر ردیف یک واریز جداست"
    >
      <dl className="grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-400">نام صاحب حساب</dt>
          <dd className="font-semibold text-slate-800">{slip.user.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">شماره شبا</dt>
          <dd className="flex items-center gap-2">
            {sheba ? (
              <CopyText value={sheba} className="font-semibold text-slate-800" />
            ) : (
              <Badge tone="danger">ثبت نشده — از صفحه‌ی کاربر وارد کنید</Badge>
            )}
          </dd>
        </div>
      </dl>
      {transfers.length ? (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
          {transfers.map((t) => (
            <div key={t.kind} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Badge tone={t.tone}>{t.kind}</Badge>
                <span className="text-slate-600">{t.text}</span>
              </div>
              <strong className="tabular-nums text-slate-900">
                <CopyAmount value={t.amount} /> <span className="text-[10px] font-normal text-slate-400">ریال</span>
              </strong>
            </div>
          ))}
          {transfers.length > 1 && (
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 font-semibold">
              <span>جمع پرداخت</span>
              <span className="tabular-nums"><CopyAmount value={slip.net} /> ریال</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">مبلغی برای پرداخت نیست.</p>
      )}
    </Card>
  );
}

/** For a hybrid salary: how the agreed salary splits into the legal package and the extras. */
export function HybridCard({ slip }: { slip: Payslip }) {
  const legalNet = slip.net - slip.extras;
  return (
    <Card title="حقوق هیبرید" >
      <p className="text-sm leading-7 text-slate-600">
        بخش قانونی (حداقل مزد + مزایا) از قوانین بیمه و مالیات می‌گذرد. مازاد حقوق توافقی بر آن «اضافات» است و جدا و خالص پرداخت می‌شود.
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <Line label="حقوق توافقی (کل)" value={slip.agreed} muted />
        <Line label="بسته‌ی قانونی (ناخالص)" value={slip.gross} />
        <Line label="کسورات بسته‌ی قانونی" value={slip.totalDeductions} negative />
        <Line label="خالص بخش قانونی" value={legalNet} />
        <Line label="اضافات (جدا، خالص)" value={slip.extras} accent />
        <Line label="جمع خالص پرداختی" value={slip.net} strong />
      </dl>
    </Card>
  );
}

function Line({ label, value, muted, negative, accent, strong }: { label: string; value: number; muted?: boolean; negative?: boolean; accent?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${strong ? 'bg-slate-100 font-bold' : 'bg-slate-50'}`}>
      <dt className={muted ? 'text-slate-400' : 'text-slate-600'}>{label}</dt>
      <dd className={`tabular-nums ${accent ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-slate-800'}`}><CopyAmount value={value} /></dd>
    </div>
  );
}

/** The month's figures line by line, for one person. */
export function BreakdownCard({ slip }: { slip: Payslip }) {
  const flat = slip.agreement === 'flat';
  return (
    <Card title="محاسبه (ریال)">
      {slip.warnings.length > 0 && (
        <ul className="space-y-1">
          {slip.warnings.map((w) => (
            <li key={w}>
              <Badge tone="warning">{w}</Badge>
            </li>
          ))}
        </ul>
      )}
      {flat ? (
        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-[13px]">
          <Row label="حقوق توافقی (کل)" value={slip.agreed} muted />
          <Row label="حقوق این ماه" value={slip.base} />
          <Row label="پاداش" value={slip.bonus} />
          <Row label="جمع" value={slip.gross} strong />
          <Row label="کسری کار" value={slip.deficit} negative />
          <Row label="مساعده" value={slip.advance} negative />
          <Row label="قسط وام" value={slip.loan} negative />
          <Row label="سایر کسورات" value={slip.otherDeductions} negative />
          <Row label="جمع کسورات" value={slip.totalDeductions} strong negative />
          <Row label="خالص پرداختی" value={slip.net} strong accent />
        </dl>
      ) : (
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-[13px]">
        <Row label="حقوق توافقی (کل)" value={slip.agreed} muted />
        <Row label="مزد پایه" value={slip.base} />
        <Row label="حق مسکن" value={slip.housing} />
        <Row label="بن کارگری" value={slip.bon} />
        <Row label="حق تأهل" value={slip.marriage} />
        <Row label="حق اولاد" value={slip.child} />
        <Row label="پایه سنوات" value={slip.seniority} />
        <Row label="اضافه‌کار و نوبت‌کاری" value={slip.overtime} />
        <Row label="فوق‌العاده‌ی مأموریت" value={slip.mission} />
        <Row label="پاداش" value={slip.bonus} />
        <Row label="عیدی" value={slip.eidi} />
        <Row label="سنوات" value={slip.severance} />
        <Row label="بازخرید مرخصی" value={slip.leaveBuyout} />
        <Row label="جمع حقوق و مزایا (مشمول قوانین)" value={slip.gross} strong />
        <Row label="کسر کسری کار" value={slip.deficit} negative />
        <Row label="بیمه‌ی سهم کارگر" value={slip.workerInsurance} negative />
        <Row label="مالیات" value={slip.tax} negative />
        <Row label="مساعده" value={slip.advance} negative />
        <Row label="قسط وام" value={slip.loan} negative />
        <Row label="سایر کسورات" value={slip.otherDeductions} negative />
        <Row label="جمع کسورات" value={slip.totalDeductions} strong negative />
        <Row label="اضافات هیبرید" value={slip.extras} />
        <Row label="خالص پرداختی" value={slip.net} strong accent />
        <Row label="بیمه‌ی سهم کارفرما" value={slip.employerInsurance} muted />
        <Row label="ذخیره‌ی عیدی و سنوات" value={slip.accrual} muted />
        <Row label="هزینه‌ی کل کارفرما" value={slip.totalCost} strong />
      </dl>
      )}
    </Card>
  );
}

function Row({ label, value, strong, muted, negative, accent }: { label: string; value: number; strong?: boolean; muted?: boolean; negative?: boolean; accent?: boolean }) {
  if (!value && !strong) return null;
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-1 ${strong ? 'bg-slate-50 font-semibold' : ''}`}>
      <dt className={muted ? 'text-slate-400' : 'text-slate-600'}>{label}</dt>
      <dd className={`tabular-nums ${accent ? 'text-emerald-600' : negative && value ? 'text-rose-600' : muted ? 'text-slate-400' : 'text-slate-800'}`}><CopyAmount value={value} /></dd>
    </div>
  );
}

/** The month's inputs in one card; the less usual ones open with «بیشتر». */
export function InputsCard(props: { form: LineFormState; set: Setter; locked: boolean; flat: boolean; open: boolean; onToggle: () => void }) {
  return (
    <Card>
      <CommonInputs form={props.form} set={props.set} locked={props.locked} flat={props.flat} />
      <RareInputs {...props} />
    </Card>
  );
}

const FA = (n: number) => n.toLocaleString('fa-IR');

/** The person's facts that move this month's figures, with a way to the user page to change them. */
export function FactsCard({ slip }: { slip: Payslip }) {
  const i = slip.identity;
  const flat = slip.agreement === 'flat';
  const mode = { regular: 'حقوقی (مشمول قوانین)', hybrid: 'هیبرید', flat: 'ساده (بدون مبانی حقوقی)' }[i.salaryMode];
  const facts: Array<[string, string]> = [
    ['نوع حقوق', mode],
    ...(flat
      ? []
      : ([
          ['نوع توافق', i.agreementType === 'net' ? 'خالص' : 'ناخالص'],
          ['وضعیت تأهل', i.married ? 'متأهل' : 'مجرد'],
          ['فرزند', i.childrenCount ? `${FA(i.childrenCount)} فرزند` : 'بدون فرزند'],
          ['سابقه‌ی کار', i.hireDate ? `${FA(i.seniorityYears)} سال` : 'تاریخ شروع ثبت نشده'],
          ['بیمه', i.insured ? (i.insuranceType === 'board' ? 'بیمه‌شده، هیئت‌مدیره' : 'بیمه‌شده') : 'بیمه‌نشده'],
          ['مالیات', i.taxExempt ? 'معاف' : 'مشمول'],
        ] as Array<[string, string]>)),
  ];

  return (
    <Card
      title="مشخصات مؤثر بر حقوق"
      action={
        <Link href={`/dashboard/users/${slip.user.id}`} className="text-xs text-sky-600">
          ویرایش در صفحه‌ی کاربر
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
        {i.hireDate && (
          <div>
            <dt className="text-xs text-slate-400">شروع همکاری</dt>
            <dd className="font-semibold text-slate-800">{jalaliLabel(i.hireDate)}</dd>
          </div>
        )}
        {i.probationEndDate && (
          <div>
            <dt className="text-xs text-slate-400">دوره‌ی آزمایشی</dt>
            <dd className="font-semibold text-slate-800">
              {slip.probation ? 'تا' : 'بود، تا'} {jalaliLabel(i.probationEndDate)}
            </dd>
          </div>
        )}
        {i.endDate && (
          <div>
            <dt className="text-xs text-slate-400">پایان همکاری</dt>
            <dd className="font-semibold text-slate-800">{jalaliLabel(i.endDate)}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

/** One advance still owed: how much of it to take off this month (all by default). */
function AdvanceRow({
  advance,
  disabled,
  onApply,
}: {
  advance: AdvanceItem;
  disabled: boolean;
  onApply: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(advance.remaining);
  const partial = advance.remaining !== advance.amount;
  const valid = amount > 0 && amount <= advance.remaining;

  return (
    <div className="space-y-2 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold tabular-nums text-slate-800">
            <CopyAmount value={advance.amount} /> <span className="text-[10px] font-normal text-slate-400">ریال</span>
            {partial && (
              <span className="ms-2 text-xs font-normal text-slate-500">
                مانده: <CopyAmount value={advance.remaining} />
              </span>
            )}
          </div>
          <div className="truncate text-xs text-slate-400">
            {advance.decidedAt ? `تأیید ${jalaliLabel(advance.decidedAt.slice(0, 10))}` : ''}
            {advance.reason ? ` · ${advance.reason}` : ''}
          </div>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <CurrencyInput
            label="مبلغ کسر این ماه"
            unit="rial"
            value={amount}
            disabled={disabled}
            onValueChange={(v) => setAmount(v ?? 0)}
          />
        </div>
        <Button size="sm" variant="outline" disabled={disabled || !valid} onClick={() => onApply(amount)}>
          اعمال
        </Button>
      </div>
      {!valid && amount > advance.remaining && (
        <p className="text-xs text-rose-500">بیشتر از مانده‌ی مساعده است.</p>
      )}
    </div>
  );
}

/**
 * The person's approved advances: all or part of what is still owed can be
 * taken off this month (it joins «مساعده»), the rest stays for a later month,
 * and what this line took can be given back while it is a draft. Nothing is
 * shown when the person has none.
 */
export function AdvancesCard({
  lineId,
  locked,
  onChanged,
}: {
  lineId: number;
  locked: boolean;
  /** The line's advance after a change, so the form shows the same figure. */
  onChanged: (advance: number) => void;
}) {
  const { data, refresh } = useLineAdvances(lineId);
  const apply = useApplyAdvance();
  const unapply = useUnapplyAdvance();
  const busy = apply.isLoading || unapply.isLoading;
  const [givingBack, setGivingBack] = useState<AdvanceItem | null>(null);

  const done = (line: { advance: number }, message: string) => {
    onChanged(line.advance);
    toast.success(message);
    refresh();
  };
  const fail = (e: unknown) => toast.error((e as Error)?.message ?? 'انجام نشد');

  if (!data || (!data.available.length && !data.applied.length)) return null;

  return (
    <Card className="!border-amber-200 !bg-amber-50/60" title="مساعده‌های تأییدشده" hint="مبلغ دلخواه را کسر کنید؛ باقی‌مانده برای ماه‌های بعد می‌ماند">
      <div className="divide-y divide-amber-100 rounded-xl border border-amber-200 bg-white/70">
        {!locked &&
          data.available.map((r) => (
            <AdvanceRow
              key={`${r.id}-${r.remaining}`}
              advance={r}
              disabled={busy}
              onApply={(amount) =>
                apply
                  .submit({ lineId, requestId: r.id, amount })
                  .then((line) => done(line, 'مساعده اعمال شد'))
                  .catch(fail)
              }
            />
          ))}
        {data.applied.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <div className="min-w-0">
              <div className="font-semibold tabular-nums text-slate-800">
                <CopyAmount value={r.taken} /> <span className="text-[10px] font-normal text-slate-400">ریال کسر شد</span>
              </div>
              <div className="truncate text-xs text-slate-400">
                از مساعده‌ی <span className="tabular-nums">{rial(r.amount)}</span>
                {r.remaining > 0 ? ` · مانده ${rial(r.remaining)}` : ''}
                {r.reason ? ` · ${r.reason}` : ''}
              </div>
            </div>
            {locked ? (
              <Badge tone="success">کسر شده</Badge>
            ) : (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setGivingBack(r)}>
                برگرداندن
              </Button>
            )}
          </div>
        ))}
      </div>
      <ConfirmModal
        isOpen={givingBack !== null}
        onClose={() => setGivingBack(null)}
        onConfirm={async () => {
          if (!givingBack) return;
          await unapply
            .submit({ lineId, requestId: givingBack.id })
            .then((line) => done(line, 'مساعده برگردانده شد'))
            .catch(fail);
          setGivingBack(null);
        }}
        title="برگرداندن مساعده"
        message={`${rial(givingBack?.taken ?? 0)} ریال از کسر این ماه برداشته می‌شود و دوباره جزو مانده‌ی مساعده است.`}
        confirmButtonText="برگرداندن"
        cancelButtonText="بازگشت"
        isLoading={unapply.isLoading}
      />
    </Card>
  );
}
