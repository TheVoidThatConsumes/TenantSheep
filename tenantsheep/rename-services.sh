#!/usr/bin/env bash
# Renames core-api -> core-api and secondary-api -> secondary-api across the
# whole project: folders, docker-compose.yml service keys/build contexts/
# depends_on, nginx.conf proxy_pass targets, package.json/package-lock.json
# names, and every comment/log-line reference in README/CHALLENGES/
# SOLUTIONS/source. Run this from the project's root directory (the one
# containing docker-compose.yml).
#
# Safe to re-run: if it's already renamed, the checks just report that and
# exit 0 without touching anything.

set -euo pipefail

fail() { echo "FAILED: $*" >&2; exit 1; }
trap 'echo "Script aborted at line $LINENO -- nothing past that point ran." >&2' ERR

# ---------------------------------------------------------------------------
# 0. Sanity check: are we actually in the project root? Abort loudly if not,
#    rather than silently doing nothing or renaming the wrong directory.
# ---------------------------------------------------------------------------
if [ ! -f docker-compose.yml ]; then
  fail "No docker-compose.yml in $(pwd) -- cd into the project root first."
fi

ALREADY_DONE=false
if [ -d core-api ] && [ -d secondary-api ] && [ ! -d core-api ] && [ ! -d secondary-api ]; then
  echo "core-api/ and secondary-api/ already exist, and core-api/secondary-api don't -- looks already renamed."
  ALREADY_DONE=true
fi

if [ "$ALREADY_DONE" = false ]; then
  if [ ! -d core-api ] || [ ! -d secondary-api ]; then
    fail "Expected ./core-api and ./secondary-api here, found neither in their original nor renamed form. Wrong directory?"
  fi

  # -------------------------------------------------------------------------
  # 1. Backup, so this is reversible if anything looks wrong afterward.
  # -------------------------------------------------------------------------
  BACKUP="../tenantsheep-prerename-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar --exclude='*/node_modules' -czf "$BACKUP" .
  echo "Backup written to $BACKUP"

  # -------------------------------------------------------------------------
  # 2. Replace every text reference to the old names, file by file, while the
  #    directories still have their original names (order doesn't matter for
  #    this part -- grep is just walking the tree as it exists right now).
  # -------------------------------------------------------------------------
  mapfile -t FILES < <(grep -rlZ --exclude-dir=node_modules --exclude-dir=.git -e 'core-api' -e 'secondary-api' . 2>/dev/null | tr '\0' '\n')

  if [ "${#FILES[@]}" -eq 0 ]; then
    fail "No files matched 'core-api' or 'secondary-api' -- that's unexpected this early, stopping rather than guessing."
  fi

  for f in "${FILES[@]}"; do
    sed -i.bak -e 's/core-api/core-api/g' -e 's/secondary-api/secondary-api/g' "$f"
    rm -f "$f.bak"
  done
  echo "Rewrote references in ${#FILES[@]} file(s)."

  # -------------------------------------------------------------------------
  # 3. Rename the directories themselves.
  # -------------------------------------------------------------------------
  mv core-api core-api
  mv secondary-api secondary-api
  echo "Renamed ./core-api -> ./core-api and ./secondary-api -> ./secondary-api"
fi

# ---------------------------------------------------------------------------
# 4. Verify. Every check below must pass -- this is the part that actually
#    confirms the rename, not just that the commands ran without error.
# ---------------------------------------------------------------------------
CHECKS_PASSED=0
check() {
  local desc="$1"; shift
  if "$@"; then
    echo "  OK  - $desc"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    fail "$desc"
  fi
}

echo
echo "Verifying..."
check "core-api/ directory exists"               [ -d core-api ]
check "secondary-api/ directory exists"           [ -d secondary-api ]
check "core-api/ directory no longer exists"    [ ! -d core-api ]
check "secondary-api/ directory no longer exists"    [ ! -d secondary-api ]
check "no leftover 'core-api' text anywhere"    bash -c '! grep -rq --exclude-dir=node_modules --exclude-dir=.git "core-api" .'
check "no leftover 'secondary-api' text anywhere"    bash -c '! grep -rq --exclude-dir=node_modules --exclude-dir=.git "secondary-api" .'
check "docker-compose.yml has core-api: service"      grep -q "^  core-api:" docker-compose.yml
check "docker-compose.yml has secondary-api: service" grep -q "^  secondary-api:" docker-compose.yml
check "docker-compose.yml builds ./core-api"          grep -q "build: ./core-api" docker-compose.yml
check "docker-compose.yml builds ./secondary-api"     grep -q "build: ./secondary-api" docker-compose.yml
check "nginx proxies to core-api:8000"                grep -q "proxy_pass http://core-api:8000/" nginx/nginx.conf
check "nginx proxies to secondary-api:4000"           grep -q "proxy_pass http://secondary-api:4000/" nginx/nginx.conf
check "core-api/package.json absent (python service)" bash -c '[ ! -f core-api/package.json ]'
check "secondary-api/package.json name updated"       grep -q '"name": "secondary-api"' secondary-api/package.json
check "secondary-api/package-lock.json name updated"  grep -q '"name": "secondary-api"' secondary-api/package-lock.json

# docker-compose.yml is still valid YAML, if a YAML parser is available.
if command -v python3 >/dev/null 2>&1 && python3 -c "import yaml" >/dev/null 2>&1; then
  check "docker-compose.yml still parses as valid YAML" \
    python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))"
else
  echo "  --  (skipped YAML parse check: python3+pyyaml not available here)"
fi

echo
echo "All ${CHECKS_PASSED} checks passed. Rename confirmed: core-api -> core-api, secondary-api -> secondary-api."
echo
echo "Next steps on your end:"
echo "  1. docker compose down       # stop the old stack (old service/container names no longer match this file)"
echo "  2. docker compose up --build -d"
