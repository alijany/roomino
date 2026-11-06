import {
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Body,
} from '@nestjs/common';
import { TelegramBotService } from './services/telegram-bot.service';

/** Telegram → us. Authenticated by the secret token set with `setWebhook`. */
@Controller('telegram')
export class TelegramController {
  constructor(private readonly bot: TelegramBotService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string,
    @Body() update: never,
  ) {
    if (secret !== this.bot.webhookSecret) throw new ForbiddenException();
    await this.bot.handleUpdate(update);
    return { ok: true };
  }
}
