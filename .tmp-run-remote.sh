#!/bin/bash
set -e
sed -i 's/\r$//' /app/netsys-apps/mucifrar/.tmp-remote-commands.sh
scp -i /home/netsys/.ssh/NETSYS_HETZNER -o BatchMode=yes /app/netsys-apps/mucifrar/.tmp-remote-commands.sh root@77.42.127.221:/tmp/mucifrar-ssh-test.sh
ssh -i /home/netsys/.ssh/NETSYS_HETZNER -o BatchMode=yes root@77.42.127.221 bash /tmp/mucifrar-ssh-test.sh
