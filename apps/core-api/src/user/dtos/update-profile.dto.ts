import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class UpdateProfileDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

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

/** An admin renaming someone else. */
export class UpdateUserNameDto {
  @trim()
  @IsString()
  @IsNotEmpty({ message: 'نام را وارد کنید' })
  @MaxLength(50, { message: 'نام حداکثر ۵۰ نویسه است' })
  firstName: string;

  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(50, { message: 'نام خانوادگی حداکثر ۵۰ نویسه است' })
  lastName?: string;
}
