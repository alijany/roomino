import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PolicyPeriod, PolicyRequestType } from '../attendance.constants';
import { CLOCK_PATTERN, Digits } from './common.dto';

// --- workplaces ----------------------------------------------------------------

export class CreateWorkplaceDto {
  @IsString()
  @IsNotEmpty({ message: 'نام محل کار را وارد کنید' })
  @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'عرض جغرافیایی نامعتبر است' })
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'طول جغرافیایی نامعتبر است' })
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10, { message: 'شعاع مجاز حداقل ۱۰ متر است' })
  @Max(10000)
  radiusMeters?: number;

  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateWorkplaceDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(10000)
  radiusMeters?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

// --- shifts -------------------------------------------------------------------

export class ShiftDayDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(6) dayOfWeek: number;

  @IsBoolean() isActive: boolean;

  @ValidateIf((d: ShiftDayDto) => d.isActive)
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت شروع نامعتبر است' })
  startTime?: string;

  @ValidateIf((d: ShiftDayDto) => d.isActive)
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'ساعت پایان نامعتبر است' })
  endTime?: string;

  @IsOptional() @IsBoolean() hasSecondPart?: boolean;

  @ValidateIf((d: ShiftDayDto) => d.isActive && d.hasSecondPart)
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'شروع قسمت دوم نامعتبر است' })
  secondStartTime?: string;

  @ValidateIf((d: ShiftDayDto) => d.isActive && d.hasSecondPart)
  @Digits()
  @Matches(CLOCK_PATTERN, { message: 'پایان قسمت دوم نامعتبر است' })
  secondEndTime?: string;
}

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty({ message: 'نام شیفت را وارد کنید' })
  @MaxLength(200)
  name: string;

  @Type(() => Number) @IsInt() @Min(1390) @Max(1500) year: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  flexMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  dailyOvertimeCapMinutes?: number;

  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ShiftDayDto)
  days: ShiftDayDto[];
}

export class UpdateShiftDto extends CreateShiftDto {}

// --- job groups ---------------------------------------------------------------

export class SaveJobGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'نام گروه شغلی را وارد کنید' })
  @MaxLength(200)
  name: string;

  /** User ids of the group's approvers; replaces the current set. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  approverIds?: number[];
}

// --- work policies -----------------------------------------------------------

export class PolicyRuleDto {
  @IsEnum(PolicyRequestType, { message: 'نوع درخواست نامعتبر است' })
  requestType: PolicyRequestType;

  @IsOptional() @IsEnum(PolicyPeriod) period?: PolicyPeriod;

  @Type(() => Number) @IsInt() @Min(1390) @Max(1500) year: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(744 * 60)
  monthlyCapMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8784 * 60)
  yearlyCapMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8784 * 60)
  carryoverCapMinutes?: number;

  @IsOptional() @IsBoolean() allowOverMonthlyCap?: boolean;
  @IsOptional() @IsBoolean() allowOverYearlyCap?: boolean;
}

export class SaveWorkPolicyDto {
  @IsString()
  @IsNotEmpty({ message: 'نام سیاست کاری را وارد کنید' })
  @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() restrictApprovalTime?: boolean;

  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => PolicyRuleDto)
  rules: PolicyRuleDto[];
}
