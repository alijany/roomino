import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { HolidaySource } from '../attendance.constants';
import { DATE_PATTERN, Digits } from './common.dto';

export class SaveHolidayDto {
  @IsString()
  @IsNotEmpty({ message: 'عنوان تعطیلی را وارد کنید' })
  @MaxLength(250)
  title: string;

  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ نامعتبر است' })
  date: string;

  @IsOptional() @IsBoolean() active?: boolean;
}

export class ListHolidaysDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1300)
  @Max(1500)
  year?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;
  @IsOptional() @IsEnum(HolidaySource) source?: HolidaySource;

  /** Only active holidays from today on, for the "upcoming" widgets. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) upcoming?: number;
}

export class SyncHolidaysDto {
  @Type(() => Number) @IsInt() @Min(1390) @Max(1500) year: number;
}
