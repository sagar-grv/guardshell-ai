#!/usr/bin/env python3
"""GuardShell AI CLI prototype.

Signal Lantern design principle: deterministic policy controls execution;
the explanation layer makes the decision understandable to the operator.
"""

from __future__ import annotations

import argparse
import json
import re
import shlex
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Callable


@dataclass(frozen=True)
class Decision:
    command: str
    risk: str
    score: int
    intent: str
    impact: str
    evidence: list[str]
    safer_alternative: str
    action: str
    timestamp: str


@dataclass(frozen=True)
class PolicyRule:
    pattern: re.Pattern[str]
    risk: str
    score: int
    intent: str
    impact: str
    evidence: list[str]
    safer_alternative: str
    action: str


RULES = [
    PolicyRule(
        re.compile(r"sudo\s+rm\s+-rf\s+/?\s*($|[;&|])|rm\s+-rf\s+/$"),
        "Critical", 100,
        "Recursively delete the Linux root filesystem with elevated privileges.",
        "This can remove essential operating-system files, prevent booting, and cause irreversible data loss.",
        ["Root privilege request detected", "Recursive forced deletion detected", "Protected root path targeted"],
        "Do not execute this command. Inspect the intended target and use a restricted path instead.",
        "blocked",
    ),
    PolicyRule(
        re.compile(r"mkfs(\.|\s)|dd\s+.*of=/dev/|:\(\)\s*\{\s*:\|:&\s*\};:"),
        "Critical", 98,
        "Overwrite a device filesystem or launch an uncontrolled process fork.",
        "This can destroy a filesystem or exhaust available system resources.",
        ["Destructive device or filesystem operation detected", "Critical recovery risk"],
        "Run only in an isolated test environment after verifying the device identifier.",
        "blocked",
    ),
    PolicyRule(
        re.compile(r"(?:curl|wget)\s+[^|]+\|\s*(?:sudo\s+)?(?:ba)?sh"),
        "High Risk", 84,
        "Download and immediately execute a remote script.",
        "The remote content may be unreviewed, mutable, and able to run with your privileges.",
        ["Remote retrieval detected", "Piped execution detected", "Script is not inspected first"],
        "Download first, inspect with less, and execute only after verifying its content and source.",
        "guided",
    ),
    PolicyRule(
        re.compile(r"rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r).*\*|find\s+.*-delete"),
        "High Risk", 78,
        "Perform recursive or bulk file deletion.",
        "Matched files may be removed without a recovery path, particularly when a wildcard expands unexpectedly.",
        ["Bulk deletion pattern detected", "Wildcard or automatic deletion detected"],
        "Preview targets with find <path> -maxdepth 1 -print, or move files to a dated archive first.",
        "guided",
    ),
    PolicyRule(
        re.compile(r"chmod\s+-R\s+777|chown\s+-R|sudo\s+(?:apt|dnf|yum|pacman)\s+(?:remove|purge)"),
        "High Risk", 72,
        "Broadly change access permissions or remove system packages.",
        "Overly permissive ownership or dependency removal can expose services or interrupt software.",
        ["Recursive permissions or package removal detected", "System-wide side effect possible"],
        "Verify the exact target and apply the narrowest necessary permission or package change.",
        "guided",
    ),
    PolicyRule(
        re.compile(r"\bsudo\b|>\s*/etc/|systemctl\s+(?:stop|restart|disable)|kill\s+-9"),
        "Caution", 46,
        "Use elevated access or alter an active service or protected configuration.",
        "The command can interrupt a service, replace configuration, or affect other system users.",
        ["Privilege, service control, or protected configuration detected"],
        "Confirm the target and inspect its current state before committing the change.",
        "confirm",
    ),
]

SAFE_EXECUTABLES = {"pwd", "whoami", "id", "uname", "uptime", "df", "du", "ls", "find"}


def analyze(command: str) -> Decision:
    normalized = " ".join(command.lower().split())
    for rule in RULES:
        if rule.pattern.search(normalized):
            return Decision(
                command=command,
                risk=rule.risk,
                score=rule.score,
                intent=rule.intent,
                impact=rule.impact,
                evidence=rule.evidence,
                safer_alternative=rule.safer_alternative,
                action=rule.action,
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
    return Decision(
        command=command,
        risk="Safe",
        score=12,
        intent="Inspect files, processes, or system information without a detected destructive action.",
        impact="No immediate destructive pattern was found by the prototype policy.",
        evidence=["No protected-path write detected", "No privilege escalation detected", "No destructive pattern detected"],
        safer_alternative="No safer alternative is required. Review output before using it in production.",
        action="allowed",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def render(decision: Decision) -> str:
    width = 72
    evidence = "\n".join(f"  - {item}" for item in decision.evidence)
    return (
        f"{'=' * width}\n"
        f"GuardShell AI | {decision.risk.upper()} | risk score {decision.score}/100\n"
        f"{'=' * width}\n"
        f"Command:  {decision.command}\n\n"
        f"Intent:   {decision.intent}\n\n"
        f"Impact:   {decision.impact}\n\n"
        f"Evidence:\n{evidence}\n\n"
        f"Safer next step: {decision.safer_alternative}\n\n"
        f"Policy action: {decision.action.upper()}\n"
    )


def execute_safe(command: str) -> int:
    """Execute only an explicitly allowlisted, non-shell command after a Safe decision."""
    try:
        arguments = shlex.split(command)
    except ValueError as exc:
        print(f"Unable to parse command safely: {exc}", file=sys.stderr)
        return 2
    if not arguments or arguments[0] not in SAFE_EXECUTABLES:
        print("Execution denied: command is not in GuardShell's safe demonstration allowlist.", file=sys.stderr)
        return 3
    if any(token in {"|", ">", ">>", "<", "&&", ";"} for token in arguments):
        print("Execution denied: shell composition tokens are not permitted in safe execution mode.", file=sys.stderr)
        return 3
    result = subprocess.run(arguments, check=False, text=True, capture_output=True, timeout=10)
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Explainable Linux command safety prototype")
    parser.add_argument("command", nargs=argparse.REMAINDER, help="Command to analyze. Use -- before commands beginning with a dash.")
    parser.add_argument("--json", action="store_true", help="Print the decision as JSON.")
    parser.add_argument("--execute-safe", action="store_true", help="Execute only a Safe command from the small allowlist.")
    args = parser.parse_args()
    command_parts = args.command[1:] if args.command[:1] == ["--"] else args.command
    command = " ".join(command_parts).strip()
    if not command:
        parser.error("provide a Linux command to analyze, for example: python3 cli/guardshell.py -- 'du -sh *'")
    decision = analyze(command)
    print(json.dumps(asdict(decision), indent=2) if args.json else render(decision))
    if args.execute_safe:
        if decision.action != "allowed":
            print("GuardShell will not execute a non-Safe command.", file=sys.stderr)
            return 4
        return execute_safe(command)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
