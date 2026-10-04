# Attendance — frontend (`/dashboard/attendance`)

حضور و غیاب. Backend and business rules: [`apps/core-api/src/attendance/README.md`](../../../../../core-api/src/attendance/README.md).

## Pages

| Route | Who | What |
|---|---|---|
| `/` | anyone with a profile | check in/out with GPS (remote fallback), today's shift, month at a glance, link to «تیم من» for approvers |
| `/my-report` | profile | day-by-day report, filters, leave balance, CSV; a day needing a fix offers a pre-filled manual-attendance request |
| `/my-requests` | profile | requests by status, new request, withdraw a pending one |
| `/team`, `/team/requests`, `/team/[id]` | job-group approvers | today's board, the team queue, a member's report with corrections and schedule (shift from a date, remote days, active) |
| `/board` | admin, hr | today's board for everyone, latest pending requests (refreshes every minute) |
| `/requests` | admin, hr | the full review queue, search and category filter |
| `/performance`, `/performance/[id]` | admin, hr | company-wide month/range summary + CSV; one person's profile, balances and report with corrections and grants |
| `/employees` | admin, hr | attendance profiles — added to existing users |
| `/settings` | admin, hr | tabs: workplaces (OSM preview, "use my location"), shifts, job groups & approvers, work policies, holidays & official sync |

«تیم من» is deliberately not in the sidebar: it belongs to whoever an admin
assigned as a job-group approver, which is not a role, so `RouteItem.roles`
can't express it. The attendance home links to it when `/attendance/me` says
`isApprover`.

## Files

| File | Holds |
|---|---|
| `attendance.types.ts` | wire types |
| `attendance.api.ts` | every SWR hook; review and correction hooks take a base path (`/attendance/requests` vs `/attendance/team/requests`) because the server checks a different rule on each |
| `attendance.constants.ts` | labels, badge tones, weekday names, day filters |
| `attendance.util.ts` | Persian digits (`fa`), minutes (`hm`), civil-date ↔ picker conversion, geolocation, authenticated CSV download |
| `attendance.component.layout.tsx` | header, panel, stat tile, badges, modal shell, field wrappers |
| `attendance.component.day-list.tsx` | the expandable day list shared by every report |
| `attendance.component.member-report.tsx` | a managed person's report — used by admin and team pages |
| `attendance.component.request-form.tsx` | type-aware request form; also the admin "grant" form |
| `attendance.component.review.tsx` | approve/reject, request details, correction modal |
| `attendance.component.settings-*.tsx` | the five settings tabs |

## Conventions specific to this domain

- **Dates.** The API speaks Gregorian civil dates (`"YYYY-MM-DD"`, Tehran) and
  `"HH:mm"`; the pickers speak `Date`. Convert only with `toCivilDate` /
  `fromCivilDate`, never `toISOString().slice(0, 10)` — that's UTC and is a
  day off for anything picked after 20:30 Tehran.
- **Digits.** The API returns Latin digits (labels like `periodLabel` too);
  pass anything shown through `fa()`.
- **Time pairs read in page direction** — start first for a Persian reader
  (`۰۸:۰۰ تا ۱۷:۰۰`, `ورود ← خروج`). Don't wrap them in `dir="ltr"`.
