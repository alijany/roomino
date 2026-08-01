import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import { UserEntity } from '../../user/user.entity';
import { MeetingRoomEntity } from '../entities/meeting-room.entity';
import { RecurringReservationEntity } from '../entities/recurring-reservation.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import {
  AvailabilityResponse,
  AvailabilitySlot,
  SlotStatus,
} from '../meeting.types';
import {
  BOARD_END,
  BOARD_START,
  SLOT,
  SLOT_STARTS,
  composeTehranInstant,
  minutesOfDayTehran,
  tehranDayEnd,
  tehranDayStart,
  toJalaliWeekday,
} from '../utils/meeting-time.util';

@Injectable()
export class ReservationService extends BaseRepositoryService<ReservationEntity> {
  constructor(
    @InjectRepository(ReservationEntity)
    protected repository: EntityRepository<ReservationEntity>,
    @InjectRepository(MeetingRoomEntity)
    private readonly roomRepository: EntityRepository<MeetingRoomEntity>,
    @InjectRepository(RecurringReservationEntity)
    private readonly recurringRepository: EntityRepository<RecurringReservationEntity>,
  ) {
    super(repository);
  }

  private validateSlotBounds(startMinutes: number, endMinutes: number): void {
    const validRange =
      startMinutes >= BOARD_START &&
      endMinutes <= BOARD_END &&
      startMinutes < endMinutes;
    const alignedToSlot = startMinutes % SLOT === 0 && endMinutes % SLOT === 0;
    if (!validRange || !alignedToSlot) {
      throw new BadRequestException('بازه انتخابی نامعتبر است');
    }
  }

  /**
   * Ensure the room is free for [startAt, endAt): no overlapping one-off
   * reservation and no recurring lock on the matching weekday/time-of-day.
   */
  async assertSlotFree(
    roomId: number,
    startAt: Date,
    endAt: Date,
    excludeId?: number,
  ): Promise<void> {
    // (a) Overlapping one-off reservation.
    const overlap = await this.findOne({
      room: roomId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      ...(excludeId ? { id: { $ne: excludeId } } : {}),
    });
    if (overlap) {
      throw new BadRequestException('این بازه زمانی قبلاً رزرو شده است');
    }

    // (b) Overlapping recurring lock.
    const weekday = toJalaliWeekday(startAt);
    const sM = minutesOfDayTehran(startAt);
    const eM = minutesOfDayTehran(endAt);
    const lock = await this.recurringRepository.findOne({
      room: roomId,
      weekday,
      active: true,
      startMinutes: { $lt: eM },
      endMinutes: { $gt: sM },
    });
    if (lock) {
      throw new BadRequestException('این بازه زمانی قبلاً رزرو شده است');
    }
  }

  private async requireRoom(roomId: number): Promise<MeetingRoomEntity> {
    const room = await this.roomRepository.findOne({ id: roomId });
    if (!room || !room.active) {
      throw new BadRequestException('اتاق انتخاب‌شده در دسترس نیست');
    }
    return room;
  }

  async createBooking(
    userId: number,
    dto: CreateReservationDto,
  ): Promise<ReservationEntity> {
    this.validateSlotBounds(dto.startMinutes, dto.endMinutes);
    await this.requireRoom(dto.roomId);

    const startAt = composeTehranInstant(dto.date, dto.startMinutes);
    const endAt = composeTehranInstant(dto.date, dto.endMinutes);
    await this.assertSlotFree(dto.roomId, startAt, endAt);

    return this.create({
      room: this.roomRepository.getReference(dto.roomId),
      user: this.em.getReference(UserEntity, userId),
      startAt,
      endAt,
      title: dto.title,
      purpose: dto.purpose,
    });
  }

  async updateOwn(
    id: number,
    userId: number,
    isAdmin: boolean,
    dto: UpdateReservationDto,
  ): Promise<ReservationEntity> {
    this.validateSlotBounds(dto.startMinutes, dto.endMinutes);
    const reservation = await this.findOne(
      { id },
      { populate: ['user', 'room'] as never },
    );
    if (!reservation) {
      throw new NotFoundException('رزرو یافت نشد');
    }
    if (reservation.user.id !== userId && !isAdmin) {
      throw new ForbiddenException('شما اجازه ویرایش این رزرو را ندارید');
    }

    const startAt = composeTehranInstant(dto.date, dto.startMinutes);
    const endAt = composeTehranInstant(dto.date, dto.endMinutes);
    await this.assertSlotFree(reservation.room.id, startAt, endAt, id);

    reservation.startAt = startAt;
    reservation.endAt = endAt;
    reservation.title = dto.title;
    reservation.purpose = dto.purpose;
    await this.persistAndFlush(reservation);
    return reservation;
  }

  async removeOwn(id: number, userId: number, isAdmin: boolean): Promise<void> {
    const reservation = await this.findOne(
      { id },
      { populate: ['user', 'room'] as never },
    );
    if (!reservation) {
      throw new NotFoundException('رزرو یافت نشد');
    }
    if (reservation.user.id !== userId && !isAdmin) {
      throw new ForbiddenException('شما اجازه حذف این رزرو را ندارید');
    }
    await this.remove(reservation);
  }

  listMine(userId: number, page = 0, limit = 20) {
    return this.findAll(
      { user: userId, endAt: { $gte: new Date() } },
      {
        orderBy: { startAt: 'ASC' },
        limit,
        offset: page * limit,
        populate: ['room'] as never,
      },
    );
  }

  async getAvailability(
    date: string,
    roomIds: number[] | undefined,
    currentUserId: number,
  ): Promise<AvailabilityResponse> {
    const rooms = await this.roomRepository.find(
      roomIds && roomIds.length
        ? { id: { $in: roomIds }, active: true }
        : { active: true },
      { orderBy: { name: 'ASC' } },
    );

    const weekday = toJalaliWeekday(tehranDayStart(date));
    const dayStart = tehranDayStart(date);
    const dayEnd = tehranDayEnd(date);

    const availabilityRooms = await Promise.all(
      rooms.map(async (room) => {
        const [reservations, locks] = await Promise.all([
          this.repository.find(
            {
              room: room.id,
              startAt: { $lt: dayEnd },
              endAt: { $gt: dayStart },
            },
            { populate: ['user'] },
          ),
          this.recurringRepository.find({
            room: room.id,
            weekday,
            active: true,
          }),
        ]);

        const slots: AvailabilitySlot[] = SLOT_STARTS.map((slotStart) => {
          const slotEnd = slotStart + SLOT;
          let status: SlotStatus = 'available';
          const slot: AvailabilitySlot = {
            startMinutes: slotStart,
            endMinutes: slotEnd,
            status,
          };

          const lock = locks.find(
            (l) => l.startMinutes < slotEnd && l.endMinutes > slotStart,
          );
          if (lock) {
            status = 'locked';
            slot.status = status;
            slot.lockTitle = lock.title;
            return slot;
          }

          const reservation = reservations.find((r) => {
            const sM = minutesOfDayTehran(r.startAt);
            const eM = minutesOfDayTehran(r.endAt);
            return sM < slotEnd && eM > slotStart;
          });
          if (reservation) {
            status = 'reserved';
            slot.status = status;
            slot.reservation = {
              id: reservation.id,
              title: reservation.title,
              purpose: reservation.purpose,
              ownerName: reservation.user.name ?? 'کاربر',
              ownerPhone: reservation.user.phone,
              isOwn: reservation.user.id === currentUserId,
            };
          }

          return slot;
        });

        return {
          roomId: room.id,
          roomName: room.name,
          capacity: room.capacity,
          slots,
        };
      }),
    );

    return {
      date,
      weekday,
      slotStarts: SLOT_STARTS,
      rooms: availabilityRooms,
    };
  }
}
