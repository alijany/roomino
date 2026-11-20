import { Transform } from 'class-transformer';
import { normalizeNumbers } from '../../libs/utils/pipe.normalizeNumbers';

/**
 * A number from the body, Persian/Arabic digits welcome («۳۰» is 30). One
 * transform instead of `@Type(() => Number)`, which would turn «۳۰» into NaN
 * before any other transform saw it.
 */
const toNumber = (value: unknown) =>
  typeof value === 'string' ? Number(normalizeNumbers(value)) : value;
const Num = () =>
  Transform(({ value }) =>
    Array.isArray(value) ? value.map(toNumber) : toNumber(value),
  );
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  Matches,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const amount = { message: 'مبلغ باید عدد صحیح (ریال) و نامنفی باشد' };
const hours = { message: 'مقدار نامعتبر است (نامنفی، حداکثر دو رقم اعشار)' };

/** The month's inputs for one person; send only what changes. */
export class UpdatePayrollLineDto {
  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'روز کار نامعتبر است' })
  @Min(0, { message: 'روز کار نامعتبر است' })
  @Max(31, { message: 'روز کار حداکثر ۳۱ است' })
  days?: number;

  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, hours)
  @Min(0, hours)
  @Max(744, hours)
  overtimeHours?: number;
  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, hours)
  @Min(0, hours)
  @Max(744, hours)
  nightHours?: number;
  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, hours)
  @Min(0, hours)
  @Max(744, hours)
  holidayHours?: number;
  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, hours)
  @Min(0, hours)
  @Max(744, hours)
  deficitHours?: number;
  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, hours)
  @Min(0, hours)
  @Max(31, hours)
  missionDays?: number;
  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, hours)
  @Min(0, hours)
  @Max(366, hours)
  leaveRemainDays?: number;

  @IsOptional()
  @Num()
  @IsInt(amount)
  @Min(0, amount)
  bonus?: number;
  @IsOptional()
  @Num()
  @IsInt(amount)
  @Min(0, amount)
  commission?: number;
  @IsOptional()
  @Num()
  @IsInt(amount)
  @Min(0, amount)
  onCall?: number;
  @IsOptional()
  @Num()
  @IsInt(amount)
  @Min(0, amount)
  advance?: number;
  @IsOptional()
  @Num()
  @IsInt(amount)
  @Min(0, amount)
  loan?: number;
  @IsOptional()
  @Num()
  @IsInt(amount)
  @Min(0, amount)
  otherDeductions?: number;

  @IsOptional() @IsBoolean() payEidi?: boolean;
  @IsOptional() @IsBoolean() settle?: boolean;

  @IsOptional() @IsString() @MaxLength(255) note?: string;
}

/** Why a final month or line is being opened again; it is kept with the line. */
export class ReopenPayrollDto {
  @IsString()
  @IsNotEmpty({ message: 'دلیل بازکردن را بنویسید' })
  @MaxLength(255, { message: 'دلیل حداکثر ۲۵۵ نویسه است' })
  reason: string;
}

/** How much of an approved advance to take off this month; omitted takes what is left. */
export class ApplyAdvanceDto {
  @IsOptional()
  @Num()
  @IsInt(amount)
  @Min(1, { message: 'مبلغ باید بیشتر از صفر باشد' })
  amount?: number;
}

const SETTLE_KINDS = ['salary', 'extras', 'both'] as const;
export type SettleKind = (typeof SETTLE_KINDS)[number];

/** Mark a line's transfers (or a whole month's) as paid, on a chosen day — today when it is left out. */
export class SettlePayrollDto {
  @IsIn(SETTLE_KINDS, { message: 'نوع تسویه نامعتبر است' })
  kind: SettleKind;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاریخ تسویه نامعتبر است' })
  date?: string;

  /** For a whole month: only these lines; every final line of the month when left out. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  lineIds?: number[];
}

/** Take the paid mark off a line's transfer. */
export class UnsettlePayrollDto {
  @IsIn(SETTLE_KINDS, { message: 'نوع تسویه نامعتبر است' })
  kind: SettleKind;
}
