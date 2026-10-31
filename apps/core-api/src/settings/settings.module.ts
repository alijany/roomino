import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { SiteSettingEntity } from './site-setting.entity';
import { SiteSettingsController } from './site-settings.controller';
import { SiteSettingsService } from './site-settings.service';

@Module({
  imports: [MikroOrmModule.forFeature([SiteSettingEntity])],
  providers: [SiteSettingsService],
  controllers: [SiteSettingsController],
  exports: [SiteSettingsService],
})
export class SettingsModule {}
