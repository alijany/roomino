'use client';

import { Button, Dropdown, Input, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, DatePickerField, Table } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconCloudDownload, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteHoliday, useHolidays, useSaveHoliday, useSyncHolidays, useToggleHoliday } from './attendance.api';
import { FormModal } from './attendance.component.layout';
import { Holiday, HolidaySource } from './attendance.types';
import {
  currentJalaliMonth,
  errorMessage,
  fa,
  fromCivilDate,
  jalaliMonthName,
  tehranToday,
  toCivilDate,
} from './attendance.util';

export function HolidaysSettings() {
  const thisYear = currentJalaliMonth().y;
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState<number | null>(null);
  const [source, setSource] = useState<HolidaySource | null>(null);
  const [editing, setEditing] = useState<Holiday | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Holiday | null>(null);

  const { data, error, isLoading, refresh } = useHolidays({ year, month: month ?? undefined, source: source ?? undefined });
  const toggle = useToggleHoliday();
  const remove = useDeleteHoliday();
  const sync = useSyncHolidays();

  const handleSync = async () => {
    try {
      const result = await sync.submit({ year });
      const message = `تعطیلات رسمی ${fa(year)}: ${fa(result.added)} مورد جدید، ${fa(result.updated)} به‌روزرسانی`;
      if (result.error) toast.warning(`${message}. ${result.error}`);
      else toast.success(message);
      refresh();
    } catch (syncError) {
      toast.error(errorMessage(syncError, 'دریافت تعطیلات انجام نشد'));
    }
  };

  const handleToggle = async (holiday: Holiday) => {
    try {
      await toggle.submit(holiday.id);
      refresh();
    } catch (toggleError) {
      toast.error(errorMessage(toggleError, 'تغییر وضعیت انجام نشد'));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.submit(deleting.id);
      toast.success('تعطیلی حذف شد');
      refresh();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'حذف انجام نشد'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-28">
          <Dropdown
            items={[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => ({ label: fa(y), value: y }))}
            value={year}
            onChange={(value) => {
              if (value) setYear(value);
            }}
            variant="outline"
          />
        </div>
        <div className="w-32">
          <Dropdown
            items={[{ label: 'همه ماه‌ها', value: null }, ...Array.from({ length: 12 }, (_, i) => ({ label: jalaliMonthName(i + 1), value: i + 1 }))]}
            value={month}
            onChange={setMonth}
            placeholder="همه ماه‌ها"
            variant="outline"
          />
        </div>
        <div className="w-32">
          <Dropdown
            items={[
              { label: 'همه', value: null },
              { label: 'رسمی', value: HolidaySource.OFFICIAL },
              { label: 'دستی', value: HolidaySource.MANUAL },
            ]}
            value={source}
            onChange={setSource}
            placeholder="همه"
            variant="outline"
          />
        </div>
        <div className="mr-auto flex gap-2">
          <Button variant="outline" className="gap-2" disabled={sync.isLoading} onClick={handleSync}>
            <IconCloudDownload className="size-4" />
            {sync.isLoading ? 'در حال دریافت...' : `دریافت تعطیلات رسمی ${fa(year)}`}
          </Button>
          <Button className="gap-2" onClick={() => setEditing('new')}>
            <IconPlus className="size-4" />
            تعطیلی جدید
          </Button>
        </div>
      </div>

      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => !d?.items.length}
        emptyMessage="تعطیلی در این بازه ثبت نشده است. تعطیلات رسمی را از تقویم دریافت کنید."
        onRetry={refresh}
      >
        <Table
          rows={data?.items ?? []}
          rowKey={(h) => h.id}
          columns={[
            { key: 'date', header: 'تاریخ', render: (h) => <span className="tabular-nums">{fa(h.jalali)}</span> },
            { key: 'title', header: 'عنوان', render: (h) => h.title },
            {
              key: 'source',
              header: 'منبع',
              render: (h) => (
                <Badge tone={h.source === HolidaySource.OFFICIAL ? 'info' : 'neutral'} withDot={false}>
                  {h.source === HolidaySource.OFFICIAL ? 'رسمی' : 'دستی'}
                </Badge>
              ),
            },
            {
              key: 'active',
              header: 'فعال',
              render: (h) => (
                <ToggleSwitch size="sm" checked={h.active} onChange={() => handleToggle(h)} aria-label="فعال بودن" />
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (h) => (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="!px-2" onClick={() => setEditing(h)} aria-label="ویرایش">
                    <IconPencil className="size-4" />
                  </Button>
                  {h.source === HolidaySource.MANUAL && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="!px-2 border-none text-rose-500"
                      onClick={() => setDeleting(h)}
                      aria-label="حذف"
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
        <p className="pt-2 text-xs text-slate-400">
          تعطیلات رسمی حذف نمی‌شوند تا دریافت بعدی آن‌ها را برنگرداند؛ برای نادیده گرفتن، غیرفعالشان کنید.
        </p>
      </DataView>

      {editing && (
        <HolidayForm
          key={editing === 'new' ? 'new' : editing.id}
          holiday={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      <ConfirmModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="حذف تعطیلی"
        message={`«${deleting?.title ?? ''}» حذف شود؟`}
        confirmButtonText="حذف"
        cancelButtonText="بازگشت"
        isLoading={remove.isLoading}
      />
    </div>
  );
}

function HolidayForm({ holiday, onClose, onSaved }: { holiday: Holiday | null; onClose: () => void; onSaved: () => void }) {
  const save = useSaveHoliday();
  const [title, setTitle] = useState(holiday?.title ?? '');
  const [date, setDate] = useState(holiday?.date ?? tehranToday());
  const [active, setActive] = useState(holiday?.active ?? true);

  const handleSave = async () => {
    try {
      await save.submit({ id: holiday?.id, data: { title: title.trim(), date, active } });
      toast.success(holiday ? 'تغییرات ذخیره شد' : 'تعطیلی ثبت شد');
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
      title={holiday ? 'ویرایش تعطیلی' : 'تعطیلی جدید'}
      footer={
        <>
          <Button className="flex-1" disabled={!title.trim() || save.isLoading} onClick={handleSave}>
            {save.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <Input label="عنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
      <DatePickerField label="تاریخ" value={fromCivilDate(date)} onSelect={(d) => setDate(toCivilDate(d))} />
      <ToggleSwitch label="فعال" checked={active} onChange={setActive} />
    </FormModal>
  );
}
