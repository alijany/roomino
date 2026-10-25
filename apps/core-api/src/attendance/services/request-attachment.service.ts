import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '../../roles/roles.constants';
import { S3StorageService } from '../../storage/s3-storage.service';
import { UserEntity } from '../../user/user.entity';
import {
  ALLOWED_REQUEST_ATTACHMENT_MIME_TYPES,
  ATTENDANCE_ATTACHMENT_FOLDER,
  MAX_REQUEST_ATTACHMENT_BYTES,
  MAX_REQUEST_ATTACHMENTS,
  RequestStatus,
} from '../attendance.constants';
import { AttendanceRequestAttachmentEntity } from '../entities/attendance-request-attachment.entity';
import { EmployeeService } from './employee.service';
import { RequestService } from './request.service';

/**
 * Supporting documents for a request. Stored private and read through
 * short-lived presigned URLs; who may read them follows who may see the
 * request itself: its owner, admin/HR, and the approvers of their team.
 */
@Injectable()
export class RequestAttachmentService {
  private readonly logger = new Logger(RequestAttachmentService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly storage: S3StorageService,
    private readonly requests: RequestService,
    private readonly employees: EmployeeService,
  ) {}

  /** The request, if `user` may see it — a stranger's id answers 404. */
  private async viewableRequest(requestId: number, user: UserEntity) {
    const request = await this.requests.getOrFail(requestId);

    const owns = request.employee.user.id === user.id;
    const isStaff = user.roles
      .getItems()
      .some((r) => r.role === Role.ADMIN || r.role === Role.HR);
    if (owns || isStaff) return { request, owns };

    const team = await this.employees.teamIds(user.id);
    if (!team.includes(request.employee.id)) {
      throw new NotFoundException('درخواست یافت نشد');
    }
    return { request, owns: false };
  }

  /** Only the owner may change attachments, and only while it is pending. */
  private async editableRequest(requestId: number, user: UserEntity) {
    const { request, owns } = await this.viewableRequest(requestId, user);
    if (!owns) {
      throw new ForbiddenException('فقط ثبت‌کننده می‌تواند پیوست را تغییر دهد');
    }
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('پیوست درخواست بررسی‌شده قابل تغییر نیست');
    }
    return request;
  }

  async list(requestId: number, user: UserEntity) {
    await this.viewableRequest(requestId, user);
    const rows = await this.em.find(
      AttendanceRequestAttachmentEntity,
      { request: requestId },
      { orderBy: { id: 'asc' } },
    );
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        filename: row.filename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        createdAt: row.created_at,
        url: await this.signedUrl(row),
      })),
    );
  }

  async upload(
    requestId: number,
    file: Express.Multer.File | undefined,
    user: UserEntity,
  ) {
    const request = await this.editableRequest(requestId, user);

    if (!file) throw new BadRequestException('فایلی انتخاب نشده است');
    if (!ALLOWED_REQUEST_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'فرمت فایل نامعتبر است. فقط تصویر (JPG، PNG، WebP) و PDF پذیرفته می‌شود',
      );
    }
    if (file.size > MAX_REQUEST_ATTACHMENT_BYTES) {
      throw new BadRequestException('حجم فایل بیش از ۱۰ مگابایت است');
    }

    const existing = await this.em.count(AttendanceRequestAttachmentEntity, {
      request: request.id,
    });
    if (existing >= MAX_REQUEST_ATTACHMENTS) {
      throw new BadRequestException(
        `حداکثر ${MAX_REQUEST_ATTACHMENTS} پیوست برای هر درخواست مجاز است`,
      );
    }

    const extension = file.originalname.split('.').pop() ?? 'bin';
    const name = `${uuidv4()}.${extension}`;
    await this.storage.uploadBuffer(
      file.buffer,
      name,
      file.mimetype,
      ATTENDANCE_ATTACHMENT_FOLDER,
      'private',
    );

    const row = this.em.create(AttendanceRequestAttachmentEntity, {
      request,
      storageKey: `${ATTENDANCE_ATTACHMENT_FOLDER}/${name}`,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: user,
    });
    await this.em.flush();

    return {
      id: row.id,
      filename: row.filename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      createdAt: row.created_at,
      url: await this.signedUrl(row),
    };
  }

  async remove(requestId: number, id: number, user: UserEntity) {
    await this.editableRequest(requestId, user);
    const row = await this.em.findOne(AttendanceRequestAttachmentEntity, {
      id,
      request: requestId,
    });
    if (!row) throw new NotFoundException('پیوست یافت نشد');

    try {
      await this.storage.deleteObject(row.storageKey);
    } catch (error) {
      // The row is the source of truth; a stranded object only costs storage.
      this.logger.warn(
        `حذف فایل ${row.storageKey} از فضای ذخیره‌سازی ناموفق بود: ${error?.message}`,
      );
    }
    await this.em.removeAndFlush(row);
  }

  private async signedUrl(row: AttendanceRequestAttachmentEntity) {
    try {
      return await this.storage.getSignedReadUrl(row.storageKey);
    } catch (error) {
      this.logger.warn(
        `ساخت لینک موقت برای پیوست ${row.id} ناموفق بود: ${error?.message}`,
      );
      return null;
    }
  }
}
