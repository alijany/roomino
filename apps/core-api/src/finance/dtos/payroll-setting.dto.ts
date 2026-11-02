import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePayrollSettingDto {
  /** Start from this year's values instead of the official ones. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'سال مبدأ نامعتبر است' })
  copyFrom?: number;
}

export class UpdatePayrollSettingDto {
  /** Only the parameters being changed, keyed as in the catalog. */
  @IsOptional()
  @IsObject({ message: 'مقادیر نامعتبر است' })
  values?: Record<string, number>;

  /** Insurance / tax treatment of the items being changed. */
  @IsOptional()
  @IsObject({ message: 'تنظیم بیمه و مالیات نامعتبر است' })
  inclusion?: Record<string, { insurable: boolean; taxable: boolean }>;
}

/** The year's supplementary-insurance policy. */
export class SupplementaryPolicyDto {
  @Type(() => Number)
  @IsInt({ message: 'ماه شروع نامعتبر است' })
  @Min(1, { message: 'ماه شروع نامعتبر است' })
  @Max(12, { message: 'ماه شروع نامعتبر است' })
  startMonth: number;

  /** Empty runs to the year's end. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt({ message: 'ماه پایان نامعتبر است' })
  @Min(1, { message: 'ماه پایان نامعتبر است' })
  @Max(12, { message: 'ماه پایان نامعتبر است' })
  endMonth?: number | null;

  /** The monthly premium in rial. */
  @Type(() => Number)
  @IsInt({ message: 'مبلغ بیمه تکمیلی نامعتبر است' })
  @Min(0, { message: 'مبلغ بیمه تکمیلی نامعتبر است' })
  amount: number;
}

/** The site-wide switch of the supplementary insurance. */
export class SupplementaryEnabledDto {
  @IsBoolean({ message: 'مقدار نامعتبر است' })
  enabled: boolean;
}
