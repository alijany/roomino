import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BOARD_END, BOARD_START } from '../utils/meeting-time.util';

export class CreateRecurringDto {
  @Type(() => Number)
  @IsInt()
  roomId: number;

  /** Jalali weekdays: 0=شنبه … 6=جمعه. One lock row is created per weekday. */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];

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
