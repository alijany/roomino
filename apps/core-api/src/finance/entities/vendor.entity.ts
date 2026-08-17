import { Collection, Entity, Enum, OneToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { Currency, VendorKind } from '../finance.constants';
import { PayeeAccountEntity } from './payee-account.entity';

/**
 * A طرف‌حساب — anyone the company pays. Deliberately broad: Figma, the ISP,
 * the landlord and the accountant are all vendors here.
 *
 * `kind` matters operationally, not cosmetically: a foreign vendor cannot be
 * paid directly from Iran, so those payments route through an intermediary and
 * carry an FX rate.
 */
@Entity()
export class VendorEntity extends BaseEntity {
  @Property()
  name: string;

  /** Latin name, for foreign vendors whose invoices are in English. */
  @Property({ nullable: true })
  nameEn?: string;

  @Enum({ items: () => VendorKind, default: VendorKind.DOMESTIC })
  kind: VendorKind = VendorKind.DOMESTIC;

  /** کد اقتصادی — needed on invoices from Iranian companies. */
  @Property({ nullable: true })
  economicCode?: string;

  @Property({ nullable: true })
  nationalId?: string;

  @Property({ nullable: true })
  website?: string;

  @Property({ nullable: true })
  contactName?: string;

  @Property({ nullable: true })
  contactPhone?: string;

  @Enum({ items: () => Currency, default: Currency.IRR })
  defaultCurrency: Currency = Currency.IRR;

  @Property({ nullable: true })
  notes?: string;

  @Property({ default: true })
  active: boolean = true;

  @OneToMany(() => PayeeAccountEntity, (account) => account.vendor)
  accounts = new Collection<PayeeAccountEntity>(this);
}
