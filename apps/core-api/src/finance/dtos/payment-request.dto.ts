import { Transform, Type } from 'class-transformer';
import {
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
  Currency,
  PayeeAccountType,
  PaymentRequestStatus,
  RequestOrigin,
} from '../finance.constants';

export class CreatePaymentRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'عنوان درخواست را وارد کنید' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Type(() => Number)
  @IsInt({ message: 'دسته هزینه را انتخاب کنید' })
  categoryId: number;

  @Type(() => Number)
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد' })
  @Min(1, { message: 'مبلغ باید بزرگ‌تر از صفر باشد' })
  amountMinor: number;

  @IsEnum(Currency, { message: 'واحد پول نامعتبر است' })
  currency: Currency;

  /**
   * Optional link to the vendor directory. The payee fields below are still
   * required and are stored on the request — picking a vendor pre-fills them in
   * the UI, it does not replace them, because a payment record must not change
   * when a vendor later edits their bank details.
   */
  @IsOptional() @Type(() => Number) @IsInt() vendorId?: number;
  @IsOptional() @Type(() => Number) @IsInt() payeeAccountId?: number;

  @IsString()
  @IsNotEmpty({ message: 'نام طرف‌حساب را وارد کنید' })
  @MaxLength(200)
  payeeName: string;

  @IsEnum(PayeeAccountType, { message: 'نوع حساب مقصد نامعتبر است' })
  payeeAccountType: PayeeAccountType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  payeeAccountHolder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  payeeSheba?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  payeeCardNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  payeeAccountDetails?: string;

  @IsISO8601({}, { message: 'مهلت پرداخت نامعتبر است' })
  dueDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  costCenter?: string;

  /** When true the request is submitted immediately instead of saved as a draft. */
  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  /**
   * Set by Finance when raising a company-level payment. Ignored for anyone
   * without Role.FINANCE — the controller decides, not the client.
   */
  @IsOptional()
  @IsEnum(RequestOrigin)
  origin?: RequestOrigin;
}

export class UpdatePaymentRequestDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) amountMinor?: number;
  @IsOptional() @IsEnum(Currency) currency?: Currency;
  @IsOptional() @Type(() => Number) @IsInt() vendorId?: number;
  @IsOptional() @Type(() => Number) @IsInt() payeeAccountId?: number;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) payeeName?: string;
  @IsOptional() @IsEnum(PayeeAccountType) payeeAccountType?: PayeeAccountType;
  @IsOptional() @IsString() @MaxLength(200) payeeAccountHolder?: string;
  @IsOptional() @IsString() @MaxLength(34) payeeSheba?: string;
  @IsOptional() @IsString() @MaxLength(24) payeeCardNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) payeeAccountDetails?: string;
  @IsOptional() @IsISO8601() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(100) costCenter?: string;
}

/** Which slice of the queue the caller wants. */
export enum RequestScope {
  /** Requests the caller raised. */
  MINE = 'mine',
  /** Requests waiting on the caller's approval role, right now. */
  AWAITING_ME = 'awaiting_me',
  /** Everything the caller's role is allowed to see. */
  ALL = 'all',
  /** Approved / scheduled / failed — the Finance payment queue. */
  PAYABLE = 'payable',
}

export class ListPaymentRequestsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;

  @IsOptional()
  @IsEnum(RequestScope)
  scope?: RequestScope;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value,
  )
  @IsArray()
  @IsEnum(PaymentRequestStatus, { each: true })
  status?: PaymentRequestStatus[];

  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;

  /** Only requests already past their deadline. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  overdue?: boolean;
}

export class DecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ReasonRequiredDto {
  @IsString()
  @IsNotEmpty({ message: 'نوشتن دلیل الزامی است' })
  @MaxLength(1000)
  comment: string;
}

export class RecordPaymentDto {
  @Type(() => Number)
  @IsInt({ message: 'منبع پرداخت را انتخاب کنید' })
  paymentSourceId: number;

  @IsISO8601({}, { message: 'تاریخ پرداخت نامعتبر است' })
  paidAt: string;

  /** What actually left the account, in rial. */
  @Type(() => Number)
  @IsInt({ message: 'مبلغ پرداخت‌شده باید عدد صحیح باشد' })
  @Min(1, { message: 'مبلغ پرداخت‌شده باید بزرگ‌تر از صفر باشد' })
  settledAmountRial: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) fxRateRialPerUnit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) feeRial?: number;
  @IsOptional() @IsString() @MaxLength(200) intermediary?: string;
  @IsOptional() @IsString() @MaxLength(100) referenceNumber?: string;
  @IsOptional() @Type(() => Number) @IsInt() receiptAttachmentId?: number;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ApprovalPreviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountMinor: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
}
