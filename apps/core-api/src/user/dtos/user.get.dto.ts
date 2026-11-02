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
   * `probation` (on a trial period), `ended` (cooperation over),
   * `contract_ending` (the last month of the current contract) or
   * `no_contract` (none on record; both leave out people who have gone).
   */
  @IsOptional()
  @IsIn([
    'pending',
    'active',
    'probation',
    'ended',
    'contract_ending',
    'no_contract',
  ])
  status?:
    | 'pending'
    | 'active'
    | 'probation'
    | 'ended'
    | 'contract_ending'
    | 'no_contract';

  /** For pickers: leave out people whose cooperation is over. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activeOnly?: boolean;
}
