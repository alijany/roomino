import { Transform } from 'class-transformer';
import { normalizeNumbers } from '../../libs/utils/pipe.normalizeNumbers';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const toNumber = (value: unknown) =>
  typeof value === 'string' ? Number(normalizeNumbers(value)) : value;
const Num = () => Transform(({ value }) => toNumber(value));

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const rial = { message: 'مبلغ باید عدد صحیح (ریال) باشد' };

export class CreateFinalSettlementDto {
  @Num()
  @IsInt({ message: 'کاربر را انتخاب کنید' })
  userId: number;

  /** The day of settlement, `YYYY-MM-DD`. */
  @IsString()
  @Matches(DATE, { message: 'تاریخ تسویه نامعتبر است' })
  date: string;
}

/** The inputs of a draft settlement; send only what changes. */
export class UpdateFinalSettlementDto {
  @IsOptional()
  @IsString()
  @Matches(DATE, { message: 'تاریخ تسویه نامعتبر است' })
  date?: string;

  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'مانده‌ی مرخصی نامعتبر است' })
  @Min(0, { message: 'مانده‌ی مرخصی نامعتبر است' })
  @Max(400, { message: 'مانده‌ی مرخصی نامعتبر است' })
  leaveRemainDays?: number;

  /** Months the eidi covers; `null` goes back to counting from the dates. */
  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'مدت عیدی نامعتبر است' })
  @Min(0, { message: 'مدت عیدی نامعتبر است' })
  @Max(12, { message: 'مدت عیدی حداکثر ۱۲ ماه است' })
  eidiMonths?: number | null;

  /** The severance span, `YYYY-MM-DD`; `null` goes back to the default. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(DATE, { message: 'تاریخ سنوات نامعتبر است' })
  severanceFrom?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(DATE, { message: 'تاریخ سنوات نامعتبر است' })
  severanceTo?: string | null;

  @IsOptional()
  @IsBoolean()
  severanceProRata?: boolean;

  @IsOptional() @Num() @IsInt(rial) @Min(0, rial) eidiPaid?: number;

  /** May be negative: the last month was paid in full and the person left early. */
  @IsOptional() @Num() @IsInt(rial) adjustment?: number;

  @IsOptional() @Num() @IsInt(rial) @Min(0, rial) advance?: number;
  @IsOptional() @Num() @IsInt(rial) @Min(0, rial) loan?: number;
  @IsOptional() @Num() @IsInt(rial) @Min(0, rial) otherDeductions?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
