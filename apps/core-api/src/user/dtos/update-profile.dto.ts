import { normalizeNumbers } from 'src/libs/utils/pipe.normalizeNumbers';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

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

/** Civil date, `YYYY-MM-DD`. */
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** An admin editing someone else: name, personnel code, job title and the identity facts. */
export class UpdateUserNameDto {
  @trim()
  @IsString()
  @IsNotEmpty({ message: 'نام را وارد کنید' })
  @MaxLength(50, { message: 'نام حداکثر ۵۰ نویسه است' })
  firstName: string;

  @trim()
  @IsString()
  @IsNotEmpty({ message: 'نام خانوادگی را وارد کنید' })
  @MaxLength(50, { message: 'نام خانوادگی حداکثر ۵۰ نویسه است' })
  lastName: string;

  /** The mobile number; changing it changes the number the person signs in with. */
  @IsOptional()
  @code()
  @IsString()
  @IsNotEmpty({ message: 'شماره موبایل را وارد کنید' })
  phone?: string;

  /** Ten digits with the national check digit; empty clears it. */
  @IsOptional()
  @code()
  @ValidateIf((_, v) => v !== '')
  @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقم باشد' })
  nationalId?: string;

  @IsOptional()
  @code()
  @IsString()
  @IsNotEmpty({ message: 'کد پرسنلی را وارد کنید' })
  @MaxLength(50, { message: 'کد پرسنلی حداکثر ۵۰ نویسه است' })
  personnelCode?: string;

  @trim()
  @IsString()
  @IsNotEmpty({ message: 'عنوان شغلی را وارد کنید' })
  @MaxLength(100, { message: 'عنوان شغلی حداکثر ۱۰۰ نویسه است' })
  jobTitle: string;

  /** Civil date `YYYY-MM-DD`; empty clears it. */
  @IsOptional()
  @code()
  @ValidateIf((_, v) => v !== '')
  @Matches(DATE, { message: 'تاریخ شروع همکاری نامعتبر است' })
  hireDate?: string;

  @IsOptional()
  @code()
  @ValidateIf((_, v) => v !== '')
  @Matches(DATE, { message: 'تاریخ پایان همکاری نامعتبر است' })
  endDate?: string;

  /** Last day of the trial period, civil date; empty clears it (no trial). */
  @IsOptional()
  @code()
  @ValidateIf((_, v) => v !== '')
  @Matches(DATE, { message: 'تاریخ پایان دوره آزمایشی نامعتبر است' })
  probationEndDate?: string;

  @IsOptional()
  @code()
  @ValidateIf((_, v) => v !== '')
  @Matches(/^\d{1,20}$/, { message: 'شماره بیمه فقط عدد است' })
  insuranceNumber?: string;

  /** `IR` + 24 digits; empty clears it. */
  @IsOptional()
  @code()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @ValidateIf((_, v) => v !== '')
  @Matches(/^IR\d{24}$/, { message: 'شماره شبا باید IR و ۲۴ رقم باشد' })
  sheba?: string;

  @IsOptional()
  @trim()
  @ValidateIf((_, v) => v !== '')
  @IsEmail({}, { message: 'ایمیل نامعتبر است' })
  @MaxLength(100)
  email?: string;

  @IsOptional() @IsBoolean() married?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'تعداد فرزند نامعتبر است' })
  @Min(0, { message: 'تعداد فرزند نامعتبر است' })
  @Max(20, { message: 'تعداد فرزند نامعتبر است' })
  childrenCount?: number;

  @IsOptional() @IsBoolean() insured?: boolean;

  @IsOptional()
  @IsIn(['worker', 'board'], { message: 'نوع بیمه نامعتبر است' })
  insuranceType?: string;

  @IsOptional() @IsBoolean() taxExempt?: boolean;

  @IsOptional()
  @IsIn(['gross', 'net'], { message: 'نوع توافق نامعتبر است' })
  agreementType?: string;

  @IsOptional()
  @IsIn(['regular', 'hybrid', 'flat'], { message: 'نوع حقوق نامعتبر است' })
  salaryMode?: string;
}
