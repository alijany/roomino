import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { BOARD_END, BOARD_START } from '../utils/meeting-time.util';

export class CreateReservationDto {
  @Type(() => Number)
  @IsInt()
  roomId: number;

  /** Gregorian civil date in Tehran, "YYYY-MM-DD". */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاریخ نامعتبر است' })
  date: string;

  @Type(() => Number)
  @IsInt()
  @Min(BOARD_START)
  @Max(BOARD_END)
  startMinutes: number;

  @Type(() => Number)
  @IsInt()
  @Min(BOARD_START)
  @Max(BOARD_END)
  endMinutes: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
