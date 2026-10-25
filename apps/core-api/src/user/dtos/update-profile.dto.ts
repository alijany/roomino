import { normalizeNumbers } from 'src/libs/utils/pipe.normalizeNumbers';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** Persian/Arabic digits to Latin, trimmed — codes are compared as typed. */
const code = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? normalizeNumbers(value).trim() : value,
  );

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

/** An admin editing someone else: name, personnel code and job title. */
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

  @IsOptional()
  @code()
  @IsString()
  @IsNotEmpty({ message: 'کد پرسنلی را وارد کنید' })
  @MaxLength(50, { message: 'کد پرسنلی حداکثر ۵۰ نویسه است' })
  personnelCode?: string;

  /** An empty string clears it. */
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(100, { message: 'عنوان شغلی حداکثر ۱۰۰ نویسه است' })
  jobTitle?: string;
}
