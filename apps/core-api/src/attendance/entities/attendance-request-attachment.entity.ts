import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { AttendanceRequestEntity } from './attendance-request.entity';

/** A medical note, invitation or other document supporting a request. */
@Entity()
export class AttendanceRequestAttachmentEntity extends BaseEntity {
  @ManyToOne(() => AttendanceRequestEntity, { deleteRule: 'cascade' })
  request: AttendanceRequestEntity;

  /** Object key inside the bucket, not a URL — reads are presigned. */
  @Property()
  storageKey: string;

  @Property()
  filename: string;

  @Property()
  mimeType: string;

  @Property()
  sizeBytes: number;

  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  uploadedBy?: UserEntity;
}
