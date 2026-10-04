import {
  Cascade,
  Collection,
  Entity,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { WorkPolicyRuleEntity } from './work-policy-rule.entity';

/** سیاست کاری — a set of caps on leave, missions and overtime. */
@Entity()
export class WorkPolicyEntity extends BaseEntity {
  @Property()
  name: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  /** Carried over from Tesmino; stored but not yet enforced there either. */
  @Property({ default: false })
  restrictApprovalTime: boolean = false;

  /** Pre-selected for new employee profiles. At most one is default. */
  @Property({ default: false })
  isDefault: boolean = false;

  @OneToMany(() => WorkPolicyRuleEntity, (rule) => rule.policy, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  rules = new Collection<WorkPolicyRuleEntity>(this);
}
