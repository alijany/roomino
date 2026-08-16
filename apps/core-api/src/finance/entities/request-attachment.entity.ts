import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { AttachmentKind } from '../finance.constants';
import { PaymentRequestEntity } from './payment-request.entity';

/** An invoice, quote, contract or receipt hanging off a payment request. */
@Entity()
export class RequestAttachmentEntity extends BaseEntity {
  @ManyToOne(() => PaymentRequestEntity)
  request: PaymentRequestEntity;

  /**
   * Object key inside the bucket, not a URL. The public URL is derived on read
   * so access can be tightened to presigned URLs without a data migration.
   */
  @Property()
  storageKey: string;

  @Property()
  url: string;

  @Property()
  filename: string;

  @Property()
  mimeType: string;

  @Property()
  sizeBytes: number;

  @Enum({ items: () => AttachmentKind, default: AttachmentKind.INVOICE })
  kind: AttachmentKind = AttachmentKind.INVOICE;

  @ManyToOne(() => UserEntity, { nullable: true })
  uploadedBy?: UserEntity;
}
