'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { useParams } from 'next/navigation';
import { usePayslip } from '../../payroll.api';
import { PayslipScreen } from '../../payroll.component.payslip-screen';

/**
 * A payslip on its own page, without the dashboard around it, so printing or
 * saving as PDF from the browser gives just the slip. For the payroll team.
 */
export default function PayslipPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.payroll.roles}>
      <PayslipContent />
    </RoleProtectedRoute>
  );
}

function PayslipContent() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refresh } = usePayslip(Number(id));
  return (
    <PayslipScreen
      data={data}
      error={error}
      isLoading={isLoading}
      refresh={refresh}
      backHref={data ? `/admin/financial/payroll?period=${data.period}` : '/admin/financial/payroll'}
      backLabel="بازگشت به حقوق"
    />
  );
}
