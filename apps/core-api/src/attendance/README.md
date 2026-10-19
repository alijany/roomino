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
| `/attendance/maintenance` — row counts, schedule mode, reset | `admin` only (not HR — these change attendance for everyone, and a reset can't be undone) | `@Roles` |
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
         AttendanceRequestEntity >────────┤
              LeaveBalanceEntity >────────┘
HolidayEntity
```

- **Civil dates vs instants.** `date`, `dateFrom`, `startDate` … are
  Gregorian `"YYYY-MM-DD"` as seen in Tehran; `checkInAt` is a `timestamptz`.
  Shift and request times are wall-clock `"HH:mm"`. All conversion lives in
  `utils/attendance-time.util.ts` (fixed `+03:30`, no DST since 2022).
- **Weekdays** are Iranian order everywhere: 0 = شنبه … 6 = جمعه.
- **Shift history.** Changing someone's shift opens a new `EmployeeShiftEntity`
  period, so past days keep being measured against the old schedule.
- **Adding people.** `POST /attendance/employees` adds one profile;
  `POST /attendance/employees/batch` adds up to 100 with one shared
  assignment (workplace, shift, group, policy, remote days) and a personnel
  code each. Both go through `EmployeeService.createMany`: every clash —
  repeated user or code in the list, existing profile, taken code — is
  checked first and reported together, then all rows are written in one
  transaction or none.
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

It's stored as periods (`ScheduleModePeriodEntity`), not a flag, so switching
it off doesn't turn the days it covered into absences. On covers today at
once; off ends the period today and takes effect tomorrow — on the day it was
switched on, off removes the period instead. Switching on again before the
last period ran out carries it on. Switching is serialised with an advisory
lock. A reset never touches the periods.

`GET /attendance/me` returns `scheduleMode`, the admin's note, `todayStatus`
and `manualRequests` (today's manual requests still pending or rejected).

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
`trackingEnabled`, `flexMinutes`, `dailyOvertimeCapMinutes`,
`restrictApprovalTime`.

## Verifying

`lint` type-checks; `docs/attendance-e2e/` holds the behavioural suites
against a real Postgres: `01-attendance.sh` (89 checks — flows and access),
`02-calculations.mjs` (74 — the arithmetic of a planted month, and races)
and `03-maintenance.sh` (54 — reset and schedule mode, run after 01).
