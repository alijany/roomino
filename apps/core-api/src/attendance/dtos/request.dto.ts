import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  ManualDirection,
  RequestCategory,
  RequestStatus,
  RequestType,
} from '../attendance.constants';
import {
  CLOCK_PATTERN,
  DATE_PATTERN,
  Digits,
  PageQueryDto,
} from './common.dto';

/**
 * A new request. Which fields are required depends on `type`; the service
 * checks the combination and drops fields the type doesn't use.
 */
export class CreateRequestDto {
  @IsEnum(RequestType, { message: 'نوع درخواست را انتخاب کنید' })
  type: RequestType;

  @IsOptional()
  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ شروع نامعتبر است' })
  dateFrom?: string;
  @IsOptional()
  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ پایان نامعتبر است' })
  dateTo?: string;
  @IsOptional()
  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ نامعتبر است' })
  date?: string;
  @IsOptional()
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت شروع نامعتبر است' })
  timeFrom?: string;
  @IsOptional()
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت پایان نامعتبر است' })
  timeTo?: string;
  @IsOptional()
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت تردد نامعتبر است' })
  manualTime?: string;
  @IsOptional() @IsEnum(ManualDirection) manualDirection?: ManualDirection;

  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

/** A reviewer's correction of a pending request's date or time; the type stays. */
export class UpdateRequestDto {
  @IsOptional()
  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ شروع نامعتبر است' })
  dateFrom?: string;
  @IsOptional()
  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ پایان نامعتبر است' })
  dateTo?: string;
  @IsOptional()
  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ نامعتبر است' })
  date?: string;
  @IsOptional()
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت شروع نامعتبر است' })
  timeFrom?: string;
  @IsOptional()
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت پایان نامعتبر است' })
  timeTo?: string;
  @IsOptional()
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت تردد نامعتبر است' })
  manualTime?: string;
}

/** A grant: created already approved, on someone else's behalf. */
export class GrantRequestDto extends CreateRequestDto {}

export class RejectRequestDto {
  /** A rejection always says why; the requester reads this. */
  @IsString()
  @IsNotEmpty({ message: 'دلیل رد درخواست را وارد کنید' })
  @MaxLength(1000)
  note: string;
}

export class ListRequestsDto extends PageQueryDto {
  /** A status, or `all`; without it, only what is pending. */
  @IsOptional()
  @IsIn([...Object.values(RequestStatus), 'all'])
  status?: RequestStatus | 'all';
  @IsOptional()
  @IsIn([...Object.values(RequestCategory)])
  category?: RequestCategory;
  @IsOptional() @Type(() => Number) @IsInt() employeeId?: number;
}
