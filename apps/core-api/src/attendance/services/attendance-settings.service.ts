import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../user/user.entity';
import { UpdateSelfDeclaredDto } from '../dtos/setup.dto';
import { AttendanceSettingsEntity } from '../entities/attendance-settings.entity';

/** The one settings row. */
const ROW_ID = 1;

/** Serialises saving, so two admins at once can't both insert the row. */
const SAVE_LOCK = 0x5ced_0002;

/** Module-wide switches — see `AttendanceSettingsEntity`. */
@Injectable()
export class AttendanceSettingsService {
  constructor(private readonly em: EntityManager) {}

  /** The saved row, or null while the defaults still apply. */
  find() {
    return this.em.findOne(
      AttendanceSettingsEntity,
      { id: ROW_ID },
      { populate: ['selfDeclaredChangedBy'] },
    );
  }

  /** Is self-declared check-in on? Off until an admin switches it on. */
  async selfDeclared() {
    const row = await this.em.findOne(AttendanceSettingsEntity, { id: ROW_ID });
    return row?.selfDeclared ?? false;
  }

  async updateSelfDeclared(dto: UpdateSelfDeclaredDto, by: UserEntity) {
    await this.em.transactional(async (em) => {
      await em.execute('select pg_advisory_xact_lock(?)', [SAVE_LOCK]);
      const row = await em.findOne(AttendanceSettingsEntity, { id: ROW_ID });
      if ((row?.selfDeclared ?? false) === dto.enabled) return;

      const change = {
        selfDeclared: dto.enabled,
        selfDeclaredChangedAt: new Date(),
        selfDeclaredChangedBy: by,
      };
      if (row) em.assign(row, change);
      else em.create(AttendanceSettingsEntity, { id: ROW_ID, ...change });
    });
    this.em.clear();
  }
}
