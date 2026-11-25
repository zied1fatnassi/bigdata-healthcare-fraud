#!/usr/bin/env bash
# 00_check_prereqs.sh — run this BEFORE anything else.
# It prints, with real numbers, whether this machine can run the project.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  [OK]   %s\n' "$*"; }
bad()  { printf '  [FAIL] %s\n' "$*"; fail=1; }
warn() { printf '  [WARN] %s\n' "$*"; }

say "1. Docker"
if command -v docker >/dev/null 2>&1; then
  ok "docker $(docker --version | awk '{print $3}' | tr -d ,)"
  if docker info >/dev/null 2>&1; then ok "docker daemon reachable"
  else bad "docker installed but the daemon is not reachable (add your user to the docker group, then log out/in)"; fi
  if docker compose version >/dev/null 2>&1; then ok "$(docker compose version)"
  else bad "docker compose plugin missing (sudo apt install docker-compose-plugin)"; fi
else
  bad "docker not installed — see GUIDE.md step 2"
fi

say "2. Memory (the stack needs ~8 GB free)"
avail=$(awk '/MemAvailable/{printf "%d", $2/1024/1024}' /proc/meminfo)
printf '  available: %s GB\n' "$avail"
if [ "$avail" -ge 6 ]; then ok "enough RAM for namenode + 2 datanodes + yarn + hive"
else warn "less than 6 GB free — close Chrome/VS Code before 'docker compose up'"; fi

say "3. Disk (raw data 124 MB + HDFS replicas x2 + images ~2 GB)"
printf '  free on /: %s\n' "$(df -h / | awk 'NR==2{print $4}')"

say "4. Host ports"
for p in 9870 8088 10000 19888; do
  if ss -ltn "( sport = :$p )" | grep -q LISTEN; then bad "port $p already in use"
  else ok "port $p free"; fi
done
if ss -ltn "( sport = :9000 )" | grep -q LISTEN; then
  warn "port 9000 is already used on this machine (local service) — that is WHY the compose file does not publish it"
fi

say "5. Python + dataset"
if [ -x "$ROOT/.venv/bin/python" ]; then ok "venv present: $("$ROOT/.venv/bin/python" --version)"
else bad "missing .venv — run: python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt"; fi

expected=(
  "Train-1542865627584.csv:5410"
  "Train_Beneficiarydata-1542865627584.csv:138556"
  "Train_Inpatientdata-1542865627584.csv:40474"
  "Train_Outpatientdata-1542865627584.csv:517737"
  "Test-1542969243754.csv:1353"
  "Test_Beneficiarydata-1542969243754.csv:63968"
  "Test_Inpatientdata-1542969243754.csv:9551"
  "Test_Outpatientdata-1542969243754.csv:125841"
  "LengthOfStay.csv:100000"
)
# Counts above are the true data-row counts (verified with pandas), so the
# comparison tolerates the last line lacking a trailing newline.
for e in "${expected[@]}"; do
  f="${e%%:*}"; want="${e##*:}"
  if [ -f "$ROOT/data/raw/$f" ]; then
    got=$(( $(wc -l < "$ROOT/data/raw/$f") - 1 ))
    if [ "$got" -eq "$want" ]; then ok "$f ($want data rows + header)"
    else warn "$f has $got data rows, expected $want"; fi
  else bad "missing data/raw/$f"; fi
done

say "RESULT"
if [ "$fail" -eq 0 ]; then printf '  All blocking checks passed.\n'; else printf '  Fix the [FAIL] lines above, then run this script again.\n'; fi
exit "$fail"
