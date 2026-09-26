#!/bin/bash
set -u
echo '=== 1 docker ps ==='
docker ps --format '{{.Names}}\t{{.Ports}}\t{{.Image}}' | grep -iE 'mucifrar|8097|agipoint' || true
echo '=== 2 curl code ==='
curl -sS -o /dev/null -w '8097=%{http_code}\n' http://127.0.0.1:8097/ || true
echo '=== 3 curl body head ==='
curl -sS http://127.0.0.1:8097/ 2>/dev/null | head -c 2000; echo
echo '=== 4 logo headers ==='
curl -sS -I http://127.0.0.1:8097/logo.png 2>/dev/null | head -20
echo '=== 5 host logo ==='
ls -la /app/mucifrar/apps/web/public/logo.png 2>/dev/null || true
file /app/mucifrar/apps/web/public/logo.png 2>/dev/null || true
echo '=== 6 md5 compare ==='
md5sum /app/mucifrar/apps/web/public/logo.png /app/agipoint/*/public/logo.png 2>/dev/null | head -20 || true
find /app/agipoint /app/mucifrar -name 'logo.png' 2>/dev/null | head
echo '=== 7 container logo ==='
cid=$(docker ps -qf name=mucifrar | head -1)
if [ -n "$cid" ]; then
  docker exec "$cid" ls -la /usr/share/nginx/html/logo.png 2>/dev/null || true
  docker exec "$cid" md5sum /usr/share/nginx/html/logo.png 2>/dev/null || true
else
  docker ps -a --format '{{.Names}}' | grep mucifrar || true
fi
echo '=== 8 WEB_PORT ==='
grep WEB_PORT /app/mucifrar/.env 2>/dev/null || echo 'WEB_PORT not in .env'
echo '=== extra title grep ==='
curl -sS http://127.0.0.1:8097/ 2>/dev/null | grep -iE 'agipoint|chord|title' | head -5 || true
