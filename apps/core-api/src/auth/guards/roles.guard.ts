import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserEntity } from 'src/user/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, expandRoles } from 'src/roles/roles.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // A `@Roles` on the class counts too; the handler's own overrides it.
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // If no roles are required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user: UserEntity = request.user; // Assuming user is attached to request by JWT guard

    if (!user || !user.roles) return false;
    const held = expandRoles(user.roles.getItems().map((r) => r.role));
    return requiredRoles.some((role) => held.includes(role));
  }
}
