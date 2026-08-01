import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  /** Gregorian civil date in Tehran, "YYYY-MM-DD". */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاریخ نامعتبر است' })
  date: string;

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
}
