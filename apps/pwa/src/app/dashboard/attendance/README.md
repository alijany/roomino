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
| `/employees` | admin, hr | attendance profiles — added to existing users, one at a time or in a batch (pick users, number their codes in order, one shared workplace/shift) |
| `/maintenance` | admin | schedule-mode switch (with a note for staff, and its history); wipe attendance data: records only (check-ins, requests, leave ledgers) or everything incl. setup and profiles; current counts, typed confirmation |
| `/settings` | admin, hr | tabs: workplaces (map picker: click or drag the pin, radius drawn live, "use my location"), shifts, job groups & approvers, work policies, holidays & official sync |

The dashboard home (`/dashboard`) opens with `AttendanceTodayWidget`
(`attendance.component.today-widget.tsx`): today's status, the next action
(check in / check out), time present so far and shortcuts. It shares
`useCheckInFlow` (`attendance.hook.check-in.ts`) with the attendance home, so
GPS, the remote fallback and errors behave the same in both. People without
a profile don't see it.

**Schedule mode (حضور طبق شیفت).** When `/attendance/me` says
`scheduleMode`, the widget and the attendance home drop check-in/out: times
nobody recorded show as the shift's («طبق شیفت»), the counter runs from the
shift start, and the one action is «ثبت تأخیر یا خروج زودتر»
(`attendance.component.schedule-mode.tsx`) — the request form as manual
attendance at the time of the tap, its type switchable to leave or
overtime. `todayPunches` merges what's recorded with today's
`manualRequests`, so an exception shows «در انتظار تایید» until it's decided.
The board and «تیم من» explain the mode; reviewers record an absence with
«غایب بود» in the correction form.

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
| `attendance.component.map.tsx` | Leaflet map: workplace radius, points, location picker |

## Maps

Leaflet over OpenStreetMap tiles, as in Tesmino — three places:

- **Home** — the workplace and its allowed radius; after a check-in or
  check-out, «موقعیت شما» where GPS put the person.
- **Report day** (expanded, any report) — check-in (green) and check-out
  (red) pins against the day's workplace radius. Only days with a GPS point
  get a map.
- **Workplace form** — a picker: click or drag the pin; typed coordinates and
  «استفاده از موقعیت فعلی من» move it; the circle follows the radius field.

Leaflet is imported inside an effect (it needs `window`), and pins are
`divIcon`s because Leaflet's default marker images don't survive bundling.
Tiles come from `NEXT_PUBLIC_MAP_TILE_URL` (default OSM's public server,
which is rate-limited — use a mirror or provider in production).

## Conventions specific to this domain

- **Dates.** The API speaks Gregorian civil dates (`"YYYY-MM-DD"`, Tehran) and
  `"HH:mm"`; the pickers speak `Date`. Convert only with `toCivilDate` /
  `fromCivilDate`, never `toISOString().slice(0, 10)` — that's UTC and is a
  day off for anything picked after 20:30 Tehran.
- **Digits.** The API returns Latin digits (labels like `periodLabel` too);
  pass anything shown through `fa()`.
- **Time pairs read in page direction** — start first for a Persian reader
  (`۰۸:۰۰ تا ۱۷:۰۰`, `ورود ← خروج`). Don't wrap them in `dir="ltr"`.
