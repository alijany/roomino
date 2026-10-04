'use client';

import { Button, Input, ToggleSwitch } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconCopy, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteShift, useSaveShift, useShifts } from './attendance.api';
import { FormModal } from './attendance.component.layout';
import { WEEKDAY_LABELS } from './attendance.constants';
import { Shift, ShiftDay } from './attendance.types';
import { currentJalaliMonth, errorMessage, fa } from './attendance.util';

type DayDraft = {
  isActive: boolean;
  startTime: string;
  endTime: string;
  hasSecondPart: boolean;
  secondStartTime: string;
  secondEndTime: string;
};

/** Default: شنبه to چهارشنبه, 08:00–17:00 — as in Tesmino. */
function defaultDays(): DayDraft[] {
  return WEEKDAY_LABELS.map((_, d) => ({
    isActive: d <= 4,
    startTime: d <= 4 ? '08:00' : '',
    endTime: d <= 4 ? '17:00' : '',
    hasSecondPart: false,
    secondStartTime: '',
    secondEndTime: '',
  }));
}

function fromShift(days: ShiftDay[]): DayDraft[] {
  return WEEKDAY_LABELS.map((_, d) => {
    const day = days.find((x) => x.dayOfWeek === d);
    return {
      isActive: Boolean(day?.isActive),
      startTime: day?.startTime ?? '',
      endTime: day?.endTime ?? '',
      hasSecondPart: Boolean(day?.hasSecondPart),
      secondStartTime: day?.secondStartTime ?? '',
      secondEndTime: day?.secondEndTime ?? '',
    };
  });
}

function dayHours(day: ShiftDay) {
  if (!day.isActive) return 'تعطیل';
  const first = `${fa(day.startTime)}–${fa(day.endTime)}`;
  return day.hasSecondPart ? `${first} و ${fa(day.secondStartTime)}–${fa(day.secondEndTime)}` : first;
}

export function ShiftsSettings() {
  const { data, error, isLoading, refresh } = useShifts();
  const remove = useDeleteShift();
  const [editing, setEditing] = useState<Shift | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Shift | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.submit(deleting.id);
      toast.success('شیفت حذف شد');
      refresh();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'حذف انجام نشد'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setEditing('new')}>
          <IconPlus className="size-4" />
          شیفت جدید
        </Button>
      </div>
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => !d?.items.length}
        emptyMessage="هنوز شیفتی تعریف نشده است."
        onRetry={refresh}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {data?.items.map((shift) => (
            <div key={shift.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-800">{shift.name}</div>
                  <div className="text-xs text-slate-500">
                    سال {fa(shift.year)}
                    {shift.flexMinutes ? ` · شناوری ${fa(shift.flexMinutes)} دقیقه` : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="!px-2" onClick={() => setEditing(shift)} aria-label="ویرایش">
                    <IconPencil className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="!px-2 border-none text-rose-500"
                    onClick={() => setDeleting(shift)}
                    aria-label={`حذف ${shift.name}`}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {shift.days.map((day) => (
                  <li key={day.dayOfWeek} className="flex justify-between gap-2">
                    <span className="text-slate-500">{WEEKDAY_LABELS[day.dayOfWeek]}</span>
                    <span className={`tabular-nums ${day.isActive ? 'text-slate-700' : 'text-slate-300'}`}>
                      {dayHours(day)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DataView>

      {editing && (
        <ShiftForm
          key={editing === 'new' ? 'new' : editing.id}
          shift={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      <ConfirmModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="حذف شیفت"
        message={`شیفت «${deleting?.name ?? ''}» حذف شود؟ شیفتی که به پرسنل تخصیص داده شده قابل حذف نیست.`}
        confirmButtonText="حذف"
        cancelButtonText="بازگشت"
      />
    </div>
  );
}

const timeInput =
  'w-36 rounded-lg border border-slate-200 px-2 py-1 text-left tabular-nums disabled:bg-slate-50 disabled:text-slate-300';

function ShiftForm({ shift, onClose, onSaved }: { shift: Shift | null; onClose: () => void; onSaved: () => void }) {
  const save = useSaveShift();
  const [name, setName] = useState(shift?.name ?? '');
  const [year, setYear] = useState(String(shift?.year ?? currentJalaliMonth().y));
  const [flex, setFlex] = useState(String(shift?.flexMinutes ?? 0));
  const [days, setDays] = useState<DayDraft[]>(shift ? fromShift(shift.days) : defaultDays());

  const setDay = (index: number, patch: Partial<DayDraft>) =>
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  /** Copy one day's hours to every other working day. */
  const copyToActive = (from: number) =>
    setDays((prev) => prev.map((d, i) => (i !== from && d.isActive ? { ...prev[from], isActive: true } : d)));

  const handleSave = async () => {
    try {
      await save.submit({
        id: shift?.id,
        data: {
          name: name.trim(),
          year: Number(year),
          flexMinutes: Number(flex) || 0,
          days: days.map((d, dayOfWeek) => ({
            dayOfWeek,
            isActive: d.isActive,
            ...(d.isActive
              ? {
                  startTime: d.startTime,
                  endTime: d.endTime,
                  hasSecondPart: d.hasSecondPart,
                  ...(d.hasSecondPart ? { secondStartTime: d.secondStartTime, secondEndTime: d.secondEndTime } : {}),
                }
              : {}),
          })),
        },
      });
      toast.success(shift ? 'شیفت ویرایش شد' : 'شیفت ایجاد شد');
      onSaved();
      onClose();
    } catch (saveError) {
      toast.error(errorMessage(saveError, 'ذخیره انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      wide
      title={shift ? 'ویرایش شیفت' : 'شیفت جدید'}
      footer={
        <>
          <Button className="flex-1" disabled={!name.trim() || save.isLoading} onClick={handleSave}>
            {save.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="نام شیفت" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="سال" dir="ltr" className="text-left" value={year} onChange={(e) => setYear(e.target.value)} />
        <Input label="شناوری (دقیقه)" dir="ltr" className="text-left" value={flex} onChange={(e) => setFlex(e.target.value)} />
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {days.map((day, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <div className="w-24">
              <ToggleSwitch
                size="sm"
                label={WEEKDAY_LABELS[i]}
                checked={day.isActive}
                onChange={(isActive) =>
                  setDay(i, isActive ? { isActive, startTime: day.startTime || '08:00', endTime: day.endTime || '17:00' } : { isActive })
                }
              />
            </div>
            <div className="flex items-center gap-1">
              <input type="time" className={timeInput} disabled={!day.isActive} value={day.startTime} onChange={(e) => setDay(i, { startTime: e.target.value })} />
              <span className="text-slate-400">–</span>
              <input type="time" className={timeInput} disabled={!day.isActive} value={day.endTime} onChange={(e) => setDay(i, { endTime: e.target.value })} />
            </div>
            {day.isActive && (
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input type="checkbox" checked={day.hasSecondPart} onChange={(e) => setDay(i, { hasSecondPart: e.target.checked })} />
                شیفت دوم
              </label>
            )}
            {day.isActive && day.hasSecondPart && (
              <div className="flex items-center gap-1">
                <input type="time" className={timeInput} value={day.secondStartTime} onChange={(e) => setDay(i, { secondStartTime: e.target.value })} />
                <span className="text-slate-400">–</span>
                <input type="time" className={timeInput} value={day.secondEndTime} onChange={(e) => setDay(i, { secondEndTime: e.target.value })} />
              </div>
            )}
            {day.isActive && (
              <Button variant="outline" size="sm" className="mr-auto gap-1 text-xs" onClick={() => copyToActive(i)}>
                <IconCopy className="size-3.5" />
                کپی به روزهای کاری
              </Button>
            )}
          </div>
        ))}
      </div>
    </FormModal>
  );
}
