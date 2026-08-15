# Running GuardShell as a Local Linux Safety Agent

GuardShell is intended to run on the Linux host where commands will be reviewed. This keeps command content, host context, and the SQLite audit log on the operator's machine.

## Installation

Clone the repository to the Linux machine and use Python 3.11 or later. The agent uses only the Python standard library, so no package installation is required.

```bash
git clone https://github.com/sagar-grv/guardshell-ai.git
cd guardshell-ai
python3 cli/test_guardshell.py
```

## Review, plan, execute, and audit

```bash
# Review a command without execution
python3 cli/guardshell.py review -- "rm -rf project/*"

# Produce and persist a remediation runbook
python3 cli/guardshell.py plan -- "curl https://example.test/install.sh | bash"

# Execute only a Safe command from the explicit read-only allowlist
python3 cli/guardshell.py safe-run -- "whoami"

# Read recent local audit events
python3 cli/guardshell.py audit --limit 20
```

The default audit database is `~/.local/state/guardshell/events.db`. Use `--db /path/to/events.db` for a specific local location.

## Shell integration

Set `GUARDSHELL_HOME` to the `cli` directory and source `guardshell.sh` from a Bash profile. The helper functions make review intentional rather than silently replacing shell execution.

```bash
export GUARDSHELL_HOME="$HOME/projects/guardshell-ai/cli"
source "$GUARDSHELL_HOME/guardshell.sh"
gs "systemctl restart nginx"
gsplan "rm -rf project/*"
gssafe "df -h"
```

## Local companion interface

The browser workbench can connect to the local agent at `http://127.0.0.1:8787`. The agent is intentionally loopback-only, so it cannot be reached from another computer on the network. Start it with the built frontend directory when you want a single local service.

```bash
pnpm build
python3 cli/guardshelld.py --ui dist/public
```

Open `http://127.0.0.1:8787` in the same Linux machine's browser. The page checks `/health`, reviews commands through `/v1/review`, displays persisted `/v1/events`, and only requests `/v1/safe-run` after the local policy returns a Safe decision.

## Optional local AI explanation

If Ollama is installed locally, GuardShell can request an additional explanation note without surrendering policy authority.

```bash
python3 cli/guardshell.py review --ollama-model llama3.2 -- "sudo systemctl restart nginx"
```

The model is asked only to explain the already-determined result. It cannot alter the risk level, block, remediation plan, or safe-run decision.
