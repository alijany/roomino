import { BadRequestException, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * Encryption for the one genuinely secret field in this module: the login a
 * requester supplies so Finance can top up an account on a website.
 *
 * Design decisions worth keeping:
 *  - **Fails closed.** With no `FINANCE_SECRET_KEY` configured, storing a
 *    credential is refused rather than silently written in plaintext. A
 *    password in a column that Finance and admins query freely is a real
 *    liability, not a formality.
 *  - **Short-lived.** `PaymentRequestService` clears the ciphertext once the
 *    request reaches a terminal state. The secret exists for as long as the
 *    payment needs it and no longer.
 *  - Never travels in list views, the CSV export, or notifications — only
 *    through the explicit reveal endpoint, to the requester or Finance.
 *
 * AES-256-GCM: authenticated, so a tampered ciphertext fails to decrypt rather
 * than returning garbage.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const logger = new Logger('FinanceSecret');

function key(): Buffer | null {
  const raw = process.env.FINANCE_SECRET_KEY;

  if (!raw || raw.trim().length < 16) {
    return null;
  }

  // Hashed to exactly 32 bytes so any sufficiently long passphrase works,
  // rather than demanding the operator produce base64 of an exact length.
  return createHash('sha256').update(raw.trim()).digest();
}

export function secretsAvailable(): boolean {
  return key() !== null;
}

/** `iv.ciphertext.tag`, all base64url. */
export function encryptSecret(plain: string): string {
  const k = key();

  if (!k) {
    throw new BadRequestException(
      'ذخیره رمز عبور در این سرور فعال نیست. آن را جداگانه به تیم مالی بدهید.',
    );
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, k, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);

  return [
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.');
}

/**
 * Returns null rather than throwing when the value cannot be read — a rotated
 * key should degrade to "this secret is no longer readable", not break the
 * whole request detail page.
 */
export function decryptSecret(stored?: string | null): string | null {
  const k = key();

  if (!stored || !k) {
    return null;
  }

  try {
    const [ivPart, dataPart, tagPart] = stored.split('.');
    if (!ivPart || !dataPart || !tagPart) return null;

    const decipher = createDecipheriv(
      ALGORITHM,
      k,
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    logger.warn(
      'رمزگشایی اطلاعات ورود ناموفق بود — احتمالاً کلید تغییر کرده است',
    );
    return null;
  }
}
