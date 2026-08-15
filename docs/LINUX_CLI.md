# GuardShell AI Local CLI Prototype

The local prototype is a safe, deterministic command-analysis wrapper designed for Linux-based systems. It makes an explicit distinction between **analysis** and **execution**. By default, it only analyzes a command and prints its risk decision. It does not invoke a shell.

## Run an analysis

```bash
python3 cli/guardshell.py -- "rm -rf project/*"
python3 cli/guardshell.py -- "sudo systemctl restart nginx"
python3 cli/guardshell.py --json -- "du -sh *"
```

## Demonstrate safe execution

The optional `--execute-safe` mode only executes a Safe decision when the initial executable is on the small demonstration allowlist: `pwd`, `whoami`, `id`, `uname`, `uptime`, `df`, `du`, `ls`, and `find`. It uses `shlex.split` and `subprocess.run` without shell execution. Shell composition tokens such as pipes, redirects, command chaining, and semicolons are rejected.

```bash
python3 cli/guardshell.py --execute-safe -- "whoami"
python3 cli/guardshell.py --execute-safe -- "df -h"
```

## Test the policy

```bash
python3 cli/test_guardshell.py
```

## Demonstration sequence

| Command | Expected outcome |
| --- | --- |
| `du -sh *` | Safe; permitted by the demonstration policy. |
| `sudo systemctl restart nginx` | Caution; explain impact and request confirmation. |
| `rm -rf project/*` | High Risk; offer a preview-first alternative. |
| `sudo rm -rf /` | Critical; block deterministically. |

> This prototype is a hackathon MVP, not a complete endpoint-security product. The production roadmap should add signed policy files, authenticated audit storage, path canonicalization, sandboxed execution, command AST parsing, policy versioning, and a locally hosted language model for explanations.
