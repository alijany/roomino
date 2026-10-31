'use client';

import { getRoleName } from '@/components/auth/auth.constants.roles';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { formatMoney } from '@/libs/format/format.util';
import { Avatar, Button } from '@/ui/atoms';
import { BackButton, DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconArrowRight, IconCheck, IconX } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useAdvanceRequest,
  useApproveAdvanceRequest,
  useCancelAdvanceRequest,
  useRejectAdvanceRequest,
} from '../../advance-request.api';
import { DecisionKind, DecisionModal } from '../../advance-request.component.decision-modal';
import { SettlementDetails } from '../../advance-request.component.settlement';
import { StatusBadge } from '../../advance-request.component.status-badge';
import { StepBadge } from '../../advance-request.component.step-badge';
import { STATUS_META } from '../../advance-request.constants';
import { AdvanceRequestStatus } from '../../advance-request.types';
import { formatJalali, formatJalaliDateTime } from '../../advance-request.util';

/**
 * مساعده detail + decide/cancel actions — reached only from the management
 * review queue (مساعده‌ها). Nested under /review so the sidebar keeps the
 * management workspace active instead of falling back to the personnel
 * مساعده page, which shares the /dashboard/advance-request prefix.
 */
export default function AdvanceRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const { data, error, isLoading, refresh } = useAdvanceRequest(
    Number.isFinite(id) ? id : undefined
  );

  const approve = useApproveAdvanceRequest();
  const reject = useRejectAdvanceRequest();
  const cancel = useCancelAdvanceRequest();

  const [decision, setDecision] = useState<DecisionKind | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
      refresh();
      return true;
    } catch (actionError) {
      toast.error((actionError as Error)?.message ?? 'عملیات انجام نشد');
      return false;
    }
  };

  const handleDecision = async (comment: string) => {
    if (!decision) return;

    const ok =
      decision === 'approve'
        ? await run(
            () => approve.submit({ id, data: { comment: comment || undefined } }),
            'درخواست تأیید شد.'
          )
        : await run(() => reject.submit({ id, data: { comment } }), 'درخواست رد شد.');

    if (ok) setDecision(null);
  };

  const permissions = data?.permissions;
  const meta = data ? STATUS_META[data.status] : undefined;

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.advanceRequestReview.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto">
          <div className="flex items-center gap-3">
            <BackButton label="بازگشت" />
          </div>

          <DataView
            data={data}
            error={error}
            isLoading={isLoading}
            errorMessage="این درخواست یافت نشد یا به آن دسترسی ندارید."
            onRetry={refresh}
          >
            {data && (
              <div className="mx-auto w-full max-w-xl space-y-3 pb-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={data.status} size="md" />
                  </div>

                  <h1 className="mt-3 text-2xl font-bold text-slate-900">
                    {formatMoney(data.amountRial)}
                  </h1>
                  <p className="text-sm text-slate-500">درخواست مساعده</p>

                  <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
                    <div>
                      <dt className="text-slate-400">درخواست‌دهنده</dt>
                      <dd className="mt-1 flex items-center gap-1.5 font-medium text-slate-700">
                        <Avatar src={data.requester?.profilePicture} name={data.requester?.name} className="size-5" />
                        {data.requester?.name || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">تاریخ درخواست</dt>
                      <dd className="mt-1 font-medium text-slate-700">{formatJalali(data.created_at)}</dd>
                    </div>
                  </dl>

                  {meta && (
                    <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
                      {meta.hint}
                    </p>
                  )}

                  {data.reason && (
                    <p className="mt-3 text-sm text-slate-600">{data.reason}</p>
                  )}

                  {data.status === AdvanceRequestStatus.REJECTED &&
                    data.lastDecisionComment && (
                      <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">
                        دلیل رد: {data.lastDecisionComment}
                      </div>
                    )}
                </div>

                {(permissions?.canDecide ||
                  permissions?.canReject ||
                  permissions?.canCancel) && (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-5">
                    {permissions?.canDecide && (
                      <Button className="gap-2" onClick={() => setDecision('approve')}>
                        <IconCheck className="size-4" />
                        تأیید
                      </Button>
                    )}

                    {permissions?.canReject && (
                      <Button
                        variant="outline"
                        className="gap-2 border-rose-200 text-rose-600"
                        onClick={() => setDecision('reject')}
                      >
                        <IconX className="size-4" />
                        رد درخواست
                      </Button>
                    )}

                    {permissions?.canCancel && (
                      <Button
                        variant="ghost"
                        className="bg-slate-100"
                        onClick={() => setCancelOpen(true)}
                      >
                        لغو درخواست
                      </Button>
                    )}
                  </div>
                )}

                {data.settlement && (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
                    <SettlementDetails
                      settlement={data.settlement}
                      requestId={data.id}
                      canSettle={data.permissions.canSettle}
                      onChanged={refresh}
                    />
                  </div>
                )}

                <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                  <h2 className="mb-3 font-bold text-slate-800">مسیر تأیید</h2>
                  <ol className="space-y-2">
                    {data.approvalSteps.map((step) => (
                      <li
                        key={step.id}
                        className="rounded-xl border border-slate-100 px-4 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-700">
                            {(step.sequence + 1).toLocaleString('fa-IR')}.{' '}
                            {getRoleName(step.requiredRole)}
                          </span>
                          <StepBadge status={step.status} />
                        </div>

                        {(step.actor?.name || step.decidedAt) && (
                          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                            {step.actor?.name ? (
                              <span className="flex items-center gap-1.5">
                                <Avatar src={step.actor.profilePicture} name={step.actor.name} className="size-5" />
                                {step.actor.name}
                              </span>
                            ) : (
                              <span />
                            )}
                            {step.decidedAt && <span>{formatJalaliDateTime(step.decidedAt)}</span>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            )}
          </DataView>
        </div>

        <DecisionModal
          kind={decision}
          onClose={() => setDecision(null)}
          onConfirm={handleDecision}
          isLoading={approve.isLoading || reject.isLoading}
        />

        <ConfirmModal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={async () => {
            const ok = await run(() => cancel.submit({ id }), 'درخواست لغو شد.');
            if (ok) setCancelOpen(false);
          }}
          title="لغو درخواست"
          message="این درخواست مساعده لغو شود؟ بعد از لغو قابل بازگشت نیست."
          confirmButtonText="لغو درخواست"
          cancelButtonText="بازگشت"
        />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
