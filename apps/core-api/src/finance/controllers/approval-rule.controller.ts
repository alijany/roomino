import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { StaffGuard } from '../../auth/guards/staff.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { ReplaceApprovalRulesDto } from '../dtos/finance-settings.dto';
import { ApprovalRuleService } from '../services/approval-rule.service';
import { readBigint } from '../utils/money.util';

/**
 * The approval matrix. Admin-only in both directions: knowing the thresholds
 * tells you exactly how to size a request to avoid review.
 *
 * PUT replaces the whole matrix — partial edits invite overlapping bands.
 */
@Controller('admin/finance/approval-rules')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ApprovalRuleController {
  constructor(private readonly rules: ApprovalRuleService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SENIOR_FINANCE, Role.PERSONNEL)
  async list() {
    const [items] = await this.rules.listAll();

    return {
      items: items.map((rule) => ({
        id: rule.id,
        minAmountRial: readBigint(rule.minAmountRial),
        maxAmountRial:
          rule.maxAmountRial == null ? null : readBigint(rule.maxAmountRial),
        categoryId: rule.category?.id ?? null,
        approverChain: rule.approverChain,
        priority: rule.priority,
        description: rule.description,
        active: rule.active,
      })),
    };
  }

  @Put()
  @Roles(Role.ADMIN, Role.SENIOR_FINANCE, Role.PERSONNEL)
  async replace(@Body(NormalizeNumbersPipe) dto: ReplaceApprovalRulesDto) {
    await this.rules.replaceAll(dto.rules);
    return this.list();
  }
}
