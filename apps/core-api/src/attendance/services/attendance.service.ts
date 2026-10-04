import { EntityManager } from '@mikro-orm/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { UserEntity } from '../../user/user.entity';
import {
  AttendanceSource,
  AttendanceStatus,
  MINUTES_PER_WORKDAY,
  RemoteStatus,
  RequestStatus,
  RequestType,
  WorkMode,
} from '../attendance.constants';
import {
  CheckInDto,
  CheckOutDto,
  CorrectAttendanceDto,
} from '../dtos/attendance.dto';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { AttendanceEntity } from '../entities/attendance.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import {
  clockToMinutes,
  composeInstant,
  distanceMeters,
  tehranClock,
  tehranToday,
} from '../utils/attendance-time.util';
import { isFixedRemoteDay } from '../utils/attendance-shift.util';
import { AttendanceNotificationService } from './attendance-notification.service';

export interface CheckInResult {
  success: boolean;
  message: string;
  /** After an out-of-range failure: the client may offer remote check-in. */
  canRemote?: boolean;
  attendance?: AttendanceEntity;
}

/**
 * Check-in/out and corrections. GPS is the gate: inside the workplace
 * radius is an office day; outside it is only allowed as remote work, which
 * — unless already permitted — files a remote-work request for approval.
 */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly em: EntityManager,
    private readonly notifications: AttendanceNotificationService,
  ) {}

  findDay(profileId: number, date: string) {
    return this.em.findOne(
      AttendanceEntity,
      { employee: profileId, date },
      { populate: ['editedBy'] },
    );
  }

  /**
   * Remote-work standing on a day: a fixed weekly day, an approved daily
   * remote request, a pending one, or none (remote not allowed).
   */
  async remoteStatus(
    profile: EmployeeProfileEntity,
    date: string,
  ): Promise<RemoteStatus | null> {
    if (isFixedRemoteDay(profile, date)) return RemoteStatus.FIXED;

    const requests = await this.em.find(AttendanceRequestEntity, {
      employee: profile.id,
      type: RequestType.REMOTE_DAILY,
      status: { $in: [RequestStatus.APPROVED, RequestStatus.PENDING] },
      dateFrom: { $lte: date },
      $or: [{ dateTo: null }, { dateTo: { $gte: date } }],
    });

    if (requests.some((r) => r.status === RequestStatus.APPROVED)) {
      return RemoteStatus.APPROVED;
    }
    return requests.length ? RemoteStatus.PENDING : null;
  }

  private distanceTo(
    profile: EmployeeProfileEntity,
    lat?: number,
    lng?: number,
  ): number | null {
    const workplace = profile.workplace;
    if (!workplace || lat === undefined || lng === undefined) return null;
    if (lat === null || lng === null) return null;
    return distanceMeters(workplace.lat, workplace.lng, lat, lng);
  }

  async checkIn(
    profile: EmployeeProfileEntity,
    dto: CheckInDto,
  ): Promise<CheckInResult> {
    const today = tehranToday();
    const workplace = profile.workplace;
    const existing = await this.findDay(profile.id, today);

    if (existing?.checkInAt) {
      return {
        success: false,
        message: 'شما قبلاً برای امروز ورود خود را ثبت کرده‌اید.',
      };
    }

    const distance = this.distanceTo(profile, dto.lat, dto.lng);
    const inRange =
      Boolean(workplace) &&
      (!profile.useGps ||
        (distance !== null && distance <= workplace.radiusMeters));
    const remoteStatus = await this.remoteStatus(profile, today);

    let mode: WorkMode;
    if (inRange && !dto.remote) {
      mode = WorkMode.OFFICE;
    } else if (dto.remote || remoteStatus) {
      mode = WorkMode.REMOTE;
    } else {
      return {
        success: false,
        canRemote: true,
        message: !workplace
          ? 'محل کاری برای شما تعریف نشده است.'
          : distance === null
          ? 'موقعیت مکانی شما دریافت نشد.'
          : `شما خارج از محدوده مجاز محل کار هستید (فاصله: ${Math.round(
              distance,
            )} متر).`,
      };
    }

    let autoRequest: AttendanceRequestEntity | null = null;

    const attendance = await this.em.transactional(async (em) => {
      const row =
        (existing &&
          (await em.findOne(AttendanceEntity, { id: existing.id }))) ??
        em.create(AttendanceEntity, {
          employee: profile,
          date: today,
          status: AttendanceStatus.PRESENT,
          workMode: mode,
        });

      em.assign(row, {
        workplace: workplace ?? null,
        checkInAt: new Date(),
        checkInLat: dto.lat ?? null,
        checkInLng: dto.lng ?? null,
        checkInDistanceM: distance !== null ? Math.round(distance) : null,
        checkInSource: dto.lat !== undefined ? AttendanceSource.GPS : null,
        status: AttendanceStatus.PRESENT,
        workMode: mode,
      });
      em.persist(row);

      // Remote work without permission: file today's remote request.
      if (mode === WorkMode.REMOTE && remoteStatus === null) {
        autoRequest = em.create(AttendanceRequestEntity, {
          employee: profile,
          type: RequestType.REMOTE_DAILY,
          dateFrom: today,
          dateTo: today,
          status: RequestStatus.PENDING,
          durationMinutes: MINUTES_PER_WORKDAY,
          description:
            'ثبت خودکار: ورود دورکاری' +
            (distance !== null
              ? ` (فاصله از محل کار: ${Math.round(distance)} متر)`
              : ' (بدون موقعیت مکانی)'),
        });
        em.persist(autoRequest);
      }

      await em.flush();
      return row;
    });

    if (autoRequest) {
      await this.notifications.requestSubmitted(autoRequest, profile);
    }

    return {
      success: true,
      attendance,
      message:
        mode === WorkMode.OFFICE
          ? 'ورود شما با موفقیت ثبت شد.'
          : remoteStatus === null
          ? 'ورود دورکاری ثبت شد و درخواست دورکاری امروز برای تایید مدیر ارسال شد.'
          : 'ورود دورکاری شما ثبت شد.',
    };
  }

  /** Check out. A remote day skips the radius check. */
  async checkOut(
    profile: EmployeeProfileEntity,
    dto: CheckOutDto,
  ): Promise<CheckInResult> {
    const today = tehranToday();
    const workplace = profile.workplace;
    const attendance = await this.findDay(profile.id, today);

    if (!attendance?.checkInAt) {
      return { success: false, message: 'شما هنوز ورود خود را ثبت نکرده‌اید.' };
    }
    if (attendance.checkOutAt) {
      return {
        success: false,
        message: 'شما قبلاً برای امروز خروج خود را ثبت کرده‌اید.',
      };
    }

    const distance = this.distanceTo(profile, dto.lat, dto.lng);

    if (
      attendance.workMode !== WorkMode.REMOTE &&
      profile.useGps &&
      workplace
    ) {
      if (distance === null) {
        return { success: false, message: 'موقعیت مکانی شما دریافت نشد.' };
      }
      if (distance > workplace.radiusMeters) {
        return {
          success: false,
          message: `شما خارج از محدوده مجاز محل کار هستید (فاصله: ${Math.round(
            distance,
          )} متر).`,
        };
      }
    }

    this.em.assign(attendance, {
      checkOutAt: new Date(),
      checkOutLat: dto.lat ?? null,
      checkOutLng: dto.lng ?? null,
      checkOutDistanceM: distance !== null ? Math.round(distance) : null,
      checkOutSource: dto.lat !== undefined ? AttendanceSource.GPS : null,
    });
    await this.em.flush();

    return {
      success: true,
      attendance,
      message: 'خروج شما با موفقیت ثبت شد.',
    };
  }

  /**
   * Record or correct a day's check-in/out on someone's behalf, keeping who
   * did it and why. Callers authorise first (admin/HR, or team approver).
   */
  async correct(
    profile: EmployeeProfileEntity,
    dto: CorrectAttendanceDto,
    editor: UserEntity,
  ) {
    if (dto.date > tehranToday()) {
      throw new BadRequestException('تردد روزهای آینده قابل ثبت نیست');
    }
    if (
      dto.checkOut &&
      clockToMinutes(dto.checkOut) <= clockToMinutes(dto.checkIn)
    ) {
      throw new BadRequestException('ساعت خروج باید بعد از ساعت ورود باشد');
    }

    const attendance =
      (await this.findDay(profile.id, dto.date)) ??
      this.em.create(AttendanceEntity, {
        employee: profile,
        date: dto.date,
        workplace: profile.workplace ?? null,
        status: AttendanceStatus.PRESENT,
        workMode: WorkMode.OFFICE,
      });

    // Only a changed time is re-sourced as manual; an untouched GPS check-in
    // keeps its provenance.
    if (tehranClock(attendance.checkInAt) !== dto.checkIn) {
      attendance.checkInAt = composeInstant(dto.date, dto.checkIn);
      attendance.checkInSource = AttendanceSource.MANUAL;
    }
    const checkOut = dto.checkOut || null;
    if (tehranClock(attendance.checkOutAt) !== checkOut) {
      attendance.checkOutAt = checkOut
        ? composeInstant(dto.date, checkOut)
        : null;
      attendance.checkOutSource = checkOut ? AttendanceSource.MANUAL : null;
    }

    if (attendance.status !== AttendanceStatus.ON_LEAVE) {
      attendance.status = AttendanceStatus.PRESENT;
    }
    attendance.editedBy = editor;
    attendance.editedAt = new Date();
    attendance.editNote = dto.note;

    await this.em.persistAndFlush(attendance);
    return attendance;
  }
}
