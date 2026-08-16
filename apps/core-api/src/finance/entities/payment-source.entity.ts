import { Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { Currency, PaymentSourceType } from '../finance.constants';

/**
 * An account the company pays *from* (منبع پرداخت) — deliberately a different
 * entity from the payee's destination account, because conflating the two is
 * the most likely user error in this module.
 *
 * Holds the company's own banking details, so every endpoint that touches it is
 * restricted to Role.FINANCE at the controller, not merely hidden in the UI.
 */
@Entity()
export class PaymentSourceEntity extends BaseEntity {
  @Property()
  label: string;

  @Enum({
    items: () => PaymentSourceType,
    default: PaymentSourceType.BANK_ACCOUNT,
  })
  type: PaymentSourceType = PaymentSourceType.BANK_ACCOUNT;

  @Property({ nullable: true })
  bankName?: string;

  @Property({ nullable: true })
  sheba?: string;

  /**
   * Last four digits only. Full card numbers never enter the database — there
   * is no business reason to store a PAN for an account we already control.
   */
  @Property({ nullable: true })
  cardLast4?: string;

  @Property({ nullable: true })
  accountHolder?: string;

  @Enum({ items: () => Currency, default: Currency.IRR })
  currency: Currency = Currency.IRR;

  @Property({ nullable: true })
  notes?: string;

  @Property({ default: true })
  active: boolean = true;
}
