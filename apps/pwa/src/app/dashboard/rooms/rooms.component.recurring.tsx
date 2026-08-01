'use client';

import {
  SLOT,
  SLOT_STARTS,
  WEEKDAYS,
  minutesToHHmm,
} from '@/libs/meeting/meeting.time';
import { cn } from '@/libs/style/style.util.helpers';
import { Button, Input } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import {
  IconCalendarRepeat,
  IconClock,
  IconDoor,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
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
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startMinutes, setStartMinutes] = useState<number | null>(SLOT_STARTS[0]);
  const [endMinutes, setEndMinutes] = useState<number | null>(SLOT_STARTS[0] + SLOT);
  const [title, setTitle] = useState('');
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Recurring | undefined>();

  const roomItems = (rooms.data?.items ?? []).map((r) => ({
    label: r.name,
    value: r.id,
  }));
  const startItems = SLOT_STARTS.map((m) => ({ label: minutesToHHmm(m), value: m }));
  const endItems = END_OPTIONS.map((m) => ({ label: minutesToHHmm(m), value: m }));

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const canSubmit =
    roomId != null &&
    weekdays.length > 0 &&
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
        weekdays,
        startMinutes: startMinutes!,
        endMinutes: endMinutes!,
        title: title.trim(),
      });
      setTitle('');
      setWeekdays([]);
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
      {/* Create form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-100 bg-white p-4 lg:p-5 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <IconCalendarRepeat className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">قفل تکرارشونده جدید</div>
            <div className="text-xs text-slate-400">
              رزرو ثابت هفتگی برای یک اتاق در روزهای انتخابی
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">اتاق</label>
            <Dropdown
              items={roomItems}
              value={roomId}
              onChange={(v) => setRoomId(v as number | null)}
              placeholder="انتخاب اتاق"
              variant="outline"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">ساعت شروع</label>
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
            <label className="block text-sm font-medium text-slate-600 mb-1.5">ساعت پایان</label>
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
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">روزهای هفته</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {WEEKDAYS.map((label, day) => {
              const active = weekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWeekday(day)}
                  className={cn(
                    'rounded-xl border py-2 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="عنوان"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً جلسه هفتگی تیم"
        />

        <Button
          type="submit"
          disabled={!canSubmit || addRecurring.isLoading}
          className="w-full sm:w-auto gap-2"
        >
          <IconPlus className="size-5" />
          <span>{addRecurring.isLoading ? 'در حال افزودن...' : 'افزودن قفل تکرارشونده'}</span>
        </Button>
      </form>

      {/* Existing locks */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-500">قفل‌های فعال</div>
        <DataView
          data={data}
          error={error}
          isLoading={isLoading}
          emptyMessage="هنوز قفل تکرارشونده‌ای تعریف نشده است"
          isEmpty={(d) => !d?.items.length}
          onRetry={refresh}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data?.items?.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-amber-200"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <IconCalendarRepeat className="size-6" />
              </div>
              <div className="grow min-w-0 space-y-1">
                <h3 className="font-semibold text-slate-800 truncate">{item.title}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <IconDoor className="size-3.5" />
                    {item.room?.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IconCalendarRepeat className="size-3.5" />
                    هر {WEEKDAYS[item.weekday]}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <IconClock className="size-3.5" />
                    {minutesToHHmm(item.startMinutes)} تا {minutesToHHmm(item.endMinutes)}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="!px-2 text-rose-500 hover:bg-rose-50 shrink-0"
                onClick={() => setToDelete(item)}
                aria-label="حذف قفل"
              >
                <IconTrash className="size-5" />
              </Button>
            </div>
          ))}
          </div>
        </DataView>
      </div>

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
