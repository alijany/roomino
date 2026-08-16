# Finance & External Payments — module reference

How the company pays for things: SaaS, internet, vendors, one-off purchases.
Request → approve → pay → recorded, with an append-only audit trail.

**Status:** Phase 0 + Phase 1 shipped. Phases 2–4 are in
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
conversion. A foreign amount with no rate resolves to `0` rial, which routes it
through the lowest approval band; the real figure is captured at payment time.

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

Phase 2 adds `VendorEntity`, `PayeeAccountEntity`, `RecurringExpenseEntity`.
The payee is free-text on the request today; the vendor FK slots in beside it.

---

## Status model

`draft → pending_approval → approved → paid`, with `needs_info`, `rejected`,
`cancelled`, `failed` and `scheduled` off the main line. Labels and tones live
in the PWA's `finance.constants.ts`; the enum is `finance.constants.ts` here.

Invariants worth not breaking:

- **Nobody approves their own request.** Enforced in `assertCanDecide()` — the
  single place that rule lives.
- **A `finance`-origin request always gets at least one approver.** If the
  matrix returns an empty chain, `Role.ADMIN` is injected in `submit()`.
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

---

## Verifying a change

`pnpm --filter core-api lint` (type-checks too), then restart `start:dev`
against a clean DB so `MigrationService` generates a migration — **review the
generated file by hand**, it is not trustworthy blind.

The end-to-end script in `docs/finance-payments-module.md` §16 covers threshold
routing, the needs-info round trip, both segregation-of-duties rules, foreign
currency, and the access-control matrix.
