import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { S3StorageService } from '../../storage/s3-storage.service';
import { UserEntity } from '../../user/user.entity';
import { PaymentRequestEntity } from '../entities/payment-request.entity';
import { RequestAttachmentEntity } from '../entities/request-attachment.entity';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  AttachmentKind,
  FINANCE_ATTACHMENT_FOLDER,
  MAX_ATTACHMENT_BYTES,
} from '../finance.constants';

/**
 * Invoices and receipts are more sensitive than profile pictures, so finance
 * attachments are stored private and served through short-lived presigned URLs
 * rather than the bucket's public-read policy.
 */
@Injectable()
export class FinanceAttachmentService extends BaseRepositoryService<RequestAttachmentEntity> {
  private readonly logger = new Logger(FinanceAttachmentService.name);

  constructor(
    @InjectRepository(RequestAttachmentEntity)
    protected repository: EntityRepository<RequestAttachmentEntity>,
    private readonly storage: S3StorageService,
  ) {
    super(repository);
  }

  async upload(
    requestId: number,
    file: Express.Multer.File,
    userId: number,
    kind: AttachmentKind = AttachmentKind.INVOICE,
  ): Promise<RequestAttachmentEntity> {
    if (!file) {
      throw new BadRequestException('فایلی انتخاب نشده است');
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'فرمت فایل نامعتبر است. فقط تصویر (JPG، PNG، WebP) و PDF پذیرفته می‌شود',
      );
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('حجم فایل بیش از ۱۰ مگابایت است');
    }

    const extension = file.originalname.split('.').pop() ?? 'bin';
    const filename = `${uuidv4()}.${extension}`;
    const storageKey = `${FINANCE_ATTACHMENT_FOLDER}/${filename}`;

    const url = await this.storage.uploadBuffer(
      file.buffer,
      filename,
      file.mimetype,
      FINANCE_ATTACHMENT_FOLDER,
      'private',
    );

    return this.create({
      request: this.em.getReference(PaymentRequestEntity, requestId),
      storageKey,
      url,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      kind,
      uploadedBy: this.em.getReference(UserEntity, userId),
    });
  }

  async getOrFail(id: number): Promise<RequestAttachmentEntity> {
    const attachment = await this.findOne(
      { id },
      { populate: ['request'] as never },
    );

    if (!attachment) {
      throw new NotFoundException('پیوست یافت نشد');
    }

    return attachment;
  }

  /**
   * Presigned read URL. Falls back to the stored URL if signing fails so a
   * misconfigured storage endpoint degrades to "link may not open" rather than
   * breaking the whole request detail page.
   */
  async signedUrl(attachment: RequestAttachmentEntity): Promise<string> {
    try {
      return await this.storage.getSignedReadUrl(attachment.storageKey);
    } catch (error) {
      this.logger.warn(
        `ساخت لینک موقت برای پیوست ${attachment.id} ناموفق بود: ${error?.message}`,
      );
      return attachment.url;
    }
  }

  async removeAttachment(id: number): Promise<void> {
    const attachment = await this.getOrFail(id);

    try {
      await this.storage.deleteObject(attachment.storageKey);
    } catch (error) {
      // The database row is the source of truth; a stranded object costs
      // storage but never breaks the request.
      this.logger.warn(
        `حذف فایل ${attachment.storageKey} از فضای ذخیره‌سازی ناموفق بود: ${error?.message}`,
      );
    }

    await this.em.nativeDelete(RequestAttachmentEntity, { id });
  }

  countForRequest(requestId: number, kinds?: AttachmentKind[]) {
    return this.count({
      request: requestId,
      ...(kinds ? { kind: { $in: kinds } } : {}),
    });
  }
}
