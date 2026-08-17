import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BillingCalendar,
  Currency,
  PayeeAccountType,
  RecurrenceCycle,
  VendorKind,
} from '../finance.constants';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty({ message: 'نام طرف‌حساب را وارد کنید' })
  @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(200) nameEn?: string;
  @IsOptional() @IsEnum(VendorKind) kind?: VendorKind;
  @IsOptional() @IsString() @MaxLength(50) economicCode?: string;
  @IsOptional() @IsString() @MaxLength(50) nationalId?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(200) contactName?: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
  @IsOptional() @IsEnum(Currency) defaultCurrency?: Currency;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateVendorDto extends CreateVendorDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) name: string;
}

export class ListVendorsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsEnum(VendorKind) kind?: VendorKind;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  activeOnly?: boolean;
}

export class CreatePayeeAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'عنوان حساب را وارد کنید' })
  @MaxLength(100)
  label: string;

  @IsEnum(PayeeAccountType) type: PayeeAccountType;

  @IsOptional() @IsString() @MaxLength(200) holderName?: string;
  @IsOptional() @IsString() @MaxLength(34) sheba?: string;
  @IsOptional() @IsString() @MaxLength(24) cardNumber?: string;
  @IsOptional() @IsString() @MaxLength(34) iban?: string;
  @IsOptional() @IsString() @MaxLength(20) swift?: string;
  @IsOptional() @IsString() @MaxLength(500) details?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdatePayeeAccountDto extends CreatePayeeAccountDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) label: string;
  @IsOptional() @IsEnum(PayeeAccountType) type: PayeeAccountType;
}

export class CreateRecurringExpenseDto {
  @IsString()
  @IsNotEmpty({ message: 'عنوان هزینه دوره‌ای را وارد کنید' })
  @MaxLength(200)
  title: string;

  @Type(() => Number)
  @IsInt({ message: 'طرف‌حساب را انتخاب کنید' })
  vendorId: number;

  @Type(() => Number)
  @IsInt({ message: 'دسته هزینه را انتخاب کنید' })
  categoryId: number;

  @IsOptional() @Type(() => Number) @IsInt() payeeAccountId?: number;
  @IsOptional() @Type(() => Number) @IsInt() defaultPaymentSourceId?: number;

  @Type(() => Number)
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد' })
  @Min(1, { message: 'مبلغ باید بزرگ‌تر از صفر باشد' })
  amountMinor: number;

  @IsEnum(Currency) currency: Currency;
  @IsEnum(RecurrenceCycle) cycle: RecurrenceCycle;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) cycleDays?: number;
  @IsOptional() @IsEnum(BillingCalendar) calendar?: BillingCalendar;

  @IsISO8601({}, { message: 'تاریخ سررسید بعدی نامعتبر است' })
  nextDueDate: string;

  @IsOptional() @IsISO8601() endDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6, { message: 'حداکثر شش یادآور می‌توانید تعیین کنید' })
  @IsInt({ each: true })
  reminderDays?: number[];

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) leadDays?: number;

  /** Defaults to the caller — whoever registers it usually owns it. */
  @IsOptional() @Type(() => Number) @IsInt() ownerId?: number;

  @IsOptional() @IsBoolean() autoGenerate?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateRecurringExpenseDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @Type(() => Number) @IsInt() vendorId?: number;
  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @IsOptional() @Type(() => Number) @IsInt() payeeAccountId?: number;
  @IsOptional() @Type(() => Number) @IsInt() defaultPaymentSourceId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) amountMinor?: number;
  @IsOptional() @IsEnum(Currency) currency?: Currency;
  @IsOptional() @IsEnum(RecurrenceCycle) cycle?: RecurrenceCycle;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) cycleDays?: number;
  @IsOptional() @IsEnum(BillingCalendar) calendar?: BillingCalendar;
  @IsOptional() @IsISO8601() nextDueDate?: string;
  @IsOptional() @IsISO8601() endDate?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  reminderDays?: number[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) leadDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() ownerId?: number;
  @IsOptional() @IsBoolean() autoGenerate?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ListRecurringDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @Type(() => Number) @IsInt() vendorId?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  activeOnly?: boolean;

  /** Only schedules due within N days — powers the upcoming-commitments view. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) dueWithinDays?: number;
}
