'use client';

import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import {
  IconDoor,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useDeleteRoom, useRooms } from './rooms.api';
import { RoomForm } from './rooms.component.room-form';
import { Room } from './rooms.types';

export function RoomList() {
  const { data, error, isLoading, refresh } = useRooms({ limit: 100 });
  const deleteRoom = useDeleteRoom();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | undefined>();
  const [toDelete, setToDelete] = useState<Room | undefined>();

  const openAdd = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteRoom.submit(toDelete.id);
    } finally {
      setToDelete(undefined);
      refresh();
    }
  };

  const count = data?.items?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {count > 0 ? `${count} اتاق` : 'بدون اتاق'}
        </div>
        <Button onClick={openAdd} className="gap-2">
          <IconPlus className="size-5" />
          <span>افزودن اتاق</span>
        </Button>
      </div>

      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        emptyMessage="هنوز اتاقی اضافه نشده است"
        isEmpty={(d) => !d?.items.length}
        onRetry={refresh}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {data?.items?.map((room) => (
          <div
            key={room.id}
            className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-primary/30 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IconDoor className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{room.name}</h3>
                  {room.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {room.description}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                  (room.active
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-100 text-slate-400')
                }
              >
                <span
                  className={
                    'size-1.5 rounded-full ' +
                    (room.active ? 'bg-emerald-500' : 'bg-slate-400')
                  }
                />
                {room.active ? 'فعال' : 'غیرفعال'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1">
                <IconUsers className="size-4 text-slate-400" />
                {room.capacity != null ? `${room.capacity} نفر` : 'ظرفیت نامشخص'}
              </span>
              {room.location && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1">
                  <IconMapPin className="size-4 text-slate-400" />
                  {room.location}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => openEdit(room)}
              >
                <IconPencil className="size-4" />
                <span>ویرایش</span>
              </Button>
              <Button
                variant="outline"
                className="!px-2.5 text-rose-500 hover:bg-rose-50"
                onClick={() => setToDelete(room)}
                aria-label="حذف اتاق"
              >
                <IconTrash className="size-5" />
              </Button>
            </div>
          </div>
        ))}
        </div>
      </DataView>

      <RoomForm
        room={editing}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refresh}
      />

      <ConfirmModal
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(undefined)}
        onConfirm={confirmDelete}
        title="حذف اتاق"
        message={`آیا از حذف «${toDelete?.name}» مطمئن هستید؟`}
        confirmButtonText="حذف"
      />
    </div>
  );
}
