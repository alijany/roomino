import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'; // Import Cache
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import parsePhoneNumberFromString from 'libphonenumber-js';
import { Role } from 'src/roles/roles.constants';
import { InvitationStatus } from 'src/roles/roles.entity';
import { SiteSettingsService } from 'src/settings/site-settings.service';
import { SmsService } from 'src/sms/sms.service';
import { UserEntity } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { JwtPayload } from './types/jwt-payload.interface';
import { RefreshJwtPayload } from './types/refresh-jwt-payload.interface';

/** Wrong codes allowed per sent code before it is thrown away. */
const OTP_MAX_ATTEMPTS = 5;
/** A new code for the same number only after this long. */
const OTP_RESEND_SECONDS = 60;
/** Codes sent to one number per hour. */
const OTP_MAX_PER_HOUR = 5;
/** Never shorter than this, whatever the environment says. */
const OTP_MIN_LENGTH = 6;

const tooMany = (message: string) =>
  new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
    private readonly siteSettings: SiteSettingsService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Generates access and refresh tokens for a user
   */
  private generateTokens(user: UserEntity, deviceId?: string) {
    const accessPayload: JwtPayload = {
      username: user.phone,
      sub: user.id.toString(),
      isAdmin: user.roles.exists((role) => role.role === Role.ADMIN),
    };

    const refreshPayload: RefreshJwtPayload = {
      sub: user.id.toString(),
      type: 'refresh',
      deviceId,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('REFRESH_TOKEN_TTL', '30d'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Validates and decodes a refresh token
   */
  private async validateRefreshToken(
    refreshToken: string,
  ): Promise<RefreshJwtPayload> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }) as RefreshJwtPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Refreshes access and refresh tokens
   */
  async refreshTokens(
    refreshToken: string,
    deviceId?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: Omit<UserEntity, 'password'>;
  }> {
    // Validate refresh token
    const payload = await this.validateRefreshToken(refreshToken);

    // Get user
    const user = await this.userService.findOne(
      { id: Number(payload.sub) },
      {
        populate: ['roles'] as never,
      },
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    this.assertCooperating(user);

    // Generate new tokens
    const tokens = this.generateTokens(user, deviceId);

    if ('password' in user) {
      delete user.password;
    }

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Generates a secure random OTP code of a specified length.
   *
   * @param length The desired length of the OTP code (typically 6 or 8).
   * @returns A string representing the OTP code.
   */
  generateOtp(length = 6) {
    if (length <= 0) {
      throw new Error('طول رمز یکبار مصرف باید یک عدد صحیح مثبت باشد.');
    }
    // Calculate the minimum and maximum values for the desired length
    // e.g., for length 6, min = 100000, max = 999999
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;

    // Generate a cryptographically secure random integer within the range
    // Adding 1 to max because crypto.randomInt's upper bound is exclusive
    const otp = crypto.randomInt(min, max + 1);

    // Convert to string and return
    return otp.toString();
  }

  /** Someone whose cooperation is over cannot sign in. */
  private assertCooperating(user?: { cooperationEnded?: boolean } | null) {
    if (user?.cooperationEnded) {
      throw new ForbiddenException(
        'همکاری شما با مجموعه پایان یافته است و امکان ورود ندارید.',
      );
    }
  }

  /** New accounts are refused while the admin or the CEO has closed registration. */
  private async assertRegistrationOpen() {
    if (await this.siteSettings.get('registrationClosed')) {
      throw new ForbiddenException(
        'ثبت‌نام کاربر جدید فعلاً بسته است. با مدیر تماس بگیرید.',
      );
    }
  }

  /**
   * Send OTP for login/registration
   * Charges the user themselves (if they exist)
   */
  async sendOtp(phoneNumber: string): Promise<{ isNewUser: boolean }> {
    const validatedPhone = parsePhoneNumberFromString(phoneNumber, 'IR');

    if (!validatedPhone?.isValid()) {
      throw new BadRequestException('فرمت شماره تلفن نامعتبر است.');
    }

    const existingUser = await this.userService.findOne({
      phone: validatedPhone.number,
    });
    this.assertCooperating(existingUser);
    const isNewUser = !existingUser;
    if (isNewUser) await this.assertRegistrationOpen();

    const cacheKey = `otp:${validatedPhone.number}`;
    await this.assertMaySendOtp(validatedPhone.number);
    const length = Math.max(
      OTP_MIN_LENGTH,
      +this.configService.get('OTP_LENGTH', OTP_MIN_LENGTH) || OTP_MIN_LENGTH,
    );
    const otp = this.generateOtp(length);
    const ttl = +this.configService.get('OTP_EXPIRATION', 300); // 5 minutes

    try {
      await this.cacheManager.set(cacheKey, otp, ttl * 1000);
      // A fresh code starts a fresh count of wrong guesses.
      await this.cacheManager.del(`otp-attempts:${validatedPhone.number}`);

      if (process.env.NODE_ENV === 'development') {
        console.log(`OTP for ${validatedPhone.number}: ${otp}`);
        return { isNewUser };
      }

      const result = await this.smsService.sendSms(
        `رمز یکبار مصرف شما: ${otp}`,
        validatedPhone.nationalNumber,
      );

      if (!result.success) {
        throw Error();
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new InternalServerErrorException(
        'ارسال رمز یکبار مصرف ناموفق بود.',
      );
    }

    return { isNewUser };
  }

  /**
   * Verify OTP from cache with custom cache key
   * @param cacheKey The cache key where OTP is stored
   * @param otp The OTP to verify
   * @returns The validated phone number
   */
  async verifyOtpFromCache(cacheKey: string, otp: string): Promise<string> {
    return this.checkOtp(cacheKey, otp, (message, locked) =>
      locked ? tooMany(message) : new BadRequestException(message),
    );
  }

  /**
   * One code, a few guesses: each wrong guess is counted, and past
   * `OTP_MAX_ATTEMPTS` the code is thrown away, so a four-to-six digit code
   * cannot be walked through. A right guess removes the code.
   */
  private async checkOtp(
    cacheKey: string,
    otp: string,
    fail: (message: string, locked?: boolean) => Error,
  ): Promise<string> {
    const attemptsKey = cacheKey.replace(/^otp:/, 'otp-attempts:');
    const storedOtp = await this.cacheManager.get<string>(cacheKey);

    if (!storedOtp) {
      throw fail('رمز یکبار مصرف منقضی شده یا یافت نشد.');
    }

    if (typeof otp !== 'string' || storedOtp !== otp) {
      const attempts =
        ((await this.cacheManager.get<number>(attemptsKey)) ?? 0) + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.cacheManager.del(cacheKey);
        await this.cacheManager.del(attemptsKey);
        throw fail('تعداد تلاش‌ها بیش از حد مجاز بود. دوباره کد بگیرید.', true);
      }
      await this.cacheManager.set(attemptsKey, attempts, 600 * 1000);
      throw fail('رمز یکبار مصرف نامعتبر است.');
    }

    await this.cacheManager.del(cacheKey);
    await this.cacheManager.del(attemptsKey);
    return storedOtp;
  }

  /** One number gets a code a minute, and a few an hour — texts cost money and annoy. */
  private async assertMaySendOtp(phone: string) {
    const coolKey = `otp-cool:${phone}`;
    if (await this.cacheManager.get(coolKey)) {
      throw tooMany('کد تایید به تازگی ارسال شده است. کمی صبر کنید.');
    }
    const hourKey = `otp-hour:${phone}`;
    const sent = (await this.cacheManager.get<number>(hourKey)) ?? 0;
    if (sent >= OTP_MAX_PER_HOUR) {
      throw tooMany(
        'تعداد درخواست کد برای این شماره بیش از حد مجاز است. بعداً تلاش کنید.',
      );
    }
    await this.cacheManager.set(coolKey, 1, OTP_RESEND_SECONDS * 1000);
    await this.cacheManager.set(hourKey, sent + 1, 3600 * 1000);
  }

  /**
   * Generate a phone verification token after successful OTP verification
   * Token is short-lived and proves the phone was verified
   */
  async generateVerificationToken(
    scope: string,
    phoneNumber: string,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const cacheKey = `phone-verification:${token}`;
    const data = JSON.stringify({ scope, phoneNumber });
    const ttl = 600; // 10 minutes

    await this.cacheManager.set(cacheKey, data, ttl * 1000);
    return token;
  }

  /**
   * Validate a phone verification token
   * Returns the verified phone number if valid, scoped to projectId
   */
  async validateVerificationToken(
    token: string,
    expectedScope: string,
  ): Promise<string | null> {
    const cacheKey = `phone-verification:${token}`;
    const data = await this.cacheManager.get<string>(cacheKey);

    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.scope === expectedScope) {
        // Token is valid, delete it (one-time use)
        await this.cacheManager.del(cacheKey);
        return parsed.phoneNumber;
      }
    } catch {
      return null;
    }

    return null;
  }

  async verifyOtpForPhoneChange(
    phoneNumber: string,
    otp: string,
  ): Promise<boolean> {
    const validatedPhone = parsePhoneNumberFromString(phoneNumber, 'IR');
    if (!validatedPhone?.isValid()) {
      throw new BadRequestException('فرمت شماره تلفن نامعتبر است.');
    }

    const cacheKey = `otp:${validatedPhone.number}`;
    await this.verifyOtpFromCache(cacheKey, otp);
    return true;
  }

  async verifyOtp(
    phoneNumber: string,
    otp: string,
    deviceId?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: Omit<UserEntity, 'password'>;
    isNewUser?: boolean;
  }> {
    const validatedPhone = parsePhoneNumberFromString(phoneNumber, 'IR');
    if (!validatedPhone?.isValid()) {
      throw new BadRequestException('فرمت شماره تلفن نامعتبر است.');
    }

    const cacheKey = `otp:${validatedPhone.number}`;
    await this.checkOtp(cacheKey, otp, (message, locked) =>
      locked ? tooMany(message) : new UnauthorizedException(message),
    );

    // Find or create user by phone number
    let user = await this.userService.findOne(
      { phone: validatedPhone.number },
      {
        populate: ['roles'] as never,
      },
    );

    this.assertCooperating(user);
    let isNewUser = false;
    if (!user) {
      await this.assertRegistrationOpen();
      // If user doesn't exist, create a basic profile.
      // You might want more details or a different flow here.
      try {
        user = await this.userService.create({
          phone: validatedPhone.number,
          firstName,
          lastName,
          isApproved: false,
          roles: [
            {
              role: Role.USER,
              invitationStatus: InvitationStatus.ACCEPTED,
            },
          ],
        });

        isNewUser = true;
      } catch (error) {
        console.error('Error creating user during OTP verification:', error);
        throw new InternalServerErrorException(
          'پردازش حساب کاربری ناموفق بود.',
        );
      }
    }

    if (!user.isApproved) {
      throw new ForbiddenException({
        message:
          'حساب کاربری شما هنوز توسط مدیر تایید نشده است. لطفاً منتظر تایید مدیر بمانید.',
        errorCode: 'PENDING_APPROVAL',
      });
    }

    // Generate JWT tokens
    const tokens = this.generateTokens(user, deviceId);

    return {
      ...tokens,
      user,
      isNewUser, // Flag for first-time user message
    };
  }
}
