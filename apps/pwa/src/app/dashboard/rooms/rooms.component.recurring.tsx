'use client';

import {
  SLOT,
  SLOT_STARTS,
  WEEKDAYS,
  minutesToHHmm,
} from '@/libs/meeting/meeting.time';
import { Button, Input } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import {
  useAddRecurring,
  useDeleteRecurring,
  useRecurring,
  useRooms,
} from './rooms.api';
import { Recurring } from './rooms.types';

// End-of-slot options include the board end (18:00 / 1080).
const END_OPTIONS = [...SLOT_STARTS.slice(1), SLOT_STARTS[SLOT_STARTS.length - 1] + SLOT];

export function RecurringManager() {
  const rooms = useRooms({ limit: 100 });
  const { data, error, isLoading, refresh } = useRecurring();
  const addRecurring = useAddRecurring();
  const deleteRecurring = useDeleteRecurring();

  const [roomId, setRoomId] = useState<number | null>(null);
  const [weekday, setWeekday] = useState<number | null>(0);
  const [startMinutes, setStartMinutes] = useState<number | null>(SLOT_STARTS[0]);
  const [endMinutes, setEndMinutes] = useState<number | null>(SLOT_STARTS[0] + SLOT);
  const [title, setTitle] = useState('');
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Recurring | undefined>();

  const roomItems = (rooms.data?.items ?? []).map((r) => ({
    label: r.name,
    value: r.id,
  }));
  const weekdayItems = WEEKDAYS.map((label, value) => ({ label, value }));
  const startItems = SLOT_STARTS.map((m) => ({ label: minutesToHHmm(m), value: m }));
  const endItems = END_OPTIONS.map((m) => ({ label: minutesToHHmm(m), value: m }));

  const canSubmit =
    roomId != null &&
    weekday != null &&
    startMinutes != null &&
    endMinutes != null &&
    endMinutes > startMinutes &&
    title.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await addRecurring.submit({
        roomId: roomId!,
        weekday: weekday!,
        startMinutes: startMinutes!,
        endMinutes: endMinutes!,
        title: title.trim(),
      });
      setTitle('');
      setIsResultOpen(true);
      refresh();
    } catch {
      setIsResultOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteRecurring.submit(toDelete.id);
    } finally {
      setToDelete(undefined);
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-2xl border border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">اتاق</label>
          <Dropdown
            items={roomItems}
            value={roomId}
            onChange={(v) => setRoomId(v as number | null)}
            placeholder="انتخاب اتاق"
            variant="outline"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">روز هفته</label>
          <Dropdown
            items={weekdayItems}
            value={weekday}
            onChange={(v) => setWeekday(v as number | null)}
            placeholder="انتخاب روز"
            variant="outline"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ساعت شروع</label>
          <Dropdown
            items={startItems}
            value={startMinutes}
            onChange={(v) => {
              const val = v as number | null;
              setStartMinutes(val);
              if (val != null && endMinutes != null && endMinutes <= val) {
                setEndMinutes(val + SLOT);
              }
            }}
            placeholder="شروع"
            variant="outline"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ساعت پایان</label>
          <Dropdown
            items={endItems.filter(
              (i) => startMinutes == null || i.value > startMinutes,
            )}
            value={endMinutes}
            onChange={(v) => setEndMinutes(v as number | null)}
            placeholder="پایان"
            variant="outline"
          />
        </div>
        <div className="lg:col-span-2">
          <Input
            label="عنوان"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً جلسه هفتگی تیم"
          />
        </div>
        <div className="lg:col-span-2">
          <Button type="submit" disabled={!canSubmit || addRecurring.isLoading} className="gap-2">
            <IconPlus className="size-5" />
            <span>{addRecurring.isLoading ? 'در حال افزودن...' : 'افزودن قفل تکرارشونده'}</span>
          </Button>
        </div>
      </form>

      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        className="flex flex-col gap-3"
        emptyMessage="هنوز قفل تکرارشونده‌ای تعریف نشده است"
        isEmpty={(d) => !d?.items.length}
        onRetry={refresh}
      >
        {data?.items?.map((item) => (
          <div
            key={item.id}
            className="px-4 py-3 rounded-2xl border border-slate-100 flex items-center gap-4 justify-between"
          >
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-700">{item.title}</h3>
              <div className="text-sm text-slate-400">
                {item.room?.name} · هر {WEEKDAYS[item.weekday]} ·{' '}
                {minutesToHHmm(item.startMinutes)} تا {minutesToHHmm(item.endMinutes)}
              </div>
            </div>
            <Button
              variant="outline"
              className="!px-2 text-rose-500"
              onClick={() => setToDelete(item)}
            >
              <IconTrash className="size-5" />
            </Button>
          </div>
        ))}
      </DataView>

      <ResultModal
        isOpen={isResultOpen}
        onClose={() => {
          setIsResultOpen(false);
          addRecurring.reset();
        }}
        status={addRecurring.error ? 'error' : 'success'}
        title="قفل تکرارشونده"
        successMessage="قفل تکرارشونده با موفقیت افزوده شد"
        errorMessage={addRecurring.error?.message || 'خطا در افزودن قفل'}
      />

      <ConfirmModal
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(undefined)}
        onConfirm={confirmDelete}
        title="حذف قفل تکرارشونده"
        message={`آیا از حذف «${toDelete?.title}» مطمئن هستید؟`}
        confirmButtonText="حذف"
      />
    </div>
  );
}
