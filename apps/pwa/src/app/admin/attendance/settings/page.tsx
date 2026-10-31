'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Tabs } from '@/ui/molecules/tabs';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useState } from 'react';
import { PageHeader, Panel } from '../attendance.component.layout';
import { HolidaysSettings } from '../attendance.component.settings-holidays';
import { JobGroupsSettings } from '../attendance.component.settings-job-groups';
import { PoliciesSettings } from '../attendance.component.settings-policies';
import { ShiftsSettings } from '../attendance.component.settings-shifts';
import { WorkplacesSettings } from '../attendance.component.settings-workplaces';

const TABS = [
  { id: 'workplaces', label: 'محل‌های کار' },
  { id: 'shifts', label: 'شیفت‌ها' },
  { id: 'groups', label: 'گروه‌های شغلی' },
  { id: 'policies', label: 'سیاست‌های کاری' },
  { id: 'holidays', label: 'تعطیلات' },
];

/** The setup data attendance runs on, for admin and HR. */
export default function AttendanceSettingsPage() {
  const [tab, setTab] = useState('workplaces');

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendanceSettings.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconAdjustmentsHorizontal className="size-6" />}
            title="تنظیمات حضور و غیاب"
            subtitle="محل کار و شعاع مجاز، شیفت‌ها، گروه‌ها و تاییدکنندگان، سقف مرخصی و تعطیلات"
          />
          <Panel className="gap-3">
            <Tabs tabs={TABS} defaultTab="workplaces" onTabChange={setTab} />
            {tab === 'workplaces' && <WorkplacesSettings />}
            {tab === 'shifts' && <ShiftsSettings />}
            {tab === 'groups' && <JobGroupsSettings />}
            {tab === 'policies' && <PoliciesSettings />}
            {tab === 'holidays' && <HolidaysSettings />}
          </Panel>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
