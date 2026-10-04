import { EntityManager } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TEHRAN_TZ } from '../attendance.constants';
import { currentJalali } from '../utils/attendance-time.util';
import { HolidayService } from './holiday.service';

/**
 * Scheduled work. Like finance's jobs: Tehran time, safe to run twice, and
 * errors are logged rather than thrown.
 */
@Injectable()
export class AttendanceScheduleService {
  private readonly logger = new Logger(AttendanceScheduleService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly holidays: HolidayService,
  ) {}

  /** 1st of each month, 03:00 Tehran — refresh this year's and next year's holidays. */
  @Cron('0 3 1 * *', { name: 'attendance-holidays', timeZone: TEHRAN_TZ })
  async syncHolidays(): Promise<void> {
    const { year } = currentJalali();

    for (const target of [year, year + 1]) {
      try {
        const result = await this.holidays.syncOfficial(target, this.em.fork());
        this.logger.log(
          `تعطیلات ${target}: ${result.added} مورد جدید، ${result.updated} به‌روزرسانی (${result.source})`,
        );
      } catch (error) {
        this.logger.error(
          `همگام‌سازی تعطیلات ${target} ناموفق بود: ${error?.message}`,
        );
      }
    }
  }
}
