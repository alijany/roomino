'use client';

import { Button } from '@/ui/atoms';
import { Modal } from '@/ui/atoms/ui.modal';
import { Avatar } from '@/ui/atoms/ui.avatar';
import { useState } from 'react';
import { dismissWelcome, greetNewcomer, useWelcome } from './welcome.api';
import { Newcomer } from './welcome.types';
import { dayMonthLabel } from './welcome.util';

/** The line under a newcomer: name, day and role in bold, trial only in passing. */
function IntroLine({ n }: { n: Newcomer }) {
  return (
    <p className="text-sm leading-7 text-slate-600">
      <b className="text-slate-800">{n.name?.split(' ')[0] ?? 'همکار جدید'}</b> از <b className="text-slate-800">{dayMonthLabel(n.hireDate)}</b>
      {n.jobTitle && (
        <>
          {' '}به‌عنوان <b className="text-slate-800">{n.jobTitle}</b>
        </>
      )}
      {n.probation && ' (در دورهٔ آزمایشی)'} به خانوادهٔ <b className="text-slate-800">تسمینو</b> پیوست. با انرژی و ایده‌های تازه‌اش در کنار ماست 🌱
    </p>
  );
}

/**
 * The dashboard's welcome of new colleagues: one dialog listing everyone who
 * joined this month and whom the viewer has not yet closed. The footer button
 * says welcome to all of them and closes the dialog for good.
 */
export function WelcomeModal() {
  const { data, refresh } = useWelcome();
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const newcomers = data?.newcomers ?? [];
  if (!newcomers.length) return null;

  const greetAll = async () => {
    setBusy(true);
    try {
      // Saying welcome also closes the introductions.
      await Promise.all(newcomers.map((n) => greetNewcomer(n.id)));
      setClosed(true);
      await dismissWelcome(newcomers.map((n) => n.id));
    } finally {
      setBusy(false);
      refresh();
    }
  };
  const close = async () => {
    setClosed(true);
    try {
      await dismissWelcome(newcomers.map((n) => n.id));
    } finally {
      refresh();
    }
  };

  return (
    <Modal isOpen={!closed} onClose={close} className="flex max-h-[85vh] flex-col bg-white pb-2 lg:w-[480px]">
      <div className="px-5 pt-5 text-center">
        <h2 className="text-lg font-bold text-slate-800">
          {newcomers.length > 1 ? 'همکاران تازه‌نفس تسمینو اینجا هستند 🎉' : 'یک همکار تازه‌نفس به تسمینو اضافه شد 🎉'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{newcomers.length > 1 ? 'همراهانی تازه برای ساختن کارهای بزرگ' : 'یک همراه دیگر برای ساختن کارهای بزرگ'}</p>
              </div>

      <ul className="mt-4 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
        {newcomers.map((n) => (
          <li key={n.id} className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-3">
              <Avatar src={n.picture} name={n.name} className="size-14" labelled />
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-800">{n.name}</div>
                {n.jobTitle && <div className="truncate text-xs text-slate-400">{n.jobTitle}</div>}
              </div>
            </div>
            <IntroLine n={n} />
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-100 p-4">
        <Button type="button" className="w-full" disabled={busy} onClick={greetAll}>
          {newcomers.length > 1 ? '👋 خوش آمدید' : '👋 خوش آمدی'}
        </Button>
      </div>
    </Modal>
  );
}
