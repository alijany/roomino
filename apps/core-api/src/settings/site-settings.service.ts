import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { SiteSettingEntity } from './site-setting.entity';

/** Every site setting and what it is until someone changes it. */
export const SITE_SETTING_DEFAULTS = {
  /** New people cannot sign up; people who already have an account still log in. */
  registrationClosed: false,
};

export type SiteSettings = typeof SITE_SETTING_DEFAULTS;

@Injectable()
export class SiteSettingsService {
  constructor(private readonly em: EntityManager) {}

  async all(): Promise<SiteSettings> {
    const rows = await this.em.fork().find(SiteSettingEntity, {});
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { ...SITE_SETTING_DEFAULTS, ...stored };
  }

  async get<K extends keyof SiteSettings>(key: K): Promise<SiteSettings[K]> {
    return (await this.all())[key];
  }

  /** Changes the settings given and returns them all. */
  async update(changes: Partial<SiteSettings>): Promise<SiteSettings> {
    const em = this.em.fork();
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || !(key in SITE_SETTING_DEFAULTS)) continue;
      const row =
        (await em.findOne(SiteSettingEntity, { key })) ??
        em.create(SiteSettingEntity, { key, value } as never);
      row.value = value;
    }
    await em.flush();
    return this.all();
  }
}
