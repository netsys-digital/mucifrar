#!/bin/bash
# Read-only production audit (pipe via: ssh ... bash -s < .cursor-audit-remote.sh)
set -e
echo '=== PATHS ==='
ls -ld /app/mucifrar /app/docker-config 2>&1 || true
echo
echo '=== MUCIFRAR LS ==='
ls -la /app/mucifrar 2>&1 || true
echo
echo '=== ENV KEYS (masked) ==='
if [ -f /app/mucifrar/.env ]; then
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' /app/mucifrar/.env | sed 's/=.*/=***/'
else
  echo 'NO .env'
fi
echo
echo '=== ENV CHECKS ==='
if [ -f /app/mucifrar/.env ]; then
  for k in WEB_PORT NODE_ENV CORS_ORIGIN APP_URL; do
    v=$(grep -E "^${k}=" /app/mucifrar/.env 2>/dev/null | cut -d= -f2- || true)
    echo "${k}=${v:-unset}"
  done
  for k in JWT_SECRET JWT_REFRESH_SECRET MUCIFRAR_DB_PASSWORD; do
    if grep -qE "^${k}=" /app/mucifrar/.env 2>/dev/null; then
      len=$(grep -E "^${k}=" /app/mucifrar/.env | cut -d= -f2- | wc -c)
      echo "${k}=set yes length=$((len-1))"
    else
      echo "${k}=set no"
    fi
  done
  dburl=$(grep -E '^DATABASE_URL=' /app/mucifrar/.env 2>/dev/null | cut -d= -f2- || true)
  if [ -n "$dburl" ]; then
    host=$(echo "$dburl" | sed -E 's|.*@([^:/]+).*|\1|')
    echo "DATABASE_URL host=${host}"
  else
    echo 'DATABASE_URL=unset'
  fi
fi
echo
echo '=== COMPOSE PORTS ==='
grep -nE 'WEB_PORT|ports:' /app/mucifrar/docker-compose.prod.yml 2>/dev/null | head -30 || true
echo
echo '=== GIT ==='
if [ -d /app/mucifrar/.git ]; then
  git -C /app/mucifrar log -1 --oneline
else
  echo 'no git'
fi
echo
echo '=== DOCKER-CONFIG GREP ==='
cd /app/docker-config 2>/dev/null || true
for f in .env .env.example ensure-app-dbs.sh postgres/init/01-create-apps.sh; do
  if [ -f "$f" ]; then
    echo "--- $f ---"
    grep -n MUCIFRAR "$f" 2>/dev/null | head -40 | while IFS= read -r line; do
      if [[ "$f" == ".env" ]]; then
        echo "$line" | sed -E 's/=.*/=***/'
      else
        echo "$line"
      fi
    done
  fi
done
echo
echo '=== POSTGRES ==='
docker exec netsys-postgres psql -U netsys -d postgres -tAc "SELECT datname FROM pg_database WHERE datname='mucifrar';" 2>&1 || true
docker exec netsys-postgres psql -U netsys -d postgres -tAc "SELECT rolname FROM pg_roles WHERE rolname='mucifrar';" 2>&1 || true
if docker exec netsys-postgres psql -U netsys -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='mucifrar'" 2>/dev/null | grep -q 1; then
  echo '=== MUCIFRAR TABLES ==='
  docker exec netsys-postgres psql -U netsys -d mucifrar -tAc "\dt" 2>&1 || true
fi
echo
echo '=== CONTAINERS ==='
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -iE 'mucifrar|netsys-postgres|netsys-redis|ejc-web' || true
echo
echo '=== PORTS SS ==='
ss -tlnp 2>/dev/null | grep -E '8095|8096|8097|8098|3003' || true
echo
echo '=== IMAGES ==='
docker images | grep -iE 'mucifrar|netsys-node|netsys-web-nginx' | head -20 || true
echo
echo '=== HEALTH ==='
WEB_PORT=$(grep -E '^WEB_PORT=' /app/mucifrar/.env 2>/dev/null | cut -d= -f2- || echo '')
if [ -z "$WEB_PORT" ]; then WEB_PORT=8095; fi
if docker ps --format '{{.Names}}' | grep -qi mucifrar; then
  echo "WEB_PORT used for curl: $WEB_PORT"
  curl -sS -o /dev/null -w "health http_code=%{http_code}\n" "http://127.0.0.1:${WEB_PORT}/health" 2>&1 || true
  curl -sS -o /dev/null -w "root http_code=%{http_code}\n" "http://127.0.0.1:${WEB_PORT}/" 2>&1 || true
else
  echo 'mucifrar container not running - skip curl'
fi
