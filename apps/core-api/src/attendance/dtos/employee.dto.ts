import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
  ValidateNested,
} from 'class-validator';
import { DeviceType } from '../attendance.constants';
import { DATE_PATTERN, Digits, PageQueryDto } from './common.dto';

/** Where and how someone works — shared by a single create and a batch. */
export class EmployeeAssignmentDto {
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

/** The per-person part of a profile. */
export class EmployeeIdentityDto {
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
}

export class CreateEmployeeDto extends EmployeeAssignmentDto {
  @Type(() => Number)
  @IsInt({ message: 'کاربر را انتخاب کنید' })
  userId: number;

  @Digits()
  @IsString()
  @IsNotEmpty({ message: 'کد پرسنلی را وارد کنید' })
  @MaxLength(50)
  personnelCode: string;

  @IsOptional() @IsString() @MaxLength(100) jobTitle?: string;
}

/**
 * Several profiles at once: each person brings a user and a personnel code,
 * everything else is shared. All or nothing.
 */
export class BatchCreateEmployeesDto extends EmployeeAssignmentDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'حداقل یک نفر را انتخاب کنید' })
  @ArrayMaxSize(100, { message: 'در هر بار حداکثر ۱۰۰ نفر را می‌توان افزود' })
  @ValidateNested({ each: true })
  @Type(() => EmployeeIdentityDto)
  items: EmployeeIdentityDto[];
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
