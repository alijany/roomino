import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Role } from 'src/roles/roles.constants';

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
  limit?: number = 20;

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

  /** Name, phone, personnel code or job title. */
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /**
   * Where the person stands: `pending` (not approved yet), `active` (here now),
   * `probation` (on a trial period) or `ended` (cooperation over).
   */
  @IsOptional()
  @IsIn(['pending', 'active', 'probation', 'ended'])
  status?: 'pending' | 'active' | 'probation' | 'ended';
}
