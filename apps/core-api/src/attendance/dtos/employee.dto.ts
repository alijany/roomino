import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AttendanceMode, DeviceType } from '../attendance.constants';
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

  /** This person's own mode; omitted or null follows the job group. */
  @IsOptional()
  @IsEnum(AttendanceMode, { message: 'نوع حضور نامعتبر است' })
  attendanceMode?: AttendanceMode;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  remoteDays?: number[];

  @IsOptional() @IsBoolean() active?: boolean;
}

/** The per-person part of a profile: which user it is for. The code and title live on the user. */
export class EmployeeIdentityDto {
  /** The Roomino user this profile belongs to. */
  @Type(() => Number)
  @IsInt({ message: 'کاربر را انتخاب کنید' })
  userId: number;
}

export class CreateEmployeeDto extends EmployeeAssignmentDto {
  @Type(() => Number)
  @IsInt({ message: 'کاربر را انتخاب کنید' })
  userId: number;
}

/**
 * Several profiles at once: each person is a user,
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

  /** `null` goes back to following the job group. */
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsEnum(AttendanceMode, { message: 'نوع حضور نامعتبر است' })
  attendanceMode?: AttendanceMode | null;

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
