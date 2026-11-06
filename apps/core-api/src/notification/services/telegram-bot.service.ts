import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { UserEntity } from '../../user/user.entity';

const LINK_TTL_MINUTES = 15;

interface TelegramUpdate {
  update_id: number;
  message?: { text?: string; chat: { id: number; type: string } };
}

/**
 * The Telegram bot: users press «اتصال تلگرام» in the panel, open the link it
 * gives and press Start; the bot then stores their chat id on the user.
 * Updates arrive by webhook when `TELEGRAM_WEBHOOK_URL` is set, otherwise by
 * long polling (works anywhere with outbound access).
 */
@Injectable()
export class TelegramBotService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(TelegramBotService.name);
  private polling = false;

  constructor(
    private readonly config: ConfigService,
    private readonly em: EntityManager,
  ) {}

  private get token(): string | undefined {
    return this.config.get<string>('TELEGRAM_BOT_TOKEN') || undefined;
  }

  /** Base URL of the Bot API; point it at a relay when Telegram is blocked. */
  get apiBase(): string {
    return (
      this.config.get<string>('TELEGRAM_API_BASE') || 'https://api.telegram.org'
    );
  }

  get username(): string | undefined {
    return this.config.get<string>('TELEGRAM_BOT_USERNAME') || undefined;
  }

  get enabled(): boolean {
    return !!this.token && !!this.username;
  }

  get webhookSecret(): string {
    return createHmac('sha256', this.secret()).update('webhook').digest('hex');
  }

  private secret(): string {
    return this.config.get<string>('JWT_SECRET') || 'telegram-link';
  }

  // ── linking ────────────────────────────────────────────────────────────

  private sign(body: string): string {
    return createHmac('sha256', this.secret())
      .update(body)
      .digest('base64url')
      .slice(0, 16);
  }

  /** A short signed `start` payload: `<userId>_<expiry>_<signature>`. */
  createLinkUrl(userId: number): string {
    const expires = Math.floor(Date.now() / 60000) + LINK_TTL_MINUTES;
    const body = `${userId}_${expires.toString(36)}`;
    return `https://t.me/${this.username}?start=${body}_${this.sign(body)}`;
  }

  private readLinkCode(code: string): number | null {
    const [id, expires, sig] = code.split('_');
    if (!id || !expires || !sig) return null;
    const expected = this.sign(`${id}_${expires}`);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (parseInt(expires, 36) < Math.floor(Date.now() / 60000)) return null;
    const userId = Number(id);
    return Number.isInteger(userId) ? userId : null;
  }

  async status(userId: number) {
    const user = await this.em.fork().findOne(UserEntity, { id: userId });
    return {
      enabled: this.enabled,
      connected: !!user?.chatId,
      botUsername: this.username ?? null,
    };
  }

  async disconnect(userId: number) {
    await this.em.fork().nativeUpdate(UserEntity, { id: userId }, {
      chatId: null,
    } as never);
    return { connected: false };
  }

  // ── receiving updates ──────────────────────────────────────────────────

  async onApplicationBootstrap() {
    if (!this.token || process.env.NODE_ENV === 'test') return;
    const webhookUrl = this.config.get<string>('TELEGRAM_WEBHOOK_URL');
    try {
      if (webhookUrl) {
        await this.call('setWebhook', {
          url: webhookUrl,
          secret_token: this.webhookSecret,
          allowed_updates: ['message'],
        });
        this.logger.log('Telegram webhook registered');
      } else {
        await this.call('deleteWebhook', {});
        this.polling = true;
        void this.poll();
        this.logger.log('Telegram long polling started');
      }
    } catch (error) {
      this.logger.error(`Telegram setup failed: ${(error as Error).message}`);
    }
  }

  onModuleDestroy() {
    this.polling = false;
  }

  private async poll() {
    let offset = 0;
    while (this.polling) {
      try {
        const { data } = await axios.post(
          `${this.apiBase}/bot${this.token}/getUpdates`,
          { offset, timeout: 25, allowed_updates: ['message'] },
          { timeout: 35000 },
        );
        for (const update of (data.result ?? []) as TelegramUpdate[]) {
          offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (error) {
        this.logger.warn(`Telegram polling: ${(error as Error).message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  async handleUpdate(update: TelegramUpdate) {
    const message = update.message;
    if (!message?.text || message.chat.type !== 'private') return;
    const chatId = message.chat.id;
    const [command, payload] = message.text.trim().split(/\s+/);

    try {
      if (command === '/start' && payload) {
        await this.link(chatId, payload);
      } else if (command === '/start') {
        await this.send(
          chatId,
          'برای دریافت اعلان‌ها، از پنل لایفی‌نو (پروفایل ← اتصال تلگرام) لینک اتصال را باز کنید.',
        );
      } else if (command === '/stop') {
        await this.em
          .fork()
          .nativeUpdate(UserEntity, { chatId }, { chatId: null } as never);
        await this.send(chatId, 'اتصال قطع شد و دیگر اعلانی نمی‌فرستم.');
      }
    } catch (error) {
      this.logger.error(`Telegram update failed: ${(error as Error).message}`);
    }
  }

  private async link(chatId: number, code: string) {
    const userId = this.readLinkCode(code);
    if (!userId) {
      return this.send(
        chatId,
        'این لینک نامعتبر یا منقضی است. از پنل دوباره «اتصال تلگرام» را بزنید.',
      );
    }
    const em = this.em.fork();
    const user = await em.findOne(UserEntity, { id: userId });
    if (!user) return this.send(chatId, 'کاربر پیدا نشد.');
    // One Telegram account belongs to one user.
    await em.nativeUpdate(UserEntity, { chatId }, { chatId: null } as never);
    await em.nativeUpdate(UserEntity, { id: userId }, { chatId } as never);
    await this.send(
      chatId,
      `سلام ${
        user.name ?? ''
      }! اتصال انجام شد؛ از این به بعد اعلان‌ها را اینجا می‌فرستم. برای قطع: /stop`,
    );
  }

  // ── sending ────────────────────────────────────────────────────────────

  async send(chatId: number, text: string) {
    await this.call('sendMessage', { chat_id: chatId, text });
  }

  private async call(method: string, body: object) {
    return axios.post(`${this.apiBase}/bot${this.token}/${method}`, body, {
      timeout: 15000,
    });
  }
}
