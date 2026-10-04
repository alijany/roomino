import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
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

/** A grant: created already approved, on someone else's behalf. */
export class GrantRequestDto extends CreateRequestDto {}

export class RejectRequestDto {
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class ListRequestsDto extends PageQueryDto {
  @IsOptional() @IsEnum(RequestStatus) status?: RequestStatus;
  @IsOptional()
  @IsIn([...Object.values(RequestCategory)])
  category?: RequestCategory;
  @IsOptional() @Type(() => Number) @IsInt() employeeId?: number;
}
