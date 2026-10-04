'use client';

import { Button, Input } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconPencil, IconPlus, IconSearch, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useApproverCandidates, useDeleteJobGroup, useJobGroups, useSaveJobGroup } from './attendance.api';
import { Field, FormModal } from './attendance.component.layout';
import { JobGroup, UserBrief } from './attendance.types';
import { errorMessage, fa } from './attendance.util';

export function JobGroupsSettings() {
  const { data, error, isLoading, refresh } = useJobGroups();
  const remove = useDeleteJobGroup();
  const [editing, setEditing] = useState<JobGroup | 'new' | null>(null);
  const [deleting, setDeleting] = useState<JobGroup | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.submit(deleting.id);
      toast.success('گروه شغلی حذف شد');
      refresh();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'حذف انجام نشد'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          تاییدکنندگان هر گروه در «تیم من» درخواست‌ها و تردد اعضای گروه را بررسی می‌کنند — هرگز درخواست خودشان را.
        </p>
        <Button className="gap-2" onClick={() => setEditing('new')}>
          <IconPlus className="size-4" />
          گروه جدید
        </Button>
      </div>
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => !d?.items.length}
        emptyMessage="هنوز گروه شغلی تعریف نشده است."
        onRetry={refresh}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((group) => (
            <div key={group.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-800">{group.name}</div>
                  <div className="text-xs text-slate-500">{fa(group.employeeCount ?? 0)} عضو</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="!px-2" onClick={() => setEditing(group)} aria-label="ویرایش">
                    <IconPencil className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="!px-2 border-none text-rose-500"
                    onClick={() => setDeleting(group)}
                    aria-label={`حذف ${group.name}`}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.approvers.length ? (
                  group.approvers.map((a) => (
                    <Badge key={a.id} tone="info" withDot={false}>
                      {a.name ?? fa(a.phone)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-amber-600">بدون تاییدکننده — درخواست‌ها به منابع انسانی می‌رسد</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </DataView>

      {editing && (
        <JobGroupForm
          key={editing === 'new' ? 'new' : editing.id}
          group={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      <ConfirmModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="حذف گروه شغلی"
        message={`«${deleting?.name ?? ''}» حذف شود؟ اعضای آن بدون گروه می‌مانند.`}
        confirmButtonText="حذف"
        cancelButtonText="بازگشت"
      />
    </div>
  );
}

function JobGroupForm({ group, onClose, onSaved }: { group: JobGroup | null; onClose: () => void; onSaved: () => void }) {
  const save = useSaveJobGroup();
  const [name, setName] = useState(group?.name ?? '');
  const [approvers, setApprovers] = useState<UserBrief[]>(group?.approvers ?? []);
  const [search, setSearch] = useState('');
  const candidates = useApproverCandidates(search, search.trim().length > 0);

  const add = (user: UserBrief) => {
    if (!approvers.some((a) => a.id === user.id)) setApprovers([...approvers, user]);
    setSearch('');
  };

  const handleSave = async () => {
    try {
      await save.submit({ id: group?.id, data: { name: name.trim(), approverIds: approvers.map((a) => a.id) } });
      toast.success(group ? 'گروه شغلی ویرایش شد' : 'گروه شغلی ایجاد شد');
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
      title={group ? 'ویرایش گروه شغلی' : 'گروه شغلی جدید'}
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
      <Input label="نام گروه" value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="تاییدکنندگان">
        <div className="mb-2 flex flex-wrap gap-1">
          {approvers.map((a) => (
            <span key={a.id} className="flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-sm text-sky-700">
              {a.name ?? fa(a.phone)}
              <button type="button" onClick={() => setApprovers(approvers.filter((x) => x.id !== a.id))} aria-label="حذف">
                <IconX className="size-3.5" />
              </button>
            </span>
          ))}
          {!approvers.length && <span className="text-xs text-slate-400">هنوز کسی انتخاب نشده است.</span>}
        </div>
        <Input
          icon={<IconSearch className="size-4 text-slate-400" />}
          placeholder="جستجوی کاربر با نام یا موبایل"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim() && (
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {candidates.data?.items.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => add(u)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-slate-300"
              >
                <span>{u.name ?? 'بدون نام'}</span>
                <span dir="ltr" className="text-xs text-slate-400">{fa(u.phone)}</span>
              </button>
            ))}
          </div>
        )}
      </Field>
    </FormModal>
  );
}
