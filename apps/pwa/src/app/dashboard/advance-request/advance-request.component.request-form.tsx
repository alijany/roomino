'use client';

import { Button, CurrencyInput, Input, Modal } from '@/ui/atoms';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useCreateAdvanceRequest } from './advance-request.api';

interface RequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestForm({ isOpen, onClose, onSuccess }: RequestFormProps) {
  const [amountRial, setAmountRial] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const { submit, isLoading, error } = useCreateAdvanceRequest();

  const blocked = !amountRial || amountRial <= 0;

  const handleClose = () => {
    setAmountRial(null);
    setReason('');
    onClose();
  };

  const handleSubmit = async () => {
    if (blocked) return;

    await submit({ amountRial: amountRial as number, reason: reason.trim() || undefined });
    handleClose();
    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="bg-white lg:min-w-[480px]">
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <h3 className="font-bold text-lg text-slate-800">درخواست مساعده جدید</h3>
          <Button variant="outline" className="!px-2" onClick={handleClose}>
            <IconX className="size-5" />
          </Button>
        </div>

        <div className="min-h-0 grow space-y-4 overflow-y-auto p-5">
          <CurrencyInput
            unit="toman"
            label="مبلغ مساعده (تومان)"
            value={amountRial}
            onValueChange={setAmountRial}
            placeholder="مثلاً ۵٬۰۰۰٬۰۰۰"
          />

          <Input
            textarea
            rows={3}
            label="توضیح (اختیاری)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="دلیل درخواست مساعده را بنویسید"
          />

          {error && (
            <p className="text-sm text-rose-600">{error.message}</p>
          )}

          <p className="text-xs text-slate-500">
            این درخواست ابتدا نزد مدیرعامل و سپس نزد مدیر مالی برای تأیید ارسال می‌شود.
          </p>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-100 p-5">
          <Button className="flex-1" disabled={blocked || isLoading} onClick={handleSubmit}>
            {isLoading ? 'در حال ارسال...' : 'ارسال درخواست'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={handleClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
}
