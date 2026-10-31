import { OFFICIAL_PAYROLL } from '../payroll-setting.catalog';
import { defaultInclusion } from '../payroll-setting.catalog';
import { calculatePayroll, PayrollInput } from './payroll-calculator.util';

/**
 * Rows of the «Payroll» sheet for 1405/07 (amounts there are in toman, here
 * rial are compared as toman ±1). Every person is a gross-agreement full-time
 * worker with no overtime, so this pins the base, housing, seniority,
 * insurance, the progressive tax and the cost and accrual figures.
 *
 * [code, agreed, start, seniority, gross, workerInsurance, tax, net, employerInsurance, accrual, totalCost]
 */
const SHEET: Array<
  [
    string,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
> = [
  [
    'F02',
    31000000,
    140201,
    1500030,
    37700030,
    2485002,
    0,
    35215028,
    8165007,
    6864723,
    52729760,
  ],
  [
    'F03',
    33000000,
    140201,
    1500030,
    39700030,
    2625002,
    0,
    37075028,
    8625007,
    7031390,
    55356427,
  ],
  [
    'F04',
    30500000,
    140201,
    1500030,
    37200030,
    2450002,
    0,
    34750028,
    8050007,
    6823057,
    52073094,
  ],
  [
    'F05',
    16189162,
    140201,
    1500030,
    22889192,
    1448243,
    0,
    21440949,
    4758514,
    4172293,
    31819999,
  ],
  [
    'M01',
    39375000,
    140201,
    1500030,
    46075030,
    3071252,
    519753,
    42484025,
    10091257,
    7562640,
    63728927,
  ],
  [
    'M04',
    28750000,
    140301,
    1000020,
    34950020,
    2292501,
    0,
    32657519,
    7532505,
    6635556,
    49118080,
  ],
  [
    'M05',
    20000000,
    140407,
    500010,
    25700010,
    1645001,
    0,
    24055009,
    5405002,
    5041668,
    36146680,
  ],
  [
    'O01',
    44500000,
    140201,
    1500030,
    51200030,
    3430002,
    1022003,
    46748025,
    11270007,
    7989723,
    70459760,
  ],
  [
    'O02',
    32700000,
    140201,
    1500030,
    39400030,
    2604002,
    0,
    36796028,
    8556007,
    7006390,
    54962427,
  ],
  [
    'O04',
    35000000,
    140201,
    1500030,
    41700030,
    2765002,
    91003,
    38844025,
    9085007,
    7198057,
    57983094,
  ],
  [
    'O13',
    28000000,
    140504,
    0,
    33200000,
    2170000,
    0,
    31030000,
    7130000,
    6489721,
    46819721,
  ],
  [
    'O14',
    36000000,
    140506,
    0,
    41200000,
    2730000,
    42000,
    38428000,
    8970000,
    7156388,
    57326388,
  ],
  [
    'T01',
    80000000,
    140201,
    1500030,
    86700030,
    5915002,
    4751504,
    76033523,
    19435007,
    10948057,
    117083094,
  ],
  [
    'T02',
    53767560,
    140201,
    1500030,
    60467590,
    4078731,
    1930224,
    54458635,
    13401546,
    8762020,
    82631156,
  ],
  [
    'T03',
    55906200,
    140201,
    1500030,
    62606230,
    4228436,
    2139811,
    56237983,
    13893433,
    8940240,
    85439903,
  ],
  [
    'T04',
    49872900,
    140201,
    1500030,
    56572930,
    3806105,
    1548547,
    51218278,
    12505774,
    8437465,
    77516169,
  ],
];

const settings = OFFICIAL_PAYROLL[1405];
const inclusion = defaultInclusion();
const PERIOD = 140507;

/** A plain month: gross agreement, a full month, nothing extra. */
const input = (over: Partial<PayrollInput> = {}): PayrollInput => ({
  agreed: 0,
  agreement: 'gross',
  fraction: 1,
  married: false,
  children: 0,
  seniorityYears: 0,
  insured: true,
  insuranceType: 'worker',
  taxExempt: false,
  overtimeHours: 0,
  nightHours: 0,
  holidayHours: 0,
  deficitHours: 0,
  missionDays: 0,
  bonus: 0,
  advance: 0,
  loan: 0,
  otherDeductions: 0,
  payEidi: false,
  settle: false,
  yearFraction: 1,
  leaveRemainDays: 0,
  ...over,
});

/** Whole years and the part of the year worked, as the sheet counts them. */
function service(start: number) {
  const [y, m] = [Math.floor(PERIOD / 100), PERIOD % 100];
  const [sy, sm] = [Math.floor(start / 100), start % 100];
  return { years: Math.max(Math.floor(((y - sy) * 12 + (m - sm)) / 12), 0) };
}

const toman = (rial: number) => Math.round(rial / 10);

describe("calculatePayroll — the sheet's 1405/07 rows", () => {
  it.each(SHEET)(
    '%s',
    (
      _code,
      agreed,
      start,
      seniority,
      gross,
      ins,
      tax,
      net,
      employer,
      accrual,
      cost,
    ) => {
      const r = calculatePayroll(
        settings,
        inclusion,
        input({ agreed: agreed * 10, seniorityYears: service(start).years }),
      );
      const near = (got: number, want: number) =>
        expect(Math.abs(toman(got) - want)).toBeLessThanOrEqual(1);
      near(r.seniority, seniority);
      near(r.gross, gross);
      near(r.workerInsurance, ins);
      near(r.tax, tax);
      near(r.net, net);
      near(r.employerInsurance, employer);
      near(r.accrual, accrual);
      near(r.totalCost, cost);
    },
  );
});

describe('calculatePayroll — what the sheet had no data for', () => {
  const base = 330_000_000; // 33,000,000 toman
  const hourly = base / 220;

  it('pays overtime at 1.4× the hourly wage, inside the exemption', () => {
    const low = 250_000_000; // 25,000,000 toman: well under the 40M exemption
    const plain = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: low, seniorityYears: 3 }),
    );
    const withOt = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: low, seniorityYears: 3, overtimeHours: 10 }),
    );
    expect(withOt.overtime).toBe(Math.round((low / 220) * 1.4 * 10));
    expect(withOt.gross - plain.gross).toBe(withOt.overtime);
    // The official setting taxes overtime with the rest, so under the exemption nothing is due.
    expect(settings.taxOvertimeRate).toBe(0);
    expect(withOt.tax).toBe(0);
  });

  it('taxes overtime apart at the fixed rate when a year sets one', () => {
    const apart = { ...settings, taxOvertimeRate: 10 };
    const withOt = calculatePayroll(
      apart,
      inclusion,
      input({ agreed: 250_000_000, seniorityYears: 3, overtimeHours: 10 }),
    );
    expect(withOt.tax).toBe(Math.round(withOt.overtime * 0.1));
  });

  it('counts overtime toward the exemption when it is taxed with the rest', () => {
    const big = 480_000_000; // 48,000,000 toman, over the exemption already
    const plain = calculatePayroll(settings, inclusion, input({ agreed: big }));
    const withOt = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: big, overtimeHours: 10 }),
    );
    // Taxed with the rest it falls in the 10% band, less the insurance share it also raises.
    const added = withOt.tax - plain.tax;
    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThan(Math.round(withOt.overtime * 0.1));
  });

  it('adds only the premium for night hours and 1.4× for holiday hours', () => {
    const r = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, nightHours: 8, holidayHours: 4 }),
    );
    expect(r.overtime).toBe(Math.round(hourly * 0.35 * 8 + hourly * 1.4 * 4));
  });

  it('takes a deficit off at the hourly wage, and off the insurable wage too', () => {
    const plain = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base }),
    );
    const short = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, deficitHours: 5 }),
    );
    expect(short.deficit).toBe(Math.round(hourly * 5));
    expect(short.workerInsurance).toBeLessThan(plain.workerInsurance);
    expect(short.net).toBeLessThan(plain.net);
  });

  it('pays a mission day at the daily wage, outside insurance and tax by default', () => {
    const plain = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base }),
    );
    const r = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, missionDays: 3 }),
    );
    expect(r.mission).toBe(Math.round((base / 30) * 3));
    expect(r.workerInsurance).toBe(plain.workerInsurance);
    expect(r.tax).toBe(plain.tax);
  });

  it('prorates by days worked', () => {
    const r = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, fraction: 15 / 30 }),
    );
    expect(r.base).toBe(Math.round(base / 2));
    expect(r.housing).toBe(Math.round(settings.housing / 2));
  });

  it('adds marriage and child allowances', () => {
    const r = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, married: true, children: 2 }),
    );
    expect(r.marriage).toBe(settings.marriage);
    expect(r.child).toBe(settings.child * 2);
  });

  it('charges no insurance to an uninsured person, and no unemployment share to a board member', () => {
    const none = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, insured: false }),
    );
    expect(none.workerInsurance).toBe(0);
    expect(none.employerInsurance).toBe(0);
    const worker = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base }),
    );
    const board = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, insuranceType: 'board' }),
    );
    expect(worker.employerInsurance - board.employerInsurance).toBe(
      Math.round(
        Math.min(worker.workerInsurance / 0.07, settings.insCeiling) * 0.03,
      ),
    );
  });

  it('pays no tax to someone exempt', () => {
    const r = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: 800_000_000, taxExempt: true }),
    );
    expect(r.tax).toBe(0);
  });

  it('caps the insurable wage at the ceiling', () => {
    const r = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: 2_000_000_000 }),
    );
    expect(r.workerInsurance).toBe(Math.round(settings.insCeiling * 0.07));
  });

  it('pays eidi and severance when asked, in proportion to the year worked', () => {
    const r = calculatePayroll(
      settings,
      inclusion,
      input({
        agreed: base,
        seniorityYears: 3,
        payEidi: true,
        yearFraction: 0.5,
      }),
    );
    const daily = base / 30;
    expect(r.eidi).toBe(
      Math.round(Math.min(60 * daily, settings.eidiCap) * 0.5),
    );
    expect(r.severance).toBe(
      Math.round(30 * (daily + settings.seniorityDaily * 3) * 0.5),
    );
    // Both are paid out, not part of the running cost.
    const plain = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, seniorityYears: 3 }),
    );
    expect(r.totalCost).toBe(plain.totalCost);
  });

  it('buys out unused leave only on settlement', () => {
    const asked = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, leaveRemainDays: 5 }),
    );
    expect(asked.leaveBuyout).toBe(0);
    const settled = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base, leaveRemainDays: 5, settle: true }),
    );
    expect(settled.leaveBuyout).toBe(
      Math.round(((base + settings.housing + settings.bon) / 30) * 5),
    );
    expect(settled.eidi).toBeGreaterThan(0);
  });

  it('subtracts advances, loan instalments and other deductions from the net', () => {
    const plain = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: base }),
    );
    const r = calculatePayroll(
      settings,
      inclusion,
      input({
        agreed: base,
        advance: 1_000_000,
        loan: 2_000_000,
        otherDeductions: 500_000,
      }),
    );
    expect(plain.net - r.net).toBe(3_500_000);
  });

  it('works backwards from a net agreement', () => {
    const target = 300_000_000; // 30,000,000 toman take-home
    const r = calculatePayroll(
      settings,
      inclusion,
      input({ agreed: target, agreement: 'net', seniorityYears: 3 }),
    );
    expect(Math.abs(r.net - target)).toBeLessThanOrEqual(10);
    expect(r.base).toBeGreaterThan(0);
  });

  describe('a hybrid salary', () => {
    const minimum = settings.minMonthly;
    const packageOf = (r: ReturnType<typeof calculatePayroll>) =>
      r.base + r.housing + r.bon + r.marriage + r.child + r.seniority;

    it('puts the legal package through the rules and pays the rest of the agreed salary apart', () => {
      const agreed = 300_000_000;
      const r = calculatePayroll(
        settings,
        inclusion,
        input({ agreed, hybrid: true }),
      );
      expect(r.base).toBe(minimum);
      expect(r.extras).toBe(agreed - packageOf(r));
      // The insurance is on the package only, and the whole agreed salary is paid.
      expect(r.workerInsurance).toBe(Math.round((r.base + r.housing) * 0.07));
      expect(r.tax).toBe(0);
      expect(r.net).toBe(agreed - r.workerInsurance);
      expect(r.totalCost).toBe(agreed + r.employerInsurance + r.accrual);
    });

    it('pays only the package when the agreed salary does not reach it', () => {
      // 20,000,000 toman agreed; the package (married, one child) is 23,988,105 toman.
      const r = calculatePayroll(
        settings,
        inclusion,
        input({
          agreed: 200_000_000,
          married: true,
          children: 1,
          hybrid: true,
        }),
      );
      expect(packageOf(r)).toBe(239_881_050);
      expect(r.extras).toBe(0);
      expect(r.gross).toBe(239_881_050);
      expect(r.net).toBe(239_881_050 - r.workerInsurance);
    });

    it('with a net agreement, makes the take-home exactly the agreed salary', () => {
      const agreed = 300_000_000; // 30,000,000 toman in hand
      const r = calculatePayroll(
        settings,
        inclusion,
        input({ agreed, agreement: 'net', hybrid: true }),
      );
      expect(r.base).toBe(minimum);
      const packageNet = r.gross - r.workerInsurance - r.tax;
      expect(r.extras).toBe(agreed - packageNet);
      expect(r.net).toBe(agreed);
    });

    it('with a net agreement below the package net, pays the package net and no extras', () => {
      const r = calculatePayroll(
        settings,
        inclusion,
        input({ agreed: 100_000_000, agreement: 'net', hybrid: true }),
      );
      expect(r.extras).toBe(0);
      expect(r.base).toBe(minimum);
      expect(r.net).toBe(r.gross - r.workerInsurance - r.tax);
    });

    it('is ordinary when the agreed salary is at or under the minimum wage', () => {
      const plain = calculatePayroll(
        settings,
        inclusion,
        input({ agreed: minimum }),
      );
      const hybrid = calculatePayroll(
        settings,
        inclusion,
        input({ agreed: minimum, hybrid: true }),
      );
      expect(hybrid).toEqual(plain);
    });

    it('prorates the package and the extras by the days worked', () => {
      const agreed = 300_000_000;
      const r = calculatePayroll(
        settings,
        inclusion,
        input({ agreed, hybrid: true, fraction: 0.5 }),
      );
      expect(r.base).toBe(Math.round(minimum / 2));
      expect(r.extras).toBe(Math.round(agreed / 2 - packageOf(r)));
    });
  });

  it('flags a base wage below the legal minimum', () => {
    expect(
      calculatePayroll(settings, inclusion, input({ agreed: 100_000_000 }))
        .meetsMinimum,
    ).toBe(false);
    expect(
      calculatePayroll(settings, inclusion, input({ agreed: base }))
        .meetsMinimum,
    ).toBe(true);
  });
});

describe('calculatePayroll — a settlement with no month worked', () => {
  const base = 330_000_000;
  const r = calculatePayroll(
    settings,
    inclusion,
    input({
      agreed: base,
      fraction: 0,
      settle: true,
      yearFraction: 0.5,
      leaveRemainDays: 6,
      seniorityYears: 2,
    }),
  );

  it('pays no month, only the eidi, severance and leave shares', () => {
    expect(r.base).toBe(0);
    expect(r.housing).toBe(0);
    expect(r.eidi).toBeGreaterThan(0);
    expect(r.severance).toBeGreaterThan(0);
    expect(r.leaveBuyout).toBeGreaterThan(0);
    expect(Number.isFinite(r.net)).toBe(true);
    expect(r.net).toBeGreaterThan(0);
  });
});
