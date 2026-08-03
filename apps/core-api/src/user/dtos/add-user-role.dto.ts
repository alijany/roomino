import { IsEnum } from 'class-validator';
import { Role } from 'src/roles/roles.constants';

export class AddUserRoleDto {
  @IsEnum(Role)
  role: Role;
}
