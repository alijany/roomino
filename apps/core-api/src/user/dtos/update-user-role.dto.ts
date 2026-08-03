import { IsEnum, IsInt } from 'class-validator';
import { Role } from 'src/roles/roles.constants';

export class UpdateUserRoleDto {
  @IsInt()
  roleId: number;

  @IsEnum(Role)
  role: Role;
}
