# Finance & External Payments — module reference

How the company pays for things: SaaS, internet, vendors, one-off purchases.
Request → approve → pay → recorded, with an append-only audit trail.

**Status:** Phases 0–3 shipped. Phase 4 (budgets, cost centres, OCR,
accounting export) is in
[`docs/finance-payments-module.md`](../../../../docs/finance-payments-module.md).

---

## Money — read this first

Every amount is an **integer in the currency's minor unit**. There are no
floats and no decimal columns anywhere in this module.

| | |
|---|---|
| Storage & reporting unit | **Rial** (IRR minor unit = 1 rial) |
| Display unit | **Toman** = rial ÷ 10, produced only by `formatMoney()` in the PWA |
| Foreign currencies | minor unit = cents (`amountMinor: 42000` = USD 420.00) |
| Column type | `types.bigint` — reads back as a **string**, always pass through `readBigint()` |

`toRial(amountMinor, currency, fxRate?)` in `utils/money.util.ts` is the only
conversion. A foreign amount with no rate resolves to `0` rial — the real figure
is captured at payment time. Because that would otherwise land a USD 50,000
invoice in the lowest approval band, `enforceMinimumApproval()` routes every
foreign request to an approver regardless.

Do not divide or multiply by ten anywhere else.

---

## Entities (`entities/`)

| Entity | Notes |
|---|---|
| `PaymentRequestEntity` | The core object. Holds `pendingRole`/`pendingSequence`, a denormalised pointer to the outstanding approval step, maintained **only** by `PaymentRequestService`. |
| `ApprovalRuleEntity` | The matrix: amount band → ordered `Role[]`. Edited as a whole via `PUT`. |
| `ApprovalStepEntity` | Materialised at submit time. Never deleted — retired to `SKIPPED`, so a request that went round twice still shows both rounds. |
| `PaymentEntity` | A human's assertion that money moved. `settledAmountRial` is deliberately separate from the request's `amountMinor`; the variance is the point. |
| `RequestAttachmentEntity` | Stores `storageKey`, not just a URL. Objects are uploaded **private** and served via presigned URLs. |
| `FinanceActivityEntity` | Append-only. Nothing updates or deletes a row. |
| `ExpenseCategoryEntity` | `requiresInvoice` gates submission. Seeded on boot. |
| `PaymentSourceEntity` | The company's own accounts. `Role.FINANCE` only, at the controller. Card numbers are last-4 only. |
| `VendorEntity` / `PayeeAccountEntity` | The طرف‌حساب directory and where each wants to be paid. `kind` (domestic/foreign) is operational: a foreign vendor cannot be paid directly from Iran. |
| `RecurringExpenseEntity` | A *schedule*, not a payment. Each cycle materialises an ordinary request. `calendar` picks Gregorian or Jalali month arithmetic. |
| `PayrollSettingEntity` | The legal payroll parameters of one Jalali year — **one row per year, one column per parameter** (rial / real percent / days and hours), plus an `inclusion` JSON of the insurance and tax treatment per item. Labels, groups, derivations and the official figures live in `payroll-setting.catalog.ts`, not in the table. Admin-only. |
| `SalaryChangeEntity` | One change of a person's monthly salary from a Jalali month (`period` = `140507`) on. **Append-only:** a change must come after the person's latest, its type (start / raise / decrease) is derived from the comparison, and only the latest can be deleted. A user with a salary history cannot be deleted. A change may first be a **proposal** (a figure for a meeting): it affects nothing, is edited or deleted freely, has no type yet, and a person has at most one open one; confirming applies the append-only rules and sets the type. Admin-only. |
| `PayrollLineEntity` | One person's pay for one Jalali month: the month's inputs (days, overtime/night/holiday/deficit hours, mission days, bonus, advance, loan, other deductions, «pay eidi», «settle») and the figures they give, with warnings. Draft until its month is finalised; then a snapshot nothing touches. Admin-only. |

**The payee is snapshot onto the request, not looked up through the FK.**
`vendorId`/`payeeAccountId` record where the details came from; `payeeName`,
`payeeSheba` and friends record what was actually paid to. A vendor editing
their bank details next year must not rewrite last year's payment record.

### Two destination kinds

`destinationKind` splits a request into the two shapes Finance actually pays,
and each one uses a different half of the columns:

| Kind | Required | Null by construction |
|---|---|---|
| `bank_transfer` | `payeeAccountType` **and** one of `payeeSheba` / `payeeCardNumber` / `payeeAccountDetails` | `destinationUrl`, `destinationAccount` |
| `online_account` | `destinationUrl`, `destinationAccount` | `payeeAccountType`, `payeeAccountHolder`, `payeeSheba`, `payeeCardNumber`, `payeeAccountDetails` |

`payeeName` is required either way — for an online top-up it is the service
name («OpenAI»), and it is what the vendor rollup report groups by.

Two rules that are easy to get wrong:

- **`payeeAccountType` is nullable.** An online top-up has no bank instrument,
  and storing `sheba` on one would be a lie every report repeats. Validation
  lives in `assertDestinationUsable()`, not in a DTO decorator — a decorator
  cannot see `destinationKind`.
- **Switching kind wipes the other side.** `destinationFields()` writes the
  unused half back as `null` rather than leaving it. Someone who types a Sheba,
  changes their mind and switches to an online top-up must not leave a payable
  account number behind for Finance to wire money to by mistake.

### The one stored secret

`destinationCredentialEnc` holds the site login for an online top-up,
AES-256-GCM encrypted by `utils/secret.util.ts` under `FINANCE_SECRET_KEY`
(≥16 chars; **without it, saving a credential is refused, not silently
skipped**).

- Never returned by list or detail — detail exposes only
  `hasDestinationCredential: boolean`.
- Read through `GET /finance/requests/:id/credential`, and only by the
  requester who supplied it or `Role.FINANCE`. Not admin, not the approver.
- Cleared on every terminal state (`paid`, `rejected`, `cancelled`), so a
  closed request stops being a password store.
- Absent from the CSV export.

---

## Status model

`draft → pending_approval → approved → paid`, with `needs_info`, `rejected`,
`cancelled`, `failed` and `scheduled` off the main line. Labels and tones live
in the PWA's `finance.constants.ts`; the enum is `finance.constants.ts` here.

Invariants worth not breaking:

- **Nobody approves their own request.** Enforced in `assertCanDecide()` — the
  single place that rule lives.
- **An empty approval chain is overridden in two cases**, both in
  `enforceMinimumApproval()`: a `finance`-origin request gets `Role.ADMIN` (no
  self-approval), and a foreign-currency request gets `Role.APPROVER` (the
  thresholds cannot be applied to an amount with no rial value). Finance-origin
  is checked first — integrity beats measurement, so it gets the stronger
  reviewer. `/approval-preview` runs the same rule, so the preview never
  promises a smoother path than the submit will take.
- **Finance is never in an approval chain.** `ApprovalRuleService` strips
  anything that isn't `approver` or `admin`.
- **Steps are materialised at submit time.** Editing the matrix later never
  changes an in-flight request.
- Every transition writes a `FinanceActivityEntity` row **before** the
  post-transition re-read.

### The re-read trap

Lifecycle methods authorise once at the top with `getDetailOrFail(id, user)`,
then re-read with `loadFullOrFail(id)` — which has **no** permission check.
This is deliberate: a decision can change who may see the request (returning
one for correction used to hide it from the approver who returned it), and
re-checking there produced a 403 *after* the transition had already committed,
silently losing the audit entry. Don't reintroduce `getDetailOrFail` on the way
out of a transition.

---

### Payroll settings

`/finance/payroll-settings` (admin): `GET` the years, `GET :year` a year as the
page shows it (an official year not yet saved is returned read-only,
`exists: false`), `POST :year { copyFrom? }` to start a year from the official
figures or another saved year, `PUT :year { values?, inclusion? }` to change
some of it. A derived figure (monthly minimum, child allowance, insurance
ceiling, eidi cap, eidi tax exemption) follows its sources when they change
unless it is set by hand in the same call. Percents are real percents
(`7` is 7%), with at most four decimals (2/7 is stored as `28.5714`). To add a parameter: a column on the
entity, a row in `PAYROLL_PARAMETERS`, an official figure per year.

### Salary history

`/finance/salary-changes` (admin): `GET` every change with the previous salary
and the percent (newest first, `?userId&text&type`), `GET overview?period=`
everyone with the salary that applies in that month, `POST` one change
(`salary` **or** `percent`, with `roundTo` for a computed salary), `POST bulk`
the same percent for several people — all or nothing, every problem reported
at once — `PATCH :id` to edit a proposal, `POST confirm { ids }` to confirm
proposals (all or nothing), and `DELETE :id` for a proposal or a person's
latest confirmed change. `POST` and `POST bulk` take `propose: true`. The identity facts
(hire/end date, insurance number, sheba, email, personnel code, job title) live
on the user, not here.

### Payroll

`utils/payroll-calculator.util.ts` is a pure function — no database, no clock —
ported from the sheet's script (`payCalc_`): base, allowances, seniority,
overtime/night/holiday, mission, eidi, severance and leave buy-out, then worker
insurance (capped), progressive tax (overtime counts toward the exemption with the rest; a year
can still set a fixed rate to tax it apart, 1405 sets none; eidi above its
exemption at the first rate), employer insurance and the month's accrual. A
net agreement is solved backwards for the base wage. Its spec reproduces 16 rows
of the sheet's 1405/07 within a toman; overtime, night, mission, deficit,
eidi/severance, settlement and net agreements have no sheet data, so the spec
checks them against the formulas, not against the sheet.

`/finance/payroll` (admin): `GET :period` the month (lines, totals, how many
people have no line), `POST :period/generate` a draft line for everyone who
works in the month (hired by it, not gone, with a confirmed salary; the year's
parameters must exist), `POST :period/recalculate` every draft again,
`POST :period/finalize` freezes the month, `PATCH lines/:id` a draft's inputs,
`POST lines/:id/finalize` freezes one person's line, `DELETE lines/:id` a draft.
`GET :period/bank` is the month's **bank transfers** — for each person one row for
the salary (what the legal part nets, `net − extras`) and, if there are extras, one
for those — with the sheba, the amount in rial and a description (`حقوق مهر ۱۴۰۵`,
marked «(پیش‌نویس)» for a draft); every line is included and a person without a
sheba still gets rows (counted in `missingSheba`). `GET :period/bank/xlsx` is the
same as a right-to-left Excel file (`exceljs`).
A final line can be **reopened** — `POST lines/:id/reopen` or, for the whole
month, `POST :period/reopen`, each with a required `reason`: it goes back to a
draft, and when, by whom and why are kept on the line (`revisions`) for good;
the payslip says «بازنگری‌شده» once it has any.

**Facts on a final line.** When a line is finalised, the person's facts that move
their pay (dates, married, children, insurance, tax exemption, agreement and
salary mode, years of service) are frozen on it (`facts`); the payslip and the
line page read them from there, so a later change to the user does not
contradict the figures. Reopening clears them, and the next finalising takes
them again. A line finalised before this existed has none and shows the live
facts. The sheba and the ID numbers stay live, as a transfer goes to the
current account.

**Advances.** The «مساعده» module's approved requests reach the payroll through
`AdvanceDeductionEntity` — part (or all) of a request taken off one line. What a
request still owes is its amount less its deductions, so an advance can be taken
off in pieces over several months. On a draft line `GET lines/:id/advances`
lists what is owed and what this line took,
`POST lines/:id/advances/:requestId/apply` (body `amount`, default all that is
left) adds that to the line's `advance`, and `…/unapply` gives this line's part
back. Deleting a line frees what it took. The advance module reports each
approved request's `settlement` (status `unsettled`/`partial`/`settled`,
`deducted`, `remaining`, `settledAt` and every piece with its pay month) worked
out from these, so nothing is stored that could drift. A piece with no payroll line is a
settlement made by hand (`POST advance-requests/:id/settlements` with `amount`,
`paidOn`, `note`; finance manager and admin only, never above what is left;
`DELETE …/settlements/:settlementId` takes one back — a payroll piece is given
back from the payroll line instead). The month view adds a warning to a
draft line whose person still has an advance owed.

**Final settlement.** `FinalSettlementEntity` (one per person) is what is still
owed when someone leaves, apart from the monthly payroll: severance, bought-out
leave and the year's eidi share, run through the same calculator with no month
worked (`fraction 0`, `settle`), less advance, loan, other deductions and the
eidi already paid, plus or minus a correction to the last month. Service is
counted to the settlement date; a net agreement is first solved back to its
base wage. A draft is recomputed on every change; finalising freezes it and
fills the person's end of cooperation if empty. `finance/final-settlements`:
the admin and the finance manager make them, the CEO can see them.

**Flat salary.** A `salaryMode` of `flat` has no legal basis at all: the agreed
salary (by the days worked) plus the bonus is the gross, with no allowances,
insurance, tax, eidi or severance; advance, loan, other deductions and the
work deficit come off. It is one transfer, «salary», with no extras.

**Hybrid salary.** A user's `salaryMode` is `regular`, `hybrid` or `flat`. For a hybrid
user the *legal package* — the year's minimum monthly wage (prorated by the days
worked) with its allowances and seniority — goes through the rules (insurance,
tax); the agreed salary's shortfall against that package is the line's `extras`,
paid net, outside insurance and tax. With a **gross** agreement the whole
agreed salary is paid, less the worker's insurance on the package; with a **net**
agreement the agreed salary is the take-home and the extras make up what the
package's own net lacks, so the employer carries the insurance and tax. If the
agreed salary does not reach the package, only the package is paid and `extras`
is zero (flagged). A gross salary at or under the minimum wage is simply ordinary.
Eidi, severance and leave buy-out follow the legal part. The person's facts (hire/end date, married, children,
insured, insurance type, tax exemption, gross/net agreement) are on the user.

## Endpoints

All under `/api/v1`. Lists return `{ items, meta: { page, limit, total, pageCount } }`
with **0-based** paging; deletes return `{ success: true }`.

```
GET    /finance/requests                     ?scope=mine|awaiting_me|payable|all
                                             &status=a,b &categoryId &text &from &to &overdue
GET    /finance/requests/:id                 detail + permissions + signed attachment URLs
GET    /finance/requests/:id/credential      online-account login — requester or finance only
GET    /finance/requests/:id/activity        audit timeline
GET    /finance/requests/meta/badges         { awaitingMe, payable, mineOpen } — nav counts
POST   /finance/requests                     { …, submit?: true }
PATCH  /finance/requests/:id                 draft | needs_info only
POST   /finance/requests/:id/{submit,approve,reject,request-info,cancel,pay,fail}
POST   /finance/requests/approval-preview    { amountMinor, currency, categoryId? } → chain
POST   /finance/requests/:id/attachments     multipart, field name `file`
DELETE /finance/requests/attachments/:id

GET|POST|PATCH|DELETE  /finance/categories        read: all · write: admin
GET|PUT                /finance/approval-rules    admin only, PUT replaces the whole matrix
GET|POST|PATCH|DELETE  /finance/payment-sources   finance only

GET|POST|PATCH|DELETE  /finance/vendors           read: all · write: finance/admin
GET|POST               /finance/vendors/:id/accounts
PATCH|DELETE           /finance/vendors/accounts/:accountId
GET|POST|PATCH|DELETE  /finance/recurring         finance/admin
POST                   /finance/recurring/run-daily-cycle   admin — runs the 08:00 job now

GET /finance/dashboard                     ?from&to — 8 KPIs
GET /finance/reports/{by-category,by-vendor,trend,upcoming,monthly}
GET /finance/reports/export                CSV, UTF-8 BOM
```

`reject`, `request-info` and `fail` require a non-empty `comment`.

The category on a payment request and the source on a recorded payment are
optional. Reports group records without either value under «بدون دسته» and
«بدون منبع». Recurring schedules create a request automatically at `leadDays`
before each due date. Finance or admin can reject an individual recurring
request without changing the schedule for later cycles.

`detail` returns a `permissions` object (`canEdit`, `canSubmit`, `canDecide`, `canReject`,
`canPay`, `canCancel`, `canAttach`). The UI renders from it rather than
re-deriving the rules, so buttons and API can't disagree.

### Visibility

- Everyone sees their own requests, drafts included.
- `finance` / `admin` see every non-draft request.
- `approver` sees non-drafts that have a step requiring their role.
- Everyone else: own only.

---

## Conventions this module follows

Controllers carry `@UseGuards(JwtAuthGuard, RolesGuard)` and
`@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))`.
**`@Roles()` must be on each method** — `RolesGuard` reads `context.getHandler()`
only, so a class-level decorator is silently ignored.

`NormalizeNumbersPipe` is applied to every body carrying amounts, Sheba or
reference numbers — users paste Persian digits.

All user-facing messages are Persian.

---

## Gotchas

- **`UserService.removeUser()`** refuses to delete a user with payment requests
  or recorded payments (audit evidence). It nulls the nullable back-references
  first. Any new entity with a `user` FK must be added to that list.
- **Notifications are silent in dev.** `NotificationDeliveryService`
  short-circuits when `NODE_ENV=development` — "no SMS arrived" is correct.
- **`FinanceNotificationService` never throws.** A failed send must not roll
  back a transition that already happened.
- **`FinanceBootstrapService`** seeds 9 categories and 3 approval bands on
  first boot. It only seeds an *empty* matrix — once an admin edits it, a
  missing band is a choice, not something to restore.
- Attachment uploads go to S3 with `acl: 'private'`; `getSignedReadUrl()`
  (15 min) is the only way to read one back.
- **`MigrationService` applies pending migrations before generating a new one.**
  It used to diff first, which on a fresh database emitted a whole-schema file
  that then collided with the migrations it came from. Don't reorder it back.
- **Recurring reminders de-duplicate on `lastReminderDaysSent`**, not on a
  sent-log. Editing `nextDueDate` clears it so the new cycle warns again.
- **Recurring materialisation is idempotent** via the unique
  `(recurringSource, dueDate)` pair, not by the job being careful.
- **Only advisory finance notifications are silenceable** (renewal reminders,
  monthly report) — via `isMuted()`, which treats *absence* of a preference row
  as "not muted". `NotificationPreferenceService.isNotificationEnabled()` does
  the opposite and would silence everyone who never opened the settings page.

---

## Verifying a change

`pnpm --filter core-api lint` (type-checks too), then restart `start:dev`
against a clean DB so `MigrationService` generates a migration — **review the
generated file by hand**, it is not trustworthy blind.

The end-to-end suites in [`docs/finance-e2e/`](../../../../docs/finance-e2e/README.md) cover 84 checks
across four suites: threshold routing, the needs-info round trip, both
segregation-of-duties rules, foreign currency, the access-control matrix, vendor
snapshotting, recurring materialisation and idempotency, reminder
de-duplication, Jalali vs Gregorian cycle advance, the reporting figures, and
the destination fork with its credential rules.

Two things about running them:

- **Stop the API before resetting the database.** `DROP DATABASE` fails while a
  connection is open, and the next run then reports doubled figures rather than
  a failure — a wrong answer, not an error.
- **Suite 3 asserts absolute totals over the whole database**, so it must run on
  a fresh DB, after suite 2 (whose recurring schedule it counts) and never after
  suite 1 (whose payments it would add in). Suites 1 and 4 each want their own
  fresh database. Running them in the wrong order produces nine plausible-looking
  failures that are nothing but arithmetic over the wrong rows.
