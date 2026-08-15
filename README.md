# GuardShell AI

> **A local Linux command-safety agent that turns a risky instruction into a review, an audit event, and a workable runbook.**

GuardShell AI is an explainable safety layer for Linux command execution. Before a command runs, the local agent inspects its structure and host context, classifies risk through deterministic policy, records a durable SQLite audit event, and produces a targeted remediation plan. It can execute only a deliberately narrow allowlist of Safe inspection commands without using a shell.

The product is not a cloud shell and does not grant an AI model authority over system actions. The browser workbench is a local companion interface; the local Linux agent owns review, policy decisions, audit storage, and permitted execution.

## Why GuardShell

Linux command mistakes are often immediate and difficult to reverse. A wildcard delete, an unreviewed remote script, an over-broad permission change, a service restart, or a package purge can have consequences that are not clear from a single terminal line. GuardShell gives the operator a second, explainable checkpoint before action.

| GuardShell capability | Practical outcome |
| --- | --- |
| Deterministic risk policy | Blocks critical patterns such as root/system deletion, filesystem formatting, device overwrite, and fork bombs. |
| Local SQLite event ledger | Records reviewed commands, local context, policy decision, evidence, remediation, and any safe execution result. |
| Operator runbook | Gives concrete preview, backup, least-privilege, validation, or rollback-aware steps for the detected issue. |
| Scoped safe execution | Runs only a small allowlist (`whoami`, `id`, `pwd`, `uname`, `uptime`, `df`, `du`, and `ls`) using `subprocess.run` with `shell=False`. |
| Optional local open-source model | Uses Ollama only to explain an already-determined policy result; it cannot change risk, action, or execution eligibility. |

## Architecture and trust boundary

```text
Linux operator or local browser workbench
                |
                v
      Loopback GuardShell agent (127.0.0.1)
                |
      +---------+----------+-------------+
      |                    |             |
      v                    v             v
Deterministic policy   SQLite ledger   Optional Ollama explanation
      |
      v
Block | require review | return remediation | safe-run allowlist only
```

The policy engine has final authority. The optional model can explain a decision in plain language, but it cannot allow a blocked command, weaken a risk level, or initiate execution.

## Quick start on Linux

GuardShell uses only the Python standard library for its local agent.

```bash
git clone https://github.com/sagar-grv/guardshell-ai.git
cd guardshell-ai
python3 cli/test_guardshell.py

# Review a command without execution
python3 cli/guardshell.py review -- "rm -rf project/*"

# Run a Safe allowlisted command without using a shell
python3 cli/guardshell.py safe-run -- "whoami"

# Inspect persisted local audit events
python3 cli/guardshell.py audit --limit 20
```

Start the loopback-only local agent and optional browser workbench:

```bash
pnpm install
pnpm build
python3 cli/guardshelld.py --ui dist/public
```

Then open `http://127.0.0.1:8787` on the same Linux machine. The interface connects to `/v1/review`, `/v1/safe-run`, and `/v1/events`; it does not expose an unrestricted remote command endpoint.

## Open-source AI explanation mode

For the hackathon AI demonstration, run an open-source model locally with Ollama. This is an optional explanation layer, not a policy authority.

```bash
# Install Ollama according to your Linux distribution, then download a local model.
ollama pull llama3.2

# GuardShell still makes the deterministic safety decision first.
python3 cli/guardshell.py review --ollama-model llama3.2 -- "sudo systemctl restart nginx"
```

If Ollama is unavailable, GuardShell falls back to deterministic explanations and records that the local model was not used.

## Safety modes

| Mode | What it does | What it cannot do |
| --- | --- | --- |
| `review` | Analyzes and records a command. | It never executes the command. |
| `plan` | Produces and records an operator runbook. | It never executes the command. |
| `safe-run` | Executes an allowlisted Safe command without a shell. | It rejects pipes, redirects, substitutions, chained commands, unknown executables, and non-Safe decisions. |
| `audit` | Reads the local event ledger. | It does not modify audit history. |

## Tested scenarios

The included test suite covers safe inspection, privileged service actions, bulk deletion, remote-script execution, recursive permission changes, package removal, root deletion, filesystem formatting, audit persistence, and safe-run shell-composition rejection.

```bash
python3 cli/test_guardshell.py
```

## Important limitations

GuardShell is a hackathon MVP, not a replacement for Linux permissions, mandatory access controls, endpoint protection, or independent security review. It does not fully parse arbitrary shell scripts, aliases, environment expansion, or custom binaries. Production rollout should add AST parsing, signed policy packs, least-privilege service accounts, protected audit storage, sandboxed execution, policy-change review, and broader distribution-specific testing.

## Repository structure

| Path | Purpose |
| --- | --- |
| `cli/guardshell.py` | Local command-review, policy, audit, remediation, and safe-run agent. |
| `cli/guardshelld.py` | Loopback-only HTTP bridge for the local workbench. |
| `cli/test_guardshell.py` | Deterministic policy, audit, and execution safety tests. |
| `client/` | Shift Ledger browser workbench for the local agent. |
| `docs/LOCAL_AGENT.md` | Local setup and browser-companion instructions. |
| `docs/PRODUCTION_MODEL.md` | Trust boundary, operating modes, and production limitations. |

## License

Released under the [MIT License](LICENSE).
