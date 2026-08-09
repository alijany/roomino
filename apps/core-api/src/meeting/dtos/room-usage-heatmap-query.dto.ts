import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ReportGroupBy } from '../meeting.types';

export class RoomUsageHeatmapQueryDto {
  /** Gregorian civil date in Tehran, "YYYY-MM-DD" — inclusive start of range. */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاریخ شروع نامعتبر است' })
  from: string;

  /** Gregorian civil date in Tehran, "YYYY-MM-DD" — inclusive end of range. */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاریخ پایان نامعتبر است' })
  to: string;

  /** Optional comma-separated room ids; omitted = all active rooms. */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((n) => Number.isInteger(n))
      : value,
  )
  @IsArray()
  @IsInt({ each: true })
  roomIds?: number[];

  @IsOptional()
  @IsIn(['hour'])
  groupBy?: ReportGroupBy;
}
