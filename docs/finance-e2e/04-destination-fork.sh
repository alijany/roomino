set -u
API=http://127.0.0.1:4000/api/v1
EMP=$(cat /var/tmp/t_emp); APR=$(cat /var/tmp/t_apr); FIN=$(cat /var/tmp/t_fin); ADM=$(cat /var/tmp/t_adm); EMP2=$(cat /var/tmp/t_emp2)
j(){ curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
code(){ curl -s -o /dev/null -w "%{http_code}" -X "$1" "$API$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" ${4:+-d "$4"}; }
g(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(json.loads(sys.stdin.name) if False else eval('d'+sys.argv[1]))" "$1"; }
PASS=0; FAIL=0
chk(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; PASS=$((PASS+1)); else echo "  ✗ $1 — got '$2', want '$3'"; FAIL=$((FAIL+1)); fi; }
DUE=$(date -u -d "+7 days" +%Y-%m-%dT00:00:00.000Z); PAID=$(date -u +%Y-%m-%dT00:00:00.000Z)

echo "1. online-account destination"
R=$(j POST /finance/requests "$EMP" "{\"title\":\"شارژ حساب OpenAI\",\"categoryId\":3,\"amountMinor\":50000000,\"currency\":\"IRR\",\"payeeName\":\"OpenAI\",\"destinationKind\":\"online_account\",\"destinationUrl\":\"https://platform.openai.com\",\"destinationAccount\":\"team@acme.ir\",\"destinationCredential\":\"S3cret-Pass\",\"dueDate\":\"$DUE\",\"submit\":true}")
ID=$(echo "$R"|g "['id']")
chk "created without sheba/card"            "$(echo "$R"|g "['status']")" "pending_approval"
D=$(j GET /finance/requests/$ID "$EMP")
chk "  destination url stored"              "$(echo "$D"|g "['destinationUrl']")" "https://platform.openai.com"
chk "  destination account stored"          "$(echo "$D"|g "['destinationAccount']")" "team@acme.ir"
chk "  credential flagged, never inlined"   "$(echo "$D"|g "['hasDestinationCredential']")" "True"
chk "  raw secret absent from payload"      "$(echo "$D" | grep -c 'S3cret-Pass')" "0"

echo "2. credential reveal is scoped"
chk "requester may reveal"                  "$(j GET /finance/requests/$ID/credential "$EMP"|g "['credential']")" "S3cret-Pass"
chk "finance may reveal"                    "$(j GET /finance/requests/$ID/credential "$FIN"|g "['credential']")" "S3cret-Pass"
chk "approver may not reveal"               "$(code GET /finance/requests/$ID/credential "$APR")" "403"
chk "admin may not reveal"                  "$(code GET /finance/requests/$ID/credential "$ADM")" "403"
chk "stranger may not even see request"     "$(code GET /finance/requests/$ID "$EMP2")" "403"

echo "3. credential cleared on terminal state"
j POST /finance/requests/$ID/approve "$APR" '{"comment":"باشد"}' >/dev/null
SRC=$(j POST /finance/payment-sources "$FIN" '{"label":"کارت مالی","type":"card","currency":"IRR"}'|g "['id']")
j POST /finance/requests/$ID/pay "$FIN" "{\"paymentSourceId\":$SRC,\"paidAt\":\"$PAID\",\"settledAmountRial\":50000000,\"referenceNumber\":\"ON-1\"}" >/dev/null
D=$(j GET /finance/requests/$ID "$FIN")
chk "paid → credential wiped"               "$(echo "$D"|g "['hasDestinationCredential']")" "False"
chk "  reveal now returns nothing"          "$(j GET /finance/requests/$ID/credential "$FIN"|g "['credential']")" "None"

echo "4. bank destination still validated"
chk "bank kind without sheba/card rejected" "$(code POST /finance/requests "$EMP" "{\"title\":\"بدون مقصد\",\"categoryId\":3,\"amountMinor\":10000000,\"currency\":\"IRR\",\"payeeName\":\"طرف\",\"dueDate\":\"$DUE\",\"submit\":true}")" "400"
chk "online kind without url rejected"      "$(code POST /finance/requests "$EMP" "{\"title\":\"بدون آدرس\",\"categoryId\":3,\"amountMinor\":10000000,\"currency\":\"IRR\",\"payeeName\":\"سرویس\",\"destinationKind\":\"online_account\",\"destinationAccount\":\"x\",\"dueDate\":\"$DUE\",\"submit\":true}")" "400"

echo "5. switching kind clears the other side"
R=$(j POST /finance/requests "$EMP" "{\"title\":\"ابتدا بانکی\",\"categoryId\":3,\"amountMinor\":10000000,\"currency\":\"IRR\",\"payeeName\":\"طرف\",\"payeeAccountType\":\"sheba\",\"payeeSheba\":\"IR012345678901234567890123\",\"dueDate\":\"$DUE\"}")
SW=$(echo "$R"|g "['id']")
j PATCH /finance/requests/$SW "$EMP" "{\"destinationKind\":\"online_account\",\"destinationUrl\":\"https://vercel.com\",\"destinationAccount\":\"ops@acme.ir\"}" >/dev/null
D=$(j GET /finance/requests/$SW "$EMP")
chk "switch to online drops the sheba"      "$(echo "$D"|g "['payeeSheba']")" "None"
chk "  and the account type"                "$(echo "$D"|g "['payeeAccountType']")" "None"
chk "  keeps the new destination"           "$(echo "$D"|g "['destinationUrl']")" "https://vercel.com"

echo "6. secret is encrypted at rest"
chk "ciphertext in DB, not plaintext" "$(psql -h 127.0.0.1 -U postgres -d roomino -tAc "select count(*) from payment_request_entity where destination_credential_enc like '%S3cret-Pass%'")" "0"

echo ""
echo "══ phase 4 (destination fork): $PASS passed, $FAIL failed ══"
