#!/bin/bash
ssh -o BatchMode=yes root@77.42.127.221 'echo ===ss8097===; ss -tlnp | grep 8097; echo ===mucifrar===; docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mucifrar'
