#!/usr/bin/env python3
"""Local HTTP bridge for GuardShell AI.

Bind to 127.0.0.1 only. This service intentionally exposes no unrestricted shell
endpoint; it delegates review and safe-run requests to the local deterministic
GuardShell agent.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
from dataclasses import asdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from guardshell import AuditStore, assess, safe_execute


class GuardShellHandler(BaseHTTPRequestHandler):
    store: AuditStore
    ui_dir: Path | None = None

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[guardshelld] {self.address_string()} {format % args}")

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status: int, payload: Any) -> None:
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def read_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 131072:
            raise ValueError("request body must be between 1 and 131072 bytes")
        payload = json.loads(self.rfile.read(length).decode())
        if not isinstance(payload, dict):
            raise ValueError("request body must be an object")
        return payload

    def review(self, mode: str) -> None:
        try:
            body = self.read_body()
            command = str(body.get("command", "")).strip()
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        if not command:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "command is required"})
            return
        assessment = assess(command)
        execution: dict[str, Any] | None = None
        if mode == "safe-run":
            if assessment.decision != "allowed":
                event_id = self.store.record(assessment, {"state": "denied", "reason": "safe-run requires a Safe decision"})
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "safe-run requires a Safe policy decision", "event_id": event_id, "assessment": asdict(assessment)})
                return
            try:
                execution = safe_execute(command)
            except (ValueError, TimeoutError) as exc:
                event_id = self.store.record(assessment, {"state": "denied", "reason": str(exc)})
                self.send_json(HTTPStatus.FORBIDDEN, {"error": str(exc), "event_id": event_id, "assessment": asdict(assessment)})
                return
        event_id = self.store.record(assessment, execution)
        response = asdict(assessment)
        response["event_id"] = event_id
        response["execution"] = execution
        self.send_json(HTTPStatus.OK, response)

    def serve_ui(self, path: str) -> bool:
        if self.ui_dir is None:
            return False
        requested = "index.html" if path == "/" else path.lstrip("/")
        candidate = (self.ui_dir / requested).resolve()
        try:
            candidate.relative_to(self.ui_dir.resolve())
        except ValueError:
            return False
        if not candidate.is_file():
            candidate = self.ui_dir / "index.html"
        if not candidate.is_file():
            return False
        content = candidate.read_bytes()
        content_type, _ = mimetypes.guess_type(str(candidate))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)
        return True

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self.send_json(HTTPStatus.OK, {"service": "guardshelld", "state": "ready", "bind": "127.0.0.1"})
        elif self.path.startswith("/v1/events"):
            self.send_json(HTTPStatus.OK, {"events": self.store.events(100)})
        elif not self.serve_ui(self.path):
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/v1/review":
            self.review("review")
        elif self.path == "/v1/plan":
            self.review("plan")
        elif self.path == "/v1/safe-run":
            self.review("safe-run")
        else:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})


def main() -> int:
    parser = argparse.ArgumentParser(description="Local GuardShell HTTP bridge")
    parser.add_argument("--host", default="127.0.0.1", choices=["127.0.0.1", "localhost"], help="Loopback host only")
    parser.add_argument("--port", type=int, default=8787, help="Local listener port")
    parser.add_argument("--db", type=Path, default=None, help="GuardShell SQLite audit path")
    parser.add_argument("--ui", type=Path, default=None, help="Optional built frontend directory to serve locally")
    args = parser.parse_args()
    GuardShellHandler.store = AuditStore(args.db) if args.db else AuditStore(Path.home() / ".local" / "state" / "guardshell" / "events.db")
    GuardShellHandler.ui_dir = args.ui.resolve() if args.ui else None
    server = ThreadingHTTPServer((args.host, args.port), GuardShellHandler)
    print(f"GuardShell local agent listening at http://{args.host}:{args.port}")
    print("Execution remains restricted to the safe-run allowlist.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGuardShell local agent stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
