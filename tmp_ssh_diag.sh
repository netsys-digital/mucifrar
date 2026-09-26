#!/bin/bash
set -e
KEY="$HOME/.ssh/NETSYS_HETZNER"
[ -f "$KEY" ] || KEY="/home/netsys/.ssh/NETSYS_HETZNER"
ssh -o BatchMode=yes -o ConnectTimeout=15 -i "$KEY" root@77.42.127.221 bash <<'REMOTE'
set -x
echo "=== ss -tlnp | grep 8097 ==="
ss -tlnp | grep 8097 || true
echo ""
echo "=== docker ps grep 8097|mucifrar ==="
docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E '8097|mucifrar' || true
echo ""
echo "=== docker ps filter publish=8097 ==="
docker ps -a --filter publish=8097 --format '{{.ID}} {{.Names}} {{.Status}} {{.Ports}}'
echo ""
echo "=== loop docker port 8097 ==="
for c in $(docker ps -aq); do
  docker port "$c" 2>/dev/null | grep -q 8097 && echo "$c $(docker inspect -f '{{.Name}} {{.State.Status}}' $c)"
done
echo ""
echo "=== WEB_PORT and API in /app/mucifrar ==="
grep -E '^WEB_PORT=|^API_UPSTREAM=' /app/mucifrar/.env 2>/dev/null || true
grep -E 'API_UPSTREAM|mucifrar-api|8097|WEB_PORT' /app/mucifrar/docker-compose.prod.yml 2>/dev/null | head -30
echo ""
echo "=== netsys-shared-web inspect ports ==="
docker inspect netsys-shared-web-1 --format '{{.Name}} {{.State.Status}} {{json .HostConfig.PortBindings}}' 2>/dev/null || true
REMOTE
