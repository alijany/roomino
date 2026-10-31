import * as ExcelJS from 'exceljs';

export interface BankRow {
  no: number;
  lineId: number;
  name: string | null;
  personnelCode: string | null;
  /** Empty when the person has none on file; the row is still made. */
  sheba: string;
  kind: 'salary' | 'extras';
  /** Rial. */
  amount: number;
  description: string;
  status: 'draft' | 'final';
}

const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/** `140507` → «مهر ۱۴۰۵». */
export function periodName(period: number): string {
  const year = Math.floor(period / 100);
  const month = MONTHS[(period % 100) - 1] ?? '';
  return `${month} ${year.toLocaleString('fa-IR', { useGrouping: false })}`;
}

/** The transfer list as a right-to-left workbook, one row per transfer, with a total. */
export async function bankWorkbook(
  period: number,
  rows: BankRow[],
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet(`خروجی بانک ${period}`, {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = [
    { header: 'ردیف', key: 'no', width: 7 },
    { header: 'نام و نام خانوادگی', key: 'name', width: 26 },
    { header: 'کد پرسنلی', key: 'code', width: 12 },
    { header: 'شماره شبا', key: 'sheba', width: 30 },
    { header: 'مبلغ (ریال)', key: 'amount', width: 18 },
    { header: 'شرح', key: 'description', width: 28 },
    { header: 'نوع', key: 'kind', width: 10 },
    { header: 'وضعیت', key: 'status', width: 12 },
  ];
  rows.forEach((r) =>
    sheet.addRow({
      no: r.no,
      name: r.name ?? '',
      code: r.personnelCode ?? '',
      sheba: r.sheba,
      amount: r.amount,
      description: r.description,
      kind: r.kind === 'salary' ? 'حقوق' : 'اضافات',
      status: r.status === 'final' ? 'قطعی' : 'پیش‌نویس',
    }),
  );
  sheet.addRow({
    description: 'جمع',
    amount: rows.reduce((sum, r) => sum + r.amount, 0),
  });

  const head = sheet.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  head.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getColumn('amount').numFmt = '#,##0';
  // The sheba and code are text, so a long number is never turned into 1E+24.
  sheet.getColumn('sheba').numFmt = '@';
  sheet.getColumn('code').numFmt = '@';
  const last = sheet.getRow(sheet.rowCount);
  last.font = { bold: true };

  return Buffer.from(await book.xlsx.writeBuffer());
}
