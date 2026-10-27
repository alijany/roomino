'use client';

import { Button, Input, Modal } from '@/ui/atoms';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';

export type DecisionKind = 'approve' | 'reject';

const COPY: Record<
  DecisionKind,
  { title: string; confirm: string; hint: string; reasonRequired: boolean; danger?: boolean }
> = {
  approve: {
    title: 'تأیید درخواست مساعده',
    confirm: 'تأیید',
    hint: 'می‌توانید یادداشتی برای ثبت‌کننده بگذارید (اختیاری).',
    reasonRequired: false,
  },
  reject: {
    title: 'رد درخواست مساعده',
    confirm: 'رد درخواست',
    hint: 'دلیل رد را بنویسید تا درخواست‌کننده بداند چه کار کند.',
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
      <div className="flex min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <h3 className="font-bold text-lg text-slate-800">{copy?.title}</h3>
          <Button variant="outline" className="!px-2" onClick={handleClose}>
            <IconX className="size-5" />
          </Button>
        </div>

        <div className="min-h-0 grow overflow-y-auto p-5">
          <Input
            textarea
            rows={4}
            label={copy?.reasonRequired ? 'دلیل' : 'یادداشت'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={copy?.hint}
          />
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-100 p-5">
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
