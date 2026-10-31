'use client';

import { jalaliLabel, tehranToday } from '@/app/dashboard/attendance/attendance.util';
import { ReactNode } from 'react';
import { periodLabel, rial, toPersianWords } from '../financial.util';
import { Payslip } from './payroll.types';

/** The company named on every payslip. */
const COMPANY = 'تسمینو';
const TAGLINE = 'پلتفرم هوشمند سئو و دیجیتال مارکتینگ';

/** An amount, or a dash for none, so every payslip has the same rows. */
const amount = (value: number) => (value ? rial(value) : '—');

/**
 * One person's pay for one month as a printable page. Everything is in rial.
 * A month that is not final yet says so across the page, so a draft is never
 * mistaken for the real thing.
 */
export function PayslipView({ slip }: { slip: Payslip }) {
  const draft = slip.status !== 'final';
  const flat = slip.agreement === 'flat';
  const earnings: Array<[string, number]> = flat
    ? [
        ['حقوق این ماه', slip.base],
        ['پاداش / پورسانت', slip.bonus],
      ]
    : [
    ['مزد پایه', slip.base],
    ['حق مسکن', slip.housing],
    ['بن کارگری', slip.bon],
    ['حق تأهل', slip.marriage],
    ['حق اولاد', slip.child],
    ['پایه سنوات', slip.seniority],
    ['اضافه‌کار و نوبت‌کاری', slip.overtime],
    ['فوق‌العاده‌ی مأموریت', slip.mission],
    ['پاداش / پورسانت', slip.bonus],
    ['عیدی', slip.eidi],
    ['سنوات', slip.severance],
    ['بازخرید مرخصی', slip.leaveBuyout],
    ['اضافات (مازاد توافقی)', slip.extras],
  ];
  const deductions: Array<[string, number]> = [
    ...(flat
      ? []
      : ([
          ['بیمه‌ی سهم کارگر', slip.workerInsurance],
          ['مالیات', slip.tax],
        ] as Array<[string, number]>)),
    ['کسری کار', slip.deficit],
    ['مساعده', slip.advance],
    ['قسط وام', slip.loan],
    ['سایر کسورات', slip.otherDeductions],
  ];
  const totalEarnings = slip.gross + slip.extras;
  const days = slip.days.toLocaleString('fa-IR');

  return (
    <article
      dir="rtl"
      className="payslip relative mx-auto w-full max-w-[820px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl print:max-w-none print:rounded-none print:border-0 print:text-[11px] print:shadow-none"
    >
      {draft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
        >
          <span className="-rotate-[24deg] select-none whitespace-nowrap text-7xl font-black text-amber-500/15 sm:text-8xl">
            پیش‌نویس — قطعی نشده
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white sm:px-10 print:px-8 print:py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.svg" alt="" className="h-10 brightness-0 invert print:h-8" />
            <div>
              <div className="text-lg font-bold">{COMPANY}</div>
              <div className="text-xs text-slate-300">{TAGLINE}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-2xl font-black tracking-tight print:text-xl">فیش حقوقی</div>
            <div className="mt-1 text-sm text-slate-200">{periodLabel(slip.period)}</div>
            <div className="mt-0.5 text-xs text-slate-300">تاریخ صدور: {jalaliLabel(tehranToday())}</div>
            {slip.revised && (
              <div className="mt-0.5 text-xs text-amber-200">
                بازنگری‌شده در {jalaliLabel(slip.revisions.filter((r) => r.changed).slice(-1)[0].at.slice(0, 10))}
              </div>
            )}
          </div>
        </div>
        {draft && (
          <p className="mt-4 rounded-xl bg-amber-400/20 px-4 py-2 text-sm font-medium text-amber-100 print:mt-2 print:py-1">
            ⚠ این فیش هنوز قطعی نشده است و ممکن است تغییر کند.
          </p>
        )}
      </header>

      <div className="space-y-6 px-6 py-7 sm:px-10 print:space-y-3 print:px-8 print:py-4">
        <p className="text-sm leading-7 text-slate-600 print:leading-5">
          سلام <strong className="text-slate-900">{slip.user.name ?? ''}</strong> عزیز؛ این فیش حقوقی{' '}
          {periodLabel(slip.period)} شماست.
        </p>

        {/* The person */}
        <section aria-label="مشخصات همکار" className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-4 print:grid-cols-4 print:gap-y-1.5 print:p-3">
          <Info
            label="نام همکار"
            value={slip.user.name}
            sub={slip.user.personnelCode ? <bdi dir="ltr">{slip.user.personnelCode}</bdi> : undefined}
          />
          <Info label="سمت" value={slip.user.jobTitle} />
          <Info label="روزهای کارکرد" value={days} />
          <Info label="کد ملی" value={slip.identity.nationalId} ltr />
          <Info label="شماره بیمه" value={slip.identity.insuranceNumber} ltr />
          <div className="col-span-2 sm:col-span-3">
            <Info label="شماره شبا (حساب واریزی)" value={slip.identity.sheba} ltr />
          </div>
        </section>

        {/* Pay */}
        <section className="grid gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-3">
          <Statement title="حقوق و مزایا" tone="emerald" rows={earnings} total={['جمع حقوق و مزایا', totalEarnings]} />
          <Statement title="کسورات" tone="rose" rows={deductions} total={['جمع کسورات', slip.totalDeductions]} />
        </section>

        {/* Net */}
        <section className="rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 p-6 text-white shadow-lg print:p-3 print:shadow-none">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm text-emerald-50">خالص پرداختی این ماه</div>
              <div className="mt-1 text-3xl font-black tabular-nums tracking-tight print:text-xl">
                {rial(slip.net)} <span className="text-base font-semibold text-emerald-100">ریال</span>
              </div>
            </div>
          </div>
          <p className="mt-3 border-t border-white/25 pt-3 text-sm leading-7 text-emerald-50 print:mt-1.5 print:pt-1.5 print:leading-5">
            به حروف: {toPersianWords(slip.net)} ریال
          </p>
        </section>

        {slip.note && <p className="text-sm text-slate-500">توضیحات: {slip.note}</p>}

        <footer className="space-y-3 border-t border-slate-100 pt-5 text-xs leading-6 text-slate-400 print:space-y-1 print:pt-2 print:leading-4">
          <p>مبالغ این فیش به ریال است.</p>
          <p>
            همکار گرامی، از تلاش، تعهد و همراهی ارزشمند شما در {COMPANY} صمیمانه سپاسگزاریم.
          </p>
        </footer>
      </div>
    </article>
  );
}

function Info({ label, value, sub, ltr }: { label: string; value: ReactNode; sub?: ReactNode; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-400">{label}</div>
      {/* A missing value is a dash on the right, whichever way the value would read. */}
      {value ? (
        <div className={`mt-0.5 truncate font-semibold text-slate-800 ${ltr ? 'text-right tabular-nums' : ''}`}>
          {ltr ? <bdi dir="ltr">{value}</bdi> : value}
        </div>
      ) : (
        <div className="mt-0.5 font-semibold text-slate-300">—</div>
      )}
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Statement({
  title,
  tone,
  rows,
  total,
}: {
  title: string;
  tone: 'emerald' | 'rose';
  rows: Array<[string, number]>;
  total: [string, number];
}) {
  const head = tone === 'emerald' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800';
  const sum = tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700';
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className={`px-4 py-2.5 text-sm font-bold print:py-1 ${head}`}>{title}</div>
      <dl className="divide-y divide-slate-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-2 print:py-0.5">
            <dt className={value ? 'text-slate-600' : 'text-slate-300'}>{label}</dt>
            <dd className={`tabular-nums ${value ? 'font-medium text-slate-800' : 'text-slate-300'}`}>{amount(value)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 font-bold print:py-1">
          <dt className="text-slate-700">{total[0]}</dt>
          <dd className={`tabular-nums ${sum}`}>{rial(total[1])}</dd>
        </div>
      </dl>
    </div>
  );
}
