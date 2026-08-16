# Finance domain — frontend reference

Persian, RTL, Jalali. Backend contract: [`apps/core-api/src/finance/README.md`](../../../../../core-api/src/finance/README.md).

## Layout

```
finance.types.ts               enums + DTOs, mirrors the backend
finance.api.ts                 every SWR hook for the domain
finance.constants.ts           STATUS_META (label + tone + hint), labels, FINANCE_ROUTES
finance.util.ts                formatRequestAmount, describeDueDate, isOverdue, formatJalali
finance.component.*.tsx        shared across the pages below
my-requests/  approvals/  queue/  requests/[id]/  sources/  settings/
```

`STATUS_META` is the single source for how a status looks and reads. Add a
status there, not inline.

## Money

`formatMoney(rial)` from `@/libs/format/format.util` — takes **rial**, prints
**Toman** with Persian digits. `formatForeign(minor, code)` for non-IRR.
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
| `sources` | finance | the company's own accounts |
| `settings` | admin | the approval matrix |

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

## Shared pieces this domain introduced

`Badge` (`@/ui/atoms`) · `Table` and `DatePickerField`/`DateRangePicker`
(`@/ui/molecules`) · `buildQuery`/`withQuery` (`@/libs/api/api.util.query`) ·
`formatMoney`. Reuse them rather than adding a second variant.
