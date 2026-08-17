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

**The payee is snapshot onto the request, not looked up through the FK.**
`vendorId`/`payeeAccountId` record where the details came from; `payeeName`,
`payeeSheba` and friends record what was actually paid to. A vendor editing
their bank details next year must not rewrite last year's payment record.

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

## Endpoints

All under `/api/v1`. Lists return `{ items, meta: { page, limit, total, pageCount } }`
with **0-based** paging; deletes return `{ success: true }`.

```
GET    /finance/requests                     ?scope=mine|awaiting_me|payable|all
                                             &status=a,b &categoryId &text &from &to &overdue
GET    /finance/requests/:id                 detail + permissions + signed attachment URLs
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
POST                   /finance/recurring/:id/{generate,skip}
POST                   /finance/recurring/run-daily-cycle   admin — runs the 08:00 job now

GET /finance/dashboard                     ?from&to — 8 KPIs
GET /finance/reports/{by-category,by-vendor,trend,upcoming,monthly}
GET /finance/reports/export                CSV, UTF-8 BOM
```

`reject`, `request-info` and `fail` require a non-empty `comment`.

`detail` returns a `permissions` object (`canEdit`, `canSubmit`, `canDecide`,
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

The end-to-end scripts in `docs/finance-payments-module.md` §16 cover 66 checks
across the three phases: threshold routing, the needs-info round trip, both
segregation-of-duties rules, foreign currency, the access-control matrix, vendor
snapshotting, recurring materialisation and idempotency, reminder
de-duplication, Jalali vs Gregorian cycle advance, and the reporting figures.

Reset the database by **stopping the API first** — `DROP DATABASE` fails
silently while a connection is open, and the next run then reports doubled
figures rather than a failure.
