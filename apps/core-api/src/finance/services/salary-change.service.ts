import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { UserEntity } from '../../user/user.entity';
import {
  BulkSalaryRaiseDto,
  CreateSalaryChangeDto,
  UpdateSalaryProposalDto,
} from '../dtos/salary-change.dto';
import { SalaryChangeEntity } from '../entities/salary-change.entity';
import { SalaryChangeStatus, SalaryChangeType } from '../finance.constants';
import { readBigint } from '../utils/money.util';

function assertPeriod(period: number) {
  const month = period % 100;
  if (!Number.isInteger(period) || month < 1 || month > 12) {
    throw new BadRequestException('ماه اعمال نامعتبر است');
  }
}

/** `140507` → `1405/07`, for messages. */
const periodLabel = (period: number) =>
  `${Math.floor(period / 100)}/${String(period % 100).padStart(2, '0')}`;

const userBrief = (user: UserEntity) => ({
  id: user.id,
  name: user.name ?? null,
  personnelCode: user.personnelCode ?? null,
  jobTitle: user.jobTitle ?? null,
  profilePicture: user.profilePicture ?? null,
});

/** A salary from a percent of the previous one, rounded to a multiple of `roundTo`. */
function applyPercent(previous: number, percent: number, roundTo = 1) {
  return Math.round((previous * (1 + percent / 100)) / roundTo) * roundTo;
}

@Injectable()
export class SalaryChangeService extends BaseRepositoryService<SalaryChangeEntity> {
  constructor(
    @InjectRepository(SalaryChangeEntity)
    protected repository: EntityRepository<SalaryChangeEntity>,
  ) {
    super(repository);
  }

  /** Every change with the confirmed salary before it, newest first. */
  async list(filter: {
    userId?: number;
    text?: string;
    type?: SalaryChangeType;
    status?: SalaryChangeStatus;
    year?: number;
    month?: number;
    onlyLatest?: boolean;
  }) {
    const rows = await this.repository.findAll({
      populate: ['user', 'createdBy'],
      orderBy: { user: 'ASC', period: 'ASC' },
    });

    // Per person, oldest to newest: the salary in force is the last confirmed one.
    const lastOf = new Map<number, number>();
    const items = rows.map((row) => {
      const salary = readBigint(row.salary);
      const previous = lastOf.get(row.user.id) ?? null;
      const proposed = row.status === SalaryChangeStatus.PROPOSED;
      if (!proposed) lastOf.set(row.user.id, salary);
      return {
        id: row.id,
        user: userBrief(row.user),
        period: row.period,
        salary,
        previous,
        percent:
          previous === null
            ? null
            : Math.round(((salary - previous) / previous) * 10_000) / 100,
        type: row.type ?? null,
        status: row.status,
        note: row.note ?? null,
        createdBy: row.createdBy?.name ?? null,
        createdAt: row.created_at,
      };
    });

    // The last confirmed row of each person.
    const latestId = new Map<number, number>();
    items.forEach((i) => {
      if (i.status === SalaryChangeStatus.CONFIRMED)
        latestId.set(i.user.id, i.id);
    });

    const text = filter.text?.trim().toLowerCase();
    return items
      .map((i) => ({
        ...i,
        isLatest:
          i.status === SalaryChangeStatus.CONFIRMED &&
          latestId.get(i.user.id) === i.id,
      }))
      .filter(
        (i) =>
          (!filter.userId || i.user.id === filter.userId) &&
          (!filter.type || i.type === filter.type) &&
          (!filter.status || i.status === filter.status) &&
          (!filter.year || Math.floor(i.period / 100) === filter.year) &&
          (!filter.month || i.period % 100 === filter.month) &&
          (!filter.onlyLatest || i.isLatest) &&
          (!text ||
            [i.user.name, i.user.personnelCode, i.user.jobTitle, i.note]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(text))),
      )
      .sort((a, b) => b.period - a.period || b.id - a.id);
  }

  /** Everyone with the confirmed salary that applies in `period`, and any open proposal. */
  async overview(period: number) {
    assertPeriod(period);
    const users = await this.em.find(
      UserEntity,
      {},
      { orderBy: { id: 'ASC' } },
    );
    const confirmed = await this.repository.find(
      { period: { $lte: period }, status: SalaryChangeStatus.CONFIRMED },
      { orderBy: { period: 'ASC' } },
    );
    const proposals = await this.repository.find({
      status: SalaryChangeStatus.PROPOSED,
    });
    const current = new Map<number, SalaryChangeEntity>();
    confirmed.forEach((c) => current.set(c.user.id, c));
    const open = new Map(proposals.map((p) => [p.user.id, p]));

    return users.map((user) => {
      const c = current.get(user.id);
      const p = open.get(user.id);
      return {
        user: userBrief(user),
        hireDate: user.hireDate ?? null,
        endDate: user.endDate ?? null,
        salary: c ? readBigint(c.salary) : null,
        since: c?.period ?? null,
        proposal: p
          ? { id: p.id, period: p.period, salary: readBigint(p.salary) }
          : null,
      };
    });
  }

  /** A confirmed change, or (with `propose`) a draft for a meeting. */
  async record(dto: CreateSalaryChangeDto, adminId: number) {
    assertPeriod(dto.period);
    if ((dto.salary === undefined) === (dto.percent === undefined)) {
      throw new BadRequestException(
        'حقوق جدید یا درصد تغییر را وارد کنید (فقط یکی)',
      );
    }

    const user = await this.em.findOne(UserEntity, { id: dto.userId });
    if (!user) throw new NotFoundException('کاربر پیدا نشد');

    const latest = await this.latestConfirmed(dto.userId);
    this.assertAfterLatest(latest, dto.period, user);
    const open = await this.openProposal(dto.userId);
    if (dto.propose && open) {
      throw new ConflictException(
        `${
          user.name ?? 'این نفر'
        } یک پیشنهاد باز دارد؛ آن را ویرایش، قطعی یا حذف کنید`,
      );
    }
    if (!dto.propose && open && open.period === dto.period) {
      throw new ConflictException(
        'برای این ماه یک پیشنهاد باز وجود دارد؛ آن را قطعی یا حذف کنید',
      );
    }

    const salary = this.salaryOf(latest, dto);
    const type = this.typeOf(latest, salary);
    this.em.persist(
      this.repository.create({
        user,
        period: dto.period,
        salary,
        type: dto.propose ? undefined : type,
        status: dto.propose
          ? SalaryChangeStatus.PROPOSED
          : SalaryChangeStatus.CONFIRMED,
        note: dto.note?.trim() || undefined,
        createdBy: this.em.getReference(UserEntity, adminId),
      } as never),
    );
    await this.em.flush();
    return { ok: true };
  }

  /** Edit an open proposal — any field, any time before it is confirmed. */
  async updateProposal(id: number, dto: UpdateSalaryProposalDto) {
    const row = await this.repository.findOne({ id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('تغییر حقوق پیدا نشد');
    if (row.status !== SalaryChangeStatus.PROPOSED) {
      throw new ConflictException('فقط پیشنهادها قابل ویرایش‌اند');
    }
    if (dto.salary !== undefined && dto.percent !== undefined) {
      throw new BadRequestException(
        'حقوق پیشنهادی یا درصد را وارد کنید (فقط یکی)',
      );
    }

    const latest = await this.latestConfirmed(row.user.id);
    const period = dto.period ?? row.period;
    assertPeriod(period);
    this.assertAfterLatest(latest, period, row.user);

    let salary = readBigint(row.salary);
    if (dto.salary !== undefined || dto.percent !== undefined) {
      salary = this.salaryOf(latest, dto);
    }
    this.typeOf(latest, salary); // refuses a salary equal to the current one

    row.period = period;
    row.salary = salary;
    if (dto.note !== undefined) row.note = dto.note.trim() || undefined;
    await this.em.flush();
    return { ok: true };
  }

  /** Turn proposals into confirmed changes, all or nothing. */
  async confirm(ids: number[]) {
    const unique = [...new Set(ids)];
    const rows = await this.repository.find(
      { id: { $in: unique }, status: SalaryChangeStatus.PROPOSED },
      { populate: ['user'] },
    );
    if (rows.length !== unique.length) {
      throw new NotFoundException(
        'پیشنهاد باز پیدا نشد (قبلاً قطعی یا حذف شده؟)',
      );
    }

    const problems: string[] = [];
    const planned: Array<{ row: SalaryChangeEntity; type: SalaryChangeType }> =
      [];
    for (const row of rows) {
      const label =
        row.user.name ?? row.user.personnelCode ?? String(row.user.id);
      const latest = await this.latestConfirmed(row.user.id);
      if (latest && latest.period >= row.period) {
        problems.push(
          `${label}: آخرین تغییر قطعی در ${periodLabel(latest.period)} است`,
        );
        continue;
      }
      try {
        planned.push({
          row,
          type: this.typeOf(latest, readBigint(row.salary)),
        });
      } catch {
        problems.push(`${label}: حقوق پیشنهادی با حقوق فعلی برابر است`);
      }
    }
    if (problems.length) {
      throw new BadRequestException(
        `قطعی کردن انجام نشد — ${problems.join('؛ ')}`,
      );
    }

    for (const { row, type } of planned) {
      row.type = type;
      row.status = SalaryChangeStatus.CONFIRMED;
    }
    await this.em.flush();
    return { confirmed: planned.length };
  }

  /** The same percent for several people, all or nothing — confirmed, or as proposals. */
  async bulkRaise(dto: BulkSalaryRaiseDto, adminId: number) {
    assertPeriod(dto.period);
    const ids = [...new Set(dto.userIds)];
    const users = await this.em.find(UserEntity, { id: { $in: ids } });
    if (users.length !== ids.length)
      throw new NotFoundException('کاربر پیدا نشد');

    const problems: string[] = [];
    const planned: Array<{ user: UserEntity; salary: number }> = [];
    for (const user of users) {
      const latest = await this.latestConfirmed(user.id);
      const open = await this.openProposal(user.id);
      const label = user.name ?? user.personnelCode ?? String(user.id);
      if (!latest) {
        problems.push(`${label}: حقوقی ثبت نشده است`);
        continue;
      }
      if (latest.period >= dto.period) {
        problems.push(
          `${label}: آخرین تغییر در ${periodLabel(latest.period)} است`,
        );
        continue;
      }
      if (open && (dto.propose || open.period === dto.period)) {
        problems.push(`${label}: پیشنهاد باز دارد`);
        continue;
      }
      const salary = applyPercent(
        readBigint(latest.salary),
        dto.percent,
        dto.roundTo,
      );
      if (salary <= readBigint(latest.salary)) {
        problems.push(`${label}: افزایشی ایجاد نمی‌شود`);
        continue;
      }
      planned.push({ user, salary });
    }
    if (problems.length) {
      throw new BadRequestException(
        `افزایش گروهی انجام نشد — ${problems.join('؛ ')}`,
      );
    }

    const admin = this.em.getReference(UserEntity, adminId);
    for (const { user, salary } of planned) {
      this.em.persist(
        this.repository.create({
          user,
          period: dto.period,
          salary,
          type: dto.propose ? undefined : SalaryChangeType.RAISE,
          status: dto.propose
            ? SalaryChangeStatus.PROPOSED
            : SalaryChangeStatus.CONFIRMED,
          note: dto.note?.trim() || undefined,
          createdBy: admin,
        } as never),
      );
    }
    await this.em.flush();
    return { created: planned.length };
  }

  /** A proposal always; a confirmed change only if it is the person's latest. */
  async removeChange(id: number) {
    const row = await this.repository.findOne({ id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('تغییر حقوق پیدا نشد');
    if (row.status === SalaryChangeStatus.CONFIRMED) {
      const latest = await this.latestConfirmed(row.user.id);
      if (latest?.id !== row.id) {
        throw new ConflictException('فقط آخرین تغییر قطعی هر نفر قابل حذف است');
      }
    }
    await this.em.removeAndFlush(row);
    return { success: true };
  }

  // --- helpers ---------------------------------------------------------------

  private latestConfirmed(userId: number) {
    return this.repository.findOne(
      { user: userId, status: SalaryChangeStatus.CONFIRMED },
      { orderBy: { period: 'DESC' } },
    );
  }

  private openProposal(userId: number) {
    return this.repository.findOne({
      user: userId,
      status: SalaryChangeStatus.PROPOSED,
    });
  }

  /** The salary asked for: given outright, or a percent of the current one. */
  private salaryOf(
    latest: SalaryChangeEntity | null,
    dto: { salary?: number; percent?: number; roundTo?: number },
  ) {
    if (dto.salary !== undefined) return dto.salary;
    if (!latest) {
      throw new BadRequestException(
        'برای اولین ثبت، خودِ حقوق را وارد کنید (درصد نیاز به حقوق قبلی دارد)',
      );
    }
    return applyPercent(readBigint(latest.salary), dto.percent!, dto.roundTo);
  }

  private assertAfterLatest(
    latest: SalaryChangeEntity | null,
    period: number,
    user: UserEntity,
  ) {
    if (latest && latest.period >= period) {
      throw new ConflictException(
        `آخرین تغییر قطعی حقوق ${user.name ?? 'این نفر'} در ${periodLabel(
          latest.period,
        )} است؛ تغییر جدید باید بعد از آن باشد`,
      );
    }
  }

  private typeOf(latest: SalaryChangeEntity | null, salary: number) {
    if (!latest) return SalaryChangeType.START;
    const previous = readBigint(latest.salary);
    if (salary === previous) {
      throw new BadRequestException('حقوق جدید با حقوق قبلی برابر است');
    }
    return salary > previous
      ? SalaryChangeType.RAISE
      : SalaryChangeType.DECREASE;
  }
}
