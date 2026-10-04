import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PeriodQueryDto } from './common.dto';

export class PerformanceQueryDto extends PeriodQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() workplaceId?: number;
  @IsOptional() @Type(() => Number) @IsInt() jobGroupId?: number;
  @IsOptional() @IsString() text?: string;
}
