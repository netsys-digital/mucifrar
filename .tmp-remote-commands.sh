#!/bin/bash
echo "=== 1 ==="
docker exec netsys-postgres psql -U netsys -d postgres -c "SELECT current_user, session_user, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user);"
echo ""
echo "=== 2 ==="
docker exec netsys-postgres psql -U netsys -d postgres -c "ALTER ROLE agipoint PASSWORD 'test_only_do_not_keep';" 2>&1
echo ""
echo "=== 3 ==="
grep POSTGRES_USER /app/docker-config/.env | sed 's/=.*/=***/'
