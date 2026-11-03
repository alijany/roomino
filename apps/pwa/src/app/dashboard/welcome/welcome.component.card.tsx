'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Avatar } from '@/ui/atoms/ui.avatar';
import { Modal } from '@/ui/atoms/ui.modal';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { fa, tehranToday } from '../attendance/attendance.util';
import { dismissWelcome, useWelcome } from './welcome.api';
import { WelcomeGreeter } from './welcome.types';
import { dayMonthLabel } from './welcome.util';

/** Cards show this many greeters; the rest open in a dialog. */
const VISIBLE = 3;

function GreeterPill({ g }: { g: WelcomeGreeter }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white py-1 pe-4 ps-1 shadow-sm">
      <Avatar src={g.picture} name={g.name} className="size-8" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm text-slate-700">{g.name}</span>
        {g.jobTitle && <span className="truncate text-[11px] text-slate-400">{g.jobTitle}</span>}
      </span>
    </span>
  );
}

/** The newcomer's own card for their first month: who has welcomed them. */
export function WelcomeCard({ className }: { className?: string }) {
  const { data, refresh } = useWelcome();
  const [showAll, setShowAll] = useState(false);
  const mine = data?.mine;
  if (!mine) return null;

  const greeters = mine.greeters;
  const trial = mine.probationEndDate && mine.probationEndDate >= tehranToday();

  return (
    <section
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-5',
        className,
      )}
    >
      <span aria-hidden className="pointer-events-none absolute -left-3 -top-4 select-none text-8xl opacity-10">
        🎉
      </span>
      <button
        type="button"
        aria-label="بستن"
        title="بستن"
        className="absolute left-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-600"
        onClick={async () => {
          await dismissWelcome([mine.userId]);
          refresh();
        }}
      >
        <IconX className="size-4" />
      </button>

      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🎉</span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800">
            {mine.firstName ? `${mine.firstName} جان، ` : ''}به تسمینو خوش آمدی!
          </h2>
          <p className="mt-0.5 text-sm leading-7 text-slate-600">
            خوشحالیم که کنار ما هستی. ایده‌ها و پرسش‌هایت را با خیال راحت مطرح کن؛ اینجا جایی برای رشد کردن و درخشیدن توست.
            {trial && ` دورهٔ آزمایشی‌ات تا ${dayMonthLabel(mine.probationEndDate)} است؛ با اطمینان قدم بردار، ما کنارت هستیم.`}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {greeters.length ? (
          <>
            <div className="mb-2 text-xs font-medium text-slate-500">{fa(greeters.length)} همکار به تو خوش‌آمد گفتند 👋</div>
            <div className="flex flex-wrap gap-2">
              {greeters.slice(0, VISIBLE).map((g) => (
                <GreeterPill key={g.id} g={g} />
              ))}
              {greeters.length > VISIBLE && (
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
                  onClick={() => setShowAll(true)}
                >
                  و {fa(greeters.length - VISIBLE)} نفر دیگر
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">همکارانت به‌زودی با تو آشنا می‌شوند 🙂</p>
        )}
      </div>
      <Modal isOpen={showAll} onClose={() => setShowAll(false)} className="flex max-h-[80vh] flex-col bg-white lg:w-[420px]">
        <div className="flex items-center justify-between px-5 pt-4">
          <h3 className="font-semibold text-slate-800">{fa(greeters.length)} همکار به تو خوش‌آمد گفتند 👋</h3>
          <button type="button" aria-label="بستن" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setShowAll(false)}>
            <IconX className="size-4" />
          </button>
        </div>
        <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 pb-5">
          {greeters.map((g) => (
            <li key={g.id}>
              <GreeterPill g={g} />
            </li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}
