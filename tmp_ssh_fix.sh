#!/bin/bash
KEY="/home/netsys/.ssh/NETSYS_HETZNER"
[ -f "$KEY" ] || KEY="$HOME/.ssh/NETSYS_HETZNER"
ssh -o BatchMode=yes -o ConnectTimeout=15 -i "$KEY" root@77.42.127.221 'bash -s' <<'REMOTE'
echo "=== WEB_PORT ==="
grep '^WEB_PORT=' /app/mucifrar/.env || echo 'WEB_PORT not set'
echo "=== compose API_UPSTREAM / mucifrar-api ==="
grep -E 'API_UPSTREAM|mucifrar-api|WEB_PORT' /app/mucifrar/docker-compose.prod.yml
echo "=== mucifrar containers ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep mucifrar || true
echo "=== holder 8097 ==="
docker ps -a --filter publish=8097 --format '{{.Names}} {{.Status}} {{.Ports}}'
echo "=== 809x listeners ==="
ss -tlnp | grep -E '809[0-9]' || true
echo "=== rm stale mucifrar-web-1 if Created ==="
st=$(docker inspect -f '{{.State.Status}}' mucifrar-web-1 2>/dev/null || echo missing)
echo "mucifrar-web-1 status=$st"
if [ "$st" = Created ] || [ "$st" = exited ]; then
  docker rm -f mucifrar-web-1
fi
echo "=== final mucifrar ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep mucifrar || true
REMOTE
