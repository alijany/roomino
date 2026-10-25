#!/usr/bin/env bash
# Attendance module — attendance modes (ساعت‌دار / منعطف / بدون ثبت).
# Needs a FRESH database with seed-users.sql loaded and tokens minted to
# $TOK/at_1 … at_6 (see README.md). It adds three personas of its own (7–9) and
# mints their tokens, so JWT_SECRET must be exported.
#
# Everything time-dependent is planted through the reviewers' correction
# endpoint on past days, so the suite gives the same answer at any hour.
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
API=${API:-http://127.0.0.1:4000/api/v1}
TOK=${TOK:-/tmp}
PSQL=${PSQL:-psql -h 127.0.0.1 -U postgres -d roomino -tAc}

[[ -n "${JWT_SECRET:-}" ]] || { echo "JWT_SECRET is not set — export the API's secret first."; exit 1; }

# Personas 7–9 are extra users, added here so the suite stands on its own.
$PSQL "insert into user_entity (created_at,updated_at,first_name,last_name,phone,national_id,personnel_code,is_approved) values
 (now(),now(),'نیما','بدون‌ثبت','+989120000017','0077777777','1007',true),
 (now(),now(),'مینا','لغوکننده','+989120000018','0088888888','1008',true),
 (now(),now(),'کامران','ساعت‌دار','+989120000019','0099999999','1009',true)" >/dev/null
$PSQL "insert into roles_entity (created_at,updated_at,role,user_id,invitation_status)
 select now(),now(),'user',id,'accepted' from user_entity where id in (7,8,9)" >/dev/null
for i in 7 8 9; do node "$HERE/mint-token.js" $i +9891200000$((10+i)) > "$TOK/at_$i"; done

EMP=$(cat "$TOK/at_1")      # tracked — supersedes a suggestion with his own overtime
APR=$(cat "$TOK/at_2")      # tracked — suggestion moves between approved and pending
HR=$(cat "$TOK/at_3")
ADM=$(cat "$TOK/at_4")
CAP=$(cat "$TOK/at_5")      # tracked — daily overtime cap
FLEX=$(cat "$TOK/at_6")     # flexible (through its group)
UNT=$(cat "$TOK/at_7")      # untracked (through its group)
CAN=$(cat "$TOK/at_8")      # tracked — declines a suggestion
LATE=$(cat "$TOK/at_9")     # tracked — same times as FLEX, to compare delay

# Civil date N days from today, in Tehran (works on macOS and Linux alike).
dd() { node -e "console.log(new Date(Date.now()+86400000*$1).toLocaleDateString('sv-SE',{timeZone:'Asia/Tehran'}))"; }
TODAY=$(dd 0); YESTERDAY=$(dd -1); D2=$(dd -2); D3=$(dd -3); D4=$(dd -4); D5=$(dd -5); D6=$(dd -6); TOMORROW=$(dd 1)
JYEAR=$(node -e "const {format}=require(require.resolve('date-fns-jalali',{paths:['$HERE/../../apps/core-api']}));console.log(format(new Date(),'yyyy'))")

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ $1"; echo "      $2"; }

call() {
  local out
  out=$(curl -s -w $'\n%{http_code}' -X "$2" "$API$3" \
    -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
    ${4:+-d "$4"})
  CODE=${out##*$'\n'}
  BODY=${out%$'\n'*}
}

expect() {
  if [[ "$CODE" != "$2" ]]; then bad "$1" "HTTP $CODE (want $2): ${BODY:0:300}"; return; fi
  if [[ -n "${3:-}" ]] && [[ "$(echo "$BODY" | jq -r "$3" 2>/dev/null)" != "true" ]]; then
    bad "$1" "jq '$3' was not true: ${BODY:0:400}"; return
  fi
  ok "$1"
}

# A person's report over a range, as the HR sees it.
report() { call "$HR" GET "/attendance/reports/employees/$1?from=$2&to=$3"; }
# One day out of the last report.
day() { echo "$BODY" | jq -c --arg d "$1" '.days[] | select(.date == $d)'; }

echo "== setup (HR)"
call "$HR" POST /attendance/workplaces '{"name":"دفتر","lat":35.6997,"lng":51.3380,"radiusMeters":200}'
WP=$(echo "$BODY" | jq .id)
DAYS=$(jq -nc '[range(0;7) | {dayOfWeek: ., isActive: true, startTime: "08:00", endTime: "17:00"}]')
call "$HR" POST /attendance/shifts "{\"name\":\"اداری\",\"year\":$JYEAR,\"days\":$DAYS}"
SR=$(echo "$BODY" | jq .id)
call "$HR" POST /attendance/shifts "{\"name\":\"اداری با سقف\",\"year\":$JYEAR,\"dailyOvertimeCapMinutes\":75,\"days\":$DAYS}"
SRC=$(echo "$BODY" | jq .id)
[[ -n "$WP" && -n "$SR" && -n "$SRC" ]] && ok "workplace and two shifts exist" || bad "setup" "wp=$WP sr=$SR src=$SRC"

echo "== job groups carry a mode"
call "$HR" POST /attendance/job-groups '{"name":"ساعت‌دارها"}'
expect "a new group is «ساعت‌دار» by default" 201 '.attendanceMode == "tracked"'
GT=$(echo "$BODY" | jq .id)
call "$HR" POST /attendance/job-groups '{"name":"منعطف‌ها","attendanceMode":"flexible"}'
expect "a group can be created «منعطف»" 201 '.attendanceMode == "flexible"'
GF=$(echo "$BODY" | jq .id)
call "$HR" POST /attendance/job-groups '{"name":"بدون‌ثبت‌ها","attendanceMode":"untracked"}'
expect "a group can be created «بدون ثبت»" 201 '.attendanceMode == "untracked"'
GU=$(echo "$BODY" | jq .id)
call "$HR" POST /attendance/job-groups '{"name":"نامعتبر","attendanceMode":"whenever"}'
expect "an unknown mode is refused" 400
call "$EMP" GET /attendance/job-groups
expect "an employee cannot read job groups" 403

echo "== profiles follow their group, or override it"
mk() { # userId code group shift  [mode] — the code is the user's own, set when the persona was added
  call "$HR" POST /attendance/employees "{\"userId\":$1,\"workplaceId\":$WP,\"jobGroupId\":$3,\"shiftId\":$4,\"shiftStartDate\":\"$D6\",\"useGps\":false${5:+,\"attendanceMode\":\"$5\"}}"
}
mk 1 1001 "$GT" "$SR";  P1=$(echo "$BODY" | jq .id)
expect "a member of a «ساعت‌دار» group is ساعت‌دار" 201 '.attendanceMode == "tracked" and .attendanceModeOverride == null'
mk 2 1002 "$GT" "$SR";  P2=$(echo "$BODY" | jq .id)
mk 5 1005 "$GT" "$SRC"; P5=$(echo "$BODY" | jq .id)
mk 8 1008 "$GT" "$SR";  P8=$(echo "$BODY" | jq .id)
mk 9 1009 "$GT" "$SR";  P9=$(echo "$BODY" | jq .id)
mk 6 1006 "$GF" "$SR";  P6=$(echo "$BODY" | jq .id)
expect "a member of a «منعطف» group is منعطف" 201 '.attendanceMode == "flexible"'
mk 7 1007 "$GU" "$SR";  P7=$(echo "$BODY" | jq .id)
expect "a member of a «بدون ثبت» group is بدون ثبت" 201 '.attendanceMode == "untracked"'
[[ "$($PSQL "select mode from employee_mode_period_entity where employee_id=$P7")" == "untracked" ]] \
  && ok "«بدون ثبت» is in the history from the first shift day" || bad "history row" "$($PSQL 'select * from employee_mode_period_entity')"
[[ "$($PSQL "select count(*) from employee_mode_period_entity where employee_id=$P1")" == "0" ]] \
  && ok "a «ساعت‌دار» person needs no history rows" || bad "tracked history" ""
call "$HR" POST /attendance/employees "{\"userId\":3,\"workplaceId\":$WP,\"shiftId\":$SR,\"shiftStartDate\":\"$D6\",\"attendanceMode\":\"sometimes\"}"
expect "an unknown mode on a profile is refused" 400

echo "== changing a person's mode keeps the past"
call "$HR" PATCH "/attendance/employees/$P7" '{"attendanceMode":"tracked"}'
expect "HR gives نیما his own mode" 200 '.attendanceMode == "tracked" and .attendanceModeOverride == "tracked"'
[[ "$($PSQL "select start_date from employee_mode_period_entity where employee_id=$P7 and mode='tracked'")" == "$TOMORROW" ]] \
  && ok "leaving «بدون ثبت» starts tomorrow" || bad "leaving starts tomorrow" "$($PSQL 'select employee_id,mode,start_date from employee_mode_period_entity')"
call "$UNT" POST /attendance/me/check-in '{}'
expect "…so today he still can't check in" 403 '.message | contains("امروز هستم")'
call "$HR" PATCH "/attendance/employees/$P7" '{"attendanceMode":null}'
expect "null goes back to the group" 200 '.attendanceMode == "untracked" and .attendanceModeOverride == null'
[[ "$($PSQL "select count(*) from employee_mode_period_entity where employee_id=$P7")" == "1" ]] \
  && ok "…and the scheduled switch is withdrawn" || bad "switch withdrawn" "$($PSQL 'select * from employee_mode_period_entity')"

call "$HR" PATCH "/attendance/job-groups/$GF" "{\"name\":\"منعطف‌ها\",\"attendanceMode\":\"tracked\"}"
expect "HR switches the «منعطف» group to ساعت‌دار" 200 '.attendanceMode == "tracked"'
call "$FLEX" GET /attendance/me
expect "a member following the group moves with it, from today" 200 '.attendanceMode == "tracked"'
call "$HR" PATCH "/attendance/job-groups/$GF" "{\"name\":\"منعطف‌ها\",\"attendanceMode\":\"flexible\"}"
call "$FLEX" GET /attendance/me
expect "…and moves back" 200 '.attendanceMode == "flexible"'
[[ "$($PSQL "select count(*) from employee_mode_period_entity where employee_id=$P6")" == "1" ]] \
  && ok "…without leaving a redundant row behind" || bad "redundant history row" "$($PSQL "select mode,start_date from employee_mode_period_entity where employee_id=$P6")"

echo "== «منعطف»: when you arrive isn't a delay, the hours are"
call "$HR" POST "/attendance/reports/employees/$P6/attendance" "{\"date\":\"$D2\",\"checkIn\":\"10:30\",\"checkOut\":\"19:00\",\"note\":\"آزمون\"}"
expect "HR records 10:30–19:00 for the flexible person" 201
call "$HR" POST "/attendance/reports/employees/$P9/attendance" "{\"date\":\"$D2\",\"checkIn\":\"10:30\",\"checkOut\":\"19:00\",\"note\":\"آزمون\"}"
expect "…and the same for a ساعت‌دار" 201
report "$P6" "$D2" "$D2"
[[ "$(day "$D2" | jq '.delay == 0 and .early == 0 and .worked == 510 and .mode == "flexible"')" == "true" ]] \
  && ok "flexible: no delay, 8h30 worked" || bad "flexible day" "$(day "$D2")"
report "$P9" "$D2" "$D2"
[[ "$(day "$D2" | jq '.delay == 150 and .worked == 510 and .mode == "tracked"')" == "true" ]] \
  && ok "tracked: the same morning is 2h30 late" || bad "tracked day" "$(day "$D2")"
call "$FLEX" POST /attendance/me/check-in '{}'
expect "a flexible person checks in" 200 '.success == true'
call "$FLEX" POST /attendance/me/check-out '{}'
expect "…and out, with no overtime suggested" 200 '.success == true and .overtimeSuggestion == null'

echo "== «ساعت‌دار» overtime: under 30 min nothing, to 60 min recorded, over 60 min asks the approver"
corr() { call "$HR" POST "/attendance/reports/employees/$1/attendance" "{\"date\":\"$2\",\"checkIn\":\"08:00\",\"checkOut\":\"$3\",\"note\":\"آزمون\"}"; }
ot()   { call "$1" GET "/attendance/me/requests?status=all&category=overtime&limit=50"; }
corr "$P2" "$YESTERDAY" "17:20"
ot "$APR"
expect "20 minutes late: nothing" 200 '.items | length == 0'
corr "$P2" "$YESTERDAY" "17:45"
ot "$APR"
expect "45 minutes: overtime recorded, already approved" 200 '(.items | length == 1) and .items[0].autoSuggested == true and .items[0].status == "approved" and .items[0].durationMinutes == 45'
report "$P2" "$YESTERDAY" "$YESTERDAY"
[[ "$(day "$YESTERDAY" | jq '.overtime == 45')" == "true" ]] && ok "…and it counts in the report" || bad "report overtime" "$(day "$YESTERDAY")"
corr "$P2" "$YESTERDAY" "18:30"
ot "$APR"
expect "90 minutes: the same row now waits for the approver" 200 '(.items | length == 1) and .items[0].status == "pending" and .items[0].durationMinutes == 90 and .items[0].autoSuggested == true'
report "$P2" "$YESTERDAY" "$YESTERDAY"
[[ "$(day "$YESTERDAY" | jq '.overtime == 0')" == "true" ]] && ok "…and counts for nothing until approved" || bad "pending overtime" "$(day "$YESTERDAY")"
OT2=$(echo "$BODY" | jq -r '.days[] | select(.date=="'"$YESTERDAY"'") | .requests[0].id')
call "$HR" GET "/attendance/requests?status=pending&category=overtime"
expect "the approver's queue shows it, marked as automatic" 200 '.items | any(.autoSuggested == true and .employee.personnelCode == "1002")'
corr "$P2" "$YESTERDAY" "18:50"
ot "$APR"
expect "a correction moves a pending suggestion" 200 '(.items | length == 1) and .items[0].durationMinutes == 110'
call "$HR" POST "/attendance/requests/$OT2/approve"
expect "HR approves with one tap" 200 '.status == "approved"'
corr "$P2" "$YESTERDAY" "17:10"
ot "$APR"
expect "once a person decided, a later correction leaves it" 200 '(.items | length == 1) and .items[0].status == "approved"'

corr "$P8" "$YESTERDAY" "18:30"
ot "$CAN"
expect "another suggestion is waiting" 200 '(.items | length == 1) and .items[0].status == "pending"'
OT8=$(echo "$BODY" | jq -r '.items[0].id')
call "$CAN" DELETE "/attendance/me/requests/$OT8"
expect "the person declines the suggestion" 200
ot "$CAN"
expect "…it stays, as rejected, so it isn't suggested again" 200 '(.items | length == 1) and .items[0].status == "rejected"'
corr "$P8" "$YESTERDAY" "18:45"
ot "$CAN"
expect "a later correction doesn't bring it back" 200 '(.items | length == 1) and .items[0].status == "rejected"'

corr "$P1" "$YESTERDAY" "17:45"
call "$EMP" POST /attendance/me/requests "{\"type\":\"overtime\",\"date\":\"$YESTERDAY\",\"timeFrom\":\"17:00\",\"timeTo\":\"17:45\"}"
expect "a person's own overtime replaces the system's" 201 '.autoSuggested == false and .status == "pending"'
ot "$EMP"
expect "…leaving one request, theirs" 200 '(.items | length == 1) and .items[0].autoSuggested == false'
corr "$P1" "$YESTERDAY" "19:30"
ot "$EMP"
expect "…and a correction adds nothing beside it" 200 '.items | length == 1'

corr "$P5" "$YESTERDAY" "17:20"
corr "$P5" "$YESTERDAY" "20:00"
ot "$CAP"
expect "the shift's daily cap limits a suggestion (75 of 180 minutes)" 200 '(.items | length == 1) and .items[0].durationMinutes == 75'

echo "== a forgotten check-out is one tap to fix"
call "$HR" POST "/attendance/reports/employees/$P9/attendance" "{\"date\":\"$D3\",\"checkIn\":\"08:00\",\"note\":\"آزمون\"}"
expect "a check-in with no check-out, three days ago" 201
call "$LATE" GET /attendance/me
expect "the person is told which day, with the shift's end" 200 ".missingCheckOut.date == \"$D3\" and .missingCheckOut.shiftEnd == \"17:00\""
call "$LATE" POST /attendance/me/requests "{\"type\":\"manual_attendance\",\"date\":\"$D3\",\"manualTime\":\"17:00\",\"manualDirection\":\"out\"}"
expect "they file the check-out" 201
call "$LATE" GET /attendance/me
expect "…and the prompt goes away" 200 '.missingCheckOut == null'

echo "== «بدون ثبت»"
call "$UNT" POST /attendance/me/check-in '{}'
expect "check-in is refused, with the way forward" 403 '.message | contains("امروز هستم")'
call "$UNT" POST /attendance/me/check-out '{}'
expect "so is check-out" 403
call "$UNT" GET /attendance/me
expect "today starts awaited, not absent" 200 '.attendanceMode == "untracked" and .presence.declared == false and .todayStatus == "awaiting"'
call "$HR" GET /attendance/reports/board
expect "the board shows who hasn't said they're in" 200 '(.rows[] | select(.employee.personnelCode == "1007") | .status == "awaiting" and .presence == "not_declared") and .stats.notDeclared >= 1'
call "$EMP" POST /attendance/me/presence '{}'
expect "a ساعت‌دار cannot declare" 400
call "$UNT" POST /attendance/me/presence '{}'
expect "«امروز هستم»" 200 '.declared == true'
call "$UNT" POST /attendance/me/presence '{}'
expect "twice is the same as once" 200 '.declared == true'
[[ "$($PSQL "select count(*) from presence_declaration_entity where employee_id=$P7 and date='$TODAY'")" == "1" ]] \
  && ok "one row" || bad "one row" ""
call "$UNT" GET /attendance/me
expect "today is now counted by schedule" 200 '.presence.declared == true and .todayStatus == "by_schedule"'
call "$HR" GET /attendance/reports/board
expect "the board says so" 200 '.rows[] | select(.employee.personnelCode == "1007") | .status == "by_schedule" and .presence == "declared"'
call "$UNT" DELETE /attendance/me/presence
expect "it can be taken back" 200 '.declared == false'
call "$UNT" POST /attendance/me/presence '{}'
expect "…and said again" 200 '.declared == true'

echo "== «امروز هستم» is said like a check-in: from the workplace, or as remote work"
call "$UNT" DELETE /attendance/me/presence
call "$HR" PATCH "/attendance/employees/$P7" '{"useGps":true}'
expect "GPS is switched on for نیما" 200 '.useGps == true'
call "$UNT" POST /attendance/me/presence '{}'
expect "without a position it is refused, offering remote work" 200 '.success == false and .canRemote == true and .declared == false'
call "$UNT" POST /attendance/me/presence '{"lat":35.7450,"lng":51.3380}'
expect "from 5 km away too" 200 '.success == false and .canRemote == true and (.message | contains("خارج از محدوده"))'
call "$UNT" GET /attendance/me
expect "…and nothing is declared" 200 '.presence.declared == false and .todayStatus == "awaiting"'
call "$UNT" POST /attendance/me/presence '{"lat":35.7001,"lng":51.3382}'
expect "from the workplace it counts" 200 '.success == true and .declared == true and .workMode == "office"'
call "$UNT" DELETE /attendance/me/presence
call "$UNT" POST /attendance/me/presence '{"lat":35.7450,"lng":51.3380,"remote":true}'
expect "as remote work it counts too" 200 '.success == true and .workMode == "remote"'
call "$UNT" GET "/attendance/me/requests?status=all&category=remote"
expect "…and files the remote day for approval, as a remote check-in does" 200 '(.items | length == 1) and .items[0].status == "pending" and (.items[0].description | startswith("ثبت خودکار"))'
REMOTE_REQ=$(echo "$BODY" | jq -r '.items[0].id')
report "$P7" "$TODAY" "$TODAY"
[[ "$(day "$TODAY" | jq '.status == "remote_pending" and .declaredRemote == true and .worked == 0')" == "true" ]] \
  && ok "until it is approved the day is remote work awaiting approval" || bad "remote declared day" "$(day "$TODAY")"
call "$HR" GET /attendance/reports/board
expect "the board shows him working remotely" 200 '.rows[] | select(.employee.personnelCode == "1007") | .status == "remote" and .presence == "declared"'
call "$UNT" DELETE /attendance/me/presence
call "$UNT" GET "/attendance/me/requests?status=all&category=remote"
expect "taking it back takes the waiting remote request with it" 200 '.items | length == 0'
call "$UNT" POST /attendance/me/presence '{"lat":35.7450,"lng":51.3380,"remote":true}'
expect "declared as remote work again" 200 '.success == true'
call "$UNT" GET "/attendance/me/requests?status=all&category=remote"
call "$HR" POST "/attendance/requests/$(echo "$BODY" | jq -r '.items[0].id')/approve"
expect "HR approves the remote day" 200 '.status == "approved"'
report "$P7" "$TODAY" "$TODAY"
[[ "$(day "$TODAY" | jq '.status == "remote" and .remote == 540')" == "true" ]] \
  && ok "the day is then remote work, in full" || bad "approved remote day" "$(day "$TODAY")"
call "$HR" DELETE "/attendance/requests/$(echo "$BODY" | jq -r '.days[] | select(.date=="'"$TODAY"'") | .requests[0].id')"
call "$UNT" DELETE /attendance/me/presence
call "$HR" PATCH "/attendance/employees/$P7" '{"useGps":false}'
call "$UNT" POST /attendance/me/presence '{}'
expect "…and GPS off again: one tap, as before" 200 '.success == true and .workMode == "office"'

echo "== a past working day nobody declared is absent — until a reviewer confirms it"
report "$P7" "$D5" "$YESTERDAY"
[[ "$(echo "$BODY" | jq '[.days[] | select(.undeclared == true and .status == "absent")] | length')" == "5" ]] \
  && ok "five undeclared days are absent, marked as such" || bad "undeclared days" "$(echo "$BODY" | jq -c '[.days[]|{date,status,undeclared}]')"
[[ "$(echo "$BODY" | jq '.summary.undeclaredDays == 5 and .summary.absentDays == 5 and .summary.declaredDays == 0 and .summary.untrackedDays == 5')" == "true" ]] \
  && ok "the summary counts them" || bad "summary" "$(echo "$BODY" | jq -c .summary)"
[[ "$(echo "$BODY" | jq '.attendanceMode == "untracked" and .summary.requiredDays == 5 and .summary.attendedDays == 0')" == "true" ]] \
  && ok "the report is read in days: 0 of 5 working days attended" || bad "day counts" "$(echo "$BODY" | jq -c '{attendanceMode, requiredDays: .summary.requiredDays, attendedDays: .summary.attendedDays}')"
call "$HR" GET "/attendance/reports/performance?from=$D5&to=$YESTERDAY"
expect "the performance list carries the mode and the count" 200 '.items[] | select(.employee.personnelCode == "1007") | .attendanceMode == "untracked" and .summary.undeclaredDays == 5'

call "$HR" POST "/attendance/reports/employees/$P7/presence" "{\"dates\":[\"$YESTERDAY\"],\"note\":\"بود\"}"
expect "HR confirms yesterday" 201 '.confirmed == 1'
report "$P7" "$YESTERDAY" "$YESTERDAY"
[[ "$(day "$YESTERDAY" | jq '.status == "by_schedule" and .declared == true and .undeclared == false and .worked == 540')" == "true" ]] \
  && ok "yesterday is now present, by schedule" || bad "confirmed day" "$(day "$YESTERDAY")"
[[ "$($PSQL "select declared_by_id is not null and note = 'بود' from presence_declaration_entity where employee_id=$P7 and date='$YESTERDAY'")" == "t" ]] \
  && ok "who confirmed it, and why, is kept" || bad "audit" ""
call "$HR" POST "/attendance/reports/employees/$P7/presence" "{\"dates\":[\"$TOMORROW\"]}"
expect "tomorrow can't be confirmed" 409
call "$HR" POST "/attendance/reports/employees/$P1/presence" "{\"dates\":[\"$YESTERDAY\"]}"
expect "nor a day of someone who checks in" 409
call "$EMP" POST "/attendance/reports/employees/$P7/presence" "{\"dates\":[\"$D2\"]}"
expect "an employee cannot confirm" 403
call "$HR" POST "/attendance/reports/employees/$P7/presence" "{\"dates\":[\"$D2\",\"$D3\",\"$D4\",\"$D5\"]}"
expect "the rest, in one go" 201 '.confirmed == 4'
report "$P7" "$D5" "$YESTERDAY"
[[ "$(echo "$BODY" | jq '.summary.undeclaredDays == 0 and .summary.absentDays == 0 and .summary.declaredDays == 5 and .summary.attendedDays == 5 and .summary.requiredDays == 5')" == "true" ]] \
  && ok "nothing left undeclared" || bad "after confirming" "$(echo "$BODY" | jq -c .summary)"
call "$HR" DELETE "/attendance/reports/employees/$P7/presence?date=$D4"
expect "a confirmation can be taken back" 200
report "$P7" "$D4" "$D4"
[[ "$(day "$D4" | jq '.status == "absent" and .undeclared == true')" == "true" ]] && ok "…and the day is absent again" || bad "revoked" "$(day "$D4")"

echo "== leave, a mission or times on file settle a day without a declaration"
call "$HR" POST "/attendance/reports/employees/$P7/grants" "{\"type\":\"leave_entitled_daily\",\"dateFrom\":\"$D4\",\"dateTo\":\"$D4\"}"
expect "HR grants a day of leave" 201
report "$P7" "$D4" "$D4"
[[ "$(day "$D4" | jq '.status == "on_leave" and .undeclared == false')" == "true" ]] && ok "the day is leave, not absence" || bad "leave day" "$(day "$D4")"
call "$HR" POST "/attendance/reports/employees/$P7/presence" "{\"dates\":[\"$D4\"]}"
expect "a day of leave can't be confirmed as presence" 409
call "$HR" POST "/attendance/reports/employees/$P7/grants" "{\"type\":\"leave_entitled_daily\",\"dateFrom\":\"$TODAY\",\"dateTo\":\"$TODAY\"}"
expect "HR grants leave for today" 201
call "$UNT" POST /attendance/me/presence '{}'
expect "…today can't be declared any more" 400
call "$UNT" GET /attendance/me
expect "…the day reads as leave" 200 '.todayStatus == "on_leave"'

echo "== team approvers confirm for their own team only"
call "$HR" PATCH "/attendance/job-groups/$GU" "{\"name\":\"بدون‌ثبت‌ها\",\"approverIds\":[2]}"
expect "رضا becomes the approver of the group" 200
call "$HR" DELETE "/attendance/reports/employees/$P7/presence?date=$D3"
call "$APR" POST "/attendance/team/members/$P7/presence" "{\"dates\":[\"$D3\"]}"
expect "he confirms a day for his member" 201 '.confirmed == 1'
call "$EMP" POST "/attendance/team/members/$P7/presence" "{\"dates\":[\"$D2\"]}"
expect "someone who isn't an approver cannot" 403
call "$APR" POST "/attendance/team/members/$P6/presence" "{\"dates\":[\"$D2\"]}"
expect "…and he cannot for someone outside his team" 404

echo "== times a reviewer records count as presence"
call "$HR" DELETE "/attendance/reports/employees/$P7/presence?date=$D2"
call "$HR" POST "/attendance/reports/employees/$P7/attendance" "{\"date\":\"$D2\",\"checkIn\":\"09:00\",\"checkOut\":\"17:00\",\"note\":\"آزمون\"}"
expect "HR records times for a day he hadn't declared" 201
report "$P7" "$D2" "$D2"
[[ "$(day "$D2" | jq '.status == "present" and .undeclared == false')" == "true" ]] && ok "the day is present, not undeclared" || bad "recorded day" "$(day "$D2")"

echo "== the board counts leave, missions and remote days — before anyone checks in"
call "$CAP" POST /attendance/me/requests "{\"type\":\"mission_daily\",\"dateFrom\":\"$TODAY\",\"dateTo\":\"$TODAY\"}"
expect "a mission for today is filed" 201
MISSION=$(echo "$BODY" | jq .id)
call "$HR" POST "/attendance/requests/$MISSION/approve"
expect "…and approved" 200
call "$HR" POST "/attendance/reports/employees/$P9/grants" "{\"type\":\"remote_daily\",\"dateFrom\":\"$TODAY\",\"dateTo\":\"$TODAY\"}"
expect "HR grants a remote day for today" 201
call "$HR" POST "/attendance/reports/employees/$P8/grants" "{\"type\":\"leave_entitled_daily\",\"dateFrom\":\"$TODAY\",\"dateTo\":\"$TODAY\"}"
expect "HR grants a day of leave for today" 201
call "$HR" GET /attendance/reports/board
expect "the board lists each by what they are doing" 200 '
  (.rows[] | select(.employee.personnelCode == "1005") | .status == "mission") and
  (.rows[] | select(.employee.personnelCode == "1009") | .status == "remote") and
  (.rows[] | select(.employee.personnelCode == "1008") | .status == "on_leave")'
expect "…and counts them" 200 '.stats.mission >= 1 and .stats.remote >= 1 and .stats.onLeave >= 2'

call "$UNT" POST /attendance/me/requests "{\"type\":\"leave_entitled_daily\",\"dateFrom\":\"$TOMORROW\",\"dateTo\":\"$TOMORROW\"}"
expect "نیما files a leave request for tomorrow" 201
LEAVE_REQ=$(echo "$BODY" | jq .id)
call "$APR" GET /attendance/team/board
expect "his approver's team board shows it to handle in place" 200 ".stats.pending >= 1 and (.pendingRequests | any(.id == $LEAVE_REQ))"
call "$APR" POST "/attendance/team/requests/$LEAVE_REQ/approve"
expect "…and he approves it from there" 200 '.status == "approved"'
call "$APR" GET /attendance/team/board
expect "…after which it is no longer pending" 200 "(.pendingRequests | any(.id == $LEAVE_REQ) | not)"

echo "== exports and maintenance know the modes"
CSV=$(curl -s "$API/attendance/reports/performance/export" -H "Authorization: Bearer $HR")
[[ "$CSV" == *"نوع حضور"* && "$CSV" == *"بدون ثبت"* ]] && ok "performance CSV has the mode" || bad "performance CSV" "${CSV:0:200}"
CSV=$(curl -s "$API/attendance/reports/employees/$P7/export?from=$D5&to=$YESTERDAY" -H "Authorization: Bearer $HR")
[[ "$CSV" == *"اعلام حضور"* && "$CSV" == *"روز"* && "$CSV" != *"منبع ورود"* ]] \
  && ok "the person's CSV is in days: a declaration column, no check-in/out times" || bad "personal CSV" "${CSV:0:300}"
call "$ADM" GET /attendance/maintenance
expect "maintenance counts the new tables" 200 '.counts | has("presenceDeclarations") and has("employeeModes")'

echo "== a reset keeps the mode history, a records reset clears the declarations"
call "$ADM" POST /attendance/maintenance/reset '{"scope":"records","confirm":"پاکسازی"}'
expect "records reset" 200
[[ "$($PSQL 'select count(*) from presence_declaration_entity')" == "0" ]] && ok "declarations are gone" || bad "declarations" ""
[[ "$($PSQL "select count(*) from employee_mode_period_entity where employee_id=$P7")" == "1" ]] && ok "the mode history stays with the profiles" || bad "history" ""

echo
echo "passed: $PASS  failed: $FAIL"
[[ $FAIL -eq 0 ]]
