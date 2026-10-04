import { EntityManager, QueryOrder } from '@mikro-orm/core';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PolicyPeriod,
  PolicyRequestType,
  PolicyRequestTypeLabels,
} from '../attendance.constants';
import { SaveWorkPolicyDto } from '../dtos/setup.dto';
import { WorkPolicyRuleEntity } from '../entities/work-policy-rule.entity';
import { WorkPolicyEntity } from '../entities/work-policy.entity';

@Injectable()
export class WorkPolicyService {
  constructor(private readonly em: EntityManager) {}

  list() {
    return this.em.find(
      WorkPolicyEntity,
      {},
      {
        populate: ['rules'],
        orderBy: { isDefault: QueryOrder.DESC, name: QueryOrder.ASC },
      },
    );
  }

  async getOrFail(id: number) {
    const policy = await this.em.findOne(
      WorkPolicyEntity,
      { id },
      { populate: ['rules'] },
    );
    if (!policy) throw new NotFoundException('سیاست کاری یافت نشد');
    return policy;
  }

  defaultPolicy() {
    return this.em.findOne(WorkPolicyEntity, { isDefault: true });
  }

  /** Each type/period/year combination once — a unique index backs this. */
  private validateRules(dto: SaveWorkPolicyDto) {
    const keys = new Set<string>();
    for (const rule of dto.rules) {
      const key = `${rule.requestType}|${rule.period ?? '-'}|${rule.year}`;
      if (keys.has(key)) {
        throw new BadRequestException(
          `قانون «${PolicyRequestTypeLabels[rule.requestType]}» برای سال ${
            rule.year
          } تکراری است`,
        );
      }
      keys.add(key);
    }
  }

  async save(id: number | null, dto: SaveWorkPolicyDto) {
    this.validateRules(dto);

    return this.em.transactional(async (em) => {
      if (dto.isDefault) {
        await em.nativeUpdate(
          WorkPolicyEntity,
          { isDefault: true, ...(id ? { id: { $ne: id } } : {}) },
          { isDefault: false },
        );
      }

      const policy = id
        ? await em.findOneOrFail(
            WorkPolicyEntity,
            { id },
            { populate: ['rules'] },
          )
        : em.create(WorkPolicyEntity, { name: dto.name });

      em.assign(policy, {
        name: dto.name,
        description: dto.description ?? null,
        isDefault: dto.isDefault ?? false,
        restrictApprovalTime: dto.restrictApprovalTime ?? false,
      });

      // Rules are replaced wholesale, as the Tesmino form did. Delete first
      // and flush, or the unique index trips over the rows being re-added.
      policy.rules.removeAll();
      await em.flush();

      for (const rule of dto.rules) {
        policy.rules.add(
          em.create(WorkPolicyRuleEntity, {
            policy,
            requestType: rule.requestType,
            period: rule.period ?? null,
            year: rule.year,
            monthlyCapMinutes: rule.monthlyCapMinutes ?? null,
            yearlyCapMinutes: rule.yearlyCapMinutes ?? null,
            carryoverCapMinutes: rule.carryoverCapMinutes ?? null,
            allowOverMonthlyCap: rule.allowOverMonthlyCap ?? true,
            allowOverYearlyCap: rule.allowOverYearlyCap ?? true,
          }),
        );
      }

      await em.persistAndFlush(policy);
      return policy;
    });
  }

  async remove(id: number) {
    const policy = await this.getOrFail(id);
    await this.em.removeAndFlush(policy);
  }

  /**
   * The rule capping a request type in a year: an exact period match first,
   * then a rule that covers both periods.
   */
  async ruleFor(
    policyId: number,
    requestType: PolicyRequestType,
    period: PolicyPeriod | null,
    year: number,
  ): Promise<WorkPolicyRuleEntity | null> {
    const rules = await this.em.find(WorkPolicyRuleEntity, {
      policy: policyId,
      requestType,
      year,
    });

    return (
      (period && rules.find((r) => r.period === period)) ||
      rules.find((r) => !r.period) ||
      null
    );
  }
}
