import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional } from 'class-validator';

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
