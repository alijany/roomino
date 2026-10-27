import { UserEntity } from '../../user/user.entity';
import {
  AdvanceRequestListItem,
  AdvanceApprovalStepView,
  UserSummary,
} from '../advance-request.types';
import { AdvanceApprovalStepEntity } from '../entities/advance-approval-step.entity';
import { AdvanceRequestEntity } from '../entities/advance-request.entity';
import { readBigint } from './money.util';

export function toUserSummary(user?: UserEntity): UserSummary | undefined {
  if (!user) return undefined;

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    profilePicture: user.profilePicture ?? null,
  };
}

export function toListItem(
  request: AdvanceRequestEntity,
): AdvanceRequestListItem {
  return {
    id: request.id,
    status: request.status,
    amountRial: readBigint(request.amountRial),
    reason: request.reason,
    requester: toUserSummary(request.requester),
    pendingRole: request.pendingRole,
    decidedAt: request.decidedAt,
    created_at: request.created_at,
  };
}

export function toApprovalStepView(
  step: AdvanceApprovalStepEntity,
): AdvanceApprovalStepView {
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
