#!/bin/sh
set -e
PUID=${PUID:-1000}
PGID=${PGID:-1000}

if [ -n "${SUBARR_DB_PATH}" ]; then
  dir=$(dirname "${SUBARR_DB_PATH}")
  mkdir -p "$dir"
  chown -R "$PUID:$PGID" "$dir" 2>/dev/null || true
fi
mkdir -p /downloads
chown -R "$PUID:$PGID" /downloads 2>/dev/null || true
if [ -n "${SUBARR_LOG_DIR}" ]; then
  mkdir -p "${SUBARR_LOG_DIR}"
  chown -R "$PUID:$PGID" "${SUBARR_LOG_DIR}" 2>/dev/null || true
fi
chown -R "$PUID:$PGID" /app/server /app/client/build 2>/dev/null || true

# Drop to PUID/PGID (Unraid defaults 99:100 = nobody:users). setpriv is in util-linux on bookworm-slim.
exec setpriv --reuid="$PUID" --regid="$PGID" --clear-groups -- node server/index.js
