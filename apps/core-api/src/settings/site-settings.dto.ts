import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsBoolean({ message: 'مقدار نامعتبر است' })
  registrationClosed?: boolean;
}

export class TelegramSettingsDto {
  /** Left out or blank keeps the saved token. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  botToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  botUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiBase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  webhookUrl?: string;
}

export class SmsSettingsDto {
  @IsOptional()
  @IsIn(['asanak', 'smsir'], { message: 'سرویس پیامک نامعتبر است' })
  provider?: 'asanak' | 'smsir';

  /** Left out or blank keeps the saved key. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  smsirApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  smsirLine?: string;

  /** Numeric id of the one-time-code template in the sms.ir panel; blank sends the code as a plain message. */
  @IsOptional()
  @IsString()
  @Matches(/^\d*$/, { message: 'شناسهٔ قالب باید عدد باشد' })
  @MaxLength(15)
  smsirOtpTemplate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  smsirOtpParam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  /** Left out or blank keeps the saved password. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  source?: string;
}

export class UpdateIntegrationSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TelegramSettingsDto)
  telegram?: TelegramSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmsSettingsDto)
  sms?: SmsSettingsDto;
}
