'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { useDebouncedFilterText, useUrlFilters } from '@/libs/url/url.hook.use-url-filters';
import { Button, Dropdown, Input } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, PersonLabel, Table } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconAlertTriangle, IconBuildingBank, IconCheck, IconFileText, IconFilterOff, IconLockOpen, IconPencil, IconPlus, IconReceipt2, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'react-toastify';
import { CopyAmount } from '../financial.component.copy-amount';
import { PeriodPicker } from '../financial.component.period-picker';
import { currentPeriod, periodLabel, rial } from '../financial.util';
import {
  useDeletePayrollLine,
  useFinalizePayroll,
  useFinalizePayrollLine,
  useReopenPayrollLine,
  useReopenPayrollMonth,
  useGeneratePayroll,
  usePayrollMonth,
  useRecalculatePayroll,
} from './payroll.api';
import { BankModal } from './payroll.component.bank-modal';
import { ReopenModal } from './payroll.component.reopen-modal';
import { PayrollLine } from './payroll.types';

/** The month's filters; they live in the address like the month itself. */
interface PayrollFilters {
  period?: number;
  text?: string;
  status?: 'draft' | 'final';
  mode?: 'regular' | 'hybrid' | 'flat';
  flag?: 'probation' | 'warnings';
}

const STATUS_ITEMS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'final', label: 'قطعی' },
];
const MODE_ITEMS = [
  { value: 'all', label: 'همه نوع‌ها' },
  { value: 'regular', label: 'حقوقی' },
  { value: 'hybrid', label: 'هیبرید' },
  { value: 'flat', label: 'ساده' },
];
const FLAG_ITEMS = [
  { value: 'all', label: 'همه‌ی ردیف‌ها' },
  { value: 'probation', label: 'آزمایشی' },
  { value: 'warnings', label: 'دارای هشدار' },
];

/** A column title with the unit small beside it. */
function WithUnit({ children }: { children: string }) {
  return (
    <>
      {children} <span className="text-[10px] font-normal text-slate-400">(ریال)</span>
    </>
  );
}

/** Monthly payroll: everyone's pay for one month. Admin-only. */
export default function PayrollPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.payroll.roles}>
      <DashbaordLayout>
        <Suspense fallback={<DataView isLoading />}>
          <PayrollContent />
        </Suspense>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function PayrollContent() {
  // The month lives in the address, so a refresh or a shared link keeps it.
  const [filters, setFilters] = useUrlFilters<PayrollFilters>({
    period: 'number',
    text: 'string',
    status: 'string',
    mode: 'string',
    flag: 'string',
  });
  const period = filters.period ?? currentPeriod();
  const [text, setText] = useDebouncedFilterText(filters.text, (value) => setFilters((prev) => ({ ...prev, text: value || undefined })));

  const { data, error, isLoading, refresh } = usePayrollMonth(period);
  const generate = useGeneratePayroll();
  const recalculate = useRecalculatePayroll();
  const finalize = useFinalizePayroll();
  const remove = useDeletePayrollLine();
  const finalizeLine = useFinalizePayrollLine();
  const reopenLine = useReopenPayrollLine();
  const reopenMonth = useReopenPayrollMonth();

  const router = useRouter();
  const lineHref = (l: PayrollLine) => `/dashboard/admin/financial/payroll/line/${l.id}`;
  const [removing, setRemoving] = useState<PayrollLine | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [finalizingLine, setFinalizingLine] = useState<PayrollLine | null>(null);
  /** What is being reopened: one line, or the whole month. */
  const [reopening, setReopening] = useState<PayrollLine | 'month' | null>(null);

  const fail = (fallback: string) => (e: unknown) => toast.error((e as Error)?.message ?? fallback);

  const handleGenerate = () =>
    generate
      .submit(period)
      .then((r) => {
        toast.success(r.created ? `${r.created.toLocaleString('fa-IR')} ردیف ساخته شد` : 'ردیف تازه‌ای لازم نبود');
        refresh();
      })
      .catch(fail('ساخت ردیف‌ها انجام نشد'));

  const handleRecalculate = () =>
    recalculate
      .submit(period)
      .then((r) => {
        toast.success(`${r.recalculated.toLocaleString('fa-IR')} ردیف دوباره محاسبه شد`);
        refresh();
      })
      .catch(fail('محاسبه‌ی مجدد انجام نشد'));

  const handleFinalize = () =>
    finalize
      .submit(period)
      .then((r) => {
        toast.success(`ماه ${periodLabel(period)} قطعی شد (${r.finalized.toLocaleString('fa-IR')} ردیف)`);
        refresh();
      })
      .catch(fail('قطعی کردن انجام نشد'))
      .finally(() => setFinalizing(false));

  const handleFinalizeLine = () =>
    finalizingLine
      ? finalizeLine
          .submit(finalizingLine.id)
          .then(() => {
            toast.success(`حقوق ${finalizingLine.user.name ?? ''} قطعی شد`);
            refresh();
          })
          .catch(fail('قطعی کردن انجام نشد'))
          .finally(() => setFinalizingLine(null))
      : undefined;

  const handleReopen = (reason: string) => {
    if (!reopening) return;
    const done = (message: string) => {
      toast.success(message);
      setReopening(null);
      refresh();
    };
    const request =
      reopening === 'month'
        ? reopenMonth.submit({ period, reason }).then((r) => done(`${r.reopened.toLocaleString('fa-IR')} ردیف دوباره باز شد`))
        : reopenLine.submit({ id: reopening.id, reason }).then(() => done('ردیف دوباره باز شد'));
    request.catch(fail('بازکردن انجام نشد'));
  };

  const handleRemove = () =>
    removing
      ? remove
          .submit(removing.id)
          .then(() => {
            toast.success('ردیف حذف شد');
            refresh();
          })
          .catch(fail('حذف انجام نشد'))
          .finally(() => setRemoving(null))
      : undefined;

  const month = data;
  const query = (filters.text ?? '').trim().toLowerCase();
  const modeOf = (l: PayrollLine) => (l.agreement === 'hybrid' ? 'hybrid' : l.agreement === 'flat' ? 'flat' : 'regular');
  const rows = (month?.items ?? []).filter(
    (l) =>
      (!query || [l.user.name, l.user.personnelCode, l.user.jobTitle].some((v) => v?.toLowerCase().includes(query))) &&
      (!filters.status || l.status === filters.status) &&
      (!filters.mode || modeOf(l) === filters.mode) &&
      (filters.flag !== 'probation' || l.probation) &&
      (filters.flag !== 'warnings' || l.warnings.length > 0),
  );
  const hasFilters = Boolean(filters.text || filters.status || filters.mode || filters.flag);
  const setFilter = (change: Partial<PayrollFilters>) => setFilters((prev) => ({ ...prev, ...change }));
  const isFinal = month?.status === 'final';

  return (
    <div className="flex grow flex-col space-y-3 overflow-auto pb-6">
      <div className="ui-page-header">
        <div className="ui-page-icon">
          <IconReceipt2 className="size-6" />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <h1>حقوق و دستمزد ماهانه</h1>
          <p>
            {periodLabel(period)}
            {month && month.items.length > 0 && (
              <>
                {' · '}
                {isFinal ? 'قطعی شده' : `پیش‌نویس، ${month.drafts.toLocaleString('fa-IR')} ردیف`}
              </>
            )}
          </p>
        </div>
        <div className="w-full sm:w-80">
          <PeriodPicker label="ماه" value={period} onChange={(p) => setFilters({ period: p })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button className="gap-1" disabled={generate.isLoading || isFinal} onClick={handleGenerate}>
          <IconPlus className="size-4" />
          ساخت ردیف‌ها
          {month && month.missing > 0 && <Badge tone="info">{month.missing.toLocaleString('fa-IR')} نفر</Badge>}
        </Button>
        <Button
          variant="outline"
          className="gap-1"
          disabled={recalculate.isLoading || !month?.drafts}
          onClick={handleRecalculate}
        >
          <IconRefresh className="size-4" />
          محاسبه‌ی مجدد
        </Button>
        <Button
          variant="outline"
          className="gap-1 border-emerald-200 text-emerald-700"
          disabled={finalize.isLoading || !month?.drafts}
          onClick={() => setFinalizing(true)}
        >
          <IconCheck className="size-4" />
          قطعی کردن ماه
        </Button>
        <Button variant="outline" className="gap-1" disabled={!month?.items.length} onClick={() => setBankOpen(true)}>
          <IconBuildingBank className="size-4" />
          خروجی بانک
        </Button>
        {month?.items.some((l) => l.status === 'final') && (
          <Button
            variant="outline"
            className="gap-1 border-amber-200 text-amber-700"
            onClick={() => setReopening('month')}
          >
            <IconLockOpen className="size-4" />
            بازکردن قطعی ماه
          </Button>
        )}
      </div>

      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => !d?.items.length}
        emptyMessage="برای این ماه ردیفی نیست. با «ساخت ردیف‌ها» برای همه‌ی کسانی که حقوق ثبت‌شده دارند ردیف بسازید."
        onRetry={refresh}
      >
        {month && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <Tile label="تعداد" value={month.totals.count.toLocaleString('fa-IR')} />
              <Tile label="جمع حقوق و مزایا" unit value={rial(month.totals.gross)} />
              <Tile label="جمع کسورات" unit value={rial(month.totals.deductions)} />
              <Tile label="خالص پرداختی" unit value={rial(month.totals.net)} strong />
              <Tile label="بیمه‌ی کارفرما" unit value={rial(month.totals.employerInsurance)} />
              <Tile label="هزینه‌ی کل" unit value={rial(month.totals.totalCost)} strong />
            </div>

            <div className="ui-surface space-y-2 p-2 lg:p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-72">
                  <Input
                    icon={<IconSearch className="size-4 text-slate-400" />}
                    placeholder="نام، کد پرسنلی یا سمت"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
                <div className="w-44">
                  <Dropdown
                    items={STATUS_ITEMS}
                    value={filters.status ?? 'all'}
                    onChange={(v) => setFilter({ status: v && v !== 'all' ? (v as PayrollFilters['status']) : undefined })}
                    variant="outline"
                  />
                </div>
                <div className="w-44">
                  <Dropdown
                    items={MODE_ITEMS}
                    value={filters.mode ?? 'all'}
                    onChange={(v) => setFilter({ mode: v && v !== 'all' ? (v as PayrollFilters['mode']) : undefined })}
                    variant="outline"
                  />
                </div>
                <div className="w-44">
                  <Dropdown
                    items={FLAG_ITEMS}
                    value={filters.flag ?? 'all'}
                    onChange={(v) => setFilter({ flag: v && v !== 'all' ? (v as PayrollFilters['flag']) : undefined })}
                    variant="outline"
                  />
                </div>
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-slate-500"
                    onClick={() => {
                      setFilters((prev) => ({ period: prev.period }));
                      setText('');
                    }}
                  >
                    <IconFilterOff className="size-4" />
                    پاک کردن فیلترها
                  </Button>
                )}
              </div>
              <Table
                rows={rows}
                rowKey={(l) => l.id}
                onRowClick={(l) => router.push(lineHref(l))}
                columns={[
                  {
                    key: 'user',
                    header: 'کاربر',
                    render: (l) => (
                      <PersonLabel
                        name={l.user.name}
                        picture={l.user.profilePicture}
                        detail={
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            {l.user.personnelCode && <bdi dir="ltr">{l.user.personnelCode}</bdi>}
                            {l.warnings.length > 0 && (
                              <>
                                {l.user.personnelCode && <span aria-hidden="true">|</span>}
                                <span title={l.warnings.join('\n')} className="inline-flex text-amber-600">
                                  <IconAlertTriangle className="size-3.5" />
                                </span>
                              </>
                            )}
                            {l.agreement === 'hybrid' && <Badge tone="info" size="sm">هیبرید</Badge>}
                            {l.agreement === 'flat' && <Badge tone="neutral" size="sm">ساده</Badge>}
                            {l.probation && <Badge tone="warning" size="sm">آزمایشی</Badge>}
                          </span>
                        }
                      />
                    ),
                  },
                  { key: 'days', header: 'روز کار', numeric: true, hideOnMobile: true, render: (l) => l.days.toLocaleString('fa-IR') },
                  { key: 'gross', header: <WithUnit>حقوق و مزایا</WithUnit>, numeric: true, render: (l) => <CopyAmount value={l.gross} /> },
                  { key: 'deductions', header: <WithUnit>کسورات</WithUnit>, numeric: true, hideOnMobile: true, render: (l) => <CopyAmount value={l.totalDeductions} /> },
                  { key: 'net', header: <WithUnit>خالص</WithUnit>, numeric: true, render: (l) => <strong><CopyAmount value={l.net} /></strong> },
                  { key: 'cost', header: <WithUnit>هزینه‌ی کل</WithUnit>, numeric: true, hideOnMobile: true, render: (l) => <CopyAmount value={l.totalCost} /> },
                  {
                    key: 'actions',
                    header: '',
                    render: (l) => (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/dashboard/admin/financial/payroll/payslip/${l.id}`} target="_blank" aria-label="فیش حقوقی" title="فیش حقوقی">
                          <Button variant="outline" size="sm" className="!px-2 border-none text-sky-600" tabIndex={-1}>
                            <IconFileText className="size-4" />
                          </Button>
                        </Link>
                        <Link href={lineHref(l)} aria-label="ورودی‌ها و محاسبه" title="ورودی‌ها و محاسبه">
                          <Button variant="outline" size="sm" className="!px-2 border-none" tabIndex={-1}>
                            <IconPencil className="size-4" />
                          </Button>
                        </Link>
                        {l.status === 'draft' && (
                          <>
                            <Button variant="outline" size="sm" className="!px-2 border-none text-emerald-600" aria-label="قطعی کردن این ردیف" onClick={() => setFinalizingLine(l)}>
                              <IconCheck className="size-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="!px-2 border-none text-rose-500" aria-label="حذف ردیف" onClick={() => setRemoving(l)}>
                              <IconTrash className="size-4" />
                            </Button>
                          </>
                        )}
                        {l.status === 'final' && (
                          <>
                            <Badge tone="success">قطعی</Badge>
                            <Button variant="outline" size="sm" className="!px-2 border-none text-amber-600" aria-label="بازکردن قطعی این ردیف" title="بازکردن قطعی" onClick={() => setReopening(l)}>
                              <IconLockOpen className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
              {!rows.length && <p className="py-6 text-center text-sm text-slate-400">موردی پیدا نشد.</p>}
            </div>
          </div>
        )}
      </DataView>

      <ConfirmModal
        isOpen={finalizing}
        onClose={() => setFinalizing(false)}
        onConfirm={handleFinalize}
        title="قطعی کردن ماه"
        message={`همه‌ی ردیف‌های پیش‌نویس ${periodLabel(period)} قطعی می‌شوند و دیگر تغییر نمی‌کنند، حتی اگر تنظیمات یا حقوق‌ها عوض شود. ادامه می‌دهید؟`}
        confirmButtonText="قطعی کردن"
        isLoading={finalize.isLoading}
      />
      {bankOpen && <BankModal period={period} onClose={() => setBankOpen(false)} />}

      {reopening && (
        <ReopenModal
          title={reopening === 'month' ? `بازکردن قطعی ${periodLabel(period)}` : `بازکردن قطعی ${reopening.user.name ?? ''}`}
          message={
            reopening === 'month'
              ? 'همه‌ی ردیف‌های قطعی این ماه به پیش‌نویس برمی‌گردند تا اصلاح شوند. بعد از اصلاح باید دوباره قطعی کنید؛ فیش‌هایی که قبلاً داده‌اید با علامت «بازنگری‌شده» مشخص می‌شوند.'
              : 'این ردیف به پیش‌نویس برمی‌گردد تا اصلاح شود. بعد از اصلاح باید دوباره قطعی کنید و فیشش با علامت «بازنگری‌شده» مشخص می‌شود.'
          }
          busy={reopenLine.isLoading || reopenMonth.isLoading}
          onConfirm={handleReopen}
          onClose={() => setReopening(null)}
        />
      )}

      <ConfirmModal
        isOpen={finalizingLine !== null}
        onClose={() => setFinalizingLine(null)}
        onConfirm={handleFinalizeLine ?? (() => undefined)}
        title="قطعی کردن حقوق یک نفر"
        message={`حقوق «${finalizingLine?.user.name ?? ''}» برای ${periodLabel(period)} قطعی شود؟ از این پس تغییر نمی‌کند، حتی اگر تنظیمات یا حقوق عوض شود؛ بقیه‌ی ماه باز می‌ماند.`}
        confirmButtonText="قطعی کردن"
        isLoading={finalizeLine.isLoading}
      />
      <ConfirmModal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove ?? (() => undefined)}
        title="حذف ردیف"
        message={`ردیف «${removing?.user.name ?? ''}» برای ${periodLabel(period)} حذف شود؟ دوباره با «ساخت ردیف‌ها» ساخته می‌شود.`}
        confirmButtonText="حذف"
        isLoading={remove.isLoading}
      />
    </div>
  );
}

function Tile({ label, value, unit, strong }: { label: string; value: string; unit?: boolean; strong?: boolean }) {
  return (
    <div className="ui-surface p-2.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 tabular-nums ${strong ? 'text-base font-bold text-slate-900' : 'text-base font-semibold text-slate-700'}`}>
        {value} {unit && <span className="text-[10px] font-normal text-slate-400">ریال</span>}
      </div>
    </div>
  );
}
