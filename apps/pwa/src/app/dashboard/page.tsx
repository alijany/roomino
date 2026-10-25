'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { AttendanceTodayCard } from './attendance/attendance.component.today-card';
import { ReservationsWidget } from './reservations/reservations.component.widget';

/**
 * پیشخوان — a 12-column row of widgets: today's attendance (what people open
 * the app for) and room booking, half of the row each. In RTL the first
 * widget sits on the right.
 */
export default function DashboardHomePage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.dashboard.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <div className="grid shrink-0 grid-cols-12 items-start gap-3">
            <AttendanceTodayCard className="col-span-12 lg:col-span-6" />
            <ReservationsWidget className="col-span-12 lg:col-span-6" />
          </div>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
