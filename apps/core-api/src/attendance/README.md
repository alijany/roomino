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
- **Approval effects** — leave draws down `LeaveBalanceEntity`, full-day leave
  marks its days `on_leave`, manual attendance writes the check-in/out.
- **Holidays** — `POST /attendance/holidays/sync` (and a cron on the 1st of
  each month) pulls the official calendar from `ATTENDANCE_HOLIDAYS_API_URL`
  (default `https://pnldev.com/api/calender`); if it's unreachable the fixed
  solar holidays are stored and the response says so. Official holidays are
  deactivated, never deleted, so a sync doesn't resurrect them.

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

Stored but, as in Tesmino, not enforced: `allowedDeviceType`, `useWifi`,
`trackingEnabled`, `flexMinutes`, `dailyOvertimeCapMinutes`,
`restrictApprovalTime`.

## Verifying

`lint` type-checks; `docs/attendance-e2e/` is the behavioural suite (86
checks, curl + psql against a real Postgres).
