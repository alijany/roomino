import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MeetingRoomEntity } from '../entities/meeting-room.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import {
  HeatmapBucket,
  ReportGroupBy,
  RoomUsageHeatmapResponse,
  RoomUsageRow,
} from '../meeting.types';
import {
  BOARD_END,
  BOARD_START,
  minutesOfDayTehran,
  minutesToHHmm,
  tehranDayEnd,
  tehranDayStart,
} from '../utils/meeting-time.util';

const MAX_RANGE_DAYS = 366;

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: EntityRepository<ReservationEntity>,
    @InjectRepository(MeetingRoomEntity)
    private readonly roomRepository: EntityRepository<MeetingRoomEntity>,
  ) {}

  async getRoomUsageHeatmap(
    from: string,
    to: string,
    roomIds: number[] | undefined,
    groupBy: ReportGroupBy = 'hour',
  ): Promise<RoomUsageHeatmapResponse> {
    if (groupBy !== 'hour') {
      throw new BadRequestException('این نوع گروه‌بندی هنوز پشتیبانی نمی‌شود');
    }

    const rangeStart = tehranDayStart(from);
    const rangeEnd = tehranDayEnd(to);
    if (rangeStart > rangeEnd) {
      throw new BadRequestException('بازه زمانی نامعتبر است');
    }

    const days = Math.round((+rangeEnd - +rangeStart) / 86_400_000) + 1;
    if (days > MAX_RANGE_DAYS) {
      throw new BadRequestException('بازه زمانی انتخابی بیش از حد بزرگ است');
    }

    const rooms = await this.roomRepository.find(
      roomIds && roomIds.length
        ? { id: { $in: roomIds }, active: true }
        : { active: true },
      { orderBy: { name: 'ASC' } },
    );

    const buckets = this.buildHourBuckets();

    if (!rooms.length) {
      return { from, to, groupBy, buckets, rooms: [], totalReservations: 0 };
    }

    const reservations = await this.reservationRepository.find(
      {
        room: { $in: rooms.map((room) => room.id) },
        startAt: { $gte: rangeStart, $lte: rangeEnd },
      },
      { populate: ['room'] },
    );

    const minutesByRoom = new Map<number, number[]>();
    const countByRoom = new Map<number, number[]>();
    for (const room of rooms) {
      minutesByRoom.set(room.id, new Array(buckets.length).fill(0));
      countByRoom.set(room.id, new Array(buckets.length).fill(0));
    }

    let totalReservations = 0;
    for (const reservation of reservations) {
      const minutes = minutesByRoom.get(reservation.room.id);
      const counts = countByRoom.get(reservation.room.id);
      if (!minutes || !counts) continue;

      totalReservations += 1;
      const startMinutes = minutesOfDayTehran(reservation.startAt);
      const endMinutes = minutesOfDayTehran(reservation.endAt);

      buckets.forEach((bucket, index) => {
        const bucketStart = bucket.key * 60;
        const overlap =
          Math.min(endMinutes, bucketStart + 60) -
          Math.max(startMinutes, bucketStart);
        if (overlap > 0) {
          minutes[index] += overlap;
          counts[index] += 1;
        }
      });
    }

    const capacityMinutesPerBucket = days * 60;
    const roomRows: RoomUsageRow[] = rooms.map((room) => {
      const minutes = minutesByRoom.get(room.id)!;
      const counts = countByRoom.get(room.id)!;
      return {
        roomId: room.id,
        roomName: room.name,
        values: buckets.map((_, index) => ({
          minutes: minutes[index],
          count: counts[index],
          occupancyRate: Math.min(1, minutes[index] / capacityMinutesPerBucket),
        })),
      };
    });

    return { from, to, groupBy, buckets, rooms: roomRows, totalReservations };
  }

  private buildHourBuckets(): HeatmapBucket[] {
    const buckets: HeatmapBucket[] = [];
    for (let minutes = BOARD_START; minutes < BOARD_END; minutes += 60) {
      buckets.push({ key: minutes / 60, label: minutesToHHmm(minutes) });
    }
    return buckets;
  }
}
