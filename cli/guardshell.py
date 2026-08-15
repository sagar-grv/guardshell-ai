#!/usr/bin/env python3
"""GuardShell AI: local Linux command review, remediation planning, and scoped safe execution.

The deterministic policy engine always owns the execution decision. An optional
local Ollama model can enrich explanation text, but it never changes risk,
policy action, remediation steps, or safe-execution eligibility.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import platform
import re
import shlex
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


DEFAULT_DB = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local" / "state")) / "guardshell" / "events.db"
SAFE_EXECUTABLES = {"whoami", "id", "pwd", "uname", "uptime", "df", "du", "ls"}
RISK_ORDER = {"Safe": 0, "Caution": 1, "High Risk": 2, "Critical": 3}


@dataclass(frozen=True)
class Rule:
    rule_id: str
    pattern: re.Pattern[str]
    risk: str
    score: int
    action: str
    intent: str
    impact: str
    evidence: tuple[str, ...]
    remediation_kind: str


@dataclass
class Assessment:
    command: str
    risk: str
    score: int
    decision: str
    intent: str
    impact: str
    evidence: list[str]
    remediation: list[dict[str, str]]
    rule_id: str
    context: dict[str, Any]
    timestamp: str
    explanation_source: str = "deterministic-policy"
    model_note: str | None = None


RULES = [
    Rule(
        "root-recursive-delete",
        re.compile(r"(?:sudo\s+)?rm\s+-[a-z]*r[a-z]*f[a-z]*\s+/?(?:\s|$)|(?:sudo\s+)?rm\s+-[a-z]*f[a-z]*r[a-z]*\s+/?(?:\s|$)", re.I),
        "Critical", 100, "blocked",
        "Recursively delete the root filesystem.",
        "This can remove essential operating-system files and make the host unrecoverable without restoration.",
        ("Recursive forced deletion detected", "Root filesystem is targeted"),
        "critical-stop",
    ),
    Rule(
        "protected-system-delete",
        re.compile(r"(?:sudo\s+)?rm\s+-[a-z]*r[a-z]*f[a-z]*\s+/(?:etc|usr|boot|bin|sbin|var)(?:/|\s|$)|(?:sudo\s+)?rm\s+-[a-z]*f[a-z]*r[a-z]*\s+/(?:etc|usr|boot|bin|sbin|var)(?:/|\s|$)", re.I),
        "Critical", 98, "blocked",
        "Recursively delete a protected Linux system directory.",
        "The target contains system configuration, binaries, boot files, or operational state needed by the host.",
        ("Recursive forced deletion detected", "Protected system path detected"),
        "critical-stop",
    ),
    Rule(
        "filesystem-or-device-destruction",
        re.compile(r"\bmkfs(?:\.|\s)|\b(?:dd|cat)\b.*\bof=/dev/|\b(?:wipefs|parted|fdisk)\b.*(?:/dev/|--wipe)", re.I),
        "Critical", 98, "blocked",
        "Modify or overwrite a block device or filesystem.",
        "This can destroy partitions, filesystems, or all data on an attached device.",
        ("Block-device or filesystem operation detected", "Destructive recovery risk"),
        "critical-stop",
    ),
    Rule(
        "fork-bomb",
        re.compile(r":\(\)\s*\{\s*:\|:&\s*\};:", re.I),
        "Critical", 100, "blocked",
        "Create an uncontrolled process fork.",
        "This can exhaust CPU and process capacity until the system becomes unavailable.",
        ("Known fork-bomb structure detected",),
        "critical-stop",
    ),
    Rule(
        "remote-pipe-execution",
        re.compile(r"\b(?:curl|wget)\b[^|\n]*\|\s*(?:sudo\s+)?(?:bash|sh|zsh|fish)\b", re.I),
        "High Risk", 85, "guided",
        "Download and execute a remote script without inspecting it.",
        "Remote content can change before execution and may run with the current user's privileges.",
        ("Remote retrieval detected", "Piped shell execution detected"),
        "remote-script",
    ),
    Rule(
        "bulk-delete",
        re.compile(r"\brm\s+-[a-z]*r[a-z]*f[a-z]*\b.*(?:\*|~)|\brm\s+-[a-z]*f[a-z]*r[a-z]*\b.*(?:\*|~)|\bfind\b.*\s-delete\b", re.I),
        "High Risk", 78, "guided",
        "Delete a broad set of files through a wildcard, home path, or automatic find action.",
        "The set of matched files can be larger than intended and may not have a recovery path.",
        ("Bulk deletion pattern detected", "Wildcard, home path, or automatic delete action detected"),
        "bulk-delete",
    ),
    Rule(
        "recursive-permissions",
        re.compile(r"\b(?:chmod|chown)\s+-R\b|\bchmod\b.*\b777\b", re.I),
        "High Risk", 72, "guided",
        "Apply broad ownership or permission changes.",
        "Recursive permission changes can expose files, break service ownership, or make recovery harder.",
        ("Recursive ownership or permission change detected",),
        "permissions",
    ),
    Rule(
        "package-removal",
        re.compile(r"\b(?:apt|apt-get|dnf|yum|pacman)\s+(?:remove|purge|autoremove)\b", re.I),
        "High Risk", 68, "guided",
        "Remove Linux packages or dependencies.",
        "Package removal can cascade into service loss when shared dependencies are selected.",
        ("Package removal action detected",),
        "package-removal",
    ),
    Rule(
        "protected-configuration-write",
        re.compile(r"(?:>|>>|\btee\b)\s*/(?:etc|boot|usr|var)/", re.I),
        "Caution", 55, "confirm",
        "Write directly to protected system configuration or operational state.",
        "A malformed write can prevent a service from starting or alter system behavior for other users.",
        ("Write to protected system path detected",),
        "config-write",
    ),
    Rule(
        "service-change",
        re.compile(r"\bsystemctl\s+(?:start|stop|restart|reload|disable|mask|enable)\b|\bkill\s+-9\b|\bdocker\s+system\s+prune\b", re.I),
        "Caution", 48, "confirm",
        "Change a running service or forcefully terminate a process.",
        "The action may interrupt users, discard in-flight work, or affect service availability.",
        ("Service or process-control operation detected",),
        "service-change",
    ),
    Rule(
        "privileged-command",
        re.compile(r"\bsudo\b", re.I),
        "Caution", 42, "confirm",
        "Run a command with elevated privileges.",
        "The command can modify system-wide state beyond the current user's normal access scope.",
        ("Privilege escalation request detected",),
        "privileged-review",
    ),
    Rule(
        "shell-composition",
        re.compile(r"(?:&&|\|\||;|`|\$\(|\n)", re.I),
        "Caution", 38, "confirm",
        "Compose multiple shell operations into one instruction.",
        "Chaining makes the final effect harder to inspect and can hide conditional side effects.",
        ("Shell composition token detected",),
        "composition",
    ),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def command_parts(command: str) -> list[str]:
    try:
        return shlex.split(command)
    except ValueError:
        return []


def collect_context(command: str) -> dict[str, Any]:
    parts = command_parts(command)
    return {
        "user": getpass.getuser(),
        "cwd": os.getcwd(),
        "host": platform.node(),
        "effective_uid": os.geteuid() if hasattr(os, "geteuid") else None,
        "executable": parts[0] if parts else None,
        "arguments": parts[1:] if len(parts) > 1 else [],
    }


def remediation_plan(kind: str, command: str, context: dict[str, Any]) -> list[dict[str, str]]:
    executable = context.get("executable") or "the command"
    plans: dict[str, list[dict[str, str]]] = {
        "critical-stop": [
            {"step": "Stop", "detail": "Do not run this command. GuardShell blocks this category by non-overridable policy."},
            {"step": "Verify intent", "detail": "Identify the exact asset or directory that needs maintenance, then work inside a restricted non-system path."},
            {"step": "Recover safely", "detail": "Use documented backup, package-repair, or recovery procedures rather than a broad destructive action."},
        ],
        "remote-script": [
            {"step": "Download only", "detail": "Fetch the script to a dedicated temporary directory without executing it."},
            {"step": "Inspect", "detail": "Read the file, review its source, and verify a published checksum or signature if one exists."},
            {"step": "Test in scope", "detail": "Run only after review, preferably in a sandbox or disposable test host."},
        ],
        "bulk-delete": [
            {"step": "Preview targets", "detail": "Use a read-only listing command to inspect every target before deletion."},
            {"step": "Archive first", "detail": "Move the target set into a timestamped archive or filesystem trash when practical."},
            {"step": "Narrow scope", "detail": "Replace broad wildcards with an explicit directory and a known file pattern."},
        ],
        "permissions": [
            {"step": "Inspect ownership", "detail": "Review the current owner, group, and mode for the specific target before changing it."},
            {"step": "Use least privilege", "detail": "Apply only the minimum access required for the intended user or service."},
            {"step": "Avoid recursion by default", "detail": "Apply a change to one verified path before expanding to a directory tree."},
        ],
        "package-removal": [
            {"step": "Simulate removal", "detail": "Use the package manager's simulation or dependency view before confirming removal."},
            {"step": "Check dependents", "detail": "Identify affected services and packages that rely on the selected component."},
            {"step": "Record rollback", "detail": "Capture the package name and version so the component can be restored deliberately."},
        ],
        "config-write": [
            {"step": "Read current state", "detail": "Inspect the existing configuration and its service-specific validation rules."},
            {"step": "Create a backup", "detail": "Copy the configuration to a timestamped backup before any write."},
            {"step": "Validate before reload", "detail": "Use the service's configuration test before restarting or reloading it."},
        ],
        "service-change": [
            {"step": "Inspect status", "detail": "Check current status, recent logs, and dependent services before changing state."},
            {"step": "Plan recovery", "detail": "Know the reverse action and a health check before restarting, stopping, or disabling a service."},
            {"step": "Confirm scope", "detail": "Verify that the target service is the intended unit on this host."},
        ],
        "privileged-review": [
            {"step": "Confirm need", "detail": "Verify that elevated privileges are necessary for the intended operation."},
            {"step": "Constrain target", "detail": "Use the smallest command scope and avoid broad paths or implicit shell expansion."},
            {"step": "Review output", "detail": "Check results and logs immediately after the privileged operation."},
        ],
        "composition": [
            {"step": "Split the command", "detail": "Review each pipeline or chained command independently before combining them."},
            {"step": "Make data flow explicit", "detail": "Inspect intermediate output rather than passing it directly to a subsequent action."},
            {"step": "Rebuild safely", "detail": "Use a simple command sequence with a visible stop point between actions."},
        ],
    }
    return plans.get(kind, [
        {"step": "Review", "detail": f"Inspect the arguments passed to {executable} before execution."},
        {"step": "Run in scope", "detail": "Use the smallest target set and validate the resulting output."},
    ])


def assess(command: str) -> Assessment:
    normalized = " ".join(command.lower().split())
    context = collect_context(command)
    for rule in RULES:
        if rule.pattern.search(normalized):
            return Assessment(
                command=command,
                risk=rule.risk,
                score=rule.score,
                decision=rule.action,
                intent=rule.intent,
                impact=rule.impact,
                evidence=list(rule.evidence),
                remediation=remediation_plan(rule.remediation_kind, command, context),
                rule_id=rule.rule_id,
                context=context,
                timestamp=utc_now(),
            )
    return Assessment(
        command=command,
        risk="Safe",
        score=12,
        decision="allowed",
        intent="Inspect system information or files without a known destructive pattern.",
        impact="No immediate destructive behavior was identified by the current local policy.",
        evidence=["No protected-path write detected", "No privilege escalation detected", "No destructive policy pattern detected"],
        remediation=remediation_plan("safe", command, context),
        rule_id="safe-baseline",
        context=context,
        timestamp=utc_now(),
    )


def enrich_with_ollama(assessment: Assessment, model: str) -> Assessment:
    prompt = {
        "task": "Explain a pre-classified Linux command safety decision in one neutral sentence for an operator.",
        "command": assessment.command,
        "risk": assessment.risk,
        "policy_action": assessment.decision,
        "intent": assessment.intent,
        "impact": assessment.impact,
        "constraint": "Do not alter the risk, policy action, or remediation. Return only an explanation sentence.",
    }
    body = json.dumps({"model": model, "prompt": json.dumps(prompt), "stream": False}).encode()
    request = urllib.request.Request("http://127.0.0.1:11434/api/generate", data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode())
        note = str(payload.get("response", "")).strip()
        if note:
            assessment.model_note = note[:600]
            assessment.explanation_source = f"deterministic-policy + ollama:{model}"
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        assessment.model_note = "Local model unavailable; GuardShell used the deterministic explanation."
    return assessment


class AuditStore:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    command TEXT NOT NULL,
                    risk TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    decision TEXT NOT NULL,
                    rule_id TEXT NOT NULL,
                    intent TEXT NOT NULL,
                    impact TEXT NOT NULL,
                    evidence_json TEXT NOT NULL,
                    remediation_json TEXT NOT NULL,
                    context_json TEXT NOT NULL,
                    execution_json TEXT,
                    explanation_source TEXT NOT NULL,
                    model_note TEXT
                )
                """
            )

    def record(self, assessment: Assessment, execution: dict[str, Any] | None = None) -> int:
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO events (
                    created_at, command, risk, score, decision, rule_id, intent, impact,
                    evidence_json, remediation_json, context_json, execution_json,
                    explanation_source, model_note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    assessment.timestamp, assessment.command, assessment.risk, assessment.score,
                    assessment.decision, assessment.rule_id, assessment.intent, assessment.impact,
                    json.dumps(assessment.evidence), json.dumps(assessment.remediation),
                    json.dumps(assessment.context), json.dumps(execution) if execution else None,
                    assessment.explanation_source, assessment.model_note,
                ),
            )
            return int(cursor.lastrowid)

    def events(self, limit: int = 20) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        output: list[dict[str, Any]] = []
        for row in rows:
            event = dict(row)
            for key in ("evidence_json", "remediation_json", "context_json", "execution_json"):
                if event.get(key):
                    event[key] = json.loads(event[key])
            output.append(event)
        return output


def safe_execute(command: str) -> dict[str, Any]:
    if any(token in command for token in ("|", ";", "&&", "||", ">", "<", "`", "$(", "\n")):
        raise ValueError("safe-run rejects shell composition, redirects, and substitutions")
    try:
        parts = shlex.split(command)
    except ValueError as exc:
        raise ValueError(f"unable to parse command safely: {exc}") from exc
    if not parts:
        raise ValueError("no command supplied")
    if parts[0] not in SAFE_EXECUTABLES or "/" in parts[0]:
        raise ValueError(f"{parts[0]!r} is not in the GuardShell safe-run allowlist")
    result = subprocess.run(parts, text=True, capture_output=True, timeout=10, check=False, shell=False)
    return {"exit_code": result.returncode, "stdout": result.stdout[-4000:], "stderr": result.stderr[-4000:], "executed_at": utc_now()}


def render_assessment(assessment: Assessment, event_id: int | None = None) -> str:
    line = "=" * 76
    evidence = "\n".join(f"  [x] {item}" for item in assessment.evidence)
    runbook = "\n".join(f"  {index + 1}. {item['step']}: {item['detail']}" for index, item in enumerate(assessment.remediation))
    record = f"EVENT #{event_id}\n" if event_id else ""
    model_note = f"\nLocal model note: {assessment.model_note}\n" if assessment.model_note else ""
    return (
        f"{line}\n{record}GuardShell review | {assessment.risk.upper()} | risk {assessment.score}/100\n{line}\n"
        f"Command:  {assessment.command}\n"
        f"Policy:   {assessment.decision.upper()} ({assessment.rule_id})\n"
        f"Context:  {assessment.context.get('user')}@{assessment.context.get('host')} in {assessment.context.get('cwd')}\n\n"
        f"Intent:   {assessment.intent}\n\nImpact:   {assessment.impact}\n\nEvidence:\n{evidence}\n\n"
        f"Runbook:\n{runbook}{model_note}\n"
    )


def command_from_remainder(parts: Iterable[str]) -> str:
    values = list(parts)
    if values[:1] == ["--"]:
        values = values[1:]
    return " ".join(values).strip()


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="GuardShell AI local Linux command safety agent")
    root.add_argument("--db", type=Path, default=DEFAULT_DB, help="SQLite audit database path")
    sub = root.add_subparsers(dest="mode", required=True)

    def add_command_args(target: argparse.ArgumentParser, with_model: bool = False) -> None:
        if with_model:
            target.add_argument("--ollama-model", help="Optional local Ollama model used only for an explanation note")
        target.add_argument("--json", action="store_true", help="Print a structured JSON response")
        target.add_argument("command", nargs=argparse.REMAINDER, help="Command to inspect; separate it with --")

    add_command_args(sub.add_parser("review", help="Review and audit a command"), with_model=True)
    add_command_args(sub.add_parser("plan", help="Create and audit a remediation runbook"), with_model=True)
    add_command_args(sub.add_parser("safe-run", help="Run an allowlisted Safe command without a shell"))
    audit = sub.add_parser("audit", help="Read local GuardShell audit events")
    audit.add_argument("--limit", type=int, default=20, help="Number of latest events to print")
    audit.add_argument("--json", action="store_true", help="Print structured JSON")
    return root


def main(argv: list[str] | None = None) -> int:
    raw = list(argv if argv is not None else sys.argv[1:])
    modes = {"review", "plan", "safe-run", "audit", "-h", "--help"}
    if raw and raw[0] not in modes and raw[0] != "--db":
        raw = ["review", *raw]
    args = parser().parse_args(raw)
    store = AuditStore(args.db)

    if args.mode == "audit":
        events = store.events(max(1, min(args.limit, 200)))
        if args.json:
            print(json.dumps(events, indent=2))
        else:
            for event in events:
                print(f"#{event['id']:04d} {event['created_at']} {event['risk']:<9} {event['decision']:<8} $ {event['command']}")
        return 0

    command = command_from_remainder(args.command)
    if not command:
        parser().error("provide a Linux command after --, for example: guardshell review -- 'du -sh .' ")
    assessment = assess(command)
    if getattr(args, "ollama_model", None):
        assessment = enrich_with_ollama(assessment, args.ollama_model)

    execution: dict[str, Any] | None = None
    if args.mode == "safe-run":
        if assessment.decision != "allowed":
            event_id = store.record(assessment, {"state": "denied", "reason": "safe-run requires a Safe decision"})
            print(render_assessment(assessment, event_id), file=sys.stderr)
            print("GuardShell did not execute the command: safe-run requires a Safe decision.", file=sys.stderr)
            return 4
        try:
            execution = safe_execute(command)
        except (ValueError, subprocess.TimeoutExpired) as exc:
            event_id = store.record(assessment, {"state": "denied", "reason": str(exc)})
            print(render_assessment(assessment, event_id), file=sys.stderr)
            print(f"GuardShell did not execute the command: {exc}", file=sys.stderr)
            return 5

    event_id = store.record(assessment, execution)
    if args.json:
        payload = asdict(assessment)
        payload["event_id"] = event_id
        payload["execution"] = execution
        print(json.dumps(payload, indent=2))
    else:
        print(render_assessment(assessment, event_id))
        if execution:
            print("Execution result:")
            print(execution["stdout"], end="")
            if execution["stderr"]:
                print(execution["stderr"], file=sys.stderr)
            return int(execution["exit_code"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
