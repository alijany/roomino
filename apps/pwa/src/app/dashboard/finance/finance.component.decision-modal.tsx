'use client';

import { Button, Input, Modal } from '@/ui/atoms';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';

export type DecisionKind = 'approve' | 'request-info' | 'reject' | 'payment-failed';

const COPY: Record<
  DecisionKind,
  { title: string; confirm: string; hint: string; reasonRequired: boolean; danger?: boolean }
> = {
  approve: {
    title: 'تأیید درخواست',
    confirm: 'تأیید و ارسال به مالی',
    hint: 'می‌توانید یادداشتی برای ثبت‌کننده بگذارید (اختیاری).',
    reasonRequired: false,
  },
  'request-info': {
    title: 'برگشت برای اصلاح',
    confirm: 'ارسال برای اصلاح',
    hint: 'بنویسید چه چیزی کم است تا ثبت‌کننده بداند چه کار کند.',
    reasonRequired: true,
  },
  reject: {
    title: 'رد درخواست',
    confirm: 'رد درخواست',
    hint: 'دلیل رد را بنویسید تا درخواست‌کننده بداند چه کار کند.',
    reasonRequired: true,
    danger: true,
  },
  'payment-failed': {
    title: 'ثبت پرداخت ناموفق',
    confirm: 'ثبت و بازگشت به صف',
    hint: 'چه اتفاقی افتاد؟ این متن روی درخواست دیده می‌شود.',
    reasonRequired: true,
    danger: true,
  },
};

interface DecisionModalProps {
  kind: DecisionKind | null;
  onClose: () => void;
  onConfirm: (comment: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Approve, return, reject — one modal, because the only thing that differs is
 * whether a reason is required and how the action reads.
 */
export function DecisionModal({
  kind,
  onClose,
  onConfirm,
  isLoading,
}: DecisionModalProps) {
  const [comment, setComment] = useState('');
  const copy = kind ? COPY[kind] : null;
  const blocked = Boolean(copy?.reasonRequired && comment.trim().length === 0);

  const handleClose = () => {
    setComment('');
    onClose();
  };

  const handleConfirm = async () => {
    await onConfirm(comment.trim());
    setComment('');
  };

  return (
    <Modal isOpen={Boolean(kind)} onClose={handleClose} className="bg-white lg:min-w-[480px]">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-800">{copy?.title}</h3>
          <Button variant="outline" className="!px-2" onClick={handleClose}>
            <IconX className="size-5" />
          </Button>
        </div>

        <Input
          textarea
          rows={4}
          label={copy?.reasonRequired ? 'دلیل' : 'یادداشت'}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={copy?.hint}
        />

        <div className="flex gap-3 pt-2">
          <Button
            className={copy?.danger ? 'flex-1 !bg-rose-500 text-white' : 'flex-1'}
            disabled={blocked || isLoading}
            onClick={handleConfirm}
          >
            {isLoading ? 'در حال ثبت...' : copy?.confirm}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={handleClose}>
            بازگشت
          </Button>
        </div>
      </div>
    </Modal>
  );
}
