import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'; // Added UnauthorizedException
import { NormalizeNumbersPipe } from 'src/libs/utils/pipe.normalizeNumbers';
import { UserEntity } from '../user/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { RefreshTokenDto, SendOtpDto, VerifyOtpDto } from './dtos/otp.dto'; // Import OTP DTOs and RefreshTokenDto
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdatePhoneDto } from 'src/user/dtos/update-profile.dto';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: UserEntity) {
    return user;
  }

  // --- OTP Endpoints ---

  @Post('otp/send')
  async sendOtp(@Body(NormalizeNumbersPipe) sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.phoneNumber);
  }

  @Post('otp/verify')
  async verifyOtp(@Body(NormalizeNumbersPipe) verifyOtpDto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(
      verifyOtpDto.phoneNumber,
      verifyOtpDto.otp,
      verifyOtpDto.deviceId,
      verifyOtpDto.firstName,
      verifyOtpDto.lastName,
    );

    // Return access token, refresh token and user info
    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      isNewUser: result.isNewUser,
      user: result.user,
    };
  }

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const refreshToken = refreshTokenDto.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshTokens(
      refreshToken,
      refreshTokenDto.deviceId,
    );

    // Return new access token, refresh token and user info
    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: result.user,
    };
  }

  @Patch('profile/phone')
  async updatePhoneNumber(
    @CurrentUser() user: UserEntity,
    @Body() updatePhoneDto: UpdatePhoneDto,
  ) {
    // Verify OTP first
    await this.authService.verifyOtpForPhoneChange(
      updatePhoneDto.phoneNumber,
      updatePhoneDto.otp,
    );

    // Update phone number
    const updatedUser = await this.userService.updatePhoneNumber(
      user.id,
      updatePhoneDto.phoneNumber,
    );

    return updatedUser;
  }
}
