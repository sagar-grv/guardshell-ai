# GuardShell AI

GuardShell AI is an explainable Linux command-safety layer. It inspects a command before execution, identifies its likely intent, detects risky patterns, explains possible impact, and proposes a safer alternative.

## What this repository contains

The browser demo in `client/` provides an interactive presentation of the GuardShell decision workflow. It **does not execute shell commands**. It applies a transparent, deterministic demonstration policy entirely in the browser and stores audit history locally in the browser.

The production design pairs this interface with a local Linux command wrapper. Deterministic policies retain final authority over critical actions; an optional local open-source model is used only for intent interpretation and plain-language explanations.

## Run the demo

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite, enter a command, and inspect the resulting explanation. Try `du -sh *`, `sudo systemctl restart nginx`, `rm -rf project/*`, and `sudo rm -rf /`.

## Run the Linux CLI prototype

The repository also includes a local, standard-library-only prototype in `cli/`. It analyzes commands by default and never invokes a shell. A deliberately small safe-execution demonstration mode is available for allowlisted inspection commands.

```bash
python3 cli/guardshell.py -- "rm -rf project/*"
python3 cli/test_guardshell.py
```

Read [the CLI guide](docs/LINUX_CLI.md) before using `--execute-safe`.

## Safety model

| Risk level | GuardShell action |
| --- | --- |
| Safe | Allows controlled execution in the production CLI. |
| Caution | Explains the impact and requires explicit confirmation. |
| High Risk | Recommends a safer, preview-first workflow. |
| Critical | Blocks the action through deterministic policy. |

## Hackathon note

This demo is intentionally non-executing so it is safe to deploy and demonstrate in a browser. The proposed Linux CLI architecture, system diagram, presentation content, and full submission copy are supplied separately in the submission package.
