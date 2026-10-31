set -u
# Monthly payroll — generating a month from the people, their salaries and the
# year's parameters, entering inputs, recomputing, and finalising. Needs its
# own fresh database and the five seeded users.
API=${API:-http://127.0.0.1:4000/api/v1}; TOK=${TOK:-/var/tmp}
EMP=$(cat $TOK/t_emp); FIN=$(cat $TOK/t_fin); ADM=$(cat $TOK/t_adm)
j(){ curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
code(){ curl -s -o /dev/null -w "%{http_code}" -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
g(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }
# a field of one person's line in a month view
line(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(next(i for i in d['items'] if i['user']['id']==int(sys.argv[1]))[sys.argv[2]])" "$1" "$2"; }
PASS=0; FAIL=0
chk(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; PASS=$((PASS+1)); else echo "  ✗ $1 — got '$2', want '$3'"; FAIL=$((FAIL+1)); fi; }
# within a few rial (the sheet works in toman)
near(){ python3 -c "import sys;sys.exit(0 if abs(float('$2')-float('$3'))<=${4:-10} else 1)" 2>/dev/null && { echo "  ✓ $1"; PASS=$((PASS+1)); } || { echo "  ✗ $1 — got '$2', want ≈'$3'"; FAIL=$((FAIL+1)); }; }

echo "1. admin only"
chk "an employee cannot read a month"      "$(code GET /finance/payroll/140507 "$EMP")" "403"
chk "finance cannot generate"              "$(code POST /finance/payroll/140507/generate "$FIN")" "403"

echo "2. what a month needs"
chk "no parameters for the year yet"       "$(code POST /finance/payroll/140507/generate "$ADM")" "400"
chk "an invalid month is refused"          "$(code GET /finance/payroll/140513 "$ADM")" "400"
chk "save the 1405 parameters"             "$(code POST /finance/payroll-settings/1405 "$ADM" '{}')" "201"
chk "nobody has a salary, so nobody to pay" "$(j POST /finance/payroll/140507/generate "$ADM"|g "['created']")" "0"

chk "user 1: hired on 1402/01/01"          "$(code PATCH /users/1 "$ADM" '{"firstName":"کارمند","hireDate":"2023-03-21"}')" "200"
chk "user 2: hired on 1402/01/01"          "$(code PATCH /users/2 "$ADM" '{"firstName":"تأییدکننده","hireDate":"2023-03-21"}')" "200"
chk "user 3: hired on 1405/04/01"          "$(code PATCH /users/3 "$ADM" '{"firstName":"مالی","hireDate":"2026-06-22"}')" "200"
chk "user 5: left on 1405/05/30"           "$(code PATCH /users/5 "$ADM" '{"firstName":"کارمند","hireDate":"2023-03-21","endDate":"2026-08-21"}')" "200"
chk "salary for user 1 (33,000,000 toman)" "$(code POST /finance/salary-changes "$ADM" '{"userId":1,"period":140201,"salary":330000000}')" "201"
chk "salary for user 2 (80,000,000 toman)" "$(code POST /finance/salary-changes "$ADM" '{"userId":2,"period":140201,"salary":800000000}')" "201"
chk "salary for user 3 (28,000,000 toman)" "$(code POST /finance/salary-changes "$ADM" '{"userId":3,"period":140504,"salary":280000000}')" "201"
chk "salary for user 5, who has left"      "$(code POST /finance/salary-changes "$ADM" '{"userId":5,"period":140201,"salary":300000000}')" "201"
chk "a proposal does not count"            "$(code POST /finance/salary-changes "$ADM" '{"userId":4,"period":140201,"salary":500000000,"propose":true}')" "201"

echo "3. generating a month"
R=$(j POST /finance/payroll/140507/generate "$ADM")
chk "three people work in 1405/07"         "$(echo "$R"|g "['created']")" "3"
chk "generating again adds nobody"         "$(j POST /finance/payroll/140507/generate "$ADM"|g "['created']")" "0"
V=$(j GET /finance/payroll/140507 "$ADM")
chk "the month is a draft"                 "$(echo "$V"|g "['status']")" "draft"
chk "  with three lines"                   "$(echo "$V"|g "['totals']['count']")" "3"
chk "  and nobody missing"                 "$(echo "$V"|g "['missing']")" "0"
chk "start 1403 from 1405's parameters"    "$(code POST /finance/payroll-settings/1403 "$ADM" '{"copyFrom":1405}')" "201"
chk "an earlier month leaves out who was not hired yet" "$(j POST /finance/payroll/140503/generate "$ADM"|g "['created']")" "3"

echo "4. the figures (as in the sheet)"
near "user 1: housing 3,000,000 toman"     "$(echo "$V"|line 1 housing)" "30000000" 0
near "  seniority for 3 years"             "$(echo "$V"|line 1 seniority)" "15000300" 1
near "  gross 39,700,030 toman"            "$(echo "$V"|line 1 gross)" "397000300" 10
near "  worker insurance 7%"               "$(echo "$V"|line 1 workerInsurance)" "26250021" 10
chk "  no tax under the exemption"         "$(echo "$V"|line 1 tax)" "0"
near "  net"                               "$(echo "$V"|line 1 net)" "370750279" 10
near "  employer insurance 23%"            "$(echo "$V"|line 1 employerInsurance)" "86250069" 10
near "  eidi and severance accrual"        "$(echo "$V"|line 1 accrual)" "70313900" 20
near "user 2: gross 86,700,030 toman"      "$(echo "$V"|line 2 gross)" "867000300" 10
near "  tax by the brackets"               "$(echo "$V"|line 2 tax)" "47515043" 20
near "  net"                               "$(echo "$V"|line 2 net)" "760335229" 30
chk "user 3, hired in 1405, has no seniority" "$(echo "$V"|line 3 seniority)" "0"
chk "user 5, who left in 1405/05, has no line" "$(echo "$V"|python3 -c "import sys,json;print(any(i['user']['id']==5 for i in json.load(sys.stdin)['items']))")" "False"
chk "users with no hire date get a warning" "$(j PATCH /users/3 "$ADM" '{"firstName":"مالی","hireDate":""}' >/dev/null; j POST /finance/payroll/140507/recalculate "$ADM" >/dev/null; j GET /finance/payroll/140507 "$ADM"|line 3 warnings)" "['تاریخ شروع همکاری ثبت نشده؛ سنوات صفر حساب شد']"
j PATCH /users/3 "$ADM" '{"firstName":"مالی","hireDate":"2026-06-22"}' >/dev/null

echo "5. entering a month's inputs"
L1=$(echo "$V"|line 1 id)
R=$(j PATCH /finance/payroll/lines/$L1 "$ADM" '{"overtimeHours":10,"bonus":50000000,"advance":10000000}')
near "overtime: 10 h at 1.4× the hourly wage" "$(echo "$R"|g "['overtime']")" "21000000" 1
chk "  bonus is kept"                      "$(echo "$R"|g "['bonus']")" "50000000"
near "  gross grew by both"                "$(echo "$R"|g "['gross']")" "468000300" 10
chk "  the advance is taken off"           "$(python3 -c "print(int(float('$(echo "$R"|g "['totalDeductions']")') - float('$(echo "$R"|g "['workerInsurance']")') - float('$(echo "$R"|g "['tax']")')))")" "10000000"
chk "days worked prorate the month"        "$(j PATCH /finance/payroll/lines/$L1 "$ADM" '{"days":15}'|g "['base']")" "165000000"
chk "negative hours are refused"           "$(code PATCH /finance/payroll/lines/$L1 "$ADM" '{"overtimeHours":-1}')" "400"
chk "Persian digits are accepted"          "$(j PATCH /finance/payroll/lines/$L1 "$ADM" '{"days":"۳۰"}'|g "['days']")" "30"
chk "an unknown line is 404"               "$(code PATCH /finance/payroll/lines/99999 "$ADM" '{"days":1}')" "404"

echo "6. recalculating after the parameters change"
chk "raise housing to 4,000,000 toman"     "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"housing":40000000}}')" "200"
chk "the draft is stale until recalculated" "$(j GET /finance/payroll/140507 "$ADM"|line 2 housing)" "30000000"
chk "recalculate"                          "$(j POST /finance/payroll/140507/recalculate "$ADM"|g "['recalculated']")" "3"
chk "  and housing follows"                "$(j GET /finance/payroll/140507 "$ADM"|line 2 housing)" "40000000"

echo "6b. finalising one person"
L2=$(j GET /finance/payroll/140507 "$ADM"|line 2 id)
chk "finalise only user 2's line"          "$(j POST /finance/payroll/lines/$L2/finalize "$ADM"|g "['status']")" "final"
V2=$(j GET /finance/payroll/140507 "$ADM")
chk "  the month is still a draft"         "$(echo "$V2"|g "['status']")" "draft"
chk "  with two drafts left"               "$(echo "$V2"|g "['drafts']")" "2"
chk "  that line can no longer be edited"  "$(code PATCH /finance/payroll/lines/$L2 "$ADM" '{"days":10}')" "409"
chk "  nor finalised twice"                "$(code POST /finance/payroll/lines/$L2/finalize "$ADM")" "409"
chk "  and a recalculation skips it"       "$(j POST /finance/payroll/140507/recalculate "$ADM"|g "['recalculated']")" "2"
chk "an unknown line is 404"               "$(code POST /finance/payroll/lines/99999/finalize "$ADM")" "404"

echo "7. finalising"
chk "finalise the rest of the month"       "$(j POST /finance/payroll/140507/finalize "$ADM"|g "['finalized']")" "2"
chk "  it reads as final"                  "$(j GET /finance/payroll/140507 "$ADM"|g "['status']")" "final"
chk "  nothing is left to finalise"        "$(code POST /finance/payroll/140507/finalize "$ADM")" "400"
chk "a final line cannot be edited"        "$(code PATCH /finance/payroll/lines/$L1 "$ADM" '{"days":10}')" "409"
chk "  nor deleted"                        "$(code DELETE /finance/payroll/lines/$L1 "$ADM")" "409"
chk "change the parameters again"          "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"housing":50000000}}')" "200"
chk "  a recalculation leaves a final month alone" "$(j POST /finance/payroll/140507/recalculate "$ADM"|g "['recalculated']")" "0"
chk "  its housing is still 4,000,000"     "$(j GET /finance/payroll/140507 "$ADM"|line 2 housing)" "40000000"
chk "a person with payroll cannot be deleted" "$(code DELETE /users/1 "$ADM")" "409"

echo "8. a draft line can be removed"
chk "the earlier month has three drafts"   "$(j GET /finance/payroll/140503 "$ADM"|g "['drafts']")" "3"
D=$(j GET /finance/payroll/140503 "$ADM"|line 1 id)
chk "delete one"                           "$(code DELETE /finance/payroll/lines/$D "$ADM")" "200"
chk "  and it can be generated again"      "$(j POST /finance/payroll/140503/generate "$ADM"|g "['created']")" "1"

echo "9. hybrid salaries"
chk "user 1: hybrid"                       "$(code PATCH /users/1 "$ADM" '{"firstName":"کارمند","salaryMode":"hybrid"}')" "200"
chk "an unknown mode is refused"           "$(code PATCH /users/1 "$ADM" '{"firstName":"کارمند","salaryMode":"mixed"}')" "400"
chk "user 3: hybrid too"                   "$(code PATCH /users/3 "$ADM" '{"firstName":"مالی","salaryMode":"hybrid"}')" "200"
chk "month 1405/08 for three people"       "$(j POST /finance/payroll/140508/generate "$ADM"|g "['created']")" "3"
H=$(j GET /finance/payroll/140508 "$ADM")
MIN=$(j GET /finance/payroll-settings/1405 "$ADM"|python3 -c "import sys,json;print(next(i for i in json.load(sys.stdin)['items'] if i['key']=='minMonthly')['value'])")
chk "user 1: the minimum wage goes through the rules" "$(echo "$H"|line 1 base)" "$MIN"
chk "  extras = agreed − the legal package"  "$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);i=next(x for x in d['items'] if x['user']['id']==1);print(i['agreed']-(i['base']+i['housing']+i['bon']+i['marriage']+i['child']+i['seniority'])==i['extras'] and i['extras']>0)" "$H")" "True"
chk "  the whole agreed salary is paid, less the worker's insurance" "$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);i=next(x for x in d['items'] if x['user']['id']==1);print(i['net']==i['agreed']-i['workerInsurance']-i['tax'])" "$H")" "True"
chk "  take-home = the legal net + extras" "$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);i=next(x for x in d['items'] if x['user']['id']==1);print(i['net']-i['extras']==i['gross']-i['totalDeductions'])" "$H")" "True"
chk "  extras bear no insurance"           "$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);i=next(x for x in d['items'] if x['user']['id']==1);print(abs(i['workerInsurance']*100-7*(i['base']+i['housing']+i['seniority']))<=700)" "$H")" "True"
chk "  the total agreed stays on the line" "$(echo "$H"|line 1 agreed)" "330000000"
chk "user 2, an ordinary salary, has none" "$(echo "$H"|line 2 extras)" "0"
chk "user 3 (hybrid) has extras too"       "$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);i=next(x for x in d['items'] if x['user']['id']==3);print(i['extras']>0 and i['agreed']-(i['base']+i['housing']+i['bon']+i['marriage']+i['child']+i['seniority'])==i['extras'])" "$H")" "True"
chk "a salary under the minimum is ordinary" "$(code POST /finance/salary-changes "$ADM" '{"userId":3,"period":140509,"salary":150000000}')" "201"
chk "  (month 1405/09)"                    "$(j POST /finance/payroll/140509/generate "$ADM"|g "['created']")" "3"
chk "  has no extras"                      "$(j GET /finance/payroll/140509 "$ADM"|line 3 extras)" "0"
chk "  and the whole salary is the base"   "$(j GET /finance/payroll/140509 "$ADM"|line 3 base)" "150000000"
chk "an agreed salary below the legal package gets no extras" "$(code POST /finance/salary-changes "$ADM" '{"userId":3,"period":140510,"salary":200000000}')" "201"
chk "  (month 1405/10)"                    "$(j POST /finance/payroll/140510/generate "$ADM"|g "['created']")" "3"
chk "  no extras, only the package"        "$(j GET /finance/payroll/140510 "$ADM"|line 3 extras)" "0"
chk "  still on the minimum wage"          "$(j GET /finance/payroll/140510 "$ADM"|line 3 base)" "$MIN"

echo "9b. hybrid with a net agreement"
chk "user 1: net agreement"                "$(code PATCH /users/1 "$ADM" '{"firstName":"کارمند","agreementType":"net"}')" "200"
chk "month 1405/11"                        "$(j POST /finance/payroll/140511/generate "$ADM"|g "['created']")" "3"
N=$(j GET /finance/payroll/140511 "$ADM")
chk "the take-home is exactly the agreed salary" "$(echo "$N"|line 1 net)" "330000000"
chk "  the package still goes through the rules" "$(echo "$N"|line 1 base)" "$MIN"
chk "  and the extras make up the rest"    "$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);i=next(x for x in d['items'] if x['user']['id']==1);print(i['extras']==i['agreed']-(i['gross']-i['workerInsurance']-i['tax']) and i['extras']>0)" "$N")" "True"

echo "10. the payslip's data"
PS=$(j GET /finance/payroll/lines/$L1 "$ADM")
chk "an employee cannot read a line"        "$(code GET /finance/payroll/lines/$L1 "$EMP")" "403"
chk "the line comes with the person's identity" "$(echo "$PS"|g "['identity']['hireDate']")" "2023-03-21"
chk "  and the figures of the month"        "$(echo "$PS"|g "['period']")" "140507"
chk "  an unknown line is 404"              "$(code GET /finance/payroll/lines/99999 "$ADM")" "404"

echo "11. opening a final month again"
chk "the month 1405/07 is final"           "$(j GET /finance/payroll/140507 "$ADM"|g "['status']")" "final"
chk "a reason is required"                 "$(code POST /finance/payroll/lines/$L1/reopen "$ADM" '{}')" "400"
chk "an employee cannot reopen"            "$(code POST /finance/payroll/lines/$L1/reopen "$EMP" '{"reason":"x"}')" "403"
chk "reopen user 1's line with a reason"   "$(j POST /finance/payroll/lines/$L1/reopen "$ADM" '{"reason":"مساعده فراموش شده بود"}'|g "['status']")" "draft"
chk "  the reason and time are kept"       "$(j GET /finance/payroll/lines/$L1 "$ADM"|g "['revisions'][0]['reason']")" "مساعده فراموش شده بود"
chk "  with who did it"                    "$(j GET /finance/payroll/lines/$L1 "$ADM"|python3 -c "import sys,json;print(bool(json.load(sys.stdin)['revisions'][0]['at']))")" "True"
chk "  the other lines stay final"         "$(j GET /finance/payroll/140507 "$ADM"|g "['drafts']")" "1"
chk "  the line can be corrected"          "$(j PATCH /finance/payroll/lines/$L1 "$ADM" '{"advance":5000000}'|g "['advance']")" "5000000"
chk "  and finalised again"                "$(j POST /finance/payroll/lines/$L1/finalize "$ADM"|g "['status']")" "final"
chk "  it remembers the revision"          "$(j GET /finance/payroll/lines/$L1 "$ADM"|python3 -c "import sys,json;print(len(json.load(sys.stdin)['revisions']))")" "1"
chk "  a changed figure makes it revised"   "$(j GET /finance/payroll/lines/$L1 "$ADM"|g "['revised']")" "True"
chk "  and the revision says it changed"    "$(j GET /finance/payroll/lines/$L1 "$ADM"|g "['revisions'][0]['changed']")" "True"
L2R=$(j GET /finance/payroll/140507 "$ADM"|line 2 id)
chk "reopen user 2's line and change nothing" "$(code POST /finance/payroll/lines/$L2R/reopen "$ADM" '{"reason":"بررسی"}')" "201"
chk "  while open it is not revised yet"    "$(j GET /finance/payroll/lines/$L2R "$ADM"|g "['revised']")" "False"
chk "  finalise it again, untouched"        "$(j POST /finance/payroll/lines/$L2R/finalize "$ADM"|g "['status']")" "final"
chk "  nothing changed, so it is not revised" "$(j GET /finance/payroll/lines/$L2R "$ADM"|g "['revised']")" "False"
chk "  but the history still has the reopening" "$(j GET /finance/payroll/lines/$L2R "$ADM"|python3 -c "import sys,json;d=json.load(sys.stdin)['revisions'];print(len(d), d[0]['changed'])")" "1 False"
chk "put housing back to what the month was computed with" "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"housing":40000000}}')" "200"
chk "change a figure and put it back"      "$(j POST /finance/payroll/lines/$L2R/reopen "$ADM" '{"reason":"آزمون"}' >/dev/null; j PATCH /finance/payroll/lines/$L2R "$ADM" '{"bonus":9000000}' >/dev/null; j PATCH /finance/payroll/lines/$L2R "$ADM" '{"bonus":0}' >/dev/null; j POST /finance/payroll/lines/$L2R/finalize "$ADM" >/dev/null; j GET /finance/payroll/lines/$L2R "$ADM"|g "['revised']")" "False"

chk "an open line cannot be reopened"      "$(code POST /finance/payroll/lines/$(j GET /finance/payroll/140509 "$ADM"|line 1 id)/reopen "$ADM" '{"reason":"x"}')" "409"
chk "a month with nothing final has nothing to reopen" "$(code POST /finance/payroll/140509/reopen "$ADM" '{"reason":"x"}')" "400"
chk "reopen the whole month"               "$(j POST /finance/payroll/140507/reopen "$ADM" '{"reason":"بازبینی کل ماه"}'|g "['reopened']")" "3"
chk "  every line is a draft again"        "$(j GET /finance/payroll/140507 "$ADM"|g "['drafts']")" "3"
chk "  and the first line has two revisions" "$(j GET /finance/payroll/lines/$L1 "$ADM"|python3 -c "import sys,json;print(len(json.load(sys.stdin)['revisions']))")" "2"

echo "12. the bank transfers"
B=$(j GET /finance/payroll/140508/bank "$ADM")
chk "an employee cannot read them"          "$(code GET /finance/payroll/140508/bank "$EMP")" "403"
chk "the total is what the month pays"      "$(echo "$B"|g "['totals']['total']")" "$(j GET /finance/payroll/140508 "$ADM"|g "['totals']['net']")"
chk "  split in the salary and the extras"  "$(echo "$B"|python3 -c "import sys,json;t=json.load(sys.stdin)['totals'];print(t['salary']+t['extras']==t['total'] and t['extras']>0)")" "True"
chk "a hybrid person has two rows"          "$(echo "$B"|python3 -c "import sys,json;r=json.load(sys.stdin)['rows'];print(sorted(x['kind'] for x in r if x['name']=='کارمند'))")" "['extras', 'salary']"
chk "an ordinary person has one"            "$(echo "$B"|python3 -c "import sys,json;r=json.load(sys.stdin)['rows'];print(sum(1 for x in r if x['name']=='تأییدکننده'))")" "1"
chk "a draft is marked in the description"  "$(echo "$B"|python3 -c "import sys,json;r=json.load(sys.stdin)['rows'];print(all('پیش‌نویس' in x['description'] for x in r))")" "True"
chk "who has no sheba is counted, and still has rows" "$(echo "$B"|python3 -c "import sys,json;d=json.load(sys.stdin);print(d['missingSheba']>0 and all('sheba' in x for x in d['rows']))")" "True"
chk "the Excel file is a real workbook"     "$(curl -s -D $TOK/hdr.txt -o $TOK/bank.xlsx "$API/finance/payroll/140508/bank/xlsx" -H "Authorization: Bearer $ADM"; head -c 2 $TOK/bank.xlsx; echo; grep -ci 'spreadsheetml' $TOK/hdr.txt)" "PK
1"
chk "an employee cannot download it"        "$(code GET /finance/payroll/140508/bank/xlsx "$EMP")" "403"

echo; echo "passed: $PASS  failed: $FAIL"; [ "$FAIL" = 0 ]
