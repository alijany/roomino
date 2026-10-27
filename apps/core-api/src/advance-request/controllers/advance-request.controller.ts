import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { UserEntity } from '../../user/user.entity';
import {
  CreateAdvanceRequestDto,
  DecisionDto,
  ListAdvanceRequestsDto,
  ReasonRequiredDto,
} from '../dtos/advance-request.dto';
import { AdvanceRequestService } from '../services/advance-request.service';
import { toApprovalStepView, toListItem } from '../utils/advance-view.util';

/**
 * Every endpoint here is open to any authenticated user; the service decides
 * what each caller may see and do based on their roles and their
 * relationship to the request.
 */
@Controller('advance-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdvanceRequestController {
  constructor(private readonly requests: AdvanceRequestService) {}

  @Get()
  async list(
    @Query() query: ListAdvanceRequestsDto,
    @CurrentUser() user: UserEntity,
  ) {
    const { items, meta } = await this.requests.listForUser(user, query);

    return { items: items.map(toListItem), meta };
  }

  @Get(':id')
  async detail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.getDetailOrFail(id, user);

    return {
      ...toListItem(request),
      lastDecisionComment: request.lastDecisionComment,
      approvalSteps: request.approvalSteps
        .getItems()
        .sort((a, b) => a.sequence - b.sequence)
        .map(toApprovalStepView),
      permissions: this.requests.permissionsFor(request, user),
    };
  }

  @Post()
  async create(
    @Body(NormalizeNumbersPipe) dto: CreateAdvanceRequestDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.createRequest(user, dto);
    return toListItem(request);
  }

  @Post(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecisionDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.approve(id, user, dto.comment);
    return toListItem(request);
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasonRequiredDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.reject(id, user, dto.comment);
    return toListItem(request);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.cancel(id, user);
    return toListItem(request);
  }
}
