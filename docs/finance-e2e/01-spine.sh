set -u
API=http://127.0.0.1:4000/api/v1
EMP=$(cat /var/tmp/t_emp); APR=$(cat /var/tmp/t_apr); FIN=$(cat /var/tmp/t_fin)
ADM=$(cat /var/tmp/t_adm); EMP2=$(cat /var/tmp/t_emp2)
j(){ curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
code(){ curl -s -o /dev/null -w "%{http_code}" -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
g(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }
DUE=$(date -u -d "+10 days" +%Y-%m-%dT00:00:00.000Z); PAID=$(date -u +%Y-%m-%dT00:00:00.000Z)
PASS=0; FAIL=0
chk(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; PASS=$((PASS+1)); else echo "  ✗ $1 — got '$2', expected '$3'"; FAIL=$((FAIL+1)); fi; }

mk(){ j POST /finance/requests "$1" "{\"title\":\"$2\",\"categoryId\":3,\"amountMinor\":$3,\"currency\":\"$4\",\"payeeName\":\"طرف\",\"payeeAccountType\":\"sheba\",\"payeeSheba\":\"IR012345678901234567890123\",\"dueDate\":\"$DUE\",\"submit\":true${5:-}}"; }

echo "1. threshold routing"
R=$(mk "$EMP" "شارژ ساختمان" 10000000 IRR);      ID1=$(echo "$R"|g "['id']")
chk "۱M تومان → no approver, straight to queue" "$(echo "$R"|g "['status']")" "approved"
R=$(mk "$EMP" "اشتراک Figma" 50000000 IRR);      ID2=$(echo "$R"|g "['id']")
chk "۵M تومان → routed to approver"              "$(echo "$R"|g "['status']")" "pending_approval"
chk "  pending role is approver"                 "$(echo "$R"|g "['pendingRole']")" "approver"
R=$(mk "$EMP" "سرور اختصاصی" 300000000 IRR);     ID5=$(echo "$R"|g "['id']")
chk "۳۰M تومان → two-step chain starts at approver" "$(echo "$R"|g "['pendingRole']")" "approver"

echo "2. segregation of duties"
chk "requester cannot approve own"    "$(code POST /finance/requests/$ID2/approve "$EMP" '{}')" "403"
chk "finance cannot approve (not in chain)" "$(code POST /finance/requests/$ID2/approve "$FIN" '{}')" "403"

echo "3. needs-info round trip"
chk "approver returns for correction" "$(code POST /finance/requests/$ID2/request-info "$APR" '{"comment":"پیش‌فاکتور لازم است"}')" "201"
chk "  status is needs_info"          "$(j GET /finance/requests/$ID2 "$EMP"|g "['status']")" "needs_info"
chk "  approver still sees it"        "$(code GET /finance/requests/$ID2 "$APR")" "200"
chk "  reason surfaced to requester"  "$(j GET /finance/requests/$ID2 "$EMP"|g "['lastDecisionComment']")" "پیش‌فاکتور لازم است"
j POST /finance/requests/$ID2/submit "$EMP" '{}' >/dev/null
chk "  resubmit → pending_approval"   "$(j GET /finance/requests/$ID2 "$EMP"|g "['status']")" "pending_approval"

echo "4. approve and pay"
j POST /finance/requests/$ID2/approve "$APR" '{"comment":"تأیید"}' >/dev/null
chk "approved → in finance queue"     "$(j GET /finance/requests/$ID2 "$FIN"|g "['status']")" "approved"
SRC=$(j POST /finance/payment-sources "$FIN" '{"label":"حساب ملت","type":"bank_account","currency":"IRR"}'|g "['id']")
j POST /finance/requests/$ID2/pay "$FIN" "{\"paymentSourceId\":$SRC,\"paidAt\":\"$PAID\",\"settledAmountRial\":50500000,\"referenceNumber\":\"TRK-99881\"}" >/dev/null
chk "payment recorded → paid"         "$(j GET /finance/requests/$ID2 "$FIN"|g "['status']")" "paid"
chk "  variance preserved (requested ≠ settled)" "$(j GET /finance/requests/$ID2 "$FIN"|g "['payments'][0]['settledAmountRial']")" "50500000"
chk "  requested amount untouched"    "$(j GET /finance/requests/$ID2 "$FIN"|g "['amountMinor']")" "50000000"

echo "5. two-step chain"
j POST /finance/requests/$ID5/approve "$APR" '{}' >/dev/null
chk "after step 1 → still pending"    "$(j GET /finance/requests/$ID5 "$FIN"|g "['status']")" "pending_approval"
chk "  now waiting on admin"          "$(j GET /finance/requests/$ID5 "$FIN"|g "['pendingRole']")" "admin"
j POST /finance/requests/$ID5/approve "$ADM" '{}' >/dev/null
chk "after step 2 → approved"         "$(j GET /finance/requests/$ID5 "$FIN"|g "['status']")" "approved"

echo "6. access control"
chk "other employee blocked"          "$(code GET /finance/requests/$ID2 "$EMP2")" "403"
chk "user blocked from payment-sources"     "$(code GET /finance/payment-sources "$EMP")" "403"
chk "approver blocked from payment-sources" "$(code GET /finance/payment-sources "$APR")" "403"
chk "finance allowed"                 "$(code GET /finance/payment-sources "$FIN")" "200"
chk "user blocked from approval matrix"     "$(code GET /finance/approval-rules "$EMP")" "403"
chk "admin allowed"                   "$(code GET /finance/approval-rules "$ADM")" "200"

echo "7. company-level payment (finance-raised)"
R=$(mk "$FIN" "AWS آبان" 42000 USD ',"origin":"finance"'); ID3=$(echo "$R"|g "['id']")
chk "below threshold but forced to an approver" "$(echo "$R"|g "['pendingRole']")" "admin"
j POST /finance/requests/$ID3/approve "$ADM" '{}' >/dev/null
chk "foreign pay without rate rejected" "$(j POST /finance/requests/$ID3/pay "$FIN" "{\"paymentSourceId\":$SRC,\"paidAt\":\"$PAID\",\"settledAmountRial\":1}"|g "['message']")" "برای پرداخت ارزی، وارد کردن نرخ تبدیل الزامی است"
j POST /finance/requests/$ID3/pay "$FIN" "{\"paymentSourceId\":$SRC,\"paidAt\":\"$PAID\",\"settledAmountRial\":483000000,\"fxRateRialPerUnit\":1150000,\"feeRial\":15000000,\"intermediary\":\"صرافی\",\"referenceNumber\":\"FX-2201\"}" >/dev/null
chk "foreign pay with rate → paid"    "$(j GET /finance/requests/$ID3 "$FIN"|g "['status']")" "paid"
chk "  fee recorded separately"       "$(j GET /finance/requests/$ID3 "$FIN"|g "['payments'][0]['feeRial']")" "15000000"

echo "8. failed payment returns to queue"
j POST /finance/requests/$ID1/fail "$FIN" '{"comment":"حساب مقصد مسدود بود"}' >/dev/null
chk "status failed"                   "$(j GET /finance/requests/$ID1 "$FIN"|g "['status']")" "failed"
chk "still payable"                   "$(j GET /finance/requests/$ID1 "$FIN"|g "['permissions']['canPay']")" "True"

echo
echo "── audit timeline for request $ID2 ──"
j GET /finance/requests/$ID2/activity "$FIN" | python3 -c "
import sys,json
for e in json.load(sys.stdin)['items']:
    print(f\"  {e['action']:<15} {str(e.get('fromStatus') or '-'):<17} → {str(e.get('toStatus') or '-'):<17} {e['actor']['name'] if e.get('actor') else '—'}\")"
echo
echo "══ $PASS passed, $FAIL failed ══"
