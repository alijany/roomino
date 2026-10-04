# Local UI demo data

The development database has sample accounts, meeting rooms and bookings,
attendance history, leave requests, vendors, recurring expenses, notifications,
and payment requests in every status.

Re-run the seed with:

```bash
pnpm --filter core-api seed:ui
```

The API must have started once so its migrations and default finance categories
exist. The script requires `NODE_ENV=development`, reads `apps/core-api/.env`,
and writes all fixtures in one transaction. It adds missing records without
resetting the database or overwriting existing fixtures. Dates follow the
application's Tehran calendar. Re-running on the same day does not duplicate
records; running later adds missing recent attendance and reservation dates.

The seed uses the ORM directly: it does not start the API, generate migrations,
run scheduled jobs, or send SMS/email notifications. The three seeded
notifications are records displayed only inside the app.

## Demo accounts

Sign in normally with one of these phone numbers. Request an OTP in the login
screen and read the code from the running development API's terminal. There is
no fixed OTP or password.

In the devcontainer, open the forwarded **port 80** (nginx) so both the UI and
`/api/v1` use the same origin. Direct port 8000 only serves Next.js and does not
proxy the API with the default relative API URL.

| Account | Phone | Roles |
| --- | --- | --- |
| Admin | `09210000101` | admin, user |
| Finance | `09210000102` | finance, user |
| Approver | `09210000103` | approver, user |
| HR | `09210000104` | hr, user |
| Employee | `09210000105` | user |
| Second employee | `09210000106` | user |
| User without attendance | `09210000108` | user |
| Multiple roles | `09210000107` | admin, finance, approver, hr, user |

Phone numbers are stored in international format, for example `+989210000101`.
Every demo account is approved and has accepted roles. All accounts have an
attendance profile except **User without attendance**, which lets you inspect
the explanation shown on personal reports and requests before HR registers a
person for attendance.

## Inspect the navigation

1. Sign in as Admin and inspect **کارهای من** (My work): personal attendance,
   leave requests, nine personal payment requests and an approval to review.
2. Choose **مدیریت** (Management) to open `/dashboard/management` and inspect
   organization, attendance and finance tools.
3. Search for a management item from My work; search covers both areas.
4. Sign in with the multiple-role account to inspect the role selector and
   finance-only links. Sign in as Employee to check that management is hidden.
5. Open the menu on a narrow screen to inspect the drawer and Management link
   in the bottom navigation.
6. Sign in as User without attendance (`09210000108`) and open the personal
   report and request pages. They explain that HR needs to activate attendance,
   without offering report export or new request controls.

Existing local accounts and records are preserved. Sample records are marked
with `نمونه UI`, `DEMO_UI`, or `DEMO-UI` so they are easy to identify.
