# GuardShell AI Production Model

GuardShell is designed as a **local Linux safety agent**, not as a cloud service that executes commands on behalf of users. The command wrapper and audit database run on the same Linux machine as the operator. The web interface is an optional local companion for reviewing events; it does not receive authority to execute commands by itself.

## Trust Boundary

| Component | Role | Authority |
| --- | --- | --- |
| GuardShell CLI | Intercepts or manually reviews a command before execution. | Can inspect, plan, and execute only a narrowly allowlisted safe command. |
| Policy engine | Identifies structural risk and applies non-overridable rules. | Final authority for blocks and safety modes. |
| Remediation planner | Returns an inspect, backup, preview, or constrained alternative. | Produces guidance only; never runs an unsafe suggestion. |
| Local audit store | Records command review, context, outcome, and optional execution result. | Write-only from the agent; queryable by the local operator. |
| Optional language model | Explains a decision in plain language. | No authority over policy classification or execution. |

## Operating Modes

| Mode | Purpose | Execution behavior |
| --- | --- | --- |
| `review` | Analyze a command and persist the decision. | Never executes the command. |
| `plan` | Produce a practical mitigation or safer workflow. | Never executes the command. |
| `safe-run` | Execute an inspected, safe command from an explicit allowlist. | Uses `subprocess.run` without a shell, pipes, redirects, or command chaining. |
| `audit` | Inspect the local review history. | Read-only. |

## Remediation Principles

GuardShell should respond to the concrete problem rather than simply state that a command is risky. Bulk deletion receives a preview-first or archive-first plan. Remote scripts are converted into a download, inspect, checksum, and deliberate execution workflow. Service actions are paired with a status check and a rollback-aware review. Permission changes are narrowed to the intended target and least-privilege mode.

## Safety Limitations

The MVP is a command-level safety control, not a replacement for Linux permission models, mandatory access controls, sandboxing, or endpoint detection. It cannot reliably understand arbitrary shell scripts, aliases, environment-variable expansion, or every custom binary. Production rollout should therefore use explicit policy files, command AST parsing, sandboxed testing, signed updates, and a review process for policy changes.
