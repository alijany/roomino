'use client';

import { FormModal, Field } from '@/app/dashboard/attendance/attendance.component.layout';
import { JobGroup, UserBrief } from '@/app/dashboard/attendance/attendance.types';
import { errorMessage, fa } from '@/app/dashboard/attendance/attendance.util';
import { Avatar, Button, Dropdown, Input } from '@/ui/atoms';
import { IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { setUserTeam, useManagerCandidates, useSaveTeam, useTeamMembers } from './teams.api';
import { teamAndDescendants } from './teams.util';

/** A search box over users that lists matches to pick from. */
function UserPicker({
  excluded,
  onPick,
  candidatesFor,
}: {
  excluded: number[];
  onPick: (user: UserBrief) => void;
  candidatesFor: (text: string, enabled: boolean) => ReturnType<typeof useManagerCandidates>;
}) {
  const [search, setSearch] = useState('');
  const candidates = candidatesFor(search, search.trim().length > 0);
  const options = candidates.data?.items.filter((u) => !excluded.includes(u.id)) ?? [];

  return (
    <>
      <Input
        icon={<IconSearch className="size-4 text-slate-400" />}
        placeholder="جستجوی کاربر با نام یا موبایل"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search.trim() && (
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {options.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onPick(u);
                setSearch('');
              }}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <IconPlus className="size-4 text-slate-400" />
                <Avatar src={u.profilePicture} name={u.name} className="size-6" />
                {u.name ?? 'بدون نام'}
              </span>
              <span dir="ltr" className="text-xs text-slate-400">{fa(u.phone)}</span>
            </button>
          ))}
          {candidates.isLoading && <p className="py-2 text-center text-xs text-slate-400">در حال جستجو...</p>}
          {candidates.data && !options.length && <p className="py-2 text-center text-xs text-slate-400">کاربر دیگری پیدا نشد.</p>}
        </div>
      )}
    </>
  );
}

function UserChip({ user, tone, onRemove }: { user: UserBrief; tone: 'sky' | 'slate'; onRemove: () => void }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-lg py-1 pe-2 ps-1 text-sm ${
        tone === 'sky' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700'
      }`}
    >
      <Avatar src={user.profilePicture} name={user.name} className="size-6" />
      {user.name ?? fa(user.phone)}
      <button type="button" onClick={onRemove} aria-label="حذف">
        <IconX className="size-3.5" />
      </button>
    </span>
  );
}

/** Name, parent team, managers and members of a team. Members are saved as they are added or removed. */
export function TeamForm({
  team,
  teams,
  onClose,
  onSaved,
}: {
  team: JobGroup | null;
  teams: JobGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSaveTeam();
  const [name, setName] = useState(team?.name ?? '');
  const [parentId, setParentId] = useState<number | null>(team?.parentId ?? null);
  const [managers, setManagers] = useState<UserBrief[]>(team?.approvers ?? []);
  const members = useTeamMembers(team?.id ?? null);

  const blocked = team ? teamAndDescendants(teams, team.id) : new Set<number>();
  const parentItems = [
    { label: 'بدون تیم مادر', value: null as number | null },
    ...teams.filter((t) => !blocked.has(t.id)).map((t) => ({ label: t.name, value: t.id as number | null })),
  ];

  const changeMember = async (user: UserBrief, add: boolean) => {
    if (!team) return;
    try {
      await setUserTeam(user.id, add ? team.id : null);
      await members.refresh();
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error, 'تغییر عضویت انجام نشد'));
    }
  };

  const handleSave = async () => {
    try {
      await save.submit({
        id: team?.id,
        data: { name: name.trim(), parentId, approverIds: managers.map((m) => m.id) },
      });
      toast.success(team ? 'تیم ویرایش شد' : 'تیم ایجاد شد');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'ذخیره انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title={team ? 'ویرایش تیم' : 'تیم جدید'}
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
      <Input label="نام تیم" value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="تیم مادر" hint="اختیاری؛ مثلاً تیم رسانه می‌تواند زیر تیم عملیات باشد.">
        <Dropdown items={parentItems} value={parentId} onChange={(value) => setParentId(value ?? null)} variant="outline" />
      </Field>
      <Field
        label="مدیران تیم"
        hint="مدیر تیم، درخواست‌ها و تردد اعضای تیم و همهٔ زیرتیم‌ها را در «تیم من» بررسی می‌کند — هرگز درخواست خودش را."
      >
        <div className="mb-2 flex flex-wrap gap-1">
          {managers.map((m) => (
            <UserChip key={m.id} user={m} tone="sky" onRemove={() => setManagers(managers.filter((x) => x.id !== m.id))} />
          ))}
          {!managers.length && <span className="text-xs text-slate-400">هنوز کسی انتخاب نشده است.</span>}
        </div>
        <UserPicker
          excluded={managers.map((m) => m.id)}
          candidatesFor={useManagerCandidates}
          onPick={(user) => setManagers([...managers, user])}
        />
      </Field>
      {team ? (
        <Field label="اعضا" hint="افزودن یا حذف عضو همان لحظه ذخیره می‌شود. هر نفر در یک تیم است؛ با افزودن به این تیم از تیم قبلی‌اش خارج می‌شود.">
          <div className="mb-2 flex flex-wrap gap-1">
            {members.data?.items.map((m) => (
              <UserChip key={m.id} user={m} tone="slate" onRemove={() => changeMember(m, false)} />
            ))}
            {members.data && !members.data.items.length && <span className="text-xs text-slate-400">عضوی ندارد.</span>}
          </div>
          <UserPicker
            excluded={members.data?.items.map((m) => m.id) ?? []}
            candidatesFor={useManagerCandidates}
            onPick={(user) => changeMember(user, true)}
          />
        </Field>
      ) : (
        <p className="text-xs text-slate-400">اعضا را بعد از ساختن تیم می‌توانید اضافه کنید.</p>
      )}
    </FormModal>
  );
}
