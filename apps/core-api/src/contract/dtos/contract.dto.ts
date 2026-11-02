import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { normalizeNumbers } from 'src/libs/utils/pipe.normalizeNumbers';

/** Civil date, `YYYY-MM-DD`. */
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const digits = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? normalizeNumbers(value).trim() : value,
  );

export class CreateContractDto {
  @digits()
  @Matches(DATE, { message: 'تاریخ شروع قرارداد نامعتبر است' })
  startDate: string;

  @digits()
  @Matches(DATE, { message: 'تاریخ پایان قرارداد نامعتبر است' })
  endDate: string;

  @IsOptional() @IsBoolean() signed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'توضیحات حداکثر ۵۰۰ نویسه است' })
  note?: string;
}

export class UpdateContractDto {
  @IsOptional()
  @digits()
  @Matches(DATE, { message: 'تاریخ شروع قرارداد نامعتبر است' })
  startDate?: string;

  @IsOptional()
  @digits()
  @Matches(DATE, { message: 'تاریخ پایان قرارداد نامعتبر است' })
  endDate?: string;

  @IsOptional() @IsBoolean() signed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'توضیحات حداکثر ۵۰۰ نویسه است' })
  note?: string;
}

export class SetNdaDto {
  @IsBoolean() signed: boolean;

  /** Civil date; empty clears it. */
  @IsOptional()
  @digits()
  @ValidateIf((_, v) => v !== '')
  @Matches(DATE, { message: 'تاریخ امضای NDA نامعتبر است' })
  signedDate?: string;
}
