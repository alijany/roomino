import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { tehranToday } from '../attendance/utils/attendance-time.util';
import { UserEntity } from '../user/user.entity';
import { ContractEntity } from './contract.entity';
import {
  CreateContractDto,
  SetNdaDto,
  UpdateContractDto,
} from './dtos/contract.dto';

/** A contract that ends within this many days is «رو به پایان». */
export const ENDING_SOON_DAYS = 30;

export type ContractState = 'none' | 'active' | 'ending' | 'expired';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

function stateOf(endDate: string | undefined, today: string) {
  if (!endDate) return { state: 'none' as ContractState, daysLeft: null };
  const daysLeft = daysBetween(today, endDate);
  const state: ContractState =
    daysLeft < 0
      ? 'expired'
      : daysLeft <= ENDING_SOON_DAYS
      ? 'ending'
      : 'active';
  return { state, daysLeft };
}

function toView(contract: ContractEntity) {
  return {
    id: contract.id,
    startDate: contract.startDate,
    endDate: contract.endDate,
    signed: contract.signed,
    note: contract.note ?? null,
  };
}

/** Contract terms and the NDA of each person: dates and whether they are signed. */
@Injectable()
export class ContractService {
  constructor(private readonly em: EntityManager) {}

  private async user(userId: number): Promise<UserEntity> {
    const user = await this.em.findOne(UserEntity, { id: userId });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return user;
  }

  private assertOrder(startDate: string, endDate: string) {
    if (endDate < startDate) {
      throw new BadRequestException(
        'تاریخ پایان قرارداد نمی‌تواند قبل از تاریخ شروع باشد',
      );
    }
  }

  /** A person's terms, newest first, with the NDA and where the current one stands. */
  async forUser(userId: number) {
    const user = await this.user(userId);
    const contracts = await this.em.find(
      ContractEntity,
      { user: userId },
      { orderBy: { endDate: 'desc', id: 'desc' } },
    );
    const today = tehranToday();
    return {
      contracts: contracts.map(toView),
      current: stateOf(contracts[0]?.endDate, today),
      nda: {
        signed: user.ndaSigned,
        signedDate: user.ndaSignedDate ?? null,
      },
    };
  }

  /** Where each person's current contract stands — the users table's badge. */
  async statuses() {
    const today = tehranToday();
    const contracts = await this.em.find(
      ContractEntity,
      {},
      { orderBy: { endDate: 'desc', id: 'desc' } },
    );
    const latest = new Map<number, ContractEntity>();
    for (const contract of contracts) {
      if (!latest.has(contract.user.id)) latest.set(contract.user.id, contract);
    }
    return [...latest.entries()].map(([userId, contract]) => ({
      userId,
      endDate: contract.endDate,
      signed: contract.signed,
      ...stateOf(contract.endDate, today),
    }));
  }

  /**
   * The users the users list narrows to by contract: those in the last month
   * of their current term (`in`), or those with no contract at all (`notIn`).
   */
  async userFilter(
    state: 'ending' | 'none',
  ): Promise<{ id: { $in: number[] } | { $nin: number[] } }> {
    const rows = await this.statuses();
    return state === 'ending'
      ? {
          id: {
            $in: rows.filter((r) => r.state === 'ending').map((r) => r.userId),
          },
        }
      : { id: { $nin: rows.map((r) => r.userId) } };
  }

  async create(userId: number, dto: CreateContractDto) {
    const user = await this.user(userId);
    this.assertOrder(dto.startDate, dto.endDate);
    const contract = this.em.create(ContractEntity, {
      user,
      startDate: dto.startDate,
      endDate: dto.endDate,
      signed: dto.signed ?? false,
      note: dto.note?.trim() || undefined,
    });
    await this.em.persistAndFlush(contract);
    return toView(contract);
  }

  async update(id: number, dto: UpdateContractDto) {
    const contract = await this.em.findOne(ContractEntity, { id });
    if (!contract) throw new NotFoundException('قرارداد یافت نشد');
    const startDate = dto.startDate ?? contract.startDate;
    const endDate = dto.endDate ?? contract.endDate;
    this.assertOrder(startDate, endDate);

    contract.startDate = startDate;
    contract.endDate = endDate;
    if (dto.signed !== undefined) contract.signed = dto.signed;
    if (dto.note !== undefined) contract.note = dto.note.trim() || undefined;
    await this.em.flush();
    return toView(contract);
  }

  async remove(id: number) {
    const contract = await this.em.findOne(ContractEntity, { id });
    if (!contract) throw new NotFoundException('قرارداد یافت نشد');
    await this.em.removeAndFlush(contract);
  }

  async setNda(userId: number, dto: SetNdaDto) {
    const user = await this.user(userId);
    user.ndaSigned = dto.signed;
    user.ndaSignedDate = dto.signed ? dto.signedDate || undefined : undefined;
    await this.em.flush();
    return { signed: user.ndaSigned, signedDate: user.ndaSignedDate ?? null };
  }
}
