import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
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

  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت ورود نامعتبر است' })
  checkIn: string;

  @IsOptional()
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت خروج نامعتبر است' })
  checkOut?: string;

  @IsString()
  @IsNotEmpty({ message: 'دلیل اصلاح را وارد کنید' })
  @MaxLength(500)
  note: string;
}
