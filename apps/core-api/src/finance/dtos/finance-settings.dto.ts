import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Role } from '../../roles/roles.constants';
import {
  AttachmentKind,
  Currency,
  PaymentSourceType,
} from '../finance.constants';

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'نام دسته را وارد کنید' })
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'کد دسته را وارد کنید' })
  @Matches(/^[a-z0-9_-]+$/, {
    message:
      'کد دسته فقط می‌تواند شامل حروف انگلیسی کوچک، عدد، خط تیره و زیرخط باشد',
  })
  @MaxLength(50)
  code: string;

  @IsOptional() @Type(() => Number) @IsInt() parentId?: number;
  @IsOptional() @IsBoolean() requiresInvoice?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateExpenseCategoryDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @Type(() => Number) @IsInt() parentId?: number;
  @IsOptional() @IsBoolean() requiresInvoice?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreatePaymentSourceDto {
  @IsString()
  @IsNotEmpty({ message: 'عنوان منبع پرداخت را وارد کنید' })
  @MaxLength(100)
  label: string;

  @IsEnum(PaymentSourceType) type: PaymentSourceType;

  @IsOptional() @IsString() @MaxLength(100) bankName?: string;
  @IsOptional() @IsString() @MaxLength(34) sheba?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'فقط چهار رقم آخر کارت را وارد کنید' })
  cardLast4?: string;

  @IsOptional() @IsString() @MaxLength(200) accountHolder?: string;
  @IsOptional() @IsEnum(Currency) currency?: Currency;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdatePaymentSourceDto extends CreatePaymentSourceDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) label: string;
  @IsOptional() @IsEnum(PaymentSourceType) type: PaymentSourceType;
}

export class ApprovalRuleInputDto {
  @Type(() => Number)
  @IsInt({ message: 'کف مبلغ باید عدد صحیح باشد' })
  @Min(0)
  minAmountRial: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'سقف مبلغ باید عدد صحیح باشد' })
  @Min(1)
  maxAmountRial?: number;

  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;

  @IsArray()
  @ArrayMaxSize(4, {
    message: 'زنجیره تأیید حداکثر می‌تواند چهار مرحله داشته باشد',
  })
  @IsEnum(Role, { each: true, message: 'نقش تأییدکننده نامعتبر است' })
  approverChain: Role[];

  @IsOptional() @Type(() => Number) @IsInt() priority?: number;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
}

/** The matrix is edited as a whole — partial edits invite overlapping bands. */
export class ReplaceApprovalRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalRuleInputDto)
  rules: ApprovalRuleInputDto[];
}

export class UploadAttachmentDto {
  @IsOptional()
  @IsEnum(AttachmentKind, { message: 'نوع پیوست نامعتبر است' })
  kind?: AttachmentKind;
}
