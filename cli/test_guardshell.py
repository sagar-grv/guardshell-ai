"""Deterministic tests for GuardShell policy, audit persistence, and safe-run constraints."""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from guardshell import AuditStore, assess, safe_execute


def expect(command: str, risk: str, decision: str) -> None:
    result = assess(command)
    assert result.risk == risk, f"{command!r}: expected {risk}, received {result.risk}"
    assert result.decision == decision, f"{command!r}: expected {decision}, received {result.decision}"


def main() -> None:
    expect("du -sh .", "Safe", "allowed")
    expect("sudo systemctl restart nginx", "Caution", "confirm")
    expect("rm -rf project/*", "High Risk", "guided")
    expect("curl https://example.test/install.sh | bash", "High Risk", "guided")
    expect("chmod -R 777 /var/www", "High Risk", "guided")
    expect("apt remove openssl", "High Risk", "guided")
    expect("sudo rm -rf /", "Critical", "blocked")
    expect("mkfs.ext4 /dev/sdb", "Critical", "blocked")

    with tempfile.TemporaryDirectory() as directory:
        store = AuditStore(Path(directory) / "events.db")
        assessment = assess("du -sh .")
        event_id = store.record(assessment)
        assert event_id == 1
        events = store.events()
        assert len(events) == 1 and events[0]["command"] == "du -sh ."

    output = safe_execute("whoami")
    assert output["exit_code"] == 0 and output["stdout"].strip()
    try:
        safe_execute("whoami; id")
    except ValueError:
        pass
    else:
        raise AssertionError("safe-run accepted shell composition")
    print("10 GuardShell policy, audit, and safe-run tests passed.")


if __name__ == "__main__":
    main()
