'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { FormModal, PageHeader, Panel } from '@/app/dashboard/attendance/attendance.component.layout';
import { errorMessage, fa, jalaliLabel, shiftJalaliMonth } from '@/app/dashboard/attendance/attendance.util';
import {
  copyPreviousOnCall,
  repeatOnCall,
  saveOnCallDay,
  setOnCallPublished,
  useOnCallSchedule,
} from '@/app/dashboard/oncall/oncall.api';
import { OnCallCalendar } from '@/app/dashboard/oncall/oncall.component.calendar';
import { OnCallDayEditor } from '@/app/dashboard/oncall/oncall.component.day-editor';
import { OnCallPeople } from '@/app/dashboard/oncall/oncall.component.people';
import { OnCallChanges } from '@/app/dashboard/oncall/oncall.component.changes';
import { OnCallReport } from '@/app/dashboard/oncall/oncall.component.report';
import { OnCallSwapLog } from '@/app/dashboard/oncall/oncall.component.swap-log';
import { OnCallSettingsModal } from '@/app/dashboard/oncall/oncall.component.settings';
import { OnCallDay } from '@/app/dashboard/oncall/oncall.types';
import { periodContaining } from '@/app/dashboard/oncall/oncall.util';
import { Badge } from '@/ui/atoms/ui.badge';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconArrowsExchange, IconChevronLeft, IconCopy, IconChevronRight, IconPlaylistAdd, IconSettings, IconShieldCheck, IconPhoneCall, IconReportAnalytics } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { mutate } from 'swr';

/** کشیک — who is on call after hours, laid out day by day. */
export default function OnCallPage() {
  const [period, setPeriod] = useState(() => periodContaining(26));
  const [editingDay, setEditingDay] = useState<OnCallDay | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [replace, setReplace] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyMode, setCopyMode] = useState<'continue' | 'restart'>('continue');
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notify, setNotify] = useState(true);

  const { data, error, isLoading, refresh: refreshSchedule } = useOnCallSchedule(period.year, period.month);
  // An edit may add to the changes waiting to be announced.
  const refresh = async () => {
    await refreshSchedule();
    await mutate('/oncall/changes');
  };
  const totals = useMemo(() => new Map((data?.totals ?? []).map((t) => [t.userId, t.minutes])), [data]);
  const published = data?.period.status === 'published';
  const readOnly = !data?.canManage;

  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e, failure));
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = async (day: OnCallDay, userId: number, add: boolean) => {
    if (add && day.entries.some((e) => e.user.id === userId)) {
      toast.info('این فرد از قبل در این روز هست');
      return;
    }
    const mine = day.defaultSlots.map((slot) => ({ userId, ...slot }));
    const existing = day.entries.map((e) => ({ userId: e.user.id, start: e.start, end: e.end }));
    await run(() => saveOnCallDay(day.date, add ? [...existing, ...mine] : mine), '', 'ثبت کشیک انجام نشد');
  };

  return (
    <RoleProtectedRoute allowedRoles={[...RouteItems.attendanceOncall.roles, ...RouteItems.attendanceOncallManage.roles]}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconPhoneCall className="size-6" />}
            title="کشیک"
            subtitle="هر روز چه کسی بعد از ساعت کاری پاسخگوست؛ افراد را روی روزها بکشید"
            actions={
              data?.canManage ? (
                <>
                  <Button variant="outline" className="gap-1" onClick={() => setLogOpen(true)}>
                    <IconArrowsExchange className="size-4" />
                    جابه‌جایی‌ها
                  </Button>
                  <Button variant="outline" className="gap-1" onClick={() => setReportOpen(true)}>
                    <IconReportAnalytics className="size-4" />
                    گزارشات
                  </Button>
                <Button variant="outline" className="gap-1" onClick={() => setSettingsOpen(true)}>
                  <IconSettings className="size-4" />
                  تنظیمات
                </Button>
                </>
              ) : undefined
            }
          />

          <Panel className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="!px-2"
                  onClick={() => setPeriod((p) => { const s = shiftJalaliMonth(p.year, p.month, -1); return { year: s.y, month: s.m }; })}
                  aria-label="دورهٔ قبل"
                >
                  <IconChevronRight className="size-4" />
                </Button>
                <span className="min-w-52 text-center text-sm font-medium text-slate-700">
                  {data ? `${jalaliLabel(data.period.start)} تا ${jalaliLabel(data.period.end)}` : '...'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="!px-2"
                  onClick={() => setPeriod((p) => { const s = shiftJalaliMonth(p.year, p.month, 1); return { year: s.y, month: s.m }; })}
                  aria-label="دورهٔ بعد"
                >
                  <IconChevronLeft className="size-4" />
                </Button>
              </div>
              {data && <Badge tone={published ? 'success' : 'warning'}>{published ? 'منتشر شده' : 'پیش‌نویس'}</Badge>}
              {data?.canManage && (
                <div className="ms-auto flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="gap-1" disabled={busy} onClick={() => setCopying(true)}>
                    <IconCopy className="size-4" />
                    کپی از دورهٔ قبل
                  </Button>
                  <Button variant="outline" className="gap-1" disabled={busy} onClick={() => setRepeating(true)}>
                    <IconPlaylistAdd className="size-4" />
                    تکرار الگو
                  </Button>
                  <Button
                    className="gap-1"
                    variant={published ? 'outline' : 'primary'}
                    disabled={busy}
                    onClick={() => {
                      if (!published) {
                        setNotify(true);
                        setPublishing(true);
                        return;
                      }
                      run(
                        () => setOnCallPublished(period.year, period.month, false),
                        'انتشار برگشت و دوباره پیش‌نویس شد',
                        'انجام نشد',
                      );
                    }}
                  >
                    <IconShieldCheck className="size-4" />
                    {published ? 'لغو انتشار' : 'انتشار'}
                  </Button>
                </div>
              )}
            </div>

            {data?.canManage && <OnCallChanges onResolved={refresh} />}

            <DataView
              data={data}
              error={error}
              isLoading={isLoading}
              onRetry={refresh}
            >
              {data && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className="space-y-2">
                    <OnCallCalendar schedule={data} readOnly={readOnly} onDropUser={handleDrop} onOpenDay={(day) => { if (!readOnly) setEditingDay(day); }} />
                    {!readOnly && (
                      <p className="text-xs leading-6 text-slate-400">
                        نفر را روی یک روز بکشید تا آن روز را بگیرد؛ با نگه داشتن Shift هنگام رها کردن، کنار کسی که هست اضافه می‌شود.
                        برای ساعت دقیق یا چند نفر، روی روز کلیک کنید.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-slate-700">واجد شرایط کشیک</h2>
                    <OnCallPeople people={data.eligible} totals={totals} readOnly={readOnly} />
                  </div>
                </div>
              )}
            </DataView>
          </Panel>
        </div>

        {editingDay && data && (
          <OnCallDayEditor
            key={editingDay.date}
            day={editingDay}
            eligible={data.eligible}
            onClose={() => setEditingDay(null)}
            onSaved={refresh}
          />
        )}
        {logOpen && <OnCallSwapLog onClose={() => setLogOpen(false)} />}
        {reportOpen && <OnCallReport year={period.year} month={period.month} onClose={() => setReportOpen(false)} />}
        {settingsOpen && <OnCallSettingsModal onClose={() => setSettingsOpen(false)} onSaved={refresh} />}
        {publishing && (
          <FormModal
            isOpen
            onClose={() => setPublishing(false)}
            title="انتشار برنامهٔ کشیک"
            footer={
              <>
                <Button
                  className="flex-1"
                  disabled={busy}
                  onClick={async () => {
                    await run(
                      () => setOnCallPublished(period.year, period.month, true, notify),
                      'برنامهٔ کشیک منتشر شد',
                      'انتشار انجام نشد',
                    );
                    setPublishing(false);
                  }}
                >
                  انتشار
                </Button>
                <Button variant="ghost" className="flex-1 bg-slate-100" onClick={() => setPublishing(false)}>
                  لغو
                </Button>
              </>
            }
          >
            <p className="text-sm leading-7 text-slate-600">
              بعد از انتشار، همکاران برنامهٔ این دوره را در «کشیک من» می‌بینند و می‌توانند جابه‌جایی بخواهند.
            </p>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-1 size-4" />
              <span>
                <span className="font-medium text-slate-800">ارسال اعلان</span>
                <span className="block text-xs leading-6 text-slate-500">
                  به هر کسی که در این دوره کشیک دارد، روزهایش اعلام می‌شود.
                </span>
              </span>
            </label>
          </FormModal>
        )}
        {copying && (
          <FormModal
            isOpen
            onClose={() => setCopying(false)}
            title="کپی از دورهٔ قبل"
            footer={
              <>
                <Button
                  className="flex-1"
                  disabled={busy}
                  onClick={async () => {
                    await run(
                      async () => {
                        const result = await copyPreviousOnCall(period.year, period.month, copyMode, replace);
                        toast.info(`${fa(result.filled)} روز پر شد`);
                      },
                      '',
                      'کپی انجام نشد',
                    );
                    setCopying(false);
                  }}
                >
                  کپی کن
                </Button>
                <Button variant="ghost" className="flex-1 bg-slate-100" onClick={() => setCopying(false)}>
                  لغو
                </Button>
              </>
            }
          >
            <p className="text-sm leading-7 text-slate-600">
              الگوی دورهٔ قبل (ترتیب نفرات از اولین روز تا اولین روز خالی) روی روزهای این دوره می‌نشیند. ساعت‌ها از پیش‌فرض نوع هر روز می‌آید؛ کسی که دیگر واجد شرایط نیست رد می‌شود.
            </p>
            {([
              ['continue', 'ادامهٔ چرخه', 'از جایی ادامه می‌دهد که دورهٔ قبل تمام شد؛ ساعت‌ها عادلانه‌تر پخش می‌شود.'],
              ['restart', 'شروع دوباره از اول الگو', 'اولین روز این دوره نفر اول الگو را می‌گیرد.'],
            ] as const).map(([value, label, hint]) => (
              <label key={value} className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                <input type="radio" name="copy-mode" checked={copyMode === value} onChange={() => setCopyMode(value)} className="mt-1 size-4" />
                <span>
                  <span className="font-medium text-slate-800">{label}</span>
                  <span className="block text-xs leading-6 text-slate-500">{hint}</span>
                </span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-4" />
              روزهایی که از قبل پر شده‌اند هم جایگزین شوند
            </label>
          </FormModal>
        )}
        {repeating && (
          <FormModal
            isOpen
            onClose={() => setRepeating(false)}
            title="تکرار الگو"
            footer={
              <>
                <Button
                  className="flex-1"
                  disabled={busy}
                  onClick={async () => {
                    await run(
                      async () => {
                        const result = await repeatOnCall(period.year, period.month, replace);
                        toast.info(`${fa(result.filled)} روز پر شد`);
                      },
                      '',
                      'تکرار انجام نشد',
                    );
                    setRepeating(false);
                  }}
                >
                  تکرار تا آخر دوره
                </Button>
                <Button variant="ghost" className="flex-1 bg-slate-100" onClick={() => setRepeating(false)}>
                  لغو
                </Button>
              </>
            }
          >
            <p className="text-sm leading-7 text-slate-600">
              اولین دسته از روزهای پشت‌سرهمِ پرشده (لازم نیست از اول دوره باشد) به‌عنوان الگو برداشته می‌شود و به همان ترتیب، دوباره و دوباره، روی روزهای بعد از آن تا آخر دوره می‌نشیند؛ روزهای قبل از آن دست نمی‌خورند.
              روزی که فقط یک نفر دارد، ساعت پیش‌فرض نوع روزِ مقصد را می‌گیرد؛ روزی که چند نفر دارد با همان ساعت‌ها تکرار می‌شود.
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-4" />
              روزهایی که از قبل پر شده‌اند هم جایگزین شوند
            </label>
          </FormModal>
        )}
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
