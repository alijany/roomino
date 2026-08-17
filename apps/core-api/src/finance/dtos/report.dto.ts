import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

export class RangeQueryDto {
  @IsOptional()
  @IsISO8601({}, { message: 'تاریخ شروع نامعتبر است' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'تاریخ پایان نامعتبر است' })
  to?: string;
}

export class MonthQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  year?: number;

  /** Gregorian month, 1–12. The UI converts from the Jalali month the user picked. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class ExportQueryDto extends RangeQueryDto {}
