/** Shift Ledger integration: the browser can call only a loopback GuardShell agent; it never executes shell commands itself. */
import { analyzeCommand, type CommandAnalysis, type RiskLevel } from "./commandAnalysis";

export const agentBaseUrl = import.meta.env.VITE_GUARDSHELL_AGENT_URL ?? "http://127.0.0.1:8787";

export type RunbookStep = { step: string; detail: string };
export type WorkOrder = {
  id: string;
  source: "local-agent" | "browser-preview";
  command: string;
  risk: RiskLevel;
  score: number;
  decision: "allowed" | "confirm" | "guided" | "blocked";
  intent: string;
  impact: string;
  evidence: string[];
  remediation: RunbookStep[];
  timestamp: string;
  eventId?: number;
  execution?: { exit_code: number; stdout: string; stderr: string } | null;
};

type AgentPayload = {
  event_id?: number;
  command: string;
  risk: string;
  score: number;
  decision: string;
  intent: string;
  impact: string;
  evidence: string[];
  remediation: RunbookStep[];
  timestamp: string;
  execution?: WorkOrder["execution"];
};

function asRisk(value: string): RiskLevel {
  return value === "Critical" || value === "High Risk" || value === "Caution" ? value : "Safe";
}

function asDecision(value: string): WorkOrder["decision"] {
  return value === "blocked" || value === "guided" || value === "confirm" ? value : "allowed";
}

function fromAgent(payload: AgentPayload): WorkOrder {
  return {
    id: `event-${payload.event_id ?? payload.timestamp}`,
    source: "local-agent",
    command: payload.command,
    risk: asRisk(payload.risk),
    score: payload.score,
    decision: asDecision(payload.decision),
    intent: payload.intent,
    impact: payload.impact,
    evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
    remediation: Array.isArray(payload.remediation) ? payload.remediation : [],
    timestamp: payload.timestamp,
    eventId: payload.event_id,
    execution: payload.execution ?? null,
  };
}

function fromBrowserPreview(analysis: CommandAnalysis): WorkOrder {
  const kind = analysis.decision === "Blocked" ? "Stop" : analysis.decision === "Guide" ? "Constrain" : analysis.decision === "Confirm" ? "Confirm" : "Review";
  return {
    id: `preview-${analysis.timestamp}`,
    source: "browser-preview",
    command: analysis.command,
    risk: analysis.risk,
    score: analysis.score,
    decision: analysis.decision === "Blocked" ? "blocked" : analysis.decision === "Guide" ? "guided" : analysis.decision === "Confirm" ? "confirm" : "allowed",
    intent: analysis.intent,
    impact: analysis.impact,
    evidence: analysis.evidence,
    remediation: [{ step: kind, detail: analysis.saferAlternative }],
    timestamp: analysis.timestamp,
    execution: null,
  };
}

async function request(path: string, init?: RequestInit): Promise<AgentPayload> {
  const response = await fetch(`${agentBaseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "The local GuardShell agent rejected the request.");
  return payload as AgentPayload;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${agentBaseUrl}/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function reviewWithAgent(command: string): Promise<WorkOrder> {
  return fromAgent(await request("/v1/review", { method: "POST", body: JSON.stringify({ command }) }));
}

export async function safeRunWithAgent(command: string): Promise<WorkOrder> {
  return fromAgent(await request("/v1/safe-run", { method: "POST", body: JSON.stringify({ command }) }));
}

export async function agentEvents(): Promise<WorkOrder[]> {
  const response = await fetch(`${agentBaseUrl}/v1/events`, { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error("Unable to load the local event ledger.");
  const payload = await response.json();
  return (payload.events ?? []).map((event: Record<string, unknown>) => fromAgent({
    event_id: Number(event.id),
    command: String(event.command ?? ""),
    risk: String(event.risk ?? "Safe"),
    score: Number(event.score ?? 0),
    decision: String(event.decision ?? "allowed"),
    intent: String(event.intent ?? ""),
    impact: String(event.impact ?? ""),
    evidence: Array.isArray(event.evidence_json) ? event.evidence_json as string[] : [],
    remediation: Array.isArray(event.remediation_json) ? event.remediation_json as RunbookStep[] : [],
    timestamp: String(event.created_at ?? new Date().toISOString()),
    execution: event.execution_json as WorkOrder["execution"],
  }));
}

export function previewReview(command: string): WorkOrder {
  return fromBrowserPreview(analyzeCommand(command));
}
