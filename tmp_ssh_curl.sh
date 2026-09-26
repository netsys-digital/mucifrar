#!/bin/bash
ssh -o BatchMode=yes root@77.42.127.221 'curl -sS -o /dev/null -w "8097_http=%{http_code}\n" http://127.0.0.1:8097/; curl -sS http://127.0.0.1:8097/ 2>/dev/null | grep -ioE "<title>[^<]+" | head -1; docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "mucifrar|8097|shared"'
