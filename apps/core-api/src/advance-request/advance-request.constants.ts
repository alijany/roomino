import { Role } from '../roles/roles.constants';

/**
 * Lifecycle of an advance request. No draft state: the paper process this
 * replaces is a single-shot form, so a request is pending approval from the
 * moment it is created.
 */
export enum AdvanceRequestStatus {
  /** At least one approval step is still outstanding. */
  PENDING_APPROVAL = 'pending_approval',
  /** Terminal. Both the manager and the finance manager signed off. */
  APPROVED = 'approved',
  /** Terminal. An approver said no. */
  REJECTED = 'rejected',
  /** Terminal. The requester withdrew it. */
  CANCELLED = 'cancelled',
}

/** Statuses that can no longer change. */
export const TERMINAL_ADVANCE_STATUSES: readonly AdvanceRequestStatus[] = [
  AdvanceRequestStatus.APPROVED,
  AdvanceRequestStatus.REJECTED,
  AdvanceRequestStatus.CANCELLED,
];

export const AdvanceRequestStatusLabels: Record<AdvanceRequestStatus, string> =
  {
    [AdvanceRequestStatus.PENDING_APPROVAL]: 'در انتظار تأیید',
    [AdvanceRequestStatus.APPROVED]: 'تأییدشده',
    [AdvanceRequestStatus.REJECTED]: 'ردشده',
    [AdvanceRequestStatus.CANCELLED]: 'لغوشده',
  };

export enum AdvanceApprovalStepStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

/** Append-only audit actions written to AdvanceRequestActivityEntity. */
export enum AdvanceActivityAction {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/**
 * The approval chain for an advance request: first the CEO, then the finance
 * manager. Fixed on purpose — unlike the external-payments module, this
 * process has no amount-based matrix to configure.
 */
export const ADVANCE_APPROVAL_CHAIN: readonly Role[] = [
  Role.CEO,
  Role.FINANCE_MANAGER,
];

/** Roles that may decide an outstanding step. */
export const ADVANCE_DECIDABLE_ROLES: readonly Role[] = [
  Role.CEO,
  Role.FINANCE_MANAGER,
];

/** Rial per Toman. Storage is rial; display is Toman. */
export const RIAL_PER_TOMAN = 10;
