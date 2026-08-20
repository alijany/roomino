# Finance module — end-to-end suites

84 checks against a running API and a real Postgres. `lint` type-checks; these
are what actually prove the module behaves. Plain `curl` + `psql`, no framework,
because the point is to exercise the HTTP surface a client sees.

## Prerequisites

- The API running on `127.0.0.1:4000` against a database you are willing to drop.
- `FINANCE_SECRET_KEY` set (suite 4 asserts the credential is encrypted at rest).
- `psql` reachable as the `postgres` user (suites 4 checks the column directly).
- Five seeded users — see `seed-users.sql`.

## Running them

They are **not independent**. Run in this grouping, each group on a freshly
created database:

| Group | Command | Why |
|---|---|---|
| 1 | `bash 01-spine.sh` | own DB |
| 2 | `bash 02-vendors-recurring.sh && bash 03-reports.sh` | suite 3 counts the schedule suite 2 creates, and asserts absolute totals that suite 1's payments would inflate |
| 3 | `bash 04-destination-fork.sh` | own DB |

Out of order, suite 3 fails nine checks that are arithmetic over the wrong rows,
not defects. Read a failure there as "wrong database state" first.

**Stop the API before dropping the database.** `DROP DATABASE` fails while a
connection is open; the next run then reports doubled figures instead of an
error, which reads like an aggregation bug.

```bash
pkill -f 'dist/src/mai[n]'          # bracket keeps the pattern from matching your own shell
sleep 3
psql -h 127.0.0.1 -U postgres -d postgres -c 'DROP DATABASE roomino;'
psql -h 127.0.0.1 -U postgres -d postgres -c 'CREATE DATABASE roomino;'
# start the API — migrations and FinanceBootstrapService run on boot
psql -h 127.0.0.1 -U postgres -d roomino -f seed-users.sql
export JWT_SECRET=<the dev API's secret>
node mint-token.js 1 +989120000001 false > /tmp/t_emp   # and 2..5, see the table below
```

## The five users

| id | phone | roles | token file |
|---|---|---|---|
| 1 | `+989120000001` | user | `/tmp/t_emp` |
| 2 | `+989120000002` | approver, user | `/tmp/t_apr` |
| 3 | `+989120000003` | finance, user | `/tmp/t_fin` |
| 4 | `+989120000004` | admin | `/tmp/t_adm` |
| 5 | `+989120000005` | user | `/tmp/t_emp2` |

User 5 exists to prove a stranger gets a 403, and users 2 and 3 hold two roles
each because the module's interesting access bugs live in multi-role users.

The suites read those paths; change `/var/tmp` in the scripts if you put them
elsewhere.
