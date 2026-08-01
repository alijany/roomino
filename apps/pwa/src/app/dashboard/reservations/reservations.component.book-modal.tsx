'use client';

import { minutesToHHmm } from '@/libs/meeting/meeting.time';
import { Button, Input } from '@/ui/atoms';
import { Modal } from '@/ui/atoms/ui.modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useBookSlot } from './reservations.api';

interface BookModalProps {
  date: string;
  roomId: number;
  roomName: string;
  startMinutes: number;
  endMinutes: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookModal({
  date,
  roomId,
  roomName,
  startMinutes,
  endMinutes,
  onClose,
  onSuccess,
}: BookModalProps) {
  const book = useBookSlot();
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isResultOpen, setIsResultOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await book.submit({
        roomId,
        date,
        startMinutes,
        endMinutes,
        title: title || undefined,
        purpose: purpose || undefined,
      });
      setIsResultOpen(true);
      onSuccess();
    } catch {
      setIsResultOpen(true);
    }
  };

  return (
    <>
      <Modal isOpen onClose={onClose} className="lg:min-w-[460px] bg-white">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="font-bold text-lg text-slate-700">رزرو اتاق</div>
            <Button variant="outline" className="!px-2" onClick={onClose}>
              <IconX className="size-5" />
            </Button>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 space-y-1">
            <div>
              اتاق: <span className="font-semibold text-slate-700">{roomName}</span>
            </div>
            <div>
              زمان: <span className="font-semibold text-slate-700 tabular-nums">{minutesToHHmm(startMinutes)}</span>
              {' '}تا{' '}
              <span className="font-semibold text-slate-700 tabular-nums">{minutesToHHmm(endMinutes)}</span>
              <span className="mr-2 text-slate-400">({(endMinutes - startMinutes)} دقیقه)</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="عنوان جلسه — اختیاری"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً جلسه هماهنگی"
            />
            <Input
              label="توضیحات — اختیاری"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="جزئیات بیشتر..."
            />
            <div className="flex gap-4 pt-2">
              <Button type="submit" className="flex-1" disabled={book.isLoading}>
                {book.isLoading ? 'در حال ثبت...' : 'ثبت رزرو'}
              </Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                لغو
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <ResultModal
        isOpen={isResultOpen}
        onClose={() => {
          setIsResultOpen(false);
          book.reset();
        }}
        status={book.error ? 'error' : 'success'}
        title="رزرو اتاق"
        successMessage="رزرو با موفقیت ثبت شد"
        errorMessage={book.error?.message || 'خطا در ثبت رزرو'}
      />
    </>
  );
}
