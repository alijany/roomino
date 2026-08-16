import { UserEntity } from '../../user/user.entity';
import { ApprovalStepEntity } from '../entities/approval-step.entity';
import { FinanceActivityEntity } from '../entities/finance-activity.entity';
import { PaymentRequestEntity } from '../entities/payment-request.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { RequestAttachmentEntity } from '../entities/request-attachment.entity';
import {
  ActivityView,
  ApprovalStepView,
  AttachmentView,
  PaymentRequestListItem,
  PaymentView,
  UserSummary,
} from '../finance.types';
import { readBigint, toRial } from './money.util';

/**
 * Controllers in this codebase return entities raw, but finance entities carry
 * fields no client should see (payment-source internals) and bigint columns
 * that arrive as strings. These mappers make the wire shape explicit.
 */

export function toUserSummary(user?: UserEntity): UserSummary | undefined {
  if (!user) return undefined;

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
  };
}

export function toListItem(
  request: PaymentRequestEntity,
): PaymentRequestListItem {
  const amountMinor = readBigint(request.amountMinor);

  return {
    id: request.id,
    title: request.title,
    status: request.status,
    origin: request.origin,
    amountMinor,
    currency: request.currency,
    amountRial: toRial(amountMinor, request.currency),
    dueDate: request.dueDate,
    payeeName: request.payeeName,
    requester: toUserSummary(request.requester),
    category: request.category
      ? { id: request.category.id, name: request.category.name }
      : undefined,
    submittedAt: request.submittedAt,
    paidAt: request.paidAt,
    pendingRole: request.pendingRole,
    created_at: request.created_at,
  };
}

export function toApprovalStepView(step: ApprovalStepEntity): ApprovalStepView {
  return {
    id: step.id,
    sequence: step.sequence,
    requiredRole: step.requiredRole,
    status: step.status,
    actor: toUserSummary(step.actor),
    decidedAt: step.decidedAt,
    comment: step.comment,
  };
}

export function toAttachmentView(
  attachment: RequestAttachmentEntity,
  url: string,
): AttachmentView {
  return {
    id: attachment.id,
    url,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    kind: attachment.kind,
    uploadedBy: toUserSummary(attachment.uploadedBy),
    created_at: attachment.created_at,
  };
}

export function toPaymentView(payment: PaymentEntity): PaymentView {
  return {
    id: payment.id,
    paidAt: payment.paidAt,
    settledAmountRial: readBigint(payment.settledAmountRial),
    fxRateRialPerUnit: payment.fxRateRialPerUnit
      ? readBigint(payment.fxRateRialPerUnit)
      : undefined,
    feeRial: payment.feeRial ? readBigint(payment.feeRial) : undefined,
    intermediary: payment.intermediary,
    referenceNumber: payment.referenceNumber,
    status: payment.status,
    failureReason: payment.failureReason,
    notes: payment.notes,
    paidBy: toUserSummary(payment.paidBy),
    paymentSource: payment.paymentSource
      ? { id: payment.paymentSource.id, label: payment.paymentSource.label }
      : undefined,
  };
}

export function toActivityView(entry: FinanceActivityEntity): ActivityView {
  return {
    id: entry.id,
    action: entry.action,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    comment: entry.comment,
    actor: toUserSummary(entry.actor),
    created_at: entry.created_at,
  };
}
