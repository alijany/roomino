'use client';

import { jalaliLabel, tehranToday } from '@/app/dashboard/attendance/attendance.util';
import { COMPANY_LEGAL_NAME, COMPANY_NATIONAL_ID, rial, toPersianWords } from '../financial.util';
import { FinalSettlement } from './final-settlement.types';

const COMPANY = 'تسمینو';
const TAGLINE = 'پلتفرم هوشمند سئو و دیجیتال مارکتینگ';

const amount = (value: number) => (value ? rial(value) : '—');

/**
 * A person's final settlement as a printable page with the release statement
 * and signature lines. Everything is in rial. A draft says so across the page.
 */
export function SettlementSlip({ s }: { s: FinalSettlement }) {
  const draft = s.status !== 'final';
  const owes = s.net < 0;
  const earnings: Array<[string, number]> = [
    ['سنوات (پایان کار)', s.severance],
    ['بازخرید مرخصی', s.leaveBuyout],
    ['عیدی و پاداش', s.eidi],
    ['تعدیل حقوق ماه آخر', Math.max(s.adjustment, 0)],
  ];
  const deductions: Array<[string, number]> = [
    ['بیمه‌ی سهم کارگر', s.workerInsurance],
    ['مالیات', s.tax],
    ['مساعده', s.advance],
    ['قسط وام', s.loan],
    ['عیدی پرداخت‌شده', s.eidiPaid],
    ['تعدیل حقوق ماه آخر', Math.max(-s.adjustment, 0)],
    ['سایر کسورات', s.otherDeductions],
  ];
  const totalEarnings = earnings.reduce((sum, [, v]) => sum + v, 0);
  const totalDeductions = deductions.reduce((sum, [, v]) => sum + v, 0);
  const name = s.user.name ?? '..........';
  const from = s.user.hireDate ? jalaliLabel(s.user.hireDate) : '..........';

  return (
    <article
      dir="rtl"
      className="settlement-slip relative mx-auto w-full max-w-[820px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl print:max-w-none print:rounded-none print:border-0 print:text-[11px] print:shadow-none"
    >
      {draft && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
          <span className="-rotate-[24deg] select-none whitespace-nowrap text-7xl font-black text-amber-500/15 sm:text-8xl">
            پیش‌نویس — قطعی نشده
          </span>
        </div>
      )}

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
            <div className="text-2xl font-black tracking-tight print:text-xl">تسویه حساب نهایی</div>
            <div className="mt-1 text-sm text-slate-200">تاریخ تسویه: {jalaliLabel(s.date)}</div>
            <div className="mt-0.5 text-xs text-slate-300">تاریخ صدور: {jalaliLabel(tehranToday())}</div>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-6 py-7 sm:px-10 print:space-y-3 print:px-8 print:py-4">
        <section aria-label="مشخصات همکار" className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-4 print:grid-cols-4 print:gap-y-1.5 print:p-3">
          <Info label="نام همکار" value={s.user.name} sub={s.user.personnelCode} />
          <Info label="سمت" value={s.user.jobTitle} />
          <Info label="شروع همکاری" value={s.user.hireDate ? jalaliLabel(s.user.hireDate) : null} />
          <Info label="پایان همکاری" value={jalaliLabel(s.user.endDate ?? s.date)} />
          <Info label="سابقه (سال کامل)" value={s.serviceYears.toLocaleString('fa-IR')} />
          <Info label="مدت عیدی (ماه)" value={s.yearMonths.toLocaleString('fa-IR')} />
          <Info label="مانده‌ی مرخصی (روز)" value={s.leaveRemainDays.toLocaleString('fa-IR')} />
          <div className="col-span-2 sm:col-span-4 print:col-span-4">
            <Info label="شماره شبا (حساب واریزی)" value={s.user.sheba} ltr />
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-3">
          <Statement title="مطالبات" tone="emerald" rows={earnings} total={['جمع مطالبات', totalEarnings]} />
          <Statement title="کسورات" tone="rose" rows={deductions} total={['جمع کسورات', totalDeductions]} />
        </section>

        <section className="rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 p-6 text-white shadow-lg print:p-3 print:shadow-none">
          <div className="text-sm text-emerald-50">{owes ? 'بدهی همکار به شرکت' : 'خالص قابل پرداخت'}</div>
          <div className="mt-1 text-3xl font-black tabular-nums tracking-tight print:text-xl">
            {rial(Math.abs(s.net))} <span className="text-base font-semibold text-emerald-100">ریال</span>
          </div>
          <p className="mt-3 border-t border-white/25 pt-3 text-sm leading-7 text-emerald-50 print:mt-1.5 print:pt-1.5 print:leading-5">
            به حروف: {toPersianWords(Math.abs(s.net))} ریال
          </p>
        </section>

        {s.note && <p className="text-sm text-slate-600">توضیحات: {s.note}</p>}

        <section className="rounded-2xl border border-slate-200 p-5 text-sm leading-8 text-slate-700 print:p-3 print:leading-6">
          <h2 className="mb-1 font-bold text-slate-900">رضایت‌نامه و اقرار</h2>
          <p>
            اینجانب <strong>{name}</strong> که از تاریخ <strong>{from}</strong> تا تاریخ <strong>{jalaliLabel(s.user.endDate ?? s.date)}</strong> در
            شرکت <strong>{COMPANY_LEGAL_NAME}</strong> به شناسه ملی <bdi dir="ltr">{COMPANY_NATIONAL_ID}</bdi> (برند {COMPANY}) مشغول به کار بوده‌ام، بدین وسیله اقرار می‌نمایم که کلیه حقوق، مزایا، اضافه‌کار، عیدی و پاداش، حق سنوات، بازخرید
            مرخصی و سایر مطالبات قانونی و قراردادی خود را تا تاریخ <strong>{jalaliLabel(s.date)}</strong> مطابق جدول بالا و به مبلغ خالص{' '}
            <strong>{rial(Math.abs(s.net))}</strong> ریال ({toPersianWords(Math.abs(s.net))} ریال) {owes ? 'تسویه نموده' : 'دریافت کرده'}
            و پس از این هیچ‌گونه ادعا، شکایت یا مطالبه‌ای از شرکت نداشته و نخواهم داشت.
          </p>
        </section>

        <section className="grid grid-cols-3 gap-4 pt-4 text-center text-sm print:pt-2">
          {['امضا و اثر انگشت همکار', 'مدیر مالی', 'مدیرعامل'].map((label) => (
            <div key={label}>
              <div className="h-20 border-b border-slate-400 print:h-14" />
              <div className="mt-2 text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </section>
      </div>
    </article>
  );
}

function Info({ label, value, sub, ltr }: { label: string; value: string | null | undefined; sub?: string | null; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-400">{label}</div>
      {value ? (
        <div className={`mt-0.5 truncate font-semibold text-slate-800 ${ltr ? 'text-right tabular-nums' : ''}`}>
          {ltr ? <bdi dir="ltr">{value}</bdi> : value}
        </div>
      ) : (
        <div className="mt-0.5 font-semibold text-slate-300">—</div>
      )}
      {sub && <div className="text-xs text-slate-400"><bdi dir="ltr">{sub}</bdi></div>}
    </div>
  );
}

function Statement({ title, tone, rows, total }: { title: string; tone: 'emerald' | 'rose'; rows: Array<[string, number]>; total: [string, number] }) {
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
