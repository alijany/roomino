# Attendance — frontend (`/dashboard/attendance`)

حضور و غیاب. Backend and business rules: [`apps/core-api/src/attendance/README.md`](../../../../../core-api/src/attendance/README.md).

## Pages

| Route | Who | What |
|---|---|---|
| `/` | anyone with a profile | check in/out with GPS (remote fallback), today's shift, month at a glance, link to «تیم من» for approvers |
| `/my-report` | profile | day-by-day report, filters, leave balance, CSV; a day needing a fix offers a pre-filled manual-attendance request |
| `/my-requests` | profile | requests by status, new request, withdraw a pending one |
| `/team`, `/team/requests`, `/team/[id]` | job-group approvers | today's board of the team (same overview as `/board`, with the team's newest pending requests to open and approve/reject in place), the team queue, a member's report with corrections and schedule (shift from a date, remote days, active) |
| `/board` | admin, hr | today's board for everyone: tiles for who is at work, remote, on leave, not in yet or missing — each filters the table — and the newest pending requests to open and decide right there (refreshes every minute) |
| `/requests` | admin, hr | the full review queue, search and category filter |
| `/performance`, `/performance/[id]` | admin, hr | company-wide month/range summary + CSV; one person's profile, balances and report with corrections and grants |
| `/employees` | admin, hr | attendance profiles — added to existing users, one at a time or in a batch (pick users, number their codes in order, one shared workplace/shift); attendance mode per person |
| `/maintenance` | admin | schedule-mode switch (with a note for staff, and its history); self-declared check-in switch («ورود بدون موقعیت مکانی»); wipe attendance data: records only (check-ins, requests, leave ledgers) or everything incl. setup and profiles; current counts, typed confirmation |
| `/settings` | admin, hr | tabs: workplaces (map picker: click or drag the pin, radius drawn live, "use my location"), shifts, job groups (approvers and attendance mode), work policies, holidays & official sync |

The dashboard home (`/dashboard`) is a 12-column row of widgets: today's
attendance (`AttendanceTodayCard`, `attendance.component.today-card.tsx`, half
the row) and room booking (`ReservationsWidget`). The card has the status and
shift on top, the day's times in the middle, the check-in/out button above a
footer of shortcuts (new request opens the form in place, my report, my team
for approvers, details). It shares `useCheckInFlow`
(`attendance.hook.check-in.ts`) and `useTodayStatus`
(`attendance.hook.today-status.ts`) with the attendance home, so GPS, the
remote fallback and errors behave the same in both. People without a profile
don't see it. The older full-width strip (`AttendanceTodayWidget`) is kept but
no longer used.

**Attendance modes.** `/attendance/me` returns `attendanceMode`, and the
card and the home change with it:

- **ساعت‌دار** — as above. After a check-out past the shift's end a toast says
  what became of the overtime (recorded, or sent to the approver), and a
  notice stays on the day. A check-in with no check-out in the last week shows
  `MissingCheckOutNotice`: one button opens the manual-attendance request
  pre-filled with that day and the shift's end.
- **منعطف** — the same, with a line saying only the hours count; no «late».
- **بدون ثبت** — no times and no check-in button. `UntrackedActions`
  (`attendance.component.mode-today.tsx`) offers «امروز هستم» and «امروز نیستم» side by side
  (the first can be taken back, the second opens the request form for today).
  «امروز هستم» is located like a check-in (`usePresenceFlow` in
  `attendance.hook.presence.ts`): outside the workplace it offers «اعلام حضور
  دورکاری»; once declared only the confirmation and «بازگرداندن» remain. The request
  form drops remote work and manual attendance for them. Leave or a mission
  already on file says so instead of asking.

Modes are chosen in the job-group form and, per person, in the employee form
(`AttendanceModePicker`: three cards with a plain explanation of each, and a
«طبق گروه شغلی» card for a person).

**Month-end for «بدون ثبت».** A past working day nobody declared is absent
(`ReportDay.undeclared`, badge «غایب (اعلام نشده)»). In a person's report the
amber bar «N روز اعلام‌نشده» offers «حاضر بود برای همه‌ی این روزها» and each such
day has its own «حاضر بود» (`ConfirmPresenceModal`, with a note); a confirmed day
has «بازگرداندن اعلام حضور». The performance list has an «اعلام‌نشده» column so
the review knows where to start, and the summary has «اعلام حضور X از Y روز».
The boards show «در انتظار اعلام» / «اعلام حضور شد» and a note that today is
not over — informational, never a fault.

**Reports in days.** When `Report.attendanceMode` is `untracked`
(`my-report`, `MemberReport`), `ReportSummaryTiles` and `DayList` get `daily`:
«حضور X از Y روز» instead of hours, no ورود/خروج/کارکرد columns, a declaration
badge per day. The performance table shows `X روز / از Y روز کاری` for such rows.

**Location trouble.** `getPosition` throws a `LocationError` (blocked,
unavailable, timeout, insecure, unsupported) after trying GPS accuracy and
then the coarser network position. `LocationIssueNotice` shows the reason,
how to allow it again (Safari/iPhone steps), the browser's own message and a
retry button.

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

**Self-declared check-in (ورود بدون موقعیت مکانی).** When `/attendance/me`
says `selfDeclared`, `useCheckInFlow` and `usePresenceFlow` never ask for a
position — no prompt, no «در حال دریافت موقعیت», no location help. Nothing
refuses the check-in, so remote can't be offered after a refusal: the home and
the dashboard card show «دورکاری» beside «ثبت ورود» instead. The home drops
the radius line and shows `SelfDeclaredHint`; a report day says «ورود/خروج
خوداظهاری» for `source === 'self'`.

«تیم من» is not a role, so `RouteItem.roles` can't express it: the sidebar adds
it to the attendance group when `/attendance/me` says `isApprover`, and the
attendance home and the dashboard card link to it too.

## Files

| File | Holds |
|---|---|
| `attendance.types.ts` | wire types |
| `attendance.api.ts` | every SWR hook; review and correction hooks take a base path (`/attendance/requests` vs `/attendance/team/requests`) because the server checks a different rule on each |
| `attendance.constants.ts` | labels, badge tones, weekday names, day filters |
| `attendance.util.ts` | Persian digits (`fa`), minutes (`hm`), request duration in days for daily types, civil-date ↔ picker conversion, geolocation (`LocationError`), authenticated CSV download |
| `attendance.component.layout.tsx` | header, panel, stat tile, badges, modal shell, field wrappers |
| `attendance.component.day-list.tsx` | the expandable day list shared by every report |
| `attendance.component.member-report.tsx` | a managed person's report — used by admin and team pages |
| `attendance.component.request-form.tsx` | type-aware request form with attachments; also the admin "grant" form |
| `attendance.component.attachments.tsx` | pick files in the form; list, add and remove them on a request |
| `attendance.component.mode-picker.tsx` | the attendance-mode radio cards (job group and employee forms) |
| `attendance.component.mode-today.tsx` | «امروز هستم / نیستم», the forgotten check-out notice, overtime notice, flexible hint |
| `attendance.component.board-overview.tsx` | the board for admin/HR and for «تیم من»: filter tiles, table, pending requests with approve/reject |
| `attendance.component.presence-review.tsx` | «حاضر بود» — confirm undeclared days |
| `attendance.component.location-issue.tsx` | what to do when the position can't be read |
| `attendance.component.today-card.tsx`, `attendance.hook.today-status.ts` | the dashboard card and the state it derives |
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
