#!/bin/bash
cd /app/docker-config
echo "=== _DB_PASSWORD keys (names only) ==="
grep _DB_PASSWORD= .env | sed 's/=.*//'
echo "=== POSTGRES_USER in .env (masked) ==="
grep '^POSTGRES_USER=' .env | sed 's/=.*/=***/'
