/**
 * Money formatting.
 *
 * The canonical unit everywhere — API, database, component props — is the
 * **rial**. Toman is a display convention only (1 Toman = 10 Rial) and is
 * produced here, never stored.
 *
 * Getting this backwards is a 10× error in every figure on screen, so no other
 * module should divide or multiply by ten.
 */

export const RIAL_PER_TOMAN = 10;

export interface FormatMoneyOptions {
  /** Append the unit word. Default true. */
  withUnit?: boolean;
  /** Text to show for null/zero. Default '—'. */
  emptyText?: string;
  /** Latin digits instead of Persian — for inputs and LTR islands. */
  latinDigits?: boolean;
}

/**
 * Formats an amount held in **rial** as Toman with Persian digits.
 *
 * @example formatMoney(12_000_000) // "۱٬۲۰۰٬۰۰۰ تومان"
 */
export function formatMoney(
  rial: number | undefined | null,
  options: FormatMoneyOptions = {}
): string {
  const { withUnit = true, emptyText = '—', latinDigits = false } = options;

  if (rial === undefined || rial === null || Number.isNaN(rial)) {
    return emptyText;
  }

  const toman = Math.round(rial / RIAL_PER_TOMAN);
  const digits = toman.toLocaleString(latinDigits ? 'en-US' : 'fa-IR');

  return withUnit ? `${digits} تومان` : digits;
}

/**
 * Formats a foreign amount held in **minor units** (cents) with its currency
 * code. Used alongside formatMoney when a request was raised in USD/EUR.
 *
 * @example formatForeign(1250, 'USD') // "۱۲٫۵ USD"
 */
export function formatForeign(
  amountMinor: number | undefined | null,
  currency: string,
  options: { latinDigits?: boolean } = {}
): string {
  if (amountMinor === undefined || amountMinor === null) {
    return '—';
  }

  const major = amountMinor / 100;
  const digits = major.toLocaleString(options.latinDigits ? 'en-US' : 'fa-IR', {
    maximumFractionDigits: 2,
  });

  return `${digits} ${currency}`;
}

/**
 * Short Toman for axis ticks and dense tiles, where a full thousands-separated
 * number would collide with its neighbour.
 *
 * @example formatMoneyCompact(125_000_000_000) // "۱۲٫۵ میلیارد تومان"
 */
export function formatMoneyCompact(
  rial: number | undefined | null,
  options: { withUnit?: boolean } = {}
): string {
  const { withUnit = true } = options;

  if (rial === undefined || rial === null || Number.isNaN(rial)) {
    return '—';
  }

  const toman = Math.round(rial / RIAL_PER_TOMAN);
  const abs = Math.abs(toman);

  const scale =
    abs >= 1_000_000_000
      ? { divisor: 1_000_000_000, suffix: 'میلیارد' }
      : abs >= 1_000_000
        ? { divisor: 1_000_000, suffix: 'میلیون' }
        : abs >= 1_000
          ? { divisor: 1_000, suffix: 'هزار' }
          : { divisor: 1, suffix: '' };

  const value = toman / scale.divisor;
  const digits = value.toLocaleString('fa-IR', {
    maximumFractionDigits: scale.divisor === 1 ? 0 : 1,
  });

  const parts = [digits, scale.suffix, withUnit ? 'تومان' : ''].filter(Boolean);
  return parts.join(' ');
}

export const toRialFromToman = (toman: number): number => toman * RIAL_PER_TOMAN;
export const toTomanFromRial = (rial: number): number =>
  Math.round(rial / RIAL_PER_TOMAN);

/**
 * Legacy helper kept for existing call sites.
 * @deprecated Use formatMoney — it takes rial, this takes Toman.
 */
export function formatCost(cost: number | undefined | null): string {
  if (!cost || cost === 0) {
    return '—';
  }
  return `${cost.toLocaleString('fa-IR')} ت`;
}

/**
 * @deprecated Paired with formatCost; use formatMoney instead.
 */
export function formatCostSubtext(
  cost: number | undefined | null,
  hasDataText: string = 'تومان',
  noDataText: string = 'هنوز هزینه‌ای نیست'
): string {
  if (!cost || cost === 0) {
    return noDataText;
  }
  return hasDataText;
}
