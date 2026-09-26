#!/bin/bash
ssh -o BatchMode=yes root@77.42.127.221 'docker rm -f mucifrar-web-1 2>&1; docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mucifrar || true'
