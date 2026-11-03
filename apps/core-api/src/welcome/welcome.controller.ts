import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsInt } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../user/user.entity';
import { WelcomeService } from './welcome.service';

class DismissDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  userIds: number[];
}

/** The dashboard's welcome of new colleagues, for every signed-in staff member. */
@Controller('welcome')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WelcomeController {
  constructor(private readonly welcome: WelcomeService) {}

  @Get()
  mine(@CurrentUser() user: UserEntity) {
    return this.welcome.forUser(user);
  }

  @Post('dismiss')
  @HttpCode(204)
  async dismiss(@CurrentUser() user: UserEntity, @Body() dto: DismissDto) {
    await this.welcome.dismiss(dto.userIds, user);
  }

  @Post(':userId/greet')
  @HttpCode(204)
  async greet(
    @CurrentUser() user: UserEntity,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.welcome.greet(userId, user);
  }
}
