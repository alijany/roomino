import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from 'src/roles/roles.constants';

export class InviteUserDto {
  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  jobTitle?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
