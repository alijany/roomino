import * as ExcelJS from 'exceljs';
import { dateToJalali } from '../attendance/utils/attendance-time.util';
import { RoleLabels } from '../roles/roles.constants';
import { UserEntity } from './user.entity';

/** Civil date `2026-11-03` → Jalali `1405/08/12`; empty stays empty. */
function jalali(date?: string | null): string {
  if (!date) return '';
  const { year, month, day } = dateToJalali(date);
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(
    2,
    '0',
  )}`;
}

function statusOf(user: UserEntity, today: string): string {
  if (!user.isApproved) return 'در انتظار تایید';
  if (user.cooperationEnded || (user.endDate && user.endDate < today)) {
    return 'پایان همکاری';
  }
  if (user.probationEndDate && user.probationEndDate >= today) return 'آزمایشی';
  return 'فعال';
}

/** The users list as a right-to-left workbook, one row per person. */
export async function usersWorkbook(
  users: UserEntity[],
  today: string,
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('کاربران', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = [
    { header: 'ردیف', key: 'no', width: 7 },
    { header: 'نام', key: 'firstName', width: 16 },
    { header: 'نام خانوادگی', key: 'lastName', width: 20 },
    { header: 'نام پدر', key: 'fatherName', width: 14 },
    { header: 'کد پرسنلی', key: 'code', width: 12 },
    { header: 'کد ملی', key: 'nationalId', width: 14 },
    { header: 'موبایل', key: 'phone', width: 15 },
    { header: 'ایمیل', key: 'email', width: 24 },
    { header: 'تاریخ تولد', key: 'birthDate', width: 12 },
    { header: 'تیم', key: 'team', width: 18 },
    { header: 'عنوان شغلی', key: 'jobTitle', width: 22 },
    { header: 'نقش‌ها', key: 'roles', width: 20 },
    { header: 'شروع همکاری', key: 'hireDate', width: 13 },
    { header: 'پایان دورهٔ آزمایشی', key: 'probationEnd', width: 16 },
    { header: 'پایان همکاری', key: 'endDate', width: 13 },
    { header: 'وضعیت', key: 'status', width: 14 },
  ];

  users.forEach((user, i) =>
    sheet.addRow({
      no: i + 1,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      fatherName: user.fatherName ?? '',
      code: user.personnelCode ?? '',
      nationalId: user.nationalId ?? '',
      phone: user.phone,
      email: user.email ?? '',
      birthDate: jalali(user.birthDate),
      team: user.team && 'name' in user.team ? user.team.name : '',
      jobTitle: user.jobTitle ?? '',
      roles: user.roles
        .getItems()
        .filter((r) => r.role !== 'user')
        .map((r) => RoleLabels[r.role])
        .join('، '),
      hireDate: jalali(user.hireDate),
      probationEnd: jalali(user.probationEndDate),
      endDate: jalali(user.endDate),
      status: statusOf(user, today),
    }),
  );

  const head = sheet.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  head.alignment = { horizontal: 'center', vertical: 'middle' };
  // Codes and numbers are text, so leading zeros and long digits survive.
  for (const key of ['code', 'nationalId', 'phone']) {
    sheet.getColumn(key).numFmt = '@';
  }
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: sheet.columnCount } };

  return Buffer.from(await book.xlsx.writeBuffer());
}
