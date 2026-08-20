set -u
API=http://127.0.0.1:4000/api/v1
EMP=$(cat /var/tmp/t_emp); APR=$(cat /var/tmp/t_apr); FIN=$(cat /var/tmp/t_fin); ADM=$(cat /var/tmp/t_adm)
j(){ curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
code(){ curl -s -o /dev/null -w "%{http_code}" -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
g(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }
e(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1"; }
PASS=0; FAIL=0
chk(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; PASS=$((PASS+1)); else echo "  ✗ $1 — got '$2', want '$3'"; FAIL=$((FAIL+1)); fi; }

DUE=$(date -u -d "+5 days" +%Y-%m-%dT00:00:00.000Z)
PAID=$(date -u +%Y-%m-%dT00:00:00.000Z)
SRC=$(j POST /finance/payment-sources "$FIN" '{"label":"حساب ملت","type":"bank_account","currency":"IRR"}'|g "['id']")

# Two domestic payments (below threshold → straight to queue) and one foreign.
mkpay(){ # title amountRialMinor settledRial
  R=$(j POST /finance/requests "$EMP" "{\"title\":\"$1\",\"categoryId\":3,\"amountMinor\":$2,\"currency\":\"IRR\",\"payeeName\":\"$4\",\"payeeAccountType\":\"sheba\",\"payeeSheba\":\"IR012345678901234567890123\",\"dueDate\":\"$DUE\",\"submit\":true}")
  ID=$(echo "$R"|g "['id']")
  j POST /finance/requests/$ID/pay "$FIN" "{\"paymentSourceId\":$SRC,\"paidAt\":\"$PAID\",\"settledAmountRial\":$3,\"referenceNumber\":\"T-$ID\"}" > /dev/null
  echo $ID
}
A=$(mkpay "قبض اینترنت" 10000000 10000000 "شرکت مخابرات")
B=$(mkpay "لوازم اداری" 15000000 16000000 "فروشگاه اداری")

echo "1. dashboard"
D=$(j GET "/finance/dashboard" "$FIN")
chk "sums settled amounts, not requested" "$(echo "$D"|g "['paid']['totalRial']")" "26000000"
chk "counts payments"                     "$(echo "$D"|g "['paid']['count']")" "2"
chk "no baseline → changePercent null"    "$(echo "$D"|g "['paid']['changePercent']")" "None"
chk "recurring run-rate present"          "$(echo "$D"|g "['recurring']['activeCount']")" "1"
chk "employee blocked"                    "$(code GET /finance/dashboard "$EMP")" "403"
chk "approver blocked"                    "$(code GET /finance/dashboard "$APR")" "403"

echo "2. breakdowns"
chk "by category"  "$(j GET "/finance/reports/by-category" "$FIN"|g "['items'][0]['totalRial']")" "26000000"
chk "by vendor rolls up payee name" "$(j GET "/finance/reports/by-vendor" "$FIN"|e "len(d['items'])")" "2"
chk "trend has this month"          "$(j GET "/finance/reports/trend?months=12" "$FIN"|e "d['items'][-1]['totalRial']")" "26000000"

echo "3. monthly close"
Y=$(date -u +%Y); M=$(date -u +%-m)
MR=$(j GET "/finance/reports/monthly?year=$Y&month=$M" "$FIN")
chk "monthly total"        "$(echo "$MR"|g "['summary']['totalRial']")" "26000000"
chk "variance row captured (paid ≠ requested)" "$(echo "$MR"|e "len(d['variance'])")" "1"
chk "  variance is the right request"  "$(echo "$MR"|g "['variance'][0]['settledRial']")" "16000000"
chk "still-unpaid counted"  "$(echo "$MR"|e "d['stillUnpaid']['count'] >= 1")" "True"

echo "4. CSV export"
CSV=$(curl -s "$API/finance/reports/export" -H "Authorization: Bearer $FIN")
chk "starts with UTF-8 BOM"  "$(printf '%s' "$CSV" | head -c 3 | od -An -tx1 | tr -d ' \n')" "efbbbf"
chk "has a header + 2 rows"  "$(printf '%s' "$CSV" | grep -c '')" "3"
chk "Persian headers intact" "$(printf '%s' "$CSV" | head -1 | grep -c 'شماره پیگیری')" "1"
chk "employee blocked"       "$(code GET /finance/reports/export "$EMP")" "403"

echo "5. upcoming commitments"
U=$(j GET "/finance/reports/upcoming?days=60" "$FIN")
chk "includes open requests" "$(echo "$U"|e "len(d['requests']) >= 1")" "True"
echo
echo "══ phase 3: $PASS passed, $FAIL failed ══"
