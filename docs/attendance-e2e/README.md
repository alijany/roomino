# Attendance module — end-to-end suites

`lint` type-checks; these prove the module behaves, against a running API and
a real Postgres, like the finance suites.

| Suite | What | How |
|---|---|---|
| `01-attendance.sh` | flows and access — who can do what | `curl` + `jq` + `psql` |
| `03-maintenance.sh` | admin maintenance — reset (validation, both scopes), schedule mode and self-declared check-in; run right after `01`, on its database | `curl` + `jq` + `psql` |
| `04-attendance-modes.sh` | the three attendance modes — mode per group and per person and its history, «منعطف» without delay, overtime from the check-out (nothing / recorded / awaiting approval, caps, supersede, decline), the forgotten check-out prompt, «بدون ثبت» (refused check-in, «امروز هستم» (located, remote fallback), days-based report and CSV, undeclared days absent, «حاضر بود» by HR and by team approvers, leave and recorded times, CSV, reset); run on its own fresh database | `curl` + `jq` + `psql`, Node 18+ |
| `02-calculations.mjs` | the arithmetic — every day of a planted month, the summary, caps, shift history; and races (double taps, two reviewers at once) | Node 18+, `psql` |

## Prerequisites

- The API on `127.0.0.1:4000` against a database you are willing to drop.
- `jq`, `psql` reachable as `postgres` (a few checks read columns directly), and
  for `01` and `03` GNU `date` (`date -d yesterday`). On macOS put a small
  `date`/`psql` shim first on `PATH` (the second runs `docker exec … psql`).
- The API reads its port from `PORT` (default 4000), so a second instance can
  run on its own database beside a dev one: `PORT=4100 POSTGRES_DB=roomino
  REDIS_PORT=6380 ADMIN_PHONE= node dist/src/main`, then `API=http://127.0.0.1:4100/api/v1`.
- The six personas from `seed-users.sql`.

## Running it

It needs a **fresh database** — it asserts absolute counts.

```bash
pkill -f 'dist/src/mai[n]'; sleep 3            # stop the API before dropping
psql -h 127.0.0.1 -U postgres -c 'DROP DATABASE roomino;' -c 'CREATE DATABASE roomino;'
# start the API — migrations run on boot
psql -h 127.0.0.1 -U postgres -d roomino -f seed-users.sql
export JWT_SECRET=<the dev API's secret>
for i in 1 2 3 4 5 6; do node mint-token.js $i +9891200000$((10+i)) > /tmp/at_$i; done
bash 01-attendance.sh                          # TOK=<dir> if the tokens aren't in /tmp
bash 03-maintenance.sh                         # same database, straight after 01
```

If `ADMIN_PHONE` is set in `apps/core-api/.env`, start the API with
`ADMIN_PHONE=` — otherwise the bootstrap admin takes user id 1 and every
persona below is off by one.

`04-attendance-modes.sh` also needs a fresh database of its own (it adds
three personas, ids 7–9, so `JWT_SECRET` must be exported); run it after
loading `seed-users.sql` and minting tokens 1–6, with nothing else run first.

`02-calculations.mjs` needs a fresh database of its own (same steps, then
`node 02-calculations.mjs`) and a built API (`pnpm --filter core-api build`):
it imports the date helpers from `dist/` to cross-check them.

The suite is date-independent: the test shift runs all seven days and dates
are computed in `Asia/Tehran`. The holiday-sync checks pass with the official
calendar reachable or not (the fallback stores the fixed solar holidays); the
run prints which source it got.

## The six personas

| id | phone | roles | profile |
|---|---|---|---|
| 1 | `+989120000011` | user | سارا — «توسعه» |
| 2 | `+989120000012` | user | رضا — «توسعه», and its approver |
| 3 | `+989120000013` | hr, user | نگار — no group (for the self-review check) |
| 4 | `+989120000014` | admin | — |
| 5 | `+989120000015` | user | علی — «پشتیبانی», today is his fixed remote day |
| 6 | `+989120000016` | user | none |

رضا is both an approver and a member of the group he approves for: that is
where the "never yourself" rule gets exercised. علی is outside his team.

## What `01-attendance.sh` covers

Setup and validation · role gating · GPS in/out of radius · unpermitted
remote check-in filing a request · fixed remote days · per-type request
validation and Persian digits · yearly leave cap counting pending requests ·
team scoping (board, requests, reports, corrections — all 404 outside the
team) · self-review blocked · approval effects (balance, manual check-in) ·
withdrawal · day statuses, delay, overtime, planned leave · corrections ·
performance list, filters, board · CSV exports · grants · holidays and sync
idempotence · user deletion with and without history.

## What `03-maintenance.sh` covers

Admin-only access (HR refused) · reset validation leaves data intact · a
`records` reset keeps profiles, setup and approvers · self-declared check-in:
validation, off by default (a far check-in refused), on — no position asked
or kept even when sent, an office day by default, check-out from anywhere,
«امروز هستم» from anywhere, remote filed for approval as «خوداظهاری», the
CSV source, off again at once, survives a reset · schedule mode:
validation, on/off the same day undone, the note, check-in/out refused for
everyone, the board · a planted week (the period's start moved back in the
database, holidays cleared): a day with nothing recorded counts in full, a
late arrival filed as manual attendance is late with the check-out taken
from the shift, a day marked absent, hourly leave taken out of a presumed
day, a day's leave · switching off keeps today and the past by schedule,
on again carries the period on · an `all` reset empties the module but
keeps users and the mode.

## What `02-calculations.mjs` covers

Last Jalali month for one person on a split shift (Sat–Wed 08–12 + 13–17,
Thursday 08–12, Friday off), onboarded on the 5th: exact check-ins planted in
the database, requests filed and decided through the API, and every day's
status, worked, delay, early, overtime, leave and remote minutes compared with
values computed independently — then the monthly summary, the same numbers
through the performance, admin and team reports, a custom range, the CSV, the
leave ledger, holiday deactivation, shift history, monthly and yearly caps,
deactivation and team scope.

The race checks fire requests in parallel: four check-ins at once (one
succeeds, no 500), one request approved by two reviewers (200 and 409, leave
drawn once), two leaves approved at the same moment (both drawn, including the
first-of-year ledger), one request sent three times (filed once), and a grant
over an approved leave (409).
