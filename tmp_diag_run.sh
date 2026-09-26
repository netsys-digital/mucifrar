#!/bin/bash
set -u
OUT=/app/netsys-apps/mucifrar/tmp_diag_out.txt
REMOTE=/app/netsys-apps/mucifrar/tmp_diag_remote.sh
sed -i 's/\r$//' "$REMOTE" 2>/dev/null || true
KEY=""
for k in /home/netsys/.ssh/NETSYS_HETZNER /home/netsys/NETSYS_HETZNER /root/.ssh/NETSYS_HETZNER "$HOME/.ssh/NETSYS_HETZNER"; do
  [ -f "$k" ] && KEY="$k" && break
done
{
  echo "=== DIAG $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo "KEY=${KEY:-none}"
} > "$OUT"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=30 root@77.42.127.221)
[ -n "$KEY" ] && SSH_OPTS=(-i "$KEY" "${SSH_OPTS[@]}")
if ssh "${SSH_OPTS[@]}" bash -s < "$REMOTE" >> "$OUT" 2>&1; then
  echo "SSH_EXIT=0" >> "$OUT"
else
  echo "SSH_EXIT=$?" >> "$OUT"
fi
