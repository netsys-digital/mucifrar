#!/bin/bash
set -u
OUT=/app/netsys-apps/mucifrar/.cursor-audit-out.txt
REMOTE=/app/netsys-apps/mucifrar/.cursor-audit-remote.sh
sed -i 's/\r$//' "$REMOTE"
KEY=""
for k in /home/netsys/NETSYS_HETZNER /root/NETSYS_HETZNER "$HOME/NETSYS_HETZNER"; do
  if [ -f "$k" ]; then KEY="$k"; break; fi
done

{
  echo "=== AUDIT RUN $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo "KEY_FILE=${KEY:-none}"
  echo "--- attempt 1: BatchMode=yes ---"
} > "$OUT"

if ssh -o BatchMode=yes -o ConnectTimeout=25 root@77.42.127.221 bash -s < "$REMOTE" >> "$OUT" 2>&1; then
  echo "SSH_EXIT=0 (BatchMode)" >> "$OUT"
  exit 0
fi
rc=$?
echo "SSH_EXIT=$rc (BatchMode failed)" >> "$OUT"
echo "--- attempt 2: no BatchMode ---" >> "$OUT"
if ssh -o ConnectTimeout=25 root@77.42.127.221 bash -s < "$REMOTE" >> "$OUT" 2>&1; then
  echo "SSH_EXIT=0 (no BatchMode)" >> "$OUT"
  exit 0
fi
rc=$?
echo "SSH_EXIT=$rc (no BatchMode failed)" >> "$OUT"
if [ -n "$KEY" ]; then
  echo "--- attempt 3: -i $KEY ---" >> "$OUT"
  if ssh -i "$KEY" -o ConnectTimeout=25 root@77.42.127.221 bash -s < "$REMOTE" >> "$OUT" 2>&1; then
    echo "SSH_EXIT=0 (with key)" >> "$OUT"
    exit 0
  fi
  echo "SSH_EXIT=$? (with key failed)" >> "$OUT"
fi
exit 1
