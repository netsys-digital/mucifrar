#!/bin/bash
KEY="/home/netsys/.ssh/NETSYS_HETZNER"
[ -f "$KEY" ] || KEY="$HOME/.ssh/NETSYS_HETZNER"
ssh -o BatchMode=yes -i "$KEY" root@77.42.127.221 bash <<'REMOTE'
ss -tlnp | grep -E '8095|8096|8097|8098' || true
test -f /app/mucifrar/docker-compose.prod.yml && grep -E 'API_UPSTREAM|mucifrar-api|WEB_PORT' /app/mucifrar/docker-compose.prod.yml || ls -la /app/mucifrar/*.yml
docker inspect netsys-shared-web-1 --format 'Image={{.Config.Image}} Project={{index .Config.Labels "com.docker.compose.project"}}'
REMOTE
