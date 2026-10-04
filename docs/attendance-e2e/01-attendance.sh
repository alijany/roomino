#!/usr/bin/env bash
# Attendance module — end-to-end suite. Needs a fresh DB with seed-users.sql
# loaded and tokens minted to /tmp/at_1 … /tmp/at_6 (see README.md).
set -uo pipefail

API=${API:-http://127.0.0.1:4000/api/v1}
TOK=${TOK:-/tmp}
PSQL=${PSQL:-psql -h 127.0.0.1 -U postgres -d roomino -tAc}

EMP=$(cat "$TOK/at_1")     # سارا — employee in «توسعه»
APR=$(cat "$TOK/at_2")     # رضا  — approver of «توسعه», employee there too
HR=$(cat "$TOK/at_3")      # نگار — hr
ADM=$(cat "$TOK/at_4")     # admin
EMP2=$(cat "$TOK/at_5")    # علی  — employee in «پشتیبانی», outside رضا's team
GUEST=$(cat "$TOK/at_6")   # no profile

TODAY=$(TZ=Asia/Tehran date +%F)
YESTERDAY=$(TZ=Asia/Tehran date -d yesterday +%F)
TOMORROW=$(TZ=Asia/Tehran date -d tomorrow +%F)
# Iranian weekday of today: 0 = Saturday … 6 = Friday
WEEKDAY=$(( ($(TZ=Asia/Tehran date +%w) + 1) % 7 ))
JYEAR=$(node -e "const {format}=require(require.resolve('date-fns-jalali',{paths:['$(dirname "$0")/../../apps/core-api']}));console.log(format(new Date(),'yyyy'))")

# Office at Azadi Square; "near" is ~50 m away, "far" ~5 km.
LAT=35.6997; LNG=51.3380
NEAR_LAT=35.7001; NEAR_LNG=51.3382
FAR_LAT=35.7450; FAR_LNG=51.3380

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ $1"; echo "      $2"; }

# call TOKEN METHOD PATH [JSON] → sets $CODE and $BODY
call() {
  local out
  out=$(curl -s -w $'\n%{http_code}' -X "$2" "$API$3" \
    -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
    ${4:+-d "$4"})
  CODE=${out##*$'\n'}
  BODY=${out%$'\n'*}
}

# expect DESCRIPTION EXPECTED_CODE [JQ_TEST]
expect() {
  if [[ "$CODE" != "$2" ]]; then bad "$1" "HTTP $CODE (want $2): ${BODY:0:300}"; return; fi
  if [[ -n "${3:-}" ]] && [[ "$(echo "$BODY" | jq -r "$3" 2>/dev/null)" != "true" ]]; then
    bad "$1" "jq '$3' was not true: ${BODY:0:300}"; return
  fi
  ok "$1"
}

echo "== setup (HR)"
call "$HR" POST /attendance/workplaces "{\"name\":\"دفتر مرکزی\",\"city\":\"تهران\",\"lat\":$LAT,\"lng\":$LNG,\"radiusMeters\":200}"
expect "HR creates a workplace" 201 '.radiusMeters == 200'
WP=$(echo "$BODY" | jq .id)

DAYS=$(jq -nc '[range(0;7) | {dayOfWeek: ., isActive: true, startTime: "08:00", endTime: "17:00"}]')
call "$HR" POST /attendance/shifts "{\"name\":\"اداری\",\"year\":$JYEAR,\"days\":$DAYS}"
expect "HR creates a seven-day shift" 201 '.days | length == 7'
SHIFT=$(echo "$BODY" | jq .id)

call "$HR" POST /attendance/shifts "{\"name\":\"خراب\",\"year\":$JYEAR,\"days\":[{\"dayOfWeek\":0,\"isActive\":true,\"startTime\":\"17:00\",\"endTime\":\"08:00\"}]}"
expect "a shift that ends before it starts is refused" 400

call "$HR" POST /attendance/job-groups '{"name":"توسعه","approverIds":[2]}'
expect "HR creates «توسعه» with رضا as approver" 201 '.approvers[0].id == 2'
DEV=$(echo "$BODY" | jq .id)
call "$HR" POST /attendance/job-groups '{"name":"پشتیبانی"}'
expect "HR creates «پشتیبانی»" 201
SUP=$(echo "$BODY" | jq .id)

call "$HR" POST /attendance/work-policies "{\"name\":\"پیش‌فرض\",\"isDefault\":true,\"rules\":[{\"requestType\":\"leave_entitled\",\"year\":$JYEAR,\"yearlyCapMinutes\":960,\"allowOverYearlyCap\":false}]}"
expect "HR creates the default policy: 16h entitled leave, hard cap" 201 '.isDefault and (.rules|length==1)'

call "$HR" GET "/attendance/employees/candidates"
expect "every user is a candidate before profiles exist" 200 '.items | length == 6'

call "$HR" POST /attendance/employees "{\"userId\":1,\"personnelCode\":\"1001\",\"workplaceId\":$WP,\"jobGroupId\":$DEV,\"shiftId\":$SHIFT,\"shiftStartDate\":\"2026-01-01\"}"
expect "profile for سارا, default policy applied" 201 '.workPolicy.name == "پیش‌فرض" and .currentShift.id != null'
P1=$(echo "$BODY" | jq .id)
call "$HR" POST /attendance/employees "{\"userId\":2,\"personnelCode\":\"1002\",\"workplaceId\":$WP,\"jobGroupId\":$DEV,\"shiftId\":$SHIFT,\"shiftStartDate\":\"2026-01-01\"}"
expect "profile for رضا" 201
P2=$(echo "$BODY" | jq .id)
call "$HR" POST /attendance/employees "{\"userId\":5,\"personnelCode\":\"1005\",\"workplaceId\":$WP,\"jobGroupId\":$SUP,\"shiftId\":$SHIFT,\"shiftStartDate\":\"2026-01-01\",\"remoteDays\":[$WEEKDAY]}"
expect "profile for علی with today as a fixed remote day" 201 ".remoteDays == [$WEEKDAY]"
P5=$(echo "$BODY" | jq .id)

call "$HR" POST /attendance/employees "{\"userId\":3,\"personnelCode\":\"1001\",\"workplaceId\":$WP,\"shiftId\":$SHIFT,\"shiftStartDate\":\"2026-01-01\"}"
expect "a duplicate personnel code is refused" 409
call "$HR" POST /attendance/employees "{\"userId\":1,\"personnelCode\":\"9999\",\"workplaceId\":$WP,\"shiftId\":$SHIFT,\"shiftStartDate\":\"2026-01-01\"}"
expect "a second profile for the same user is refused" 409
call "$HR" POST /attendance/employees "{\"userId\":3,\"personnelCode\":\"1003\",\"workplaceId\":$WP,\"shiftId\":$SHIFT,\"shiftStartDate\":\"2026-01-01\"}"
expect "HR gets a profile too (used for the self-review check)" 201
P3=$(echo "$BODY" | jq .id)

echo "== access"
call "$EMP" GET /attendance/employees
expect "an employee cannot list employees" 403
call "$GUEST" GET /attendance/me
expect "a user without a profile is told so, not 403'd" 200 '.hasProfile == false'
call "$GUEST" POST /attendance/me/check-in "{\"lat\":$NEAR_LAT,\"lng\":$NEAR_LNG}"
expect "a user without a profile cannot check in" 403
call "$EMP" GET /attendance/team/board
expect "a non-approver has no team" 403
call "$APR" GET /attendance/me
expect "رضا is flagged as an approver" 200 '.isApprover == true and .hasProfile == true'

echo "== check-in / check-out"
call "$EMP" POST /attendance/me/check-in "{\"lat\":$FAR_LAT,\"lng\":$FAR_LNG}"
expect "check-in 5 km away fails and offers remote" 200 '.success == false and .canRemote == true'
call "$EMP" POST /attendance/me/check-in "{\"lat\":$NEAR_LAT,\"lng\":$NEAR_LNG}"
expect "check-in inside the radius is an office day" 200 '.success and .attendance.workMode == "office" and .attendance.checkInDistanceM < 200'
call "$EMP" POST /attendance/me/check-in "{\"lat\":$NEAR_LAT,\"lng\":$NEAR_LNG}"
expect "a second check-in the same day is refused" 200 '.success == false'
call "$EMP" POST /attendance/me/check-out "{\"lat\":$FAR_LAT,\"lng\":$FAR_LNG}"
expect "office check-out from 5 km away fails" 200 '.success == false'
call "$EMP" POST /attendance/me/check-out "{\"lat\":$NEAR_LAT,\"lng\":$NEAR_LNG}"
expect "check-out inside the radius succeeds" 200 '.success and .attendance.checkOut != null'

call "$APR" POST /attendance/me/check-in "{\"lat\":$FAR_LAT,\"lng\":$FAR_LNG,\"remote\":true}"
expect "unpermitted remote check-in is accepted…" 200 '.success and .attendance.workMode == "remote"'
call "$APR" GET /attendance/me/requests
expect "…and files a pending remote request for today" 200 ".items[0].type == \"remote_daily\" and .items[0].dateFrom == \"$TODAY\""
APR_REMOTE=$(echo "$BODY" | jq '.items[0].id')

call "$EMP2" POST /attendance/me/check-in "{\"lat\":$FAR_LAT,\"lng\":$FAR_LNG}"
expect "on a fixed remote day, a far check-in is remote with no request" 200 '.success and .attendance.workMode == "remote"'
call "$EMP2" GET /attendance/me/requests
expect "…and no request was filed" 200 '.counts.pending == 0'

echo "== requests & policy caps"
call "$EMP" POST /attendance/me/requests "{\"type\":\"leave_entitled_daily\",\"dateFrom\":\"$TOMORROW\",\"dateTo\":\"$TOMORROW\"}"
expect "one day of entitled leave (480 min) is accepted" 201 '.durationMinutes == 480 and .status == "pending"'
LEAVE1=$(echo "$BODY" | jq .id)
call "$EMP" POST /attendance/me/requests "{\"type\":\"leave_entitled_daily\",\"dateFrom\":\"$TOMORROW\",\"dateTo\":\"$(TZ=Asia/Tehran date -d '+2 days' +%F)\"}"
expect "two more days would pass the 960-min cap (pending counts)" 400 '.message | test("سقف سالانه")'
call "$EMP" POST /attendance/me/requests "{\"type\":\"leave_entitled_hourly\",\"date\":\"$TOMORROW\",\"timeFrom\":\"۱۰:۰۰\",\"timeTo\":\"12:00\"}"
expect "hourly leave with Persian digits is normalised (120 min)" 201 '.durationMinutes == 120 and .timeFrom == "10:00"'
LEAVE2=$(echo "$BODY" | jq .id)
call "$EMP" POST /attendance/me/requests "{\"type\":\"mission_hourly\",\"date\":\"$TOMORROW\",\"timeFrom\":\"12:00\",\"timeTo\":\"10:00\"}"
expect "a timed request ending before it starts is refused" 400
call "$EMP" POST /attendance/me/requests '{"type":"other"}'
expect "an «other» request needs a description" 400
call "$EMP" POST /attendance/me/requests "{\"type\":\"manual_attendance\",\"date\":\"$YESTERDAY\",\"manualTime\":\"08:30\",\"manualDirection\":\"in\"}"
expect "a manual check-in for yesterday is filed" 201
MANUAL=$(echo "$BODY" | jq .id)
call "$EMP" POST /attendance/me/requests "{\"type\":\"overtime\",\"date\":\"$TODAY\",\"timeFrom\":\"17:00\",\"timeTo\":\"19:00\"}"
expect "overtime is filed" 201
OVERTIME=$(echo "$BODY" | jq .id)
call "$EMP2" POST /attendance/me/requests "{\"type\":\"mission_daily\",\"dateFrom\":\"$TOMORROW\",\"dateTo\":\"$TOMORROW\"}"
expect "علی files a mission" 201
MISSION5=$(echo "$BODY" | jq .id)

echo "== team approver"
call "$APR" GET /attendance/team/board
expect "رضا's board shows سارا only — not himself, not علی" 200 "[.rows[].employee.id] == [$P1]"
call "$APR" GET /attendance/team/requests
expect "رضا sees only سارا's pending requests" 200 "([.items[].employee.id] | unique) == [$P1] and .counts.pending == 4"
call "$APR" POST "/attendance/team/requests/$LEAVE1/approve"
expect "رضا approves سارا's leave" 200 '.status == "approved" and .reviewedBy.id == 2'
call "$APR" POST "/attendance/team/requests/$MISSION5/approve"
expect "رضا cannot approve علی's request" 404
call "$APR" POST "/attendance/team/requests/$APR_REMOTE/approve"
expect "رضا cannot approve his own request through the team" 404
call "$APR" POST "/attendance/team/requests/$OVERTIME/approve"
expect "رضا approves سارا's overtime" 200
call "$APR" GET "/attendance/team/members/$P5/report"
expect "رضا cannot open علی's report" 404
call "$APR" POST "/attendance/team/members/$P5/attendance" "{\"date\":\"$YESTERDAY\",\"checkIn\":\"08:00\",\"note\":\"x\"}"
expect "رضا cannot correct علی's attendance" 404
call "$APR" PATCH "/attendance/team/members/$P1" '{"remoteDays":[5]}'
expect "رضا sets سارا's remote days" 200 '.remoteDays == [5]'

echo "== admin / HR review"
call "$ADM" POST "/attendance/requests/$APR_REMOTE/approve"
expect "admin approves رضا's remote day" 200
call "$APR" GET /attendance/me
expect "…which makes رضا's remote status «approved»" 200 '.remoteStatus == "approved"'
call "$HR" POST "/attendance/requests/$LEAVE2/reject" '{"note":"پروژه در جریان است"}'
expect "HR rejects the hourly leave with a note" 200 '.status == "rejected" and .reviewNote == "پروژه در جریان است"'
call "$HR" POST "/attendance/requests/$LEAVE2/approve"
expect "a decided request cannot be decided again" 409
call "$HR" POST "/attendance/requests/$MANUAL/approve"
expect "HR approves the manual check-in" 200
CHECKIN_Y=$($PSQL "select to_char(check_in_at at time zone 'Asia/Tehran','HH24:MI') || '/' || check_in_source from attendance_entity where employee_id=$P1 and date='$YESTERDAY'")
[[ "$CHECKIN_Y" == "08:30/manual" ]] && ok "…which writes yesterday's 08:30 manual check-in" || bad "manual check-in written" "got '$CHECKIN_Y'"

call "$HR" POST /attendance/me/requests "{\"type\":\"leave_sick_daily\",\"dateFrom\":\"$TOMORROW\",\"dateTo\":\"$TOMORROW\"}"
expect "HR files their own leave" 201
HR_LEAVE=$(echo "$BODY" | jq .id)
call "$HR" POST "/attendance/requests/$HR_LEAVE/approve"
expect "HR cannot approve their own request" 403
call "$ADM" POST "/attendance/requests/$HR_LEAVE/approve"
expect "admin can" 200

call "$EMP" GET /attendance/me/balances
expect "سارا's entitled balance: 960 accrued, 480 used" 200 '.items[0].accruedMinutes == 960 and .items[0].usedMinutes == 480 and .items[0].remainingMinutes == 480'

echo "== cancel"
call "$EMP" POST /attendance/me/requests "{\"type\":\"mission_hourly\",\"date\":\"$TOMORROW\",\"timeFrom\":\"14:00\",\"timeTo\":\"15:00\"}"
CANCEL=$(echo "$BODY" | jq .id)
call "$EMP" DELETE "/attendance/me/requests/$CANCEL"
expect "سارا withdraws a pending request" 200
call "$EMP" DELETE "/attendance/me/requests/$LEAVE1"
expect "an approved request cannot be withdrawn" 409
call "$EMP2" DELETE "/attendance/me/requests/$OVERTIME"
expect "someone else's request is not found" 404

echo "== reports"
call "$EMP" GET /attendance/me/report
expect "today is present for سارا" 200 "(.days[] | select(.date == \"$TODAY\") | .status) == \"present\""
expect "approved overtime shows on today" 200 "(.days[] | select(.date == \"$TODAY\") | .overtime) == 120"
expect "tomorrow is planned leave" 200 "(.days[] | select(.date == \"$TOMORROW\") | .status) == \"on_leave\""
expect "yesterday — check-in only — is incomplete and flagged" 200 "(.days[] | select(.date == \"$YESTERDAY\") | .status == \"incomplete\" and .needsFix)"

call "$HR" POST "/attendance/reports/employees/$P1/attendance" "{\"date\":\"$YESTERDAY\",\"checkIn\":\"08:30\",\"checkOut\":\"17:00\",\"note\":\"فراموشی ثبت خروج\"}"
expect "HR corrects yesterday" 201 '.editedBy.id == 3 and .checkOut == "17:00"'
call "$HR" POST "/attendance/reports/employees/$P1/attendance" "{\"date\":\"$TOMORROW\",\"checkIn\":\"08:00\",\"note\":\"x\"}"
expect "a correction for a future day is refused" 400
call "$HR" GET "/attendance/reports/employees/$P1"
expect "…yesterday is now present with a 30-minute delay" 200 "(.days[] | select(.date == \"$YESTERDAY\") | .status == \"present\" and .delay == 30)"

call "$APR" GET "/attendance/team/members/$P1/report"
expect "رضا sees the same report for سارا" 200 "(.days[] | select(.date == \"$YESTERDAY\") | .status) == \"present\""

call "$EMP2" GET /attendance/me/report
expect "علی's fixed remote day counts as a full remote day" 200 "(.days[] | select(.date == \"$TODAY\") | .status) == \"remote\""

call "$HR" GET /attendance/reports/performance
expect "the performance report lists all four profiles" 200 '.items | length == 4'
call "$HR" GET "/attendance/reports/performance?jobGroupId=$DEV"
expect "…and filters by job group" 200 '.items | length == 2'
call "$HR" GET /attendance/reports/board
expect "today's board: everyone who checked in counts as present" 200 '.stats.present == 3 and .stats.employees == 4'

CSV=$(curl -s "$API/attendance/reports/performance/export" -H "Authorization: Bearer $HR")
[[ "$(printf %s "$CSV" | head -c3 | od -An -tx1 | tr -d ' ')" == "efbbbf" && "$CSV" == *"کد پرسنلی"* && "$CSV" == *"1001"* ]] && ok "performance CSV has a BOM, Persian headers and rows" || bad "performance CSV" "${CSV:0:120}"
CSV=$(curl -s "$API/attendance/me/report/export" -H "Authorization: Bearer $EMP")
[[ "$CSV" == *"پرسنل"* && "$CSV" == *"تاریخ"* ]] && ok "personal CSV has a summary block and a day table" || bad "personal CSV" "${CSV:0:120}"
call "$EMP" GET /attendance/reports/performance
expect "an employee cannot see the performance report" 403

echo "== grants"
call "$HR" POST "/attendance/reports/employees/$P1/grants" "{\"type\":\"remote_daily\",\"dateFrom\":\"$(TZ=Asia/Tehran date -d '+3 days' +%F)\",\"dateTo\":\"$(TZ=Asia/Tehran date -d '+3 days' +%F)\"}"
expect "HR grants a remote day, created approved" 201 '.status == "approved"'
call "$HR" POST "/attendance/reports/employees/$P3/grants" "{\"type\":\"remote_daily\",\"dateFrom\":\"$TOMORROW\",\"dateTo\":\"$TOMORROW\"}"
expect "HR cannot grant to themselves" 403
call "$HR" POST "/attendance/reports/employees/$P1/grants" "{\"type\":\"overtime\",\"date\":\"$TODAY\",\"timeFrom\":\"17:00\",\"timeTo\":\"18:00\"}"
expect "overtime is not grantable" 400

echo "== holidays"
call "$HR" POST /attendance/holidays "{\"title\":\"تعطیلی آزمایشی\",\"date\":\"$(TZ=Asia/Tehran date -d '+4 days' +%F)\"}"
expect "HR adds a manual holiday" 201
call "$HR" POST /attendance/holidays "{\"title\":\"تکراری\",\"date\":\"$(TZ=Asia/Tehran date -d '+4 days' +%F)\"}"
expect "a second holiday on the same date is refused" 409
call "$EMP" GET "/attendance/holidays?upcoming=5"
expect "anyone can read upcoming holidays" 200 '.items[0].title == "تعطیلی آزمایشی"'
call "$EMP" POST /attendance/holidays '{"title":"x","date":"2026-01-01"}'
expect "an employee cannot add holidays" 403
call "$HR" POST /attendance/holidays/sync "{\"year\":$JYEAR}"
expect "official sync stores holidays (API or fixed-solar fallback)" 200 '.added > 0'
OFFICIAL=$(echo "$BODY" | jq -r .source)
call "$HR" GET "/attendance/holidays?year=$JYEAR&source=official"
OFF_ID=$(echo "$BODY" | jq '.items[0].id')
call "$HR" DELETE "/attendance/holidays/$OFF_ID"
expect "an official holiday cannot be deleted…" 409
call "$HR" POST "/attendance/holidays/$OFF_ID/toggle"
expect "…only deactivated" 200 '.active == false'
call "$HR" POST /attendance/holidays/sync "{\"year\":$JYEAR}"
expect "a second sync adds nothing and leaves the deactivation alone" 200 '.added == 0'
[[ "$($PSQL "select active from holiday_entity where id=$OFF_ID")" == "f" ]] && ok "…still inactive" || bad "deactivation kept" "re-enabled by sync"
echo "    (holiday source this run: $OFFICIAL)"

echo "== user deletion"
call "$ADM" DELETE /users/6
expect "a user without attendance history can be deleted" 200
call "$ADM" DELETE /users/1
expect "a user with attendance history cannot" 409

echo
echo "passed: $PASS  failed: $FAIL"
[[ $FAIL -eq 0 ]]
