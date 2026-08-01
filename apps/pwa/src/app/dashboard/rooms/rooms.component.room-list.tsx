'use client';

import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconPencil, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-bold text-slate-700">اتاق‌ها</div>
        <Button onClick={openAdd} className="gap-2">
          <IconPlus className="size-5" />
          <span>افزودن اتاق</span>
        </Button>
      </div>

      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        className="flex flex-col gap-3"
        emptyMessage="هنوز اتاقی اضافه نشده است"
        isEmpty={(d) => !d?.items.length}
        onRetry={refresh}
      >
        {data?.items?.map((room) => (
          <div
            key={room.id}
            className="px-4 py-3 rounded-2xl border border-slate-100 flex items-center gap-4 justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-700">{room.name}</h3>
                {!room.active && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-xs">
                    غیرفعال
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                {room.capacity != null && (
                  <span className="flex items-center gap-1">
                    <IconUsers className="size-4" />
                    {room.capacity} نفر
                  </span>
                )}
                {room.location && <span>{room.location}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="!px-2" onClick={() => openEdit(room)}>
                <IconPencil className="size-5" />
              </Button>
              <Button
                variant="outline"
                className="!px-2 text-rose-500"
                onClick={() => setToDelete(room)}
              >
                <IconTrash className="size-5" />
              </Button>
            </div>
          </div>
        ))}
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
