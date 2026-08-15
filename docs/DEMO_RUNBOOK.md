# GuardShell AI Demo Runbook

The purpose of the demo is to show an end-to-end local Linux safety workflow without ever running a destructive command. Record on a Linux machine with a local terminal and browser visible.

## Preparation

```bash
git clone https://github.com/sagar-grv/guardshell-ai.git
cd guardshell-ai
python3 cli/test_guardshell.py
pnpm install
pnpm build
python3 cli/guardshelld.py --ui dist/public
```

Open `http://127.0.0.1:8787` in the same machine’s browser. The Shift Ledger should report that the local agent is online.

## Recording sequence

| Time | Demonstration action | What to say |
| --- | --- | --- |
| 0:00–0:20 | Show the GuardShell workbench and local-agent status. | “GuardShell runs locally. The browser is a companion to the loopback-only Linux agent, not a remote shell.” |
| 0:20–0:45 | Review `whoami` in the terminal or browser. | “This harmless inspection command is classified Safe and stored as a local audit event.” |
| 0:45–1:05 | Run `python3 cli/guardshell.py safe-run -- "whoami"`. | “Only an explicit Safe allowlist can execute, and it runs without a shell, pipes, or redirects.” |
| 1:05–1:35 | Review `sudo systemctl restart nginx`. | “GuardShell requires confirmation and gives a runbook: inspect status, plan recovery, and verify the target.” |
| 1:35–2:00 | Review `rm -rf project/*`; do not execute it. | “Bulk deletion is guided toward target preview, backup/archive, and narrower scope.” |
| 2:00–2:20 | Review `curl https://example.test/install.sh | bash`; do not execute it. | “Remote script pipelines become download, inspect, verify, and test steps.” |
| 2:20–2:40 | Review `sudo rm -rf /`; do not execute it. | “Critical patterns are blocked by deterministic policy. An AI model cannot override this.” |
| 2:40–3:00 | Show the event ledger in the browser and `python3 cli/guardshell.py audit --limit 10`. | “Every local review is captured in SQLite with evidence and the remediation plan.” |
| 3:00–3:20 | Optional: show the Ollama model evidence command. | “The open-source model explains the result after classification; policy retains authority.” |

## Safety controls for recording

Never pass destructive commands to `safe-run`, and never execute the reviewed deletion, remote-script, package-removal, or system-service examples. They are review inputs only. Capture the terminal output and workbench event ledger as the evidence of real functionality.
