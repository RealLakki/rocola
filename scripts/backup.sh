#!/bin/bash
cd /home/ubuntu/rocola-experimental
export PGPASSWORD=$(grep '^PGPASSWORD=' .env | cut -d= -f2-)
DEST=/home/ubuntu/backups/rocola
FILE="$DEST/rocola-$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump -h localhost -U rocola rocola | gzip > "$FILE"
# retención: últimos 14 backups
ls -1t "$DEST"/rocola-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
