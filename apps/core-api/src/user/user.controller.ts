import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/roles/roles.constants';
import { S3StorageService } from 'src/storage/s3-storage.service';
import { v4 as uuidv4 } from 'uuid';
import { AddUserRoleDto } from './dtos/add-user-role.dto';
import { InviteUserDto } from './dtos/invitation.dto';
import { UpdateProfileDto, UpdateUserNameDto } from './dtos/update-profile.dto';
import { UsersGetDto } from './dtos/user.get.dto';
import { UserEntity } from './user.entity';
import { UserService } from './user.service';

/** A user as the users page shows them: HR facts and roles with their invitation state. */
function toUserListItem(user: UserEntity) {
  return {
    id: user.id,
    name: user.name,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phone: user.phone,
    nationalId: user.nationalId ?? null,
    personnelCode: user.personnelCode ?? null,
    jobTitle: user.jobTitle ?? null,
    hireDate: user.hireDate ?? null,
    endDate: user.endDate ?? null,
    probationEndDate: user.probationEndDate ?? null,
    insuranceNumber: user.insuranceNumber ?? null,
    sheba: user.sheba ?? null,
    email: user.email ?? null,
    married: user.married,
    childrenCount: user.childrenCount,
    insured: user.insured,
    insuranceType: user.insuranceType,
    taxExempt: user.taxExempt,
    agreementType: user.agreementType,
    salaryMode: user.salaryMode,
    profilePicture: user.profilePicture ?? null,
    isApproved: user.isApproved,
    roles: user.roles
      ? user.roles.getItems().map((role) => ({
          id: role.id,
          role: role.role,
          invitationStatus: role.invitationStatus,
        }))
      : [],
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  async inviteUser(@Body() inviteDto: InviteUserDto) {
    return this.userService.inviteUserByRole(inviteDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  async getAllUsers(@Query() filters?: UsersGetDto): Promise<{
    items: any[];
    meta: { page: number; limit: number; total: number; pageCount: number };
  }> {
    const { page = 0, limit = 20, text, role, status, ...rest } = filters;
    const today = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Tehran',
    });
    // Here now: approved, and cooperation not over.
    const here = {
      isApproved: true,
      $or: [{ endDate: null }, { endDate: { $gte: today } }],
    };
    const byStatus =
      status === 'pending'
        ? { isApproved: false }
        : status === 'active'
        ? here
        : status === 'probation'
        ? { ...here, probationEndDate: { $gte: today } }
        : status === 'ended'
        ? { endDate: { $lt: today } }
        : {};
    const like = text?.trim() ? { $ilike: `%${text.trim()}%` } : null;

    const [users, total] = await this.userService.findAll(
      {
        $and: [
          rest,
          byStatus,
          role ? { roles: { role } } : {},
          like
            ? {
                $or: [
                  { firstName: like },
                  { lastName: like },
                  { phone: like },
                  { personnelCode: like },
                  { jobTitle: like },
                ],
              }
            : {},
        ],
      } as never,
      {
        orderBy: { created_at: 'DESC' },
        limit,
        offset: page * limit,
        populate: ['roles'] as never,
      },
    );

    const items = users.map(toUserListItem);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.HR)
  async approveUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.approveUser(id);
  }

  @Post(':id/roles')
  @Roles(Role.ADMIN)
  async addUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddUserRoleDto,
  ) {
    return this.userService.addUserRole(id, dto.role);
  }

  @Delete(':id/roles/:roleId')
  @Roles(Role.ADMIN)
  async removeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.userService.removeUserRole(id, roleId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async removeUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserEntity,
  ) {
    if (currentUser.id === id) {
      throw new BadRequestException('نمی‌توانید حساب کاربری خود را حذف کنید');
    }
    await this.userService.removeUser(id);
    return { success: true };
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.userService.updateProfile(
      user.id,
      updateProfileDto,
    );
    return updatedUser;
  }

  @Post('profile/picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @CurrentUser() user: UserEntity,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایلی آپلود نشده است');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'فرمت فایل نامعتبر است. فقط تصاویر مجاز هستند',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('حجم فایل بیش از 5 مگابایت است');
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const fileUrl = await this.s3StorageService.uploadBuffer(
      file.buffer,
      filename,
      file.mimetype,
      'profile-pictures',
    );

    const { user: updatedUser, previous } =
      await this.userService.updateProfilePicture(user.id, fileUrl);

    // The old picture is no longer referenced anywhere; don't leave it in the
    // bucket. Best effort — a failed delete mustn't fail the upload.
    const previousKey = previous && this.s3StorageService.keyOf(previous);
    if (previousKey?.startsWith('profile-pictures/')) {
      await this.s3StorageService.deleteObject(previousKey).catch(() => {
        /* logged by the storage service */
      });
    }

    return { profilePicture: updatedUser.profilePicture };
  }

  /**
   * An admin editing a user: name, personnel code and job title. Declared after the `profile` routes: Express
   * matches in order, and `:id` would otherwise catch `PATCH /users/profile`.
   */
  /** One user, for the edit page. Declared after the `profile` routes, like `PATCH :id`. */
  @Get(':id')
  @Roles(Role.ADMIN, Role.HR)
  async getUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findOne(
      { id },
      { populate: ['roles'] as never },
    );
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return toUserListItem(user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async updateUserName(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserNameDto,
  ) {
    await this.userService.updateProfile(id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    if (dto.phone !== undefined) {
      await this.userService.updatePhoneNumber(id, dto.phone);
    }
    const user = await this.userService.updateStaffDetails(id, {
      personnelCode: dto.personnelCode,
      jobTitle: dto.jobTitle,
      nationalId: dto.nationalId,
      hireDate: dto.hireDate,
      endDate: dto.endDate,
      probationEndDate: dto.probationEndDate,
      insuranceNumber: dto.insuranceNumber,
      sheba: dto.sheba,
      email: dto.email,
      married: dto.married,
      childrenCount: dto.childrenCount,
      insured: dto.insured,
      insuranceType: dto.insuranceType,
      taxExempt: dto.taxExempt,
      agreementType: dto.agreementType,
      salaryMode: dto.salaryMode,
    });
    return {
      id: user.id,
      name: user.name,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phone: user.phone,
      nationalId: user.nationalId ?? null,
      personnelCode: user.personnelCode ?? null,
      jobTitle: user.jobTitle ?? null,
      hireDate: user.hireDate ?? null,
      endDate: user.endDate ?? null,
      probationEndDate: user.probationEndDate ?? null,
      insuranceNumber: user.insuranceNumber ?? null,
      sheba: user.sheba ?? null,
      email: user.email ?? null,
      married: user.married,
      childrenCount: user.childrenCount,
      insured: user.insured,
      insuranceType: user.insuranceType,
      taxExempt: user.taxExempt,
      agreementType: user.agreementType,
      salaryMode: user.salaryMode,
    };
  }
}
