import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import { Role } from '../roles/roles.constants';
import { IntegrationSettingsService } from './integration-settings.service';
import {
  UpdateIntegrationSettingsDto,
  UpdateSiteSettingsDto,
} from './site-settings.dto';
import { SiteSettingsService } from './site-settings.service';

/** Site-wide settings — the admin and the CEO only. */
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CEO)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SiteSettingsController {
  constructor(
    private readonly settings: SiteSettingsService,
    private readonly integrations: IntegrationSettingsService,
  ) {}

  @Get()
  all() {
    return this.settings.all();
  }

  /** What is switched on, for the pages that show or hide fields by it. */
  @Get('features')
  @Roles(Role.ADMIN, Role.CEO, Role.FINANCE_MANAGER)
  async features() {
    return {
      supplementaryInsurance: await this.settings.get(
        'supplementaryInsuranceEnabled',
      ),
    };
  }

  /** Telegram bot and SMS credentials; secrets are only reported as set or not. */
  @Get('integrations')
  integrationSettings() {
    return this.integrations.view();
  }

  @Patch('integrations')
  updateIntegrations(@Body() dto: UpdateIntegrationSettingsDto) {
    return this.integrations.update(dto);
  }

  @Patch()
  update(@Body() dto: UpdateSiteSettingsDto) {
    return this.settings.update(dto);
  }
}
