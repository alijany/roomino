'use client';

import { fromCivilDate, jalaliLabel, toCivilDate } from '@/app/dashboard/attendance/attendance.util';
import { useAuth } from '@/components/auth/auth.context.provider';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { Role } from '@/components/auth/auth.constants.roles';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, CurrencyInput, Input } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { BackButton, DataView, DatePickerField } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconPrinter } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { toast } from 'react-toastify';
import { CopyAmount, CopyText } from '../../financial.component.copy-amount';
import { toLatinNumber } from '../../financial.util';
import { useDeleteSettlement, useFinalizeSettlement, useReopenSettlement, useSettlement, useUpdateSettlement } from '../final-settlement.api';
import { FinalSettlement } from '../final-settlement.types';

export default function SettlementPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.finalSettlement.roles}>
      <DashbaordLayout>
        <SettlementContent />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function SettlementContent() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refresh } = useSettlement(Number(id));
  return (
    <div className="no-scrollbar flex grow flex-col overflow-auto pb-6">
      <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
        {data && <SettlementEditor key={`${data.id}-${data.status}`} s={data} refresh={refresh} />}
      </DataView>
    </div>
  );
}

function Card({ title, hint, children, className = '' }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`ui-surface space-y-4 p-4 lg:p-5 ${className}`}>
      <div>
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, strong, negative, accent, show = true }: { label: string; value: number; strong?: boolean; negative?: boolean; accent?: boolean; show?: boolean }) {
  if (!show && !value && !strong) return null;
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-1.5 text-[13px] ${strong ? 'bg-slate-50 font-semibold' : ''}`}>
      <dt className="text-slate-600">{label}</dt>
      <dd className={`tabular-nums ${accent ? 'text-emerald-600' : negative && value ? 'text-rose-600' : 'text-slate-800'}`}>
        <CopyAmount value={value} />
      </dd>
    </div>
  );
}

function SettlementEditor({ s, refresh }: { s: FinalSettlement; refresh: () => void }) {
  const router = useRouter();
  const { hasRole } = useAuth();
  const canEdit = hasRole(Role.ADMIN) || hasRole(Role.FINANCE_MANAGER);
  const locked = s.status === 'final' || !canEdit;

  const update = useUpdateSettlement();
  const finalize = useFinalizeSettlement();
  const reopen = useReopenSettlement();
  const remove = useDeleteSettlement();
  const busy = update.isLoading || finalize.isLoading || reopen.isLoading || remove.isLoading;

  const [date, setDate] = useState(s.date);
  const [leave, setLeave] = useState(String(s.leaveRemainDays));
  // Empty = counted from the dates; a value is the user's own.
  const [eidiMonths, setEidiMonths] = useState(s.eidiMonths != null ? String(s.eidiMonths) : '');
  const [eidiMonthsTouched, setEidiMonthsTouched] = useState(false);
  // Severance span: null = the default (hire date, settlement date).
  const [sevFrom, setSevFrom] = useState<string | null>(s.severanceCustom ? s.severanceFrom : null);
  const [sevTo, setSevTo] = useState<string | null>(s.severanceCustom ? s.severanceTo : null);
  const [proRata, setProRata] = useState(s.severanceProRata);
  const [eidiPaid, setEidiPaid] = useState(s.eidiPaid);
  // Typed as text so a minus sign is possible; sent as a whole number.
  const [adjustment, setAdjustment] = useState(s.adjustment ? String(s.adjustment) : '');
  const [advance, setAdvance] = useState(s.advance);
  const [loan, setLoan] = useState(s.loan);
  const [other, setOther] = useState(s.otherDeductions);
  const [note, setNote] = useState(s.note ?? '');
  const [confirm, setConfirm] = useState<'finalize' | 'reopen' | 'delete' | null>(null);

  const save = async (): Promise<boolean> => {
    try {
      await update.submit({
        id: s.id,
        data: { date, severanceFrom: sevFrom, severanceTo: sevTo, severanceProRata: proRata, ...(eidiMonthsTouched ? { eidiMonths: eidiMonths === '' ? null : Number(eidiMonths) } : {}), leaveRemainDays: Number(leave) || 0, eidiPaid, adjustment: Math.round(Number(adjustment) || 0), advance, loan, otherDeductions: other, note: note.trim() },
      });
      toast.success('ذخیره و دوباره محاسبه شد');
      refresh();
      return true;
    } catch (e) {
      toast.error((e as Error)?.message ?? 'ذخیره انجام نشد');
      return false;
    }
  };

  const runConfirmed = async () => {
    try {
      if (confirm === 'finalize') {
        if (!(await save())) return;
        await finalize.submit(s.id);
        toast.success('تسویه قطعی شد');
        refresh();
      } else if (confirm === 'reopen') {
        await reopen.submit(s.id);
        toast.success('تسویه دوباره باز شد');
        refresh();
      } else if (confirm === 'delete') {
        await remove.submit(s.id);
        toast.success('تسویه حذف شد');
        router.push('/dashboard/admin/financial/final-settlement');
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? 'انجام نشد');
    } finally {
      setConfirm(null);
    }
  };

  const CONFIRM_TEXT = {
    finalize: ['قطعی کردن تسویه', 'ورودی‌ها ذخیره و تسویه قطعی می‌شود؛ اگر تاریخ پایان همکاری فرد خالی باشد، تاریخ تسویه به‌عنوان پایان همکاری ثبت می‌شود.', 'قطعی کردن'],
    reopen: ['بازکردن تسویه', 'تسویه به پیش‌نویس برمی‌گردد تا اصلاح شود.', 'باز کردن'],
    delete: ['حذف تسویه', 'این تسویه‌ی پیش‌نویس حذف می‌شود.', 'حذف'],
  } as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard/admin/financial/final-settlement" label="بازگشت به تسویه‌ها" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800">{s.user.name ?? 'پرسنل'}</h1>
              <Badge tone={s.status === 'final' ? 'success' : 'warning'}>{s.status === 'final' ? 'قطعی' : 'پیش‌نویس'}</Badge>
            </div>
            <p className="text-xs text-slate-400">
              {[s.user.personnelCode, s.user.jobTitle].filter(Boolean).join(' · ')} · تسویه‌ی نهایی {jalaliLabel(s.date)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1" disabled={s.status !== 'final'} onClick={() => router.push(`/dashboard/admin/financial/final-settlement/${s.id}/slip`)}>
            <IconPrinter className="size-4" />
            فیش و رضایت‌نامه
          </Button>
        {canEdit && (
          <>
            {s.status === 'draft' ? (
              <>
                <Button disabled={busy} onClick={() => void save()}>
                  {update.isLoading ? 'در حال ذخیره...' : 'ذخیره و محاسبه'}
                </Button>
                <Button variant="outline" className="border-emerald-200 text-emerald-700" disabled={busy} onClick={() => setConfirm('finalize')}>
                  ذخیره و قطعی کردن
                </Button>
                <Button variant="outline" className="border-rose-200 text-rose-600" disabled={busy} onClick={() => setConfirm('delete')}>
                  حذف
                </Button>
              </>
            ) : (
              <Button variant="outline" className="border-amber-200 text-amber-700" disabled={busy} onClick={() => setConfirm('reopen')}>
                بازکردن قطعی
              </Button>
            )}
          </>
        )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-4">
          <Card title="ورودی‌ها" hint="ماه‌های قبل با حقوق ماهانه پرداخت شده‌اند؛ اینجا فقط باقی‌مانده‌ی تسویه می‌آید">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="w-full min-w-0">
                <div className="mb-1.5 text-sm font-medium text-slate-700">تاریخ تسویه</div>
                <DatePickerField hideLabel className="w-full justify-start gap-2 !px-3" label="تاریخ تسویه" value={fromCivilDate(date)} disabled={locked} onSelect={(d) => setDate(toCivilDate(d))} minSelectableDate={new Date('2000-01-01')} />
              </div>
              <div className="w-full min-w-0">
                <Input label="مانده‌ی مرخصی (روز)" dir="ltr" className="text-left" inputMode="decimal" value={leave} disabled={locked} onChange={(e) => setLeave(toLatinNumber(e.target.value))} />
                {!locked && s.leaveFromAttendance != null && String(s.leaveFromAttendance) !== leave && (
                  <button type="button" className="mt-1 text-xs text-slate-400 hover:text-slate-600" onClick={() => setLeave(String(s.leaveFromAttendance))}>
                    طبق حضور و غیاب: {s.leaveFromAttendance.toLocaleString('fa-IR')} روز — اعمال
                  </button>
                )}
              </div>
              <Input label="مدت عیدی (ماه)" dir="ltr" className="text-left" inputMode="decimal" placeholder={String(s.yearMonths)} value={eidiMonths} disabled={locked} onChange={(e) => { setEidiMonths(toLatinNumber(e.target.value).replace(/[^0-9.]/g, '')); setEidiMonthsTouched(true); }} />
              <CurrencyInput label="عیدی پرداخت‌شده در امسال" unit="rial" value={eidiPaid} disabled={locked} onValueChange={(v) => setEidiPaid(v ?? 0)} />
              <Input label="تعدیل حقوق ماه آخر (± ریال)" dir="ltr" className="text-left" inputMode="numeric" placeholder="مثلاً -5000000" value={adjustment} disabled={locked} onChange={(e) => setAdjustment(toLatinNumber(e.target.value).replace(/[^0-9-]/g, ''))} />
              <CurrencyInput label="مساعده‌ی مانده" unit="rial" value={advance} disabled={locked} onValueChange={(v) => setAdvance(v ?? 0)} />
              <CurrencyInput label="قسط وام" unit="rial" value={loan} disabled={locked} onValueChange={(v) => setLoan(v ?? 0)} />
              <CurrencyInput label="سایر کسورات" unit="rial" value={other} disabled={locked} onValueChange={(v) => setOther(v ?? 0)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SevDate label="شروع محاسبه‌ی سنوات" value={sevFrom ?? s.severanceFrom ?? ''} disabled={locked} custom={sevFrom !== null} onChange={setSevFrom} />
              <SevDate label="پایان محاسبه‌ی سنوات" value={sevTo ?? s.severanceTo ?? date} disabled={locked} custom={sevTo !== null} onChange={setSevTo} />
            </div>
            {(proRata || s.warnings.some((w) => w.startsWith('بازه‌ی سنوات'))) && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={proRata} disabled={locked} onChange={(e) => setProRata(e.target.checked)} />
                بازه‌ی سنوات کمتر از یک سال است؛ به نسبت مدت حساب شود
              </label>
            )}
            <Input label="توضیحات" value={note} disabled={locked} maxLength={255} onChange={(e) => setNote(e.target.value)} />
          </Card>

          <Card title="مشخصات پرداخت" hint="مبلغ قابل پرداخت و حساب فرد">
            <dl className="grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">نام صاحب حساب</dt>
                <dd className="font-semibold text-slate-800">{s.user.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">شماره شبا</dt>
                <dd>{s.user.sheba ? <CopyText value={s.user.sheba} className="font-semibold text-slate-800" /> : <Badge tone="danger">ثبت نشده</Badge>}</dd>
              </div>
            </dl>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              <span className="text-slate-600">قابل پرداخت</span>
              <strong className={`tabular-nums ${s.net < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                <CopyAmount value={s.net} /> <span className="text-[10px] font-normal text-slate-400">ریال</span>
              </strong>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
          <Card title="محاسبه (ریال)" hint={`${s.user.hireDate ? `شروع همکاری ${jalaliLabel(s.user.hireDate)}؛ ` : ''}سابقه ${s.serviceYears.toLocaleString('fa-IR')} سال؛ سهم عیدی ${s.yearMonths.toLocaleString('fa-IR')} ماه از سال`}>
            {s.warnings.length > 0 && (
              <ul className="space-y-1">
                {s.warnings.map((w) => (
                  <li key={w}>
                    <Badge tone="warning">{w}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              <Row label="سنوات" value={s.severance} show />
              <Row label="بازخرید مرخصی" value={s.leaveBuyout} show />
              <Row label="عیدی (سهم امسال)" value={s.eidi} show />
              <Row label="جمع" value={s.gross} strong />
              <Row label="بیمه‌ی سهم کارگر" value={s.workerInsurance} negative />
              <Row label="مالیات" value={s.tax} negative />
              <Row label="مساعده" value={s.advance} negative />
              <Row label="قسط وام" value={s.loan} negative />
              <Row label="سایر کسورات" value={s.otherDeductions} negative />
              <Row label="عیدی پرداخت‌شده" value={s.eidiPaid} negative />
              <Row label="تعدیل حقوق ماه آخر" value={s.adjustment} />
              <Row label="قابل پرداخت" value={s.net} strong accent />
            </dl>
            <p className="text-xs leading-6 text-slate-400">
              عیدی پرداخت‌شده بعد از مالیات کم می‌شود. مبلغ‌های سنوات و بازخرید مرخصی طبق تنظیمات سال و قواعد معافیت محاسبه می‌شوند؛ با حسابدار تأیید کنید.
            </p>
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirmed}
        title={confirm ? CONFIRM_TEXT[confirm][0] : ''}
        message={confirm ? CONFIRM_TEXT[confirm][1] : ''}
        confirmButtonText={confirm ? CONFIRM_TEXT[confirm][2] : ''}
        cancelButtonText="بازگشت"
        isLoading={busy}
      />
    </div>
  );
}

/** A severance date: the default until picked, and a button to go back to it. */
function SevDate({ label, value, custom, disabled, onChange }: { label: string; value: string; custom: boolean; disabled: boolean; onChange: (v: string | null) => void }) {
  return (
    <div className="w-full min-w-0">
      <div className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
        {label}
        {custom && !disabled && (
          <button type="button" className="text-xs font-normal text-slate-400 hover:text-slate-600" onClick={() => onChange(null)}>
            پیش‌فرض
          </button>
        )}
      </div>
      {value ? (
        <DatePickerField hideLabel className="w-full justify-start gap-2 !px-3" label={label} value={fromCivilDate(value)} disabled={disabled} onSelect={(d) => onChange(toCivilDate(d))} minSelectableDate={new Date('2000-01-01')} />
      ) : (
        <div className="text-sm text-slate-300">—</div>
      )}
    </div>
  );
}
