import { Injectable } from '@nestjs/common';
import { CSV_BOM, csvRow, toCsv } from '../../libs/utils/csv.util';
import {
  AttendanceMode,
  AttendanceModeLabels,
  AttendanceSource,
  DayStatusLabels,
} from '../attendance.constants';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { resolveMode } from '../utils/attendance-mode.util';
import { formatHm } from '../utils/attendance-time.util';
import { Period, ReportService } from './report.service';

const hm = (minutes: number) => (minutes ? formatHm(minutes) : '');

const sourceLabel = (source?: AttendanceSource | null) =>
  source === AttendanceSource.MANUAL ? 'دستی' : source ? 'GPS' : '';

/**
 * CSV exports (with a BOM so Excel reads the Persian), matching the columns
 * of Tesmino's Excel exports.
 */
@Injectable()
export class AttendanceExportService {
  constructor(private readonly reports: ReportService) {}

  async performanceCsv(
    profiles: EmployeeProfileEntity[],
    period: Period,
    pending: Map<number, number>,
  ): Promise<string> {
    const rows = await this.reports.summaries(profiles, period);

    return toCsv(
      [
        { key: 'code', header: 'کد پرسنلی' },
        { key: 'name', header: 'نام' },
        { key: 'workplace', header: 'محل کار' },
        { key: 'mode', header: 'نوع حضور' },
        { key: 'presentDays', header: 'روز حضور' },
        { key: 'worked', header: 'کارکرد' },
        { key: 'required', header: 'موظفی' },
        { key: 'balance', header: 'اختلاف' },
        { key: 'delay', header: 'تاخیر' },
        { key: 'early', header: 'تعجیل' },
        { key: 'absentDays', header: 'روز غیبت' },
        { key: 'incompleteDays', header: 'روز ناقص' },
        { key: 'leave', header: 'مرخصی' },
        { key: 'remote', header: 'دورکاری' },
        { key: 'overtime', header: 'اضافه کار' },
        { key: 'pending', header: 'درخواست در انتظار' },
      ],
      rows.map(({ profile, summary: s }) => {
        // «بدون ثبت» has no hours — those cells stay empty.
        const hours = resolveMode(profile) !== AttendanceMode.UNTRACKED;
        const time = (minutes: number) => (hours ? formatHm(minutes) : '');
        return {
          code: profile.user.personnelCode,
          name: profile.user.name,
          workplace: profile.workplace?.name,
          mode: AttendanceModeLabels[resolveMode(profile)],
          presentDays: s.presentDays,
          worked: time(s.worked),
          required: time(s.required),
          balance: time(s.balance),
          delay: time(s.delayMinutes),
          early: time(s.earlyMinutes),
          absentDays: s.absentDays,
          incompleteDays: s.incompleteDays,
          leave: formatHm(s.leaveMinutes),
          remote: formatHm(s.remoteMinutes),
          overtime: formatHm(s.overtime),
          pending: pending.get(profile.id) ?? 0,
        };
      }),
    );
  }

  /** One person's period: a summary block, a blank line, then every day. */
  async employeeCsv(
    profile: EmployeeProfileEntity,
    period: Period,
  ): Promise<string> {
    const {
      days,
      summary: s,
      attendanceMode,
    } = await this.reports.report(profile, period);

    // «بدون ثبت» has no times: the period is counted in days, one row each.
    if (attendanceMode === AttendanceMode.UNTRACKED) {
      return this.dailyCsv(profile, period, days, s);
    }

    const header = [
      csvRow([
        'پرسنل',
        profile.user.name ?? '',
        'کد پرسنلی',
        profile.user.personnelCode,
        'دوره',
        period.label,
      ]),
      csvRow([
        'کارکرد',
        formatHm(s.worked),
        'موظفی تا امروز',
        formatHm(s.required),
        'اختلاف',
        formatHm(s.balance),
      ]),
      csvRow([
        'تاخیر',
        formatHm(s.delayMinutes),
        'تعجیل',
        formatHm(s.earlyMinutes),
        'اضافه کار',
        formatHm(s.overtime),
      ]),
      csvRow([
        'روزهای غیبت',
        s.absentDays,
        'روزهای ناقص',
        s.incompleteDays,
        'مرخصی',
        formatHm(s.leaveMinutes),
      ]),
      csvRow([
        'روزهای دورکاری',
        s.remoteDays,
        'دورکاری',
        formatHm(s.remoteMinutes),
      ]),
      '',
    ].join('\r\n');

    const table = toCsv(
      [
        { key: 'date', header: 'تاریخ' },
        { key: 'weekday', header: 'روز' },
        { key: 'shift', header: 'شیفت' },
        { key: 'checkIn', header: 'ورود' },
        { key: 'checkOut', header: 'خروج' },
        { key: 'worked', header: 'کارکرد' },
        { key: 'delay', header: 'تاخیر' },
        { key: 'early', header: 'تعجیل' },
        { key: 'overtime', header: 'اضافه کار' },
        { key: 'leave', header: 'مرخصی' },
        { key: 'remote', header: 'دورکاری' },
        { key: 'status', header: 'وضعیت' },
        { key: 'inSource', header: 'منبع ورود' },
        { key: 'outSource', header: 'منبع خروج' },
        { key: 'mode', header: 'نوع حضور' },
        { key: 'declared', header: 'اعلام حضور' },
      ],
      days
        .filter((d) => !d.isFuture)
        .map((d) => ({
          date: d.jalali,
          weekday: d.weekday,
          shift:
            d.holiday ??
            (d.shiftStart ? `${d.shiftStart} - ${d.shiftEnd}` : 'تعطیل'),
          checkIn: d.checkIn ?? '',
          checkOut: d.checkOut ?? '',
          worked: hm(d.worked),
          delay: hm(d.delay),
          early: hm(d.early),
          overtime: hm(d.overtime),
          leave: hm(d.leaveMinutes),
          remote: hm(d.remote),
          status: DayStatusLabels[d.status],
          inSource: sourceLabel(d.attendance?.checkInSource),
          outSource: sourceLabel(d.attendance?.checkOutSource),
          mode: AttendanceModeLabels[d.mode],
          declared:
            d.mode === AttendanceMode.UNTRACKED && d.declared ? 'بله' : '',
        })),
    ).slice(CSV_BOM.length);

    return `${CSV_BOM}${header}\r\n${table}`;
  }

  /** The same, for someone in «بدون ثبت»: days present, absent, away — no times. */
  private dailyCsv(
    profile: EmployeeProfileEntity,
    period: Period,
    days: Awaited<ReturnType<ReportService['report']>>['days'],
    s: Awaited<ReturnType<ReportService['report']>>['summary'],
  ): string {
    const header = [
      csvRow([
        'پرسنل',
        profile.user.name ?? '',
        'کد پرسنلی',
        profile.user.personnelCode,
        'دوره',
        period.label,
      ]),
      csvRow([
        'حضور',
        `${s.attendedDays} از ${s.requiredDays} روز`,
        'غیبت',
        s.absentDays,
        'اعلام‌نشده',
        s.undeclaredDays,
      ]),
      csvRow([
        'مرخصی (روز)',
        s.leaveDays,
        'ماموریت (روز)',
        s.missionDays,
        'دورکاری (روز)',
        s.remoteDays,
      ]),
      '',
    ].join('\r\n');

    const table = toCsv(
      [
        { key: 'date', header: 'تاریخ' },
        { key: 'weekday', header: 'روز' },
        { key: 'status', header: 'وضعیت' },
        { key: 'declared', header: 'اعلام حضور' },
      ],
      days
        .filter((d) => !d.isFuture)
        .map((d) => ({
          date: d.jalali,
          weekday: d.weekday,
          status: d.undeclared
            ? 'غایب (اعلام نشده)'
            : DayStatusLabels[d.status],
          declared: d.declared ? (d.declaredRemote ? 'دورکاری' : 'بله') : '',
        })),
    ).slice(CSV_BOM.length);

    return `${CSV_BOM}${header}\r\n${table}`;
  }
}
