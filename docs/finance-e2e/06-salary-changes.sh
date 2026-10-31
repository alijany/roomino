set -u
# Salary history — append-only changes per person, identity facts on the user,
# and the group raise. Needs its own fresh database and the five seeded users.
API=${API:-http://127.0.0.1:4000/api/v1}; TOK=${TOK:-/var/tmp}
EMP=$(cat $TOK/t_emp); FIN=$(cat $TOK/t_fin); ADM=$(cat $TOK/t_adm)
j(){ curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
code(){ curl -s -o /dev/null -w "%{http_code}" -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
g(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }
PASS=0; FAIL=0
n(){ python3 -c "import sys,json;print(len(json.load(sys.stdin)['items']))"; }
chk(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; PASS=$((PASS+1)); else echo "  ✗ $1 — got '$2', want '$3'"; FAIL=$((FAIL+1)); fi; }

echo "1. admin only"
chk "an employee cannot read"            "$(code GET /finance/salary-changes "$EMP")" "403"
chk "finance cannot read"                "$(code GET '/finance/salary-changes/overview?period=140507' "$FIN")" "403"
chk "finance cannot write"               "$(code POST /finance/salary-changes "$FIN" '{"userId":1,"period":140501,"salary":100}')" "403"

echo "2. identity facts on the user"
chk "an admin sets them"                 "$(code PATCH /users/1 "$ADM" '{"firstName":"کارمند","hireDate":"2023-03-21","insuranceNumber":"۱۲۳۴۵۶۷","sheba":"ir062960000000100324200001","email":"a@b.ir"}')" "200"
U=$(j GET /users/1 "$ADM")
chk "  hire date kept"                   "$(echo "$U"|g "['hireDate']")" "2023-03-21"
chk "  insurance number in Latin digits" "$(echo "$U"|g "['insuranceNumber']")" "1234567"
chk "  sheba upper-cased"                "$(echo "$U"|g "['sheba']")" "IR062960000000100324200001"
chk "an end date before the start is refused" "$(code PATCH /users/1 "$ADM" '{"firstName":"کارمند","endDate":"2022-01-01"}')" "400"
chk "a bad sheba is refused"             "$(code PATCH /users/1 "$ADM" '{"firstName":"کارمند","sheba":"IR123"}')" "400"
chk "a bad email is refused"             "$(code PATCH /users/1 "$ADM" '{"firstName":"کارمند","email":"nope"}')" "400"
chk "an empty value clears a field"      "$(j PATCH /users/1 "$ADM" '{"firstName":"کارمند","email":""}'|g "['email']")" "None"

echo "3. recording a change"
chk "the first entry is a start"         "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140201,"salary":120000000}')" "201"
chk "a percent needs a salary to start from" "$(code POST /finance/salary-changes "$ADM" '{"userId":2,"period":140201,"percent":10}')" "400"
chk "salary and percent together are refused" "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140301,"salary":1,"percent":5}')" "400"
chk "neither is refused"                 "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140301}')" "400"
chk "an invalid month is refused"        "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140313,"salary":5}')" "400"
chk "a raise by percent"                 "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140301,"percent":25,"note":"افزایش سالانه"}')" "201"
chk "a change not after the latest is refused" "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140301,"salary":999}')" "409"
chk "  nor one before it"                "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140205,"salary":999}')" "409"
chk "the same salary is refused"         "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140401,"salary":150000000}')" "400"
chk "a decrease by salary"               "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140501,"salary":140000000}')" "201"
chk "a percent rounded to a step"        "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140507,"percent":7.5,"roundTo":100000}')" "201"

L=$(j GET /finance/salary-changes "$ADM")
chk "the list is newest first"           "$(echo "$L"|g "['items'][0]['period']")" "140507"
chk "  rounded 140,000,000 × 1.075"      "$(echo "$L"|g "['items'][0]['salary']")" "150500000"
chk "  with the previous one"            "$(echo "$L"|g "['items'][0]['previous']")" "140000000"
chk "  and the percent"                  "$(echo "$L"|g "['items'][0]['percent']")" "7.5"
chk "types follow the comparison"        "$(echo "$L"|python3 -c "import sys,json;print(','.join(i['type'] for i in reversed(json.load(sys.stdin)['items'])))")" "start,raise,decrease,raise"
chk "the first has no previous"          "$(echo "$L"|g "['items'][-1]['previous']")" "None"
chk "the 25% raise is exact"             "$(echo "$L"|g "['items'][-2]['salary']")" "150000000"
chk "the note is kept"                   "$(echo "$L"|g "['items'][-2]['note']")" "افزایش سالانه"
chk "filter by text"                     "$(j GET '/finance/salary-changes?text=zzz' "$ADM"|g "['items']")" "[]"
chk "filter by type"                     "$(j GET '/finance/salary-changes?type=decrease' "$ADM"|n)" "1"

echo "4. who earns what, in a month"
O=$(j GET '/finance/salary-changes/overview?period=140401' "$ADM")
chk "the salary that applied in 1404/01" "$(echo "$O"|python3 -c "import sys,json;print(next(i for i in json.load(sys.stdin)['items'] if i['user']['id']==1)['salary'])")" "150000000"
chk "  a month before any entry has none" "$(j GET '/finance/salary-changes/overview?period=140101' "$ADM"|python3 -c "import sys,json;print(next(i for i in json.load(sys.stdin)['items'] if i['user']['id']==1)['salary'])")" "None"
chk "everyone is listed"                 "$(echo "$O"|n)" "5"

echo "5. group raise"
chk "a start for user 2"                 "$(code POST /finance/salary-changes "$ADM" '{"userId":2,"period":140401,"salary":100000000}')" "201"
chk "a start for user 3"                 "$(code POST /finance/salary-changes "$ADM" '{"userId":3,"period":140401,"salary":80000000}')" "201"
chk "a person with no salary stops the whole raise" "$(code POST /finance/salary-changes/bulk "$ADM" '{"userIds":[2,3,5],"period":140601,"percent":10}')" "400"
chk "  and nobody got it"                "$(j GET '/finance/salary-changes?userId=2' "$ADM"|n)" "1"
chk "a person changed later stops it too" "$(code POST /finance/salary-changes/bulk "$ADM" '{"userIds":[1,2],"period":140503,"percent":10}')" "400"
chk "raise two people by 10%"            "$(j POST /finance/salary-changes/bulk "$ADM" '{"userIds":[2,3],"period":140601,"percent":10,"roundTo":10000,"note":"افزایش ۱۴۰۶"}'|g "['created']")" "2"
chk "  user 2 now earns 110,000,000"     "$(j GET '/finance/salary-changes?userId=2' "$ADM"|g "['items'][0]['salary']")" "110000000"
chk "  user 3 now earns 88,000,000"      "$(j GET '/finance/salary-changes?userId=3' "$ADM"|g "['items'][0]['salary']")" "88000000"
chk "  recorded as raises"               "$(j GET '/finance/salary-changes?userId=3' "$ADM"|g "['items'][0]['type']")" "raise"

echo "6. deleting"
ID_FIRST=$(echo "$L"|g "['items'][-1]['id']")
chk "only the latest change can go"      "$(code DELETE /finance/salary-changes/$ID_FIRST "$ADM")" "409"
ID_LAST=$(j GET '/finance/salary-changes?userId=3' "$ADM"|g "['items'][0]['id']")
chk "the latest one can"                 "$(code DELETE /finance/salary-changes/$ID_LAST "$ADM")" "200"
chk "  and the previous becomes current" "$(j GET '/finance/salary-changes?userId=3' "$ADM"|g "['items'][0]['salary']")" "80000000"
chk "a person with a salary history cannot be deleted" "$(code DELETE /users/2 "$ADM")" "409"

echo "7. proposals"
chk "propose 12% for user 1 from 1406/01" "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140601,"percent":12,"roundTo":100000,"propose":true}')" "201"
chk "a second open proposal is refused"   "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140602,"salary":1,"propose":true}')" "409"
chk "a confirmed change in the same month is refused" "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140601,"salary":160000000}')" "409"
chk "the proposal changes no salary"      "$(j GET '/finance/salary-changes/overview?period=140612' "$ADM"|python3 -c "import sys,json;print(next(i for i in json.load(sys.stdin)['items'] if i['user']['id']==1)['salary'])")" "150500000"
P=$(j GET '/finance/salary-changes?status=proposed' "$ADM")
chk "it is listed as proposed, without a type" "$(echo "$P"|g "['items'][0]['status']")|$(echo "$P"|g "['items'][0]['type']")" "proposed|None"
chk "  priced from the confirmed salary"  "$(echo "$P"|g "['items'][0]['salary']")" "168600000"
chk "  and not the latest confirmed"      "$(echo "$P"|g "['items'][0]['isLatest']")" "False"
PID=$(echo "$P"|g "['items'][0]['id']")
chk "a proposal is edited by percent"     "$(code PATCH /finance/salary-changes/$PID "$ADM" '{"percent":10,"roundTo":100000}')" "200"
chk "  and now reads 165,600,000"         "$(j GET '/finance/salary-changes?status=proposed' "$ADM"|g "['items'][0]['salary']")" "165600000"
chk "  a salary equal to the current is refused" "$(code PATCH /finance/salary-changes/$PID "$ADM" '{"salary":150500000}')" "400"
chk "a confirmed change cannot be edited" "$(code PATCH /finance/salary-changes/$(echo "$L"|g "['items'][0]['id']") "$ADM" '{"salary":1}')" "409"
chk "confirm it"                          "$(j POST /finance/salary-changes/confirm "$ADM" "{\"ids\":[$PID]}"|g "['confirmed']")" "1"
chk "  it is now a raise"                 "$(j GET '/finance/salary-changes?userId=1&onlyLatest=true' "$ADM"|g "['items'][0]['type']")" "raise"
chk "  and the salary of 1406/01 follows" "$(j GET '/finance/salary-changes/overview?period=140601' "$ADM"|python3 -c "import sys,json;print(next(i for i in json.load(sys.stdin)['items'] if i['user']['id']==1)['salary'])")" "165600000"
chk "confirming again finds nothing"      "$(code POST /finance/salary-changes/confirm "$ADM" "{\"ids\":[$PID]}")" "404"

echo "8. group proposals"
chk "propose 5% for users 2 and 3"        "$(j POST /finance/salary-changes/bulk "$ADM" '{"userIds":[2,3],"period":140701,"percent":5,"roundTo":10000,"propose":true}'|g "['created']")" "2"
chk "a second batch is refused for them"  "$(code POST /finance/salary-changes/bulk "$ADM" '{"userIds":[2,3],"period":140701,"percent":5,"propose":true}')" "400"
IDS=$(j GET '/finance/salary-changes?status=proposed' "$ADM"|python3 -c "import sys,json;print(','.join(str(i['id']) for i in json.load(sys.stdin)['items']))")
chk "confirm both together"               "$(j POST /finance/salary-changes/confirm "$ADM" "{\"ids\":[$IDS]}"|g "['confirmed']")" "2"
chk "  user 2 earns 115,500,000"          "$(j GET '/finance/salary-changes?userId=2&onlyLatest=true' "$ADM"|g "['items'][0]['salary']")" "115500000"

echo "9. a proposal that has gone stale"
chk "propose for user 2 from 1408/01"     "$(code POST /finance/salary-changes "$ADM" '{"userId":2,"period":140801,"salary":130000000,"propose":true}')" "201"
chk "a confirmed change lands after it"   "$(code POST /finance/salary-changes "$ADM" '{"userId":2,"period":140803,"salary":125000000}')" "201"
SID=$(j GET '/finance/salary-changes?status=proposed' "$ADM"|g "['items'][0]['id']")
chk "confirming the stale proposal is refused" "$(code POST /finance/salary-changes/confirm "$ADM" "{\"ids\":[$SID]}")" "400"
chk "a proposal can be deleted, though not the latest" "$(code DELETE /finance/salary-changes/$SID "$ADM")" "200"
chk "  and nothing proposed is left"      "$(j GET '/finance/salary-changes?status=proposed' "$ADM"|n)" "0"

echo; echo "passed: $PASS  failed: $FAIL"; [ "$FAIL" = 0 ]
