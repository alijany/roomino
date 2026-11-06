'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { AttendanceTodayCard } from './attendance/attendance.component.today-card';
import { OnCallCard } from './oncall/oncall.component.card';
import { WelcomeCard } from './welcome/welcome.component.card';
import { WelcomeModal } from './welcome/welcome.component.modal';

/**
 * پیشخوان — a 12-column row of widgets: today's attendance (what people open
 * the app for), under a newcomer's welcome card in their first month. The room-booking
 * widget (`ReservationsWidget`) is off the dashboard for now.
 */
export default function DashboardHomePage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.dashboard.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <WelcomeCard />
          <div className="grid shrink-0 grid-cols-12 items-start gap-3">
            <AttendanceTodayCard className="col-span-12 lg:col-span-6" />
            <OnCallCard className="col-span-12 lg:col-span-6" />
          </div>
        </div>
        <WelcomeModal />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
