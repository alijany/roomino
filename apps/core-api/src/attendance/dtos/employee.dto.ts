import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
import { DeviceType } from '../attendance.constants';
import { DATE_PATTERN, Digits, PageQueryDto } from './common.dto';

export class CreateEmployeeDto {
  /** The Roomino user this profile belongs to. */
  @Type(() => Number)
  @IsInt({ message: 'کاربر را انتخاب کنید' })
  userId: number;

  @Digits()
  @IsString()
  @IsNotEmpty({ message: 'کد پرسنلی را وارد کنید' })
  @MaxLength(50)
  personnelCode: string;

  @IsOptional() @IsString() @MaxLength(100) jobTitle?: string;

  @Type(() => Number)
  @IsInt({ message: 'محل کار را انتخاب کنید' })
  workplaceId: number;

  @IsOptional() @Type(() => Number) @IsInt() jobGroupId?: number;
  @IsOptional() @Type(() => Number) @IsInt() workPolicyId?: number;

  @Type(() => Number)
  @IsInt({ message: 'شیفت را انتخاب کنید' })
  shiftId: number;

  @Digits()
  @Matches(DATE_PATTERN, { message: 'تاریخ شروع شیفت نامعتبر است' })
  shiftStartDate: string;

  @IsOptional() @IsBoolean() useGps?: boolean;
  @IsOptional() @IsBoolean() useWifi?: boolean;
  @IsOptional() @IsEnum(DeviceType) allowedDeviceType?: DeviceType;
  @IsOptional() @IsBoolean() trackingEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  remoteDays?: number[];

  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @Digits()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  personnelCode?: string;
  @IsOptional() @IsString() @MaxLength(100) jobTitle?: string;
  @IsOptional() @Type(() => Number) @IsInt() workplaceId?: number;

  /** `null` clears the group/policy. */
  @IsOptional() @Type(() => Number) @IsInt() jobGroupId?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() workPolicyId?: number | null;

  @IsOptional() @Type(() => Number) @IsInt() shiftId?: number;
  @IsOptional() @Digits() @Matches(DATE_PATTERN) shiftStartDate?: string;

  @IsOptional() @IsBoolean() useGps?: boolean;
  @IsOptional() @IsBoolean() useWifi?: boolean;
  @IsOptional() @IsEnum(DeviceType) allowedDeviceType?: DeviceType;
  @IsOptional() @IsBoolean() trackingEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  remoteDays?: number[];

  @IsOptional() @IsBoolean() active?: boolean;
}

/** What a team approver may change on a member: schedule and status only. */
export class UpdateTeamMemberDto {
  @IsOptional() @Type(() => Number) @IsInt() shiftId?: number;
  @IsOptional() @Digits() @Matches(DATE_PATTERN) shiftStartDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  remoteDays?: number[];

  @IsOptional() @IsBoolean() active?: boolean;
}

export class ListEmployeesDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() workplaceId?: number;
  @IsOptional() @Type(() => Number) @IsInt() jobGroupId?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  activeOnly?: boolean;
}
