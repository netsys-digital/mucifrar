#!/bin/bash
cd /app/docker-config
set -a
source .env
set +a
while IFS= read -r line; do
  key=${line%%=*}
  role=${key%_DB_PASSWORD}
  role=$(echo "$role" | tr '[:upper:]' '[:lower:]')
  err=$(docker exec -i netsys-postgres env $(grep _DB_PASSWORD= .env | xargs) bash -c "psql -U \"\${POSTGRES_USER:-netsys}\" -d postgres -c \"ALTER ROLE ${role} PASSWORD 'probe_no_keep';\" 2>&1" || true)
  if echo "$err" | grep -q '^ALTER ROLE'; then
    echo "${role}: OK"
  else
    msg=$(echo "$err" | tr '\n' ' ' | sed -E 's/[Pp]assword[^ ]*//g' | cut -c1-180)
    echo "${role}: FAIL — ${msg}"
  fi
done < <(grep _DB_PASSWORD= .env)
