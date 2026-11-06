'use client';

import { Button, Dropdown } from '@/ui/atoms';
import { format as formatJalali } from 'date-fns-jalali';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Field, FormModal } from '../attendance/attendance.component.layout';
import { errorMessage, fa, fromCivilDate } from '../attendance/attendance.util';
import { answerOnCallSwap, createOnCallSwap, useColleagueShifts, useOnCallColleagues } from './oncall.api';
import { swapSentence } from './oncall.component.swap-card';
import { ClockSelect } from './oncall.component.clock-select';
import { MyOnCallDay, MyOnCallSwaps, OnCallSwapKind } from './oncall.types';

/** `پنج‌شنبه ۱۴۰۵/۰۸/۰۵` — the weekday spelled out beside the date. */
const dayLabel = (d: MyOnCallDay) => `${formatJalali(fromCivilDate(d.date), 'EEEE')} ${fa(d.jalali)}`;

/** Ask a colleague to swap or take one of my days. */
export function OnCallSwapForm({
  day,
  swaps,
  onClose,
  onDone,
}: {
  day: MyOnCallDay;
  swaps?: MyOnCallSwaps;
  onClose: () => void;
  onDone: () => void;
}) {
  const colleagues = useOnCallColleagues();
  const [kind, setKind] = useState<OnCallSwapKind>('swap');
  const [targetId, setTargetId] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  // Colleagues mostly agree beforehand, so the default only records the change.
  const [agreed, setCoordinated] = useState(true);
  // A day already gone cannot be asked about, only recorded.
  const coordinated = agreed || day.past;
  const first = day.entries[0];
  const [from, setFrom] = useState(first?.start ?? '17:30');
  const [to, setTo] = useState(first?.end ?? '23:00');
  const theirs = useColleagueShifts(kind === 'swap' ? targetId : null);
  const choices = (theirs.data?.items ?? []).filter((d) => !d.pending && (coordinated || !d.past));

  // The colleague's next day is the natural choice; it can still be changed.
  const firstChoice = choices[0]?.date ?? '';
  useEffect(() => {
    if (kind === 'swap' && !targetDate && firstChoice) setTargetDate(firstChoice);
  }, [kind, targetDate, firstChoice]);

  // A request already open on this day: answer or withdraw it before asking anyone else.
  const outgoing = swaps?.outgoing.find((r) => r.requesterDate === day.date);
  const incoming = swaps?.incoming.find((r) => r.targetDate === day.date);
  const open = outgoing ?? incoming;

  const answer = async (id: number, action: 'accept' | 'decline' | 'cancel') => {
    setSaving(true);
    try {
      await answerOnCallSwap(id, action);
      toast.success(action === 'cancel' ? 'درخواست لغو شد؛ می‌توانید از همکار دیگری بخواهید' : action === 'accept' ? 'پذیرفته شد' : 'رد شد');
      onDone();
      if (action !== 'cancel') onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'انجام نشد'));
    } finally {
      setSaving(false);
    }
  };

  const ready = targetId && (kind !== 'swap' || targetDate) && (kind !== 'partial' || from < to);

  const submit = async () => {
    if (!targetId) return;
    setSaving(true);
    try {
      await createOnCallSwap({
        kind,
        targetId,
        requesterDate: day.date,
        targetDate: kind === 'swap' ? targetDate : undefined,
        startTime: kind === 'partial' ? from : undefined,
        endTime: kind === 'partial' ? to : undefined,
        coordinated,
      });
      toast.success(coordinated ? 'جابه‌جایی ثبت شد' : 'درخواست برای همکار فرستاده شد');
      onDone();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'ارسال درخواست انجام نشد'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title={`جابه‌جایی کشیک ${dayLabel(day)}`}
      footer={
        open ? (
          <>
            {outgoing ? (
              <Button className="flex-1" disabled={saving} onClick={() => answer(outgoing.id, 'cancel')}>
                لغو درخواست
              </Button>
            ) : (
              <>
                <Button className="flex-1" disabled={saving} onClick={() => answer(incoming!.id, 'accept')}>
                  قبول
                </Button>
                <Button variant="outline" className="flex-1" disabled={saving} onClick={() => answer(incoming!.id, 'decline')}>
                  رد
                </Button>
              </>
            )}
            <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
              بستن
            </Button>
          </>
        ) : (
        <>
          <Button className="flex-1" disabled={saving || !ready} onClick={submit}>
            {saving ? 'در حال ثبت...' : coordinated ? 'ثبت جابه‌جایی' : 'ارسال درخواست'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
        )
      }
    >
      {open ? (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm leading-7 text-slate-700">
          <div className="font-medium text-slate-800">{outgoing ? 'درخواست شما در انتظار پاسخ است' : 'همکارتان از شما درخواست جابه‌جایی دارد'}</div>
          <div>{swapSentence(open, outgoing ? 'requester' : 'target')}</div>
          {outgoing && <div className="text-xs text-slate-500">با لغو آن، می‌توانید همین روز را از همکار دیگری بخواهید.</div>}
        </div>
      ) : (
        <>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['swap', 'تعویض روز'],
            ['handover', 'واگذاری روز'],
            ['partial', 'واگذاری ساعتی'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`rounded-xl border p-2.5 text-sm ${kind === value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Field label="همکار">
        <Dropdown
          variant="outline"
          placeholder="انتخاب کنید"
          items={(colleagues.data?.items ?? []).map((p) => ({ label: p.name ?? '', value: p.id }))}
          value={targetId}
          onChange={(value) => {
            setTargetId(value);
            setTargetDate('');
          }}
        />
      </Field>
      {kind === 'swap' && targetId && (
        <Field label="کدام روز او را می‌گیرید؟">
          <Dropdown
            variant="outline"
            placeholder="انتخاب کنید"
            items={choices.map((d) => ({ label: dayLabel(d), value: d.date }))}
            value={targetDate || null}
            onChange={(value) => setTargetDate(value ?? '')}
          />
          {!theirs.isLoading && !choices.length && (
            <p className="mt-1 text-xs text-slate-400">این همکار روز قابل جابه‌جایی‌ای ندارد.</p>
          )}
        </Field>
      )}
      {kind === 'partial' && (
        <Field label="ساعت‌هایی که واگذار می‌کنید">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">از</span>
            <ClockSelect value={from} onChange={setFrom} />
            <span className="text-xs text-slate-400">تا</span>
            <ClockSelect value={to} onChange={setTo} />
          </div>
        </Field>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={coordinated}
        disabled={day.past}
        onClick={() => setCoordinated((v) => !v)}
        className="flex items-center gap-2 text-sm text-slate-700"
      >
        <span className={`relative h-5 w-9 rounded-full transition-colors ${coordinated ? 'bg-brand-500' : 'bg-slate-300'}`}>
          <span
            className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${coordinated ? 'end-0.5' : 'start-0.5'}`}
          />
        </span>
        از قبل با همکار هماهنگ شده
      </button>
      <p className="text-xs leading-6 text-slate-400">
        {day.past
          ? 'این روز گذشته است؛ جابه‌جایی همین حالا ثبت می‌شود و همکار فقط اعلان می‌گیرد.'
          : coordinated
          ? 'جابه‌جایی همین حالا ثبت می‌شود و همکار فقط اعلان می‌گیرد.'
          : 'درخواست برای همکار می‌رود و با پذیرفتن او اعمال می‌شود.'}{' '}
        نیازی به تأیید مدیر نیست؛ مدیر فقط در گزارش می‌بیند.
      </p>
        </>
      )}
    </FormModal>
  );
}
