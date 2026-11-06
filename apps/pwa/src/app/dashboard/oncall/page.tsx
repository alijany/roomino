'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconPhoneCall } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { PageHeader, Panel } from '../attendance/attendance.component.layout';
import { errorMessage } from '../attendance/attendance.util';
import { answerOnCallSwap, useMyOnCallSchedule, useMyOnCallShifts, useMyOnCallSwaps } from './oncall.api';
import { OnCallCalendar } from './oncall.component.calendar';
import { periodContaining } from './oncall.util';
import { durationLabel, jalaliLabel, shiftJalaliMonth, tehranClockNow, tehranToday } from '../attendance/attendance.util';
import { useAuth } from '@/components/auth/auth.context.provider';
import { clockMinutes } from './oncall.util';
import { IconCalendarMonth, IconChevronLeft, IconChevronRight, IconList } from '@tabler/icons-react';
import { StatusBadge, swapSentence } from './oncall.component.swap-card';
import { OnCallSwapForm } from './oncall.component.swap-form';
import { MyOnCallDay } from './oncall.types';

/** کشیک من — my coming days, and swap requests between colleagues. */
export default function MyOnCallPage() {
  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <MyOnCallContent />
      </DashbaordLayout>
    </ProtectedRoute>
  );
}

function MyOnCallContent() {
  const shifts = useMyOnCallShifts();
  const swaps = useMyOnCallSwaps();
  const [asking, setAsking] = useState<MyOnCallDay | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyMine, setOnlyMine] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  // A phone starts on the list; the choice is the person's from then on.
  useEffect(() => {
    if (window.matchMedia('(max-width: 639px)').matches) setView('list');
  }, []);
  const [period, setPeriod] = useState(() => periodContaining(26));
  const calendar = useMyOnCallSchedule(period.year, period.month);
  const { user } = useAuth();
  const hours = (() => {
    // Minutes of my slots in the shown period: all of it, and how much has already gone by.
    let total = 0;
    let done = 0;
    const today = tehranToday();
    const now = clockMinutes(tehranClockNow());
    for (const day of calendar.data?.days ?? []) {
      for (const e of day.entries) {
        if (e.user.id !== user?.id) continue;
        const start = clockMinutes(e.start);
        const end = clockMinutes(e.end);
        total += end - start;
        if (day.date < today) done += end - start;
        else if (day.date === today) done += Math.max(0, Math.min(now, end) - start);
      }
    }
    return { total, done };
  })();
  const mineDates = new Set((shifts.data?.items ?? []).map((d) => d.date));
  const move = (delta: number) =>
    setPeriod((p) => {
      const s = shiftJalaliMonth(p.year, p.month, delta);
      return { year: s.y, month: s.m };
    });

  const refresh = () => {
    shifts.refresh();
    swaps.refresh();
    calendar.refresh();
  };

  const answer = async (id: number, action: 'accept' | 'decline' | 'cancel') => {
    setBusy(true);
    try {
      await answerOnCallSwap(id, action);
      toast.success(action === 'accept' ? 'پذیرفته شد؛ کشیک‌ها جابه‌جا شد' : action === 'decline' ? 'رد شد' : 'درخواست لغو شد');
      refresh();
    } catch (error) {
      toast.error(errorMessage(error, 'انجام نشد'));
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex grow flex-col gap-3 overflow-auto pb-6">
      <PageHeader
        icon={<IconPhoneCall className="size-6" />}
        title="کشیک من"
        subtitle="روزهای پیش‌رو و جابه‌جایی با همکاران"
      />

      {hours.total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {([
            ['سپری‌شده', hours.done, 'text-brand-700'],
            ['باقی‌مانده', hours.total - hours.done, 'text-slate-700'],
            ['کل این دوره', hours.total, 'text-slate-700'],
          ] as const).map(([label, minutes, tone]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-center shadow-sm">
              <div className="text-[11px] text-slate-400">{label}</div>
              <div className={`mt-0.5 text-sm font-semibold ${tone}`}>{minutes ? durationLabel(minutes) : '—'}</div>
            </div>
          ))}
        </div>
      )}

      {(swaps.data?.incoming.length ?? 0) > 0 && (
        <Panel className="gap-2">
          <h2 className="text-sm font-semibold text-slate-700">درخواست‌های رسیده</h2>
          {swaps.data!.incoming.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <span className="min-w-0 flex-1 basis-56 text-sm text-slate-700">{swapSentence(s, 'target')}</span>
              <Button size="sm" disabled={busy} onClick={() => answer(s.id, 'accept')}>
                قبول
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => answer(s.id, 'decline')}>
                رد
              </Button>
            </div>
          ))}
        </Panel>
      )}

      <Panel className="gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="!px-2" onClick={() => move(-1)} aria-label="دورهٔ قبل">
            <IconChevronRight className="size-4" />
          </Button>
          <span className="min-w-52 text-center text-sm font-medium text-slate-700">
            {calendar.data ? `${jalaliLabel(calendar.data.period.start)} تا ${jalaliLabel(calendar.data.period.end)}` : '...'}
          </span>
          <Button variant="outline" size="sm" className="!px-2" onClick={() => move(1)} aria-label="دورهٔ بعد">
            <IconChevronLeft className="size-4" />
          </Button>
          </div>
          <div className="ms-auto flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="نحوهٔ نمایش">
            {([
              ['calendar', 'تقویم', IconCalendarMonth],
              ['list', 'لیست', IconList],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                aria-pressed={view === value}
                title={label}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                  view === value ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={onlyMine}
            onClick={() => setOnlyMine((v) => !v)}
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <span className={`relative h-5 w-9 rounded-full transition-colors ${onlyMine ? 'bg-brand-500' : 'bg-slate-300'}`}>
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${onlyMine ? 'end-0.5' : 'start-0.5'}`}
              />
            </span>
            فقط روزهای من
          </button>
          </div>
        </div>
        <DataView data={calendar.data} error={calendar.error} isLoading={calendar.isLoading} onRetry={calendar.refresh}>
          {calendar.data &&
            (calendar.data.period.status === 'published' ? (
              <div className="space-y-2">
                <OnCallCalendar
                  schedule={calendar.data}
                  readOnly
                  mineDates={mineDates}
                  onlyMine={onlyMine}
                  view={view}
                  onDropUser={() => undefined}
                  onOpenDay={(day) => {
                    const mine = shifts.data?.items.find((d) => d.date === day.date);
                    if (!mine) return;
                    setAsking(mine);
                  }}
                />
                <p className="text-xs text-slate-400">روزهای شما با کادر رنگی مشخص شده؛ برای جابه‌جایی روی آن‌ها بزنید.</p>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">برنامهٔ کشیک این دوره هنوز منتشر نشده است.</p>
            ))}
        </DataView>
      </Panel>

      {(swaps.data?.outgoing.length ?? 0) > 0 && (
        <Panel className="gap-2">
          <h2 className="text-sm font-semibold text-slate-700">درخواست‌های من در انتظار</h2>
          {swaps.data!.outgoing.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3">
              <span className="min-w-0 flex-1 basis-56 text-sm text-slate-700">{swapSentence(s, 'requester')}</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => answer(s.id, 'cancel')}>
                لغو درخواست
              </Button>
            </div>
          ))}
        </Panel>
      )}

      {(swaps.data?.history.length ?? 0) > 0 && (
        <Panel className="gap-2">
          <h2 className="text-sm font-semibold text-slate-700">سابقهٔ جابه‌جایی‌ها</h2>
          {swaps.data!.history.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="min-w-0 flex-1 basis-56">{swapSentence(s)}</span>
              <StatusBadge status={s.status} coordinated={s.coordinated} />
            </div>
          ))}
        </Panel>
      )}

      {asking && <OnCallSwapForm key={asking.date} day={asking} swaps={swaps.data} onClose={() => setAsking(null)} onDone={refresh} />}
    </div>
  );
}
