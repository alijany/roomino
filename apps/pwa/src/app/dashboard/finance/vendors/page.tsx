'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input, Modal } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, Pagination } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import {
  IconBuildingStore,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useAddPayeeAccount,
  useCreateVendor,
  useDeletePayeeAccount,
  useDeleteVendor,
  useVendors,
} from '../finance.api';
import {
  CURRENCY_LABELS,
  PAYEE_ACCOUNT_TYPE_LABELS,
  VENDOR_KIND_LABELS,
} from '../finance.constants';
import {
  Currency,
  PayeeAccountType,
  Vendor,
  VendorFilterDto,
  VendorKind,
} from '../finance.types';

/**
 * The طرف‌حساب directory. Saved bank details here pre-fill the request form,
 * which is what removes the "do you have their Sheba?" round trip.
 */
export default function VendorsPage() {
  const [filters, setFilters] = useState<VendorFilterDto>({ limit: 12 });
  const [formOpen, setFormOpen] = useState(false);
  const [accountFor, setAccountFor] = useState<Vendor | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Vendor | null>(null);

  const { data, error, isLoading, refresh } = useVendors(filters);
  const createVendor = useCreateVendor();
  const deleteVendor = useDeleteVendor();

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [kind, setKind] = useState<VendorKind>(VendorKind.DOMESTIC);
  const [currency, setCurrency] = useState<Currency>(Currency.IRR);
  const [economicCode, setEconomicCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const resetForm = () => {
    setName('');
    setNameEn('');
    setKind(VendorKind.DOMESTIC);
    setCurrency(Currency.IRR);
    setEconomicCode('');
    setContactName('');
    setContactPhone('');
  };

  const handleCreate = async () => {
    try {
      await createVendor.submit({
        name: name.trim(),
        nameEn: nameEn.trim() || undefined,
        kind,
        defaultCurrency: currency,
        economicCode: economicCode.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      toast.success('طرف‌حساب اضافه شد');
      resetForm();
      setFormOpen(false);
      refresh();
    } catch (createError) {
      toast.error((createError as Error)?.message ?? 'افزودن طرف‌حساب انجام نشد');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    try {
      const result = await deleteVendor.submit(pendingDelete.id);
      toast.success(
        result?.deactivated
          ? 'طرف‌حساب غیرفعال شد و سوابق آن حفظ ماند'
          : 'طرف‌حساب حذف شد'
      );
      refresh();
    } catch (deleteError) {
      toast.error((deleteError as Error)?.message ?? 'حذف انجام نشد');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.financeVendors.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconBuildingStore className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">طرف‌حساب‌ها</h1>
              <p className="text-sm text-slate-500">
                هرکسی که شرکت به او پرداخت می‌کند — از فیگما تا صاحب‌خانه.
              </p>
            </div>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <IconPlus className="size-4" />
              طرف‌حساب جدید
            </Button>
          </div>

          <div className="flex grow flex-col overflow-hidden rounded-2xl bg-white p-2">
            <div className="px-2 pt-2 sm:w-72">
              <Input
                icon={<IconSearch className="size-4 text-slate-400" />}
                placeholder="جستجوی نام"
                value={filters.text ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    text: e.target.value || undefined,
                    page: 0,
                  }))
                }
              />
            </div>

            <div className="overflow-auto p-2 lg:p-3">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="هنوز طرف‌حسابی ثبت نشده است. با ثبت هرکدام، اطلاعات حسابش در فرم درخواست خودکار پر می‌شود."
                onRetry={refresh}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data?.items.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-800">
                            {vendor.name}
                          </div>
                          {vendor.nameEn && (
                            <div dir="ltr" className="truncate text-xs text-slate-400">
                              {vendor.nameEn}
                            </div>
                          )}
                        </div>
                        <Badge
                          tone={vendor.kind === VendorKind.FOREIGN ? 'info' : 'neutral'}
                          withDot={false}
                        >
                          {VENDOR_KIND_LABELS[vendor.kind]}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-500">
                        {CURRENCY_LABELS[vendor.defaultCurrency]}
                        {vendor.contactName ? ` · ${vendor.contactName}` : ''}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {vendor.accounts.length === 0 ? (
                          <span className="text-xs text-amber-600">
                            حساب مقصدی ثبت نشده
                          </span>
                        ) : (
                          vendor.accounts.map((account) => (
                            <Badge key={account.id} tone="neutral" withDot={false}>
                              {account.label}
                              {account.isDefault ? ' ★' : ''}
                            </Badge>
                          ))
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAccountFor(vendor)}
                        >
                          افزودن حساب
                        </Button>
                        <div className="flex items-center gap-1">
                          {!vendor.active && (
                            <Badge tone="muted" withDot={false}>
                              غیرفعال
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            className="!px-2 border-none text-rose-500"
                            onClick={() => setPendingDelete(vendor)}
                            aria-label={`حذف ${vendor.name}`}
                          >
                            <IconTrash className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {data?.meta && data.meta.pageCount > 1 && (
                  <div className="pt-6">
                    <Pagination
                      itemPerPage={filters.limit || 12}
                      page={(filters.page || 0) + 1}
                      totalCount={data.meta.total}
                      onNavigate={(page) => {
                        setFilters((prev) => ({ ...prev, page: page - 1 }));
                        return '#';
                      }}
                    />
                  </div>
                )}
              </DataView>
            </div>
          </div>
        </div>

        {/* Create vendor */}
        <Modal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          className="bg-white lg:min-w-[480px]"
        >
          <div className="flex min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
              <h3 className="font-bold text-lg text-slate-800">طرف‌حساب جدید</h3>
              <Button variant="outline" className="!px-2" onClick={() => setFormOpen(false)}>
                <IconX className="size-5" />
              </Button>
            </div>

            <div className="min-h-0 grow space-y-4 overflow-y-auto p-5">
              <Input
                label="نام"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="نام لاتین (اختیاری)"
                dir="ltr"
                className="text-left"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block font-medium text-slate-700">نوع</label>
                  <Dropdown
                    items={Object.values(VendorKind).map((value) => ({
                      label: VENDOR_KIND_LABELS[value],
                      value,
                    }))}
                    value={kind}
                    onChange={(value) => setKind(value as VendorKind)}
                    variant="outline"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-medium text-slate-700">
                    واحد پول پیش‌فرض
                  </label>
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

              <Input
                label="کد اقتصادی (اختیاری)"
                dir="ltr"
                className="text-left"
                value={economicCode}
                onChange={(e) => setEconomicCode(e.target.value)}
              />
              <Input
                label="نام رابط (اختیاری)"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
              <Input
                label="شماره تماس (اختیاری)"
                dir="ltr"
                className="text-left"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div className="flex shrink-0 gap-3 border-t border-slate-100 p-5">
              <Button
                className="flex-1"
                disabled={!name.trim() || createVendor.isLoading}
                onClick={handleCreate}
              >
                {createVendor.isLoading ? 'در حال ذخیره...' : 'افزودن'}
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

        <PayeeAccountModal
          vendor={accountFor}
          onClose={() => setAccountFor(null)}
          onSaved={refresh}
        />

        <ConfirmModal
          isOpen={pendingDelete !== null}
          onClose={() => setPendingDelete(null)}
          onConfirm={handleDelete}
          title="حذف طرف‌حساب"
          message={`طرف‌حساب «${pendingDelete?.name ?? ''}» حذف شود؟ درخواست‌های قبلی حفظ می‌شوند، اما این طرف‌حساب دیگر قابل انتخاب نیست.`}
          confirmButtonText="حذف"
          cancelButtonText="بازگشت"
        />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function PayeeAccountModal({
  vendor,
  onClose,
  onSaved,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const add = useAddPayeeAccount();
  const remove = useDeletePayeeAccount();

  const [label, setLabel] = useState('');
  const [type, setType] = useState<PayeeAccountType>(PayeeAccountType.SHEBA);
  const [holderName, setHolderName] = useState('');
  const [value, setValue] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  const reset = () => {
    setLabel('');
    setType(PayeeAccountType.SHEBA);
    setHolderName('');
    setValue('');
    setIsDefault(true);
  };

  const handleAdd = async () => {
    if (!vendor) return;

    const trimmed = value.replace(/\s/g, '');

    try {
      await add.submit({
        vendorId: vendor.id,
        data: {
          label: label.trim(),
          type,
          holderName: holderName.trim() || undefined,
          sheba: type === PayeeAccountType.SHEBA ? trimmed.toUpperCase() : undefined,
          cardNumber: type === PayeeAccountType.CARD ? trimmed : undefined,
          iban: type === PayeeAccountType.IBAN_SWIFT ? trimmed.toUpperCase() : undefined,
          details: [PayeeAccountType.PAYPAL, PayeeAccountType.OTHER].includes(type)
            ? value.trim()
            : undefined,
          isDefault,
        },
      });
      toast.success('حساب مقصد اضافه شد');
      reset();
      onSaved();
      onClose();
    } catch (addError) {
      toast.error((addError as Error)?.message ?? 'افزودن حساب انجام نشد');
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await remove.submit(id);
      toast.success('حساب مقصد حذف شد');
      onSaved();
      onClose();
    } catch (removeError) {
      toast.error((removeError as Error)?.message ?? 'حذف انجام نشد');
    }
  };

  return (
    <Modal
      isOpen={vendor !== null}
      onClose={onClose}
      className="bg-white lg:min-w-[480px]"
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <h3 className="font-bold text-lg text-slate-800">
            حساب‌های مقصد {vendor?.name}
          </h3>
          <Button variant="outline" className="!px-2" onClick={onClose}>
            <IconX className="size-5" />
          </Button>
        </div>

        <div className="min-h-0 grow space-y-4 overflow-y-auto p-5">
          {vendor && vendor.accounts.length > 0 && (
            <ul className="space-y-2">
              {vendor.accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"
                >
                  <div className="grow min-w-0">
                    <div className="font-medium text-slate-800">
                      {account.label}
                      {account.isDefault && (
                        <span className="mr-2 text-xs text-slate-400">پیش‌فرض</span>
                      )}
                    </div>
                    <div dir="ltr" className="truncate font-mono text-xs text-slate-500">
                      {account.sheba || account.cardNumber || account.iban || account.details}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="!px-2 border-none text-rose-500"
                    onClick={() => handleRemove(account.id)}
                    aria-label={`حذف ${account.label}`}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <Input
              label="عنوان حساب"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثلاً حساب اصلی"
            />

            <div>
              <label className="mb-2 block font-medium text-slate-700">نوع حساب</label>
              <Dropdown
                items={Object.values(PayeeAccountType).map((item) => ({
                  label: PAYEE_ACCOUNT_TYPE_LABELS[item],
                  value: item,
                }))}
                value={type}
                onChange={(next) => setType(next as PayeeAccountType)}
                variant="outline"
              />
            </div>

            <Input
              label="نام صاحب حساب"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
            />

            <Input
              label={PAYEE_ACCOUNT_TYPE_LABELS[type]}
              dir="ltr"
              className="text-left"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              حساب پیش‌فرض این طرف‌حساب باشد
            </label>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-100 p-5">
          <Button
            className="flex-1"
            disabled={!label.trim() || !value.trim() || add.isLoading}
            onClick={handleAdd}
          >
            {add.isLoading ? 'در حال ذخیره...' : 'افزودن حساب'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </Modal>
  );
}
