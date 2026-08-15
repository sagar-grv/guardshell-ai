# Source this file from your Bash profile after setting GUARDSHELL_HOME.
# Example: export GUARDSHELL_HOME="$HOME/projects/guardshell-ai/cli"

gs() {
  python3 "${GUARDSHELL_HOME:?Set GUARDSHELL_HOME to the cli directory}/guardshell.py" review -- "$*"
}

gsplan() {
  python3 "${GUARDSHELL_HOME:?Set GUARDSHELL_HOME to the cli directory}/guardshell.py" plan -- "$*"
}

gssafe() {
  python3 "${GUARDSHELL_HOME:?Set GUARDSHELL_HOME to the cli directory}/guardshell.py" safe-run -- "$*"
}
