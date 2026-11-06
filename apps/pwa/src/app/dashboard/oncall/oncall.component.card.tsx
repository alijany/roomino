'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { IconCalendarEvent, IconPhoneCall } from '@tabler/icons-react';
import { format as formatJalali } from 'date-fns-jalali';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { errorMessage, fa, fromCivilDate, tehranToday } from '../attendance/attendance.util';
import { answerOnCallSwap, useMyOnCallSummary } from './oncall.api';
import { swapSentence } from './oncall.component.swap-card';
import { MyOnCallDay } from './oncall.types';

const hours = (day: MyOnCallDay) => day.entries.map((e) => `${fa(e.start)} تا ${fa(e.end)}`).join('  ·  ');
const weekday = (date: string) => formatJalali(fromCivilDate(date), 'EEEE');

function daysUntil(date: string) {
  const diff = Math.round((fromCivilDate(date).getTime() - fromCivilDate(tehranToday()).getTime()) / 86_400_000);
  if (diff === 1) return 'فردا';
  return `${fa(diff)} روز دیگر`;
}

/**
 * The dashboard card beside attendance, for people on the on-call list: what
 * is on tonight or next, the few days after, and any swap waiting for an answer.
 */
export function OnCallCard({ className }: { className?: string }) {
  const { data, refresh } = useMyOnCallSummary();
  const [busy, setBusy] = useState(false);
  if (!data?.eligible) return null;
  const { today, next, requests, incoming } = data;
  const hero = today ?? next;

  const answer = async (id: number, action: 'accept' | 'decline') => {
    setBusy(true);
    try {
      await answerOnCallSwap(id, action);
      toast.success(action === 'accept' ? 'پذیرفته شد؛ کشیک‌ها جابه‌جا شد' : 'رد شد');
    } catch (error) {
      toast.error(errorMessage(error, 'انجام نشد'));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  return (
    <section className={cn('ui-surface flex shrink-0 flex-col gap-3 p-4', className)} aria-labelledby="oncall-card-title">
      <div className="flex items-center gap-2">
        <span className="ui-page-icon !size-9">
          <IconPhoneCall className="size-5" />
        </span>
        <h2 id="oncall-card-title" className="font-bold text-slate-800">
          کشیک من
        </h2>
        <Link href="/dashboard/oncall" className="ms-auto flex items-center gap-1 text-xs text-brand-600 hover:underline">
          <IconCalendarEvent className="size-4" />
          تقویم کشیک
        </Link>
      </div>

      {hero ? (
        <div className={cn('rounded-2xl p-4', today ? 'bg-sky-50' : 'bg-slate-50')}>
          <div className={cn('text-xs font-medium', today ? 'text-sky-700' : 'text-slate-500')}>
            {today ? 'امروز کشیک دارید' : `کشیک بعدی · ${daysUntil(hero.date)}`}
          </div>
          <div className="mt-1 text-lg font-bold text-slate-800">
            {weekday(hero.date)} {fa(hero.jalali)}
          </div>
          <div className="mt-0.5 text-sm text-slate-600">{hours(hero)}</div>
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">کشیک منتشرشده‌ای برای شما در پیش نیست.</p>
      )}

      {today && next && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-500">بعدی: {daysUntil(next.date)}</span>
          <span className="text-slate-700">
            {weekday(next.date)} {fa(next.jalali)}
          </span>
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-amber-700">
            {fa(incoming)} درخواست جابه‌جایی منتظر پاسخ شماست
          </div>
          {requests.map((r) => (
            <div key={r.id} className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <div className="text-sm leading-6 text-slate-700">{swapSentence(r, 'target')}</div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => answer(r.id, 'accept')}>
                  قبول
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => answer(r.id, 'decline')}>
                  رد
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

    </section>
  );
}
