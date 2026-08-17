'use client';

import { formatMoney } from '@/libs/format/format.util';
import { Button, CurrencyInput, Dropdown, Input, Modal } from '@/ui/atoms';
import { DatePickerField } from '@/ui/molecules';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { usePaymentSources } from './finance.api';
import { ATTACHMENT_KIND_LABELS } from './finance.constants';
import { Currency, PaymentRequestDetail, RecordPaymentDto } from './finance.types';

interface PaymentModalProps {
  request: PaymentRequestDetail | undefined;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dto: RecordPaymentDto) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Records a transfer that already happened in a banking app.
 *
 * The settled amount is a separate field from the requested amount on purpose:
 * they differ constantly, and overwriting the request would destroy the
 * variance the monthly report exists to show.
 */
export function PaymentModal({
  request,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: PaymentModalProps) {
  const { data: sourcesData } = usePaymentSources();
  const sources = sourcesData?.items ?? [];

  const [paymentSourceId, setPaymentSourceId] = useState<number | null>(null);
  const [paidAt, setPaidAt] = useState<Date>(new Date());
  const [settledAmountRial, setSettledAmountRial] = useState<number | null>(null);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [feeRial, setFeeRial] = useState<number | null>(null);
  const [intermediary, setIntermediary] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const isForeign = request && request.currency !== Currency.IRR;

  // Pre-fill the settled amount for domestic requests — it usually matches, and
  // a wrong prefill is easier to notice than an empty required field.
  useEffect(() => {
    if (!isOpen || !request) return;
    setSettledAmountRial(
      request.currency === Currency.IRR
        ? request.amountRial ?? request.amountMinor
        : null
    );
  }, [isOpen, request]);

  // For a foreign request the rial figure follows from the rate, so deriving it
  // beats asking for a number the user would compute by hand anyway.
  useEffect(() => {
    if (!isForeign || !fxRate || !request) return;
    const major = request.amountMinor / 100;
    setSettledAmountRial(Math.round(major * fxRate));
  }, [fxRate, isForeign, request]);

  const receiptOptions =
    request?.attachments?.map((a) => ({
      label: `${ATTACHMENT_KIND_LABELS[a.kind] ?? a.kind} — ${a.filename}`,
      value: a.id,
    })) ?? [];

  const valid =
    Boolean(paymentSourceId) &&
    (settledAmountRial ?? 0) > 0 &&
    (!isForeign || Boolean(fxRate));

  const handleConfirm = async () => {
    if (!valid) return;

    await onConfirm({
      paymentSourceId: paymentSourceId as number,
      paidAt: paidAt.toISOString(),
      settledAmountRial: settledAmountRial as number,
      fxRateRialPerUnit: fxRate ?? undefined,
      feeRial: feeRial ?? undefined,
      intermediary: intermediary.trim() || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      receiptAttachmentId: receiptId ?? undefined,
      notes: notes.trim() || undefined,
    });
  };

  const variance =
    request && request.currency === Currency.IRR && settledAmountRial
      ? settledAmountRial - (request.amountRial ?? request.amountMinor)
      : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="bg-white lg:min-w-[560px]">
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h3 className="font-bold text-lg text-slate-800">ثبت پرداخت</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              پرداخت را در بانک انجام دهید، سپس آن را اینجا ثبت کنید.
            </p>
          </div>
          <Button variant="outline" className="!px-2" onClick={onClose}>
            <IconX className="size-5" />
          </Button>
        </div>

        <div className="min-h-0 grow space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-2 block font-medium text-slate-700">منبع پرداخت</label>
            <Dropdown
              items={sources.map((source) => ({
                label: `${source.label}${source.bankName ? ` — ${source.bankName}` : ''}`,
                value: source.id,
              }))}
              value={paymentSourceId}
              onChange={(value) => setPaymentSourceId(value as number)}
              placeholder="از کدام حساب پرداخت شد؟"
              variant="outline"
            />
            {sources.length === 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-600">
                <IconAlertTriangle className="size-4" />
                هنوز منبع پرداختی ثبت نشده است. ابتدا از بخش «منابع پرداخت» یکی اضافه کنید.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block font-medium text-slate-700">تاریخ پرداخت</label>
            <DatePickerField label="تاریخ" value={paidAt} onSelect={setPaidAt} />
          </div>

          {isForeign && (
            <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/50 p-4">
              <p className="text-sm text-sky-900">
                این درخواست ارزی است. نرخ و کارمزد را وارد کنید تا مبلغ ریالی محاسبه شود.
              </p>

              <CurrencyInput
                label={`نرخ تبدیل (ریال به ازای هر ۱ ${request?.currency})`}
                unit="rial"
                value={fxRate}
                onValueChange={setFxRate}
              />

              <Input
                label="واسط پرداخت"
                value={intermediary}
                onChange={(e) => setIntermediary(e.target.value)}
                placeholder="نام شخص یا شرکتی که پرداخت را انجام داد"
              />

              <CurrencyInput
                label="کارمزد واسط (تومان)"
                unit="toman"
                value={feeRial}
                onValueChange={setFeeRial}
              />
            </div>
          )}

          <CurrencyInput
            label="مبلغ پرداخت‌شده (تومان)"
            unit="toman"
            value={settledAmountRial}
            onValueChange={setSettledAmountRial}
          />

          {variance !== 0 && (
            <p className="text-xs text-amber-600">
              {variance > 0 ? 'بیشتر' : 'کمتر'} از مبلغ درخواست‌شده به اندازه{' '}
              {formatMoney(Math.abs(variance))} — این اختلاف در گزارش ماهانه ثبت می‌شود.
            </p>
          )}

          <Input
            label="شماره پیگیری"
            dir="ltr"
            className="text-left"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="کد رهگیری تراکنش"
          />

          {receiptOptions.length > 0 && (
            <div>
              <label className="mb-2 block font-medium text-slate-700">
                رسید پرداخت (از پیوست‌ها)
              </label>
              <Dropdown
                items={receiptOptions}
                value={receiptId}
                onChange={(value) => setReceiptId(value as number)}
                placeholder="انتخاب رسید"
                variant="outline"
              />
            </div>
          )}

          <Input
            textarea
            rows={2}
            label="یادداشت (اختیاری)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-100 p-5">
          <Button className="flex-1" disabled={!valid || isLoading} onClick={handleConfirm}>
            {isLoading ? 'در حال ثبت...' : 'ثبت پرداخت'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            بازگشت
          </Button>
        </div>
      </div>
    </Modal>
  );
}
