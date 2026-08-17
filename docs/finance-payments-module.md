# Finance & External Payments — Product & Development Plan

**Status:** Phases 0–3 **shipped**. Phase 4 (deferred) not started.
**Owner:** Product / Engineering
**Target repo:** `alijany/roomino` — branch `claude/finance-external-payments-module-o6xdrs`

> **Implementation state.** The whole of v1 is built, running and verified end
> to end (66/66 checks, §16): the request → approve → pay spine, the vendor
> directory and recurring expenses with their scheduled jobs, and the dashboard,
> monthly close and CSV export. Module references for agents:
> [`apps/core-api/src/finance/README.md`](../apps/core-api/src/finance/README.md)
> and [`apps/pwa/src/app/dashboard/finance/README.md`](../apps/pwa/src/app/dashboard/finance/README.md).
>
> This document stays the *plan* — sections 1–14 describe the intended design,
> and §15 records what was actually delivered against it, including the places
> the build diverged.

---

## 1. Context

Roomino (لایفی‌نو / RoomYar) is today a single-purpose internal tool: a Persian, RTL, Jalali-calendar meeting-room reservation system. `apps/core-api/src/meeting/` is the only business module; everything else (`auth`, `user`, `roles`, `notification`, `sms`, `storage`) is platform infrastructure.

The company wants the same internal system to absorb a second, unrelated job: **how money leaves the company**. Today that work almost certainly lives in chat threads, spreadsheets, and one person's memory — which produces the failure modes this module exists to remove:

- an employee needs a tool bought, and nobody knows what Finance needs in order to pay for it;
- Finance chases people for an invoice, a Sheba number, or an approval that may or may not have happened;
- a SaaS subscription silently renews, or silently lapses, because no one owns the renewal date;
- nobody can answer "what did we spend last month, and on what?" without rebuilding it by hand.

**Intended outcome:** every external payment — recurring or one-off, employee-initiated or company-level — enters one queue with the information Finance needs attached, moves through an explicit approval path, ends in a recorded payment with a receipt, and rolls up into a monthly number the management team can act on.

**Explicit non-goal:** this is not an accounting system and not a replacement for the statutory ledger. It is the *operational layer in front of* payment — request, approve, pay, record, report. Anything the official accountant needs is produced by export, not by this module becoming a general ledger.

---

## 2. Research: what comparable products do

I looked at how the established spend-management category structures this problem, to borrow known patterns rather than invent them.

**What's worth copying**

| Pattern | Seen in | Why we take it |
|---|---|---|
| Requisition → approval → payment → match, as one tracked object | Procurify, Coupa, Precoro, Bill.com | The universal spine. Every product in the category has it, so users arrive already knowing the model. |
| Configurable approval routing by amount / category | Procurify (no-code workflow builder) | Approval limits change as a company grows; hard-coding them means a code change every time. |
| Renewal reminder windows at 90 / 60 / 30 days, escalating | Renewal-tracking tools, CloudEagle, Zluri | The single highest-value feature for SaaS spend — it converts "we got auto-charged again" into a decision. |
| A short, opinionated dashboard (5–8 KPIs), not forty | CFO-dashboard guidance | Forty metrics on one screen isn't a dashboard. |
| Exception handling as a first-class state | 3-way-match AP guidance | "This is wrong, fix it" must be a status, not a chat message — otherwise the request stalls invisibly. |
| Smart forms that show only contextually relevant fields | Spendesk, budget-request tooling | Our form branches hard (domestic vs foreign, one-off vs recurring); showing every field always would make it unusable. |

**What's worth avoiding**

- **Coupa's surface area.** It's repeatedly described as clunky, overwhelming, steep to learn. We have one Finance person's worth of process, not an enterprise procurement department. Depth we don't need is a cost, not a feature.
- **Full PO + goods-receipt + 3-way match.** The classic three-way match (PO ↔ goods receipt ↔ invoice) is designed for physical-goods procurement at volume. For SaaS subscriptions, internet bills, and vendor services it adds a document nobody will fill in. We implement a **two-way match** — approved request ↔ invoice/receipt — and leave the third leg out until physical procurement actually exists.
- **Card-issuing / virtual-card models** (Ramp, Brex, Pleo). Not applicable to the Iranian banking context this app runs in.

**Sources:** [Procurify vs Coupa](https://www.procuredesk.com/procurify-vs-coupa/) · [Procurify spend-management buyer's guide](https://www.procurify.com/resource/spend-management-software-buyers-guide/) · [Coupa vs Spendesk](https://www.selecthub.com/spend-management-software/coupa-vs-spendesk/) · [Precoro — 3-way matching](https://precoro.com/blog/why-implementing-3-way-matching-is-important/) · [Procurify — purchase requisitions](https://www.procurify.com/blog/purchase-requisition-important-business/) · [Bill.com — 3-way matching](https://www.bill.com/learning/3-way-matching) · [Zluri — subscription management tools](https://www.zluri.com/blog/subscription-management-tools) · [Renewal tracking software](https://knowrenewals.com/) · [Alaan — spend management KPIs](https://www.alaan.com/blog/top-spend-management-kpis-expense-management) · [Dost — CFO KPI dashboards](https://www.dost.io/blog/kpi-dashboards-for-cfos-what-metrics-should-you-be-tracking)

---

## 3. Users and their jobs

Four roles, four genuinely different jobs. `[HYPOTHESIS]` — these are inferred from the codebase and the brief, not from user interviews. Validating them is the first item in §16.

| Persona | Frequency | Job to be done | The question in their head |
|---|---|---|---|
| **Employee** (`user`) — engineer, designer, ops | A few times a year | "I need the company to pay for this. Tell me what you need and let me get back to work." | *What do I have to attach so this doesn't bounce back?* |
| **Approver** (`approver`) — team lead / budget holder | Weekly | "Decide fast, on my phone, without opening a spreadsheet." | *What is this, how much, who asked, and is it reasonable?* |
| **Finance** (`finance`) | Daily | "Clear today's queue. Pay the right amount, from the right account, to the right destination, and record it." | *What's ready to pay right now, and is anything about to be late?* |
| **Management** (`admin` / CEO) | Monthly | "Understand where money went and approve the large items." | *Are we spending more than last month, and on what?* |

**Design consequence:** the Employee surface and the Finance surface are different products and must not be the same screen. The employee sees a short form and a status; Finance sees a work queue. Building one screen that serves both is the most likely way to get this wrong.

---

## 4. Scope

Confirmed decisions:

| Decision | Choice |
|---|---|
| Permissions | Add `finance` and `approver` roles. Requester ≠ approver ≠ payer. |
| Approval | Configurable amount-threshold matrix, seeded with working defaults. |
| Currency | Multi-currency with FX rate, intermediary, and fee modelled. Reporting rolls up in Toman. |
| V1 | Core request→approve→pay spine · vendors + recurring subscriptions · dashboards, monthly reports, export |
| Deferred | Budget envelopes, cost centres, budget-vs-actual |

Budgets are deferred but not designed out: `PaymentRequestEntity` carries a nullable `costCenter` string and a category FK from day one, so budget envelopes attach later without a data migration.

---

## 5. Terminology (product-wide, Persian)

One term per concept, decided once, used everywhere — in UI, in notifications, and in backend error messages. Mixed terminology is how users conclude two things are different things.

| Concept | Term | Note |
|---|---|---|
| Payment request | **درخواست پرداخت** | Never «تیکت» or «فرم». |
| Vendor / payee | **طرف‌حساب** | Chosen over «تأمین‌کننده», which reads as physical procurement. Covers Figma, the ISP, and the office landlord equally. |
| Payment source (our account) | **منبع پرداخت** | The account money leaves *from*. |
| Payee account (their account) | **حساب مقصد** | The account money goes *to*. Deliberately distinct from منبع پرداخت — conflating them is the most likely user error. |
| Recurring expense / subscription | **هزینه دوره‌ای** | |
| Expense category | **دسته هزینه** | |
| Approver | **تأییدکننده** | |
| Finance team | **مالی** | |
| Payment deadline | **مهلت پرداخت** | Not «سررسید» (bond connotation). |
| Invoice | **فاکتور** · Receipt | **رسید** | Two different documents; never used interchangeably. |
| Reference number | **شماره پیگیری** | |
| IBAN | **شماره شبا** | |
| Intermediary | **واسط پرداخت** | |

**Numerals:** Persian digits (۱۲۳) for displayed amounts, dates, and counts — consistent with the existing `formatCost`. ASCII digits inside `dir="ltr"` islands: Sheba numbers, card numbers, reference numbers, FX rates. This split already exists in the codebase (`auth.component.modal.tsx`, `ui.currency-input.tsx`) and we keep it.

**Formality:** neutral-formal, second person plural, matching existing copy («لطفا دوباره تلاش کنید»).

---

## 6. Status model

Nine states. Every one is a state a human recognises and can act on — no internal-only states leak to the UI.

```
                    ┌──────────────┐
                    │  پیش‌نویس     │ draft
                    └──────┬───────┘
                           │ submit
                           ▼
   reject ◄────── ┌──────────────────┐ ──────► needs_info
   ردشده          │ در انتظار تأیید   │        نیازمند اصلاح
     ▲            │ pending_approval │            │ (edit + resubmit)
     │            └────────┬─────────┘ ◄──────────┘
     │                     │ all approval steps passed
     │                     ▼
     │            ┌──────────────────┐
     │            │   تأییدشده        │ approved  ── Finance queue
     │            │  (در صف پرداخت)   │
     │            └────────┬─────────┘
     │                     │ Finance records payment
     │                     ▼
     │            ┌──────────────────┐     failure     ┌───────────────┐
     │            │   پرداخت‌شده      │ ◄────retry──── │ پرداخت ناموفق  │ failed
     │            └──────────────────┘                 └───────────────┘
     │
  ┌──┴────────┐
  │  لغوشده    │ cancelled — requester withdraws, any pre-paid state
  └───────────┘
```

Plus `scheduled` / **زمان‌بندی‌شده** — approved with a future payment date, used by recurring expenses so Finance's "due now" queue isn't polluted by items due in three weeks.

**Rules that make the model trustworthy**

- Terminal states are `paid`, `rejected`, `cancelled`. Nothing edits a `paid` request; corrections create a linked adjustment.
- `needs_info` is a real state, not a comment. It returns edit rights to the requester and stops the SLA clock. This is the single most important state to get right — it's where requests silently die in chat-based processes.
- Every transition writes a `FinanceActivityEntity` row: actor, from, to, timestamp, comment. The activity log is append-only and is the audit trail.
- Approval steps are materialised **at submit time** from the rules in force then. Changing the approval matrix later must not retroactively alter in-flight requests.

---

## 7. Key flows

### 7.1 Employee submits a payment request

The design goal is that a first-time user gets it right without asking Finance what's needed. Three steps, each answering one question.

| Step | User's question | What they do | System response |
|---|---|---|---|
| **1. What & how much** | *Am I in the right place?* | Category (دسته هزینه), title, amount + currency, deadline | Live: which approvers this amount will need, before they invest effort |
| **2. Who gets paid** | *Do I know their bank details?* | Pick an existing طرف‌حساب → destination account auto-fills. Or "new payee" → name + destination account | Known vendors collapse this step to one tap |
| **3. Proof** | *Is this enough?* | Attach فاکتور / quote / screenshot; optional note | Checklist of what's required for this category, ticking as satisfied |

Then a **review screen** — full summary, named approver chain, "درخواست پرداخت شما به [نام] ارسال می‌شود" — before the irreversible submit.

Pruning decisions, and what each trades:

- `AUTOMATE` — requester, date, currency default, approver chain. Never asked.
- `AUTOMATE` — destination account inherited from the selected vendor. *Trade:* stale vendor bank details propagate silently. Mitigation: Finance sees the destination account on the payment screen and can correct it there, which writes back to the vendor with an activity entry.
- `REMOVE` — cost centre / project code from v1 (budgets deferred). Field exists in the schema, hidden in the UI.
- `MOVE LATER` — FX rate, intermediary, fee. These are Finance's inputs at payment time, not the employee's at request time. Asking an engineer for a dollar rate produces a wrong number.
- `KEEP` — the deadline, always. It drives the entire priority queue, and Finance cannot infer it.
- `KEEP` — draft save. Someone will start a request, need to go find an invoice, and come back.
- `CLARIFY` — amount + currency as one control, with the Toman equivalent shown live for foreign amounts so the requester sees the real size of what they're asking for.

**Recovery:** validation is inline and on blur, not on submit. A rejected submit never clears entered data or dropped attachments.

### 7.2 Approver decides

Optimised for a phone, in under thirty seconds. Entry is the notification deep-link, not a hunt through the dashboard.

Above the fold, in order: amount in Toman (largest element on the screen) → what and why, one line → who asked → deadline → attachments → **تأیید** / **نیازمند اصلاح** / **رد**.

- **تأیید** — one tap, no confirmation dialog. It's reversible in practice (Finance hasn't paid yet) and a confirmation step on the most common action is friction with no safety payoff.
- **رد** — requires a reason. Rejection without a reason produces a follow-up conversation, which is the thing this module exists to eliminate.
- **نیازمند اصلاح** — requires a reason, returns the request to the requester, and is the *default* escape hatch. Presented with equal weight to reject, because "I need more info" is far more common than "no" and a UI that offers only approve/reject pushes people to reject.

Multi-step chains are sequential, not parallel — the second approver only sees it after the first decides, so approval carries real signal.

### 7.3 Finance pays

This is the daily-driver screen and the one to get most right. Finance opens the **صف پرداخت** — approved requests, sorted by deadline, overdue first.

Recording a payment captures: منبع پرداخت (which of our accounts) · payment date · **actual** amount paid · شماره پیگیری · receipt attachment. For foreign currency, three more: FX rate applied, واسط پرداخت used, and their fee.

Design decisions:

- **Actual amount is a separate field from the requested amount.** They differ constantly — FX moved, the vendor billed differently. Overwriting the request destroys the variance, which is exactly what the monthly report needs to show.
- **Batch mode.** Select several approved requests for the same payment source and record them in one pass. `[HYPOTHESIS]` this is how Finance actually works — a bank session, several transfers, then data entry. If it isn't, this is the first thing to cut.
- **Never auto-mark as paid.** Payment happens outside the system, in a banking app. The system records a human's assertion that it happened, with a reference number as evidence. Any design that infers payment is lying.
- **`failed` returns to the queue,** with the failure reason visible on the row. A failed transfer that disappears is how a vendor goes unpaid for a month.

### 7.4 Finance creates a company-level payment

Finance has authority to raise and pay a request without an employee originating it — office rent, the ISP bill, the accountant's fee. Same object, same statuses, same audit trail; `origin = 'finance'`.

Threshold rules still apply. A Finance user raising a large payment still routes to `admin` for approval — **self-approval is never permitted, at any amount, for any role.** That single rule is what makes the audit trail worth having.

### 7.5 Recurring expense renews

A هزینه دوره‌ای (Figma, AWS, the office internet) holds vendor, amount, currency, cycle, next due date, an internal owner, and a default payment source.

A daily job at 08:00 Asia/Tehran:
1. Fires reminders at 30 / 14 / 7 / 1 days before due — window configurable per expense.
2. At due-date minus the lead time, materialises a real `PaymentRequestEntity` in `scheduled`, pre-filled and pre-attached to the recurring parent.
3. If the amount is under the approval threshold, it lands straight in Finance's queue. Above threshold, it routes for approval — because a price increase deserves a human look.

The 30-day reminder is addressed to the **internal owner**, not Finance, and asks a decision question, not an informational one: «اشتراک Figma تا ۳۰ روز دیگر تمدید می‌شود — ۱٬۲۰۰٬۰۰۰ تومان. ادامه می‌دهیم؟» with **تمدید شود** / **لغو شود** / **تغییر پلن** inline. That converts a passive notice into a spend decision, which is the entire value of renewal tracking.

---

## 8. Information architecture

A new sidebar group, **مالی**, in `dashboard.constants.route-groups.tsx`.

| Route | Screen | Visible to |
|---|---|---|
| `/dashboard/finance/my-requests` | **درخواست‌های من** — my requests + submit button | everyone (`roles: false`) |
| `/dashboard/finance/approvals` | **در انتظار تأیید من** | `approver`, `admin` |
| `/dashboard/finance/queue` | **صف پرداخت** — the Finance work queue | `finance`, `admin` |
| `/dashboard/finance/requests/[id]` | Request detail + timeline + actions | role-scoped |
| `/dashboard/finance` | **پیشخوان مالی** — KPIs and charts | `finance`, `admin` |
| `/dashboard/finance/vendors` | **طرف‌حساب‌ها** | `finance`, `admin` |
| `/dashboard/finance/recurring` | **هزینه‌های دوره‌ای** | `finance`, `admin` |
| `/dashboard/finance/sources` | **منابع پرداخت** | `finance` only — holds our own bank details |
| `/dashboard/finance/reports` | **گزارش‌ها** | `finance`, `admin` |
| `/dashboard/finance/settings` | Categories + approval matrix | `admin` only |

**Nav badges** carry the count that role needs to act on: pending-approval count for approvers, ready-to-pay count for Finance. `[HYPOTHESIS]` this is what drives daily return visits; without it the module is a place people go only when reminded.

**Mobile:** `BottomNavBar` is hardcoded and already holds four items. Add a fifth only if the user's role has a finance action — approvers and Finance get it, plain employees reach درخواست‌های من through the sidebar. `[PREFERENCE]` — worth revisiting once we see who actually opens it on a phone.

---

## 9. Copy deck

Persian written natively, not translated. Read aloud before shipping — anything that only parses by reconstructing an English sentence behind it gets rewritten.

| Location | State | Job | Proposed | Rationale |
|---|---|---|---|---|
| Submit button | default | prompt action + name consequence | **ارسال برای تأیید** | Names where it goes. «ثبت» would hide the fact that a person now has to act. |
| Submit button | amount below threshold | set expectation | **ارسال به مالی** | Truthful: there is no approver in this path. |
| Pay button | default | prompt action | **ثبت پرداخت** | It records a payment that already happened; «پرداخت» would imply the system moves money. |
| Approve | default | prompt action | **تأیید و ارسال به مالی** | Names the next hop, so the approver knows it isn't paid yet. |
| Needs-info | default | help recover | **نیازمند اصلاح** | A request, not a verdict. |
| Reject reason | empty, blocking | help decide | «دلیل رد را بنویسید تا درخواست‌کننده بداند چه کار کند.» | States why the field exists rather than just demanding it. |
| Amount field | hint | supply what's needed | «مبلغ را همان‌طور که در فاکتور آمده وارد کنید.» | Pre-empts the "with or without tax?" pause. |
| Amount field | foreign currency selected | set expectation | «معادل تقریبی: ۱٬۲۵۰٬۰۰۰ تومان — نرخ نهایی را مالی تعیین می‌کند.» | Gives scale without implying a committed rate. |
| Sheba field | invalid | help recover | «شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد.» | States the constraint, not the failure. |
| Deadline | hint | set expectation | «تا چه تاریخی باید پرداخت شود؟» | Plain question beats a label. |
| Attachments | empty | explain + next action | «فاکتور یا پیش‌فاکتور را اضافه کنید. بدون آن، مالی نمی‌تواند پرداخت را انجام دهد.» | Names the consequence of skipping — this is the field people skip. |
| My requests | empty, first-time | orient + next action | «هنوز درخواستی ثبت نکرده‌اید. برای خرید یا پرداختی که شرکت باید انجام دهد، درخواست جدید بسازید.» | Explains what the screen is for, not just that it's empty. |
| Approvals | empty | confirm | «درخواستی در انتظار تأیید شما نیست.» | Calm and complete. No exclamation mark. |
| Payment queue | empty | confirm | «صف پرداخت خالی است. همه درخواست‌های تأییدشده پرداخت شده‌اند.» | Says *why* it's empty — that's the reassuring part. |
| Request detail | status `needs_info` | help recover | «مالی برای تکمیل این درخواست به اطلاعات بیشتری نیاز دارد:» + the reason, verbatim | Reason shown in full, never truncated. |
| Request detail | status `paid` | confirm + consequence | «در تاریخ ۱۴۰۴/۰۵/۲۲ از حساب [نام] پرداخت شد — شماره پیگیری ۱۲۳۴۵۶۷۸» | Everything needed to trace it, with no click. |
| Payment failed | error | recover | «پرداخت انجام نشد. درخواست به صف پرداخت برگشت و اطلاعات آن دست‌نخورده است.» | States what's still safe. Doesn't blame anyone. |
| Cancel request | destructive | name consequence + alternative | «درخواست «[عنوان]» لغو شود؟ بعد از لغو قابل بازگشت نیست. اگر فقط نیاز به تغییر دارید، آن را ویرایش کنید.» | Names the object, irreversibility, and the safe alternative. |
| Delete vendor | destructive | name consequence + alternative | «طرف‌حساب «[نام]» حذف شود؟ درخواست‌های قبلی حفظ می‌شوند، اما این طرف‌حساب دیگر قابل انتخاب نیست. به جای حذف می‌توانید آن را غیرفعال کنید.» | Deactivation is almost always what they want. |
| Renewal, 30 days | notification | help decide | «اشتراک [نام] تا ۳۰ روز دیگر تمدید می‌شود — [مبلغ]. ادامه می‌دهیم؟» | A decision, not an FYI. |
| New approval | notification | prompt action | «درخواست پرداخت [مبلغ] از [نام] در انتظار تأیید شماست.» | Amount and requester in the notification, so an approver can triage before opening. |
| Approved | notification to requester | confirm + expectation | «درخواست شما تأیید شد و به مالی رفت.» | Sets the expectation that it isn't paid yet. |

Cross-cutting rules: never `تایید` and `تأیید` in the same product — **تأیید** with hamza throughout. Never a bare `خطا`. Never blame the user. Never joke in a payment failure.

---

## 10. Data model

New module `apps/core-api/src/finance/`, following the `meeting/` layout (`entities/`, `controllers/`, `services/`, `dtos/`, `finance.types.ts`) since that's the newest and most complete module in the codebase. All entities extend `BaseEntity` (`src/libs/orm/orm.entity.base.ts` → `id`, `created_at`, `updated_at`) and register via `MikroOrmModule.forFeature([...])`; `autoLoadEntities: true` means no central entity list to touch.

### Money representation

No `decimal` column exists anywhere in this codebase yet, and floats have no place in money. **All amounts are integers in minor units, stored as `types.bigint`.**

- `amountMinor` + `currency` — IRR minor unit is the rial; USD/EUR minor unit is the cent.
- `settledAmountRial` — always IRR, always populated at payment. This is the only column reports sum.
- `fxRateRialPerUnit` — integer rial per one foreign unit. Avoids decimals entirely.
- `feeRial` — intermediary fee, separate from the settled amount so "what the FX actually cost us" is answerable.

**Blocking prerequisite:** the codebase currently contradicts itself on units — `formatCost()` formats as Toman while `CurrencyInput` documents its value as rials, and neither has a real call site. Fix this before writing any finance code: canonical storage is **rial**, canonical display is **Toman** (`rial / 10`) with Persian digits, via a single `formatMoney()` in `src/libs/format/format.util.ts`. Getting this wrong is a 10× error in every number on the dashboard.

### Entities

| Entity | Key fields |
|---|---|
| `VendorEntity` | `name`, `nameEn?`, `kind` (domestic \| foreign), `category?`, `economicCode?`, `website?`, `contactName?`, `contactPhone?`, `defaultCurrency`, `active`, `notes?` |
| `PayeeAccountEntity` | `vendor` M:1, `label`, `type` (sheba \| card \| iban_swift \| paypal \| other), `holderName`, `sheba?`, `cardNumber?`, `iban?`, `swift?`, `raw?` (json), `isDefault`, `active` |
| `PaymentSourceEntity` | `label`, `type` (bank_account \| card \| petty_cash \| intermediary), `bankName?`, `sheba?`, `cardLast4?`, `currency`, `active`. **`finance` role only.** |
| `ExpenseCategoryEntity` | `name`, `code`, `parent?` (self M:1), `requiresInvoice` (bool), `active` |
| `PaymentRequestEntity` | `requester` M:1 User, `origin` (employee \| finance \| recurring), `title`, `description?`, `category` M:1, `vendor?` M:1, `payeeAccount?` M:1, `amountMinor` bigint, `currency`, `dueDate`, `status` enum, `costCenter?` (nullable, for deferred budgets), `recurringSource?` M:1, `submittedAt?`, `decidedAt?`, `paidAt?` |
| `RequestAttachmentEntity` | `request` M:1, `url` (S3), `filename`, `mimeType`, `sizeBytes`, `kind` (invoice \| quote \| receipt \| contract \| other), `uploadedBy` M:1 |
| `ApprovalRuleEntity` | `minAmountRial` bigint, `maxAmountRial?` bigint (null = ∞), `category?` M:1, `approverChain` json (ordered `Role[]`), `priority`, `active` |
| `ApprovalStepEntity` | `request` M:1, `sequence`, `requiredRole`, `status` (pending \| approved \| rejected \| skipped), `actor?` M:1, `decidedAt?`, `comment?` |
| `PaymentEntity` | `request` M:1, `paymentSource` M:1, `paidAt`, `settledAmountRial` bigint, `fxRateRialPerUnit?` bigint, `feeRial?` bigint, `intermediary?` M:1 Vendor, `referenceNumber?`, `receipt?` M:1 Attachment, `paidBy` M:1 User, `status` (succeeded \| failed), `failureReason?` |
| `RecurringExpenseEntity` | `vendor` M:1, `category` M:1, `payeeAccount?`, `defaultPaymentSource?`, `title`, `amountMinor` bigint, `currency`, `cycle` (monthly \| quarterly \| yearly \| custom_days), `cycleDays?`, `nextDueDate`, `endDate?`, `reminderDays` json (default `[30,14,7,1]`), `owner` M:1 User, `autoGenerate` bool, `active` |
| `FinanceActivityEntity` | `request` M:1, `actor?` M:1, `action` enum, `fromStatus?`, `toStatus?`, `comment?`, `meta` json. **Append-only.** |

### Migration and integration notes

- `MigrationService` auto-generates migrations on dev restart. Adding `finance`/`approver` to the `Role` enum needs a **hand-checked** migration that drops and re-adds the `roles_entity_role_check` constraint — exactly the shape of `Migration20260803091814.ts`.
- **`UserService.removeUser()` hardcodes its dependent-delete list.** Every new finance entity with a `user` FK must be added there or user deletion breaks. This is a silent trap; it belongs in the PR checklist.
- Indexes: `payment_request_entity (status, due_date)` drives the queue; `(requester_id, status)` drives "my requests"; `(paid_at)` drives reports; `recurring_expense_entity (next_due_date, active)` drives the cron.

---

## 11. API surface

Base `/api/v1`. Every controller carries `@UseGuards(JwtAuthGuard, RolesGuard)` and `@UsePipes(new ValidationPipe({ transform: true }))`. **`@Roles()` goes on each method** — `RolesGuard` reads `context.getHandler()` only, so a class-level decorator is silently ignored. Lists return `{ items, meta: { page, limit, total, pageCount } }` with 0-based paging; deletes return `{ success: true }`. All error messages in Persian.

```
# Requests
GET    /finance/requests                  role-scoped list + filters
GET    /finance/requests/:id
POST   /finance/requests                  create (draft or submit)
PATCH  /finance/requests/:id              draft | needs_info only
POST   /finance/requests/:id/submit
POST   /finance/requests/:id/approve
POST   /finance/requests/:id/reject       { reason } required
POST   /finance/requests/:id/request-info { reason } required
POST   /finance/requests/:id/cancel
POST   /finance/requests/:id/pay          finance records a payment
POST   /finance/requests/:id/fail         { reason }
POST   /finance/requests/:id/attachments  multipart, FileInterceptor
DELETE /finance/attachments/:id
GET    /finance/requests/:id/activity

# Reference data
GET|POST|PATCH|DELETE  /finance/vendors           · /finance/vendors/:id/accounts
GET|POST|PATCH|DELETE  /finance/payment-sources   (finance only)
GET|POST|PATCH|DELETE  /finance/categories        (admin only)
GET|PUT                /finance/approval-rules    (admin only)

# Recurring
GET|POST|PATCH|DELETE  /finance/recurring
POST   /finance/recurring/:id/generate    materialise the next request now
POST   /finance/recurring/:id/skip        skip one cycle

# Reporting
GET    /finance/dashboard?from&to
GET    /finance/reports/monthly?year&month
GET    /finance/reports/by-category | by-vendor | trend
GET    /finance/reports/upcoming?days=30
GET    /finance/reports/export?format=csv&from&to
```

**Security notes.** `PaymentSourceEntity` holds the company's own bank details and is `finance`-only at the controller — not merely hidden in the UI. Card numbers are stored as last-4 plus a label; full PANs never enter the database. `NormalizeNumbersPipe` (`src/libs/utils/pipe.normalizeNumbers.ts`) applies to every amount, Sheba, and reference-number input, because users will paste Persian digits. Attachments go through `S3StorageService.uploadBuffer(..., 'finance-attachments')` with mime and size validation copied from `UserController.uploadProfilePicture`. Attachment URLs are currently public-read; **flag** — invoices are more sensitive than profile pictures. Presigned URLs don't exist in `S3StorageService` yet; adding them is the right answer and is scoped in Phase 1.

---

## 12. Notifications

Reuses `NotificationService` as-is — `sendToUser`, `sendToAdmins`, auto-channel detection via SMS/Telegram, preferences and history already built. No new channel work. Add a `FINANCE` member to `NotificationCategory` (needs a check-constraint migration on two tables).

| Event | Recipient | Priority |
|---|---|---|
| Submitted | next approver in chain | high |
| Approved (step) | requester | normal |
| Fully approved | finance team | high |
| نیازمند اصلاح | requester | high |
| Rejected | requester | high |
| Paid | requester | normal |
| Payment failed | finance + requester | high |
| Renewal in 30 / 14 / 7 / 1 days | recurring expense owner | normal → high |
| Overdue payment | finance | high |
| Approval pending > 3 days | approver, then their admin | normal |
| Weekly digest — queue + next 30 days | finance | low |
| Monthly report ready | finance + admin | low |

**Two things to respect.** `NotificationDeliveryService` short-circuits in `NODE_ENV=development` — it logs and sends nothing, so "no SMS arrived" in dev is correct behaviour, not a bug. And `NotificationPreferenceService.isNotificationEnabled()` exists but the dispatcher never calls it, so preferences are stored and displayed but not enforced. Approval requests must not be silenceable, but renewal reminders should be — wiring the preference check is a small, contained fix worth doing in Phase 2.

**Scheduled jobs.** `ScheduleModule` is registered in `app.module.ts` but no `@Cron` exists anywhere yet — this module introduces the first ones. All pinned to `Asia/Tehran`:

- `0 8 * * *` — renewal reminders + materialise due recurring requests
- `0 9 * * *` — overdue-payment and stale-approval nudges
- `0 8 1 * *` — monthly report ready

Job handlers must use a forked EntityManager (`this.em.fork()`), following `AdminUserBootstrapService`.

---

## 13. Dashboard and reports

Eight KPIs, not forty. ApexCharts is already a dependency and already used SSR-safely in `reports.component.heatmap.tsx` — that file is the template, including its chart↔table toggle, RTL tooltip, and HTML escaping.

**پیشخوان مالی** — top row of stat tiles:

1. این ماه — total paid (Toman) with % vs last month
2. در انتظار تأیید — count + total value
3. آماده پرداخت — count + total value
4. سررسید گذشته — count, in red when non-zero
5. تعهدات ۳۰ روز آینده — sum of scheduled + recurring due
6. هزینه دوره‌ای فعال — count + monthly run-rate
7. میانگین زمان تأیید — days, submit → final approval
8. هزینه ارزی این ماه — Toman equivalent + effective average rate

Charts: 12-month spend trend (column, with a foreign-currency split) · spend by category (donut, top 6 + «سایر») · top 10 vendors (horizontal bar) · approval-cycle aging (funnel/bar).

**گزارش ماهانه** — one page, Jalali month selector: total spend, count, by category, by vendor, by payment source, foreign-currency detail with rates and fees paid, requested-vs-actual variance list (this is where FX and vendor surprises surface), and everything still unpaid at month end. Exports to CSV with a UTF-8 BOM so Excel opens Persian text correctly — a small detail that otherwise generates a support ticket every single month.

**Deliberately excluded from v1:** budget-vs-actual (budgets deferred), and any forecast or projection. A forecast built on three months of data is a guess with a chart around it.

---

## 14. Frontend build notes

Domains live under `src/app/dashboard/<domain>/` (the AGENTS.md examples showing `src/app/<domain>/` don't match reality). Every page is `'use client'`, wraps `RoleProtectedRoute allowedRoles={RouteItems.<key>.roles}` around `DashbaordLayout` (the export really is spelled that way), renders async data through `DataView`, and follows the `users` domain as its structural template.

Five shared pieces should be extracted rather than duplicated a fourth time — this module is the forcing function:

| Piece | Where | Why now |
|---|---|---|
| `formatMoney()` + unit fix | `src/libs/format/format.util.ts` | Resolves the rial/Toman contradiction. Blocking. |
| `StatusPill` | new `src/ui/atoms/ui.badge.tsx` | Nine statuses across five screens; inline Tailwind spans won't hold. |
| `Table` | new `src/ui/molecules/table/` | Finance queues are genuinely tabular. Card grids stop working past ~5 columns. Responsive: table on desktop, cards under `lg`. |
| `DateRangePicker` | lift from `reports.component.date-range-picker.tsx` | Already the pattern; second consumer justifies the move. |
| `buildQuery()` | new `src/libs/api/api.util.query.ts` | The `URLSearchParams(...reduce)` block is copy-pasted in four domains today. |

One `DataView` limitation to work around: it renders a static `errorMessage` and swallows `ApiError.message`. Payment failures need the server's actual reason, so finance screens surface errors through `ResultModal` / toast rather than relying on `DataView`'s default.

---

## 15. Delivery plan

Estimates are engineering days for one full-stack developer. `[HYPOTHESIS]` — no velocity baseline exists for this repo.

### Phase 0 — Foundations ✅ shipped

Unblocks everything; nothing user-visible.

- `Role` enum → add `finance`, `approver`, in both apps: `apps/core-api/src/roles/roles.constants.ts`, `apps/pwa/src/components/auth/auth.constants.roles.ts`. Update `RoleLabels`, `RoleHierarchy`, `getRoleName`. Hand-checked check-constraint migration.
- Verify the role switcher, `hasAnyRole`, and admin role assignment in `/dashboard/users` all handle four roles.
- Money: fix the rial/Toman contradiction, add `formatMoney()`.
- Extract `StatusPill`, `Table`, `DateRangePicker`, `buildQuery()`.

**Done when:** an admin can grant `finance` and `approver` from the Users page, the recipient sees the correct nav, and `pnpm --filter core-api lint && pnpm --filter pwa lint` are clean.

### Phase 1 — The spine ✅ shipped

Core request → approve → pay, statuses, notifications. Shippable on its own.

Backend: entities (`PaymentRequest`, `Attachment`, `ApprovalRule`, `ApprovalStep`, `Payment`, `PaymentSource`, `ExpenseCategory`, `FinanceActivity`) · `FinanceModule` registered in `app.module.ts` · request lifecycle service with all transitions guarded and audited · approval-matrix evaluation at submit · attachment upload · notification hooks · seed default approval rules and ~8 categories at bootstrap (following `AdminUserBootstrapService`) · presigned attachment URLs in `S3StorageService` · add finance entities to `UserService.removeUser()`.

Frontend: sidebar group · `my-requests` (list + 3-step create + review) · `approvals` (mobile-first decision screen) · `queue` (Finance table, filters, record-payment modal with FX block) · `requests/[id]` (detail + timeline) · `sources` (Finance-only CRUD).

**Done when:** an employee submits a request from a phone, the approver is notified and approves, Finance records payment with a reference number and receipt, the requester is notified, and the full timeline is visible — with self-approval blocked at every step.

### Phase 2 — Vendors and recurring ✅ shipped

Backend: `Vendor`, `PayeeAccount`, `RecurringExpense` entities and CRUD · daily materialiser + reminder cron · `NotificationCategory.FINANCE` + migration · enforce notification preferences for reminders (not for approvals) · skip/regenerate actions.

Frontend: `vendors` (list, detail, accounts, deactivate-not-delete) · `recurring` (list with next-due countdown, create/edit, calendar view of the next 90 days) · vendor picker wired into the request form so destination accounts auto-fill.

**Done when:** a Figma subscription is registered once, the owner gets a decision-shaped reminder 30 days out, and a pre-filled request appears in Finance's queue on schedule.

### Phase 3 — Dashboard, reports, export ✅ shipped

Backend: aggregation service (single-pass SQL, not N+1 over requests) · `/finance/dashboard`, `/reports/*`, CSV export with BOM · monthly-report cron.

Frontend: `finance` dashboard (8 tiles + 4 charts, chart↔table toggle) · `reports` with a Jalali month selector, variance table, and export.

**Done when:** Finance closes a month from this screen without opening a spreadsheet, and the export opens in Excel with Persian text intact.

### What actually shipped, and where it diverged from this plan

Phases 0–3 are complete. The deliberate deviations:

| Planned | Built | Why |
|---|---|---|
| `VendorEntity` + `PayeeAccountEntity` referenced from the request | Payee is **free-text** on `PaymentRequestEntity` (`payeeName`, `payeeSheba`, …) | The vendor directory is Phase 2. The fields an employee supplies are the same either way, so Phase 2 adds a nullable vendor FK beside them rather than reshaping anything. |
| `requestInfo` clears the approval chain | Steps are retired to `SKIPPED`, never deleted; a resubmit appends a new round with continuing sequence numbers | Deleting them erased the audit history *and* cut the approver's only link to a request they had just returned — which produced a 403 after the transition had already committed. See "the re-read trap" in the module README. |
| Not planned | `PaymentRequestEntity.pendingRole` / `pendingSequence` | Denormalised pointer to the outstanding step. "What is waiting on me?" is asked on every approver's page load and drives the nav badge; without it that is a per-row scan for the lowest pending sequence. |
| Category breakdown as a **donut** (§13) | A horizontal ranked **bar** | Seven slices with long Persian category names is where pie charts fail. The reader's question is "what cost the most" — a magnitude comparison, which also drops the need for seven categorical hues. |
| Not planned | `RecurringExpenseEntity.calendar` (Gregorian \| Jalali) | A real distinction in this context, not a nicety: SaaS bills on Gregorian months while rent and local services fall on Jalali ones. Advancing an Esfand-15 rent by a Gregorian month drifts off the agreed day within a year. Verified: 2026-03-05 advances to 2026-04-03 (Jalali) vs 2026-04-05 (Gregorian). |
| Not planned | Every foreign-currency request routes to an approver | Found by the phase-2 test run. A foreign amount has no rial value until Finance sets a rate, so `toRial` returns 0 and the matrix put a USD 50,000 invoice in the same band as a USD 5 one. When the thresholds cannot be applied, a human looks instead. |

Also delivered but not called out in the original plan: an `/approval-preview`
endpoint (so the form can show the approver chain before submit), a
`meta/badges` endpoint for nav counts, a `permissions` object on the request
detail so the UI never re-derives the action rules, and a fix to
`MigrationService` — it diffed the entities *before* applying pending
migrations, so a fresh database produced a whole-schema migration that then
collided with the migrations it came from.

**Verified against a real Postgres**, not just lint. All seven migrations apply
cleanly from an empty database, `FinanceBootstrapService` seeds 9 categories and
3 approval bands, and three suites pass **66/66**:

| Suite | Covers |
|---|---|
| Phase 1 — 30 checks | threshold routing at all three bands, the needs-info round trip, both segregation-of-duties rules, the two-step chain, foreign-currency payment with FX rate and fee, the access-control matrix, the user-deletion guard |
| Phase 2 — 18 checks | vendor CRUD and permissions, payee-account defaulting, vendor pre-fill on a request, schedule creation, materialisation with payee snapshotting, idempotency on re-generation, skip, the daily job and its admin-only guard |
| Phase 3 — 18 checks | dashboard KPIs summing *settled* not requested amounts, null change-percent with no baseline, category/vendor/trend breakdowns, monthly close with the variance row, CSV with a UTF-8 BOM and intact Persian headers, upcoming commitments, and role gating on every report endpoint |

Checked separately, outside the suites: renewal reminders fire once per window
and de-duplicate on a second same-day run, with the right decision-shaped
Persian message and amount; and the two billing calendars genuinely diverge.

Both open risks from §17 are closed: `S3StorageService.getSignedReadUrl()` was
added and finance attachments upload with `acl: 'private'`, and
`UserService.removeUser()` now refuses to delete a user carrying finance
history.

### Phase 4 — Deferred

Budget envelopes and cost centres · budget-vs-actual · OCR invoice extraction · accounting-software export · vendor contract repository with expiry tracking · three-way match, only if physical procurement ever becomes real.

---

## 16. Verification

Tests in this repo are documented as unstable, so `lint` (which type-checks) is the automated gate and the rest is manual scenario walkthrough.

**Per PR:** `pnpm --filter core-api lint` and `pnpm --filter pwa lint` clean. Backend restarted once against a clean DB so `MigrationService` generates and applies migrations; the generated migration file reviewed by hand, not trusted blind.

**End-to-end script** (run against dev with four seeded users, one per role):

1. Employee submits below threshold → lands directly in Finance's queue, no approver involved.
2. Employee submits above threshold → routes to approver → approver approves → reaches Finance.
3. Approver returns نیازمند اصلاح → requester edits → resubmits → chain restarts correctly.
4. Finance records a foreign-currency payment → verify `settledAmountRial`, rate, and fee land correctly and the dashboard total matches to the rial.
5. Finance user raises their own large request → **must** route to admin. Self-approval blocked.
6. Recurring expense with `nextDueDate` = tomorrow → run the cron by hand → request materialises pre-filled.
7. Delete a user with finance history → `removeUser` succeeds without an FK error.
8. Employee opens another employee's request by direct URL → 403.
9. `USER` role hits `/finance/payment-sources` directly → 403.

**Rendered UX QA** (this cannot be done by reading code): every screen at 360px and 1440px · RTL with mixed LTR islands — Sheba, reference numbers, FX rates, all reading in the intended order · long Persian vendor names and long rejection reasons without overflow · Persian digits consistent in every displayed amount · keyboard-only path through the submit form with a visible focus ring · every empty, loading, error, and success state actually reachable and correct.

**Lean user validation** (`[HYPOTHESIS]`s in §3 and §7 are unvalidated until this happens):

- *First-click test* on the submit form with 5 employees: given "you need a Figma licence", where do they click first? **Confirms** if ≥4 reach درخواست جدید unaided.
- *Task walkthrough* with the actual Finance person on a day of real requests. **Rejects** the batch-payment design if they never use it, or the queue sort if they immediately re-sort.
- *Behavioural measure* after one month: share of requests submitted with a valid invoice attached on first try. `[NEEDS PROOF]` — no baseline exists, so measure the first month as the baseline rather than claiming an improvement we can't evidence.

---

## 17. Risks and open decisions

| Risk | Impact | Response |
|---|---|---|
| **Rial/Toman unit confusion** | Every reported number wrong by 10× | Phase 0 blocker. One `formatMoney()`, storage always in rial, a unit assertion in the aggregation service. |
| **Finance keeps using their spreadsheet** | Module is dead on arrival | Phase 1 must deliver a queue that is genuinely faster than the spreadsheet. Validate with the real Finance user before Phase 2 starts. |
| ~~Attachments are public-read S3 URLs~~ **closed** | Invoices leak to anyone with the link | Done in Phase 1: uploads use `acl: 'private'` and `S3StorageService.getSignedReadUrl()` serves them for 15 minutes. |
| Approval matrix mis-set at launch | Everything routes to one person, or nothing gets approved | Seed conservative defaults; make `/finance/settings` editable by admin from day one. |
| Recurring cron double-fires and duplicates a request | Vendor paid twice | Unique constraint on `(recurringSource, dueDate)`; the materialiser is idempotent. |
| Notification fatigue → approvals ignored | Deadlines missed | Approval notifications are not silenceable; everything else respects preferences. Digest rather than per-event where possible. |
| ~~`removeUser()` hardcoded delete list~~ **closed** | User deletion breaks in production | Done in Phase 1: deletion is refused for a user with finance history (audit evidence) and nullable back-references are cleared. Verified. |

**Open decisions for the product owner**

1. **Who holds `approver`?** Every team lead, or a small named group? This determines whether the chain is one step or genuinely hierarchical. *Recommendation:* start with a small named group — expanding is easy, contracting is political.
2. **Threshold values.** Defaults proposed: no approver under ۲٬۰۰۰٬۰۰۰ تومان · one approver from ۲ to ۲۰ میلیون · approver + admin above ۲۰ میلیون. *Recommendation:* confirm with the CEO before launch; these are placeholders, not research.
3. **Do employees see each other's requests?** *Recommendation:* no — own requests only. Approvers see their team's, Finance and admin see all. Least surprising, and payment amounts are quietly sensitive.
4. **Is the FX rate per-payment or a shared daily rate?** *Recommendation:* per-payment. A shared rate is a second source of truth that will drift.
