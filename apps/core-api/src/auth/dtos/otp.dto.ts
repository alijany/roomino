import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty()
  @IsPhoneNumber(null, {
    message: 'Please provide a valid phone number with country code.',
  }) // Use null for region code to allow any country code
  phoneNumber: string;
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsPhoneNumber(null, {
    message: 'Please provide a valid phone number with country code.',
  })
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'OTP must be exactly 4 digits.' })
  otp: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}
