import { PayrollInclusion } from './entities/payroll-setting.entity';

/**
 * What the payroll parameters are, and what the law says for the years we
 * know. The database holds only the values an organisation actually keeps per
 * year; labels, groups, derivations and official figures live here.
 */

export type PayrollKind = 'money' | 'percent' | 'int';

export type PayrollKey =
  | 'minDaily'
  | 'minMonthly'
  | 'seniorityDaily'
  | 'housing'
  | 'bon'
  | 'marriage'
  | 'child'
  | 'insCeiling'
  | 'taxExempt'
  | 'taxLimit1'
  | 'taxLimit2'
  | 'taxLimit3'
  | 'taxLimit4'
  | 'taxEidiExempt'
  | 'eidiCap'
  | 'insWorker'
  | 'insEmployer'
  | 'insUnemployment'
  | 'taxRate1'
  | 'taxRate2'
  | 'taxRate3'
  | 'taxRate4'
  | 'taxRate5'
  | 'taxOvertimeRate'
  | 'taxInsuranceFraction'
  | 'taxNoncash'
  | 'overtimeRate'
  | 'nightRate'
  | 'holidayRate'
  | 'missionRate'
  | 'eidiDays'
  | 'severanceDays'
  | 'leaveDays'
  | 'leaveCarryDays'
  | 'weekHours'
  | 'wageHours';

export type PayrollValues = Record<PayrollKey, number>;

export interface PayrollParameter {
  key: PayrollKey;
  group: string;
  label: string;
  kind: PayrollKind;
  /** Computed from other parameters unless set by hand. */
  derive?: {
    from: PayrollKey[];
    label: string;
    compute: (v: PayrollValues) => number;
  };
  /** The source marks this one «با حسابدار تأیید شود». */
  needsReview?: boolean;
  hint?: string;
}

export const PAYROLL_GROUPS = [
  'پایه‌ی مزد',
  'مزایای ماهانه',
  'بیمه‌ی تأمین اجتماعی',
  'مالیات حقوق',
  'عیدی، سنوات و مرخصی',
  'ساعت کار و اضافه‌کار',
] as const;

const [BASE, ALLOW, INS, TAX, EIDI, HOURS] = PAYROLL_GROUPS;

export const PAYROLL_PARAMETERS: PayrollParameter[] = [
  {
    key: 'minDaily',
    group: BASE,
    label: 'حداقل مزد روزانه',
    kind: 'money',
    hint: 'مصوب شورای عالی کار',
  },
  {
    key: 'minMonthly',
    group: BASE,
    label: 'حداقل حقوق ماهانه',
    kind: 'money',
    derive: {
      from: ['minDaily'],
      label: '۳۰ × مزد روزانه',
      compute: (v) => 30 * v.minDaily,
    },
  },
  {
    key: 'seniorityDaily',
    group: BASE,
    label: 'پایه سنوات (روزانه)',
    kind: 'money',
    hint: 'برای هر سال سابقه نزد کارفرما',
  },

  { key: 'housing', group: ALLOW, label: 'حق مسکن', kind: 'money' },
  { key: 'bon', group: ALLOW, label: 'بن کارگری', kind: 'money' },
  { key: 'marriage', group: ALLOW, label: 'حق تأهل', kind: 'money' },
  {
    key: 'child',
    group: ALLOW,
    label: 'حق اولاد (هر فرزند)',
    kind: 'money',
    derive: {
      from: ['minDaily'],
      label: '۳ × مزد روزانه',
      compute: (v) => 3 * v.minDaily,
    },
    needsReview: true,
    hint: 'شرایط تعداد فرزند را با حسابدار چک کنید',
  },

  { key: 'insWorker', group: INS, label: 'سهم بیمه‌ی کارگر', kind: 'percent' },
  {
    key: 'insEmployer',
    group: INS,
    label: 'سهم بیمه‌ی کارفرما',
    kind: 'percent',
  },
  {
    key: 'insUnemployment',
    group: INS,
    label: 'بیمه‌ی بیکاری (سهم کارفرما)',
    kind: 'percent',
  },
  {
    key: 'insCeiling',
    group: INS,
    label: 'سقف دستمزد مشمول بیمه',
    kind: 'money',
    derive: {
      from: ['minMonthly'],
      label: '۷ × حداقل ماهانه',
      compute: (v) => 7 * v.minMonthly,
    },
  },

  {
    key: 'taxExempt',
    group: TAX,
    label: 'معافیت مالیاتی ماهانه',
    kind: 'money',
  },
  { key: 'taxLimit1', group: TAX, label: 'سقف پله‌ی ۱', kind: 'money' },
  { key: 'taxRate1', group: TAX, label: 'نرخ پله‌ی ۱', kind: 'percent' },
  { key: 'taxLimit2', group: TAX, label: 'سقف پله‌ی ۲', kind: 'money' },
  { key: 'taxRate2', group: TAX, label: 'نرخ پله‌ی ۲', kind: 'percent' },
  { key: 'taxLimit3', group: TAX, label: 'سقف پله‌ی ۳', kind: 'money' },
  { key: 'taxRate3', group: TAX, label: 'نرخ پله‌ی ۳', kind: 'percent' },
  { key: 'taxLimit4', group: TAX, label: 'سقف پله‌ی ۴', kind: 'money' },
  { key: 'taxRate4', group: TAX, label: 'نرخ پله‌ی ۴', kind: 'percent' },
  {
    key: 'taxRate5',
    group: TAX,
    label: 'نرخ مازاد بر سقف پله‌ی ۴',
    kind: 'percent',
    hint: 'محاسبه پلکانی است',
  },
  {
    key: 'taxOvertimeRate',
    group: TAX,
    label: 'نرخ مالیات اضافه‌کار (جدا)',
    kind: 'percent',
    needsReview: true,
    hint: 'جدا از پلکان با نرخ ثابت',
  },
  {
    key: 'taxInsuranceFraction',
    group: TAX,
    label: 'بخش کسرشدنی بیمه‌ی کارگر از درآمد مشمول',
    kind: 'percent',
    needsReview: true,
  },
  {
    key: 'taxNoncash',
    group: TAX,
    label: 'بخش معاف مزایای غیرنقدی',
    kind: 'percent',
  },
  {
    key: 'taxEidiExempt',
    group: TAX,
    label: 'معافیت عیدی و پاداش',
    kind: 'money',
    derive: {
      from: ['taxExempt'],
      label: 'برابر معافیت ماهانه',
      compute: (v) => v.taxExempt,
    },
  },

  {
    key: 'eidiDays',
    group: EIDI,
    label: 'عیدی و پاداش (روز مزد)',
    kind: 'int',
  },
  {
    key: 'eidiCap',
    group: EIDI,
    label: 'سقف عیدی',
    kind: 'money',
    derive: {
      from: ['minDaily'],
      label: '۹۰ × مزد روزانه',
      compute: (v) => 90 * v.minDaily,
    },
  },
  {
    key: 'severanceDays',
    group: EIDI,
    label: 'سنوات پایان کار (روز در سال)',
    kind: 'int',
  },
  { key: 'leaveDays', group: EIDI, label: 'مرخصی سالانه (روز)', kind: 'int' },
  {
    key: 'leaveCarryDays',
    group: EIDI,
    label: 'حداکثر مرخصی قابل ذخیره (روز)',
    kind: 'int',
  },

  { key: 'weekHours', group: HOURS, label: 'ساعت کار هفتگی', kind: 'int' },
  {
    key: 'wageHours',
    group: HOURS,
    label: 'ساعت مبنای مزد ساعتی',
    kind: 'int',
    hint: 'مزد ساعتی = مزد ماهانه ÷ این عدد',
  },
  {
    key: 'overtimeRate',
    group: HOURS,
    label: 'اضافه‌کار',
    kind: 'percent',
    hint: 'درصد بیشتر از مزد هر ساعت',
  },
  {
    key: 'nightRate',
    group: HOURS,
    label: 'شب‌کاری',
    kind: 'percent',
    hint: '۲۲ تا ۶ صبح',
  },
  {
    key: 'holidayRate',
    group: HOURS,
    label: 'کار در جمعه و تعطیل',
    kind: 'percent',
  },
  {
    key: 'missionRate',
    group: HOURS,
    label: 'فوق‌العاده‌ی مأموریت (هر روز)',
    kind: 'percent',
    hint: 'درصد مزد روزانه',
  },
];

export const PAYROLL_PARAMETER_BY_KEY = new Map(
  PAYROLL_PARAMETERS.map((p) => [p.key, p]),
);

/** Items that carry a «مشمول بیمه / مالیات» treatment. */
export const PAYROLL_INCLUSION_ITEMS: Array<{
  key: string;
  label: string;
  default: PayrollInclusion;
  needsReview?: boolean;
}> = [
  {
    key: 'baseWage',
    label: 'مزد پایه',
    default: { insurable: true, taxable: true },
  },
  {
    key: 'seniority',
    label: 'پایه سنوات',
    default: { insurable: true, taxable: true },
  },
  {
    key: 'housing',
    label: 'حق مسکن',
    default: { insurable: true, taxable: true },
  },
  {
    key: 'bon',
    label: 'بن کارگری',
    default: { insurable: false, taxable: true },
  },
  {
    key: 'marriage',
    label: 'حق تأهل',
    default: { insurable: true, taxable: true },
  },
  {
    key: 'child',
    label: 'حق اولاد',
    default: { insurable: false, taxable: true },
  },
  {
    key: 'overtime',
    label: 'اضافه‌کار',
    default: { insurable: true, taxable: true },
  },
  {
    key: 'night',
    label: 'شب‌کاری',
    default: { insurable: true, taxable: true },
  },
  {
    key: 'holiday',
    label: 'کار در جمعه و تعطیل',
    default: { insurable: true, taxable: true },
  },
  {
    key: 'mission',
    label: 'فوق‌العاده‌ی مأموریت',
    default: { insurable: false, taxable: false },
    needsReview: true,
  },
  {
    key: 'leavePay',
    label: 'بازخرید مرخصی',
    default: { insurable: true, taxable: true },
  },
];

export function defaultInclusion(): Record<string, PayrollInclusion> {
  return Object.fromEntries(
    PAYROLL_INCLUSION_ITEMS.map((i) => [i.key, { ...i.default }]),
  );
}

/**
 * The approved figures per Jalali year: money in rial, percents as percents.
 * 1405: شورای عالی کار (۱۴۰۴/۱۲/۲۴) and the cabinet's housing decree
 * (۱۴۰۵/۰۲/۰۶); tax and insurance as published for the year.
 */
export const OFFICIAL_PAYROLL: Record<number, PayrollValues> = {
  1405: {
    minDaily: 5_541_850,
    minMonthly: 166_255_500,
    seniorityDaily: 166_670,
    housing: 30_000_000,
    bon: 22_000_000,
    marriage: 5_000_000,
    child: 16_625_550,
    insCeiling: 1_163_788_500,
    taxExempt: 400_000_000,
    taxLimit1: 800_000_000,
    taxLimit2: 1_000_000_000,
    taxLimit3: 1_200_000_000,
    taxLimit4: 1_400_000_000,
    taxEidiExempt: 400_000_000,
    eidiCap: 498_766_500,
    insWorker: 7,
    insEmployer: 20,
    insUnemployment: 3,
    taxRate1: 10,
    taxRate2: 15,
    taxRate3: 20,
    taxRate4: 25,
    taxRate5: 30,
    taxOvertimeRate: 0,
    // 2/7 of the worker's insurance is deducted from taxable income.
    taxInsuranceFraction: 28.5714,
    taxNoncash: 17,
    overtimeRate: 40,
    nightRate: 35,
    holidayRate: 40,
    missionRate: 100,
    eidiDays: 60,
    severanceDays: 30,
    leaveDays: 26,
    leaveCarryDays: 9,
    weekHours: 44,
    wageHours: 220,
  },
};
