import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';

/** A clock interval of one on-call slot, `HH:mm`. */
export interface OnCallSlot {
  start: string;
  end: string;
}

/** What kind of day it is; each kind has its own default hours. */
export type OnCallDayType = 'normal' | 'thursday' | 'friday' | 'holiday';

export type OnCallTemplates = Record<OnCallDayType, OnCallSlot[]>;

/** Pay per hour on call for each kind of day, in rial. */
export type OnCallRates = Record<OnCallDayType, number>;

export const DEFAULT_ONCALL_RATES: OnCallRates = {
  normal: 0,
  thursday: 0,
  friday: 0,
  holiday: 0,
};

export const DEFAULT_ONCALL_TEMPLATES: OnCallTemplates = {
  normal: [{ start: '17:30', end: '23:00' }],
  thursday: [{ start: '14:00', end: '20:00' }],
  friday: [
    { start: '10:00', end: '12:00' },
    { start: '15:00', end: '20:00' },
  ],
  holiday: [
    { start: '08:30', end: '12:30' },
    { start: '15:00', end: '20:00' },
  ],
};

/** کشیک settings — one row for the whole organisation: the default hours and the period. */
@Entity()
export class OnCallSettingsEntity extends BaseEntity {
  @Property({ type: 'json' })
  templates: OnCallTemplates;

  /** Day of the Jalali month a period starts on; it runs to the day before the next one. */
  @Property({ default: 26 })
  periodStartDay: number = 26;

  /** What an hour on call pays per kind of day (rial); empty until it is set. */
  @Property({ type: 'json', nullable: true })
  hourlyRates?: OnCallRates;

  /** User ids of the eligible people (anyone in the organisation), in list order. */
  @Property({ type: 'json' })
  memberOrder: number[];
}

export enum OnCallPeriodStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

/** One period of the schedule; people see it once it is published. */
@Entity()
export class OnCallPeriodEntity extends BaseEntity {
  /** First civil date of the period. */
  @Property({ type: 'date' })
  @Unique()
  startDate: string;

  @Enum({ items: () => OnCallPeriodStatus, default: OnCallPeriodStatus.DRAFT })
  status: OnCallPeriodStatus = OnCallPeriodStatus.DRAFT;
}

/** A person on call for part (or all) of a day. A day may have several rows. */
@Entity()
export class OnCallShiftEntity extends BaseEntity {
  @Property({ type: 'date' })
  @Index()
  date: string;

  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  user: UserEntity;

  @Property({ length: 5 })
  startTime: string;

  @Property({ length: 5 })
  endTime: string;

  /** When the «starts soon» reminder went out; empty until then. */
  @Property({ type: 'timestamp', nullable: true })
  reminderSentAt?: Date;
}

/**
 * A manager's edit to a day of a published period that has not been announced
 * yet. One row per person and day, from what they had to what they have now;
 * the manager then decides whether to tell people.
 */
@Entity()
@Unique({ properties: ['date', 'user'] })
export class OnCallChangeEntity extends BaseEntity {
  @Property({ type: 'date' })
  date: string;

  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  user: UserEntity;

  /** Slots before the edit; empty when the person was not on that day. */
  @Property({ type: 'json', nullable: true })
  before?: OnCallSlot[];

  /** Slots now; empty when the person was taken off. */
  @Property({ type: 'json', nullable: true })
  after?: OnCallSlot[];
}

export enum OnCallSwapKind {
  /** Two people trade a day each. */
  SWAP = 'swap',
  /** One hands a day over and takes nothing back. */
  HANDOVER = 'handover',
  /** Part of one day's hours goes to the other person. */
  PARTIAL = 'partial',
}

export enum OnCallSwapStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

/**
 * A request between two people to change who is on call. The other person
 * accepts or declines; nobody else approves. Rows stay as the log.
 */
@Entity()
export class OnCallSwapEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  requester: UserEntity;

  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  target: UserEntity;

  @Enum({ items: () => OnCallSwapKind })
  kind: OnCallSwapKind;

  /** The requester's day, which goes to the target. */
  @Property({ type: 'date' })
  requesterDate: string;

  /** The target's day, which comes to the requester; only for a swap. */
  @Property({ type: 'date', nullable: true })
  targetDate?: string;

  /** For a partial handover: the hours given away, `HH:mm`. */
  @Property({ length: 5, nullable: true })
  startTime?: string;

  @Property({ length: 5, nullable: true })
  endTime?: string;

  /** Agreed beforehand and just logged: applied at once, nobody has to accept. */
  @Property({ default: false })
  coordinated: boolean = false;

  @Enum({ items: () => OnCallSwapStatus, default: OnCallSwapStatus.PENDING })
  status: OnCallSwapStatus = OnCallSwapStatus.PENDING;

  @Property({ type: 'timestamp', nullable: true })
  respondedAt?: Date;
}
