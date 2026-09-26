#!/bin/bash
set -euo pipefail
KEY=""
for k in "$HOME/.ssh/NETSYS_HETZNER" /root/.ssh/NETSYS_HETZNER /home/*/.ssh/NETSYS_HETZNER; do
  [ -f "$k" ] && KEY="$k" && break
done
[ -n "$KEY" ] || { echo "NO_KEY"; exit 1; }
ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i "$KEY" root@77.42.127.221 bash -s <<'REMOTE'
set -e
echo "=== STEP 1 ==="
docker ps --format '{{.Names}} {{.Status}} {{.Ports}}' | grep mucifrar || true
echo "API_UPSTREAM=$(docker exec mucifrar-web-1 printenv API_UPSTREAM 2>/dev/null || echo missing)"
docker exec mucifrar-web-1 wget -qO- http://mucifrar-api:3003/health 2>&1 || docker exec mucifrar-web-1 wget -qO- http://api:3003/health 2>&1 || true
echo "=== STEP 2 imprimir ==="
docker exec mucifrar-api-1 node -e "
fetch('https://www.cifraclub.com.br/adventistas-brasil/encontros-com-jesus/imprimir.html',{
  headers:{
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept':'text/html',
    'Accept-Language':'pt-BR,pt;q=0.9',
    'Referer':'https://www.cifraclub.com.br/'
  }
}).then(async r=>{console.log('status',r.status); const t=await r.text(); console.log('len',t.length); console.log(t.slice(0,200));}).catch(e=>console.error('ERR',e))
"
echo "=== STEP 2 song page ==="
docker exec mucifrar-api-1 node -e "
fetch('https://www.cifraclub.com.br/adventistas-brasil/encontros-com-jesus/',{
  headers:{
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept':'text/html',
    'Accept-Language':'pt-BR,pt;q=0.9',
    'Referer':'https://www.cifraclub.com.br/'
  }
}).then(async r=>{console.log('status',r.status); const t=await r.text(); console.log('len',t.length); console.log(t.slice(0,200));}).catch(e=>console.error('ERR',e))
"
echo "=== STEP 3 register + import ==="
EMAIL="diag$(date +%s)@example.com"
REG=$(curl -sS -X POST http://127.0.0.1:8097/api/auth/register -H 'Content-Type: application/json' -d "{\"name\":\"Diag\",\"email\":\"$EMAIL\",\"password\":\"DiagTest123!\"}")
echo "REG=$REG"
TOKEN=$(echo "$REG" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).accessToken||'')}catch{console.log('')}})")
echo "TOKEN_LEN=${#TOKEN}"
IMPORT=$(curl -sS -w '\nHTTP_CODE:%{http_code}\n' -X POST http://127.0.0.1:8097/api/cifras/import/cifraclub \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"url":"https://www.cifraclub.com.br/adventistas-brasil/encontros-com-jesus/imprimir.html"}')
echo "IMPORT=$IMPORT"
echo "=== API LOGS ==="
docker logs mucifrar-api-1 --tail 30 2>&1 || true
REMOTE
