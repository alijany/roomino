import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { ListRequestsDto, RejectRequestDto } from '../dtos/request.dto';
import { RequestService } from '../services/request.service';
import { toRequestView } from '../utils/attendance-view.util';

/** Every request, for admin and HR to review. */
@Controller('attendance/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RequestController {
  constructor(private readonly requests: RequestService) {}

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  async list(@Query() query: ListRequestsDto) {
    const { items, counts, meta } = await this.requests.list(query);
    return { items: items.map(toRequestView), counts, meta };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR)
  async detail(@Param('id', ParseIntPipe) id: number) {
    return toRequestView(await this.requests.getOrFail(id));
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.HR)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    return toRequestView(await this.requests.approve(id, user));
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.HR)
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: RejectRequestDto,
  ) {
    return toRequestView(await this.requests.reject(id, user, dto.note));
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.requests.remove(id);
    return { success: true };
  }
}
