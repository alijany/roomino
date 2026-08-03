import { EntityManager } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { OnApplicationBootstrap } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import parsePhoneNumberFromString from 'libphonenumber-js';
import { Role } from 'src/roles/roles.constants';
import { InvitationStatus, RolesEntity } from 'src/roles/roles.entity';
import { UserEntity } from './user.entity';

@Injectable()
export class AdminUserBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminUserBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly em: EntityManager,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const rawPhone = this.configService.get<string>('ADMIN_PHONE');

    // Opt-in behavior: if ADMIN_PHONE is not set, do nothing.
    if (!rawPhone) {
      return;
    }

    const parsed = parsePhoneNumberFromString(rawPhone, 'IR');
    const normalizedPhone = parsed?.number;

    if (!normalizedPhone) {
      this.logger.warn(
        'ADMIN_PHONE is set but invalid; skipping admin bootstrap.',
      );
      return;
    }

    try {
      // use a forked EM to avoid touching the global identity map during bootstrap
      const fork = this.em.fork();

      let user = await fork.findOne(
        UserEntity,
        { phone: normalizedPhone },
        { populate: ['roles'] as never },
      );

      if (!user) {
        user = fork.create(UserEntity, { phone: normalizedPhone });
        await fork.persistAndFlush(user);
      }

      if (!user.isApproved) {
        user.isApproved = true;
        await fork.persistAndFlush(user);
      }

      const existingRoles = user.roles?.getItems?.() ?? [];
      const hasAdminRole = existingRoles.some((r) => r.role === Role.ADMIN);

      if (!hasAdminRole) {
        const role = fork.create(RolesEntity, {
          user,
          role: Role.ADMIN,
          invitationStatus: InvitationStatus.ACCEPTED,
          description: 'bootstrapped admin role',
        });
        await fork.persistAndFlush(role);
      }

      this.logger.log(
        `Admin bootstrap ensured for phone ${this.maskPhone(normalizedPhone)}.`,
      );
    } catch (err: any) {
      this.logger.warn(
        'Warning: admin bootstrap failed: ' + (err?.message || err),
      );
    }
  }

  private maskPhone(phone: string): string {
    const last4 = phone.slice(-4);
    return `***${last4}`;
  }
}
