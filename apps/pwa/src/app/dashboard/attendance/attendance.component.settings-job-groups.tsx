'use client';

import { Avatar, Button } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView } from '@/ui/molecules';
import { IconPencil } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useJobGroups, useSaveJobGroup } from './attendance.api';
import { AttendanceModeBadge, Field, FormModal } from './attendance.component.layout';
import { AttendanceModePicker } from './attendance.component.mode-picker';
import { WeekdayPicker } from './attendance.component.weekday-picker';
import { WEEKDAY_LABELS } from './attendance.constants';
import { AttendanceMode, JobGroup } from './attendance.types';
import { errorMessage, fa } from './attendance.util';

/**
 * The attendance side of the organisation's teams: how each team checks in
 * and its fixed remote days. Teams themselves — name, parent, managers and
 * members — are managed under «تیم‌ها».
 */
export function JobGroupsSettings() {
  const { data, error, isLoading, refresh } = useJobGroups();
  const [editing, setEditing] = useState<JobGroup | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          شیوهٔ تردد و روزهای دورکاری ثابت هر تیم را اینجا تنظیم کنید. مدیران تیم در «تیم من» درخواست‌ها و تردد اعضا (و زیرتیم‌ها) را بررسی می‌کنند — هرگز درخواست خودشان را.
        </p>
        <Link href="/admin/teams" className="text-sm font-medium text-brand-600 hover:underline">
          مدیریت تیم‌ها، مدیران و اعضا
        </Link>
      </div>
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => !d?.items.length}
        emptyMessage="هنوز تیمی تعریف نشده است. تیم‌ها را از «تیم‌ها» در مدیریت سازمان بسازید."
        onRetry={refresh}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((group) => (
            <div key={group.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-800">{group.name}</div>
                  {group.parentName && <div className="text-xs text-slate-400">زیر {group.parentName}</div>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {fa(group.employeeCount ?? 0)} عضو
                    <AttendanceModeBadge mode={group.attendanceMode} />
                  </div>
                  {group.remoteDays.length > 0 && (
                    <div className="mt-1 text-xs text-slate-500">
                      دورکاری ثابت: {group.remoteDays.map((d) => WEEKDAY_LABELS[d]).join('، ')}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="!px-2" onClick={() => setEditing(group)} aria-label="ویرایش">
                  <IconPencil className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.approvers.length ? (
                  group.approvers.map((a) => (
                    <Badge key={a.id} tone="info" withDot={false} className="gap-1.5 ps-1">
                      <Avatar src={a.profilePicture} name={a.name} className="size-5" />
                      {a.name ?? fa(a.phone)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-amber-600">بدون مدیر — درخواست‌ها به منابع انسانی می‌رسد</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </DataView>

      {editing && <JobGroupForm key={editing.id} group={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function JobGroupForm({ group, onClose, onSaved }: { group: JobGroup; onClose: () => void; onSaved: () => void }) {
  const save = useSaveJobGroup();
  const [mode, setMode] = useState<AttendanceMode>(group.attendanceMode);
  const [remoteDays, setRemoteDays] = useState<number[]>(group.remoteDays);

  const handleSave = async () => {
    try {
      // Only the attendance settings: name, parent and managers stay as they are.
      await save.submit({ id: group.id, data: { name: group.name, attendanceMode: mode, remoteDays } });
      toast.success('تنظیمات حضور و غیاب تیم ذخیره شد');
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
      title={`حضور و غیاب تیم «${group.name}»`}
      footer={
        <>
          <Button className="flex-1" disabled={save.isLoading} onClick={handleSave}>
            {save.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <Field
        label="نوع حضور اعضا"
        hint={
          mode !== group.attendanceMode
            ? 'اعضایی که نوع حضور جداگانه ندارند از این تغییر پیروی می‌کنند. «بدون ثبت» از امروز شروع می‌شود، بازگشت از آن از فردا؛ روزهای گذشته عوض نمی‌شوند.'
            : 'هر عضو را می‌توان در فرم پرسنل استثنا کرد.'
        }
      >
        <AttendanceModePicker value={mode} onChange={(next) => next && setMode(next)} />
      </Field>
      <Field label="روزهای دورکاری ثابت" hint="برای همه‌ی اعضای تیم؛ به روزهای دورکاری خود هر عضو اضافه می‌شود. در این روزها ورود و خروج از هر جایی پذیرفته و کل موظفی شیفت کارکرد حساب می‌شود.">
        <WeekdayPicker value={remoteDays} onChange={setRemoteDays} />
      </Field>
    </FormModal>
  );
}
