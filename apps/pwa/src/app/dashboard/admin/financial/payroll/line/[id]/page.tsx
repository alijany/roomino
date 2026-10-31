'use client';

import { useAuth } from '@/components/auth/auth.context.provider';
import { Role } from '@/components/auth/auth.constants.roles';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { jalaliLabel } from '@/app/dashboard/attendance/attendance.util';
import { Button } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { BackButton, DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconFileText, IconLockOpen } from '@tabler/icons-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { periodLabel } from '../../../financial.util';
import { useFinalizePayrollLine, usePayslip, useReopenPayrollLine, useUpdatePayrollLine } from '../../payroll.api';
import {
  AdvancesCard,
  BreakdownCard,
  dataOf,
  formOf,
  FactsCard,
  HybridCard,
  LineFormState,
  PaymentCard,
  InputsCard,
  hasUncommonInputs,
} from '../../payroll.component.line-sections';
import { ReopenModal } from '../../payroll.component.reopen-modal';
import { Payslip } from '../../payroll.types';

/** One person's month as a page: the inputs, the payment split and the figures. Admin-only. */
export default function PayrollLinePage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.payroll.roles}>
      <DashbaordLayout>
        <LineContent />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function LineContent() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refresh } = usePayslip(Number(id));

  return (
    <div className="no-scrollbar flex grow flex-col overflow-auto pb-6">
      <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
        {data && <LineEditor key={data.id} slip={data} refresh={refresh} />}
      </DataView>
    </div>
  );
}

function LineEditor({ slip, refresh }: { slip: Payslip; refresh: () => void }) {
  // The CEO and the finance manager look; the admin changes.
  const canEdit = useAuth().hasRole(Role.ADMIN);
  const locked = slip.status === 'final';
  const frozen = locked || !canEdit;
  const [form, setForm] = useState<LineFormState>(() => formOf(slip));
  const [rareOpen, setRareOpen] = useState(() => hasUncommonInputs(formOf(slip)));
  const [reopening, setReopening] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const update = useUpdatePayrollLine();
  const finalize = useFinalizePayrollLine();
  const reopen = useReopenPayrollLine();

  const set = <K extends keyof LineFormState>(key: K, value: LineFormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const busy = update.isLoading || finalize.isLoading;
  const back = `/dashboard/admin/financial/payroll?period=${slip.period}`;
  const flat = slip.agreement === 'flat';
  const hybrid = slip.agreement === 'hybrid' || slip.extras > 0;

  const save = async (): Promise<boolean> => {
    try {
      await update.submit({ id: slip.id, data: dataOf(form) });
      toast.success('ذخیره و دوباره محاسبه شد');
      refresh();
      return true;
    } catch (e) {
      toast.error((e as Error)?.message ?? 'ذخیره انجام نشد');
      return false;
    }
  };

  const saveAndFinalize = async () => {
    if (!(await save())) return;
    try {
      await finalize.submit(slip.id);
      toast.success('حقوق این نفر قطعی شد');
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'قطعی کردن انجام نشد');
    }
  };

  const handleReopen = (reason: string) =>
    reopen
      .submit({ id: slip.id, reason })
      .then(() => {
        toast.success('قطعی این ردیف باز شد');
        setReopening(false);
        refresh();
      })
      .catch((e) => toast.error((e as Error)?.message ?? 'بازکردن انجام نشد'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton href={back} label="بازگشت به حقوق" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800">{slip.user.name ?? 'پرسنل'}</h1>
              <Badge tone={locked ? 'success' : 'warning'}>{locked ? 'قطعی' : 'پیش‌نویس'}</Badge>
              {hybrid && <Badge tone="info">هیبرید</Badge>}
              {slip.probation && <Badge tone="warning">آزمایشی</Badge>}
              {slip.agreement === 'flat' ? (
                <Badge tone="neutral">حقوق ساده</Badge>
              ) : (
                <Badge tone="neutral">{slip.identity.agreementType === 'net' ? 'توافق خالص' : 'توافق ناخالص'}</Badge>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {[slip.user.personnelCode, slip.user.jobTitle].filter(Boolean).join(' · ')} · حقوق {periodLabel(slip.period)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/admin/financial/payroll/payslip/${slip.id}`} target="_blank">
            <Button variant="outline" className="gap-1" tabIndex={-1}>
              <IconFileText className="size-4" />
              فیش حقوقی
            </Button>
          </Link>
          {!canEdit ? null : locked ? (
            <Button variant="outline" className="gap-1 border-amber-200 text-amber-700" onClick={() => setReopening(true)}>
              <IconLockOpen className="size-4" />
              بازکردن قطعی
            </Button>
          ) : (
            <>
              <Button disabled={busy} onClick={() => void save()}>
                {update.isLoading ? 'در حال ذخیره...' : 'ذخیره و محاسبه'}
              </Button>
              <Button variant="outline" className="border-emerald-200 text-emerald-700" disabled={busy} onClick={() => setFinalizing(true)}>
                ذخیره و قطعی کردن
              </Button>
            </>
          )}
        </div>
      </div>

      {locked && canEdit && (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          این ماه برای این نفر قطعی شده و قابل تغییر نیست؛ برای اصلاح «بازکردن قطعی» را بزنید.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-4">
          <InputsCard form={form} set={set} locked={frozen} flat={flat} open={rareOpen} onToggle={() => setRareOpen((o) => !o)} />
          <AdvancesCard lineId={slip.id} locked={frozen} onChanged={(advance) => {
              set('advance', advance);
              refresh();
            }} />
          <PaymentCard slip={slip} />
          <FactsCard slip={slip} />
          {hybrid && <HybridCard slip={slip} />}
          {slip.revisions.length > 0 && (
            <section className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              <div className="font-semibold">بازنگری‌های این ردیف</div>
              <ul className="mt-1 space-y-0.5">
                {slip.revisions.map((r) => (
                  <li key={r.at}>
                    {jalaliLabel(r.at.slice(0, 10))} — {r.reason}
                    {r.changed === false ? ' (بدون تغییر)' : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <BreakdownCard slip={slip} />
        </div>
      </div>

      <ConfirmModal
        isOpen={finalizing}
        onClose={() => setFinalizing(false)}
        onConfirm={async () => {
          await saveAndFinalize();
          setFinalizing(false);
        }}
        title="قطعی کردن حقوق"
        message={`ورودی‌ها ذخیره و حقوق ${slip.user.name ?? ''} در ${periodLabel(slip.period)} قطعی می‌شود. بعد از آن فقط با «بازکردن قطعی» و ثبت دلیل قابل تغییر است.`}
        confirmButtonText="ذخیره و قطعی کردن"
        cancelButtonText="بازگشت"
        isLoading={busy}
      />

      {reopening && (
        <ReopenModal
          title="بازکردن قطعی"
          message={`قطعی ${slip.user.name ?? ''} در ${periodLabel(slip.period)} باز می‌شود. دلیل آن کنار ردیف ثبت می‌شود.`}
          busy={reopen.isLoading}
          onConfirm={handleReopen}
          onClose={() => setReopening(false)}
        />
      )}
    </div>
  );
}
