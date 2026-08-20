#!/usr/bin/env bash
set -euo pipefail

trap 'echo "[error] unexpected failure at line ${LINENO} (exit $?)"' ERR

LOG_FILE="$(mktemp -t dfx-safe-start.XXXXXX.log)"

cleanup() {
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

# Alinha o dfx local com o moc gerenciado pelo mops. Necessário quando o
# projeto usa `core >= 2.6.1` (via `mops.toml`) — o `moc` empacotado pelo dfx
# 0.29.2 (0.16.2) trava a compilação.
if [[ -z "${DFX_MOC_PATH:-}" && -x "$HOME/.cache/mops/moc/1.13.0/moc" ]]; then
  export DFX_MOC_PATH="$HOME/.cache/mops/moc/1.13.0/moc"
fi

print_time_context() {
  echo "[info] local UTC: $(date -u '+%Y-%m-%d %H:%M:%S %Z (%s)')"
  if command -v timedatectl >/dev/null 2>&1; then
    local sync_line
    sync_line="$(timedatectl status 2>/dev/null | sed -n 's/^System clock synchronized:[[:space:]]*//p' | head -n1 || true)"
    local ntp_line
    ntp_line="$(timedatectl status 2>/dev/null | sed -n 's/^NTP service:[[:space:]]*//p' | head -n1 || true)"
    if [[ -n "$sync_line" ]]; then
      echo "[info] clock synchronized: $sync_line"
    fi
    if [[ -n "$ntp_line" ]]; then
      echo "[info] ntp service: $ntp_line"
    fi
  fi
  return 0
}

run_start() {
  : > "$LOG_FILE"
  set +e
  dfx start --background 2>&1 | tee "$LOG_FILE"
  local ec=${PIPESTATUS[0]}
  set -e
  return "$ec"
}

has_time_error() {
  grep -Eiq 'Failed to initialize PocketIC|/update/set_time|HTTP status client error \(400 Bad Request\) for url \(http://localhost:[0-9]+/instances' "$LOG_FILE"
}

already_running_error() {
  grep -Eiq 'dfx is already running' "$LOG_FILE"
}

restart_network() {
  echo "[action] restarting local dfx network"
  dfx stop >/dev/null 2>&1 || true
}

clean_start() {
  : > "$LOG_FILE"
  set +e
  dfx start --clean --background 2>&1 | tee "$LOG_FILE"
  local ec=${PIPESTATUS[0]}
  set -e
  return "$ec"
}

echo "[info] safe start for local dfx network"
print_time_context

echo "[try 1/3] normal start"
if run_start; then
  echo "[ok] local network started"
  exit 0
fi

if already_running_error; then
  echo "[ok] local network already running"
  exit 0
fi

if ! has_time_error; then
  echo "[error] dfx start failed for non-time related reason"
  exit 1
fi

echo "[warn] detected PocketIC time-related initialization issue"
print_time_context
restart_network

echo "[try 2/3] start after stop"
if run_start; then
  echo "[ok] local network started after restart"
  exit 0
fi

if already_running_error; then
  echo "[ok] local network already running after restart"
  exit 0
fi

if ! has_time_error; then
  echo "[error] dfx start still failing, but not with time-related signature"
  exit 1
fi

echo "[warn] issue persists after restart"
echo "[try 3/3] clean start"
if clean_start; then
  echo "[ok] local network started after clean start"
  exit 0
fi

echo "[error] dfx start failed even after clean start"
if has_time_error; then
  echo "[hint] this usually indicates host clock jump/skew (common in WSL2 after sleep/resume)."
  echo "[hint] run 'wsl --shutdown' from Windows terminal, reopen WSL, then try again."
fi
exit 1
