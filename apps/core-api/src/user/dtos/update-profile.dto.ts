import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class UpdatePhoneDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  otp: string;
}
