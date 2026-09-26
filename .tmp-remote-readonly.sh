#!/bin/bash
set -e

echo "=== 1. container POSTGRES_* ==="
docker exec netsys-postgres printenv POSTGRES_USER POSTGRES_DB

echo ""
echo "=== 2. simulate ensure-app-dbs inner shell ==="
docker exec -i netsys-postgres env MUCIFRAR_DB_PASSWORD=x bash -s <<'EOS'
echo POSTGRES_USER=${POSTGRES_USER:-unset}
psql -U "${POSTGRES_USER:-netsys}" -d postgres -tAc "SELECT current_user || ' super=' || (SELECT rolsuper::text FROM pg_roles WHERE rolname=current_user)"
EOS

echo ""
echo "=== 3. ensure-app-dbs-style psql ==="
cd /app/docker-config
set -a
# shellcheck disable=SC1091
source .env
set +a
docker exec -i netsys-postgres env $(grep _DB_PASSWORD= .env | xargs) bash -c 'psql -U "${POSTGRES_USER:-netsys}" -d postgres -tAc "SELECT current_user, rolsuper FROM pg_roles WHERE rolname=current_user"'

echo ""
echo "=== 3 follow-up: ALTER ROLE probe per *_DB_PASSWORD (errors only, no secrets) ==="
cd /app/docker-config
while IFS= read -r line; do
  key=${line%%=*}
  role=${key%_DB_PASSWORD}
  role=$(echo "$role" | tr '[:upper:]' '[:lower:]')
  err=$(docker exec -i netsys-postgres env $(grep _DB_PASSWORD= .env | xargs) bash -c "psql -U \"\${POSTGRES_USER:-netsys}\" -d postgres -c \"ALTER ROLE ${role} PASSWORD 'probe_no_keep';\" 2>&1" || true)
  if echo "$err" | grep -q '^ALTER ROLE'; then
    echo "${role}: OK"
  else
    echo "${role}: FAIL — $(echo "$err" | tr '\n' ' ' | sed -E 's/[Pp]assword[^ ]*//g' | head -c 200)"
  fi
done < <(grep _DB_PASSWORD= .env)
