jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));

import {
  AttendanceMode,
  BoardStatus,
  RequestStatus,
  RequestType,
} from '../attendance.constants';
import { CheckinReminderService } from './checkin-reminder.service';

/** 2026-11-25 06:30 UTC is 10:00 in Tehran (UTC+3:30, no DST). */
const AT_10 = new Date('2026-11-25T06:30:00Z');
const AT_09 = new Date('2026-11-25T05:30:00Z');

const profile = (id: number) =>
  ({ id, user: { id: id * 10, firstName: 'علی' } } as any);

function build(over: {
  enabled?: boolean;
  rows?: Array<{ profile: any; status: BoardStatus; mode?: AttendanceMode }>;
  requests?: any[];
  sentOn?: string;
}) {
  const sent: Array<[number, string]> = [];
  const updates: any[] = [];
  const service = new CheckinReminderService(
    {
      nativeUpdate: async (...a: any[]) => updates.push(a),
    } as any,
    {
      find: async () => ({
        checkinReminderEnabled: over.enabled ?? true,
        checkinReminderTime: '09:30',
      }),
      selfDeclared: async () => false,
    } as any,
    {
      findActive: async () =>
        (over.rows ?? []).map((r) => ({
          ...r.profile,
          checkinReminderSentOn: over.sentOn,
        })),
    } as any,
    {
      board: async () => ({
        rows: (over.rows ?? []).map((r) => ({
          ...r,
          mode: r.mode ?? AttendanceMode.TRACKED,
        })),
      }),
    } as any,
    { inRange: async () => over.requests ?? [] } as any,
    {
      sendToUser: async (id: number, text: string) => sent.push([id, text]),
    } as any,
    {
      get: (key: string) =>
        key === 'APP_PUBLIC_URL' ? 'https://app.example.ir/' : undefined,
    } as any,
  );
  return { service, sent, updates };
}

describe('check-in reminder', () => {
  it('does nothing while switched off or before the chosen time', async () => {
    const rows = [{ profile: profile(1), status: BoardStatus.MISSING }];
    expect(await build({ enabled: false, rows }).service.sendDue(AT_10)).toBe(
      0,
    );
    expect(await build({ rows }).service.sendDue(AT_09)).toBe(0);
  });

  it('reminds those missing or not yet declared, once a day', async () => {
    const rows = [
      { profile: profile(1), status: BoardStatus.MISSING },
      {
        profile: profile(2),
        status: BoardStatus.AWAITING,
        mode: AttendanceMode.UNTRACKED,
      },
      { profile: profile(3), status: BoardStatus.WORKING },
    ];
    const { service, sent, updates } = build({ rows });
    expect(await service.sendDue(AT_10)).toBe(2);
    expect(sent.map(([id]) => id)).toEqual([10, 20]);
    expect(sent[1][1]).toContain('امروز هستم');
    expect(updates).toHaveLength(2);
    // Already reminded today.
    expect(
      await build({ rows, sentOn: '2026-11-25' }).service.sendDue(AT_10),
    ).toBe(0);
  });

  it('holds back a day-long request awaiting a decision and hourly leave covering now', async () => {
    const rows = [
      { profile: profile(1), status: BoardStatus.MISSING },
      { profile: profile(2), status: BoardStatus.MISSING },
      { profile: profile(3), status: BoardStatus.MISSING },
    ];
    const requests = [
      {
        employee: { id: 1 },
        type: RequestType.LEAVE_ENTITLED_DAILY,
        status: RequestStatus.PENDING,
      },
      {
        employee: { id: 2 },
        type: RequestType.LEAVE_ENTITLED_HOURLY,
        status: RequestStatus.APPROVED,
        timeFrom: '09:00',
        timeTo: '11:00',
      },
    ];
    const { service, sent } = build({ rows, requests });
    expect(await service.sendDue(AT_10)).toBe(1);
    expect(sent[0][0]).toBe(30);
  });

  it('puts one-tap buttons only where no position is needed, and a link to the panel', () => {
    const { service } = build({});
    const flat = (rows: any[][]) => rows.flat().map((b) => b.text);

    const withPosition = service.buttons('2026-11-25', false, false);
    expect(flat(withPosition)).toEqual([
      'دورکاری هستم',
      'مرخصی استعلاجی',
      'باز کردن پنل',
    ]);

    const free = service.buttons('2026-11-25', true, true) as any[][];
    expect(flat(free)).toEqual([
      'امروز هستم',
      'دورکاری هستم',
      'مرخصی استعلاجی',
      'باز کردن پنل',
    ]);
    expect(free[0][0].data).toBe('ci:p:2026-11-25');
    expect(free[0][1].data).toBe('ci:r:2026-11-25');
    expect(free[1][0].data).toBe('ci:s:2026-11-25');
    expect(free[2][0].url).toBe('https://app.example.ir/dashboard/attendance');
  });
});
