import { raw } from '@mikro-orm/core';
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { nameWords } from '../libs/utils/name-search.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { StaffGuard } from 'src/auth/guards/staff.guard';
import { ContractService } from 'src/contract/contract.service';
import { Role } from 'src/roles/roles.constants';
import { S3StorageService } from 'src/storage/s3-storage.service';
import { v4 as uuidv4 } from 'uuid';
import { AddUserRoleDto } from './dtos/add-user-role.dto';
import { InviteUserDto } from './dtos/invitation.dto';
import { UpdateProfileDto, UpdateUserNameDto } from './dtos/update-profile.dto';
import { UsersGetDto } from './dtos/user.get.dto';
import { UserEntity } from './user.entity';
import { usersWorkbook } from './user-export.util';
import { UserService } from './user.service';

/** People whose cooperation is over go to the end of the list; newest first within each group. */
function listOrder(today: string) {
  return [
    {
      [raw('(cooperation_ended or (end_date is not null and end_date < ?))', [
        today,
      ])]: 'asc',
    },
    { created_at: 'DESC' },
  ] as never;
}

/** A user as the users page shows them: HR facts and roles with their invitation state. */
function toUserListItem(user: UserEntity) {
  return {
    id: user.id,
    name: user.name,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    displayName: user.displayName ?? null,
    phone: user.phone,
    nationalId: user.nationalId ?? null,
    personnelCode: user.personnelCode ?? null,
    jobTitle: user.jobTitle ?? null,
    hireDate: user.hireDate ?? null,
    endDate: user.endDate ?? null,
    probationEndDate: user.probationEndDate ?? null,
    /** Has started the Telegram bot, so notifications reach them there. */
    telegramConnected: !!user.chatId,
    insuranceNumber: user.insuranceNumber ?? null,
    birthDate: user.birthDate ?? null,
    fatherName: user.fatherName ?? null,
    teamId: user.team?.id ?? null,
    insuranceStartDate: user.insuranceStartDate ?? null,
    bankCardNumber: user.bankCardNumber ?? null,
    bankAccountNumber: user.bankAccountNumber ?? null,
    address: user.address ?? null,
    sheba: user.sheba ?? null,
    email: user.email ?? null,
    married: user.married,
    childrenCount: user.childrenCount,
    insured: user.insured,
    insuranceType: user.insuranceType,
    taxExempt: user.taxExempt,
    supplementaryInsurance: user.supplementaryInsurance,
    supplementaryInsuranceStart: user.supplementaryInsuranceStart ?? null,
    supplementaryInsuranceAmount:
      user.supplementaryInsuranceAmount == null
        ? null
        : Number(user.supplementaryInsuranceAmount),
    cooperationEnded: user.cooperationEnded,
    introduce: user.introduce,
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

@Controller('admin/users')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class AdminUserController {
  constructor(
    private readonly userService: UserService,
    private readonly s3StorageService: S3StorageService,
    private readonly contracts: ContractService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  async inviteUser(@Body() inviteDto: InviteUserDto) {
    return this.userService.inviteUserByRole(inviteDto);
  }

  /** The list's filters as one query, shared by the list and its Excel export. */
  private todayTehran() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tehran' });
  }

  private async usersWhere(filters: UsersGetDto) {
    const { text, role, status, activeOnly, teamId, ...rest } = filters;
    // Paging is not a column to match on.
    delete rest.page;
    delete rest.limit;
    const today = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Tehran',
    });
    // Here now: approved, and cooperation not over.
    const here = {
      isApproved: true,
      cooperationEnded: false,
      $or: [{ endDate: null }, { endDate: { $gte: today } }],
    };
    // By contract: only the people still here, narrowed to the ones in question.
    const byContract =
      status === 'contract_ending' || status === 'no_contract'
        ? {
            cooperationEnded: false,
            $or: [{ endDate: null }, { endDate: { $gte: today } }],
            ...(await this.contracts.userFilter(
              status === 'contract_ending' ? 'ending' : 'none',
            )),
          }
        : null;
    const byStatus =
      byContract ??
      (status === 'pending'
        ? { isApproved: false }
        : status === 'active'
        ? here
        : status === 'probation'
        ? { ...here, probationEndDate: { $gte: today } }
        : status === 'ended'
        ? { $or: [{ cooperationEnded: true }, { endDate: { $lt: today } }] }
        : activeOnly
        ? {
            cooperationEnded: false,
            $or: [{ endDate: null }, { endDate: { $gte: today } }],
          }
        : {});
    const like = text?.trim() ? { $ilike: `%${text.trim()}%` } : null;

    return {
      $and: [
        rest,
        byStatus,
        role ? { roles: { role } } : {},
        teamId
          ? {
              team: {
                $in: await this.userService.teamWithDescendants(teamId),
              },
            }
          : {},
        like
          ? {
              $or: [
                { $and: nameWords(text as string) },
                { displayName: like },
                { firstName: like },
                { lastName: like },
                { phone: like },
                { personnelCode: like },
                { jobTitle: like },
              ],
            }
          : {},
      ],
    } as never;
  }

  /** The list as an Excel file: the same filters, every page. */
  @Get('export')
  @Roles(Role.ADMIN, Role.HR, Role.SENIOR_FINANCE)
  async exportUsers(@Query() filters: UsersGetDto, @Res() res: Response) {
    const [users] = await this.userService.findAll(
      await this.usersWhere(filters),
      {
        orderBy: listOrder(this.todayTehran()),
        populate: ['roles', 'team'] as never,
      },
    );
    const today = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Tehran',
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');
    res.send(await usersWorkbook(users, today));
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR, Role.SENIOR_FINANCE)
  async getAllUsers(@Query() filters?: UsersGetDto): Promise<{
    items: any[];
    meta: { page: number; limit: number; total: number; pageCount: number };
  }> {
    const { page = 0, limit = 20 } = filters;
    const [users, total] = await this.userService.findAll(
      await this.usersWhere(filters),
      {
        orderBy: listOrder(this.todayTehran()),
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
  @Roles(Role.ADMIN, Role.HR, Role.SENIOR_FINANCE)
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

  /**
   * An admin editing a user: name, personnel code and job title. Declared after the `profile` routes: Express
   * matches in order, and `:id` would otherwise catch `PATCH /users/profile`.
   */
  /** One user, for the edit page. Declared after the `profile` routes, like `PATCH :id`. */
  @Get(':id')
  @Roles(Role.ADMIN, Role.HR, Role.SENIOR_FINANCE)
  async getUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findOne(
      { id },
      { populate: ['roles'] as never },
    );
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return toUserListItem(user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PERSONNEL, Role.SENIOR_FINANCE)
  async updateUserName(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserNameDto,
  ) {
    await this.userService.updateProfile(id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName,
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
      birthDate: dto.birthDate,
      fatherName: dto.fatherName,
      insuranceStartDate: dto.insuranceStartDate,
      bankCardNumber: dto.bankCardNumber,
      bankAccountNumber: dto.bankAccountNumber,
      address: dto.address,
      sheba: dto.sheba,
      email: dto.email,
      married: dto.married,
      childrenCount: dto.childrenCount,
      insured: dto.insured,
      insuranceType: dto.insuranceType,
      taxExempt: dto.taxExempt,
      supplementaryInsurance: dto.supplementaryInsurance,
      supplementaryInsuranceStart: dto.supplementaryInsuranceStart,
      supplementaryInsuranceAmount: dto.supplementaryInsuranceAmount,
      cooperationEnded: dto.cooperationEnded,
      introduce: dto.introduce,
      agreementType: dto.agreementType,
      salaryMode: dto.salaryMode,
    });
    return {
      id: user.id,
      name: user.name,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      displayName: user.displayName ?? null,
      phone: user.phone,
      nationalId: user.nationalId ?? null,
      personnelCode: user.personnelCode ?? null,
      jobTitle: user.jobTitle ?? null,
      hireDate: user.hireDate ?? null,
      endDate: user.endDate ?? null,
      probationEndDate: user.probationEndDate ?? null,
      insuranceNumber: user.insuranceNumber ?? null,
      birthDate: user.birthDate ?? null,
      fatherName: user.fatherName ?? null,
      teamId: user.team?.id ?? null,
      insuranceStartDate: user.insuranceStartDate ?? null,
      bankCardNumber: user.bankCardNumber ?? null,
      bankAccountNumber: user.bankAccountNumber ?? null,
      address: user.address ?? null,
      sheba: user.sheba ?? null,
      email: user.email ?? null,
      married: user.married,
      childrenCount: user.childrenCount,
      insured: user.insured,
      insuranceType: user.insuranceType,
      taxExempt: user.taxExempt,
      supplementaryInsurance: user.supplementaryInsurance,
      supplementaryInsuranceStart: user.supplementaryInsuranceStart ?? null,
      supplementaryInsuranceAmount:
        user.supplementaryInsuranceAmount == null
          ? null
          : Number(user.supplementaryInsuranceAmount),
      cooperationEnded: user.cooperationEnded,
      introduce: user.introduce,
      agreementType: user.agreementType,
      salaryMode: user.salaryMode,
    };
  }
}

/** What a signed-in person does with their own account. */
@Controller('users')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly s3StorageService: S3StorageService,
  ) {}

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
}
