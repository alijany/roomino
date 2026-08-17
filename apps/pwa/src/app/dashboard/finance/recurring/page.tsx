'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { formatForeign, formatMoney } from '@/libs/format/format.util';
import { cn } from '@/libs/style/style.util.helpers';
import { Button, CurrencyInput, Dropdown, Input, Modal } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, DatePickerField, Table, TableColumn } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconPlus, IconRepeat, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useCreateRecurring,
  useDeleteRecurring,
  useExpenseCategories,
  useGenerateRecurring,
  useRecurringExpenses,
  useSkipRecurring,
  useVendors,
} from '../finance.api';
import {
  BILLING_CALENDAR_LABELS,
  CURRENCY_LABELS,
  RECURRENCE_CYCLE_LABELS,
} from '../finance.constants';
import {
  BillingCalendar,
  Currency,
  RecurrenceCycle,
  RecurringExpense,
} from '../finance.types';
import { describeDueDate, formatJalali } from '../finance.util';

/**
 * هزینه‌های دوره‌ای — the schedules behind renewals.
 *
 * Nothing is paid from here: each cycle produces an ordinary payment request
 * that follows the same approval path as everything else.
 */
export default function RecurringPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RecurringExpense | null>(null);

  const { data, error, isLoading, refresh } = useRecurringExpenses({ limit: 50 });
  const generate = useGenerateRecurring();
  const skip = useSkipRecurring();
  const remove = useDeleteRecurring();

  const act = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast.success(message);
      refresh();
    } catch (actionError) {
      toast.error((actionError as Error)?.message ?? 'عملیات انجام نشد');
    }
  };

  const columns: TableColumn<RecurringExpense>[] = [
    {
      key: 'title',
      header: 'عنوان',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-slate-800">{row.title}</span>
          <span className="text-xs text-slate-500">
            {row.vendor?.name}
            {row.category ? ` · ${row.category.name}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'مبلغ هر دوره',
      numeric: true,
      render: (row) => (
        <span className="font-semibold text-slate-800">
          {row.currency === Currency.IRR
            ? formatMoney(row.amountRial ?? row.amountMinor)
            : formatForeign(row.amountMinor, row.currency)}
        </span>
      ),
    },
    {
      key: 'cycle',
      header: 'دوره',
      render: (row) => (
        <span className="text-slate-600">
          {RECURRENCE_CYCLE_LABELS[row.cycle]}
          {row.cycle === RecurrenceCycle.CUSTOM_DAYS && row.cycleDays
            ? ` (${row.cycleDays.toLocaleString('fa-IR')} روز)`
            : ''}
          <span className="mr-1 text-xs text-slate-400">
            {BILLING_CALENDAR_LABELS[row.calendar]}
          </span>
        </span>
      ),
    },
    {
      key: 'next',
      header: 'سررسید بعدی',
      numeric: true,
      render: (row) => (
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-slate-700">{formatJalali(row.nextDueDate)}</span>
          <span className="text-xs text-slate-500">
            {describeDueDate({ dueDate: row.nextDueDate, status: 'approved' as never })}
          </span>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'مسئول',
      render: (row) => (
        <span className="text-slate-600">{row.owner?.name || '—'}</span>
      ),
    },
    {
      key: 'state',
      header: 'وضعیت',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={row.active ? 'success' : 'muted'}>
            {row.active ? 'فعال' : 'غیرفعال'}
          </Badge>
          {!row.autoGenerate && (
            <Badge tone="warning" withDot={false}>
              فقط یادآوری
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'اقدام',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={generate.isLoading}
            onClick={() =>
              act(() => generate.submit(row.id), 'درخواست این دوره ساخته شد')
            }
          >
            ساخت درخواست
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={skip.isLoading}
            onClick={() => act(() => skip.submit(row.id), 'این دوره رد شد')}
          >
            رد این دوره
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-none text-rose-500"
            onClick={() => setPendingDelete(row)}
          >
            حذف
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.financeRecurring.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconRepeat className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">هزینه‌های دوره‌ای</h1>
              <p className="text-sm text-slate-500">
                اشتراک‌ها و قبض‌هایی که هر دوره تکرار می‌شوند. یادآوری برای مسئول هر
                مورد ارسال می‌شود.
              </p>
            </div>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <IconPlus className="size-4" />
              هزینه دوره‌ای جدید
            </Button>
          </div>

          <div className="flex grow flex-col overflow-hidden rounded-2xl bg-white p-2">
            <div className="overflow-auto p-2 lg:p-3">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="هنوز هزینه دوره‌ای ثبت نشده است. با ثبت هر اشتراک، پیش از تمدید به مسئول آن یادآوری می‌شود."
                onRetry={refresh}
              >
                <Table
                  columns={columns}
                  rows={data?.items ?? []}
                  rowKey={(row) => row.id}
                />
              </DataView>
            </div>
          </div>
        </div>

        <RecurringForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={refresh}
        />

        <ConfirmModal
          isOpen={pendingDelete !== null}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            if (!pendingDelete) return;
            await act(
              () => remove.submit(pendingDelete.id),
              'هزینه دوره‌ای حذف یا غیرفعال شد'
            );
            setPendingDelete(null);
          }}
          title="حذف هزینه دوره‌ای"
          message={`«${pendingDelete?.title ?? ''}» حذف شود؟ اگر قبلاً درخواستی ساخته باشد، به جای حذف غیرفعال می‌شود تا سوابق حفظ بماند.`}
          confirmButtonText="حذف"
          cancelButtonText="بازگشت"
        />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function RecurringForm({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: vendorsData } = useVendors({ activeOnly: true, limit: 100 });
  const { data: categoriesData } = useExpenseCategories();
  const create = useCreateRecurring();

  const [title, setTitle] = useState('');
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [currency, setCurrency] = useState<Currency>(Currency.IRR);
  const [cycle, setCycle] = useState<RecurrenceCycle>(RecurrenceCycle.MONTHLY);
  const [cycleDays, setCycleDays] = useState<number | null>(null);
  const [calendar, setCalendar] = useState<BillingCalendar>(BillingCalendar.GREGORIAN);
  const [nextDueDate, setNextDueDate] = useState<Date>(
    new Date(Date.now() + 30 * 86_400_000)
  );

  const vendors = vendorsData?.items ?? [];
  const selectedVendor = vendors.find((v) => v.id === vendorId);
  const defaultAccount = selectedVendor?.accounts.find((a) => a.isDefault);

  const isIrr = currency === Currency.IRR;
  const valid =
    title.trim().length > 0 && vendorId && categoryId && (amountMinor ?? 0) > 0;

  const handleCreate = async () => {
    if (!valid) return;

    try {
      await create.submit({
        title: title.trim(),
        vendorId: vendorId as number,
        categoryId: categoryId as number,
        payeeAccountId: defaultAccount?.id,
        amountMinor: amountMinor as number,
        currency,
        cycle,
        cycleDays: cycle === RecurrenceCycle.CUSTOM_DAYS ? cycleDays ?? 30 : undefined,
        calendar,
        nextDueDate: nextDueDate.toISOString(),
      });
      toast.success('هزینه دوره‌ای ثبت شد');
      onSaved();
      onClose();
    } catch (createError) {
      toast.error((createError as Error)?.message ?? 'ثبت انجام نشد');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="bg-white lg:min-w-[520px]">
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <h3 className="font-bold text-lg text-slate-800">هزینه دوره‌ای جدید</h3>
          <Button variant="outline" className="!px-2" onClick={onClose}>
            <IconX className="size-5" />
          </Button>
        </div>

        <div className="min-h-0 grow space-y-4 overflow-y-auto p-5">
          <Input
            label="عنوان"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً اشتراک سالانه Figma"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium text-slate-700">طرف‌حساب</label>
              <Dropdown
                items={vendors.map((v) => ({ label: v.name, value: v.id }))}
                value={vendorId}
                onChange={(value) => {
                  const next = value as number;
                  setVendorId(next);
                  const vendor = vendors.find((v) => v.id === next);
                  if (vendor) setCurrency(vendor.defaultCurrency);
                }}
                placeholder="انتخاب طرف‌حساب"
                variant="outline"
              />
            </div>
            <div>
              <label className="mb-2 block font-medium text-slate-700">دسته هزینه</label>
              <Dropdown
                items={(categoriesData?.items ?? []).map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
                value={categoryId}
                onChange={(value) => setCategoryId(value as number)}
                placeholder="انتخاب دسته"
                variant="outline"
              />
            </div>
          </div>

          {selectedVendor && selectedVendor.accounts.length === 0 && (
            <p className="text-sm text-amber-600">
              این طرف‌حساب هنوز حساب مقصدی ندارد. می‌توانید ادامه دهید، اما پیش از
              پرداخت باید اطلاعات حساب را اضافه کنید.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium text-slate-700">واحد پول</label>
              <Dropdown
                items={Object.values(Currency).map((c) => ({
                  label: CURRENCY_LABELS[c],
                  value: c,
                }))}
                value={currency}
                onChange={(value) => setCurrency(value as Currency)}
                variant="outline"
              />
            </div>

            {isIrr ? (
              <CurrencyInput
                label="مبلغ هر دوره (تومان)"
                unit="toman"
                value={amountMinor}
                onValueChange={setAmountMinor}
              />
            ) : (
              <Input
                label={`مبلغ هر دوره (${currency})`}
                type="number"
                dir="ltr"
                className="text-left"
                value={amountMinor ? amountMinor / 100 : ''}
                onChange={(e) =>
                  setAmountMinor(
                    e.target.value ? Math.round(Number(e.target.value) * 100) : null
                  )
                }
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium text-slate-700">دوره تکرار</label>
              <Dropdown
                items={Object.values(RecurrenceCycle).map((c) => ({
                  label: RECURRENCE_CYCLE_LABELS[c],
                  value: c,
                }))}
                value={cycle}
                onChange={(value) => setCycle(value as RecurrenceCycle)}
                variant="outline"
              />
            </div>

            {cycle === RecurrenceCycle.CUSTOM_DAYS ? (
              <Input
                label="هر چند روز؟"
                type="number"
                dir="ltr"
                className="text-left"
                value={cycleDays ?? ''}
                onChange={(e) => setCycleDays(Number(e.target.value) || null)}
              />
            ) : (
              <div>
                <label className="mb-2 block font-medium text-slate-700">تقویم</label>
                <Dropdown
                  items={Object.values(BillingCalendar).map((c) => ({
                    label: BILLING_CALENDAR_LABELS[c],
                    value: c,
                  }))}
                  value={calendar}
                  onChange={(value) => setCalendar(value as BillingCalendar)}
                  variant="outline"
                />
              </div>
            )}
          </div>

          <p className={cn('text-xs text-slate-500')}>
            سرویس‌های خارجی معمولاً بر تقویم میلادی صورت‌حساب می‌دهند و اجاره و خدمات
            داخلی بر تقویم شمسی.
          </p>

          <div>
            <label className="mb-2 block font-medium text-slate-700">
              سررسید بعدی
            </label>
            <DatePickerField
              label="سررسید"
              value={nextDueDate}
              minSelectableDate={new Date(Date.now() - 86_400_000)}
              onSelect={setNextDueDate}
            />
          </div>

          <p className="text-xs text-slate-500">
            هفت روز پیش از سررسید، درخواست پرداخت به‌صورت خودکار ساخته می‌شود و
            یادآوری‌ها از ۳۰ روز قبل برای مسئول ارسال می‌شوند.
          </p>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-100 p-5">
          <Button
            className="flex-1"
            disabled={!valid || create.isLoading}
            onClick={handleCreate}
          >
            {create.isLoading ? 'در حال ذخیره...' : 'ثبت هزینه دوره‌ای'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </div>
      </div>
    </Modal>
  );
}
