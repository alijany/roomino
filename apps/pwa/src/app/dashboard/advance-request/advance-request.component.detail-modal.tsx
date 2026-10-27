'use client';

import { getRoleName } from '@/components/auth/auth.constants.roles';
import { formatMoney } from '@/libs/format/format.util';
import { Avatar, Button, Modal } from '@/ui/atoms';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAdvanceRequest, useCancelAdvanceRequest } from './advance-request.api';
import { StatusBadge } from './advance-request.component.status-badge';
import { StepBadge } from './advance-request.component.step-badge';
import { STATUS_META } from './advance-request.constants';
import { AdvanceRequestStatus } from './advance-request.types';
import { formatJalali, formatJalaliDateTime } from './advance-request.util';

interface RequestDetailModalProps {
  requestId: number | null;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * Read-only مساعده detail, in a modal, for the personnel panel. Approve/reject
 * never happen here — that's the management review queue's job — but the
 * requester can still withdraw their own request before it's decided.
 */
export function RequestDetailModal({ requestId, onClose, onChanged }: RequestDetailModalProps) {
  const { data, isLoading } = useAdvanceRequest(requestId ?? undefined);
  const cancel = useCancelAdvanceRequest();
  const [cancelOpen, setCancelOpen] = useState(false);

  const meta = data ? STATUS_META[data.status] : undefined;

  const handleCancel = async () => {
    if (!requestId) return;

    try {
      await cancel.submit({ id: requestId });
      toast.success('درخواست حذف شد.');
      setCancelOpen(false);
      onChanged();
      onClose();
    } catch (error) {
      toast.error((error as Error)?.message ?? 'حذف انجام نشد');
    }
  };

  return (
    <>
      <Modal isOpen={Boolean(requestId)} onClose={onClose} className="bg-white lg:min-w-[480px]">
        <div className="flex min-h-0 max-h-[85vh] flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
            <h3 className="font-bold text-lg text-slate-800">جزئیات درخواست مساعده</h3>
            <Button variant="outline" className="!px-2" onClick={onClose}>
              <IconX className="size-5" />
            </Button>
          </div>

          <div className="min-h-0 grow space-y-4 overflow-y-auto p-5">
            {isLoading || !data ? (
              <p className="text-sm text-slate-500">در حال بارگذاری...</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <StatusBadge status={data.status} size="md" />
                  <div className="text-left">
                    <div className="text-xl font-bold text-slate-900">
                      {formatMoney(data.amountRial)}
                    </div>
                    <div className="text-xs text-slate-500">
                      تاریخ درخواست: {formatJalali(data.created_at)}
                    </div>
                  </div>
                </div>

                {meta && <p className="text-sm text-slate-500">{meta.hint}</p>}

                {data.reason && (
                  <p className="border-t border-slate-100 pt-3 text-sm text-slate-600">
                    {data.reason}
                  </p>
                )}

                {data.status === AdvanceRequestStatus.REJECTED && data.lastDecisionComment && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">
                    دلیل رد: {data.lastDecisionComment}
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3">
                  <h4 className="mb-2 text-sm font-bold text-slate-700">مسیر تأیید</h4>
                  <ol className="space-y-2">
                    {data.approvalSteps.map((step) => (
                      <li
                        key={step.id}
                        className="rounded-xl border border-slate-100 px-3 py-2 text-sm"
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
                </div>
              </>
            )}
          </div>

          {data?.permissions.canCancel && (
            <div className="shrink-0 border-t border-slate-100 p-5">
              <Button
                variant="outline"
                className="w-full gap-2 border-rose-200 text-rose-600"
                onClick={() => setCancelOpen(true)}
              >
                حذف درخواست
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="حذف درخواست"
        message="این درخواست مساعده حذف شود؟ بعد از حذف قابل بازگشت نیست."
        confirmButtonText="حذف درخواست"
        cancelButtonText="بازگشت"
      />
    </>
  );
}
