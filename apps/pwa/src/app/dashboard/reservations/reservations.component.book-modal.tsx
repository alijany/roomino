'use client';

import { SLOT, minutesToHHmm } from '@/libs/meeting/meeting.time';
import { Button, Input } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { Modal } from '@/ui/atoms/ui.modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useBookSlot } from './reservations.api';
import { AvailabilityRoom, AvailabilitySlot } from './reservations.types';

interface BookModalProps {
  date: string;
  room: AvailabilityRoom;
  slot: AvailabilitySlot;
  onClose: () => void;
  onSuccess: () => void;
}

const DURATIONS = [30, 60, 90];

export function BookModal({ date, room, slot, onClose, onSuccess }: BookModalProps) {
  const book = useBookSlot();
  const [duration, setDuration] = useState<number | null>(SLOT);
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isResultOpen, setIsResultOpen] = useState(false);

  // Max consecutive free minutes starting at the clicked slot in this room.
  const maxMinutes = useMemo(() => {
    const startIdx = room.slots.findIndex(
      (s) => s.startMinutes === slot.startMinutes,
    );
    if (startIdx < 0) return SLOT;
    let count = 0;
    for (let i = startIdx; i < room.slots.length; i++) {
      if (room.slots[i].status === 'available') count++;
      else break;
    }
    return count * SLOT;
  }, [room.slots, slot.startMinutes]);

  const durationItems = DURATIONS.filter((d) => d <= maxMinutes).map((d) => ({
    label: `${d} دقیقه`,
    value: d,
  }));

  const endMinutes = slot.startMinutes + (duration ?? SLOT);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await book.submit({
        roomId: room.roomId,
        date,
        startMinutes: slot.startMinutes,
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
              اتاق: <span className="font-semibold text-slate-700">{room.roomName}</span>
            </div>
            <div>
              شروع: <span className="font-semibold text-slate-700">{minutesToHHmm(slot.startMinutes)}</span>
              {' '}تا{' '}
              <span className="font-semibold text-slate-700">{minutesToHHmm(endMinutes)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">مدت زمان</label>
              <Dropdown
                items={durationItems}
                value={duration}
                onChange={(v) => setDuration(v as number | null)}
                placeholder="انتخاب مدت"
                variant="outline"
              />
            </div>
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
              <Button
                type="submit"
                className="flex-1"
                disabled={book.isLoading || duration == null}
              >
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
