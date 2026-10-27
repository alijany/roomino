import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AdvanceRequestStatus } from '../advance-request.constants';

export class CreateAdvanceRequestDto {
  @Type(() => Number)
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد' })
  @Min(1, { message: 'مبلغ باید بزرگ‌تر از صفر باشد' })
  amountRial: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Which slice of the list the caller wants. */
export enum AdvanceRequestScope {
  /** Requests the caller raised. */
  MINE = 'mine',
  /** Requests waiting on the caller's approval role, right now. */
  AWAITING_ME = 'awaiting_me',
  /**
   * The management review queue: everything the caller may act on as a
   * manager/finance-manager (current and past), excluding their own
   * requests. Unlike AWAITING_ME this isn't pinned to a single status, so it
   * can be combined with the status filter to show decision history too.
   */
  REVIEW = 'review',
}

export class ListAdvanceRequestsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;

  @IsOptional()
  @IsEnum(AdvanceRequestScope)
  scope?: AdvanceRequestScope;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value,
  )
  @IsArray()
  @IsEnum(AdvanceRequestStatus, { each: true })
  status?: AdvanceRequestStatus[];

  /** Filters by request creation date, inclusive. */
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}

export class DecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ReasonRequiredDto {
  @IsString()
  @IsNotEmpty({ message: 'نوشتن دلیل الزامی است' })
  @MaxLength(1000)
  comment: string;
}
