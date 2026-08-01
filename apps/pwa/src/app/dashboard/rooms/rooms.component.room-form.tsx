'use client';

import { Button, Input, ToggleSwitch } from '@/ui/atoms';
import { Modal } from '@/ui/atoms/ui.modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAddRoom, useUpdateRoom } from './rooms.api';
import { Room } from './rooms.types';

interface RoomFormProps {
  /** When set, the form edits this room; otherwise it creates a new one. */
  room?: Room;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RoomForm({ room, isOpen, onClose, onSuccess }: RoomFormProps) {
  const isEdit = Boolean(room);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState('');
  const [active, setActive] = useState(true);
  const [isResultOpen, setIsResultOpen] = useState(false);

  const addRoom = useAddRoom();
  const updateRoom = useUpdateRoom();
  const { isLoading, error, reset } = isEdit ? updateRoom : addRoom;

  useEffect(() => {
    if (isOpen) {
      setName(room?.name ?? '');
      setDescription(room?.description ?? '');
      setCapacity(room?.capacity != null ? String(room.capacity) : '');
      setLocation(room?.location ?? '');
      setActive(room?.active ?? true);
    }
  }, [isOpen, room]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      description: description || undefined,
      capacity: capacity ? Number(capacity) : undefined,
      location: location || undefined,
      active,
    };
    try {
      if (isEdit && room) {
        await updateRoom.submit({ id: room.id, data: payload });
      } else {
        await addRoom.submit(payload);
      }
      setIsResultOpen(true);
      onClose();
      onSuccess?.();
    } catch {
      setIsResultOpen(true);
    }
  };

  const handleCloseResult = () => {
    setIsResultOpen(false);
    reset();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="lg:min-w-[500px] bg-white">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="font-bold text-lg lg:text-xl text-slate-700">
              {isEdit ? 'ویرایش اتاق' : 'افزودن اتاق جدید'}
            </div>
            <Button variant="outline" className="!px-2" onClick={onClose}>
              <IconX className="size-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              label="نام اتاق"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً اتاق جلسات شمالی"
              required
            />
            <Input
              id="capacity"
              label="ظرفیت (نفر) — اختیاری"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="مثلاً ۸"
            />
            <Input
              id="location"
              label="موقعیت / طبقه — اختیاری"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="مثلاً طبقه دوم"
            />
            <Input
              id="description"
              label="توضیحات — اختیاری"
              textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="امکانات اتاق..."
            />
            <ToggleSwitch
              label="فعال (قابل رزرو)"
              labelPosition="right"
              checked={active}
              onChange={setActive}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !name}
              >
                {isLoading ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'افزودن'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={onClose}
              >
                لغو
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <ResultModal
        isOpen={isResultOpen}
        onClose={handleCloseResult}
        status={error ? 'error' : 'success'}
        title={isEdit ? 'ویرایش اتاق' : 'افزودن اتاق'}
        successMessage={isEdit ? 'اتاق با موفقیت ویرایش شد' : 'اتاق با موفقیت افزوده شد'}
        errorMessage={error?.message || 'خطا در ذخیره اتاق'}
      />
    </>
  );
}
