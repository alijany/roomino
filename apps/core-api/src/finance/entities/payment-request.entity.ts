import {
  Collection,
  Entity,
  Enum,
  Index,
  ManyToOne,
  OneToMany,
  Property,
  types,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import {
  Currency,
  PayeeAccountType,
  PaymentRequestStatus,
  RequestOrigin,
} from '../finance.constants';
import { ApprovalStepEntity } from './approval-step.entity';
import { ExpenseCategoryEntity } from './expense-category.entity';
import { RequestAttachmentEntity } from './request-attachment.entity';

/**
 * The core object: one external payment the company needs to make, from the
 * moment someone asks for it to the moment Finance records that it happened.
 *
 * Money is stored as an integer in the currency's minor unit (`amountMinor`).
 * IRR minor unit is the rial; USD/EUR are cents. Nothing here is a float.
 */
@Entity()
@Index({ properties: ['status', 'dueDate'] })
@Index({ properties: ['requester', 'status'] })
export class PaymentRequestEntity extends BaseEntity {
  /** Who asked. For company-level payments this is the Finance user. */
  @ManyToOne(() => UserEntity)
  requester: UserEntity;

  @Enum({ items: () => RequestOrigin, default: RequestOrigin.EMPLOYEE })
  origin: RequestOrigin = RequestOrigin.EMPLOYEE;

  @Property()
  title: string;

  @Property({ nullable: true })
  description?: string;

  @ManyToOne(() => ExpenseCategoryEntity)
  category: ExpenseCategoryEntity;

  // --- amount ---------------------------------------------------------------

  /** Requested amount, integer, minor unit of `currency`. */
  @Property({ type: types.bigint })
  amountMinor: number;

  @Enum({ items: () => Currency, default: Currency.IRR })
  currency: Currency = Currency.IRR;

  // --- payee (طرف‌حساب) ------------------------------------------------------
  // Free-text in this phase. The vendor directory (Phase 2) adds a nullable
  // vendor FK that pre-fills these, so nothing here has to move.

  @Property()
  payeeName: string;

  @Enum({ items: () => PayeeAccountType, default: PayeeAccountType.SHEBA })
  payeeAccountType: PayeeAccountType = PayeeAccountType.SHEBA;

  @Property({ nullable: true })
  payeeAccountHolder?: string;

  @Property({ nullable: true })
  payeeSheba?: string;

  @Property({ nullable: true })
  payeeCardNumber?: string;

  /** IBAN / SWIFT / PayPal address / anything else, for foreign payees. */
  @Property({ nullable: true })
  payeeAccountDetails?: string;

  // --- scheduling -----------------------------------------------------------

  /** مهلت پرداخت — drives the entire Finance queue ordering. */
  @Property({ columnType: 'timestamptz' })
  dueDate: Date;

  @Enum({
    items: () => PaymentRequestStatus,
    default: PaymentRequestStatus.DRAFT,
  })
  status: PaymentRequestStatus = PaymentRequestStatus.DRAFT;

  /**
   * Denormalised pointer to the approval step currently outstanding, kept in
   * step with `approvalSteps` by PaymentRequestService and nothing else.
   *
   * It exists so "what is waiting on me?" is one indexed query rather than a
   * per-row scan for the lowest pending sequence — that question is asked on
   * every approver's page load and drives the sidebar badge.
   */
  @Enum({ items: () => Role, nullable: true })
  pendingRole?: Role;

  @Property({ nullable: true })
  pendingSequence?: number;

  /**
   * Reserved for the deferred budgets work. Nullable and unused by the UI, so
   * budget envelopes can attach later without a data migration.
   */
  @Property({ nullable: true })
  costCenter?: string;

  /** Reason attached to the most recent needs-info or rejection. */
  @Property({ nullable: true })
  lastDecisionComment?: string;

  @Property({ columnType: 'timestamptz', nullable: true })
  submittedAt?: Date;

  @Property({ columnType: 'timestamptz', nullable: true })
  decidedAt?: Date;

  @Property({ columnType: 'timestamptz', nullable: true })
  paidAt?: Date;

  @OneToMany(() => ApprovalStepEntity, (step) => step.request)
  approvalSteps = new Collection<ApprovalStepEntity>(this);

  @OneToMany(() => RequestAttachmentEntity, (a) => a.request)
  attachments = new Collection<RequestAttachmentEntity>(this);
}
