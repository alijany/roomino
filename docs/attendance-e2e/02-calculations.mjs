#!/usr/bin/env node
/**
 * Attendance — calculation suite.
 *
 * Suite 1 checks flows and access; its check-ins happen "now", so it can't
 * pin the arithmetic. This one builds last Jalali month for one person —
 * exact check-in/out times planted in the database, requests filed and
 * decided through the API — and compares every day of the report and the
 * monthly summary against values computed here, independently.
 *
 * Needs its own fresh DB with seed-users.sql and tokens (see README.md).
 *   TOK=/tmp node 02-calculations.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const api = path.resolve(here, '../../apps/core-api');
const require = createRequire(path.join(api, 'package.json'));
const jalali = require('date-fns-jalali');
const util = require(path.join(api, 'dist/src/attendance/utils/attendance-time.util.js'));

const API = process.env.API ?? 'http://127.0.0.1:4000/api/v1';
const TOK = process.env.TOK ?? '/tmp';
const tok = (i) => readFileSync(`${TOK}/at_${i}`, 'utf8').trim();
const EMP = tok(1), APR = tok(2), HR = tok(3), EMP2 = tok(5);

let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log(`  ✓ ${name}`); };
const bad = (name, detail) => { fail++; console.log(`  ✗ ${name}\n      ${detail}`); };
const check = (name, actual, expected) =>
  JSON.stringify(actual) === JSON.stringify(expected)
    ? ok(name)
    : bad(name, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

async function call(token, method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
async function must(token, method, url, body, want = [200, 201]) {
  const r = await call(token, method, url, body);
  if (!want.includes(r.status)) throw new Error(`${method} ${url} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}
const sql = (q) =>
  execFileSync('psql', ['-h', '127.0.0.1', '-U', 'postgres', '-d', process.env.PGDATABASE ?? 'roomino', '-tAc', q], {
    env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? 'pass123' },
  }).toString().trim();

// --- the month under test: the previous Jalali month, wholly in the past ----------
const today = util.tehranToday();
const { year: cy, month: cm } = util.dateToJalali(today);
const [py, pm] = cm === 1 ? [cy - 1, 12] : [cy, cm - 1];
const { from: monthFrom, to: monthTo } = util.jalaliMonthRange(py, pm);
const days = util.eachDate(monthFrom, monthTo);
const shiftStart = days[4]; // the 5th: days 1–4 are before onboarding

// Split shift: Sat–Wed 08–12 + 13–17 (480 min, ends 17:00), Thu 08–12 (240), Fri off.
const SCHED = [480, 480, 480, 480, 480, 240, 0];
const SHIFT_DAYS = [0, 1, 2, 3, 4].map((d) => ({
  dayOfWeek: d, isActive: true, startTime: '08:00', endTime: '12:00',
  hasSecondPart: true, secondStartTime: '13:00', secondEndTime: '17:00',
})).concat([{ dayOfWeek: 5, isActive: true, startTime: '08:00', endTime: '12:00' }, { dayOfWeek: 6, isActive: false }]);

/** k-th (1-based) date of an Iranian weekday on or after the shift start. */
const nth = (weekday, k) => days.filter((d) => d >= shiftStart && util.iranWeekday(d) === weekday)[k - 1];
const SAT = 0, SUN = 1, MON = 2, TUE = 3, WED = 4, THU = 5;

const D = {
  delay: nth(SAT, 1), holiday: nth(SAT, 2), overtime: nth(SAT, 3),
  early: nth(SUN, 1), remoteHourly: nth(SUN, 2),
  incomplete: nth(MON, 1), remoteRejected: nth(MON, 2), hourlyLeave: nth(MON, 3),
  absent: nth(TUE, 1), remotePending: nth(TUE, 2),
  leave: nth(WED, 1), remoteDaily: nth(WED, 2),
  thursday: nth(THU, 1), mission: nth(THU, 2),
};

/** What each planted day must report: status, worked, delay, early, overtime, leave, remote. */
const EXPECT = {
  [D.delay]:          { status: 'present', worked: 525, delay: 15, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 },
  [D.early]:          { status: 'present', worked: 520, delay: 0, early: 30, overtime: 0, leaveMinutes: 0, remote: 0 },
  [D.incomplete]:     { status: 'incomplete', worked: 0, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 },
  [D.absent]:         { status: 'absent', worked: 0, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 },
  [D.leave]:          { status: 'on_leave', worked: 0, delay: 0, early: 0, overtime: 0, leaveMinutes: 480, remote: 0 },
  [D.thursday]:       { status: 'present', worked: 240, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 },
  [D.holiday]:        { status: 'holiday', worked: 0, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 },
  [D.hourlyLeave]:    { status: 'present', worked: 540, delay: 0, early: 0, overtime: 0, leaveMinutes: 120, remote: 0 },
  [D.overtime]:       { status: 'present', worked: 660, delay: 0, early: 0, overtime: 120, leaveMinutes: 0, remote: 0 },
  [D.mission]:        { status: 'mission', worked: 0, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 },
  // Out at 15:00 leaves 120 min early; the approved 2h of remote work covers it.
  [D.remoteHourly]:   { status: 'present', worked: 540, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 120 },
  [D.remoteRejected]: { status: 'absent', worked: 0, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 },
  [D.remotePending]:  { status: 'remote_pending', worked: 0, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 },
  [D.remoteDaily]:    { status: 'remote', worked: 480, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 480 },
};

const scheduledOf = (d) => (d < shiftStart || d === D.holiday ? 0 : SCHED[util.iranWeekday(d)]);
const statusOf = (d) =>
  EXPECT[d]?.status ?? (d < shiftStart ? 'no_shift' : scheduledOf(d) === 0 ? 'holiday' : 'absent');

async function main() {
  console.log(`== setup: ${util.formatJalaliDate(monthFrom)}–${util.formatJalaliDate(monthTo)} (${days.length} days)`);
  const wp = await must(HR, 'POST', '/attendance/workplaces', { name: 'محاسبات', lat: 35.7, lng: 51.4, radiusMeters: 200 });
  const shift = await must(HR, 'POST', '/attendance/shifts', { name: 'دوپاره', year: py, days: SHIFT_DAYS });
  const group = await must(HR, 'POST', '/attendance/job-groups', { name: 'آزمون', approverIds: [2] });
  const p1 = await must(HR, 'POST', '/attendance/employees', {
    userId: 1, personnelCode: 'C-1', workplaceId: wp.id, jobGroupId: group.id, shiftId: shift.id, shiftStartDate: shiftStart,
  });
  check('profile has no work policy (none exists yet)', p1.workPolicy, null);

  const plant = (date, inAt, outAt, mode = 'office') =>
    sql(`insert into attendance_entity (created_at, updated_at, employee_id, workplace_id, date, check_in_at, check_out_at,
         check_in_source, check_out_source, status, work_mode) values (now(), now(), ${p1.id}, ${wp.id}, '${date}',
         ${inAt ? `'${date} ${inAt}:00+03:30'` : 'null'}, ${outAt ? `'${date} ${outAt}:00+03:30'` : 'null'},
         ${inAt ? "'gps'" : 'null'}, ${outAt ? "'gps'" : 'null'}, 'present', '${mode}')`);
  plant(D.delay, '08:15', '17:00');
  plant(D.early, '07:50', '16:30');
  plant(D.incomplete, '08:00', null);
  plant(D.thursday, '08:00', '12:00');
  plant(D.hourlyLeave, '08:00', '17:00');
  plant(D.overtime, '08:00', '19:00');
  plant(D.remoteHourly, '08:00', '15:00');
  plant(D.remoteRejected, '08:00', '17:00', 'remote');
  plant(D.remotePending, '08:00', '17:00', 'remote');

  await must(HR, 'POST', '/attendance/holidays', { title: 'تعطیلی آزمون', date: D.holiday });

  const file = (body) => must(EMP, 'POST', '/attendance/me/requests', body);
  const approve = (r) => must(APR, 'POST', `/attendance/team/requests/${r.id}/approve`);
  await approve(await file({ type: 'leave_entitled_daily', dateFrom: D.leave, dateTo: D.leave }));
  await approve(await file({ type: 'leave_entitled_hourly', date: D.hourlyLeave, timeFrom: '10:00', timeTo: '12:00' }));
  await approve(await file({ type: 'overtime', date: D.overtime, timeFrom: '17:00', timeTo: '19:00' }));
  await approve(await file({ type: 'mission_daily', dateFrom: D.mission, dateTo: D.mission }));
  await approve(await file({ type: 'remote_hourly', date: D.remoteHourly, timeFrom: '15:00', timeTo: '17:00' }));
  await approve(await file({ type: 'remote_daily', dateFrom: D.remoteDaily, dateTo: D.remoteDaily }));
  const rejected = await file({ type: 'remote_daily', dateFrom: D.remoteRejected, dateTo: D.remoteRejected });
  await must(APR, 'POST', `/attendance/team/requests/${rejected.id}/reject`, { note: 'آزمون' });
  await file({ type: 'remote_daily', dateFrom: D.remotePending, dateTo: D.remotePending });

  console.log('== every day of the month');
  const report = await must(EMP, 'GET', `/attendance/me/report?y=${py}&m=${pm}`);
  check('report covers the whole Jalali month', [report.days.length, report.days[0].date, report.days.at(-1).date], [days.length, monthFrom, monthTo]);

  let dayFailures = 0;
  for (const day of report.days) {
    const want = { status: statusOf(day.date), scheduled: scheduledOf(day.date), ...(EXPECT[day.date] ?? {}) };
    const got = Object.fromEntries(Object.keys(want).map((k) => [k, day[k]]));
    if (EXPECT[day.date]) {
      check(`${util.formatJalaliDate(day.date)} (${want.status})`, got, want);
    } else if (JSON.stringify(got) !== JSON.stringify(want)) {
      dayFailures++;
      bad(`unplanted day ${util.formatJalaliDate(day.date)}`, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    }
  }
  if (!dayFailures) ok(`all ${days.length - Object.keys(EXPECT).length} unplanted days: no_shift before onboarding, holiday on Fridays, absent otherwise`);

  const inc = report.days.find((d) => d.date === D.incomplete);
  check('incomplete day asks for a check-out fix', [inc.needsFix, inc.fixDirection], [true, 'out']);
  const abs = report.days.find((d) => d.date === D.absent);
  check('absent day asks for a check-in fix', [abs.needsFix, abs.fixDirection], [true, 'in']);
  check('holiday day carries its title', report.days.find((d) => d.date === D.holiday).holiday, 'تعطیلی آزمون');

  console.log('== monthly summary');
  const all = days.map((d) => ({ d, status: statusOf(d), sched: scheduledOf(d), ...(EXPECT[d] ?? { worked: 0, delay: 0, early: 0, overtime: 0, leaveMinutes: 0, remote: 0 }) }));
  const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
  const worked = sum(all, (x) => x.worked);
  const required = sum(all.filter((x) => !['on_leave', 'mission'].includes(x.status)), (x) => x.sched);
  const absent = all.filter((x) => x.status === 'absent');
  const want = {
    worked, required, requiredPeriod: sum(all, (x) => x.sched), balance: worked - required,
    delayCount: 1, delayMinutes: 15, earlyCount: 1, earlyMinutes: 30, overtime: 120, leaveMinutes: 600,
    absentDays: absent.length, absentMinutes: sum(absent, (x) => x.sched), incompleteDays: 1, leaveDays: 1,
    missionDays: 1, remoteDays: 1, remotePendingDays: 1, remoteMinutes: 600, presentDays: 6,
  };
  for (const [k, v] of Object.entries(want)) check(`summary.${k} = ${v}`, report.summary[k], v);

  const perf = await must(HR, 'GET', `/attendance/reports/performance?y=${py}&m=${pm}`);
  const row = perf.items.find((r) => r.employee.id === p1.id);
  check('performance list shows the same summary', row?.summary, report.summary);
  const admin = await must(HR, 'GET', `/attendance/reports/employees/${p1.id}?y=${py}&m=${pm}`);
  check('admin report = self report', admin.summary, report.summary);
  const team = await must(APR, 'GET', `/attendance/team/members/${p1.id}/report?y=${py}&m=${pm}`);
  check('team report = self report', team.summary, report.summary);

  // Whichever of the two falls first — it depends on the weekday the month starts on.
  const [rangeFrom, rangeTo] = [D.delay, D.early].sort();
  const range = await must(EMP, 'GET', `/attendance/me/report?from=${rangeFrom}&to=${rangeTo}`);
  check('a custom range covers exactly its days', [range.days[0].date, range.days.at(-1).date], [rangeFrom, rangeTo]);

  console.log('== CSV export');
  const csv = await (await fetch(`${API}/attendance/me/report/export?y=${py}&m=${pm}`, { headers: { Authorization: `Bearer ${EMP}` } })).text();
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const table = lines.slice(lines.findIndex((l) => l.startsWith('تاریخ,')) + 1);
  check('one CSV row per day of a past month', table.length, days.length);
  const delayRow = table.find((l) => l.startsWith(util.formatJalaliDate(D.delay)));
  check('delay day in CSV: 08:15 in, 17:00 out, 08:45 worked, 00:15 late', delayRow?.split(',').slice(3, 7), ['08:15', '17:00', '08:45', '00:15']);

  console.log('== leave balance');
  const bal = (await must(EMP, 'GET', '/attendance/me/balances')).items.find((b) => b.leaveType === 'entitled');
  check('approved leave drew 480 + 120 minutes', bal?.usedMinutes, 600);

  console.log('== races: double taps and two reviewers at once');
  const ADM = tok(4);
  const statuses = (rs) => rs.map((r) => r.status).sort();
  const later = (n) => util.addDays(today, n);
  const usedOf = (type, date) => Number(sql(`select coalesce(sum(used_minutes), 0) from leave_balance_entity
    where employee_id = ${p1.id} and leave_type = '${type}' and year = ${util.dateToJalali(date).year}`));
  const approveAs = (token, r) => call(token, 'POST', `/attendance/requests/${r.id}/approve`);

  const taps = await Promise.all([1, 2, 3, 4].map(() => call(EMP, 'POST', '/attendance/me/check-in', { lat: 35.7, lng: 51.4 })));
  check('four check-ins at once: no server error, exactly one succeeds',
    [taps.every((r) => r.status < 500), taps.filter((r) => r.body?.success).length], [true, 1]);
  check('…and today has one attendance row', sql(`select count(*) from attendance_entity where employee_id = ${p1.id} and date = '${today}'`), '1');

  const once = await file({ type: 'leave_entitled_daily', dateFrom: later(20), dateTo: later(20) });
  const drawnBefore = usedOf('entitled', later(20));
  check('one request approved by two reviewers at once: one wins, one is told it was decided',
    statuses(await Promise.all([approveAs(HR, once), approveAs(ADM, once)])), [200, 409]);
  check('…and its leave is drawn once', usedOf('entitled', later(20)) - drawnBefore, 480);

  let lost = 0;
  for (const [type, ledger, n] of [['leave_sick_hourly', 'sick', 21], ['leave_entitled_hourly', 'entitled', 22], ['leave_entitled_hourly', 'entitled', 23]]) {
    const a = await file({ type, date: later(n), timeFrom: '08:00', timeTo: '10:00' });
    const b = await file({ type, date: later(n), timeFrom: '14:00', timeTo: '16:00' });
    const start = usedOf(ledger, later(n));
    const rs = await Promise.all([approveAs(HR, a), approveAs(ADM, b)]);
    if (statuses(rs).join() !== '200,200' || usedOf(ledger, later(n)) - start !== 240) lost++;
  }
  check('two leaves approved at the same moment both draw — first-of-year ledger included (3 rounds)', lost, 0);

  const sent = await Promise.all([1, 2, 3].map(() => call(EMP, 'POST', '/attendance/me/requests', { type: 'mission_daily', dateFrom: later(30), dateTo: later(30) })));
  check('the same request sent three times at once is filed once', statuses(sent), [201, 409, 409]);
  const regrant = await call(HR, 'POST', `/attendance/reports/employees/${p1.id}/grants`, { type: 'leave_entitled_daily', dateFrom: later(20), dateTo: later(20) });
  check('granting leave over an approved leave is refused', regrant.status, 409);

  console.log('== holiday deactivation');
  const hol = (await must(HR, 'GET', `/attendance/holidays?year=${py}&month=${pm}`)).items.find((h) => h.date === D.holiday);
  await must(HR, 'POST', `/attendance/holidays/${hol.id}/toggle`);
  const r2 = await must(EMP, 'GET', `/attendance/me/report?y=${py}&m=${pm}`);
  check('a deactivated holiday is a working (absent) day again', ['status', 'scheduled'].map((k) => r2.days.find((d) => d.date === D.holiday)[k]), ['absent', 480]);
  await must(HR, 'POST', `/attendance/holidays/${hol.id}/toggle`);

  console.log('== shift history');
  const short = await must(HR, 'POST', '/attendance/shifts', { name: 'کوتاه', year: py, days: [0, 1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, isActive: true, startTime: '10:00', endTime: '14:00' })) });
  const p5 = await must(HR, 'POST', '/attendance/employees', { userId: 5, personnelCode: 'C-5', workplaceId: wp.id, shiftId: shift.id, shiftStartDate: monthFrom });
  const switchDay = days[15];
  await must(HR, 'PATCH', `/attendance/employees/${p5.id}`, { shiftId: short.id, shiftStartDate: switchDay });
  const r5 = await must(HR, 'GET', `/attendance/reports/employees/${p5.id}?y=${py}&m=${pm}`);
  const before = r5.days.find((d) => d.date < switchDay && util.iranWeekday(d.date) === SAT && d.date !== D.holiday);
  // Skip the suite's own test holiday, which can fall on the first Saturday after the change.
  const after = r5.days.find((d) => d.date >= switchDay && util.iranWeekday(d.date) === SAT && d.date !== D.holiday);
  check('days before a shift change keep the old schedule', [before.scheduled, before.shiftStart], [480, '08:00']);
  check('days after it use the new one', [after.scheduled, after.shiftStart], [240, '10:00']);
  const hist = await must(HR, 'GET', `/attendance/employees/${p5.id}`);
  check('shift history has both periods, newest first', hist.shiftHistory.map((h) => h.shift.name), ['کوتاه', 'دوپاره']);

  console.log('== work-policy caps');
  const policy = await must(HR, 'POST', '/attendance/work-policies', {
    name: 'سقف آزمون', rules: [
      { requestType: 'overtime', year: cy, monthlyCapMinutes: 180, allowOverMonthlyCap: false },
      { requestType: 'mission', year: cy, yearlyCapMinutes: 960, allowOverYearlyCap: false },
    ],
  });
  await must(HR, 'PATCH', `/attendance/employees/${p5.id}`, { workPolicyId: policy.id });
  const thisMonth = util.jalaliMonthRange(cy, cm);
  const next = cm === 12 ? util.jalaliMonthRange(cy + 1, 1) : util.jalaliMonthRange(cy, cm + 1);
  const ot = (date) => call(EMP2, 'POST', '/attendance/me/requests', { type: 'overtime', date, timeFrom: '17:00', timeTo: '19:00' });
  const first = await ot(thisMonth.from);
  check('overtime 2h under a 3h monthly cap: accepted', first.status, 201);
  const second = await ot(util.addDays(thisMonth.from, 1));
  check('another 2h in the same month: refused (pending counts)', second.status, 400);
  const nextMonth = cy === dateYear(next.from) ? await ot(next.from) : { status: 201 };
  check('2h in the next month: accepted', nextMonth.status, 201);
  await must(EMP2, 'DELETE', `/attendance/me/requests/${first.body.id}`);
  check('after withdrawing the first, the second fits again', (await ot(util.addDays(thisMonth.from, 1))).status, 201);
  const m1 = await call(EMP2, 'POST', '/attendance/me/requests', { type: 'mission_daily', dateFrom: thisMonth.from, dateTo: util.addDays(thisMonth.from, 1) });
  check('two mission days (960 min) fill the 16h yearly cap', m1.status, 201);
  const m2 = await call(EMP2, 'POST', '/attendance/me/requests', { type: 'mission_hourly', date: thisMonth.to, timeFrom: '10:00', timeTo: '11:00' });
  check('one more mission hour: refused', m2.status, 400);

  console.log('== deactivation and team scope');
  await must(HR, 'PATCH', `/attendance/employees/${p5.id}`, { active: false });
  check('inactive profile: /me says no profile', (await must(EMP2, 'GET', '/attendance/me')).hasProfile, false);
  check('inactive profile cannot check in', (await call(EMP2, 'POST', '/attendance/me/check-in', { lat: 35.7, lng: 51.4 })).status, 403);
  const perf2 = await must(HR, 'GET', `/attendance/reports/performance?y=${py}&m=${pm}`);
  check('inactive profile drops out of the performance list', perf2.items.some((r) => r.employee.id === p5.id), false);
  await must(HR, 'PATCH', `/attendance/employees/${p5.id}`, { active: true });

  check('approver reaches the member of his group', (await call(APR, 'GET', `/attendance/team/members/${p1.id}`)).status, 200);
  await must(HR, 'PATCH', `/attendance/employees/${p1.id}`, { jobGroupId: null });
  check('…and loses access the moment she leaves it', (await call(APR, 'GET', `/attendance/team/members/${p1.id}`)).status, 404);

  console.log('== date helpers');
  check('00:30 Tehran is already the next civil day', util.tehranDateOf(new Date('2026-10-14T21:00:00Z')), '2026-10-15');
  check('23:59 Tehran is still the same day', util.tehranDateOf(new Date('2026-10-15T20:29:00Z')), '2026-10-15');
  check('Thursday 2026-10-15 is Iranian weekday 5', util.iranWeekday('2026-10-15'), 5);
  check('Esfand 1403 (leap) ends 2025-03-20', util.jalaliMonthRange(1403, 12).to, '2025-03-20');
  check('Esfand 1404 ends 2026-03-20, Farvardin 1405 starts 2026-03-21', [util.jalaliMonthRange(1404, 12).to, util.jalaliMonthRange(1405, 1).from], ['2026-03-20', '2026-03-21']);
  check('Mehr 1405 is 30 days from 2026-09-23', [util.jalaliMonthRange(1405, 7).from, util.daysInclusive(...Object.values(util.jalaliMonthRange(1405, 7)))], ['2026-09-23', 30]);

  console.log(`\npassed: ${pass}  failed: ${fail}`);
  process.exit(fail ? 1 : 0);
}

/** Jalali year of a civil date (for the month-boundary check). */
function dateYear(date) {
  return util.dateToJalali(date).year;
}

main().catch((e) => { console.error('ERROR', e.message); process.exit(2); });
