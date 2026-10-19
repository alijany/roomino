'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { cn } from '@/libs/style/style.util.helpers';
import { Button, Input, ToggleSwitch } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconAlertTriangle, IconEraser, IconTool } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { mutate } from 'swr';
import { useMaintenanceSummary, useResetAttendance, useUpdateScheduleMode } from '../attendance.api';
import { FormModal, PageHeader, Panel } from '../attendance.component.layout';
import { AttendanceTable, MaintenanceSummary, ResetScope, ScheduleMode } from '../attendance.types';
import { errorMessage, fa, tehranToday } from '../attendance.util';

/** Shown per table; rows that only exist inside these (shift days, policy rules, shift history) go with them. */
const RECORD_LABELS: Partial<Record<AttendanceTable, string>> = {
  attendance: 'روزهای ثبت‌شده ورود و خروج',
  requests: 'درخواست‌های مرخصی و تردد',
  leaveBalances: 'دفتر مانده مرخصی',
};

const SETUP_LABELS: Partial<Record<AttendanceTable, string>> = {
  employees: 'پروفایل‌های پرسنل',
  workplaces: 'محل‌های کار',
  shifts: 'شیفت‌ها',
  jobGroups: 'گروه‌های شغلی و تاییدکنندگان',
  workPolicies: 'سیاست‌های کاری',
  holidays: 'تعطیلات',
};

const SCOPES: Array<{ value: ResetScope; title: string; description: string }> = [
  {
    value: 'records',
    title: 'فقط سوابق',
    description: 'ورود و خروج‌ها، درخواست‌ها و مانده مرخصی پاک می‌شوند. پرسنل، شیفت‌ها و تنظیمات می‌مانند تا حضور و غیاب از صفر ادامه پیدا کند.',
  },
  {
    value: 'all',
    title: 'همه داده‌های حضور و غیاب',
    description: 'علاوه بر سوابق، پروفایل پرسنل، محل‌های کار، شیفت‌ها، گروه‌ها، سیاست‌ها و تعطیلات هم پاک می‌شوند. کاربران و نقش‌هایشان دست نمی‌خورند.',
  },
];

/** Same comparison as the server: spaces and ZWNJ don't count, Arabic ي/ك do match. */
const normalize = (value: string) =>
  value.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s‌‍]+/g, '');

/** نگهداری — module-wide controls: schedule mode and wiping data. Admin only. */
export default function AttendanceMaintenancePage() {
  const { data, error, isLoading, refresh } = useMaintenanceSummary();

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendanceMaintenance.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconTool className="size-6" />}
            title="نگهداری حضور و غیاب"
            subtitle="حضور طبق شیفت برای همه پرسنل، و پاک‌سازی داده‌ها برای شروع دوباره"
          />
          <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
            {data && <Maintenance summary={data} onDone={refresh} />}
          </DataView>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function Maintenance({ summary, onDone }: { summary: MaintenanceSummary; onDone: () => void }) {
  const [scope, setScope] = useState<ResetScope>('records');
  const [confirming, setConfirming] = useState(false);
  const { counts } = summary;
  const isEmpty = (labels: Partial<Record<AttendanceTable, string>>) =>
    (Object.keys(labels) as AttendanceTable[]).every((key) => !counts[key]);
  const nothingToDelete = isEmpty(RECORD_LABELS) && (scope === 'records' || isEmpty(SETUP_LABELS));

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <ScheduleModePanel
        // Re-seeded from the server after every save.
        key={`${summary.scheduleMode.enabled}-${summary.scheduleMode.current?.id}-${summary.scheduleMode.current?.note}-${summary.scheduleMode.coversToday}`}
        mode={summary.scheduleMode}
        onSaved={onDone}
      />

      <h2 className="mt-3 flex items-center gap-2 font-semibold text-slate-800 lg:col-span-2">
        <IconEraser className="size-5 text-rose-600" aria-hidden="true" />
        پاک‌سازی داده‌ها
        <span className="text-xs font-normal text-slate-500">— برگشت‌پذیر نیست</span>
      </h2>

      <Panel className="gap-4">
        <h3 className="font-semibold text-slate-800">داده‌های فعلی</h3>
        <CountList title="سوابق" labels={RECORD_LABELS} counts={counts} />
        <CountList title="پرسنل و تنظیمات" labels={SETUP_LABELS} counts={counts} />
      </Panel>

      <Panel className="gap-4">
        <fieldset className="space-y-2">
          <legend className="mb-2 font-semibold text-slate-800">چه چیزی پاک شود؟</legend>
          <p className="mb-2 text-xs text-slate-500">حالت «حضور طبق شیفت» و سابقه‌اش با پاک‌سازی تغییر نمی‌کند.</p>
          {SCOPES.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500',
                scope === option.value ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 hover:bg-slate-50',
              )}
            >
              <input
                type="radio"
                name="scope"
                value={option.value}
                checked={scope === option.value}
                onChange={() => setScope(option.value)}
                className="mt-1 size-4 shrink-0 accent-rose-600"
              />
              <span>
                <span className="block font-medium text-slate-800">{option.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-500">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          <IconAlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          اعلان‌هایی که قبلاً برای درخواست‌ها فرستاده شده در صندوق کاربران می‌مانند، اما به درخواستی اشاره می‌کنند که دیگر وجود ندارد.
        </p>

        <Button
          size="lg"
          className="w-full gap-2 bg-rose-600 shadow-none hover:bg-rose-700"
          disabled={nothingToDelete}
          onClick={() => setConfirming(true)}
        >
          <IconEraser className="size-5" aria-hidden="true" />
          {nothingToDelete ? 'داده‌ای برای پاک کردن نیست' : 'پاک‌سازی…'}
        </Button>
      </Panel>

      <ConfirmReset
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        scope={scope}
        summary={summary}
        onDone={() => {
          setConfirming(false);
          onDone();
        }}
      />
    </div>
  );
}

/**
 * Schedule mode: nobody checks in or out; a shift day counts as worked
 * unless an exception says otherwise. Switching off takes effect tomorrow;
 * on the day it was switched on, it's undone.
 */
function ScheduleModePanel({ mode, onSaved }: { mode: ScheduleMode; onSaved: () => void }) {
  const update = useUpdateScheduleMode();
  const [enabled, setEnabled] = useState(mode.enabled);
  const [note, setNote] = useState(mode.current?.note ?? '');
  const dirty = enabled !== mode.enabled || (enabled && note.trim() !== (mode.current?.note ?? ''));
  const startedToday = mode.current?.startDate === tehranToday();

  const save = async () => {
    try {
      await update.submit(enabled ? { enabled, note: note.trim() } : { enabled });
      toast.success(
        enabled
          ? 'حضور طبق شیفت فعال شد'
          : startedToday
            ? 'حضور طبق شیفت لغو شد'
            : 'حضور طبق شیفت از فردا خاموش می‌شود',
      );
      // Every attendance screen — home, board, reports — reads differently now.
      await mutate((key) => typeof key === 'string' && key.startsWith('/attendance'));
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error, 'ذخیره انجام نشد'));
    }
  };

  const badge = mode.enabled
    ? { text: `فعال از ${fa(mode.current?.startJalali)}`, className: 'bg-emerald-50 text-emerald-700' }
    : mode.coversToday
      ? { text: 'تا پایان امروز فعال', className: 'bg-amber-50 text-amber-700' }
      : { text: 'خاموش', className: 'bg-slate-100 text-slate-600' };

  return (
    <Panel className="gap-4 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800">حضور طبق شیفت</h2>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', badge.className)}>{badge.text}</span>
      </div>

      <div
        className={cn(
          'flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors',
          enabled ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200',
        )}
      >
        <div>
          <p className="font-medium text-slate-800">ثبت ورود و خروج لازم نیست؛ حضور طبق شیفت</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            هر روز کاری طبق شیفت کامل حساب می‌شود. پرسنل فقط استثناها را ثبت می‌کنند: مرخصی، مأموریت، اضافه‌کار،
            و تأخیر یا خروج زودتر با درخواست تردد دستی. غیبت را مدیر از «اصلاح تردد» با گزینه «غایب بود» ثبت می‌کند.
          </p>
        </div>
        <ToggleSwitch
          checked={enabled}
          onChange={setEnabled}
          aria-label="حضور طبق شیفت"
          disabled={update.isLoading}
        />
      </div>

      {enabled ? (
        <Input
          textarea
          rows={2}
          maxLength={500}
          label="پیام برای پرسنل (اختیاری)"
          placeholder="مثلاً: تا پایان آبان، ورود و خروج ثبت نمی‌شود."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      ) : mode.enabled && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          {startedToday
            ? 'امروز روشن شده است؛ با خاموش کردن کلاً لغو می‌شود و ثبت ورود و خروج از همین حالا برمی‌گردد.'
            : 'خاموش کردن از فردا اثر می‌کند؛ امروز هنوز طبق شیفت حساب می‌شود. روزهایی که در این حالت گذشت، طبق شیفت می‌مانند.'}
        </p>
      )}

      <div className="flex justify-end">
        <Button className="w-full sm:w-auto" disabled={!dirty || update.isLoading} aria-busy={update.isLoading} onClick={save}>
          {update.isLoading ? 'در حال ذخیره…' : 'ذخیره'}
        </Button>
      </div>

      {mode.history.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-medium text-slate-500">سابقه</h3>
          <ul className="divide-y divide-slate-100 rounded-xl text-sm ring-1 ring-inset ring-slate-200/70">
            {mode.history.map((period) => (
              <li key={period.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-2.5">
                <span className="font-medium tabular-nums text-slate-700">
                  {period.endDate
                    ? `${fa(period.startJalali)} تا ${fa(period.endJalali)}`
                    : `از ${fa(period.startJalali)} — فعال`}
                </span>
                <span className="text-xs text-slate-400">
                  {period.startedBy?.name || fa(period.startedBy?.phone) || '—'}
                </span>
                {period.note && <span className="w-full text-xs text-slate-500">{fa(period.note)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function CountList({
  title,
  labels,
  counts,
}: {
  title: string;
  labels: Partial<Record<AttendanceTable, string>>;
  counts: Record<AttendanceTable, number>;
}) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-medium text-slate-500">{title}</h4>
      <dl className="divide-y divide-slate-100 rounded-xl ring-1 ring-inset ring-slate-200/70">
        {(Object.entries(labels) as Array<[AttendanceTable, string]>).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-semibold tabular-nums text-slate-800">{fa(counts[key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ConfirmReset({
  isOpen,
  onClose,
  scope,
  summary,
  onDone,
}: {
  isOpen: boolean;
  onClose: () => void;
  scope: ResetScope;
  summary: MaintenanceSummary;
  onDone: () => void;
}) {
  const reset = useResetAttendance();
  const [typed, setTyped] = useState('');
  const matches = normalize(typed) === normalize(summary.confirmation);
  const labels = scope === 'all' ? { ...RECORD_LABELS, ...SETUP_LABELS } : RECORD_LABELS;
  const doomed = (Object.entries(labels) as Array<[AttendanceTable, string]>).filter(
    ([key]) => summary.counts[key] > 0,
  );

  const close = () => {
    if (reset.isLoading) return;
    setTyped('');
    onClose();
  };

  const run = async () => {
    try {
      await reset.submit({ scope, confirm: typed });
      toast.success('داده‌های حضور و غیاب پاک شد');
      setTyped('');
      // Every cached attendance screen now shows data that no longer exists.
      await mutate((key) => typeof key === 'string' && key.startsWith('/attendance'));
      onDone();
    } catch (error) {
      toast.error(errorMessage(error, 'پاک‌سازی انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={close}
      title={scope === 'all' ? 'پاک کردن همه داده‌های حضور و غیاب' : 'پاک کردن سوابق حضور و غیاب'}
      footer={
        <>
          <Button
            className="grow gap-2 bg-rose-600 shadow-none hover:bg-rose-700 sm:grow-0"
            disabled={!matches || reset.isLoading}
            aria-busy={reset.isLoading}
            onClick={run}
          >
            <IconEraser className="size-5" aria-hidden="true" />
            {reset.isLoading ? 'در حال پاک‌سازی…' : 'برای همیشه پاک شود'}
          </Button>
          <Button variant="outline" className="grow sm:grow-0" disabled={reset.isLoading} onClick={close}>
            انصراف
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-slate-600">این موارد برای همیشه حذف می‌شوند:</p>
      <ul className="space-y-1 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
        {doomed.map(([key, label]) => (
          <li key={key} className="flex justify-between gap-3">
            <span>{label}</span>
            <span className="font-semibold tabular-nums">{fa(summary.counts[key])}</span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (matches && !reset.isLoading) run();
        }}
      >
        <Input
          label={`برای تایید، «${summary.confirmation}» را بنویسید`}
          packageId="reset-confirmation"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoFocus
        />
      </form>
    </FormModal>
  );
}
