import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { BOARD_END, BOARD_START } from '../utils/meeting-time.util';

export class CreateRecurringDto {
  @Type(() => Number)
  @IsInt()
  roomId: number;

  /** Jalali weekday: 0=شنبه … 6=جمعه. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

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

  @IsString()
  @IsNotEmpty()
  title: string;
}
