'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { Button } from '@/ui/atoms';
import { BackButton, DataView } from '@/ui/molecules';
import { IconPrinter } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { useSettlement } from '../../final-settlement.api';
import { SettlementSlip } from '../../final-settlement.component.slip';

/** The settlement on its own page, so printing or saving as PDF gives just the slip. */
export default function SettlementSlipPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.finalSettlement.roles}>
      <SlipContent />
    </RoleProtectedRoute>
  );
}

function SlipContent() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refresh } = useSettlement(Number(id));

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4; margin: 8mm; } html, body { background: #fff !important; } .settlement-slip { break-inside: avoid; page-break-inside: avoid; zoom: 0.9; } }`}</style>

      <div className="mx-auto mb-4 flex w-full max-w-[820px] items-center justify-between gap-2 print:hidden">
        <BackButton href={`/dashboard/admin/financial/final-settlement/${id}`} label="بازگشت به تسویه" />
        <Button className="gap-1" disabled={!data} onClick={() => window.print()}>
          <IconPrinter className="size-4" />
          چاپ / ذخیره‌ی PDF
        </Button>
      </div>

      <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
        {data && <SettlementSlip s={data} />}
      </DataView>
    </div>
  );
}
