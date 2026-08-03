import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UsersGetDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  // NOTE: don't use @Type(() => Boolean) here — class-transformer's
  // automatic conversion is just `Boolean(value)`, so the query string
  // "false" (a non-empty string) converts to `true`. Parse the string
  // explicitly instead.
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isApproved?: boolean;
}
