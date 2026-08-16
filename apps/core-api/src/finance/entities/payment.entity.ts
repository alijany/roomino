import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  Property,
  types,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { PaymentStatus } from '../finance.constants';
import { PaymentRequestEntity } from './payment-request.entity';
import { PaymentSourceEntity } from './payment-source.entity';
import { RequestAttachmentEntity } from './request-attachment.entity';

/**
 * A human's assertion that money actually left a company account, with a
 * reference number as evidence.
 *
 * The system never infers a payment — the transfer happens in a banking app and
 * this row records it afterwards. A failed attempt is kept (status FAILED)
 * rather than deleted, so the trail shows what was tried.
 */
@Entity()
@Index({ properties: ['paidAt'] })
export class PaymentEntity extends BaseEntity {
  @ManyToOne(() => PaymentRequestEntity)
  request: PaymentRequestEntity;

  @ManyToOne(() => PaymentSourceEntity)
  paymentSource: PaymentSourceEntity;

  @Property({ columnType: 'timestamptz' })
  paidAt: Date;

  /**
   * What actually left the account, always in rial. Deliberately separate from
   * the request's `amountMinor` — they differ constantly (FX moved, the vendor
   * billed differently) and the variance is what the monthly report exists to show.
   */
  @Property({ type: types.bigint })
  settledAmountRial: number;

  /**
   * Rial per one unit of the request's foreign currency. Integer, so no decimal
   * column is needed. Null for IRR requests.
   */
  @Property({ type: types.bigint, nullable: true })
  fxRateRialPerUnit?: number;

  /** What the intermediary charged, in rial. Kept out of settledAmountRial so
   * "what the FX actually cost us" stays answerable. */
  @Property({ type: types.bigint, nullable: true })
  feeRial?: number;

  /** Who brokered a foreign payment (واسط پرداخت). Free text in this phase. */
  @Property({ nullable: true })
  intermediary?: string;

  @Property({ nullable: true })
  referenceNumber?: string;

  @ManyToOne(() => RequestAttachmentEntity, { nullable: true })
  receipt?: RequestAttachmentEntity;

  @ManyToOne(() => UserEntity)
  paidBy: UserEntity;

  @Enum({ items: () => PaymentStatus, default: PaymentStatus.SUCCEEDED })
  status: PaymentStatus = PaymentStatus.SUCCEEDED;

  @Property({ nullable: true })
  failureReason?: string;

  @Property({ nullable: true })
  notes?: string;
}
