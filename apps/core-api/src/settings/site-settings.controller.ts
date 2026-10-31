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
import { Role } from '../roles/roles.constants';
import { UpdateSiteSettingsDto } from './site-settings.dto';
import { SiteSettingsService } from './site-settings.service';

/** Site-wide settings — the admin and the CEO only. */
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CEO)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SiteSettingsController {
  constructor(private readonly settings: SiteSettingsService) {}

  @Get()
  all() {
    return this.settings.all();
  }

  @Patch()
  update(@Body() dto: UpdateSiteSettingsDto) {
    return this.settings.update(dto);
  }
}
