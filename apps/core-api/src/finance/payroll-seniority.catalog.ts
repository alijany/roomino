/**
 * Cumulative seniority base (پایه سنوات تجمیعی) per Jalali year: the daily
 * amount, in rial, for a worker with N whole years of service — index N,
 * 0 to 30. Each year's amount is the previous year's raised by that year's
 * increase plus the year's new base, so it is not «years × this year's base».
 *
 * 1405: bidbarg.net/blog/base-annuities, worked out by them from the 1405
 * wage circular (45% raise, base 166,667); Social Security had not published
 * its own table yet — replace these figures when it does.
 */
export const SENIORITY_TABLES: Record<number, number[]> = {
  1405: [
    0, 166_667, 302_967, 436_947, 600_403, 798_184, 980_142, 1_143_906,
    1_275_733, 1_384_264, 1_504_088, 1_583_026, 1_673_014, 1_725_661, 1_761_041,
    1_793_471, 1_821_234, 1_850_658, 1_870_336, 1_890_997, 1_912_693, 1_936_559,
    1_957_977, 1_976_879, 1_991_789, 2_004_572, 2_015_417, 2_024_591, 2_030_201,
    2_034_946, 2_039_736,
  ],
};

/**
 * A year's table from the previous year's: someone with N years now had N−1
 * last year, so last year's figure for N−1 is raised by the year's increase for
 * the other wage levels (`raisePercent`) and the year's new one-year base is
 * added — e.g. 1405, 4 years: 299,128 (3 years in 1404) × 1.45 + 166,667 = 600,403.
 */
export function deriveSeniorityTable(
  previous: number[],
  raisePercent: number,
  base: number,
): number[] {
  return previous.map((_, years) =>
    years === 0
      ? 0
      : Math.round(previous[years - 1] * (1 + raisePercent / 100) + base),
  );
}

/**
 * The daily seniority base for `years` whole years of service. Past the
 * table's last year its last figure holds. With no table for the year it is
 * the plain `perYear × years`.
 */
export function seniorityDailyFor(
  table: number[] | undefined,
  years: number,
  perYear: number,
): number {
  if (years <= 0) return 0;
  if (!table) return perYear * years;
  return table[Math.min(Math.floor(years), table.length - 1)];
}
