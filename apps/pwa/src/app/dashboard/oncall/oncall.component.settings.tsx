'use client';

import { Avatar, Button, CurrencyInput, Input } from '@/ui/atoms';
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { Field, FormModal } from '../attendance/attendance.component.layout';
import { UserBrief } from '../attendance/attendance.types';
import { errorMessage, fa, latin } from '../attendance/attendance.util';
import { saveOnCallSettings, useOnCallSettings } from './oncall.api';
import { ClockSelect } from './oncall.component.clock-select';
import { OnCallDayType, OnCallRates, OnCallSlot, OnCallTemplates } from './oncall.types';
import { DAY_TYPE_LABELS, clockMinutes } from './oncall.util';

const TYPES: OnCallDayType[] = ['normal', 'thursday', 'friday', 'holiday'];

/** Default hours per kind of day, the day a period starts on, and who is on the list. */
export function OnCallSettingsModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data } = useOnCallSettings();
  if (!data) return null;
  return <SettingsForm initial={data} onClose={onClose} onSaved={onSaved} />;
}

function SettingsForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: NonNullable<ReturnType<typeof useOnCallSettings>['data']>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [templates, setTemplates] = useState<OnCallTemplates>(initial.templates);
  const [rates, setRates] = useState<OnCallRates>(initial.hourlyRates);
  const [startDay, setStartDay] = useState(String(initial.periodStartDay));
  const [eligible, setEligible] = useState<UserBrief[]>(initial.eligible);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const pool = [...initial.eligible, ...initial.candidates];
  const candidates = pool.filter(
    (c) => !eligible.some((e) => e.id === c.id) && (!search.trim() || (c.name ?? '').includes(search.trim())),
  );
  const removed = initial.eligible.filter((e) => !eligible.some((x) => x.id === e.id));
  const day = Number(latin(startDay));
  const invalid =
    !(day >= 1 && day <= 28) ||
    TYPES.some((type) => templates[type].some((slot) => clockMinutes(slot.start) >= clockMinutes(slot.end)));

  const setSlots = (type: OnCallDayType, slots: OnCallSlot[]) => setTemplates((prev) => ({ ...prev, [type]: slots }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveOnCallSettings({
        templates,
        hourlyRates: rates,
        periodStartDay: day,
        memberOrder: eligible.map((e) => e.id),
      });
      toast.success(
        result.replaced ? `ذخیره شد؛ ${fa(result.replaced)} ردیف کشیک آینده به نفر بعدی رسید` : 'تنظیمات کشیک ذخیره شد',
      );
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'ذخیره انجام نشد'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      wide
      title="تنظیمات کشیک"
      footer={
        <>
          <Button className="flex-1" disabled={saving || invalid} onClick={handleSave}>
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <Field label="ساعت پیش‌فرض کشیک" hint="هر روز بر اساس نوعش (تعطیلات رسمی از تقویم حضور و غیاب می‌آید) این ساعت‌ها را می‌گیرد؛ برای هر روز جدا هم قابل تغییر است.">
        <div className="space-y-3">
          {TYPES.map((type) => (
            <div key={type} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{DAY_TYPE_LABELS[type]}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={templates[type].length >= 3}
                  onClick={() => setSlots(type, [...templates[type], { start: '15:00', end: '20:00' }])}
                >
                  <IconPlus className="size-4" />
                  بازه
                </Button>
              </div>
              <div className="space-y-2">
                {templates[type].map((slot, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">از</span>
                    <ClockSelect
                      value={slot.start}
                      onChange={(start) => setSlots(type, templates[type].map((s, i) => (i === index ? { ...s, start } : s)))}
                    />
                    <span className="text-xs text-slate-400">تا</span>
                    <ClockSelect
                      value={slot.end}
                      onChange={(end) => setSlots(type, templates[type].map((s, i) => (i === index ? { ...s, end } : s)))}
                    />
                    {templates[type].length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="!px-2 border-none text-rose-500"
                        onClick={() => setSlots(type, templates[type].filter((_, i) => i !== index))}
                        aria-label="حذف بازه"
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <CurrencyInput
                  label="مبلغ هر ساعت (تومان)"
                  unit="toman"
                  value={rates[type]}
                  onValueChange={(v) => setRates((prev) => ({ ...prev, [type]: v ?? 0 }))}
                  placeholder="۰"
                />
              </div>
            </div>
          ))}
        </div>
      </Field>

      <Input
        label="روز شروع هر دوره از ماه شمسی"
        inputMode="numeric"
        value={fa(startDay)}
        onChange={(e) => setStartDay(latin(e.target.value).replace(/\D/g, ''))}
        maxLength={2}
      />
      <p className="-mt-2 text-xs text-slate-400">هر دوره تا روز قبل از همین روزِ ماه بعد ادامه دارد (مثلاً ۲۶ تا ۲۵).</p>

      <Field label="واجد شرایط کشیک" hint="از کل سازمان انتخاب کنید.">
        <div className="mb-2 flex flex-wrap gap-1">
          {eligible.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded-lg bg-slate-100 py-1 pe-2 ps-1 text-sm text-slate-700">
              <Avatar src={p.profilePicture} name={p.name} className="size-6" />
              {p.name}
              <button type="button" onClick={() => setEligible(eligible.filter((x) => x.id !== p.id))} aria-label="حذف">
                <IconX className="size-3.5" />
              </button>
            </span>
          ))}
          {!eligible.length && <span className="text-xs text-slate-400">هنوز کسی در لیست نیست.</span>}
        </div>
        <Input placeholder="جستجوی نام" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-auto">
          {candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setEligible([...eligible, c])}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-1 pe-2 ps-1 text-sm text-slate-600 hover:border-slate-400"
            >
              <IconPlus className="size-4 text-slate-400" />
              {c.name}
            </button>
          ))}
        </div>
        {removed.length > 0 && (
          <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs leading-6 text-amber-700">
            روزهای آیندهٔ {removed.map((r) => r.name).join('، ')} با ذخیره به نفر بعدی لیست می‌رسد؛ روزهای گذشته می‌مانند.
          </p>
        )}
      </Field>
    </FormModal>
  );
}
