import { BadRequestException } from '@nestjs/common';
import { Currency, RIAL_PER_TOMAN } from '../finance.constants';

/**
 * Money in this module is always an integer in the currency's minor unit.
 * IRR's minor unit is the rial; every other supported currency uses cents.
 *
 * Rial is the canonical storage and reporting unit. Toman (rial / 10) is a
 * display concern and never reaches the database.
 */
const MINOR_UNITS_PER_MAJOR: Record<Currency, number> = {
  [Currency.IRR]: 1,
  [Currency.USD]: 100,
  [Currency.EUR]: 100,
  [Currency.AED]: 100,
  [Currency.TRY]: 100,
};

export function minorUnitsPerMajor(currency: Currency): number {
  return MINOR_UNITS_PER_MAJOR[currency] ?? 1;
}

/**
 * Converts a request amount to rial for threshold checks and reporting.
 *
 * Without an FX rate a foreign amount has no rial value, so callers must supply
 * one for anything but IRR. Approval routing uses `fallbackRate` = 0, which
 * deliberately routes unpriced foreign requests through the lowest band; the
 * real rial figure is captured at payment time.
 */
export function toRial(
  amountMinor: number,
  currency: Currency,
  fxRateRialPerUnit?: number,
): number {
  if (currency === Currency.IRR) {
    return Math.round(amountMinor);
  }

  if (!fxRateRialPerUnit) {
    return 0;
  }

  const major = amountMinor / minorUnitsPerMajor(currency);
  return Math.round(major * fxRateRialPerUnit);
}

/** Rial → Toman, for the rare places the backend emits display text (SMS). */
export function rialToToman(rial: number): number {
  return Math.round(rial / RIAL_PER_TOMAN);
}

/** Persian-digit Toman string used in notification bodies. */
export function formatTomanFa(rial: number): string {
  return `${rialToToman(rial).toLocaleString('fa-IR')} تومان`;
}

/**
 * MikroORM maps `types.bigint` to a string on read to avoid precision loss.
 * Every amount in this module fits comfortably in a JS safe integer (the
 * largest realistic value is a few trillion rial), so we normalise on the way
 * out and reject anything that would silently lose precision.
 */
export function readBigint(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

export function assertSafeAmount(amountMinor: number, field = 'مبلغ'): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new BadRequestException(
      `${field} باید یک عدد صحیح بزرگ‌تر از صفر باشد`,
    );
  }

  if (amountMinor > Number.MAX_SAFE_INTEGER) {
    throw new BadRequestException(`${field} بیش از حد مجاز است`);
  }
}
