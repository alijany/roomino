import * as redisStore from '@keyv/redis'; // Import redisStore
import { CacheModule } from '@nestjs/cache-manager'; // Import CacheModule
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule
import { JwtModule } from '@nestjs/jwt';
import { NormalizeNumbersPipe } from 'src/libs/utils/pipe.normalizeNumbers';
import { SettingsModule } from 'src/settings/settings.module';
import { SmsModule } from 'src/sms/sms.module';
import { RolesModule } from '../roles/roles.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      // Configure CacheModule
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        uri: `redis://${configService.get('REDIS_HOST')}:${configService.get(
          'REDIS_PORT',
        )}`,
        password: configService.get('REDIS_PASSWORD'),
        // ttl: 300000, // Optional: Default TTL for cache entries (e.g., 5 minutes in ms)
      }),
      inject: [ConfigService],
      isGlobal: true, // Make CacheModule global if used elsewhere, or keep local
    }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('ACCESS_TOKEN_TTL', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    SmsModule,
    RolesModule,
    SettingsModule,
  ],
  providers: [
    AuthService,
    NormalizeNumbersPipe,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
