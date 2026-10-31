'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { Button } from '@/ui/atoms';
import { BackButton, DataView } from '@/ui/molecules';
import { IconPrinter, IconShare } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { periodLabel } from '../../../financial.util';
import { usePayslip } from '../../payroll.api';
import { PayslipView } from '../../payroll.component.payslip';
import { payslipSummary } from '../../payroll.util.payslip-share';

/**
 * A payslip on its own page, without the dashboard around it, so printing or
 * saving as PDF from the browser gives just the slip. Admin-only.
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

  /** Sends the slip's summary on; where sharing is missing, copies it. */
  const share = async () => {
    if (!data) return;
    const text = payslipSummary(data);
    try {
      if (navigator.share) await navigator.share({ title: `فیش حقوقی ${periodLabel(data.period)}`, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('خلاصه‌ی فیش کپی شد');
      }
    } catch (e) {
      // Closing the share sheet is not a failure.
      if ((e as Error)?.name !== 'AbortError') toast.error('اشتراک‌گذاری انجام نشد');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4; margin: 8mm; } html, body { background: #fff !important; } .payslip { break-inside: avoid; page-break-inside: avoid; zoom: 0.92; } }`}</style>

      <div className="mx-auto mb-4 flex w-full max-w-[820px] items-center justify-between gap-2 print:hidden">
        <BackButton
          href={data ? `/dashboard/admin/financial/payroll?period=${data.period}` : '/dashboard/admin/financial/payroll'}
          label="بازگشت به حقوق"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1 bg-white" disabled={!data} onClick={share}>
            <IconShare className="size-4" />
            اشتراک‌گذاری
          </Button>
          <Button className="gap-1" disabled={!data} onClick={() => window.print()}>
            <IconPrinter className="size-4" />
            چاپ / ذخیره‌ی PDF
          </Button>
        </div>
      </div>

      <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
        {data && <PayslipView slip={data} />}
      </DataView>
    </div>
  );
}
