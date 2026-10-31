import { periodLabel, rial } from '../financial.util';
import { Payslip } from './payroll.types';

/** The slip as plain text, for a chat or an email. */
export function payslipSummary(slip: Payslip): string {
  const lines: Array<[string, number]> = [
    ['جمع حقوق و مزایا', slip.gross],
    ['جمع کسورات', slip.totalDeductions],
    ...(slip.extras ? ([['اضافات', slip.extras]] as Array<[string, number]>) : []),
    ['خالص پرداختی', slip.net],
  ];
  return [
    `فیش حقوقی ${periodLabel(slip.period)} — ${slip.user.name ?? ''}`,
    ...(slip.status === 'final' ? [] : ['(پیش‌نویس)']),
    ...lines.map(([label, value]) => `${label}: ${rial(value)} ریال`),
  ].join('\n');
}
