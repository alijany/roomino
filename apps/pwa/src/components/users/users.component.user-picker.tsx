'use client';

import { fetcher } from '@/libs/api/api.util.fetcher';
import { withQuery } from '@/libs/api/api.util.query';
import { cn } from '@/libs/style/style.util.helpers';
import { Input } from '@/ui/atoms';
import { PersonLabel } from '@/ui/molecules';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useEffect, useId, useRef, useState } from 'react';
import useSWR from 'swr';

/** What the picker hands back — enough to show the person and to send their id. */
export interface PickableUser {
  id: number;
  name: string | null;
  personnelCode: string | null;
  jobTitle: string | null;
  profilePicture: string | null;
}

const LIMIT = 8;

/**
 * Pick one person by typing: suggestions come from `GET /users` (name, phone,
 * personnel code, job title) as you type, and the choice is shown as a chip
 * you can clear. Arrow keys, Enter and Escape work; a click outside closes it.
 *
 * `GET /users` is for admin and HR, so this is for their screens.
 */
export function UserPicker({
  value,
  onChange,
  label,
  placeholder = 'نام یا کد پرسنلی را بنویسید',
  excludeIds = [],
  disabled = false,
}: {
  value: PickableUser | null;
  onChange: (user: PickableUser | null) => void;
  label?: string;
  placeholder?: string;
  /** People who can't be chosen here (already added, etc.). */
  excludeIds?: number[];
  disabled?: boolean;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const { data, isLoading } = useSWR<{ items: PickableUser[] }>(
    open && !value ? withQuery('/users', { text: debounced || undefined, limit: LIMIT + excludeIds.length }) : null,
    fetcher,
    { keepPreviousData: true },
  );
  const options = (data?.items ?? []).filter((u) => !excludeIds.includes(u.id)).slice(0, LIMIT);

  const choose = (user: PickableUser) => {
    onChange(user);
    setText('');
    setDebounced('');
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative space-y-1.5">
      {label && <div className="text-sm font-medium text-slate-700">{label}</div>}

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <PersonLabel
            name={value.name}
            picture={value.profilePicture}
            detail={[value.personnelCode, value.jobTitle].filter(Boolean).join(' · ') || undefined}
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="تغییر کاربر"
            >
              <IconX className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          <div onKeyDown={onKeyDown}>
            <Input
              icon={<IconSearch className="size-4 text-slate-400" />}
              placeholder={placeholder}
              value={text}
              disabled={disabled}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              autoComplete="off"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
                setActive(0);
              }}
            />
          </div>
          {open && (
            <ul
              id={listId}
              role="listbox"
              className="absolute inset-x-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              {options.map((user, index) => (
                <li key={user.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(user)}
                    className={cn(
                      'flex w-full items-center rounded-lg px-2 py-1.5 text-start',
                      index === active ? 'bg-slate-50' : 'hover:bg-slate-50',
                    )}
                  >
                    <PersonLabel
                      name={user.name}
                      picture={user.profilePicture}
                      detail={[user.personnelCode, user.jobTitle].filter(Boolean).join(' · ') || undefined}
                    />
                  </button>
                </li>
              ))}
              {!options.length && (
                <li className="px-3 py-3 text-center text-xs text-slate-400">
                  {isLoading ? 'در حال جستجو...' : 'کاربری پیدا نشد.'}
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
