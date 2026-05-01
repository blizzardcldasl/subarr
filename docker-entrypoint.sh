#!/bin/sh
set -e
if [ -n "${SUBARR_DB_PATH}" ]; then
  dir=$(dirname "${SUBARR_DB_PATH}")
  mkdir -p "$dir"
  chown node:node "$dir" || chown -R node:node "$dir"
fi
# Writable output root for yt-dlp post-processors (bind-mount your Unraid share here → /downloads)
mkdir -p /downloads
chown node:node /downloads 2>/dev/null || true
exec runuser -u node -- node server/index.js
