import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs/mikro-orm.common';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import parsePhoneNumberFromString from 'libphonenumber-js';
import { BaseRepositoryService } from 'src/libs/orm/orm.repository.service.base';
import { Role } from 'src/roles/roles.constants';
import { InvitationStatus, RolesEntity } from 'src/roles/roles.entity';
import { RolesService } from 'src/roles/roles.service';
import { InviteUserDto } from './dtos/invitation.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserEntity } from './user.entity';

@Injectable()
export class UserService extends BaseRepositoryService<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    protected repository: EntityRepository<UserEntity>,
    private rolesService: RolesService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(repository);
  }

  async assignRole(userId: number, roleId: number): Promise<UserEntity> {
    const user = await this.findOne({ id: userId });
    const role = await this.rolesService.findOne({ id: roleId });

    if (!user || !role) {
      throw new Error('User or Role not found');
    }

    user.roles.add(role);
    await this.persistAndFlush(user);
    return user;
  }

  async approveUser(userId: number): Promise<UserEntity> {
    const user = await this.findOne({ id: userId });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    user.isApproved = true;
    await this.persistAndFlush(user);
    return user;
  }

  async updateUserRole(
    userId: number,
    roleId: number,
    role: Role,
  ): Promise<RolesEntity> {
    const roleEntity = await this.rolesService.findOne({
      id: roleId,
      user: userId,
    });

    if (!roleEntity) {
      throw new NotFoundException('نقش یافت نشد');
    }

    roleEntity.role = role;
    await this.rolesService.persistAndFlush(roleEntity);
    return roleEntity;
  }

  async updateUserInvitationStatus(roleId: number, status: InvitationStatus) {
    const role = await this.rolesService.findOne({
      id: roleId,
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    role.invitationStatus = status;
    await this.rolesService.persistAndFlush(role);

    return { success: true };
  }

  async inviteUserByRole(dto: InviteUserDto): Promise<RolesEntity> {
    const validatedPhone = parsePhoneNumberFromString(dto.phone, 'IR');
    // Find the user by phone number
    let user = await this.findOne(
      {
        phone: validatedPhone?.number,
      },
      {
        populate: ['roles'] as never,
      },
    );

    const finalRole = dto.role ?? Role.USER;

    // If user exists and organizationId is provided, check if already member
    if (user) {
      const existingRole = user.roles
        .getItems()
        .find((role) => role.role === finalRole);
      if (existingRole) {
        throw new ConflictException(
          `کاربر با این نقش در این سازمان قبلا ایجاد شده`,
        );
      }
    }

    // If user doesn't exist, create a new one
    if (!user) {
      user = await this.create({
        phone: validatedPhone.number,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
    }

    const newRole = await this.rolesService.create({
      user,
      role: finalRole,
      invitationStatus: InvitationStatus.PENDING,
    });

    return newRole;
  }

  async acceptInvitation(userId: number, roleId: number) {
    const role = await this.rolesService.findOne(
      { id: roleId, user: userId },
      { populate: ['user'] as never },
    );

    if (!role) {
      throw new NotFoundException('دعوت‌نامه یافت نشد');
    }

    if (role.invitationStatus !== InvitationStatus.PENDING) {
      throw new ConflictException('این دعوت‌نامه قبلا پردازش شده است');
    }

    role.invitationStatus = InvitationStatus.ACCEPTED;
    await this.rolesService.persistAndFlush(role);

    return { success: true, role };
  }

  async rejectInvitation(userId: number, roleId: number) {
    const role = await this.rolesService.findOne(
      { id: roleId, user: userId },
      { populate: ['user'] as never },
    );

    if (!role) {
      throw new NotFoundException('دعوت‌نامه یافت نشد');
    }

    if (role.invitationStatus !== InvitationStatus.PENDING) {
      throw new ConflictException('این دعوت‌نامه قبلا پردازش شده است');
    }

    // Remove the invitation role
    await this.rolesService.remove(role);

    // Check if user has any other roles
    const user = await this.findOne(
      { id: userId },
      { populate: ['roles'] as never },
    );

    if (!user.roles || user.roles.length === 0) {
      // Create a USER role if no roles exist
      await this.rolesService.create({
        user,
        role: Role.USER,
        invitationStatus: InvitationStatus.ACCEPTED,
      });
    }

    return { success: true };
  }

  async updateProfile(
    userId: number,
    updateData: UpdateProfileDto,
  ): Promise<UserEntity> {
    const user = await this.findOne({ id: userId });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    // Update the fields
    if (updateData.firstName !== undefined) {
      user.firstName = updateData.firstName;
    }
    if (updateData.lastName !== undefined) {
      user.lastName = updateData.lastName;
    }

    await this.persistAndFlush(user);
    return user;
  }

  async updateProfilePicture(
    userId: number,
    profilePictureUrl: string,
  ): Promise<UserEntity> {
    const user = await this.findOne({ id: userId });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    user.profilePicture = profilePictureUrl;
    await this.persistAndFlush(user);
    return user;
  }

  async updatePhoneNumber(
    userId: number,
    newPhone: string,
  ): Promise<UserEntity> {
    const validatedPhone = parsePhoneNumberFromString(newPhone, 'IR');

    if (!validatedPhone?.isValid()) {
      throw new BadRequestException('فرمت شماره تلفن نامعتبر است.');
    }

    // Check if phone number is already in use by another user
    const existingUser = await this.findOne({
      phone: validatedPhone.number,
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('این شماره تلفن قبلا استفاده شده است');
    }

    const user = await this.findOne({ id: userId });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    user.phone = validatedPhone.number;
    await this.persistAndFlush(user);
    return user;
  }
}
