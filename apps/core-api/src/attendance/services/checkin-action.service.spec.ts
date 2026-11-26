import { AttendanceMode } from '../attendance.constants';
import { tehranToday } from '../utils/attendance-time.util';
import { CheckinActionService } from './checkin-action.service';

function build(over: {
  mode?: AttendanceMode;
  success?: boolean;
  active?: boolean;
}) {
  const calls: Array<[string, any]> = [];
  const result = (message: string) => ({
    success: over.success ?? true,
    message,
  });
  const service = new CheckinActionService(
    { registerCallbackHandler: () => undefined } as any,
    {
      findByUser: async () =>
        over.active === false
          ? { active: false }
          : { id: 1, active: true, user: { firstName: 'علی' } },
    } as any,
    { on: async () => over.mode ?? AttendanceMode.TRACKED } as any,
    {
      declare: async (_p: any, dto: any) => {
        calls.push(['declare', dto]);
        return result('حضور امروز شما اعلام شد.');
      },
    } as any,
    {
      checkIn: async (_p: any, dto: any) => {
        calls.push(['checkIn', dto]);
        return result('ورود شما با موفقیت ثبت شد.');
      },
    } as any,
    {
      submit: async (_p: any, dto: any) => {
        calls.push(['submit', dto]);
      },
    } as any,
  );
  return { service, calls };
}

describe('check-in reminder buttons', () => {
  const today = tehranToday();

  it('checks in a tracked person and declares presence for «بدون ثبت»', async () => {
    const tracked = build({});
    const a = await tracked.service.handle(7, `ci:p:${today}`);
    expect(tracked.calls).toEqual([['checkIn', { remote: false }]]);
    expect(a).toEqual({ text: 'ورود شما با موفقیت ثبت شد.', done: true });

    const untracked = build({ mode: AttendanceMode.UNTRACKED });
    await untracked.service.handle(7, `ci:r:${today}`);
    expect(untracked.calls).toEqual([['declare', { remote: true }]]);
  });

  it('files today as a day of entitled leave for approval', async () => {
    const { service, calls } = build({});
    const r = await service.handle(7, `ci:e:${today}`);
    expect(calls).toEqual([
      [
        'submit',
        {
          type: 'leave_entitled_daily',
          dateFrom: today,
          dateTo: today,
          description: 'ثبت از تلگرام',
        },
      ],
    ]);
    expect(r.done).toBe(true);
    expect(r.text).toContain('مرخصی استحقاقی');
    expect((r as { followUp?: string }).followUp).toBeUndefined();
  });

  it('keeps the buttons when it could not be done, and refuses another day or an inactive profile', async () => {
    const failed = await build({ success: false }).service.handle(
      7,
      `ci:p:${today}`,
    );
    expect(failed.done).toBe(false);
    expect(failed.text).toContain('از پنل');

    const old = await build({}).service.handle(7, 'ci:p:2020-01-01');
    expect(old).toEqual({
      text: 'این یادآوری مربوط به روز دیگری است.',
      done: true,
    });

    const inactive = await build({ active: false }).service.handle(
      7,
      `ci:p:${today}`,
    );
    expect(inactive.done).toBe(true);
  });
});
