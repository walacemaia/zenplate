#!/usr/bin/env bash
set -euo pipefail

trap 'echo "[error] unexpected failure at line ${LINENO} (exit $?)"' ERR

# Safe deploy wrapper for WSL2/PocketIC time-drift issues.
# Flow:
# 1) Try deploy normally
# 2) If ingress expiry error appears, restart local network and retry
# 3) If it still fails with expiry/set_time symptoms, clean local network and retry

CANISTER_NAME="${1:-icp_app_backend}"
shift || true
EXTRA_ARGS=("$@")

LOG_FILE="$(mktemp -t dfx-safe-deploy.XXXXXX.log)"

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

run_deploy() {
  : > "$LOG_FILE"
  set +e
  dfx deploy "$CANISTER_NAME" "${EXTRA_ARGS[@]}" 2>&1 | tee "$LOG_FILE"
  local ec=${PIPESTATUS[0]}
  set -e
  return "$ec"
}

has_time_error() {
  grep -Eiq 'Invalid request expiry|ingress_expiry not within expected range|Minimum allowed expiry|/update/set_time|Failed to initialize PocketIC' "$LOG_FILE"
}

ensure_network_up() {
  set +e
  dfx ping >/dev/null 2>&1
  local ping_ec=$?
  set -e

  if [[ $ping_ec -ne 0 ]]; then
    echo "[info] local network is down, starting in background..."
    set +e
    dfx start --background >/dev/null 2>&1
    local start_ec=$?
    set -e
    if [[ $start_ec -ne 0 ]]; then
      echo "[warn] dfx start --background returned non-zero ($start_ec); continuing to deploy attempt"
    fi
  fi
  return 0
}

restart_network() {
  echo "[action] restarting local dfx network"
  dfx stop >/dev/null 2>&1 || true
  dfx start --background >/dev/null
}

clean_restart_network() {
  echo "[action] clean-restarting local dfx network (local state will be reset)"
  dfx stop >/dev/null 2>&1 || true
  dfx start --clean --background >/dev/null
}

echo "[info] safe deploy for canister: $CANISTER_NAME"
print_time_context
ensure_network_up

echo "[try 1/3] normal deploy"
if run_deploy; then
  echo "[ok] deploy succeeded on first attempt"
  exit 0
fi

if ! has_time_error; then
  echo "[error] deploy failed for non-time related reason; not applying automatic clean"
  exit 1
fi

echo "[warn] detected time-related PocketIC/ingress expiry issue"
print_time_context
restart_network

echo "[try 2/3] deploy after restart"
if run_deploy; then
  echo "[ok] deploy succeeded after network restart"
  exit 0
fi

if ! has_time_error; then
  echo "[error] deploy still failing, but not with time-related signature"
  exit 1
fi

echo "[warn] time-related issue persists after restart"
clean_restart_network

echo "[try 3/3] deploy after clean restart"
if run_deploy; then
  echo "[ok] deploy succeeded after clean restart"
  exit 0
fi

echo "[error] deploy failed even after clean restart"
if has_time_error; then
  echo "[hint] this usually indicates host clock jump/skew (common in WSL2 after sleep/resume)."
  echo "[hint] run 'wsl --shutdown' from Windows terminal, reopen WSL, then try again."
fi
exit 1
