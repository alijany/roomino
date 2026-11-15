import * as ExcelJS from 'exceljs';
import { dateToJalali } from './attendance-time.util';

const jalali = (date: string) => {
  const { year, month, day } = dateToJalali(date);
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(
    2,
    '0',
  )}`;
};

/** Minutes → hours with up to two decimals, as a number the sheet can add up. */
const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

interface ReportItem {
  user: { name?: string | null; phone?: string | null };
  personnelCode: string | null;
  days: number;
  totalMinutes: number;
  doneMinutes: number;
  remainingMinutes: number;
  byType: { normal: number; thursday: number; friday: number; holiday: number };
  /** Rial; null when pay is hidden or a day has no salary on record. */
  amount: number | null;
  missingSalary: boolean;
}

/** Rial → toman, as people read amounts. */
const toman = (rial: number) => Math.round(rial / 10);

/** The on-call hours report as a right-to-left workbook, one row per person, in hours. */
export async function onCallReportWorkbook(
  period: { start: string; end: string },
  multipliers: {
    normal: number;
    thursday: number;
    friday: number;
    holiday: number;
  },
  canSeePay: boolean,
  items: ReportItem[],
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('گزارش کشیک', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 3 }],
  });
  sheet.columns = [
    { key: 'no', width: 7 },
    { key: 'name', width: 24 },
    { key: 'code', width: 12 },
    { key: 'days', width: 11 },
    { key: 'normal', width: 14 },
    { key: 'thursday', width: 14 },
    { key: 'friday', width: 14 },
    { key: 'holiday', width: 14 },
    { key: 'done', width: 14 },
    { key: 'remaining', width: 14 },
    { key: 'total', width: 14 },
    ...(canSeePay ? [{ key: 'amount', width: 18 }] : []),
  ];
  const lastCol = canSeePay ? 'L' : 'K';

  sheet.mergeCells(`A1:${lastCol}1`);
  sheet.getCell('A1').value = `گزارش ساعات کشیک — ${jalali(
    period.start,
  )} تا ${jalali(period.end)}`;
  sheet.getCell('A1').font = { bold: true, size: 13 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.mergeCells(`A2:${lastCol}2`);
  const x = (n: number) => n.toLocaleString('en-US');
  sheet.getCell('A2').value = `ضریب هر ساعت نسبت به ساعتی حقوق توافقی: عادی ${x(
    multipliers.normal,
  )} · پنج‌شنبه ${x(multipliers.thursday)} · جمعه ${x(
    multipliers.friday,
  )} · تعطیل ${x(multipliers.holiday)}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  const head = sheet.addRow([
    'ردیف',
    'نام',
    'کد پرسنلی',
    'تعداد روز',
    'روز عادی (ساعت)',
    'پنج‌شنبه (ساعت)',
    'جمعه (ساعت)',
    'تعطیل (ساعت)',
    'سپری‌شده (ساعت)',
    'باقی‌مانده (ساعت)',
    'جمع (ساعت)',
    ...(canSeePay ? ['مبلغ (تومان)'] : []),
  ]);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' },
  };
  head.alignment = { horizontal: 'center', vertical: 'middle' };

  items.forEach((item, i) =>
    sheet.addRow([
      i + 1,
      item.user.name ?? item.user.phone ?? '',
      item.personnelCode ?? '',
      item.days,
      hours(item.byType.normal),
      hours(item.byType.thursday),
      hours(item.byType.friday),
      hours(item.byType.holiday),
      hours(item.doneMinutes),
      hours(item.remainingMinutes),
      hours(item.totalMinutes),
      ...(canSeePay
        ? [item.missingSalary ? 'حقوق ثبت نشده' : toman(item.amount ?? 0)]
        : []),
    ]),
  );

  const last = sheet.rowCount;
  const sum = sheet.addRow([
    '',
    'جمع کل',
    '',
    ...[
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      ...(canSeePay ? ['L'] : []),
    ].map((col) => ({
      formula: `SUM(${col}4:${col}${last})`,
    })),
  ]);
  sum.font = { bold: true };
  sheet.eachRow((row, n) => {
    if (n >= 4) row.alignment = { horizontal: 'center' };
  });

  return Buffer.from(await book.xlsx.writeBuffer());
}
