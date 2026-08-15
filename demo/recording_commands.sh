#!/usr/bin/env bash
# GuardShell hackathon demo helper. Every destructive-looking command below is reviewed only.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[1/6] Running the deterministic test suite"
python3 cli/test_guardshell.py

echo "[2/6] Safe review"
python3 cli/guardshell.py review -- "whoami"

echo "[3/6] Scoped safe execution"
python3 cli/guardshell.py safe-run -- "whoami"

echo "[4/6] Service-change review"
python3 cli/guardshell.py review -- "sudo systemctl restart nginx"

echo "[5/6] Bulk-delete review only — not executed"
python3 cli/guardshell.py review -- "rm -rf project/*"

echo "[6/6] Critical root-delete review only — not executed"
python3 cli/guardshell.py review -- "sudo rm -rf /"

echo "Demo review sequence complete. Inspect the ledger with: python3 cli/guardshell.py audit --limit 10"
