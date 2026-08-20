import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { UploadAttachmentDto } from '../dtos/finance-settings.dto';
import {
  ApprovalPreviewDto,
  CreatePaymentRequestDto,
  DecisionDto,
  ListPaymentRequestsDto,
  ReasonRequiredDto,
  RecordPaymentDto,
  RequestScope,
  UpdatePaymentRequestDto,
} from '../dtos/payment-request.dto';
import { AttachmentKind, PaymentRequestStatus } from '../finance.constants';
import { ApprovalRuleService } from '../services/approval-rule.service';
import { FinanceActivityService } from '../services/finance-activity.service';
import { FinanceAttachmentService } from '../services/finance-attachment.service';
import { PaymentRequestService } from '../services/payment-request.service';
import {
  toActivityView,
  toApprovalStepView,
  toAttachmentView,
  toListItem,
  toPaymentView,
} from '../utils/finance-view.util';
import { toRial } from '../utils/money.util';

/**
 * Every endpoint here is open to any authenticated user; the service decides
 * what each caller may see and do based on their roles and their relationship
 * to the request. Role decorators are used only where a whole endpoint belongs
 * to one role.
 */
@Controller('finance/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PaymentRequestController {
  constructor(
    private readonly requests: PaymentRequestService,
    private readonly attachments: FinanceAttachmentService,
    private readonly activity: FinanceActivityService,
    private readonly approvalRules: ApprovalRuleService,
  ) {}

  @Get()
  async list(
    @Query() query: ListPaymentRequestsDto,
    @CurrentUser() user: UserEntity,
  ) {
    const { items, meta } = await this.requests.listForUser(user, query);

    return { items: items.map(toListItem), meta };
  }

  /**
   * Which approvers a given amount would need — shown in the request form
   * before the user invests effort in filling it in.
   */
  @Post('approval-preview')
  async approvalPreview(
    @Body(NormalizeNumbersPipe) dto: ApprovalPreviewDto,
    @CurrentUser() user: UserEntity,
  ) {
    const amountRial = toRial(dto.amountMinor, dto.currency);
    const resolved = await this.approvalRules.resolveChain(
      amountRial,
      dto.categoryId,
    );

    // Mirrors the overrides in submit(), so the preview never promises a
    // smoother path than the request will actually take.
    const chain = this.requests.previewMinimumApproval(
      resolved,
      dto.currency,
      this.requests.hasRole(user, Role.FINANCE),
    );

    return { amountRial, chain, requiresApproval: chain.length > 0 };
  }

  @Get(':id')
  async detail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.getDetailOrFail(id, user);
    const payments = await this.requests.listPayments(id);

    const attachments = await Promise.all(
      request.attachments
        .getItems()
        .map(async (attachment) =>
          toAttachmentView(
            attachment,
            await this.attachments.signedUrl(attachment),
          ),
        ),
    );

    return {
      ...toListItem(request),
      description: request.description,
      costCenter: request.costCenter,
      lastDecisionComment: request.lastDecisionComment,
      payeeAccountType: request.payeeAccountType,
      payeeAccountHolder: request.payeeAccountHolder,
      payeeSheba: request.payeeSheba,
      payeeCardNumber: request.payeeCardNumber,
      payeeAccountDetails: request.payeeAccountDetails,
      destinationUrl: request.destinationUrl,
      destinationAccount: request.destinationAccount,
      // Presence only — the value itself never rides along with the detail
      // payload; it comes from the reveal endpoint below.
      hasDestinationCredential: Boolean(request.destinationCredentialEnc),
      approvalSteps: request.approvalSteps
        .getItems()
        .sort((a, b) => a.sequence - b.sequence)
        .map(toApprovalStepView),
      attachments,
      payments: payments.map(toPaymentView),
      permissions: this.requests.permissionsFor(request, user),
    };
  }

  /**
   * Reveals the stored login for an online top-up, to the requester who
   * supplied it or to Finance who has to use it.
   *
   * A separate endpoint rather than a field on the detail payload, so the
   * secret is fetched deliberately and does not sit in every cached response
   * of a page four other roles can open.
   */
  @Get(':id/credential')
  async credential(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    return { credential: await this.requests.revealCredential(id, user) };
  }

  @Get(':id/activity')
  async activityLog(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    // Access check first — the timeline leaks amounts and reasons.
    await this.requests.getDetailOrFail(id, user);
    const [entries] = await this.activity.listForRequest(id);

    return { items: entries.map(toActivityView) };
  }

  @Post()
  async create(
    @Body(NormalizeNumbersPipe) dto: CreatePaymentRequestDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.createRequest(user, dto);
    return toListItem(request);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdatePaymentRequestDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.updateRequest(id, user, dto);
    return toListItem(request);
  }

  @Post(':id/submit')
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.submit(id, user);
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

  @Post(':id/request-info')
  async requestInfo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasonRequiredDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.requestInfo(id, user, dto.comment);
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

  @Post(':id/pay')
  @Roles(Role.FINANCE)
  async pay(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: RecordPaymentDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.recordPayment(id, user, dto);
    return toListItem(request);
  }

  @Post(':id/fail')
  @Roles(Role.FINANCE)
  async fail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReasonRequiredDto,
    @CurrentUser() user: UserEntity,
  ) {
    const request = await this.requests.failPayment(id, user, dto.comment);
    return toListItem(request);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async addAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() user: UserEntity,
  ) {
    await this.requests.assertCanAttach(id, user);

    const attachment = await this.attachments.upload(
      id,
      file,
      user.id,
      dto.kind ?? AttachmentKind.INVOICE,
    );

    return toAttachmentView(
      attachment,
      await this.attachments.signedUrl(attachment),
    );
  }

  @Delete('attachments/:attachmentId')
  async removeAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser() user: UserEntity,
  ) {
    const attachment = await this.attachments.getOrFail(attachmentId);
    await this.requests.assertCanAttach(attachment.request.id, user);
    await this.attachments.removeAttachment(attachmentId);

    return { success: true };
  }

  /**
   * Counts behind the sidebar badges: what is waiting on me, what is waiting to
   * be paid, and how much of my own is still in flight. One small query each —
   * this is called on every dashboard page load, so it must stay cheap.
   */
  @Get('meta/badges')
  async badges(@CurrentUser() user: UserEntity) {
    const countOnly = { page: 0, limit: 1 };

    const [awaitingMe, payable, mineOpen] = await Promise.all([
      this.requests.listForUser(user, {
        ...countOnly,
        scope: RequestScope.AWAITING_ME,
      }),
      this.requests.hasRole(user, Role.FINANCE)
        ? this.requests.listForUser(user, {
            ...countOnly,
            scope: RequestScope.PAYABLE,
          })
        : Promise.resolve({ total: 0 } as { total: number }),
      this.requests.listForUser(user, {
        ...countOnly,
        scope: RequestScope.MINE,
        status: [
          PaymentRequestStatus.PENDING_APPROVAL,
          PaymentRequestStatus.NEEDS_INFO,
          PaymentRequestStatus.APPROVED,
        ],
      }),
    ]);

    return {
      awaitingMe: awaitingMe.total,
      payable: payable.total,
      mineOpen: mineOpen.total,
    };
  }
}
