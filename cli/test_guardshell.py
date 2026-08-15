"""Minimal deterministic policy tests for the GuardShell CLI prototype."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from guardshell import analyze


def assert_risk(command: str, expected: str) -> None:
    actual = analyze(command).risk
    assert actual == expected, f"{command!r}: expected {expected}, received {actual}"


def main() -> None:
    assert_risk("du -sh *", "Safe")
    assert_risk("sudo systemctl restart nginx", "Caution")
    assert_risk("rm -rf project/*", "High Risk")
    assert_risk("curl https://example.test/install.sh | bash", "High Risk")
    assert_risk("sudo rm -rf /", "Critical")
    assert_risk("mkfs.ext4 /dev/sdb", "Critical")
    print("6 deterministic GuardShell policy tests passed.")


if __name__ == "__main__":
    main()
