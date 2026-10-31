import {
  Body,
  Controller,
  Delete,
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
  CreateSettlementDto,
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

    const settlements = await this.requests.settlementsFor(items);

    return {
      items: items.map((r) => toListItem(r, settlements.get(r.id))),
      meta,
    };
  }

  @Get(':id')
  async detail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.getDetailOrFail(id, user);

    const settlements = await this.requests.settlementsFor([request]);

    return {
      ...toListItem(request, settlements.get(request.id)),
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

  /** Record money paid back by hand (finance manager, admin). */
  @Post(':id/settlements')
  async settle(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: CreateSettlementDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.addSettlement(id, user, dto);
    const settlements = await this.requests.settlementsFor([request]);
    return toListItem(request, settlements.get(request.id));
  }

  @Delete(':id/settlements/:settlementId')
  async unsettle(
    @Param('id', ParseIntPipe) id: number,
    @Param('settlementId', ParseIntPipe) settlementId: number,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.removeSettlement(
      id,
      settlementId,
      user,
    );
    const settlements = await this.requests.settlementsFor([request]);
    return toListItem(request, settlements.get(request.id));
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
