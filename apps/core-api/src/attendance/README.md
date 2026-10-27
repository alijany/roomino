# Attendance & leave (`src/attendance/`)

حضور و غیاب — GPS check-in/out, shifts, leave/mission/remote/overtime
requests with approval, holidays, monthly reports and CSV export. Ported from
the Tesmino attendance app (Laravel 11 + Livewire); business rules and Persian
copy are kept identical unless listed under **Deviations** below.

## Who is who

Tesmino had two logins: admin-panel `users` and an `employees` table with its
own username/password. Here there is one identity — the Roomino `UserEntity`
with OTP login — and attendance adds a profile to it.

| Tesmino | Roomino |
|---|---|
| `Employee` (own login) | `UserEntity` + `EmployeeProfileEntity` (1:1). Name, phone and national id live on the user. |
| admin panel `User` | `admin` or `hr` role |
| `employees.role = manager` + `job_group_approvers` | job-group approver assignment **only** (`JobGroupEntity.approvers`). Unrelated to the finance `approver` role. |
| `reviewed_by` / `reviewed_by_user_id` (two columns) | `reviewedBy` → user |
| `edited_by_employee_id` / `edited_by_user_id` | `editedBy` → user |

A user without a profile doesn't track attendance; `GET /attendance/me`
answers `{ hasProfile: false }` so the UI can explain rather than 403.

## Access

| Area | Who | Enforced by |
|---|---|---|
| Workplaces, shifts (write), job groups, work policies, employees, holidays (write), all requests, company reports, corrections, grants | `admin`, `hr` | `@Roles` on every handler (`RolesGuard` reads handler metadata only) |
| Shifts and holidays (read) | anyone signed in | — |
| `/attendance/maintenance` — row counts, schedule mode, self-declared check-in, reset | `admin` only (not HR — these change attendance for everyone, and a reset can't be undone) | `@Roles` |
| `/attendance/me/**` — today, check-in/out, own report, own requests | anyone with an **active** profile | `EmployeeService.requireOwn` |
| `/attendance/team/**` — board, requests, member report/corrections/schedule | approvers of ≥1 job group | `EmployeeService.requireApprover` + `teamMemberOrFail` on every call |

Team scope is the members of the groups you approve for, **never yourself**.
A stranger's id answers 404, not 403. Nobody — HR included — decides on or
grants their own request.

## Model

```
WorkplaceEntity ──< EmployeeProfileEntity >── UserEntity (1:1)
ShiftEntity ──< ShiftDayEntity            │  >── JobGroupEntity >──< UserEntity (approvers)
ShiftEntity ──< EmployeeShiftEntity >─────┤  >── WorkPolicyEntity ──< WorkPolicyRuleEntity
                AttendanceEntity >────────┤
         AttendanceRequestEntity >────────┤  ──< AttendanceRequestAttachmentEntity
              LeaveBalanceEntity >────────┤
          EmployeeModePeriodEntity >──────┤
        PresenceDeclarationEntity >───────┘
HolidayEntity
```

- **Civil dates vs instants.** `date`, `dateFrom`, `startDate` … are
  Gregorian `"YYYY-MM-DD"` as seen in Tehran; `checkInAt` is a `timestamptz`.
  Shift and request times are wall-clock `"HH:mm"`. All conversion lives in
  `utils/attendance-time.util.ts` (fixed `+03:30`, no DST since 2022).
- **Weekdays** are Iranian order everywhere: 0 = شنبه … 6 = جمعه.
- **Shift history.** Changing someone's shift opens a new `EmployeeShiftEntity`
  period, so past days keep being measured against the old schedule.
- **Mode history.** Likewise for the attendance mode (see below):
  `EmployeeModePeriodEntity` keeps what mode a person was in on each day.
- **Adding people.** `POST /attendance/employees` adds one profile;
  `POST /attendance/employees/batch` adds up to 100 with one shared
  assignment (workplace, shift, group, policy, remote days). Both go through
  `EmployeeService.createMany`: every clash — repeated user, existing profile
  — is checked first and reported together, then all rows are written in one
  transaction or none.
- **Personnel code and job title are the user's.** They live on `UserEntity`
  (`personnelCode`, unique; `jobTitle`), not on the profile. A code is issued
  when a user is created — `T01`, `T02`, … (`user/user.personnel-code.ts`) —
  and an admin edits code and title with `PATCH /users/:id`. The profile views
  still return both, read from the user.
- **Reports are derived, never stored.** `ReportService.buildDay` is a line-for-line
  port of Tesmino's `AttendanceReportService::buildDay`; it batch-loads a
  period's attendance, requests, holidays and shifts so a company-wide report
  is a handful of queries.

## Flows

- **Check-in** inside the workplace radius (Haversine) → office day. Outside
  it → refused with `canRemote: true`; the client may retry with
  `remote: true`. A remote check-in on a fixed remote weekday or an approved
  remote day just records; otherwise it also files a pending `remote_daily`
  request. Pending → no credit; rejected → absent.
- **Requests** — daily types use `dateFrom..dateTo`, hourly types and
  overtime `date + timeFrom..timeTo`, manual attendance `date + manualTime +
  manualDirection`. Fields a type doesn't use are dropped.
- **Listing** — `status` is one of `pending` (the default), `approved`,
  `rejected` or `all`.
- **Overlap** — a request is refused (409) when a pending or approved one of
  the same category covers the same time: same dates for daily types,
  intersecting hours for timed ones on one day, the same direction for manual
  attendance. Back-to-back hours are fine.
- **Approval effects** — leave draws down `LeaveBalanceEntity`, full-day leave
  marks its days `on_leave`, manual attendance writes the check-in/out.
- **Concurrency** — submissions and grants lock the person's profile row, so
  the cap and overlap checks can't both pass for two at once. A review claims
  the request with one conditional `UPDATE … WHERE status = 'pending'`; the
  loser gets 409. Leave is added in SQL (`used_minutes + n`), and an approval
  that loses the race to create a shared row (attendance day, first ledger of
  the year) is retried once. A double-tapped check-in answers «already checked
  in», not 500.
- **Holidays** — `POST /attendance/holidays/sync` (and a cron on the 1st of
  each month) pulls the official calendar from `ATTENDANCE_HOLIDAYS_API_URL`
  (default `https://pnldev.com/api/calender`); if it's unreachable the fixed
  solar holidays are stored and the response says so. Official holidays are
  deactivated, never deleted, so a sync doesn't resurrect them.

## Schedule mode (حضور طبق شیفت)

For when daily check-in isn't wanted (GPS unreliable, a remote stretch): an
admin switches it on with `PATCH /attendance/maintenance/schedule-mode`
`{ enabled, note? }`. While it covers a day:

- `check-in` and `check-out` answer 403 — nobody punches.
- A shift day with nothing recorded counts as worked in full
  (`DayStatus.BY_SCHEDULE`, `worked = scheduled`), the same way an approved
  remote day does.
- Exceptions are the requests that already exist: leave, mission and
  overtime as usual; a late arrival or early departure as manual attendance.
  A recorded or approved time counts and the missing side defaults to the
  shift, so a 09:30 check-in is still 90 minutes late. Approved hourly leave
  comes out of a presumed day.
- Absence is recorded by a reviewer: the correction endpoint takes
  `absent: true`, which clears the times and marks the day absent (in any
  mode).
- The board shows `by_schedule` instead of «ورود ثبت نشده».
- **Board** — each person's status today also reflects what is *approved* for
  the day before they do anything: full-day leave (`on_leave`), a full-day
  mission (`mission`), a remote day or their fixed weekly remote day
  (`remote`); an actual check-in wins. `stats` counts `present` (everyone
  working, remote included), `remote`, `onLeave`, `mission`, `missing`,
  `pending`. «تیم من»'s board also returns the team's newest pending requests.

It's stored as periods (`ScheduleModePeriodEntity`), not a flag, so switching
it off doesn't turn the days it covered into absences. On covers today at
once; off ends the period today and takes effect tomorrow — on the day it was
switched on, off removes the period instead. Switching on again before the
last period ran out carries it on. Switching is serialised with an advisory
lock. A reset never touches the periods.

`GET /attendance/me` returns `scheduleMode`, the admin's note, `todayStatus`
and `manualRequests` (today's manual requests still pending or rejected).

## Self-declared check-in (ورود بدون موقعیت مکانی)

For when locating people isn't wanted or doesn't work, but times still
should be: an admin switches it on with `PATCH
/attendance/maintenance/self-declared` `{ enabled }`. While it's on:

- check-in, check-out and «امروز هستم» take **no position**: a `lat`/`lng`
  the client sends anyway is dropped, nothing is measured against the
  workplace radius, and a missing workplace is no obstacle. The person's word
  is taken.
- a check-in is an **office** day unless the person says `remote: true` —
  nothing refuses it, so the client offers «دورکاری» up front. Remote without
  permission files the pending `remote_daily` request as usual, its
  description ending «(خوداظهاری)».
- times are recorded with `AttendanceSource.SELF` (`self`); the report's day
  list and the CSV show «خوداظهاری».

`GET /attendance/me` returns `selfDeclared`, and the client skips geolocation
when it's true. Unlike schedule mode it's a flag, not periods
(`AttendanceSettingsEntity`, one row, id 1): it changes how a day is
recorded, not how it is measured, and every row keeps its source. It takes
effect at once both ways. Schedule mode, when on, still refuses check-in/out
outright. A reset never touches it.

## Attendance modes (نوع حضور)

How a person's presence is recorded and measured. Set per **job group**
(`JobGroupEntity.attendanceMode`, default `tracked`), with an optional
override on the person (`EmployeeProfileEntity.attendanceModeOverride`, null =
follow the group). Whoever has no group is `tracked`, which is how every
profile began — no data had to change.

| | ساعت‌دار `tracked` | منعطف `flexible` | بدون ثبت `untracked` |
|---|---|---|---|
| check-in/out | yes | yes | refused (403) |
| delay / early leave | counted | never — only the hours count | n/a |
| overtime | automatic, see below | request only | request only |
| a working day counts as | worked time | worked time | present only if declared |

**History, not a flag.** The report reads `EmployeeModePeriodEntity`, never the
live settings, so switching someone to «بدون ثبت» doesn't turn last month's
absences into presence. `AttendanceModeService.sync` keeps it in step after
anything that can change a person's mode (override, job group, a group's mode
or deletion). Starting «بدون ثبت» covers today; leaving it takes effect
tomorrow (nobody checked in this morning), unless it only began today — then
it is simply undone. A new profile's mode starts with its first shift day.
Company-wide schedule mode stays as it was and overrides every person's mode
for the days it covers.

### «ساعت‌دار»: overtime from the check-out

After a check-out (and after a reviewer's correction), time worked past the
shift's end is handled by `OvertimeSuggestionService.sync`:

- under 30 minutes: nothing;
- 30–60 minutes: recorded as **approved** overtime at once — an overtime
  request with `autoSuggested = true`, no reviewer;
- more than 60 minutes: a **pending** request, `autoSuggested = true`, for the
  approver (job-group approvers, else HR, else admins) to confirm or reject.
  It counts for nothing until approved.

The shift's `dailyOvertimeCapMinutes` caps the amount. `sync` is idempotent:
it creates, moves to new times, flips between approved and pending as the
minutes cross 60, or removes the row — but never touches one a person decided
on, never undoes a rejection (the person declining it counts: `cancelOwn` on
a suggestion keeps the row, rejected, so it isn't suggested again), and
overtime the person files themselves **replaces** the system's row for that
day (`RequestService.supersedeAutoOvertime`).

### «بدون ثبت»: «امروز هستم»

No check-in; the day counts as present only if it was **declared**:

- the person taps «امروز هستم» — `POST /attendance/me/presence`, today only,
  no time recorded, idempotent, taken back with `DELETE`; refused when the
  day isn't a working day, is already leave or a mission, or the person isn't
  «بدون ثبت». It is said **like a check-in**: the body is a `CheckInDto`
  (`lat`/`lng`/`remote`), and with GPS on the position must be inside the
  workplace radius. Outside it the answer is `{ success: false, canRemote:
  true }`; repeating it with `remote: true` declares a **remote day** — a
  pending `REMOTE_DAILY` request (description `AUTO_REMOTE_NOTE`) is filed
  for the reviewers, and `DELETE` withdraws it with the declaration. The
  declaration keeps `workMode`, `lat`, `lng`, `distanceM`;
- or a reviewer later confirms it — «حاضر بود», `POST
  /attendance/reports/employees/:id/presence` (admin/HR) or
  `/attendance/team/members/:id/presence` (approvers, own team, never
  yourself): up to 62 dates, all or nothing, with a note; `DELETE …?date=`
  takes one back;
- or a reviewer recorded check-in/out times for the day.

A past working day with none of these, and no leave or mission, is
**absent** (`undeclared: true` on the report day) until it is confirmed —
the month-end clean-up. **Today** is `awaiting` and not absent until the day
ends. Declarations live in `PresenceDeclarationEntity` (`declaredBy` and
`note` are set when a reviewer confirmed). The board shows `presence:
declared | not_declared` and `stats.notDeclared`, purely informational.

**Reports are in days.** Hours mean nothing without times, so for a person
whose mode on the report's last day is «بدون ثبت» `report()` returns
`attendanceMode: 'untracked'` and the summary carries `requiredDays` (counted
working days, leave/mission/holiday/awaiting excluded) and `attendedDays`
(present, by schedule or remote). The personal CSV becomes a day list (date,
weekday, status, declaration) and the performance CSV blanks the hour columns
for such rows.

### Forgotten check-out

`GET /attendance/me` returns `missingCheckOut` — the latest day in the last
week with a check-in and no check-out, unless a manual check-out for it is
already waiting — so the UI can offer the manual-attendance request
pre-filled with that day and the shift's end.

## Request attachments

Up to five images or PDFs (10 MB each) per request, kept private in storage and
read through short-lived presigned URLs. `GET|POST
/attendance/request-attachments/:requestId` and `DELETE …/:requestId/:id`:
anyone who may see the request can read them (its owner, admin/HR, the team's
approvers); only the owner adds or removes, and only while it is pending. A
reset removes the files from storage as well as the rows.

## Reset

`POST /attendance/maintenance/reset` `{ scope, confirm }` wipes the module in
one `TRUNCATE … RESTART IDENTITY` inside a transaction. `records` empties
attendance, requests and leave balances and keeps setup and profiles; `all`
also empties profiles, shift history, job groups (and their approvers),
policies, shifts, workplaces and holidays. Users, roles, notifications and the
schedule-mode periods are never touched. `confirm` must be `RESET_CONFIRMATION` (spaces/ZWNJ ignored).
There is no `CASCADE`: a table outside the module that starts referencing
these makes the reset fail rather than silently empty it too.

## Deviations from Tesmino

Deliberate — each fixes something that was wrong or unenforced there.

1. **Leave entitlement.** Tesmino never filled `accrued_minutes`, so a yearly
   cap with "over cap" disallowed rejected *every* leave. Here the rule's
   yearly cap *is* the entitlement: the balance is created with
   `accruedMinutes = yearlyCapMinutes`.
2. **Caps are enforced for every capped type**, monthly and yearly, and count
   pending requests — two submissions can no longer each slip under the cap.
   Tesmino checked the yearly leave cap only, against approved usage only.
3. **Hourly leave no longer marks the whole day `on_leave`.** Tesmino did,
   which hid the rest of that day's attendance from the report.
4. **Self-review is blocked.** With one identity, HR and approvers file
   requests too; nobody approves, rejects or grants their own.
5. **Requesters can withdraw** a request that is still pending.
6. **Notifications** — submitted requests notify the group's approvers (else
   HR, else admins); decisions notify the requester.
7. **Overlapping requests are refused** (see Flows). Tesmino accepted the same
   leave twice and, approved, drew it twice.

Stored but, as in Tesmino, not enforced: `allowedDeviceType`, `useWifi`,
`trackingEnabled`, `flexMinutes`, `restrictApprovalTime`. (`dailyOvertimeCapMinutes`
now caps the suggested overtime of «ساعت‌دار».)

## Verifying

`lint` type-checks; `docs/attendance-e2e/` holds the behavioural suites
against a real Postgres: `01-attendance.sh` (89 checks — flows and access),
`02-calculations.mjs` (74 — the arithmetic of a planted month, and races)
and `03-maintenance.sh` (77 — reset, schedule mode and self-declared check-in, run after 01).
