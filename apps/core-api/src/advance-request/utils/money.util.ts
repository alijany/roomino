import { BadRequestException } from '@nestjs/common';
import { RIAL_PER_TOMAN } from '../advance-request.constants';

/**
 * MikroORM maps `types.bigint` to a string on read to avoid precision loss.
 * Advance amounts fit comfortably in a JS safe integer, so we normalise on
 * the way out and reject anything that would silently lose precision.
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

export function assertSafeAmount(amountRial: number, field = 'مبلغ'): void {
  if (!Number.isInteger(amountRial) || amountRial <= 0) {
    throw new BadRequestException(
      `${field} باید یک عدد صحیح بزرگ‌تر از صفر باشد`,
    );
  }

  if (amountRial > Number.MAX_SAFE_INTEGER) {
    throw new BadRequestException(`${field} بیش از حد مجاز است`);
  }
}

/** Persian-digit Toman string used in notification bodies. */
export function formatTomanFa(rial: number): string {
  return `${Math.round(rial / RIAL_PER_TOMAN).toLocaleString('fa-IR')} تومان`;
}
