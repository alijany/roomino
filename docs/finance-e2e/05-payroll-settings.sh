set -u
# Payroll settings — the legal parameters per Jalali year. Needs its own fresh
# database (it creates years 1405 and 1406) and the five seeded users.
API=${API:-http://127.0.0.1:4000/api/v1}; TOK=${TOK:-/var/tmp}
EMP=$(cat $TOK/t_emp); FIN=$(cat $TOK/t_fin); ADM=$(cat $TOK/t_adm)
j(){ curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
code(){ curl -s -o /dev/null -w "%{http_code}" -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
# value of one parameter in a year view
v(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(next(i for i in d['items'] if i['key']==sys.argv[1])[sys.argv[2]])" "$1" "${2:-value}"; }
g(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }
PASS=0; FAIL=0
chk(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; PASS=$((PASS+1)); else echo "  ✗ $1 — got '$2', want '$3'"; FAIL=$((FAIL+1)); fi; }

echo "1. admin only"
chk "an employee cannot read"          "$(code GET /finance/payroll-settings "$EMP")" "403"
chk "finance cannot read"              "$(code GET /finance/payroll-settings/1405 "$FIN")" "403"
chk "finance cannot write"             "$(code PUT /finance/payroll-settings/1405 "$FIN" '{"values":{"minDaily":1}}')" "403"

echo "2. an official year shows before it is saved"
D=$(j GET /finance/payroll-settings/1405 "$ADM")
chk "year 1405 is listed"              "$(j GET /finance/payroll-settings "$ADM" | g "['years']")" "[1405]"
chk "not saved yet"                    "$(echo "$D"|g "['exists']")" "False"
chk "official minimum daily wage"      "$(echo "$D"|v minDaily)" "5541850"
chk "  housing is 30,000,000 rial"     "$(echo "$D"|v housing)" "30000000"
chk "  worker insurance is 7%"         "$(echo "$D"|v insWorker)" "7"
chk "a year with no figure has none"   "$(j GET /finance/payroll-settings/1406 "$ADM"|g "['hasOfficial']")" "False"
chk "editing before saving is refused" "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"housing":1}}')" "404"

echo "3. saving a year"
chk "create 1405 from the official"    "$(code POST /finance/payroll-settings/1405 "$ADM" '{}')" "201"
chk "  twice is a conflict"            "$(code POST /finance/payroll-settings/1405 "$ADM" '{}')" "409"
chk "  1406 has no official figure"    "$(code POST /finance/payroll-settings/1406 "$ADM" '{}')" "400"
chk "  an implausible year is refused" "$(code POST /finance/payroll-settings/1999 "$ADM" '{}')" "400"
D=$(j GET /finance/payroll-settings/1405 "$ADM")
chk "saved now"                        "$(echo "$D"|g "['exists']")" "True"
chk "  bon keeps its flags: not insurable" "$(echo "$D"|g "['inclusion'][3]['insurable']")" "False"
chk "  bon is taxable"                 "$(echo "$D"|g "['inclusion'][3]['taxable']")" "True"

echo "4. editing"
D=$(j PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"housing":40000000,"overtimeRate":45.5}}')
chk "housing changed"                  "$(echo "$D"|v housing)" "40000000"
chk "  marked as edited"               "$(echo "$D"|v housing edited)" "True"
chk "  a fractional percent is kept"   "$(echo "$D"|v overtimeRate)" "45.5"
chk "  an untouched one is not edited" "$(echo "$D"|v bon edited)" "False"
D=$(j PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"minDaily":6000000}}')
chk "the monthly minimum follows"      "$(echo "$D"|v minMonthly)" "180000000"
chk "  child allowance follows"        "$(echo "$D"|v child)" "18000000"
chk "  insurance ceiling follows the monthly" "$(echo "$D"|v insCeiling)" "1260000000"
chk "  eidi cap follows"               "$(echo "$D"|v eidiCap)" "540000000"
D=$(j PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"child":17000000}}')
chk "a derived figure may be set by hand" "$(echo "$D"|v child)" "17000000"
chk "  and is flagged as overridden"   "$(echo "$D"|v child overridden)" "True"
D=$(j PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"minDaily":6100000}}')
chk "  a later change to its source recomputes it" "$(echo "$D"|v child)" "18300000"
D=$(j PUT /finance/payroll-settings/1405 "$ADM" '{"inclusion":{"mission":{"insurable":true,"taxable":false}}}')
chk "inclusion flags change"           "$(echo "$D"|g "['inclusion'][9]['insurable']")" "True"
chk "an unknown parameter is refused"  "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"nope":1}}')" "400"
chk "a negative amount is refused"     "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"housing":-5}}')" "400"
chk "a percent above 100 is refused"   "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"insWorker":101}}')" "400"
chk "five decimals in a percent are refused" "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"insWorker":7.12345}}')" "400"
chk "an unknown inclusion item is refused" "$(code PUT /finance/payroll-settings/1405 "$ADM" '{"inclusion":{"nope":{"insurable":true,"taxable":true}}}')" "400"
chk "Persian digits are accepted"      "$(echo "$(j PUT /finance/payroll-settings/1405 "$ADM" '{"values":{"housing":"۴۲۰۰۰۰۰۰"}}')"|v housing)" "42000000"

echo "5. a new year from an old one"
chk "copy 1405 into 1406"              "$(code POST /finance/payroll-settings/1406 "$ADM" '{"copyFrom":1405}')" "201"
D=$(j GET /finance/payroll-settings/1406 "$ADM")
chk "  it carries the edited housing"  "$(echo "$D"|v housing)" "42000000"
chk "  and 1405 is untouched by 1406"  "$(j PUT /finance/payroll-settings/1406 "$ADM" '{"values":{"housing":50000000}}' >/dev/null; j GET /finance/payroll-settings/1405 "$ADM"|v housing)" "42000000"
chk "copying from a missing year fails" "$(code POST /finance/payroll-settings/1407 "$ADM" '{"copyFrom":1399}')" "404"
chk "both years are listed"            "$(j GET /finance/payroll-settings "$ADM" | g "['years']")" "[1406, 1405]"

echo; echo "passed: $PASS  failed: $FAIL"; [ "$FAIL" = 0 ]
