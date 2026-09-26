#!/bin/bash
ssh -o BatchMode=yes root@77.42.127.221 'ss -tlnp | grep 8098 || echo 8098_free; docker ps --format "{{.Names}} {{.Ports}}" | grep 8098 || true'
