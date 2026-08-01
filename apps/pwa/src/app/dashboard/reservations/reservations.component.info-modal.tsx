'use client';

import { minutesToHHmm } from '@/libs/meeting/meeting.time';
import { Button } from '@/ui/atoms';
import { Modal } from '@/ui/atoms/ui.modal';
import {
  IconCheck,
  IconClock,
  IconCopy,
  IconFileText,
  IconPhone,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { AvailabilityRoom, AvailabilitySlot } from './reservations.types';

interface InfoModalProps {
  room: AvailabilityRoom;
  slot: AvailabilitySlot;
  onClose: () => void;
}

/** Read-only details of someone else's reservation, with contact actions. */
export function ReservationInfoModal({ room, slot, onClose }: InfoModalProps) {
  const res = slot.reservation;
  const [copied, setCopied] = useState(false);

  const copyPhone = async () => {
    if (!res?.ownerPhone) return;
    try {
      await navigator.clipboard.writeText(res.ownerPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="lg:min-w-[440px] bg-white">
      <div className="p-6 flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <div className="font-bold text-lg text-slate-700">جزئیات رزرو</div>
          <Button variant="outline" className="!px-2" onClick={onClose}>
            <IconX className="size-5" />
          </Button>
        </div>

        {/* Owner */}
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
            <IconUser className="size-6" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">{res?.ownerName}</div>
            <div className="text-xs text-slate-400">رزرو کننده</div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100">
          <Row icon={<IconFileText className="size-5" />} label="اتاق" value={room.roomName} />
          <Row
            icon={<IconClock className="size-5" />}
            label="زمان"
            value={`${minutesToHHmm(slot.startMinutes)} تا ${minutesToHHmm(slot.endMinutes)}`}
            valueClassName="tabular-nums"
          />
          {res?.title && (
            <Row icon={<IconFileText className="size-5" />} label="عنوان" value={res.title} />
          )}
          {res?.purpose && (
            <Row icon={<IconFileText className="size-5" />} label="توضیحات" value={res.purpose} />
          )}
        </div>

        {/* Contact actions */}
        {res?.ownerPhone ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500">تماس با رزرو کننده</div>
            <div className="flex items-center gap-2">
              <div
                dir="ltr"
                className="grow rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 font-mono text-sm text-slate-700 text-left"
              >
                {res.ownerPhone}
              </div>
              <Button variant="outline" className="!px-2.5" onClick={copyPhone} aria-label="کپی شماره">
                {copied ? (
                  <IconCheck className="size-5 text-emerald-500" />
                ) : (
                  <IconCopy className="size-5" />
                )}
              </Button>
            </div>
            <a href={`tel:${res.ownerPhone}`} className="block">
              <Button className="w-full gap-2">
                <IconPhone className="size-5" />
                <span>تماس</span>
              </Button>
            </a>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-400 text-center">
            شماره تماسی ثبت نشده است
          </div>
        )}
      </div>
    </Modal>
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
  value: string;
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
