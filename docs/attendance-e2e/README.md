# Attendance module — end-to-end suite

`lint` type-checks; this proves the module behaves. Plain `curl` + `jq` +
`psql` against a running API and a real Postgres, like the finance suites.

## Prerequisites

- The API on `127.0.0.1:4000` against a database you are willing to drop.
- `jq`, and `psql` reachable as `postgres` (two checks read columns directly).
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
```

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

## What it covers

Setup and validation · role gating · GPS in/out of radius · unpermitted
remote check-in filing a request · fixed remote days · per-type request
validation and Persian digits · yearly leave cap counting pending requests ·
team scoping (board, requests, reports, corrections — all 404 outside the
team) · self-review blocked · approval effects (balance, manual check-in) ·
withdrawal · day statuses, delay, overtime, planned leave · corrections ·
performance list, filters, board · CSV exports · grants · holidays and sync
idempotence · user deletion with and without history.
