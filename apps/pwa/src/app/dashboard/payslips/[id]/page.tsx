'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { useParams } from 'next/navigation';
import { useMyPayslip } from '@/app/admin/financial/payroll/payroll.api';
import { PayslipScreen } from '@/app/admin/financial/payroll/payroll.component.payslip-screen';

/** One of my own payslips, with share, download and print. */
export default function MyPayslipPage() {
  return (
    <ProtectedRoute>
      <Content />
    </ProtectedRoute>
  );
}

function Content() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refresh } = useMyPayslip(Number(id));
  return <PayslipScreen data={data} error={error} isLoading={isLoading} refresh={refresh} backHref="/dashboard/payslips" backLabel="بازگشت به فیش‌های من" />;
}
