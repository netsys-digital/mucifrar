#!/bin/bash
cd /app/docker-config
envargs=()
while IFS= read -r line; do
  key=${line%%=*}
  val=${line#*=}
  envargs+=("${key}=${val}")
done < <(grep _DB_PASSWORD= .env)

echo "=== 3 follow-up: ALTER ROLE per app (ensure-app-dbs env; no secrets printed) ==="
for entry in "${envargs[@]}"; do
  key=${entry%%=*}
  r=${key%_DB_PASSWORD}
  r=$(echo "$r" | tr '[:upper:]' '[:lower:]')
  err=$(docker exec -i netsys-postgres env "${envargs[@]}" bash -c "psql -U \"\${POSTGRES_USER:-netsys}\" -d postgres -c \"ALTER ROLE ${r} PASSWORD 'probe_no_keep';\" 2>&1" || true)
  if echo "$err" | grep -q '^ALTER ROLE'; then
    echo "${r}: OK"
  else
    echo "${r}: FAIL"
    echo "$err" | grep -E 'ERROR|DETAIL' | sed -E 's/[Pp]assword[^ ]*//g'
  fi
done
