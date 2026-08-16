import { EntityManager } from '@mikro-orm/core';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Role } from '../../roles/roles.constants';
import { ApprovalRuleEntity } from '../entities/approval-rule.entity';
import { ExpenseCategoryEntity } from '../entities/expense-category.entity';

/** 1 Toman = 10 Rial. Storage is rial; these are written as rial. */
const T = 10;

/**
 * Seed categories. `requiresInvoice: false` where an invoice genuinely doesn't
 * exist — rent and payroll-adjacent payments would otherwise block submission.
 */
const DEFAULT_CATEGORIES: Array<{
  code: string;
  name: string;
  requiresInvoice: boolean;
}> = [
  { code: 'saas', name: 'نرم‌افزار و اشتراک', requiresInvoice: true },
  { code: 'internet', name: 'اینترنت و ارتباطات', requiresInvoice: true },
  { code: 'rent', name: 'اجاره و شارژ', requiresInvoice: false },
  { code: 'utilities', name: 'قبوض و خدمات شهری', requiresInvoice: true },
  { code: 'office', name: 'تجهیزات و ملزومات اداری', requiresInvoice: true },
  { code: 'services', name: 'خدمات و پیمانکاران', requiresInvoice: true },
  { code: 'marketing', name: 'تبلیغات و بازاریابی', requiresInvoice: true },
  { code: 'travel', name: 'سفر و مأموریت', requiresInvoice: true },
  { code: 'other', name: 'سایر', requiresInvoice: false },
];

/**
 * Starting approval matrix. Deliberately conservative — these are placeholders
 * to make the module work on first boot, not researched limits. Admins change
 * them from /dashboard/finance/settings without a deploy.
 */
const DEFAULT_APPROVAL_RULES: Array<{
  minAmountRial: number;
  maxAmountRial: number | null;
  approverChain: Role[];
  description: string;
}> = [
  {
    minAmountRial: 0,
    maxAmountRial: 2_000_000 * T,
    approverChain: [],
    description: 'تا ۲ میلیون تومان — بدون تأییدکننده، مستقیم به صف مالی',
  },
  {
    minAmountRial: 2_000_000 * T,
    maxAmountRial: 20_000_000 * T,
    approverChain: [Role.APPROVER],
    description: 'از ۲ تا ۲۰ میلیون تومان — یک تأییدکننده',
  },
  {
    minAmountRial: 20_000_000 * T,
    maxAmountRial: null,
    approverChain: [Role.APPROVER, Role.ADMIN],
    description: 'بیش از ۲۰ میلیون تومان — تأییدکننده و ادمین',
  },
];

/**
 * Puts the finance module into a working state on first boot: without a
 * category and at least one approval rule, nobody can submit anything.
 *
 * Idempotent, and never overwrites what an admin has since changed — it only
 * fills in what is missing. Uses a forked EntityManager, following
 * AdminUserBootstrapService.
 */
@Injectable()
export class FinanceBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FinanceBootstrapService.name);

  constructor(private readonly em: EntityManager) {}

  async onApplicationBootstrap(): Promise<void> {
    const em = this.em.fork();

    try {
      await this.seedCategories(em);
      await this.seedApprovalRules(em);
    } catch (error) {
      // A failed seed must not stop the API from booting — the module simply
      // stays unusable until an admin fixes it, which is visible immediately.
      this.logger.error(
        `مقداردهی اولیه ماژول مالی ناموفق بود: ${error?.message}`,
      );
    }
  }

  private async seedCategories(em: EntityManager): Promise<void> {
    const existing = await em.find(ExpenseCategoryEntity, {});
    const existingCodes = new Set(existing.map((c) => c.code));

    const missing = DEFAULT_CATEGORIES.filter(
      (c) => !existingCodes.has(c.code),
    );

    if (missing.length === 0) {
      return;
    }

    const created = missing.map((c) =>
      em.create(ExpenseCategoryEntity, {
        code: c.code,
        name: c.name,
        requiresInvoice: c.requiresInvoice,
        active: true,
      } as never),
    );

    await em.persistAndFlush(created);
    this.logger.log(`${created.length} دسته هزینه پیش‌فرض ایجاد شد`);
  }

  private async seedApprovalRules(em: EntityManager): Promise<void> {
    const count = await em.count(ApprovalRuleEntity, {});

    // Only seed into an empty matrix. Once an admin has edited it, an absent
    // band is a deliberate choice, not something to helpfully restore.
    if (count > 0) {
      return;
    }

    const created = DEFAULT_APPROVAL_RULES.map((rule) =>
      em.create(ApprovalRuleEntity, {
        minAmountRial: rule.minAmountRial,
        maxAmountRial: rule.maxAmountRial,
        approverChain: rule.approverChain,
        description: rule.description,
        priority: 0,
        active: true,
      } as never),
    );

    await em.persistAndFlush(created);
    this.logger.log(`${created.length} قانون تأیید پیش‌فرض ایجاد شد`);
  }
}
