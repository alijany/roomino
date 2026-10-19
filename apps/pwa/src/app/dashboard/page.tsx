'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { AttendanceTodayWidget } from './attendance/attendance.component.today-widget';
import { ReservationsView } from './reservations/reservations.component.view';

/** پیشخوان — today's attendance first (it's what people open the app for), then room booking. */
export default function DashboardHomePage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.dashboard.roles}>
      <DashbaordLayout>
        <ReservationsView top={<AttendanceTodayWidget />} />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
