'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input, Modal } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconBuildingBank, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useCreatePaymentSource,
  useDeletePaymentSource,
  usePaymentSources,
} from '../finance.api';
import { CURRENCY_LABELS, PAYMENT_SOURCE_TYPE_LABELS } from '../finance.constants';
import { Currency, PaymentSourceType } from '../finance.types';

/**
 * The company's own accounts. Finance-only, and enforced on the server too —
 * this page shows banking details that no other role has a reason to see.
 */
export default function PaymentSourcesPage() {
  const { data, error, isLoading, refresh } = usePaymentSources(false);
  const create = useCreatePaymentSource();
  const remove = useDeletePaymentSource();

  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const [label, setLabel] = useState('');
  const [type, setType] = useState<PaymentSourceType>(PaymentSourceType.BANK_ACCOUNT);
  const [bankName, setBankName] = useState('');
  const [sheba, setSheba] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.IRR);

  const resetForm = () => {
    setLabel('');
    setType(PaymentSourceType.BANK_ACCOUNT);
    setBankName('');
    setSheba('');
    setCardLast4('');
    setAccountHolder('');
    setCurrency(Currency.IRR);
  };

  const handleCreate = async () => {
    try {
      await create.submit({
        label: label.trim(),
        type,
        bankName: bankName.trim() || undefined,
        sheba: sheba.replace(/\s/g, '').toUpperCase() || undefined,
        cardLast4: cardLast4 || undefined,
        accountHolder: accountHolder.trim() || undefined,
        currency,
      });
      toast.success('منبع پرداخت اضافه شد');
      resetForm();
      setFormOpen(false);
      refresh();
    } catch (createError) {
      toast.error((createError as Error)?.message ?? 'افزودن منبع پرداخت انجام نشد');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    try {
      await remove.submit(pendingDelete);
      toast.success('منبع پرداخت حذف یا غیرفعال شد');
      refresh();
    } catch (deleteError) {
      toast.error((deleteError as Error)?.message ?? 'حذف انجام نشد');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.financeSources.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-hidden">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconBuildingBank className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">منابع پرداخت</h1>
              <p className="text-sm text-slate-500">
                حساب‌هایی که پرداخت‌های شرکت از آن‌ها انجام می‌شود.
              </p>
            </div>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <IconPlus className="size-4" />
              افزودن منبع
            </Button>
          </div>

          <div className="flex grow flex-col overflow-hidden rounded-2xl bg-white p-2">
            <div className="overflow-auto p-2 lg:p-3">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="هنوز منبع پرداختی ثبت نشده است. برای ثبت پرداخت‌ها حداقل به یکی نیاز دارید."
                onRetry={refresh}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data?.items.map((source) => (
                    <div
                      key={source.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-800">{source.label}</div>
                          <div className="text-xs text-slate-500">
                            {PAYMENT_SOURCE_TYPE_LABELS[source.type]}
                            {source.bankName ? ` — ${source.bankName}` : ''}
                          </div>
                        </div>
                        <Badge tone={source.active ? 'success' : 'muted'}>
                          {source.active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </div>

                      {source.sheba && (
                        <div dir="ltr" className="font-mono text-xs text-slate-500">
                          {source.sheba}
                        </div>
                      )}
                      {source.cardLast4 && (
                        <div dir="ltr" className="font-mono text-xs text-slate-500">
                          •••• {source.cardLast4}
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-400">
                          {CURRENCY_LABELS[source.currency]}
                        </span>
                        <Button
                          variant="outline"
                          className="!px-2 border-none text-rose-500"
                          onClick={() => setPendingDelete(source.id)}
                          aria-label={`حذف ${source.label}`}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DataView>
            </div>
          </div>
        </div>

        <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} className="bg-white lg:min-w-[480px]">
          <div className="flex min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
              <h3 className="font-bold text-lg text-slate-800">افزودن منبع پرداخت</h3>
              <Button variant="outline" className="!px-2" onClick={() => setFormOpen(false)}>
                <IconX className="size-5" />
              </Button>
            </div>

            <div className="min-h-0 grow space-y-4 overflow-y-auto p-5">
              <Input
                label="عنوان"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="مثلاً حساب جاری بانک ملت"
                required
              />

              <div>
                <label className="mb-2 block font-medium text-slate-700">نوع</label>
                <Dropdown
                  items={Object.values(PaymentSourceType).map((value) => ({
                    label: PAYMENT_SOURCE_TYPE_LABELS[value],
                    value,
                  }))}
                  value={type}
                  onChange={(value) => setType(value as PaymentSourceType)}
                  variant="outline"
                />
              </div>

              <Input
                label="نام بانک"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />

              <Input
                label="شماره شبا"
                dir="ltr"
                className="text-left"
                value={sheba}
                onChange={(e) => setSheba(e.target.value)}
                placeholder="IR000000000000000000000000"
              />

              <Input
                label="چهار رقم آخر کارت"
                dir="ltr"
                className="text-left"
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                labelRight={
                  <span className="text-xs font-normal text-slate-400">
                    شماره کامل کارت ذخیره نمی‌شود
                  </span>
                }
              />

              <Input
                label="صاحب حساب"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
              />

              <div>
                <label className="mb-2 block font-medium text-slate-700">واحد پول</label>
                <Dropdown
                  items={Object.values(Currency).map((value) => ({
                    label: CURRENCY_LABELS[value],
                    value,
                  }))}
                  value={currency}
                  onChange={(value) => setCurrency(value as Currency)}
                  variant="outline"
                />
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-slate-100 p-5">
              <Button
                className="flex-1"
                disabled={!label.trim() || create.isLoading}
                onClick={handleCreate}
              >
                {create.isLoading ? 'در حال ذخیره...' : 'افزودن'}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 bg-slate-100"
                onClick={() => setFormOpen(false)}
              >
                لغو
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmModal
          isOpen={pendingDelete !== null}
          onClose={() => setPendingDelete(null)}
          onConfirm={handleDelete}
          title="حذف منبع پرداخت"
          message="اگر با این منبع پرداختی ثبت شده باشد، به جای حذف غیرفعال می‌شود تا سوابق مالی دست‌نخورده بماند."
          confirmButtonText="حذف"
          cancelButtonText="بازگشت"
        />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
