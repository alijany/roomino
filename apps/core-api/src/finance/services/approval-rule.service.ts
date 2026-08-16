import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { Role } from '../../roles/roles.constants';
import { ApprovalRuleInputDto } from '../dtos/finance-settings.dto';
import { ApprovalRuleEntity } from '../entities/approval-rule.entity';
import { ExpenseCategoryEntity } from '../entities/expense-category.entity';
import { readBigint } from '../utils/money.util';

/**
 * Roles that may sit in an approval chain. Finance is excluded on purpose:
 * they verify and pay, which is a separate act from approving. Employees
 * obviously cannot approve.
 */
const ALLOWED_APPROVER_ROLES: readonly Role[] = [Role.APPROVER, Role.ADMIN];

@Injectable()
export class ApprovalRuleService extends BaseRepositoryService<ApprovalRuleEntity> {
  constructor(
    @InjectRepository(ApprovalRuleEntity)
    protected repository: EntityRepository<ApprovalRuleEntity>,
  ) {
    super(repository);
  }

  listAll() {
    return this.findAll(
      {},
      { orderBy: { minAmountRial: 'ASC' }, populate: ['category'] as never },
    );
  }

  /**
   * Resolves the approver chain for an amount.
   *
   * Picks the highest-priority active rule whose band contains `amountRial`,
   * preferring a category-specific rule over a catch-all. Returning an empty
   * chain is a legitimate outcome — it means the amount is below the threshold
   * that needs business approval and goes straight to the Finance queue.
   */
  async resolveChain(amountRial: number, categoryId?: number): Promise<Role[]> {
    const [rules] = await this.findAll(
      { active: true },
      {
        populate: ['category'] as never,
      },
    );

    const matching = rules.filter((rule) => {
      const min = readBigint(rule.minAmountRial);
      const max =
        rule.maxAmountRial == null ? null : readBigint(rule.maxAmountRial);

      if (amountRial < min) return false;
      if (max !== null && amountRial >= max) return false;

      const ruleCategoryId = rule.category?.id;
      return !ruleCategoryId || ruleCategoryId === categoryId;
    });

    if (matching.length === 0) {
      return [];
    }

    matching.sort((a, b) => {
      // A rule pinned to a category beats a catch-all covering the same band.
      const aSpecific = a.category ? 1 : 0;
      const bSpecific = b.category ? 1 : 0;
      if (aSpecific !== bSpecific) return bSpecific - aSpecific;
      if (a.priority !== b.priority) return b.priority - a.priority;
      // Narrower band wins the tie.
      return readBigint(b.minAmountRial) - readBigint(a.minAmountRial);
    });

    return this.sanitiseChain(matching[0].approverChain ?? []);
  }

  /**
   * Replaces the whole matrix in one transaction. Partial edits invite
   * overlapping bands that are hard to reason about, so the admin UI always
   * sends the complete set.
   */
  async replaceAll(
    rules: ApprovalRuleInputDto[],
  ): Promise<ApprovalRuleEntity[]> {
    this.validateBands(rules);

    return this.withTransaction(async (em) => {
      await em.nativeDelete(ApprovalRuleEntity, {});

      const created = rules.map((rule) =>
        em.create(ApprovalRuleEntity, {
          minAmountRial: rule.minAmountRial,
          maxAmountRial: rule.maxAmountRial ?? null,
          category: rule.categoryId
            ? em.getReference(ExpenseCategoryEntity, rule.categoryId)
            : null,
          approverChain: this.sanitiseChain(rule.approverChain),
          priority: rule.priority ?? 0,
          description: rule.description,
          active: true,
        } as never),
      );

      await em.persistAndFlush(created);
      return created;
    });
  }

  /** Strips anything that must never be able to approve. */
  private sanitiseChain(chain: Role[]): Role[] {
    return (chain ?? []).filter((role) =>
      ALLOWED_APPROVER_ROLES.includes(role),
    );
  }

  private validateBands(rules: ApprovalRuleInputDto[]): void {
    for (const rule of rules) {
      if (
        rule.maxAmountRial != null &&
        rule.maxAmountRial <= rule.minAmountRial
      ) {
        throw new BadRequestException('سقف مبلغ باید بزرگ‌تر از کف مبلغ باشد');
      }

      const invalid = (rule.approverChain ?? []).filter(
        (role) => !ALLOWED_APPROVER_ROLES.includes(role),
      );

      if (invalid.length > 0) {
        throw new BadRequestException(
          'فقط نقش‌های تأییدکننده و ادمین می‌توانند در زنجیره تأیید قرار بگیرند',
        );
      }
    }
  }
}
