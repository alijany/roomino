import {
  BeforeCreate,
  Collection,
  Entity,
  EventArgs,
  OneToMany,
  Property,
  Unique,
  types,
} from '@mikro-orm/core';
import { BaseEntity } from 'src/libs/orm/orm.entity.base';
import { RolesEntity } from 'src/roles/roles.entity';
import { nextPersonnelCode } from './user.personnel-code';

@Entity()
export class UserEntity extends BaseEntity {
  @Property({ nullable: true })
  firstName?: string;

  @Property({ nullable: true })
  lastName?: string;

  // Virtual property for full name
  get name(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || undefined;
  }

  @Property({ nullable: true })
  nationalId?: string;

  @Property({ nullable: true, type: types.bigint })
  @Unique()
  chatId?: number;

  @Property({ nullable: true })
  @Unique()
  phone?: string;

  @Property({ nullable: true })
  profilePicture?: string;

  /** Issued automatically (`T01`, …) when the user is created; HR/admin may change it. */
  @Property({ nullable: true })
  @Unique()
  personnelCode?: string;

  @Property({ nullable: true })
  jobTitle?: string;

  /** First day of cooperation, civil date `"YYYY-MM-DD"`. */
  @Property({ type: 'date', nullable: true })
  hireDate?: string;

  /**
   * Last day of a trial period (دوره آزمایشی), civil date. Empty for someone
   * who had none. It stays after the date passes, so it is known they were on trial.
   */
  @Property({ type: 'date', nullable: true })
  probationEndDate?: string;

  /** Last day of cooperation, civil date. Empty while the person is still here. */
  @Property({ type: 'date', nullable: true })
  endDate?: string;

  @Property({ nullable: true })
  insuranceNumber?: string;

  /** `IR` and 24 digits. */
  @Property({ nullable: true })
  sheba?: string;

  @Property({ nullable: true })
  email?: string;

  // --- what payroll needs to know about the person ---

  @Property({ default: false })
  married: boolean = false;

  @Property({ default: 0 })
  childrenCount: number = 0;

  /** Pays social insurance. */
  @Property({ default: true })
  insured: boolean = true;

  /** `board` members pay no unemployment insurance. */
  @Property({ default: 'worker' })
  insuranceType: string = 'worker';

  /** Exempt from income tax altogether. */
  @Property({ default: false })
  taxExempt: boolean = false;

  /**
   * `regular`: the whole agreed salary goes through the legal rules.
   * `hybrid`: only the year's legal minimum monthly wage (from the payroll
   * settings) does; what is above it is paid apart, net, outside insurance
   * and tax.
   */
  @Property({ default: 'regular' })
  salaryMode: string = 'regular';

  /** `gross`: the agreed salary is the base wage; `net`: it is the take-home. */
  @Property({ default: 'gross' })
  agreementType: string = 'gross';

  @Property({ default: true })
  isApproved: boolean = true;

  @BeforeCreate()
  async issuePersonnelCode(args: EventArgs<UserEntity>) {
    if (!this.personnelCode) {
      this.personnelCode = await nextPersonnelCode(args.em as never);
    }
  }

  @OneToMany(() => RolesEntity, (role) => role.user)
  roles = new Collection<RolesEntity>(this);
}
