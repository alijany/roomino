import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MAX_CONFIRM_DAYS } from '../attendance.constants';
import { CLOCK_PATTERN, DATE_PATTERN, Digits } from './common.dto';

export class CheckInDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  /** Check in as remote work even when outside the radius. */
  @IsOptional() @IsBoolean() remote?: boolean;
}

export class CheckOutDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

/** Record or correct one day's check-in/out (admin, HR or team approver). */
export class CorrectAttendanceDto {
  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ نامعتبر است' })
  date: string;

  /**
   * The person wasn't at work: times are cleared and the day is absent —
   * the way to record an absence in schedule mode, where a day with nothing
   * recorded counts as worked.
   */
  @IsOptional()
  @IsBoolean()
  absent?: boolean;

  @ValidateIf((dto: CorrectAttendanceDto) => !dto.absent)
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت ورود نامعتبر است' })
  checkIn?: string;

  @IsOptional()
  @ValidateIf((dto: CorrectAttendanceDto) => !dto.absent)
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت خروج نامعتبر است' })
  checkOut?: string;

  @IsString()
  @IsNotEmpty({ message: 'دلیل اصلاح را وارد کنید' })
  @MaxLength(500)
  note: string;
}

/** «حاضر بود»: a reviewer confirms days a person in «بدون ثبت» didn't declare. */
export class ConfirmPresenceDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'روزی انتخاب نشده است' })
  @ArrayMaxSize(MAX_CONFIRM_DAYS)
  @Matches(DATE_PATTERN, { each: true, message: 'تاریخ نامعتبر است' })
  dates: string[];

  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class RevokePresenceQueryDto {
  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ نامعتبر است' })
  date: string;
}
