/** Signal Lantern design: command analysis is transparent, rule-led, and operationally calm. */
export type RiskLevel = "Safe" | "Caution" | "High Risk" | "Critical";

export type CommandAnalysis = {
  command: string;
  risk: RiskLevel;
  score: number;
  intent: string;
  impact: string;
  evidence: string[];
  saferAlternative: string;
  decision: "Allowed" | "Confirm" | "Guide" | "Blocked";
  timestamp: string;
};

type Rule = {
  test: (command: string) => boolean;
  risk: RiskLevel;
  score: number;
  intent: string;
  impact: string;
  evidence: string[];
  saferAlternative: string;
};

const rules: Rule[] = [
  {
    test: (command) => /sudo\s+rm\s+-rf\s+\/?\s*($|[;&|])|rm\s+-rf\s+\/$/.test(command),
    risk: "Critical",
    score: 100,
    intent: "Recursively delete the Linux root filesystem with elevated privileges.",
    impact: "This can remove essential operating-system files, prevent booting, and cause irreversible data loss.",
    evidence: ["Root privilege request detected", "Recursive forced deletion detected", "Protected root path targeted"],
    saferAlternative: "Do not execute this command. Inspect the intended target and use a restricted path instead.",
  },
  {
    test: (command) => /mkfs(\.|\s)|dd\s+.*of=\/dev\/|:\(\)\s*\{\s*:\|:&\s*\};:/.test(command),
    risk: "Critical",
    score: 98,
    intent: "Overwrite a device filesystem or launch an uncontrolled process fork.",
    impact: "This can destroy a disk filesystem or exhaust system resources until the computer becomes unavailable.",
    evidence: ["Destructive device or filesystem operation detected", "Critical recovery risk"],
    saferAlternative: "Run this only in an isolated test environment after verifying the device identifier.",
  },
  {
    test: (command) => /curl\s+[^|]+\|\s*(sudo\s+)?(ba)?sh|wget\s+[^|]+\|\s*(sudo\s+)?(ba)?sh/.test(command),
    risk: "High Risk",
    score: 84,
    intent: "Download and immediately execute a remote script.",
    impact: "The downloaded content can change before execution and may run with your current privileges.",
    evidence: ["Remote network retrieval detected", "Piped execution detected", "Script content is not inspected first"],
    saferAlternative: "Download the file first, inspect it with `less script.sh`, then execute only after verification.",
  },
  {
    test: (command) => /rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)[^\n]*\*|find\s+.*-delete/.test(command),
    risk: "High Risk",
    score: 78,
    intent: "Perform recursive or bulk file deletion.",
    impact: "Matched files may be removed without a recovery step, especially when wildcards expand unexpectedly.",
    evidence: ["Bulk deletion pattern detected", "Wildcard or automatic delete action detected"],
    saferAlternative: "Preview targets first with `find <path> -maxdepth 1 -print` or move files to a dated archive.",
  },
  {
    test: (command) => /chmod\s+-R\s+777|chown\s+-R|sudo\s+(apt|dnf|yum|pacman)\s+(remove|purge)/.test(command),
    risk: "High Risk",
    score: 72,
    intent: "Broadly change access permissions or remove system packages.",
    impact: "Overly permissive ownership or package removal can expose services or disable dependencies.",
    evidence: ["Recursive permissions or package removal detected", "System-wide side effect possible"],
    saferAlternative: "Review the exact target first and apply the narrowest required permission or package change.",
  },
  {
    test: (command) => /sudo\b|>\s*\/etc\/|systemctl\s+(stop|restart|disable)|kill\s+-9/.test(command),
    risk: "Caution",
    score: 46,
    intent: "Use privileged access or alter an active system service or configuration.",
    impact: "The command may interrupt a service, replace configuration, or affect other users on the machine.",
    evidence: ["Elevated privilege, service control, or protected configuration detected"],
    saferAlternative: "Confirm the service or file target and consider `systemctl status <service>` or a backup before modifying it.",
  },
];

const safeAnalysis = (command: string): CommandAnalysis => ({
  command,
  risk: "Safe",
  score: 12,
  intent: "Inspect files, processes, or system information without a detected destructive action.",
  impact: "No immediate destructive pattern was found. The command is suitable to execute in the current demo policy.",
  evidence: ["No protected path write detected", "No privilege escalation detected", "No destructive command pattern detected"],
  saferAlternative: "No safer alternative is required. Review the output before using it in a production workflow.",
  decision: "Allowed",
  timestamp: new Date().toISOString(),
});

export function analyzeCommand(rawCommand: string): CommandAnalysis {
  const command = rawCommand.trim();
  if (!command) {
    return { ...safeAnalysis(""), score: 0, intent: "Awaiting a Linux command to inspect.", impact: "Enter a command to receive an explainable safety assessment.", evidence: ["No command entered"], saferAlternative: "Try a sample command from the command library.", decision: "Allowed" };
  }

  const normalized = command.toLowerCase().replace(/\s+/g, " ");
  const matched = rules.find((rule) => rule.test(normalized));
  if (!matched) return safeAnalysis(command);

  return {
    command,
    risk: matched.risk,
    score: matched.score,
    intent: matched.intent,
    impact: matched.impact,
    evidence: matched.evidence,
    saferAlternative: matched.saferAlternative,
    decision: matched.risk === "Critical" ? "Blocked" : matched.risk === "High Risk" ? "Guide" : "Confirm",
    timestamp: new Date().toISOString(),
  };
}

export const sampleCommands = [
  { label: "Safe inspection", command: "du -sh *" },
  { label: "Needs confirmation", command: "sudo systemctl restart nginx" },
  { label: "Safer path", command: "rm -rf project/*" },
  { label: "Blocked", command: "sudo rm -rf /" },
];

export const riskMeta: Record<RiskLevel, { color: string; short: string; detail: string }> = {
  Safe: { color: "#72F2B2", short: "SAFE", detail: "Allow controlled execution" },
  Caution: { color: "#F7BE67", short: "CAUTION", detail: "Explain and confirm" },
  "High Risk": { color: "#F28B63", short: "HIGH", detail: "Guide to a safer path" },
  Critical: { color: "#FF5D66", short: "CRITICAL", detail: "Block by policy" },
};
