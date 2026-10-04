import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { normalizeNumbers } from '../../libs/utils/pipe.normalizeNumbers';

/** `"HH:mm"`, 00:00–23:59. */
export const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Civil date `"YYYY-MM-DD"`. */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Persian/Arabic digits → Latin, before validation. The body-level
 * NormalizeNumbersPipe runs *after* the controller's ValidationPipe, so a
 * pattern check would otherwise reject `۱۰:۳۰`.
 */
export const Digits = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? normalizeNumbers(value) : value,
  );

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsString() text?: string;
}

/**
 * A report period: a Jalali month (`y`, `m`) or, with `from`/`to`, any range
 * of civil dates. Without either it is the current Jalali month.
 */
export class PeriodQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1300) @Max(1500) y?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) m?: number;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
