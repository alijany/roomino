set -u
API=http://127.0.0.1:4000/api/v1
EMP=$(cat /var/tmp/t_emp); APR=$(cat /var/tmp/t_apr); FIN=$(cat /var/tmp/t_fin); ADM=$(cat /var/tmp/t_adm)
j(){ curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
code(){ curl -s -o /dev/null -w "%{http_code}" -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
g(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }
PASS=0; FAIL=0
chk(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; PASS=$((PASS+1)); else echo "  ✗ $1 — got '$2', want '$3'"; FAIL=$((FAIL+1)); fi; }

echo "1. vendor directory"
V=$(j POST /finance/vendors "$FIN" '{"name":"فیگما","nameEn":"Figma","kind":"foreign","defaultCurrency":"USD"}')
VID=$(echo "$V"|g "['id']")
chk "create foreign vendor"          "$(echo "$V"|g "['kind']")" "foreign"
A=$(j POST /finance/vendors/$VID/accounts "$FIN" '{"label":"حساب اصلی","type":"iban_swift","holderName":"Figma Inc","iban":"DE89370400440532013000","isDefault":true}')
AID=$(echo "$A"|g "['id']")
chk "add default payee account"      "$(echo "$A"|g "['isDefault']")" "True"
chk "employee can read directory"    "$(code GET /finance/vendors "$EMP")" "200"
chk "employee cannot create vendor"  "$(code POST /finance/vendors "$EMP" '{"name":"x"}')" "403"

echo "2. request pre-filled from the vendor"
DUE=$(date -u -d "+10 days" +%Y-%m-%dT00:00:00.000Z)
R=$(j POST /finance/requests "$EMP" "{\"title\":\"اشتراک Figma\",\"categoryId\":3,\"amountMinor\":42000,\"currency\":\"USD\",\"vendorId\":$VID,\"payeeAccountId\":$AID,\"payeeName\":\"فیگما\",\"payeeAccountType\":\"iban_swift\",\"payeeAccountDetails\":\"DE89370400440532013000\",\"dueDate\":\"$DUE\",\"submit\":true}")
RID=$(echo "$R"|g "['id']")
chk "request carries the vendor link" "$(j GET /finance/requests/$RID "$FIN"|g "['vendor']['name']")" "فیگما"

echo "3. recurring expense"
NEXT=$(date -u -d "+3 days" +%Y-%m-%dT00:00:00.000Z)
S=$(j POST /finance/recurring "$FIN" "{\"title\":\"اشتراک ماهانه Figma\",\"vendorId\":$VID,\"categoryId\":3,\"payeeAccountId\":$AID,\"amountMinor\":4200,\"currency\":\"USD\",\"cycle\":\"monthly\",\"calendar\":\"gregorian\",\"nextDueDate\":\"$NEXT\"}")
SID=$(echo "$S"|g "['id']")
chk "schedule created"               "$(echo "$S"|g "['cycle']")" "monthly"
chk "reminder windows defaulted"     "$(echo "$S"|g "['reminderDays']")" "[30, 14, 7, 1]"
chk "employee cannot see schedules"  "$(code GET /finance/recurring "$EMP")" "403"

echo "4. materialising a cycle"
GEN=$(j POST /finance/recurring/$SID/generate "$FIN" '{}')
GID=$(echo "$GEN"|g "['id']")
chk "request generated from schedule" "$(echo "$GEN"|g "['origin']")" "recurring"
D=$(j GET /finance/requests/$GID "$FIN")
chk "  payee snapshot copied"        "$(echo "$D"|g "['payeeAccountDetails']")" "DE89370400440532013000"
chk "  linked back to the schedule"  "$(echo "$D"|g "['recurringSourceId']")" "$SID"
chk "  routed for approval (foreign, no rial value)" "$(echo "$D"|g "['status']")" "pending_approval"
AFTER=$(j GET /finance/recurring/$SID "$FIN")
chk "schedule rolled forward a month" "$(python3 -c "
import sys,json
from datetime import datetime
n=json.load(sys.stdin)['nextDueDate'][:10]
print('yes' if n[:7] != '$NEXT'[:7] else 'no')" <<< "$AFTER")" "yes"

echo "5. idempotency"
psql -h 127.0.0.1 -U postgres -d roomino -q -c "update recurring_expense_entity set next_due_date = (select due_date from payment_request_entity where id=$GID) where id=$SID;" > /dev/null
AGAIN=$(j POST /finance/recurring/$SID/generate "$FIN" '{}')
chk "re-generating the same cycle returns the same request" "$(echo "$AGAIN"|g "['id']")" "$GID"
chk "  no duplicate created" "$(psql -h 127.0.0.1 -U postgres -d roomino -t -A -c "select count(*) from payment_request_entity where recurring_source_id=$SID;")" "1"

echo "6. skip a cycle"
BEFORE_SKIP=$(j GET /finance/recurring/$SID "$FIN"|g "['nextDueDate']")
j POST /finance/recurring/$SID/skip "$FIN" '{}' > /dev/null
AFTER_SKIP=$(j GET /finance/recurring/$SID "$FIN"|g "['nextDueDate']")
chk "skip advances the due date" "$([ "$BEFORE_SKIP" != "$AFTER_SKIP" ] && echo yes || echo no)" "yes"

echo "7. daily cycle job"
RUN=$(j POST /finance/recurring/run-daily-cycle "$ADM" '{}')
chk "job runs and reports counts" "$(echo "$RUN"|python3 -c "import sys,json;d=json.load(sys.stdin);print('reminded' in d and 'generated' in d)")" "True"
chk "  admin-only"                "$(code POST /finance/recurring/run-daily-cycle "$FIN" '{}')" "403"
echo
echo "══ phase 2: $PASS passed, $FAIL failed ══"
