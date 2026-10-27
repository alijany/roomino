#!/usr/bin/env bash
# Attendance maintenance — data reset, schedule mode and self-declared
# check-in. Run right after
# 01-attendance.sh, on the same database: it resets the data that suite left.
set -uo pipefail

API=${API:-http://127.0.0.1:4000/api/v1}
TOK=${TOK:-/tmp}
PSQL=${PSQL:-psql -h 127.0.0.1 -U postgres -d roomino -tAc}

EMP=$(cat "$TOK/at_1")     # سارا — employee in «توسعه»
APR=$(cat "$TOK/at_2")     # رضا  — employee in «توسعه», its approver
HR=$(cat "$TOK/at_3")      # نگار — hr, with a profile and no group
ADM=$(cat "$TOK/at_4")     # admin
EMP2=$(cat "$TOK/at_5")    # علی  — employee in «پشتیبانی»

TODAY=$(TZ=Asia/Tehran date +%F)
YESTERDAY=$(TZ=Asia/Tehran date -d yesterday +%F)
CONFIRM='پاکسازی'

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

count() { echo "$BEFORE" | jq ".counts.$1"; }
USERS=$($PSQL 'select count(*) from user_entity')

echo "== access (admin only)"
call "$EMP" GET /attendance/maintenance
expect "an employee cannot see maintenance" 403
call "$HR" GET /attendance/maintenance
expect "HR cannot see maintenance" 403
call "$HR" POST /attendance/maintenance/reset "{\"scope\":\"records\",\"confirm\":\"$CONFIRM\"}"
expect "HR cannot reset" 403
call "$ADM" GET /attendance/maintenance
expect "admin sees the counts 01 left behind, the phrase and the mode" 200 \
  '.counts.attendance > 0 and .counts.requests > 0 and .counts.employees > 0 and .confirmation == "پاکسازی" and .scheduleMode.enabled == false and .scheduleMode.history == [] and .selfDeclared == {"enabled":false,"changedAt":null,"changedBy":null}'
BEFORE=$BODY

echo "== reset — validation"
call "$ADM" POST /attendance/maintenance/reset '{"scope":"records","confirm":"بله"}'
expect "a wrong confirmation is refused, naming the phrase" 400 '.message | test("پاکسازی")'
call "$ADM" POST /attendance/maintenance/reset '{"scope":"records"}'
expect "a missing confirmation is refused" 400
call "$ADM" POST /attendance/maintenance/reset "{\"scope\":\"nope\",\"confirm\":\"$CONFIRM\"}"
expect "an unknown scope is refused" 400
call "$ADM" GET /attendance/maintenance
expect "…and nothing was deleted" 200 ".counts == $(echo "$BEFORE" | jq -c .counts)"

echo "== reset — records"
# Typed with a ZWNJ and padding, as a Persian keyboard would — still matches.
call "$ADM" POST /attendance/maintenance/reset '{"scope":"records","confirm":" پاک‌سازی "}'
expect "records reset reports what it deleted" 200 \
  ".scope == \"records\" and .deleted.attendance == $(count attendance) and .deleted.requests == $(count requests) and (.deleted | has(\"employees\") | not)"
call "$ADM" GET /attendance/maintenance
expect "attendance, requests and leave ledgers are empty" 200 \
  '.counts.attendance == 0 and .counts.requests == 0 and .counts.leaveBalances == 0'
expect "profiles and setup are kept" 200 \
  ".counts.employees == $(count employees) and .counts.workplaces == $(count workplaces) and .counts.shifts == $(count shifts) and .counts.jobGroups == $(count jobGroups) and .counts.holidays == $(count holidays)"
[[ "$($PSQL 'select count(*) from attendance_job_group_approver')" -gt 0 ]] \
  && ok "job-group approvers are kept" || bad "job-group approvers are kept" "pivot is empty"

call "$EMP" GET /attendance/me
expect "سارا still has a profile, and a clean day" 200 \
  '.hasProfile and .attendance == null and .pendingRequests == 0 and .scheduleMode == false and .manualRequests == []'
P1=$(echo "$BODY" | jq .profile.id)
WLAT=$(echo "$BODY" | jq .workplace.lat); WLNG=$(echo "$BODY" | jq .workplace.lng)

# Before schedule mode, which refuses every check-in for the rest of the run.
# رضا and نگار only: the checks below still need سارا and علی not checked in.
echo "== self-declared check-in"
call "$HR" PATCH /attendance/maintenance/self-declared '{"enabled":true}'
expect "HR cannot switch self-declared check-in" 403
call "$ADM" PATCH /attendance/maintenance/self-declared '{"enabled":"yes"}'
expect "enabled must be a boolean" 400
call "$APR" GET /attendance/me
expect "while off, /me says to locate" 200 '.selfDeclared == false'
call "$APR" POST /attendance/me/check-in '{"lat":0,"lng":0}'
expect "…and a check-in far from the workplace is refused, offering remote" 200 '.success == false and .canRemote'

call "$ADM" PATCH /attendance/maintenance/self-declared '{"enabled":true}'
expect "admin switches it on" 200 '.enabled and .changedBy.id == 4 and .changedAt != null'
CHANGED=$(echo "$BODY" | jq -r .changedAt)
call "$ADM" PATCH /attendance/maintenance/self-declared '{"enabled":true}'
expect "switching it on while on changes nothing" 200 ".enabled and .changedAt == \"$CHANGED\""
call "$APR" GET /attendance/me
expect "/me tells the client not to locate" 200 '.selfDeclared'

call "$APR" POST /attendance/me/check-in '{}'
expect "a check-in with no position is an office day, self-declared" 200 \
  '.success and .attendance.workMode == "office" and .attendance.checkInSource == "self"'
call "$APR" POST /attendance/me/check-out '{"lat":0,"lng":0}'
expect "a check-out far from the workplace is accepted" 200 '.success and .attendance.checkOutSource == "self"'
[[ "$($PSQL "select concat_ws(',', a.check_in_lat, a.check_in_distance_m, a.check_out_lat, a.check_out_distance_m) from attendance_entity a join employee_profile_entity p on p.id = a.employee_id where p.user_id = 2 and a.date = '$TODAY'")" == "" ]] \
  && ok "no position is kept, not even one the client sent" \
  || bad "no position is kept" "$($PSQL "select a.* from attendance_entity a join employee_profile_entity p on p.id = a.employee_id where p.user_id = 2")"
CSV=$(curl -s "$API/attendance/me/report/export?from=$TODAY&to=$TODAY" -H "Authorization: Bearer $APR")
[[ "$CSV" == *خوداظهاری* ]] && ok "the CSV names the source «خوداظهاری»" || bad "CSV source" "${CSV:0:300}"

call "$HR" GET /attendance/me
P3=$(echo "$BODY" | jq .profile.id)
if [[ "$(echo "$BODY" | jq '.holiday == null and .shiftStart != null')" == true ]]; then
  call "$ADM" PATCH "/attendance/employees/$P3" '{"attendanceMode":"untracked"}'
  expect "نگار is «بدون ثبت» for a moment" 200 '.attendanceMode == "untracked"'
  call "$HR" POST /attendance/me/presence '{"lat":0,"lng":0}'
  expect "«امروز هستم» far from the workplace is a day at the office" 200 '.success and .declared and .workMode == "office"'
  [[ "$($PSQL "select concat_ws(',', lat, lng, distance_m) from presence_declaration_entity where employee_id = $P3 and date = '$TODAY'")" == "" ]] \
    && ok "…with no position kept" || bad "declaration keeps no position" "$($PSQL "select * from presence_declaration_entity where employee_id = $P3")"
  call "$HR" DELETE /attendance/me/presence
  expect "…taken back" 200 '.declared == false'
  call "$ADM" PATCH "/attendance/employees/$P3" '{"attendanceMode":null}'
  expect "…and «ساعت‌دار» again, undone the same day" 200 '.attendanceMode == "tracked"'
else
  echo "  (today isn't a working day for نگار — «امروز هستم» skipped)"
fi

call "$HR" POST /attendance/me/check-in '{"remote":true}'
expect "remote is the person's word: recorded, and filed for approval" 200 \
  '.success and .attendance.workMode == "remote" and .attendance.checkInSource == "self" and (.message | test("تایید"))'
[[ "$($PSQL "select description from attendance_request_entity where employee_id = $P3 and type = 'remote_daily' and status = 'pending' and date_from = '$TODAY'")" == *خوداظهاری* ]] \
  && ok "the remote-day request says it was self-declared" \
  || bad "remote request description" "$($PSQL "select description from attendance_request_entity where employee_id = $P3")"

call "$ADM" PATCH /attendance/maintenance/self-declared '{"enabled":false}'
expect "switched off, at once" 200 '.enabled == false and .changedBy.id == 4'
call "$APR" GET /attendance/me
expect "/me says to locate again" 200 '.selfDeclared == false'

echo "== schedule mode — switching"
call "$HR" PATCH /attendance/maintenance/schedule-mode '{"enabled":true}'
expect "HR cannot switch schedule mode" 403
call "$ADM" PATCH /attendance/maintenance/schedule-mode '{"enabled":"yes"}'
expect "enabled must be a boolean" 400
call "$ADM" PATCH /attendance/maintenance/schedule-mode "{\"enabled\":true,\"note\":\"$(printf 'x%.0s' {1..501})\"}"
expect "a note over 500 characters is refused" 400

call "$ADM" PATCH /attendance/maintenance/schedule-mode '{"enabled":true}'
expect "admin switches it on: a period from today" 200 \
  ".enabled and .coversToday and .current.startDate == \"$TODAY\" and .current.startedBy.id == 4"
call "$ADM" PATCH /attendance/maintenance/schedule-mode '{"enabled":false}'
expect "switched off the same day, it never happened" 200 \
  '.enabled == false and .coversToday == false and .history == []'
call "$EMP2" POST /attendance/me/check-in '{"remote":true}'
expect "…and direct check-in works" 200 '.success'

call "$ADM" PATCH /attendance/maintenance/schedule-mode '{"enabled":true,"note":"  GPS در دست تعمیر است  "}'
expect "on again, with a trimmed note" 200 '.enabled and .current.note == "GPS در دست تعمیر است"'
call "$ADM" PATCH /attendance/maintenance/schedule-mode '{"enabled":true,"note":"تا پایان آبان"}'
expect "switching on while on only updates the note" 200 \
  '(.history | length == 1) and .current.note == "تا پایان آبان"'
call "$ADM" GET /attendance/maintenance
expect "maintenance shows the mode" 200 '.scheduleMode.enabled and .scheduleMode.coversToday'
call "$EMP" GET /attendance/me
expect "employees are told, with the note; today counts by schedule" 200 \
  '.scheduleMode and .scheduleModeNote == "تا پایان آبان" and (.todayStatus | IN("by_schedule", "holiday"))'

echo "== schedule mode — no direct check-in/out"
call "$EMP" POST /attendance/me/check-in "{\"lat\":$WLAT,\"lng\":$WLNG}"
expect "check-in is refused, saying the shift counts" 403 '.message | test("شیفت")'
call "$EMP" POST /attendance/me/check-out "{\"lat\":$WLAT,\"lng\":$WLNG}"
expect "check-out is refused" 403
call "$EMP2" POST /attendance/me/check-in '{"remote":true}'
expect "…for everyone" 403
call "$HR" GET /attendance/reports/board
expect "the board knows, and has nobody missing on shift" 200 \
  '.scheduleMode and ([.rows[] | select(.status == "missing")] | length == 0)'

echo "== schedule mode — past days"
# The mode only ever starts today; plant one that began a week ago, and
# clear holidays from that week so every day is a shift day.
D() { TZ=Asia/Tehran date -d "$1 days ago" +%F; }
D1=$(D 6); D2=$(D 5); D3=$(D 4); D4=$(D 3); D5=$(D 2)
$PSQL "update schedule_mode_period_entity set start_date = '$D1' where end_date is null" >/dev/null
$PSQL "delete from holiday_entity where date between '$D1' and '$TODAY'" >/dev/null
day() { echo "$BODY" | jq -c ".days[] | select(.date == \"$1\")"; }
report() { call "$HR" GET "/attendance/reports/employees/$P1?from=$D1&to=$D5"; }

# D2: arrived late — filed and approved as manual attendance.
call "$EMP" POST /attendance/me/requests "{\"type\":\"manual_attendance\",\"date\":\"$D2\",\"manualTime\":\"09:30\",\"manualDirection\":\"in\"}"
expect "a late arrival is filed" 201
call "$HR" POST "/attendance/requests/$(echo "$BODY" | jq .id)/approve" '{}'
expect "…and approved" 200
# D3: wasn't there — HR marks the day absent.
call "$HR" POST "/attendance/reports/employees/$P1/attendance" "{\"date\":\"$D3\",\"note\":\"غیبت\"}"
expect "a correction without times needs «absent»" 400
call "$HR" POST "/attendance/reports/employees/$P1/attendance" "{\"date\":\"$D3\",\"absent\":true,\"note\":\"غیبت بدون اطلاع\"}"
[[ "$CODE" == 200 || "$CODE" == 201 ]] && ok "HR marks a day absent" || bad "HR marks a day absent" "HTTP $CODE ${BODY:0:300}"
# D4: two hours' leave at the end of the day. D5: a day's leave.
call "$EMP" POST /attendance/me/requests "{\"type\":\"leave_entitled_hourly\",\"date\":\"$D4\",\"timeFrom\":\"15:00\",\"timeTo\":\"17:00\"}"
expect "hourly leave is filed" 201
call "$HR" POST "/attendance/requests/$(echo "$BODY" | jq .id)/approve" '{}'
expect "…and approved" 200
call "$EMP" POST /attendance/me/requests "{\"type\":\"leave_entitled_daily\",\"dateFrom\":\"$D5\",\"dateTo\":\"$D5\"}"
expect "a day's leave is filed" 201
call "$HR" POST "/attendance/requests/$(echo "$BODY" | jq .id)/approve" '{}'
expect "…and approved" 200

report
expect "the week's report loads" 200
[[ "$(day "$D1" | jq '.status == "by_schedule" and .worked == .scheduled and .scheduled > 0 and .delay == 0 and .checkIn == null and .needsFix == false')" == true ]] \
  && ok "a day with nothing recorded counts in full, by schedule" || bad "D1 by schedule" "$(day "$D1")"
[[ "$(day "$D2" | jq '.status == "present" and .checkIn == "09:30" and .delay == 90 and .worked == 450 and .early == 0')" == true ]] \
  && ok "a late arrival is late; the check-out defaults to the shift end" || bad "D2 late" "$(day "$D2")"
[[ "$(day "$D3" | jq '.status == "absent" and .worked == 0')" == true ]] \
  && ok "a day marked absent is absent" || bad "D3 absent" "$(day "$D3")"
[[ "$(day "$D4" | jq '.status == "by_schedule" and .leaveMinutes == 120 and .worked == .scheduled - 120')" == true ]] \
  && ok "hourly leave comes out of a by-schedule day" || bad "D4 hourly leave" "$(day "$D4")"
[[ "$(day "$D5" | jq '.status == "on_leave" and .worked == 0')" == true ]] \
  && ok "a day's leave is leave" || bad "D5 leave" "$(day "$D5")"
expect "the summary counts them" 200 \
  '.summary.byScheduleDays == 2 and .summary.absentDays == 1 and .summary.presentDays == 3 and .summary.leaveDays == 1'

echo "== schedule mode — switching off"
call "$ADM" PATCH /attendance/maintenance/schedule-mode '{"enabled":false}'
expect "off: the period ends today, effective tomorrow" 200 \
  ".enabled == false and .coversToday and .history[0].endDate == \"$TODAY\" and .history[0].endedBy.id == 4"
call "$EMP" POST /attendance/me/check-in "{\"lat\":$WLAT,\"lng\":$WLNG}"
expect "today still counts by schedule — no check-in" 403
report
[[ "$(day "$D1" | jq '.status == "by_schedule"')" == true ]] \
  && ok "the days it covered stay by schedule" || bad "D1 after switching off" "$(day "$D1")"
call "$ADM" PATCH /attendance/maintenance/schedule-mode '{"enabled":true}'
expect "on again the same day carries the period on" 200 \
  '.enabled and (.history | length == 1) and .current.endDate == null'

echo "== reset — all"
call "$ADM" PATCH /attendance/maintenance/self-declared '{"enabled":true}'
expect "self-declared check-in on again, to see it survive" 200 '.enabled'
call "$ADM" POST /attendance/maintenance/reset "{\"scope\":\"all\",\"confirm\":\"$CONFIRM\"}"
expect "full reset succeeds" 200 '.scope == "all" and .deleted.employees > 0 and .deleted.requests > 0'
call "$ADM" GET /attendance/maintenance
expect "every attendance table is empty" 200 '[.counts[]] | all(. == 0)'
expect "schedule mode survives a reset" 200 '.scheduleMode.enabled'
expect "so does self-declared check-in" 200 '.selfDeclared.enabled'
[[ "$($PSQL 'select count(*) from attendance_job_group_approver')" == "0" ]] \
  && ok "the approver pivot is empty" || bad "the approver pivot is empty" "rows remain"
[[ "$($PSQL 'select count(*) from user_entity')" == "$USERS" ]] \
  && ok "users are untouched" || bad "users are untouched" "$($PSQL 'select count(*) from user_entity') users"
call "$EMP" GET /attendance/me
expect "سارا no longer has a profile" 200 '.hasProfile == false'
call "$ADM" POST /attendance/workplaces '{"name":"دفتر جدید","lat":35.7,"lng":51.33,"radiusMeters":150}'
expect "setup starts over, ids from 1" 201 '.id == 1'
call "$ADM" PATCH /attendance/maintenance/schedule-mode '{"enabled":false}'
expect "schedule mode is switched off again" 200 '.enabled == false'
call "$ADM" PATCH /attendance/maintenance/self-declared '{"enabled":false}'
expect "self-declared check-in is switched off again" 200 '.enabled == false'

echo
echo "passed: $PASS  failed: $FAIL"
[[ $FAIL -eq 0 ]]
