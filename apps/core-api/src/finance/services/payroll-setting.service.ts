import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { UpdatePayrollSettingDto } from '../dtos/payroll-setting.dto';
import {
  PayrollInclusion,
  PayrollSettingEntity,
} from '../entities/payroll-setting.entity';
import {
  OFFICIAL_PAYROLL,
  PAYROLL_GROUPS,
  PAYROLL_INCLUSION_ITEMS,
  PAYROLL_PARAMETERS,
  PAYROLL_PARAMETER_BY_KEY,
  PayrollKey,
  PayrollKind,
  PayrollValues,
  defaultInclusion,
} from '../payroll-setting.catalog';
import { readBigint } from '../utils/money.util';

const MIN_YEAR = 1300;
const MAX_YEAR = 1500;

@Injectable()
export class PayrollSettingService extends BaseRepositoryService<PayrollSettingEntity> {
  constructor(
    @InjectRepository(PayrollSettingEntity)
    protected repository: EntityRepository<PayrollSettingEntity>,
  ) {
    super(repository);
  }

  /** Years that have saved values or an official figure, newest first. */
  async years(): Promise<number[]> {
    const rows = await this.repository.findAll({ fields: ['year'] });
    const years = new Set<number>([
      ...rows.map((r) => r.year),
      ...Object.keys(OFFICIAL_PAYROLL).map(Number),
    ]);
    return [...years].sort((a, b) => b - a);
  }

  /** One year as the settings page shows it. */
  async view(year: number) {
    this.assertYear(year);
    const row = await this.repository.findOne({ year });
    const official = OFFICIAL_PAYROLL[year] ?? null;
    const values = row ? this.valuesOf(row) : official;

    const items = PAYROLL_PARAMETERS.map((p) => {
      const value = values ? values[p.key] : null;
      const officialValue = official ? official[p.key] : null;
      const computed = p.derive && values ? p.derive.compute(values) : null;
      return {
        key: p.key,
        group: p.group,
        label: p.label,
        kind: p.kind,
        value,
        official: officialValue,
        /** Differs from the official figure for this year. */
        edited:
          officialValue != null && value != null && value !== officialValue,
        derived: p.derive ? p.derive.label : null,
        /** Differs from what the formula would give. */
        overridden: computed != null && value != null && value !== computed,
        needsReview: Boolean(p.needsReview),
        hint: p.hint ?? null,
      };
    });

    const stored = row?.inclusion ?? {};
    return {
      year,
      exists: Boolean(row),
      hasOfficial: Boolean(official),
      groups: PAYROLL_GROUPS,
      items,
      inclusion: PAYROLL_INCLUSION_ITEMS.map((i) => ({
        key: i.key,
        label: i.label,
        needsReview: Boolean(i.needsReview),
        ...(stored[i.key] ?? i.default),
      })),
    };
  }

  /** Starts a year from another saved year, or from the official figures. */
  async startYear(year: number, copyFrom?: number) {
    this.assertYear(year);
    if (await this.repository.findOne({ year })) {
      throw new ConflictException('تنظیمات این سال قبلاً ساخته شده است');
    }

    let values: PayrollValues | undefined;
    let inclusion = defaultInclusion();
    if (copyFrom !== undefined) {
      const source = await this.repository.findOne({ year: copyFrom });
      if (!source) throw new NotFoundException('سال مبدأ پیدا نشد');
      values = this.valuesOf(source);
      inclusion = { ...inclusion, ...source.inclusion };
    } else {
      values = OFFICIAL_PAYROLL[year];
    }
    if (!values) {
      throw new BadRequestException(
        'برای این سال مقدار رسمی ثبت نشده است؛ از یک سال دیگر کپی کنید',
      );
    }

    this.em.persist(
      this.repository.create({
        year,
        ...values,
        inclusion,
      } as never),
    );
    await this.em.flush();
    return this.view(year);
  }

  async saveYear(year: number, dto: UpdatePayrollSettingDto) {
    this.assertYear(year);
    const row = await this.repository.findOne({ year });
    if (!row) {
      throw new NotFoundException('ابتدا تنظیمات این سال را بسازید');
    }

    const current = this.valuesOf(row);
    const changes = this.validatedValues(dto.values ?? {});
    const next: PayrollValues = { ...current, ...changes };

    // A derived figure follows its sources unless it is being set by hand.
    for (const p of PAYROLL_PARAMETERS) {
      if (!p.derive || p.key in changes) continue;
      if (p.derive.from.some((k) => next[k] !== current[k])) {
        next[p.key] = p.derive.compute(next);
      }
    }

    for (const p of PAYROLL_PARAMETERS) {
      if (next[p.key] !== current[p.key]) {
        (row as unknown as Record<string, number>)[p.key] = next[p.key];
      }
    }

    if (dto.inclusion) {
      row.inclusion = {
        ...row.inclusion,
        ...this.validatedInclusion(dto.inclusion),
      };
    }

    await this.em.flush();
    return this.view(year);
  }

  /** A saved year's parameters, for computing pay; null if the year was never saved. */
  async forYear(year: number) {
    const row = await this.repository.findOne({ year });
    return row
      ? { values: this.valuesOf(row), inclusion: row.inclusion }
      : null;
  }

  // --- helpers ---------------------------------------------------------------

  private assertYear(year: number) {
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      throw new BadRequestException('سال نامعتبر است');
    }
  }

  /** The numbers of a row, with the database's strings turned into numbers. */
  private valuesOf(row: PayrollSettingEntity): PayrollValues {
    const out = {} as PayrollValues;
    for (const p of PAYROLL_PARAMETERS) {
      const raw = (row as unknown as Record<string, number | string>)[p.key];
      out[p.key] = p.kind === 'money' ? readBigint(raw) : Number(raw);
    }
    return out;
  }

  private validatedValues(input: Record<string, number>) {
    const out: Partial<PayrollValues> = {};
    for (const [key, raw] of Object.entries(input)) {
      const param = PAYROLL_PARAMETER_BY_KEY.get(key as PayrollKey);
      if (!param) throw new BadRequestException(`پارامتر ناشناخته: ${key}`);
      const value = Number(raw);
      if (!this.valid(param.kind, value)) {
        throw new BadRequestException(`مقدار «${param.label}» نامعتبر است`);
      }
      out[param.key] = value;
    }
    return out;
  }

  private valid(kind: PayrollKind, value: number): boolean {
    if (!Number.isFinite(value) || value < 0) return false;
    if (kind === 'money') return Number.isSafeInteger(value);
    if (kind === 'percent') {
      return (
        value <= 100 &&
        Math.abs(value * 10_000 - Math.round(value * 10_000)) < 1e-6
      );
    }
    return Number.isInteger(value) && value <= 10_000;
  }

  private validatedInclusion(
    input: Record<string, PayrollInclusion>,
  ): Record<string, PayrollInclusion> {
    const known = new Set(PAYROLL_INCLUSION_ITEMS.map((i) => i.key));
    const out: Record<string, PayrollInclusion> = {};
    for (const [key, flags] of Object.entries(input)) {
      if (!known.has(key))
        throw new BadRequestException(`آیتم ناشناخته: ${key}`);
      out[key] = {
        insurable: Boolean(flags?.insurable),
        taxable: Boolean(flags?.taxable),
      };
    }
    return out;
  }
}
