'use client';

import { Avatar, Input } from '@/ui/atoms';
import { IconGripVertical } from '@tabler/icons-react';
import { useState } from 'react';
import { UserBrief } from '../attendance/attendance.types';
import { fa } from '../attendance/attendance.util';
import { DRAG_USER } from './oncall.component.calendar';
import { minutesLabel } from './oncall.util';

/**
 * The eligible people (chosen in the settings). A card is dragged onto a day of the calendar to
 * put the person there; the search box narrows a long list.
 */
export function OnCallPeople({
  people,
  totals,
  readOnly,
}: {
  people: UserBrief[];
  totals: Map<number, number>;
  readOnly: boolean;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim();
  const shown = needle ? people.filter((p) => (p.name ?? '').includes(needle)) : people;

  return (
    <div className="space-y-2">
      <Input placeholder="جستجوی نام" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="max-h-[32rem] space-y-1.5 overflow-auto">
        {shown.map((person) => (
          <li
            key={person.id}
            draggable={!readOnly}
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_USER, String(person.id));
              e.dataTransfer.effectAllowed = 'copyMove';
            }}
            className="flex cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 active:cursor-grabbing"
          >
            {!readOnly && <IconGripVertical className="size-4 shrink-0 text-slate-300" aria-hidden="true" />}
            <Avatar src={person.profilePicture} name={person.name} className="size-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{person.name ?? fa(person.phone)}</div>
              <div className="text-[11px] text-slate-400">{minutesLabel(totals.get(person.id) ?? 0)} ساعت در این دوره</div>
            </div>
          </li>
        ))}
        {!shown.length && <li className="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">{people.length ? 'کسی پیدا نشد.' : 'هنوز کسی واجد شرایط نیست؛ از «تنظیمات» اضافه کنید.'}</li>}
      </ul>
    </div>
  );
}
