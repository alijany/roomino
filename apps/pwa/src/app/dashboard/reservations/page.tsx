'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { ReservationsView } from './reservations.component.view';

export default function ReservationsPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.dashboard.roles}>
      <DashbaordLayout>
        <ReservationsView />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
