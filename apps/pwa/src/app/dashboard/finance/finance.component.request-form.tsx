'use client';

import { formatMoney } from '@/libs/format/format.util';
import { cn } from '@/libs/style/style.util.helpers';
import { Button, CurrencyInput, Dropdown, Input, Modal } from '@/ui/atoms';
import { DatePickerField } from '@/ui/molecules';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import {
  useApprovalPreview,
  useCreateRequest,
  useExpenseCategories,
  useSubmitRequest,
  useUpdateRequest,
  useVendors,
} from './finance.api';
import { AttachmentPanel } from './finance.component.attachments';
import { CURRENCY_LABELS, PAYEE_ACCOUNT_TYPE_LABELS } from './finance.constants';
import {
  Currency,
  PayeeAccountType,
  PaymentRequestDetail,
  RequestOrigin,
} from './finance.types';
import { describeChain } from './finance.util';

const STEPS = ['مبلغ و موضوع', 'حساب مقصد', 'مدارک', 'بازبینی'] as const;

interface RequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Present when correcting a returned request instead of creating a new one. */
  existing?: PaymentRequestDetail;
  /** Set for a company-level payment raised by Finance. */
  origin?: RequestOrigin;
}

/**
 * Three questions, then a review — the order a person actually thinks in:
 * what and how much, who gets paid, what proves it.
 *
 * The draft is created on the server before the documents step, because
 * attachments need something to hang off. That also means an interrupted form
 * survives as a draft rather than evaporating.
 */
export function RequestForm({
  isOpen,
  onClose,
  onSuccess,
  existing,
  origin,
}: RequestFormProps) {
  const [step, setStep] = useState(0);
  const [requestId, setRequestId] = useState<number | undefined>(existing?.id);
  const [resultOpen, setResultOpen] = useState(false);
  const [errorText, setErrorText] = useState<string>();

  // step 1
  const [categoryId, setCategoryId] = useState<number | null>(
    existing?.category?.id ?? null
  );
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [currency, setCurrency] = useState<Currency>(
    existing?.currency ?? Currency.IRR
  );
  const [amountMinor, setAmountMinor] = useState<number | null>(
    existing?.amountMinor ?? null
  );
  const [dueDate, setDueDate] = useState<Date>(
    existing ? new Date(existing.dueDate) : new Date(Date.now() + 7 * 86_400_000)
  );

  // step 2
  const [payeeName, setPayeeName] = useState(existing?.payeeName ?? '');
  const [payeeAccountType, setPayeeAccountType] = useState<PayeeAccountType>(
    existing?.payeeAccountType ?? PayeeAccountType.SHEBA
  );
  const [payeeAccountHolder, setPayeeAccountHolder] = useState(
    existing?.payeeAccountHolder ?? ''
  );
  const [payeeSheba, setPayeeSheba] = useState(existing?.payeeSheba ?? '');
  const [payeeCardNumber, setPayeeCardNumber] = useState(
    existing?.payeeCardNumber ?? ''
  );
  const [payeeAccountDetails, setPayeeAccountDetails] = useState(
    existing?.payeeAccountDetails ?? ''
  );

  const [vendorId, setVendorId] = useState<number | null>(null);
  const [payeeAccountId, setPayeeAccountId] = useState<number | null>(null);

  const { data: categoriesData } = useExpenseCategories();
  const categories = categoriesData?.items ?? [];
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const { data: vendorsData } = useVendors({ activeOnly: true, limit: 100 });
  const vendors = vendorsData?.items ?? [];
  const selectedVendor = vendors.find((v) => v.id === vendorId);
  const defaultAccount =
    selectedVendor?.accounts.find((a) => a.isDefault) ?? selectedVendor?.accounts[0];

  /**
   * Copies the vendor's saved details into the form. They are *copied*, not
   * referenced: the request stores what it was paid to, so a later edit to the
   * vendor never rewrites a historical payment.
   */
  const applyVendor = (id: number) => {
    if (!id) {
      setVendorId(null);
      setPayeeAccountId(null);
      return;
    }

    const vendor = vendors.find((v) => v.id === id);
    if (!vendor) return;

    const account = vendor.accounts.find((a) => a.isDefault) ?? vendor.accounts[0];

    setVendorId(id);
    setPayeeAccountId(account?.id ?? null);
    setPayeeName(vendor.name);
    setCurrency(vendor.defaultCurrency);

    if (account) {
      setPayeeAccountType(account.type);
      setPayeeAccountHolder(account.holderName ?? '');
      setPayeeSheba(account.sheba ?? '');
      setPayeeCardNumber(account.cardNumber ?? '');
      setPayeeAccountDetails(
        account.details ?? [account.iban, account.swift].filter(Boolean).join(' / ')
      );
    }
  };

  const create = useCreateRequest();
  const update = useUpdateRequest(requestId ?? 0);
  const submitRequest = useSubmitRequest();
  const preview = useApprovalPreview();

  const isIrr = currency === Currency.IRR;

  // Show the approver chain as soon as there's an amount to route — before the
  // user invests effort in the rest of the form.
  useEffect(() => {
    if (!isOpen || !amountMinor || amountMinor <= 0) return;

    const timer = setTimeout(() => {
      preview
        .submit({ amountMinor, currency, categoryId: categoryId ?? undefined })
        .catch(() => {
          // A preview that fails is not worth interrupting the form for.
        });
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountMinor, currency, categoryId, isOpen]);

  const shebaError = useMemo(() => {
    if (payeeAccountType !== PayeeAccountType.SHEBA || !payeeSheba) return undefined;
    const normalised = payeeSheba.replace(/\s/g, '').toUpperCase();
    if (!/^IR\d{24}$/.test(normalised)) {
      return 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد.';
    }
    return undefined;
  }, [payeeAccountType, payeeSheba]);

  const step1Valid =
    Boolean(categoryId) && title.trim().length > 0 && (amountMinor ?? 0) > 0;

  const step2Valid = payeeName.trim().length > 0 && !shebaError;

  const payload = () => ({
    title: title.trim(),
    description: description.trim() || undefined,
    categoryId: categoryId as number,
    amountMinor: amountMinor as number,
    currency,
    vendorId: vendorId ?? undefined,
    payeeAccountId: payeeAccountId ?? undefined,
    payeeName: payeeName.trim(),
    payeeAccountType,
    payeeAccountHolder: payeeAccountHolder.trim() || undefined,
    payeeSheba: payeeSheba.replace(/\s/g, '').toUpperCase() || undefined,
    payeeCardNumber: payeeCardNumber.replace(/\s/g, '') || undefined,
    payeeAccountDetails: payeeAccountDetails.trim() || undefined,
    dueDate: dueDate.toISOString(),
    ...(origin ? { origin } : {}),
  });

  /** Persists steps 1–2 so the documents step has something to attach to. */
  const saveDraft = async () => {
    setErrorText(undefined);

    try {
      if (requestId) {
        await update.submit(payload());
      } else {
        const created = await create.submit(payload());
        setRequestId(created.id);
      }
      setStep(2);
    } catch (error) {
      setErrorText((error as Error)?.message ?? 'ذخیره پیش‌نویس انجام نشد');
      setResultOpen(true);
    }
  };

  const finalSubmit = async () => {
    if (!requestId) return;
    setErrorText(undefined);

    try {
      await submitRequest.submit({ id: requestId });
      onSuccess();
      handleClose();
    } catch (error) {
      setErrorText((error as Error)?.message ?? 'ارسال درخواست انجام نشد');
      setResultOpen(true);
    }
  };

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  const busy = create.isLoading || update.isLoading || submitRequest.isLoading;

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} className="bg-white lg:min-w-[620px]">
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold text-lg text-slate-800">
                {existing ? 'اصلاح درخواست پرداخت' : 'درخواست پرداخت جدید'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                گام {(step + 1).toLocaleString('fa-IR')} از {STEPS.length.toLocaleString('fa-IR')} — {STEPS[step]}
              </p>
            </div>
            <Button variant="outline" className="!px-2" onClick={handleClose}>
              <IconX className="size-5" />
            </Button>
          </div>

          {/* Step rail */}
          <div className="flex gap-1 px-5 pt-4">
            {STEPS.map((label, index) => (
              <div key={label} className="flex-1">
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors',
                    index <= step ? 'bg-primary' : 'bg-slate-200'
                  )}
                />
              </div>
            ))}
          </div>

          <div className="grow overflow-y-auto p-5 space-y-4">
            {step === 0 && (
              <>
                <div>
                  <label className="mb-2 block font-medium text-slate-700">
                    دسته هزینه
                  </label>
                  <Dropdown
                    items={categories.map((c) => ({ label: c.name, value: c.id }))}
                    value={categoryId}
                    onChange={(value) => setCategoryId(value as number)}
                    placeholder="یک دسته انتخاب کنید"
                    variant="outline"
                  />
                </div>

                <Input
                  label="عنوان درخواست"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً تمدید اشتراک سالانه Figma"
                  required
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block font-medium text-slate-700">
                      واحد پول
                    </label>
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
                      label="مبلغ (تومان)"
                      unit="toman"
                      value={amountMinor}
                      onValueChange={setAmountMinor}
                      placeholder="0"
                    />
                  ) : (
                    <Input
                      label={`مبلغ (${currency})`}
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

                <p className="text-xs text-slate-500">
                  مبلغ را همان‌طور که در فاکتور آمده وارد کنید.
                  {!isIrr && ' نرخ نهایی تبدیل را مالی هنگام پرداخت تعیین می‌کند.'}
                </p>

                <div>
                  <label className="mb-2 block font-medium text-slate-700">
                    تا چه تاریخی باید پرداخت شود؟
                  </label>
                  <DatePickerField
                    label="مهلت پرداخت"
                    value={dueDate}
                    minSelectableDate={new Date(Date.now() - 86_400_000)}
                    onSelect={setDueDate}
                  />
                </div>

                <Input
                  textarea
                  rows={3}
                  label="توضیح (اختیاری)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="چرا به این پرداخت نیاز است؟"
                />

                {preview.data && (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-sm text-sky-800">
                    <span className="font-medium">مسیر تأیید: </span>
                    {describeChain(preview.data.chain)}
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                {vendors.length > 0 && (
                  <div>
                    <label className="mb-2 block font-medium text-slate-700">
                      از طرف‌حساب‌های ثبت‌شده
                    </label>
                    <Dropdown
                      items={[
                        { label: 'طرف‌حساب جدید (دستی وارد می‌کنم)', value: 0 },
                        ...vendors.map((v) => ({ label: v.name, value: v.id })),
                      ]}
                      value={vendorId ?? 0}
                      onChange={(value) => applyVendor(value as number)}
                      placeholder="انتخاب طرف‌حساب"
                      variant="outline"
                    />
                    {vendorId && !defaultAccount && (
                      <p className="mt-2 text-sm text-amber-600">
                        برای این طرف‌حساب حساب مقصدی ثبت نشده — اطلاعات را دستی وارد
                        کنید.
                      </p>
                    )}
                  </div>
                )}

                <Input
                  label="نام طرف‌حساب"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="مثلاً شرکت خدمات ابری آروان"
                  required
                />

                <div>
                  <label className="mb-2 block font-medium text-slate-700">
                    نوع حساب مقصد
                  </label>
                  <Dropdown
                    items={Object.values(PayeeAccountType).map((t) => ({
                      label: PAYEE_ACCOUNT_TYPE_LABELS[t],
                      value: t,
                    }))}
                    value={payeeAccountType}
                    onChange={(value) => setPayeeAccountType(value as PayeeAccountType)}
                    variant="outline"
                  />
                </div>

                <Input
                  label="نام صاحب حساب"
                  value={payeeAccountHolder}
                  onChange={(e) => setPayeeAccountHolder(e.target.value)}
                />

                {payeeAccountType === PayeeAccountType.SHEBA && (
                  <Input
                    label="شماره شبا"
                    dir="ltr"
                    className="text-left"
                    value={payeeSheba}
                    onChange={(e) => setPayeeSheba(e.target.value)}
                    placeholder="IR000000000000000000000000"
                    error={shebaError}
                  />
                )}

                {payeeAccountType === PayeeAccountType.CARD && (
                  <Input
                    label="شماره کارت"
                    dir="ltr"
                    className="text-left"
                    value={payeeCardNumber}
                    onChange={(e) => setPayeeCardNumber(e.target.value)}
                    placeholder="6037-0000-0000-0000"
                  />
                )}

                {[
                  PayeeAccountType.IBAN_SWIFT,
                  PayeeAccountType.PAYPAL,
                  PayeeAccountType.OTHER,
                ].includes(payeeAccountType) && (
                  <Input
                    textarea
                    rows={3}
                    label="اطلاعات حساب مقصد"
                    dir="ltr"
                    className="text-left"
                    value={payeeAccountDetails}
                    onChange={(e) => setPayeeAccountDetails(e.target.value)}
                    placeholder="IBAN / SWIFT / آدرس پی‌پال"
                  />
                )}
              </>
            )}

            {step === 2 && requestId && (
              <>
                <p className="text-sm text-slate-600">
                  {selectedCategory?.requiresInvoice
                    ? 'فاکتور یا پیش‌فاکتور را اضافه کنید. بدون آن، مالی نمی‌تواند پرداخت را انجام دهد.'
                    : 'اگر مدرکی دارید اضافه کنید. برای این دسته هزینه، پیوست اجباری نیست.'}
                </p>
                <AttachmentPanel requestId={requestId} canEdit />
              </>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <ReviewRow label="دسته هزینه" value={selectedCategory?.name} />
                <ReviewRow label="عنوان" value={title} />
                <ReviewRow
                  label="مبلغ"
                  value={
                    isIrr
                      ? formatMoney(amountMinor)
                      : `${((amountMinor ?? 0) / 100).toLocaleString('fa-IR')} ${currency}`
                  }
                />
                <ReviewRow label="طرف‌حساب" value={payeeName} />
                <ReviewRow
                  label="حساب مقصد"
                  value={payeeSheba || payeeCardNumber || payeeAccountDetails}
                  ltr
                />

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {preview.data?.requiresApproval
                    ? `درخواست شما به ${describeChain(preview.data.chain)} ارسال می‌شود.`
                    : 'این درخواست تأییدکننده ندارد و مستقیم به صف پرداخت مالی می‌رود.'}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-slate-100 p-5">
            {step > 0 && (
              <Button
                variant="ghost"
                className="bg-slate-100"
                onClick={() => setStep((s) => s - 1)}
                disabled={busy}
              >
                بازگشت
              </Button>
            )}

            {step === 0 && (
              <Button className="flex-1" disabled={!step1Valid} onClick={() => setStep(1)}>
                ادامه
              </Button>
            )}

            {step === 1 && (
              <Button
                className="flex-1"
                disabled={!step2Valid || busy}
                onClick={saveDraft}
              >
                {busy ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس و ادامه'}
              </Button>
            )}

            {step === 2 && (
              <Button className="flex-1" onClick={() => setStep(3)}>
                ادامه به بازبینی
              </Button>
            )}

            {step === 3 && (
              <Button className="flex-1 gap-2" disabled={busy} onClick={finalSubmit}>
                <IconCheck className="size-4" />
                {preview.data?.requiresApproval ? 'ارسال برای تأیید' : 'ارسال به مالی'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <ResultModal
        isOpen={resultOpen}
        onClose={() => setResultOpen(false)}
        status="error"
        title="درخواست پرداخت"
        errorMessage={errorText}
      />
    </>
  );
}

function ReviewRow({
  label,
  value,
  ltr,
}: {
  label: string;
  value?: string | null;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={cn('font-medium text-slate-800 text-left', ltr && 'font-mono text-xs')}
        dir={ltr ? 'ltr' : undefined}
      >
        {value || '—'}
      </span>
    </div>
  );
}
