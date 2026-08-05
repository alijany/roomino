import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'; // Import Cache
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import parsePhoneNumberFromString from 'libphonenumber-js';
import { Role } from 'src/roles/roles.constants';
import { InvitationStatus } from 'src/roles/roles.entity';
import { SmsService } from 'src/sms/sms.service';
import { UserEntity } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { JwtPayload } from './types/jwt-payload.interface';
import { RefreshJwtPayload } from './types/refresh-jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
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
    const isNewUser = !existingUser;

    const cacheKey = `otp:${validatedPhone.number}`;
    const otp = this.generateOtp(+this.configService.get('OTP_LENGTH', 4));
    const ttl = +this.configService.get('OTP_EXPIRATION', 300); // 5 minutes

    try {
      await this.cacheManager.set(cacheKey, otp, ttl * 1000);

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
    const storedOtp = await this.cacheManager.get<string>(cacheKey);

    if (!storedOtp) {
      throw new BadRequestException('رمز یکبار مصرف منقضی شده یا یافت نشد.');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('رمز یکبار مصرف نامعتبر است.');
    }

    // OTP is valid, remove it from cache
    await this.cacheManager.del(cacheKey);
    return storedOtp;
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
    const storedOtp = await this.cacheManager.get<string>(cacheKey);

    if (!storedOtp) {
      throw new UnauthorizedException('رمز یکبار مصرف منقضی شده یا یافت نشد.');
    }

    if (storedOtp !== otp) {
      throw new UnauthorizedException('رمز یکبار مصرف نامعتبر است.');
    }

    // OTP is valid, remove it from cache
    await this.cacheManager.del(cacheKey);

    // Find or create user by phone number
    let user = await this.userService.findOne(
      { phone: validatedPhone.number },
      {
        populate: ['roles'] as never,
      },
    );

    let isNewUser = false;
    if (!user) {
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
