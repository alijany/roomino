'use client';

import { WEEKDAYS, minutesToHHmm } from '@/libs/meeting/meeting.time';
import { Button } from '@/ui/atoms';
import { Modal } from '@/ui/atoms/ui.modal';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import {
  IconCalendarRepeat,
  IconClock,
  IconDoor,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useDeleteRecurring } from './rooms.api';
import { Recurring } from './rooms.types';

interface RecurringDetailModalProps {
  item: Recurring;
  onClose: () => void;
  onDeleted: () => void;
}

/** Read-only details of a recurring lock, with a delete action. */
export function RecurringDetailModal({ item, onClose, onDeleted }: RecurringDetailModalProps) {
  const deleteRecurring = useDeleteRecurring();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteRecurring.submit(item.id);
    } finally {
      onDeleted();
    }
  };

  return (
    <>
      <Modal isOpen onClose={onClose} className="lg:min-w-[440px] bg-white">
        <div className="p-6 flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <div className="font-bold text-lg text-slate-700">قفل تکرارشونده</div>
            <Button variant="outline" className="!px-2" onClick={onClose}>
              <IconX className="size-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <IconCalendarRepeat className="size-6" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">{item.title}</div>
              <div className="text-xs text-slate-400">تکرار هفتگی</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100">
            <Row icon={<IconDoor className="size-5" />} label="اتاق" value={item.room?.name} />
            <Row
              icon={<IconCalendarRepeat className="size-5" />}
              label="روز"
              value={`هر ${WEEKDAYS[item.weekday]}`}
            />
            <Row
              icon={<IconClock className="size-5" />}
              label="زمان"
              value={`${minutesToHHmm(item.startMinutes)} تا ${minutesToHHmm(item.endMinutes)}`}
              valueClassName="tabular-nums"
            />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 text-rose-500 hover:bg-rose-50"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteRecurring.isLoading}
          >
            <IconTrash className="size-5" />
            <span>حذف قفل تکرارشونده</span>
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="حذف قفل تکرارشونده"
        message={`آیا از حذف «${item.title}» مطمئن هستید؟`}
        confirmButtonText="حذف"
        cancelButtonText="بازگشت"
      />
    </>
  );
}

function Row({
  icon,
  label,
  value,
  valueClassName = '',
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="text-slate-400">{icon}</div>
      <div className="text-sm text-slate-400 w-16 shrink-0">{label}</div>
      <div className={`text-sm font-medium text-slate-700 grow ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}
