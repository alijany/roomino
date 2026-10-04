'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, ToggleSwitch } from '@/ui/atoms';
import { DataView, DatePickerField } from '@/ui/molecules';
import { IconArrowRight, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useShifts, useTeamMember, useTeamMemberReport, useUpdateTeamMember } from '../../attendance.api';
import { Field, PageHeader, Panel } from '../../attendance.component.layout';
import { MemberReport } from '../../attendance.component.member-report';
import { WeekdayPicker } from '../../attendance.component.weekday-picker';
import { Employee, PeriodQuery } from '../../attendance.types';
import { currentJalaliMonth, errorMessage, fa, fromCivilDate, tehranToday, toCivilDate } from '../../attendance.util';

/** A team member for their approver: report, corrections, reviews and schedule. */
export default function TeamMemberPage() {
  const { id } = useParams<{ id: string }>();
  const memberId = Number(id);
  const [period, setPeriod] = useState<PeriodQuery>(currentJalaliMonth());
  const member = useTeamMember(memberId);
  const report = useTeamMemberReport(memberId, period);
  const m = member.data;

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconUser className="size-6" />}
            title={m?.user.name ?? 'عضو تیم'}
            subtitle={m ? `${fa(m.personnelCode)} · ${m.jobGroup?.name ?? ''}` : undefined}
            actions={
              <Link href="/dashboard/attendance/team">
                <Button variant="outline" size="sm" className="gap-1">
                  <IconArrowRight className="size-4" />
                  تیم من
                </Button>
              </Link>
            }
          />
          <DataView data={m} error={member.error} isLoading={member.isLoading} onRetry={member.refresh}>
            {m && (
              <div className="space-y-3">
                <ScheduleForm key={m.id} member={m} onSaved={() => { member.refresh(); report.refresh(); }} />
                <MemberReport
                  employee={{ id: m.id, name: m.user.name, personnelCode: m.personnelCode }}
                  period={period}
                  onPeriodChange={setPeriod}
                  report={report}
                  reviewBase="/attendance/team/requests"
                  correctionBase="/attendance/team/members"
                  exportPath={`/attendance/team/members/${m.id}/export`}
                />
              </div>
            )}
          </DataView>
        </div>
      </DashbaordLayout>
    </ProtectedRoute>
  );
}

/** What an approver may change: shift (from a date), fixed remote days, active. */
function ScheduleForm({ member, onSaved }: { member: Employee; onSaved: () => void }) {
  const update = useUpdateTeamMember();
  const { data: shifts } = useShifts();
  const [shiftId, setShiftId] = useState<number | null>(member.currentShift?.id ?? null);
  const [startDate, setStartDate] = useState(tehranToday());
  const [remoteDays, setRemoteDays] = useState(member.remoteDays);
  const [active, setActive] = useState(member.active);

  const handleSave = async () => {
    try {
      await update.submit({
        id: member.id,
        data: { shiftId: shiftId ?? undefined, shiftStartDate: startDate, remoteDays, active },
      });
      toast.success('اطلاعات کاری ذخیره شد');
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error, 'ذخیره انجام نشد'));
    }
  };

  return (
    <Panel className="gap-4">
      <div className="font-semibold text-slate-700">اطلاعات کاری</div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="شیفت" hint={member.currentShift ? `فعلی: ${member.currentShift.name}` : undefined}>
          <Dropdown
            items={(shifts?.items ?? []).map((s) => ({ label: s.name, value: s.id }))}
            value={shiftId}
            onChange={setShiftId}
            placeholder="انتخاب کنید"
            variant="outline"
          />
        </Field>
        <Field label="اعمال شیفت از" hint="روزهای قبل از این تاریخ با شیفت قبلی محاسبه می‌مانند.">
          <DatePickerField label="تاریخ" value={fromCivilDate(startDate)} onSelect={(d) => setStartDate(toCivilDate(d))} />
        </Field>
        <Field label="وضعیت">
          <ToggleSwitch label={active ? 'فعال' : 'غیرفعال'} checked={active} onChange={setActive} />
        </Field>
      </div>
      <Field label="روزهای دورکاری ثابت">
        <WeekdayPicker value={remoteDays} onChange={setRemoteDays} />
      </Field>
      <div>
        <Button disabled={update.isLoading} onClick={handleSave}>
          {update.isLoading ? 'در حال ذخیره...' : 'ذخیره اطلاعات کاری'}
        </Button>
      </div>
    </Panel>
  );
}
