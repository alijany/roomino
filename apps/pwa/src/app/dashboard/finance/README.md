# Finance domain — frontend reference

Persian, RTL, Jalali. Backend contract: [`apps/core-api/src/finance/README.md`](../../../../../core-api/src/finance/README.md).

## Layout

```
finance.types.ts               enums + DTOs, mirrors the backend
finance.api.ts                 every SWR hook for the domain
finance.constants.ts           STATUS_META (label + tone + hint), labels, FINANCE_ROUTES
finance.util.ts                formatRequestAmount, describeDueDate, isOverdue, formatJalali
finance.component.*.tsx        shared across the pages below
page.tsx                       the finance dashboard (KPIs + charts)
my-requests/  approvals/  queue/  requests/[id]/  vendors/
recurring/    reports/    sources/  settings/
```

`STATUS_META` is the single source for how a status looks and reads. Add a
status there, not inline.

## Money

`formatMoney(rial)` from `@/libs/format/format.util` — takes **rial**, prints
**Toman** with Persian digits. `formatMoneyCompact(rial)` for axis ticks and
dense tiles. `formatForeign(minor, code)` for non-IRR.
`formatRequestAmount(request)` picks between them: a USD request is never shown
as Toman before Finance has set a rate.

`<CurrencyInput unit="toman" />` displays Toman but its `value`/`onValueChange`
are still rial. Never convert by hand.

`formatCost` / `formatCostSubtext` are deprecated (they take Toman) — kept only
for existing call sites.

## Screens

| Route | Who | Job |
|---|---|---|
| `my-requests` | everyone | own requests + the create flow |
| `approvals` | approver, admin | only what is waiting on *me* right now |
| `queue` | finance, admin | the payment queue, deadline-ordered, overdue first |
| `requests/[id]` | scoped | detail, timeline, and every action |
| `vendors` | finance, admin | the طرف‌حساب directory and their saved accounts |
| `recurring` | finance, admin | subscription/bill schedules |
| `reports` | finance, admin | monthly close + CSV export |
| `sources` | finance | the company's own accounts |
| `settings` | admin | the approval matrix |
| `/dashboard/finance` | finance, admin | KPIs, trend, breakdowns, upcoming |

The employee surface and the Finance surface are deliberately different
screens. Don't merge them.

## The create flow

`finance.component.request-form.tsx` — 3 steps + review. The draft is
**created on the server after step 2**, because attachments need a request to
hang off; that also means an abandoned form survives as a draft. Step 3 uploads
against the real id, review calls `/submit`.

`useApprovalPreview()` runs debounced on step 1 so the user sees which approvers
an amount will need before filling in the rest.

The same component edits a returned request — pass `existing`.

## Actions

The detail page renders from `data.permissions`, which the API computes. Don't
re-derive who can do what on the client.

`useRequestAction(action)` builds the transition hooks; each takes
`{ id, data? }` so one hook instance can act on any row.

## Conventions

Every page is `'use client'`, wraps `RoleProtectedRoute allowedRoles={RouteItems.<key>.roles}`
around `DashbaordLayout` (the export really is spelled that way), and renders
async data through `DataView`.

`DataView` shows a static `errorMessage` and swallows `ApiError.message`, so
finance actions surface server reasons through `toast` / `ResultModal` instead.

LTR islands (`dir="ltr"`, Latin digits): Sheba, card and reference numbers, FX
rates, amount inputs. Everything else is RTL with Persian digits.

Nav lives in `dashboard.constants.route-groups.tsx` under the «مالی» group.
`BottomNavBar` is a separate hardcoded list and does **not** include finance yet.

## Charts

`finance.component.charts.tsx`. Two validated categorical slots — blue
`#2a78d6` / orange `#eb6834` — used **only** for the domestic/foreign split;
everything else is a single-hue magnitude comparison, so there is no hue to
misread. Both were run through the dataviz palette validator (CVD separation,
contrast vs a white surface).

Deliberate choices worth keeping:

- **No donut for the category breakdown.** Long Persian category names and
  seven slices is where pie charts fail; a horizontal ranked bar answers "what
  cost the most" directly.
- **Every chart has a table view** behind the toggle — that is how exact figures
  and screen readers get the same data, not a nice-to-have.
- **`changePercent` is `null`, not `0`, with no prior period.** "+100%" off a
  zero baseline is a lie, so the tile renders no delta at all.
- Totals on the queue page exclude foreign amounts and say so; summing mixed
  currencies would invent a number.

The reports page's month picker shows **Jalali** months but sends Gregorian
year/month, because that is what the API ranges on.

## Shared pieces this domain introduced

`Badge` (`@/ui/atoms`) · `Table` and `DatePickerField`/`DateRangePicker`
(`@/ui/molecules`) · `buildQuery`/`withQuery` (`@/libs/api/api.util.query`) ·
`formatMoney` / `formatMoneyCompact`. Reuse them rather than adding a second
variant.

The CSV export cannot be a plain `<a href>` — the endpoint is authenticated, so
`reports/page.tsx` fetches it with the bearer token and hands the browser a blob.
