'use client';

import { SLOT, minutesToHHmm } from '@/libs/meeting/meeting.time';
import { Button, Input } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { Modal } from '@/ui/atoms/ui.modal';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useCancelReservation, useUpdateReservation } from './reservations.api';
import { AvailabilityRoom, AvailabilitySlot } from './reservations.types';

interface ReservationModalProps {
  date: string;
  room: AvailabilityRoom;
  slot: AvailabilitySlot;
  onClose: () => void;
  onChanged: () => void;
}

const DURATIONS = [30, 60, 90];

export function ReservationModal({
  date,
  room,
  slot,
  onClose,
  onChanged,
}: ReservationModalProps) {
  const reservationId = slot.reservation!.id;
  const update = useUpdateReservation();
  const cancel = useCancelReservation();

  // Locate the reservation's own contiguous run within the room's slots.
  const { startMinutes, currentDuration, maxMinutes } = useMemo(() => {
    const ownIdxs = room.slots
      .map((s, i) => (s.reservation?.id === reservationId ? i : -1))
      .filter((i) => i >= 0);
    const startIdx = ownIdxs[0];
    const startM = room.slots[startIdx].startMinutes;
    const current = ownIdxs.length * SLOT;
    let count = 0;
    for (let i = startIdx; i < room.slots.length; i++) {
      const s = room.slots[i];
      if (s.status === 'available' || s.reservation?.id === reservationId) count++;
      else break;
    }
    return { startMinutes: startM, currentDuration: current, maxMinutes: count * SLOT };
  }, [room.slots, reservationId]);

  const [duration, setDuration] = useState<number | null>(currentDuration);
  const [title, setTitle] = useState(slot.reservation?.title ?? '');
  const [purpose, setPurpose] = useState('');
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const durationItems = DURATIONS.filter((d) => d <= maxMinutes).map((d) => ({
    label: `${d} دقیقه`,
    value: d,
  }));

  const endMinutes = startMinutes + (duration ?? currentDuration);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.submit({
        id: reservationId,
        data: {
          date,
          startMinutes,
          endMinutes,
          title: title || undefined,
          purpose: purpose || undefined,
        },
      });
      setIsResultOpen(true);
      onChanged();
    } catch {
      setIsResultOpen(true);
    }
  };

  const handleCancel = async () => {
    setConfirmCancel(false);
    try {
      await cancel.submit(reservationId);
    } finally {
      onChanged();
    }
  };

  return (
    <>
      <Modal isOpen onClose={onClose} className="lg:min-w-[460px] bg-white">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="font-bold text-lg text-slate-700">رزرو شما</div>
            <Button variant="outline" className="!px-2" onClick={onClose}>
              <IconX className="size-5" />
            </Button>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 space-y-1">
            <div>
              اتاق: <span className="font-semibold text-slate-700">{room.roomName}</span>
            </div>
            <div>
              زمان: <span className="font-semibold text-slate-700">{minutesToHHmm(startMinutes)}</span>
              {' '}تا{' '}
              <span className="font-semibold text-slate-700">{minutesToHHmm(endMinutes)}</span>
            </div>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
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
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={update.isLoading}>
                {update.isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-rose-500"
                onClick={() => setConfirmCancel(true)}
                disabled={cancel.isLoading}
              >
                لغو رزرو
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="لغو رزرو"
        message="آیا از لغو این رزرو مطمئن هستید؟ این اتاق برای دیگران آزاد می‌شود."
        confirmButtonText="لغو رزرو"
        cancelButtonText="بازگشت"
      />

      <ResultModal
        isOpen={isResultOpen}
        onClose={() => {
          setIsResultOpen(false);
          update.reset();
        }}
        status={update.error ? 'error' : 'success'}
        title="ویرایش رزرو"
        successMessage="رزرو با موفقیت ویرایش شد"
        errorMessage={update.error?.message || 'خطا در ویرایش رزرو'}
      />
    </>
  );
}
