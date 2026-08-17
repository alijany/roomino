import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { PayeeAccountType } from '../finance.constants';
import { VendorEntity } from './vendor.entity';

/**
 * Where a vendor wants to be paid (حساب مقصد).
 *
 * Kept distinct from PaymentSourceEntity — that is where money leaves *from*.
 * Conflating the two is the most likely user error in this module, so they are
 * separate tables with separate wording throughout.
 */
@Entity()
export class PayeeAccountEntity extends BaseEntity {
  @ManyToOne(() => VendorEntity)
  vendor: VendorEntity;

  /** What a person would call it: "حساب اصلی", "کارت مدیرعامل". */
  @Property()
  label: string;

  @Enum({ items: () => PayeeAccountType, default: PayeeAccountType.SHEBA })
  type: PayeeAccountType = PayeeAccountType.SHEBA;

  @Property({ nullable: true })
  holderName?: string;

  @Property({ nullable: true })
  sheba?: string;

  @Property({ nullable: true })
  cardNumber?: string;

  @Property({ nullable: true })
  iban?: string;

  @Property({ nullable: true })
  swift?: string;

  /** PayPal address, wallet, or anything else that doesn't fit the columns. */
  @Property({ nullable: true })
  details?: string;

  /** Pre-selected when this vendor is chosen on a request. */
  @Property({ default: false })
  isDefault: boolean = false;

  @Property({ default: true })
  active: boolean = true;
}
