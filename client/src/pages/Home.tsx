/** Shift Ledger design: an operational work order, traceable runbook, and live local-agent event rail. */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronRight, CircleDot, ClipboardCheck, Command, Cpu, ExternalLink, FileClock, LoaderCircle, Play, RadioTower, RefreshCw, ShieldCheck, TerminalSquare, Wrench } from "lucide-react";
import { riskMeta, sampleCommands, type RiskLevel } from "../lib/commandAnalysis";
import { agentBaseUrl, agentEvents, healthCheck, previewReview, reviewWithAgent, safeRunWithAgent, type WorkOrder } from "../lib/localAgent";

const initialCommand = "rm -rf project/*";

const actionCopy: Record<WorkOrder["decision"], { label: string; description: string }> = {
  allowed: { label: "Approved for safe scope", description: "The local policy found no destructive pattern. Execution is still limited to an explicit allowlist." },
  confirm: { label: "Operator approval required", description: "The action affects service, privilege, configuration, or composed shell state. Review the runbook before proceeding." },
  guided: { label: "Remediation required first", description: "GuardShell has identified a safer route for the intended maintenance task." },
  blocked: { label: "Stopped by hard policy", description: "This category cannot be approved through the interface or a language model." },
};

function shortTime(timestamp: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp));
}

function statusTone(risk: RiskLevel) {
  return risk === "Safe" ? "safe" : risk === "Caution" ? "caution" : risk === "High Risk" ? "high" : "critical";
}

export default function Home() {
  const [command, setCommand] = useState(initialCommand);
  const [workOrder, setWorkOrder] = useState<WorkOrder>(() => previewReview(initialCommand));
  const [agentOnline, setAgentOnline] = useState(false);
  const [agentChecking, setAgentChecking] = useState(true);
  const [events, setEvents] = useState<WorkOrder[]>([]);
  const [pending, setPending] = useState<"review" | "run" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const meta = riskMeta[workOrder.risk];
  const currentAction = actionCopy[workOrder.decision];
  const canSafeRun = agentOnline && workOrder.decision === "allowed";
  const activeSample = useMemo(() => sampleCommands.find((item) => item.command === command)?.label, [command]);

  const refreshAgent = async () => {
    setAgentChecking(true);
    const online = await healthCheck();
    setAgentOnline(online);
    setAgentChecking(false);
    if (online) {
      try { setEvents(await agentEvents()); } catch { setEvents([]); }
    }
  };

  useEffect(() => { void refreshAgent(); }, []);

  const review = async () => {
    if (!command.trim()) { setNotice("Enter a Linux command to create a work order."); return; }
    setPending("review");
    setNotice(null);
    try {
      if (agentOnline) {
        const reviewed = await reviewWithAgent(command);
        setWorkOrder(reviewed);
        setEvents(await agentEvents());
      } else {
        setWorkOrder(previewReview(command));
        setNotice("Local agent is offline. This result is a browser preview and cannot execute anything.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The local review could not be completed.");
    } finally {
      setPending(null);
    }
  };

  const safeRun = async () => {
    if (!canSafeRun) return;
    setPending("run");
    setNotice(null);
    try {
      const completed = await safeRunWithAgent(workOrder.command);
      setWorkOrder(completed);
      setEvents(await agentEvents());
      setNotice(`Local agent completed the allowlisted command with exit code ${completed.execution?.exit_code ?? 0}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Safe execution was not completed.");
    } finally {
      setPending(null);
    }
  };

  const loadSample = (sample: string) => {
    setCommand(sample);
    setWorkOrder(previewReview(sample));
    setNotice(agentOnline ? "Sample loaded. Review it with the local agent when ready." : "Sample loaded in browser preview mode.");
  };

  return (
    <div className="min-h-screen bg-[#F4F1E9] text-[#13211D]">
      <header className="border-b border-[#13211D]/20 bg-[#F4F1E9]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between px-5 py-4 md:px-9">
          <div className="flex items-center gap-3"><div className="guard-mark"><span>&gt;_</span></div><div><p className="font-display text-xl font-semibold tracking-[-0.05em]">GuardShell</p><p className="font-mono text-[9px] tracking-[0.15em] text-[#66716B]">LOCAL OPERATIONS SAFETY</p></div></div>
          <div className="flex items-center gap-3"><span className="hidden font-mono text-[10px] tracking-[0.12em] text-[#637069] md:inline">SHIFT 01 · POLICY 1.0</span><button onClick={() => void refreshAgent()} className="inline-flex items-center gap-2 border border-[#13211D]/20 bg-white/40 px-3 py-2 font-mono text-[10px] tracking-[0.1em] text-[#3F4D46] transition hover:border-[#0E3D35]" aria-label="Refresh local agent status"><RefreshCw size={13} className={agentChecking ? "animate-spin" : ""} />{agentChecking ? "CHECKING" : agentOnline ? "AGENT ONLINE" : "AGENT OFFLINE"}</button></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1520px] px-5 py-8 md:px-9 md:py-12">
        <section className="border-b border-[#13211D]/20 pb-7">
          <div className="work-order-rail flex flex-wrap items-center justify-between gap-4 border-y border-[#13211D]/20 py-3 font-mono text-[10px] tracking-[0.12em] text-[#59665E]"><div className="flex flex-wrap items-center gap-x-5 gap-y-2"><span className="ticket-stamp">SHIFT / 01</span><span>WORK ORDER DESK</span><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#0E3D35]" />LOCAL HOST READY</span></div><span>POLICY REGISTER / 1.0</span></div>
          <div className="mt-7 grid gap-6 lg:grid-cols-[0.93fr_1.07fr] lg:items-end"><div><p className="font-mono text-[10px] tracking-[0.17em] text-[#C65639]">MAINTENANCE ISSUE INTAKE</p><h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-5xl">Review the work. Preserve the system.</h1></div><div className="border-l-2 border-[#0E3D35] pl-5"><p className="text-base leading-7 text-[#4E5B53]">GuardShell turns command review into a local maintenance record: it reads the instruction on the host, writes a durable event, and makes the next safe action explicit.</p></div></div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_352px]">
          <div className="min-w-0">
            <section className="border border-[#13211D]/30 bg-[#FBFAF6] shadow-[10px_10px_0_#D7D1C2]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#13211D]/20 px-5 py-4 md:px-7"><div className="flex items-center gap-3"><ClipboardCheck size={18} className="text-[#0E3D35]" /><div><p className="font-mono text-[10px] tracking-[0.14em] text-[#66716B]">WORK ORDER / WS-014</p><p className="font-display text-lg font-medium">Describe the command that needs review.</p></div></div><div className="flex flex-wrap gap-2 font-mono text-[9px] tracking-[0.1em] text-[#68736C]"><span className="border border-[#13211D]/20 px-2 py-1">OWNER / LOCAL</span><span className="border border-[#13211D]/20 px-2 py-1">{activeSample ? `SAMPLE / ${activeSample.toUpperCase()}` : "CUSTOM"}</span><span className="border border-[#0E3D35]/35 px-2 py-1 text-[#0E3D35]">OPEN</span></div></div>
              <div className="p-5 md:p-7"><div className="flex flex-col gap-3 lg:flex-row"><div className="flex min-w-0 flex-1 items-start border-b-2 border-[#13211D] bg-[#F1EEE6] px-4 py-4"><TerminalSquare size={17} className="mr-3 mt-1 shrink-0 text-[#0E3D35]" /><textarea value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void review(); } }} rows={1} className="min-h-[28px] flex-1 resize-none bg-transparent font-mono text-base leading-7 outline-none placeholder:text-[#8C948E]" aria-label="Command to review" placeholder="e.g. systemctl restart nginx" /></div><button onClick={() => void review()} disabled={pending !== null} className="inline-flex min-h-[60px] items-center justify-center gap-3 bg-[#0E3D35] px-6 font-mono text-[11px] font-semibold tracking-[0.12em] text-white transition hover:bg-[#0A2F29] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]">{pending === "review" ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}ISSUE REVIEW</button></div><div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-dashed border-[#13211D]/20 pt-4">{sampleCommands.map((sample, index) => <button key={sample.command} onClick={() => loadSample(sample.command)} className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.04em] text-[#516057] transition hover:text-[#0E3D35]"><span className="text-[#C65639]">0{index + 1}</span>{sample.label}<ChevronRight size={13} /></button>)}</div></div>
            </section>

            <section key={workOrder.id} className="work-order-enter mt-8 border border-[#13211D]/30 bg-[#FBFAF6]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#13211D]/20 px-5 py-4 md:px-7"><div className="flex items-center gap-3"><span className={`state-mark ${statusTone(workOrder.risk)}`} /><div><p className="font-mono text-[10px] tracking-[0.14em] text-[#66716B]">INSPECTION / {workOrder.eventId ? `GS-${String(workOrder.eventId).padStart(5, "0")}` : "BROWSER-PREVIEW"}</p><h2 className="font-display text-2xl font-medium tracking-[-0.04em]">{currentAction.label}</h2></div></div><div className="flex items-center gap-4 text-right"><div><p className="font-mono text-[10px] tracking-[0.13em]" style={{ color: meta.color }}>{meta.short}</p><p className="mt-1 font-mono text-xs text-[#66716B]">RISK {workOrder.score}/100</p></div><span className="ticket-stamp">{workOrder.source === "local-agent" ? "LOGGED" : "UNLOGGED"}</span></div></div>
              <div className="grid lg:grid-cols-[145px_minmax(0,1fr)]"><aside className="border-b border-[#13211D]/20 bg-[#ECE7DB] p-5 lg:border-b-0 lg:border-r md:p-7"><p className="font-mono text-[10px] tracking-[0.15em] text-[#66716B]">STATUS STAMP</p><p className="mt-6 font-display text-4xl font-medium tracking-[-0.07em]">{workOrder.score}</p><p className="font-mono text-[10px] text-[#66716B]">RISK INDEX</p><div className="mt-8 w-1 animate-signal" style={{ height: "84px", backgroundColor: meta.color }} /></aside><div className="p-5 md:p-7"><p className="max-w-3xl text-base leading-7 text-[#344239]">{currentAction.description}</p><div className="mt-8 grid gap-8 border-t border-[#13211D]/15 pt-7 lg:grid-cols-[1fr_0.9fr]"><div><p className="font-mono text-[10px] tracking-[0.15em] text-[#66716B]">WHAT THE AGENT FOUND</p><p className="mt-3 text-base leading-7">{workOrder.intent}</p><p className="mt-6 font-mono text-[10px] tracking-[0.15em] text-[#66716B]">OPERATIONAL IMPACT</p><p className="mt-3 text-sm leading-6 text-[#59665D]">{workOrder.impact}</p></div><div className="border-l border-[#13211D]/15 pl-5"><p className="font-mono text-[10px] tracking-[0.15em] text-[#66716B]">POLICY SIGNALS</p><ul className="mt-4 space-y-3">{workOrder.evidence.map((entry) => <li key={entry} className="flex gap-3 text-sm leading-5 text-[#46534B]"><Check size={15} className="mt-0.5 shrink-0 text-[#0E3D35]" />{entry}</li>)}</ul></div></div></div></div>
              <div className="border-t border-[#13211D]/20 bg-[#F1EEE6] px-5 py-6 md:px-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-[10px] tracking-[0.15em] text-[#C65639]">OPERATOR RUNBOOK</p><p className="mt-2 text-sm leading-6 text-[#4D5A52]">The agent does not perform these actions automatically. Use the steps to resolve the specific maintenance issue deliberately.</p></div>{canSafeRun && <button onClick={() => void safeRun()} disabled={pending !== null} className="inline-flex items-center gap-2 border border-[#0E3D35] bg-[#0E3D35] px-4 py-3 font-mono text-[10px] font-semibold tracking-[0.1em] text-white transition hover:bg-[#0A2F29] disabled:opacity-50"><Play size={14} fill="currentColor" />{pending === "run" ? "RUNNING" : "RUN ALLOWLISTED COMMAND"}</button>}</div><ol className="mt-5 grid gap-3 md:grid-cols-3">{workOrder.remediation.map((step, index) => <li key={`${step.step}-${index}`} className="border-l-2 border-[#C65639] pl-3"><p className="font-mono text-[10px] tracking-[0.1em] text-[#C65639]">0{index + 1} · {step.step.toUpperCase()}</p><p className="mt-1 text-xs leading-5 text-[#536057]">{step.detail}</p></li>)}</ol>{workOrder.execution && <pre className="mt-6 overflow-auto border border-[#13211D]/15 bg-[#E7E3D8] p-4 font-mono text-xs leading-5 text-[#23312A]">{workOrder.execution.stdout || workOrder.execution.stderr || "The command completed without output."}</pre>}</div>
            </section>

            {notice && <div className="notice-enter mt-5 flex items-start gap-3 border-l-2 border-[#355F8E] bg-[#E8EDF1] px-4 py-3 text-sm leading-6 text-[#344B60]"><CircleDot size={16} className="mt-1 shrink-0" />{notice}</div>}
          </div>

          <aside className="space-y-7">
            <section className="border-t-2 border-[#13211D] bg-[#EAE5D9] p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] tracking-[0.15em] text-[#66716B]">LOCAL AGENT</p><h2 className="mt-1 font-display text-2xl font-medium tracking-[-0.05em]">Shift status</h2></div><RadioTower size={20} className={agentOnline ? "text-[#0E3D35] animate-pulse" : "text-[#8B948E]"} /></div><div className="mt-6 border-y border-[#13211D]/15 py-4"><div className="flex items-center gap-3"><span className={`h-2 w-2 rounded-full ${agentOnline ? "bg-[#0E3D35] animate-pulse" : "bg-[#A7A79D]"}`} /><div><p className="font-mono text-[10px] tracking-[0.1em] text-[#37463E]">{agentOnline ? "CONNECTED TO LOCAL HOST" : "WAITING FOR LOCAL HOST"}</p><p className="mt-1 font-mono text-[10px] text-[#6D7770]">{agentBaseUrl}</p></div></div></div><div className="shift-queue mt-5 grid grid-cols-3 gap-px bg-[#13211D]/20"><div><p>{events.filter((event) => event.decision === "confirm").length}</p><span>PENDING</span></div><div><p>{events.filter((event) => event.decision === "allowed").length}</p><span>APPROVED</span></div><div><p>{events.filter((event) => event.decision === "blocked").length}</p><span>BLOCKED</span></div></div><p className="mt-4 text-sm leading-6 text-[#59665D]">{agentOnline ? "Reviews and ledger entries now come from the local SQLite-backed agent on this machine." : "Start the loopback agent to turn this workbench into a live Linux control surface."}</p><a href="https://github.com/sagar-grv/guardshell-ai/blob/main/docs/LOCAL_AGENT.md" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-[#0E3D35] underline underline-offset-4">LOCAL AGENT SETUP <ExternalLink size={13} /></a></section>
            <section className="border border-[#13211D]/25 bg-[#FBFAF6] p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] tracking-[0.15em] text-[#66716B]">EVENT LEDGER</p><h2 className="mt-1 font-display text-2xl font-medium tracking-[-0.05em]">Recent actions</h2></div><div className="text-right"><FileClock size={19} className="ml-auto text-[#355F8E]" /><p className="mt-1 font-mono text-[9px] tracking-[0.1em] text-[#7A847E]">{events.length} THIS SHIFT</p></div></div><div className="mt-5 border-t border-[#13211D]/15">{events.length === 0 ? <div className="py-8"><p className="font-mono text-[10px] tracking-[0.12em] text-[#7A847E]">NO LOCAL EVENTS YET</p><p className="mt-2 text-sm leading-6 text-[#59665D]">Browser previews are not stored. Connect the agent, then issue a review to create a durable event.</p></div> : events.slice(0, 7).map((event, index) => <div key={event.id} className="ledger-entry border-b border-[#13211D]/15 py-4" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.1em]" style={{ color: riskMeta[event.risk].color }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: riskMeta[event.risk].color }} />{riskMeta[event.risk].short}</span><span className="font-mono text-[10px] text-[#7A847E]">{shortTime(event.timestamp)}</span></div><div className="mt-2 flex items-center justify-between gap-2"><p className="truncate font-mono text-xs text-[#2B3931]">$ {event.command}</p><span className="font-mono text-[9px] text-[#8B938E]">GS-{String(event.eventId ?? 0).padStart(4, "0")}</span></div></div>)}</div></section>
            <section className="border-l-2 border-[#C65639] pl-5"><div className="flex items-center gap-2"><Wrench size={16} className="text-[#C65639]" /><p className="font-mono text-[10px] tracking-[0.15em] text-[#C65639]">HARD SAFETY BOUNDARY</p></div><p className="mt-3 font-display text-2xl font-medium leading-tight tracking-[-0.05em]">AI may explain a decision. It cannot grant authority over a dangerous one.</p><p className="mt-3 text-sm leading-6 text-[#59665D]">Critical rules remain deterministic, local, and non-overridable. Safe execution uses no shell and an explicit allowlist.</p></section>
          </aside>
        </section>

        <section className="mt-12 border-t border-[#13211D]/20 pt-7"><div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]"><div><p className="font-mono text-[10px] tracking-[0.15em] text-[#66716B]">OPERATING PRINCIPLE</p><p className="mt-3 font-display text-3xl font-medium leading-tight tracking-[-0.055em]">The most useful warning is one that helps finish the job safely.</p></div><div className="grid grid-cols-3 gap-4 border-l border-[#13211D]/20 pl-6">{[["REVIEW", "Read command structure and host context."], ["PLAN", "Write a specific operator runbook."], ["RECORD", "Keep an audit event on the local host."]].map(([label, copy]) => <div key={label}><p className="font-mono text-[10px] tracking-[0.13em] text-[#C65639]">{label}</p><p className="mt-2 text-xs leading-5 text-[#59665D]">{copy}</p></div>)}</div></div></section>
      </main>
      <footer className="border-t border-[#13211D]/20 px-5 py-5 md:px-9"><div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-[0.1em] text-[#68736C]"><span>GUARDSHELL / OPERATOR SAFETY LAYER</span><span>LOCAL REVIEW · DETERMINISTIC POLICY · AUDITABLE ACTIONS</span></div></footer>
    </div>
  );
}
