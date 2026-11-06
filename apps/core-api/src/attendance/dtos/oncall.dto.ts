import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export class OnCallSlotDto {
  @IsString()
  @Matches(CLOCK, { message: 'ساعت شروع نامعتبر است' })
  start: string;

  @IsString()
  @Matches(CLOCK, { message: 'ساعت پایان نامعتبر است' })
  end: string;
}

export class OnCallTemplatesDto {
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OnCallSlotDto)
  normal: OnCallSlotDto[];

  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OnCallSlotDto)
  thursday: OnCallSlotDto[];

  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OnCallSlotDto)
  friday: OnCallSlotDto[];

  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OnCallSlotDto)
  holiday: OnCallSlotDto[];
}

export class OnCallRatesDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000_000)
  normal: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000_000)
  thursday: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000_000)
  friday: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000_000)
  holiday: number;
}

export class SaveOnCallSettingsDto {
  /** Pay per hour on call by kind of day, in rial. */
  @IsOptional()
  @ValidateNested()
  @Type(() => OnCallRatesDto)
  hourlyRates?: OnCallRatesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnCallTemplatesDto)
  templates?: OnCallTemplatesDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  periodStartDay?: number;

  /** The eligible people in list order; replaces the current list. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  memberOrder?: number[];
}

export class OnCallEntryDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsString()
  @Matches(CLOCK, { message: 'ساعت شروع نامعتبر است' })
  start: string;

  @IsString()
  @Matches(CLOCK, { message: 'ساعت پایان نامعتبر است' })
  end: string;
}

export class SaveOnCallDayDto {
  /** Everything on call that day; replaces what is there. Empty clears the day. */
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OnCallEntryDto)
  entries: OnCallEntryDto[];
}

export class OnCallPeriodQueryDto {
  /** Jalali year and month the period starts in. */
  @Type(() => Number)
  @IsInt()
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}

export class PublishOnCallDto extends OnCallPeriodQueryDto {
  /** Tell the people who have a slot; on by default. */
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class ResolveOnCallChangesDto {
  /** Tell the people the pending changes touch, or leave them unannounced. */
  @IsBoolean()
  notify: boolean;
}

export class RepeatOnCallDto extends OnCallPeriodQueryDto {
  /** Overwrite days that already have someone; otherwise they are left as they are. */
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}

export class CopyPreviousOnCallDto extends RepeatOnCallDto {
  /** `continue` carries the rotation on; `restart` begins at the first of the pattern. */
  @IsIn(['continue', 'restart'])
  mode: 'continue' | 'restart';
}

export class CreateOnCallSwapDto {
  @IsIn(['swap', 'handover', 'partial'])
  kind: 'swap' | 'handover' | 'partial';

  @Type(() => Number)
  @IsInt()
  targetId: number;

  /** Civil date, `YYYY-MM-DD`. */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  requesterDate: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetDate?: string;

  /** For a partial handover: the hours given away. */
  @IsOptional()
  @IsString()
  @Matches(CLOCK)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(CLOCK)
  endTime?: string;

  /** Already agreed between the two: apply now instead of asking. */
  @IsOptional()
  @IsBoolean()
  coordinated?: boolean;
}
