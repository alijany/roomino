'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { formatMoney } from '@/libs/format/format.util';
import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import {
  IconAlertCircle,
  IconArrowRight,
  IconCheck,
  IconEdit,
  IconPencilExclamation,
  IconX,
} from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useApproveRequest,
  useCancelRequest,
  useFailPayment,
  usePaymentRequest,
  useRecordPayment,
  useRejectRequest,
  useRequestInfo,
  useRevealCredential,
  useSubmitRequest,
} from '../../finance.api';
import { AttachmentPanel } from '../../finance.component.attachments';
import {
  DecisionKind,
  DecisionModal,
} from '../../finance.component.decision-modal';
import { PaymentModal } from '../../finance.component.payment-modal';
import { RequestForm } from '../../finance.component.request-form';
import { StatusBadge } from '../../finance.component.status-badge';
import { RequestTimeline } from '../../finance.component.timeline';
import {
  ATTACHMENT_KIND_LABELS,
  PAYEE_ACCOUNT_TYPE_LABELS,
  STATUS_META,
} from '../../finance.constants';
import {
  ApprovalStepStatus,
  PaymentDestinationKind,
  PaymentRequestStatus,
  RecordPaymentDto,
} from '../../finance.types';
import {
  describeDueDate,
  formatJalali,
  formatRequestAmount,
  isOverdue,
} from '../../finance.util';
import { getRoleName, Role } from '@/components/auth/auth.constants.roles';
import { useAuth } from '@/components/auth/auth.context.provider';

export default function PaymentRequestDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const { data, error, isLoading, refresh } = usePaymentRequest(
    Number.isFinite(id) ? id : undefined
  );

  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const requestInfo = useRequestInfo();
  const cancel = useCancelRequest();
  const submit = useSubmitRequest();
  const pay = useRecordPayment();
  const fail = useFailPayment();

  const [decision, setDecision] = useState<DecisionKind | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  /** The three approver decisions. Payment failure has its own modal below. */
  const handleDecision = async (comment: string) => {
    if (!decision || decision === 'payment-failed') return;

    const actions: Record<
      'approve' | 'reject' | 'request-info',
      { run: () => Promise<unknown>; message: string }
    > = {
      approve: {
        run: () => approve.submit({ id, data: { comment } }),
        message: 'درخواست تأیید شد و به مالی رفت.',
      },
      reject: {
        run: () => reject.submit({ id, data: { comment } }),
        message: 'درخواست رد شد.',
      },
      'request-info': {
        run: () => requestInfo.submit({ id, data: { comment } }),
        message: 'درخواست برای اصلاح برگشت داده شد.',
      },
    };

    const action = actions[decision];
    const ok = await run(action.run, action.message);
    if (ok) setDecision(null);
  };

  const handlePay = async (dto: RecordPaymentDto) => {
    const ok = await run(
      () => pay.submit({ id, data: dto }),
      'پرداخت ثبت شد.'
    );
    if (ok) setPayOpen(false);
  };

  const permissions = data?.permissions;
  const meta = data ? STATUS_META[data.status] : undefined;

  const roles = user?.roles?.map((entry) => entry.role) ?? [];
  /**
   * Someone who both approves and pays. Rare on a big team, normal on a small
   * one — and worth naming rather than hiding, because the two acts stay
   * separate and both land in the trail under the same name.
   */
  const wearsBothHats =
    roles.includes(Role.FINANCE) &&
    (roles.includes(Role.APPROVER) || roles.includes(Role.ADMIN));

  const approvedByMe = Boolean(
    data?.approvalSteps.some(
      (step) =>
        step.status === ApprovalStepStatus.APPROVED &&
        step.actor?.id === user?.id
    )
  );

  const isOnlineAccount =
    data?.destinationKind === PaymentDestinationKind.ONLINE_ACCOUNT;

  /** The outstanding step this viewer is the one to decide. */
  const myPendingStepId = data?.approvalSteps.find(
    (step) =>
      step.status === ApprovalStepStatus.PENDING &&
      roles.includes(step.requiredRole) &&
      data.requester?.id !== user?.id
  )?.id;

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-fit gap-2 border-none"
            onClick={() => router.back()}
          >
            <IconArrowRight className="size-4" />
            بازگشت
          </Button>

          <DataView
            data={data}
            error={error}
            isLoading={isLoading}
            errorMessage="این درخواست یافت نشد یا به آن دسترسی ندارید."
            onRetry={refresh}
          >
            {data && (
              <div className="space-y-3 pb-6">
                {/* Header */}
                <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={data.status} size="md" />
                        <span className="text-xs text-slate-500">
                          {data.category?.name}
                        </span>
                      </div>
                      <h1 className="text-xl font-bold text-slate-800">{data.title}</h1>
                      <p className="mt-1 text-sm text-slate-500">
                        ثبت‌کننده: {data.requester?.name || '—'}
                      </p>
                    </div>

                    <div className="text-left">
                      <div className="text-2xl font-bold text-slate-900">
                        {formatRequestAmount(data)}
                      </div>
                      <div
                        className={cn(
                          'text-sm',
                          isOverdue(data) ? 'text-rose-600 font-medium' : 'text-slate-500'
                        )}
                      >
                        مهلت پرداخت: {describeDueDate(data)}
                      </div>
                    </div>
                  </div>

                  {meta && (
                    <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
                      {meta.hint}
                    </p>
                  )}

                  {data.status === PaymentRequestStatus.NEEDS_INFO &&
                    data.lastDecisionComment && (
                      <div className="mt-3 flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                        <IconAlertCircle className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="font-medium">
                            برای تکمیل این درخواست به اطلاعات بیشتری نیاز است:
                          </p>
                          <p className="mt-1">{data.lastDecisionComment}</p>
                        </div>
                      </div>
                    )}

                  {data.status === PaymentRequestStatus.REJECTED &&
                    data.lastDecisionComment && (
                      <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">
                        دلیل رد: {data.lastDecisionComment}
                      </div>
                    )}

                  {data.status === PaymentRequestStatus.FAILED && (
                    <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">
                      پرداخت انجام نشد و درخواست به صف پرداخت برگشت. اطلاعات آن دست‌نخورده است.
                      {data.lastDecisionComment ? ` دلیل: ${data.lastDecisionComment}` : ''}
                    </div>
                  )}
                </div>

                {/* A person holding both hats gets an explicit handoff rather
                    than a silently re-rendered button: the approval and the
                    payment are two separate acts, and the trail records both
                    against the same name. */}
                {wearsBothHats && permissions?.canPay && approvedByMe && (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-5 py-4 text-sm text-sky-900">
                    شما این درخواست را به‌عنوان تأییدکننده تأیید کردید. حالا می‌توانید
                    به‌عنوان مالی آن را پرداخت کنید — هر دو اقدام به نام شما ثبت می‌شود.
                  </div>
                )}

                {/* Actions */}
                {(permissions?.canDecide ||
                  permissions?.canPay ||
                  permissions?.canSubmit ||
                  permissions?.canEdit ||
                  permissions?.canCancel) && (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-4">
                    {permissions?.canDecide && (
                      <>
                        <Button className="gap-2" onClick={() => setDecision('approve')}>
                          <IconCheck className="size-4" />
                          {wearsBothHats
                            ? 'تأیید به‌عنوان تأییدکننده'
                            : 'تأیید و ارسال به مالی'}
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => setDecision('request-info')}
                        >
                          <IconPencilExclamation className="size-4" />
                          نیازمند اصلاح
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2 border-rose-200 text-rose-600"
                          onClick={() => setDecision('reject')}
                        >
                          <IconX className="size-4" />
                          رد
                        </Button>
                      </>
                    )}

                    {permissions?.canPay && (
                      <>
                        <Button onClick={() => setPayOpen(true)}>
                          {wearsBothHats ? 'ثبت پرداخت به‌عنوان مالی' : 'ثبت پرداخت'}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-rose-200 text-rose-600"
                          onClick={() => setFailOpen(true)}
                        >
                          ثبت پرداخت ناموفق
                        </Button>
                      </>
                    )}

                    {permissions?.canEdit && (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setEditOpen(true)}
                      >
                        <IconEdit className="size-4" />
                        ویرایش
                      </Button>
                    )}

                    {permissions?.canSubmit && (
                      <Button
                        onClick={() =>
                          run(() => submit.submit({ id }), 'درخواست ارسال شد.')
                        }
                      >
                        ارسال برای تأیید
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

                <div className="grid gap-3 lg:grid-cols-2">
                  {/* Payee */}
                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                    <h2 className="mb-3 font-bold text-slate-800">
                      {isOnlineAccount ? 'حساب مقصد در سایت' : 'حساب مقصد'}
                    </h2>

                    {isOnlineAccount ? (
                      <dl className="space-y-2 text-sm">
                        <Row label="نام سرویس" value={data.payeeName} />
                        <Row label="آدرس سایت" value={data.destinationUrl} ltr />
                        <Row
                          label="نام کاربری / شناسه حساب"
                          value={data.destinationAccount}
                          ltr
                        />
                        {data.hasDestinationCredential && (
                          <CredentialRow requestId={id} />
                        )}
                      </dl>
                    ) : (
                      <dl className="space-y-2 text-sm">
                        <Row label="طرف‌حساب" value={data.payeeName} />
                        <Row
                          label="نوع حساب"
                          value={
                            data.payeeAccountType
                              ? PAYEE_ACCOUNT_TYPE_LABELS[data.payeeAccountType]
                              : undefined
                          }
                        />
                        <Row label="صاحب حساب" value={data.payeeAccountHolder} />
                        <Row label="شماره شبا" value={data.payeeSheba} ltr />
                        <Row label="شماره کارت" value={data.payeeCardNumber} ltr />
                        <Row label="اطلاعات حساب" value={data.payeeAccountDetails} ltr />
                      </dl>
                    )}

                    {data.description && (
                      <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                        {data.description}
                      </p>
                    )}
                  </section>

                  {/* Approval chain */}
                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                    <h2 className="mb-3 font-bold text-slate-800">مسیر تأیید</h2>
                    {data.approvalSteps.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        این درخواست تأییدکننده نداشت و مستقیم به صف پرداخت رفت.
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {data.approvalSteps.map((step) => (
                          <li
                            key={step.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm"
                          >
                            <span className="text-slate-700">
                              {(step.sequence + 1).toLocaleString('fa-IR')}.{' '}
                              {getRoleName(step.requiredRole)}
                              {step.id === myPendingStepId && (
                                <span className="mr-2 text-xs font-medium text-primary">
                                  نوبت شماست
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-2">
                              {step.actor?.name && (
                                <span className="text-xs text-slate-500">
                                  {step.actor.name}
                                </span>
                              )}
                              <StepBadge status={step.status} />
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>

                {/* Payments */}
                {data.payments.length > 0 && (
                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                    <h2 className="mb-3 font-bold text-slate-800">پرداخت‌ها</h2>
                    <ul className="space-y-3">
                      {data.payments.map((payment) => (
                        <li key={payment.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold text-slate-800">
                              {formatMoney(payment.settledAmountRial)}
                            </span>
                            <span className="text-xs text-slate-500 tabular-nums">
                              {formatJalali(payment.paidAt)}
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                            {payment.paymentSource && (
                              <div>از حساب: {payment.paymentSource.label}</div>
                            )}
                            {payment.referenceNumber && (
                              <div>
                                شماره پیگیری:{' '}
                                <span dir="ltr" className="font-mono">
                                  {payment.referenceNumber}
                                </span>
                              </div>
                            )}
                            {payment.fxRateRialPerUnit && (
                              <div>
                                نرخ تبدیل:{' '}
                                <span dir="ltr" className="font-mono">
                                  {payment.fxRateRialPerUnit.toLocaleString('en-US')}
                                </span>{' '}
                                ریال به ازای هر {data.currency}
                              </div>
                            )}
                            {payment.feeRial ? (
                              <div>کارمزد واسط: {formatMoney(payment.feeRial)}</div>
                            ) : null}
                            {payment.paidBy?.name && <div>ثبت توسط: {payment.paidBy.name}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="grid gap-3 lg:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                    <h2 className="mb-3 font-bold text-slate-800">
                      مدارک
                      <span className="mr-2 text-xs font-normal text-slate-500">
                        {data.attachments.length > 0
                          ? data.attachments
                              .map((a) => ATTACHMENT_KIND_LABELS[a.kind])
                              .filter((value, index, all) => all.indexOf(value) === index)
                              .join('، ')
                          : ''}
                      </span>
                    </h2>
                    <AttachmentPanel requestId={id} canEdit={permissions?.canAttach} />
                  </section>

                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                    <h2 className="mb-3 font-bold text-slate-800">تاریخچه</h2>
                    <RequestTimeline requestId={id} />
                  </section>
                </div>
              </div>
            )}
          </DataView>
        </div>

        <DecisionModal
          kind={decision}
          onClose={() => setDecision(null)}
          onConfirm={handleDecision}
          isLoading={approve.isLoading || reject.isLoading || requestInfo.isLoading}
        />

        {/* Mounted only for Finance. It loads payment sources, which every
            other role is forbidden from reading — an approver opening this
            page was firing a guaranteed 403 on every visit. */}
        {permissions?.canPay && (
          <PaymentModal
            request={data}
            isOpen={payOpen}
            onClose={() => setPayOpen(false)}
            onConfirm={handlePay}
            isLoading={pay.isLoading}
          />
        )}

        <DecisionModal
          kind={failOpen ? 'payment-failed' : null}
          onClose={() => setFailOpen(false)}
          onConfirm={async (comment) => {
            const ok = await run(
              () => fail.submit({ id, data: { comment } }),
              'پرداخت ناموفق ثبت شد و درخواست به صف برگشت.'
            );
            if (ok) setFailOpen(false);
          }}
          isLoading={fail.isLoading}
        />

        <ConfirmModal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={async () => {
            const ok = await run(() => cancel.submit({ id }), 'درخواست لغو شد.');
            if (ok) setCancelOpen(false);
          }}
          title="لغو درخواست"
          message={`درخواست «${data?.title ?? ''}» لغو شود؟ بعد از لغو قابل بازگشت نیست. اگر فقط نیاز به تغییر دارید، آن را ویرایش کنید.`}
          confirmButtonText="لغو درخواست"
          cancelButtonText="بازگشت"
        />

        {data && (
          <RequestForm
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            onSuccess={refresh}
            existing={data}
          />
        )}
      </DashbaordLayout>
    </ProtectedRoute>
  );
}

/**
 * The stored login, fetched only when someone asks for it.
 *
 * Not rendered inline with the rest of the request: a password on screen by
 * default is a password read by whoever is standing behind you, and the value
 * is deliberately absent from the detail payload until this fires.
 */
function CredentialRow({ requestId }: { requestId: number }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reveal = useRevealCredential();

  const handleReveal = async () => {
    setBusy(true);
    try {
      const result = await reveal.submit(requestId);
      setRevealed(result?.credential ?? '—');
    } catch (revealError) {
      toast.error(
        (revealError as Error)?.message ?? 'نمایش اطلاعات ورود انجام نشد'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">رمز ورود</dt>
      <dd className="text-left">
        {revealed ? (
          <span dir="ltr" className="font-mono text-xs text-slate-800">
            {revealed}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={handleReveal}
          >
            {busy ? 'در حال نمایش...' : 'نمایش رمز'}
          </Button>
        )}
      </dd>
    </div>
  );
}

function Row({
  label,
  value,
  ltr,
}: {
  label: string;
  value?: string | null;
  ltr?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={cn('text-left font-medium text-slate-800', ltr && 'font-mono text-xs')}
        dir={ltr ? 'ltr' : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

const STEP_STYLES: Record<ApprovalStepStatus, { label: string; className: string }> = {
  [ApprovalStepStatus.PENDING]: {
    label: 'در انتظار',
    className: 'bg-amber-50 text-amber-600',
  },
  [ApprovalStepStatus.APPROVED]: {
    label: 'تأیید شد',
    className: 'bg-emerald-50 text-emerald-600',
  },
  [ApprovalStepStatus.REJECTED]: {
    label: 'رد شد',
    className: 'bg-rose-50 text-rose-600',
  },
  [ApprovalStepStatus.SKIPPED]: {
    label: 'بی‌اثر',
    className: 'bg-slate-50 text-slate-400',
  },
};

function StepBadge({ status }: { status: ApprovalStepStatus }) {
  const style = STEP_STYLES[status];
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', style.className)}>
      {style.label}
    </span>
  );
}
