import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsBoolean({ message: 'مقدار نامعتبر است' })
  registrationClosed?: boolean;
}
