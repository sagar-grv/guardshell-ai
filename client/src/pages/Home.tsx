/** Unix Field Manual redesign: an editorial command review sheet with a quiet session ledger. */
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Clipboard, Clock3, Copy, FileSearch, ShieldCheck, X } from "lucide-react";
import { analyzeCommand, riskMeta, sampleCommands, type CommandAnalysis, type RiskLevel } from "../lib/commandAnalysis";

const starterCommand = "rm -rf project/*";

const riskDetail: Record<RiskLevel, string> = {
  Safe: "No destructive pattern was found in this review.",
  Caution: "A state-changing operation needs a deliberate confirmation.",
  "High Risk": "The command needs a safer route before it is considered.",
  Critical: "The command conflicts with a protected safety boundary.",
};

const actionLabel: Record<CommandAnalysis["decision"], string> = {
  Allowed: "Permitted in controlled mode",
  Confirm: "Hold for confirmation",
  Guide: "Use the safer route",
  Blocked: "Stopped by policy",
};

function timeOnly(timestamp: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(timestamp));
}

export default function Home() {
  const [command, setCommand] = useState(starterCommand);
  const [analysis, setAnalysis] = useState<CommandAnalysis>(() => analyzeCommand(starterCommand));
  const [audit, setAudit] = useState<CommandAnalysis[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    const stored = window.localStorage.getItem("guardshell-audit");
    if (!stored) return;
    try {
      setAudit(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem("guardshell-audit");
    }
  }, []);

  const meta = riskMeta[analysis.risk];
  const sampleTitle = useMemo(() => sampleCommands.find((item) => item.command === command)?.label, [command]);

  const inspect = () => {
    const result = analyzeCommand(command);
    setAnalysis(result);
    if (!result.command) return;
    const updated = [result, ...audit].slice(0, 8);
    setAudit(updated);
    window.localStorage.setItem("guardshell-audit", JSON.stringify(updated));
  };

  const loadExample = (example: string) => {
    setCommand(example);
    setAnalysis(analyzeCommand(example));
  };

  const copyGuidance = async () => {
    try { await navigator.clipboard.writeText(analysis.saferAlternative); } catch { /* clipboard may be unavailable in a preview */ }
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1400);
  };

  const resetLedger = () => {
    setAudit([]);
    window.localStorage.removeItem("guardshell-audit");
  };

  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#1E2523]">
      <header className="border-b border-[#1E2523]/20">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-5 md:px-10">
          <a href="#review" className="group flex items-center gap-3" aria-label="GuardShell command review">
            <span className="grid h-9 w-9 place-items-center border-2 border-[#0B4A3F] font-mono text-lg font-semibold text-[#0B4A3F] transition-transform duration-200 group-hover:-translate-y-0.5">&gt;_</span>
            <span className="leading-none"><span className="block font-display text-xl font-semibold tracking-[-0.055em] text-[#1E2523]">GuardShell</span><span className="mt-1 block font-mono text-[9px] tracking-[0.18em] text-[#5C6863]">LOCAL COMMAND REVIEW</span></span>
          </a>
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.12em] text-[#53605B]"><span className="hidden sm:inline">POLICY SET: 01.0</span><span className="inline-flex items-center gap-2 text-[#0B4A3F]"><span className="h-1.5 w-1.5 rounded-full bg-[#0B4A3F]" />LOCAL SESSION</span></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-5 pb-12 pt-10 md:px-10 md:pt-16">
        <section className="grid gap-10 border-b border-[#1E2523]/20 pb-12 lg:grid-cols-[1.45fr_0.55fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#D95C35]">A SAFETY LAYER FOR LINUX WORK</p>
            <h1 className="mt-4 max-w-4xl font-display text-5xl font-medium leading-[0.95] tracking-[-0.06em] text-[#1E2523] sm:text-6xl lg:text-7xl">A second look<br />before a command runs.</h1>
          </div>
          <p className="max-w-sm border-l-2 border-[#0B4A3F] pl-4 text-base leading-7 text-[#4E5B55]">GuardShell reads a command as an operator would: by looking at its target, context, side effects, and a safer way to proceed.</p>
        </section>

        <section id="review" className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0">
            <section className="border border-[#1E2523]/35 bg-[#FAF9F5] shadow-[8px_8px_0_#D8D2C3]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2523]/20 px-5 py-4 md:px-7">
                <div className="flex items-center gap-3"><FileSearch size={18} strokeWidth={1.7} className="text-[#0B4A3F]" /><div><p className="font-mono text-[10px] tracking-[0.14em] text-[#64716A]">COMMAND REVIEW</p><p className="font-display text-base font-semibold text-[#1E2523]">Write the action you intend to take.</p></div></div>
                {sampleTitle && <span className="font-mono text-[10px] tracking-[0.11em] text-[#64716A]">EXAMPLE: {sampleTitle.toUpperCase()}</span>}
              </div>

              <div className="border-b border-[#1E2523]/20 p-5 md:p-7">
                <label htmlFor="command" className="font-mono text-[10px] tracking-[0.15em] text-[#64716A]">SHELL LINE</label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-start border-b-2 border-[#1E2523] bg-[#F3F0E8] px-4 py-4"><span className="mr-3 font-mono text-lg text-[#0B4A3F]">$</span><textarea id="command" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); inspect(); } }} rows={1} className="min-h-[28px] flex-1 resize-none bg-transparent font-mono text-base leading-7 text-[#1E2523] outline-none placeholder:text-[#8D9690]" aria-label="Linux command for safety review" /></div>
                  <button onClick={inspect} className="inline-flex min-h-[60px] items-center justify-center gap-3 bg-[#0B4A3F] px-6 font-mono text-[11px] font-semibold tracking-[0.11em] text-white transition duration-200 hover:bg-[#063B32] active:scale-[0.98]"><ShieldCheck size={17} />REVIEW COMMAND</button>
                </div>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-dashed border-[#1E2523]/20 pt-4">{sampleCommands.map((sample, index) => <button key={sample.command} onClick={() => loadExample(sample.command)} className="inline-flex items-center gap-2 font-mono text-[11px] text-[#526058] transition hover:text-[#0B4A3F]"><span className="text-[#D95C35]">0{index + 1}</span>{sample.label}<ArrowUpRight size={13} /></button>)}</div>
              </div>

              <div className="grid lg:grid-cols-[150px_minmax(0,1fr)]">
                <aside className="border-b border-[#1E2523]/20 bg-[#E8E3D7] p-5 lg:border-b-0 lg:border-r md:p-7">
                  <p className="font-mono text-[10px] tracking-[0.16em] text-[#64716A]">MARGIN NOTE</p>
                  <p className="mt-7 font-mono text-[11px] font-semibold tracking-[0.1em]" style={{ color: meta.color }}>{meta.short}</p>
                  <p className="mt-2 font-display text-4xl font-medium tracking-[-0.07em] text-[#1E2523]">{analysis.score}</p>
                  <p className="mt-1 font-mono text-[10px] text-[#64716A]">OF 100 RISK</p>
                  <div className="mt-7 h-20 w-1" style={{ backgroundColor: meta.color }} />
                </aside>
                <div className="p-5 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1E2523]/15 pb-5"><div><p className="font-mono text-[10px] tracking-[0.15em] text-[#64716A]">REVIEW OUTCOME</p><h2 className="mt-2 font-display text-3xl font-medium tracking-[-0.05em] text-[#1E2523]">{actionLabel[analysis.decision]}</h2></div><p className="max-w-[260px] font-mono text-[11px] leading-5 text-[#5B6861]">{riskDetail[analysis.risk]}</p></div>
                  <div className="grid gap-8 py-7 md:grid-cols-[1.08fr_0.92fr]">
                    <div><p className="font-mono text-[10px] tracking-[0.15em] text-[#64716A]">INTENT</p><p className="mt-3 text-base leading-7 text-[#27312D]">{analysis.intent}</p><p className="mt-7 font-mono text-[10px] tracking-[0.15em] text-[#64716A]">POSSIBLE IMPACT</p><p className="mt-3 text-sm leading-6 text-[#526058]">{analysis.impact}</p></div>
                    <div className="border-l border-[#1E2523]/15 pl-5"><div className="flex items-center justify-between"><p className="font-mono text-[10px] tracking-[0.15em] text-[#64716A]">INSPECTION RECORD</p><span className="font-mono text-[10px] text-[#8A928C]">REF {analysis.score.toString().padStart(3, "0")}</span></div><ul className="mt-4 space-y-3">{analysis.evidence.map((evidence) => <li key={evidence} className="flex gap-3 text-sm leading-5 text-[#45534C]"><Check size={15} className="mt-0.5 shrink-0 text-[#0B4A3F]" strokeWidth={2} />{evidence}</li>)}</ul></div>
                  </div>
                  <div className="border-t border-[#1E2523]/20 bg-[#F3F0E8] px-4 py-5 md:flex md:items-start md:justify-between md:gap-6"><div><p className="font-mono text-[10px] tracking-[0.15em] text-[#D95C35]">SAFER NEXT STEP</p><p className="mt-2 max-w-2xl text-sm leading-6 text-[#34413B]">{analysis.saferAlternative}</p></div><button onClick={copyGuidance} className="mt-4 inline-flex items-center gap-2 border border-[#1E2523]/35 px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#1E2523] transition hover:border-[#0B4A3F] hover:text-[#0B4A3F] active:scale-[0.98] md:mt-0"><Copy size={13} />{copyState === "copied" ? "COPIED" : "COPY NOTE"}</button></div>
                </div>
              </div>
            </section>

            <section className="mt-12 grid gap-6 border-t border-[#1E2523]/20 pt-6 md:grid-cols-[1fr_1fr]">
              <div><p className="font-mono text-[10px] tracking-[0.15em] text-[#64716A]">HOW THE REVIEW WORKS</p><p className="mt-3 font-display text-2xl font-medium leading-tight tracking-[-0.05em] text-[#1E2523]">A command is read in context, then given a proportionate response.</p></div>
              <div className="grid grid-cols-2 gap-x-7 gap-y-5 border-l border-[#1E2523]/20 pl-6">{[["01", "Read", "Flags, paths, privilege, and shell composition."], ["02", "Interpret", "Intent and impact rendered in plain language."], ["03", "Decide", "Allow, confirm, guide, or stop."], ["04", "Record", "Keep a local chain of reviewed commands."]].map(([number, label, copy]) => <div key={number}><p className="font-mono text-[10px] text-[#D95C35]">{number}</p><p className="mt-1 font-display text-lg font-medium text-[#1E2523]">{label}</p><p className="mt-1 text-xs leading-5 text-[#64716A]">{copy}</p></div>)}</div>
            </section>
          </div>

          <aside className="lg:pt-0">
            <section className="border-t-2 border-[#1E2523] bg-[#E8E3D7] px-5 py-5 md:px-6">
              <div className="flex items-center justify-between"><div><p className="font-mono text-[10px] tracking-[0.15em] text-[#64716A]">SESSION LEDGER</p><h2 className="mt-1 font-display text-2xl font-medium tracking-[-0.05em] text-[#1E2523]">Review trail</h2></div>{audit.length > 0 && <button onClick={resetLedger} aria-label="Clear review trail" className="p-2 text-[#64716A] transition hover:text-[#D95C35]"><X size={16} /></button>}</div>
              <div className="mt-6 border-y border-[#1E2523]/20">{audit.length === 0 ? <div className="py-10"><Clock3 size={18} strokeWidth={1.6} className="text-[#64716A]" /><p className="mt-4 font-mono text-[11px] tracking-[0.1em] text-[#64716A]">NO REVIEWS LOGGED</p><p className="mt-2 text-sm leading-6 text-[#59665F]">Reviewed commands are kept in this browser until you clear the ledger.</p></div> : <div>{audit.map((entry, index) => <div key={`${entry.timestamp}-${index}`} className="border-b border-[#1E2523]/15 py-4 last:border-b-0"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.1em]" style={{ color: riskMeta[entry.risk].color }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: riskMeta[entry.risk].color }} />{riskMeta[entry.risk].short}</span><span className="font-mono text-[10px] text-[#77817B]">{timeOnly(entry.timestamp)}</span></div><p className="mt-2 truncate font-mono text-xs text-[#25302B]">$ {entry.command}</p></div>)}</div>}</div>
              <p className="mt-5 font-mono text-[10px] leading-5 text-[#6C766F]">LOCAL ONLY / NO COMMAND IS RUN FROM THIS PAGE</p>
            </section>

            <section className="mt-8 border-l-2 border-[#D95C35] pl-5"><p className="font-mono text-[10px] tracking-[0.15em] text-[#D95C35]">A NOTE ON AUTHORITY</p><p className="mt-3 font-display text-2xl font-medium leading-tight tracking-[-0.05em] text-[#1E2523]">The model explains the risk. Policy decides the action.</p><p className="mt-3 text-sm leading-6 text-[#59665F]">In the Linux prototype, hard rules retain control over protected paths and critical operations.</p></section>
          </aside>
        </section>
      </main>

      <footer className="border-t border-[#1E2523]/20 px-5 py-6 md:px-10"><div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-[0.12em] text-[#66716A]"><span>GUARDSHELL / LOCAL COMMAND SAFETY</span><span>NO AI AUTHORITY OVER CRITICAL POLICY</span></div></footer>
    </div>
  );
}
