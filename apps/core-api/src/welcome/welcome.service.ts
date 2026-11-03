import { EntityManager } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { addDays, tehranToday } from '../attendance/utils/attendance-time.util';
import { UserEntity } from '../user/user.entity';
import { WelcomeEntity } from './welcome.entity';

/** A newcomer is introduced for this many days from the first day. */
export const INTRO_DAYS = 30;

@Injectable()
export class WelcomeService {
  constructor(private readonly em: EntityManager) {}

  /** People marked for introduction whose first day is within the last month. */
  private async newcomers(): Promise<UserEntity[]> {
    const today = tehranToday();
    return this.em.find(UserEntity, {
      introduce: true,
      cooperationEnded: false,
      hireDate: { $lte: today, $gt: addDays(today, -INTRO_DAYS) },
    });
  }

  /**
   * What the dashboard shows `me`: newcomers still to be welcomed (a list for
   * the modal), and — when `me` is one — who has welcomed them.
   */
  async forUser(me: UserEntity) {
    const newcomers = await this.newcomers();
    if (!newcomers.length) return { newcomers: [], mine: null };

    const rows = await this.em.find(
      WelcomeEntity,
      { newcomer: { $in: newcomers.map((n) => n.id) } },
      { populate: ['viewer'] },
    );
    const view = (u: UserEntity) => ({
      id: u.id,
      name: u.name ?? null,
      picture: u.profilePicture ?? null,
      jobTitle: u.jobTitle ?? null,
    });

    const toWelcome = newcomers
      .filter((n) => n.id !== me.id)
      .filter(
        (n) =>
          !rows.some(
            (r) =>
              r.newcomer.id === n.id && r.viewer.id === me.id && r.dismissed,
          ),
      )
      .sort((a, b) => (b.hireDate ?? '').localeCompare(a.hireDate ?? ''))
      .map((n) => ({
        ...view(n),
        jobTitle: n.jobTitle ?? null,
        hireDate: n.hireDate ?? null,
        probation: Boolean(
          n.probationEndDate && n.probationEndDate >= tehranToday(),
        ),
        greeted: rows.some(
          (r) => r.newcomer.id === n.id && r.viewer.id === me.id && r.greeted,
        ),
      }));

    const self = newcomers.find((n) => n.id === me.id);
    const mine =
      self &&
      !rows.some(
        (r) => r.newcomer.id === me.id && r.viewer.id === me.id && r.dismissed,
      )
        ? {
            userId: me.id,
            firstName: self.firstName ?? null,
            hireDate: self.hireDate ?? null,
            probationEndDate: self.probationEndDate ?? null,
            greeters: rows
              .filter(
                (r) =>
                  r.newcomer.id === me.id && r.greeted && r.viewer.id !== me.id,
              )
              .map((r) => view(r.viewer)),
          }
        : null;

    return { newcomers: toWelcome, mine };
  }

  private async rowFor(newcomerId: number, viewer: UserEntity) {
    const newcomer = await this.em.findOne(UserEntity, { id: newcomerId });
    if (!newcomer) throw new NotFoundException('همکار پیدا نشد');
    return (
      (await this.em.findOne(WelcomeEntity, { newcomer, viewer })) ??
      this.em.create(WelcomeEntity, { newcomer, viewer })
    );
  }

  async greet(newcomerId: number, viewer: UserEntity) {
    const row = await this.rowFor(newcomerId, viewer);
    row.greeted = true;
    await this.em.flush();
  }

  async dismiss(newcomerIds: number[], viewer: UserEntity) {
    for (const id of newcomerIds) {
      const row = await this.rowFor(id, viewer);
      row.dismissed = true;
    }
    await this.em.flush();
  }
}
