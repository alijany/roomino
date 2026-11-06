import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { IntegrationSettingsService } from './integration-settings.service';
import { SiteSettingEntity } from './site-setting.entity';
import { SiteSettingsController } from './site-settings.controller';
import { SiteSettingsService } from './site-settings.service';

@Module({
  imports: [MikroOrmModule.forFeature([SiteSettingEntity])],
  providers: [SiteSettingsService, IntegrationSettingsService],
  controllers: [SiteSettingsController],
  exports: [SiteSettingsService, IntegrationSettingsService],
})
export class SettingsModule {}
