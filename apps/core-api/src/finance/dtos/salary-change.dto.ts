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
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** `140507` is مهر ۱۴۰۵; the month is checked in the service. */
const PERIOD = { min: 130001, max: 150012 };

export class CreateSalaryChangeDto {
  @Num()
  @IsInt({ message: 'کاربر را انتخاب کنید' })
  userId: number;

  @Num()
  @IsInt({ message: 'ماه اعمال را انتخاب کنید' })
  @Min(PERIOD.min, { message: 'ماه اعمال نامعتبر است' })
  @Max(PERIOD.max, { message: 'ماه اعمال نامعتبر است' })
  period: number;

  /** The new salary in rial. Give this or `percent`. */
  @IsOptional()
  @Num()
  @IsInt({ message: 'حقوق جدید باید عدد صحیح (ریال) باشد' })
  @Min(1, { message: 'حقوق جدید باید بیشتر از صفر باشد' })
  salary?: number;

  /** Change as a percent of the current salary; negative lowers it. */
  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'درصد تغییر نامعتبر است' })
  @Min(-99.99, { message: 'درصد تغییر نامعتبر است' })
  @Max(1000, { message: 'درصد تغییر نامعتبر است' })
  percent?: number;

  /** Round a salary computed from a percent to a multiple of this many rial. */
  @IsOptional()
  @Num()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  roundTo?: number;

  /** Record it as a proposal for a meeting instead of a confirmed change. */
  @IsOptional() @IsBoolean() propose?: boolean;

  @IsOptional() @IsString() @MaxLength(255) note?: string;
}

export class BulkSalaryRaiseDto {
  @IsArray({ message: 'حداقل یک نفر را انتخاب کنید' })
  @ArrayMinSize(1, { message: 'حداقل یک نفر را انتخاب کنید' })
  @ArrayMaxSize(500, { message: 'در هر بار حداکثر ۵۰۰ نفر' })
  @Num()
  @IsInt({ each: true })
  userIds: number[];

  @Num()
  @IsInt({ message: 'ماه اعمال را انتخاب کنید' })
  @Min(PERIOD.min, { message: 'ماه اعمال نامعتبر است' })
  @Max(PERIOD.max, { message: 'ماه اعمال نامعتبر است' })
  period: number;

  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'درصد افزایش نامعتبر است' })
  @Min(0.01, { message: 'درصد افزایش باید بیشتر از صفر باشد' })
  @Max(1000, { message: 'درصد افزایش نامعتبر است' })
  percent: number;

  @IsOptional()
  @Num()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  roundTo?: number;

  @IsOptional() @IsString() @MaxLength(255) note?: string;

  @IsOptional() @IsBoolean() propose?: boolean;
}

/** Changes to an open proposal; send only what changes. */
export class UpdateSalaryProposalDto {
  @IsOptional()
  @Num()
  @IsInt({ message: 'ماه اعمال نامعتبر است' })
  @Min(PERIOD.min, { message: 'ماه اعمال نامعتبر است' })
  @Max(PERIOD.max, { message: 'ماه اعمال نامعتبر است' })
  period?: number;

  @IsOptional()
  @Num()
  @IsInt({ message: 'حقوق پیشنهادی باید عدد صحیح (ریال) باشد' })
  @Min(1, { message: 'حقوق پیشنهادی باید بیشتر از صفر باشد' })
  salary?: number;

  @IsOptional()
  @Num()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'درصد تغییر نامعتبر است' })
  @Min(-99.99, { message: 'درصد تغییر نامعتبر است' })
  @Max(1000, { message: 'درصد تغییر نامعتبر است' })
  percent?: number;

  @IsOptional()
  @Num()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  roundTo?: number;

  @IsOptional() @IsString() @MaxLength(255) note?: string;
}

export class ConfirmSalaryChangesDto {
  @IsArray({ message: 'حداقل یک مورد را انتخاب کنید' })
  @ArrayMinSize(1, { message: 'حداقل یک مورد را انتخاب کنید' })
  @ArrayMaxSize(500, { message: 'در هر بار حداکثر ۵۰۰ مورد' })
  @Num()
  @IsInt({ each: true })
  ids: number[];
}
