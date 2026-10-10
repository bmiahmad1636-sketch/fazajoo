#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' 'FAZAJOO / Package 04 - Server preflight (read-only)'
if [[ "$(id -u)" -eq 0 ]]; then echo 'WARN: use a non-root deployment user'; fi
for bin in node npm psql nginx git systemctl; do
  if command -v "$bin" >/dev/null 2>&1; then
    printf 'OK   %-12s %s\n' "$bin" "$(command -v "$bin")"
  else
    printf 'MISS %-12s\n' "$bin"
  fi
done
node --version 2>/dev/null || true
npm --version 2>/dev/null || true
psql --version 2>/dev/null || true
nginx -v 2>&1 || true
printf '\nDisk and RAM:\n'
df -h /; free -h
printf '\nListening ports (first 20):\n'
ss -lnt | head -n 20
printf '\nNo changes made. Do not paste credentials or secrets in chat.\n'
