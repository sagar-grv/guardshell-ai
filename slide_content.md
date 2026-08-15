# GuardShell AI — Hackathon Presentation

## Slide 1 — GuardShell AI

**Explainable safety layer for Linux command execution**

Tagline: *Inspect impact before it reaches the system.*

Visual direction: Dark graphite background, Signal Mint shield-and-terminal mark, minimal command beam reading `$ rm -rf project/*`, small “Linux-based AI safety” label.

## Slide 2 — The Problem

Linux commands are powerful, but the shell executes them without understanding the user’s intent. A mistyped or misunderstood command can delete data, change permissions, interrupt services, or damage the system.

Show three concise examples: `rm -rf project/*`, `curl … | bash`, and `sudo rm -rf /`. Contrast “shell executes” with “user needs to understand impact first.”

## Slide 3 — Our Objective

GuardShell AI places an explainable safety decision between the user and the Linux shell.

It identifies command intent, collects contextual signals, detects risk, explains possible impact, recommends a safer alternative, and only then permits, confirms, guides, or blocks the action.

Use a four-state risk spectrum: Safe, Caution, High Risk, Critical.

## Slide 4 — How It Works

Present the command journey:

1. User enters a Linux command.
2. GuardShell parses flags, paths, wildcards, pipes, redirects, and privileges.
3. Context and safety-policy rules evaluate the command.
4. AI explains intent and impact in plain language.
5. The policy engine chooses Allow, Confirm, Guide, or Block.
6. The result is recorded in an audit trail.

Use a clean horizontal flow rather than dense technical text.

## Slide 5 — Architecture

Use the provided architecture diagram.

Talking points: The deterministic rule engine is authoritative for critical decisions. The AI intent engine enriches explanations and safer alternatives. The production design runs locally on Linux using a CLI/Bash wrapper, SQLite audit log, and optional local open-source model.

## Slide 6 — Hybrid AI + Deterministic Security

Explain why a model must not have final authority over risky commands.

Left side: “AI layer” — intent, impact explanation, natural-language safer guidance.

Right side: “Deterministic policy” — protected paths, dangerous patterns, privilege checks, non-overridable critical blocks.

Centre statement: “AI can clarify an action. It cannot overrule a critical policy.”

## Slide 7 — Live Command Examples

Use a decision table with these four rows:

| Command | Decision | GuardShell response |
| --- | --- | --- |
| `du -sh *` | Safe | Allows controlled execution. |
| `sudo systemctl restart nginx` | Caution | Explains service impact and requests confirmation. |
| `rm -rf project/*` | High Risk | Recommends preview-first or backup-first workflow. |
| `sudo rm -rf /` | Critical | Blocks the action by deterministic policy. |

## Slide 8 — Working Prototype

Show the interactive browser workbench and local CLI prototype.

Browser demo: command input, risk score, intent, evidence, safer next step, audit history.

Linux CLI: standard-library Python implementation; runs deterministic analysis by default; limited allowlisted safe-execution demo uses `shlex.split` and `subprocess.run` without shell execution.

## Slide 9 — Innovation and Impact

Innovation: Command-level intent understanding, hybrid policy enforcement, explainable interventions, safer alternatives, and local-first auditability in a single Linux tool.

Impact: Helps students avoid accidental damage, assists developers during daily administration, supports system administrators with policy-aware command review, and creates an educational record of safe Linux practice.

## Slide 10 — Conclusion and Next Steps

GuardShell AI turns the Linux terminal from a blind execution channel into an explainable safety interaction.

Next steps: command AST parsing, policy versioning, sandboxed execution, signed policy packs, local model integration through Ollama, and enterprise-grade audit export.

Closing line: *Run the safer command instead.*
