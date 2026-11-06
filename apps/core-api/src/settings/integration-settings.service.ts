import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SiteSettingEntity } from './site-setting.entity';

export const TELEGRAM_SETTINGS_CHANGED = 'integration.telegram.changed';

/** What the stored rows hold; every field is optional and falls back to the environment. */
interface TelegramStored {
  botToken?: string;
  botUsername?: string;
  apiBase?: string;
  webhookUrl?: string;
}
interface SmsStored {
  /** Which service sends: Asanak (default) or sms.ir. */
  provider?: string;
  /** sms.ir: the panel's API key and the line number to send from. */
  smsirApiKey?: string;
  smsirLine?: string;
  /** sms.ir template for the one-time code and the name of its code parameter. */
  smsirOtpTemplate?: string;
  smsirOtpParam?: string;
  apiUrl?: string;
  username?: string;
  password?: string;
  source?: string;
}

export interface TelegramConfig {
  token?: string;
  username?: string;
  apiBase: string;
  webhookUrl?: string;
}
export type SmsProvider = 'asanak' | 'smsir';

export interface SmsConfig {
  provider: SmsProvider;
  smsirApiKey?: string;
  smsirLine?: string;
  smsirOtpTemplate?: number;
  smsirOtpParam: string;
  apiUrl?: string;
  username?: string;
  password?: string;
  source: string;
}

const KEYS = { telegram: 'integration.telegram', sms: 'integration.sms' };
const DEFAULT_SMS_SOURCE = '989982003670';

const clean = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || undefined;
};
/** Last characters only, so an admin can tell which secret is set without seeing it. */
const hint = (v?: string) => (v ? `••••${v.slice(-4)}` : null);

/**
 * Credentials of the outside services (Telegram bot, Asanak SMS). What an admin
 * saves on the site-settings page wins; the environment is the fallback.
 * Secrets never leave through `view()`.
 */
@Injectable()
export class IntegrationSettingsService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  private async stored<T>(key: string): Promise<T> {
    const row = await this.em.fork().findOne(SiteSettingEntity, { key });
    return ((row?.value as T) ?? {}) as T;
  }

  private async save(key: string, value: object) {
    const em = this.em.fork();
    const row =
      (await em.findOne(SiteSettingEntity, { key })) ??
      em.create(SiteSettingEntity, { key, value } as never);
    row.value = value;
    await em.flush();
  }

  async telegram(): Promise<TelegramConfig> {
    const s = await this.stored<TelegramStored>(KEYS.telegram);
    return {
      token: clean(s.botToken) ?? clean(this.config.get('TELEGRAM_BOT_TOKEN')),
      username:
        clean(s.botUsername) ?? clean(this.config.get('TELEGRAM_BOT_USERNAME')),
      apiBase:
        clean(s.apiBase) ??
        clean(this.config.get('TELEGRAM_API_BASE')) ??
        'https://api.telegram.org',
      webhookUrl:
        clean(s.webhookUrl) ?? clean(this.config.get('TELEGRAM_WEBHOOK_URL')),
    };
  }

  async sms(): Promise<SmsConfig> {
    const s = await this.stored<SmsStored>(KEYS.sms);
    return {
      provider: s.provider === 'smsir' ? 'smsir' : 'asanak',
      smsirApiKey:
        clean(s.smsirApiKey) ?? clean(this.config.get('SMSIR_API_KEY')),
      smsirLine: clean(s.smsirLine) ?? clean(this.config.get('SMSIR_LINE')),
      smsirOtpTemplate:
        Number(
          clean(s.smsirOtpTemplate) ??
            clean(this.config.get('SMSIR_OTP_TEMPLATE')),
        ) || undefined,
      smsirOtpParam:
        clean(s.smsirOtpParam) ??
        clean(this.config.get('SMSIR_OTP_PARAM')) ??
        'CODE',
      apiUrl: clean(s.apiUrl) ?? clean(this.config.get('ASANAK_API')),
      username: clean(s.username) ?? clean(this.config.get('ASANAK_API_USER')),
      password: clean(s.password) ?? clean(this.config.get('ASANAK_API_PASS')),
      source:
        clean(s.source) ??
        clean(this.config.get('ASANAK_API_SOURCE')) ??
        DEFAULT_SMS_SOURCE,
    };
  }

  /** For the settings page: values to edit, secrets reduced to «is set» and a hint. */
  async view() {
    const t = await this.telegram();
    const m = await this.sms();
    return {
      telegram: {
        botUsername: t.username ?? '',
        apiBase: t.apiBase,
        webhookUrl: t.webhookUrl ?? '',
        tokenSet: !!t.token,
        tokenHint: hint(t.token),
      },
      sms: {
        provider: m.provider,
        smsirLine: m.smsirLine ?? '',
        smsirOtpTemplate: m.smsirOtpTemplate ? String(m.smsirOtpTemplate) : '',
        smsirOtpParam: m.smsirOtpParam,
        smsirKeySet: !!m.smsirApiKey,
        smsirKeyHint: hint(m.smsirApiKey),
        apiUrl: m.apiUrl ?? '',
        username: m.username ?? '',
        source: m.source,
        passwordSet: !!m.password,
        passwordHint: hint(m.password),
      },
    };
  }

  /**
   * Saves what was sent. A secret that is missing or blank stays as it was;
   * a plain field that is blank goes back to the environment's value.
   */
  async update(changes: { telegram?: TelegramStored; sms?: SmsStored }) {
    if (changes.telegram) {
      const old = await this.stored<TelegramStored>(KEYS.telegram);
      const next: TelegramStored = {
        botToken: clean(changes.telegram.botToken) ?? old.botToken,
        botUsername: clean(changes.telegram.botUsername?.replace(/^@/, '')),
        apiBase: clean(changes.telegram.apiBase)?.replace(/\/+$/, ''),
        webhookUrl: clean(changes.telegram.webhookUrl),
      };
      if (changes.telegram.botUsername === undefined)
        next.botUsername = old.botUsername;
      if (changes.telegram.apiBase === undefined) next.apiBase = old.apiBase;
      if (changes.telegram.webhookUrl === undefined)
        next.webhookUrl = old.webhookUrl;
      await this.save(KEYS.telegram, next);
      this.events.emit(TELEGRAM_SETTINGS_CHANGED);
    }
    if (changes.sms) {
      const old = await this.stored<SmsStored>(KEYS.sms);
      const pick = (
        k:
          | 'apiUrl'
          | 'username'
          | 'source'
          | 'smsirLine'
          | 'smsirOtpTemplate'
          | 'smsirOtpParam',
      ) => (changes.sms![k] === undefined ? old[k] : clean(changes.sms![k]));
      await this.save(KEYS.sms, {
        provider: changes.sms.provider ?? old.provider,
        smsirLine: pick('smsirLine'),
        smsirOtpTemplate: pick('smsirOtpTemplate'),
        smsirOtpParam: pick('smsirOtpParam'),
        smsirApiKey: clean(changes.sms.smsirApiKey) ?? old.smsirApiKey,
        apiUrl: pick('apiUrl'),
        username: pick('username'),
        source: pick('source'),
        password: clean(changes.sms.password) ?? old.password,
      });
    }
    return this.view();
  }
}
