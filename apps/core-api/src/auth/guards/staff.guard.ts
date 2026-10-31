import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from 'src/roles/roles.constants';
import { UserEntity } from 'src/user/user.entity';

/**
 * The gate on everything under `/admin`: someone with only the plain `user`
 * role is turned away before any handler runs. It is a floor, not the rule —
 * each handler still names the roles that may use it with `@Roles`.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: UserEntity | undefined = context
      .switchToHttp()
      .getRequest().user;
    const staff = user?.roles?.exists((r) => r.role !== Role.USER);
    if (!staff) throw new ForbiddenException('دسترسی به این بخش مجاز نیست');
    return true;
  }
}
