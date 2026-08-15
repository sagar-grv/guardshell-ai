/** Signal Lantern design: a forensic workbench where Linux command intent is visible before execution. */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronRight, CircleHelp, Clock3, Command, FileWarning, Fingerprint, History, Info, LockKeyhole, Play, Radar, ShieldCheck, Sparkles, TerminalSquare, X } from "lucide-react";
import { analyzeCommand, riskMeta, sampleCommands, type CommandAnalysis, type RiskLevel } from "../lib/commandAnalysis";

const starterCommand = "rm -rf project/*";

const levelOrder: RiskLevel[] = ["Safe", "Caution", "High Risk", "Critical"];

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(timestamp));
}

function riskBorder(risk: RiskLevel) {
  return risk === "Safe" ? "border-[#72F2B2]/30" : risk === "Caution" ? "border-[#F7BE67]/35" : risk === "High Risk" ? "border-[#F28B63]/35" : "border-[#FF5D66]/35";
}

export default function Home() {
  const [command, setCommand] = useState(starterCommand);
  const [analysis, setAnalysis] = useState<CommandAnalysis>(() => analyzeCommand(starterCommand));
  const [audit, setAudit] = useState<CommandAnalysis[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("guardshell-audit");
    if (saved) {
      try { setAudit(JSON.parse(saved)); } catch { window.localStorage.removeItem("guardshell-audit"); }
    }
  }, []);

  const currentMeta = riskMeta[analysis.risk];
  const currentIndex = levelOrder.indexOf(analysis.risk);
  const policyMessage = useMemo(() => {
    if (analysis.decision === "Allowed") return "Policy permits controlled execution";
    if (analysis.decision === "Confirm") return "Policy requires your confirmation";
    if (analysis.decision === "Guide") return "Policy recommends a safer route";
    return "Policy prevents this execution";
  }, [analysis.decision]);

  const runAnalysis = () => {
    const result = analyzeCommand(command);
    setAnalysis(result);
    if (result.command) {
      const nextAudit = [result, ...audit].slice(0, 8);
      setAudit(nextAudit);
      window.localStorage.setItem("guardshell-audit", JSON.stringify(nextAudit));
    }
  };

  const chooseSample = (sample: string) => {
    setCommand(sample);
    const result = analyzeCommand(sample);
    setAnalysis(result);
  };

  const copyAlternative = async () => {
    await navigator.clipboard?.writeText(analysis.saferAlternative);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const clearAudit = () => {
    setAudit([]);
    window.localStorage.removeItem("guardshell-audit");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0A0F13] text-[#E7F1F1] selection:bg-[#72F2B2] selection:text-[#07110C]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.14]" style={{ backgroundImage: "url('/manus-storage/guardshell-signal-texture_9f6a8ab7.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(114,242,178,0.10),transparent_24%),radial-gradient(circle_at_10%_84%,rgba(84,175,222,0.08),transparent_28%)]" />

      <header className="relative z-10 border-b border-white/8 bg-[#0A0F13]/86 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-3">
            <img src="/manus-storage/guardshell-logo_e9a441f8.png" alt="GuardShell AI logo" className="h-10 w-10 object-contain" />
            <div>
              <div className="flex items-baseline gap-2"><span className="font-display text-lg font-bold tracking-tight text-white">GuardShell</span><span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-[#72F2B2]">AI</span></div>
              <p className="font-mono text-[10px] tracking-wide text-[#88A0A5]">LINUX COMMAND SAFETY LAYER</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#72F2B2]/20 bg-[#72F2B2]/6 px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#9CF6C6]"><span className="h-1.5 w-1.5 rounded-full bg-[#72F2B2] shadow-[0_0_10px_#72F2B2]" />LOCAL POLICY ACTIVE</span>
            <span className="font-mono text-[11px] text-[#7E9499]">v0.1 demo</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-5 pb-14 pt-7 md:px-8 md:pt-10">
        <section className="grid gap-7 xl:grid-cols-[230px_minmax(0,1fr)_310px]">
          <aside className="order-2 flex flex-col gap-4 xl:order-1">
            <div className="rounded-[22px] border border-white/8 bg-[#10181C]/82 p-4 shadow-[0_22px_65px_rgba(0,0,0,0.2)] backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between"><span className="font-mono text-[10px] tracking-[0.18em] text-[#7E9499]">POLICY CORE</span><ShieldCheck size={16} className="text-[#72F2B2]" /></div>
              <div className="space-y-3">
                <div className="border-l-2 border-[#72F2B2] pl-3"><p className="text-sm font-semibold text-white">Hybrid authority</p><p className="mt-1 text-xs leading-5 text-[#92A6AA]">Rules decide. AI explains intent and impact.</p></div>
                <div className="border-l-2 border-[#F7BE67] pl-3"><p className="text-sm font-semibold text-white">Preview first</p><p className="mt-1 text-xs leading-5 text-[#92A6AA]">High-risk actions receive a safer next step.</p></div>
                <div className="border-l-2 border-[#FF5D66] pl-3"><p className="text-sm font-semibold text-white">Critical lock</p><p className="mt-1 text-xs leading-5 text-[#92A6AA]">Protected paths cannot be overridden by the model.</p></div>
              </div>
            </div>
            <div className="hidden rounded-[22px] border border-white/8 bg-[#10181C]/82 p-4 xl:block">
              <div className="mb-3 flex items-center gap-2"><Radar size={15} className="text-[#7AC6EF]" /><span className="font-mono text-[10px] tracking-[0.18em] text-[#7E9499]">SIGNALS WATCHED</span></div>
              <div className="flex flex-wrap gap-2">{["sudo", "wildcards", "pipes", "redirection", "protected paths", "recursive flags"].map((signal) => <span key={signal} className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-[#B6C6C8]">{signal}</span>)}</div>
            </div>
          </aside>

          <div className="order-1 min-w-0 xl:order-2">
            <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0E171B] shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
              <div className="absolute inset-0 bg-cover bg-right opacity-[0.19]" style={{ backgroundImage: "linear-gradient(90deg, rgba(10,15,19,0.98) 0%, rgba(10,15,19,0.8) 47%, rgba(10,15,19,0.22) 100%), url('/manus-storage/guardshell-hero-console_f67804c6.jpg')" }} />
              <div className="relative p-5 sm:p-7 lg:p-9">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-xl"><div className="mb-3 flex items-center gap-2"><span className="h-px w-8 bg-[#72F2B2]" /><span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-[#72F2B2]">COMMAND INTENT INSPECTOR</span></div><h1 className="font-display max-w-2xl text-3xl font-bold leading-tight tracking-[-0.04em] text-white sm:text-4xl">Inspect impact before it reaches the system.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#AEC0C4]">Enter a Linux command. GuardShell identifies intent, evaluates risk, and provides the safest viable path.</p></div>
                  <div className="hidden h-20 w-20 overflow-hidden rounded-2xl border border-[#72F2B2]/15 bg-[#72F2B2]/5 p-1 sm:block"><img src="/manus-storage/guardshell-command-orb_314398a2.jpg" alt="Abstract protected command object" className="h-full w-full rounded-xl object-cover opacity-90" /></div>
                </div>
                <div className="rounded-2xl border border-[#72F2B2]/22 bg-[#07110F]/92 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_0_1px_rgba(114,242,178,0.03)]">
                  <div className="flex items-center gap-2 px-3 pb-1.5 pt-1"><TerminalSquare size={15} className="text-[#72F2B2]" /><span className="font-mono text-[10px] tracking-[0.18em] text-[#73A994]">SHELL INPUT</span><span className="ml-auto font-mono text-[10px] text-[#547167]">POLICY MODE: STRICT</span></div>
                  <div className="flex flex-col gap-2 md:flex-row"><div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-black/35 px-4 py-3"><span className="font-mono text-sm text-[#72F2B2]">$</span><input aria-label="Linux command" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runAnalysis(); }} className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-[#59716D]" placeholder="e.g. rm -rf project/*" /></div><button onClick={runAnalysis} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#72F2B2] px-5 py-3 font-display text-sm font-bold text-[#07110C] transition duration-200 hover:bg-[#9CF6C6] active:scale-[0.97]"><Sparkles size={16} />Inspect command</button></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">{sampleCommands.map((sample) => <button key={sample.label} onClick={() => chooseSample(sample.command)} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-[10px] text-[#A8BBBF] transition hover:border-[#72F2B2]/35 hover:bg-[#72F2B2]/8 hover:text-[#C8F8DB] active:scale-[0.97]">{sample.label}<span className="ml-2 text-[#6F888E]">{sample.command}</span></button>)}</div>
              </div>
            </section>

            <section className={`mt-5 overflow-hidden rounded-[26px] border bg-[#10181C]/92 shadow-[0_18px_60px_rgba(0,0,0,0.18)] ${riskBorder(analysis.risk)}`}>
              <div className="border-b border-white/8 px-5 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5"><Fingerprint size={18} style={{ color: currentMeta.color }} /></span><div><p className="font-mono text-[10px] tracking-[0.18em] text-[#82979B]">EXPLAINABLE DECISION</p><p className="text-sm font-semibold text-white">{policyMessage}</p></div></div><span className="rounded-full px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.16em]" style={{ color: currentMeta.color, backgroundColor: `${currentMeta.color}14` }}>{currentMeta.short} · {analysis.score}/100</span></div></div>
              <div className="p-5 sm:p-6">
                <div className="relative mb-8 grid grid-cols-4 gap-1">{levelOrder.map((level, index) => { const meta = riskMeta[level]; const active = index <= currentIndex; return <div key={level} className="min-w-0"><div className="mb-2 h-1.5 rounded-full" style={{ background: active ? meta.color : "rgba(255,255,255,0.09)", boxShadow: index === currentIndex ? `0 0 16px ${meta.color}` : "none" }} /><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? meta.color : "#526268" }} /><span className="truncate font-mono text-[9px] tracking-[0.1em]" style={{ color: index === currentIndex ? meta.color : "#758A8F" }}>{meta.short}</span></div></div>; })}</div>
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div><div className="mb-4"><p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-[#7D9499]">INTENT DETECTED</p><p className="text-lg font-semibold leading-7 text-white">{analysis.intent}</p></div><div><p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-[#7D9499]">POTENTIAL IMPACT</p><p className="text-sm leading-6 text-[#B0C2C5]">{analysis.impact}</p></div></div>
                  <div className="rounded-2xl border border-white/8 bg-[#0A0F13]/72 p-4"><div className="mb-3 flex items-center gap-2"><LockKeyhole size={14} className="text-[#7AC6EF]" /><p className="font-mono text-[10px] tracking-[0.16em] text-[#8EA6AB]">POLICY EVIDENCE</p></div><div className="space-y-2">{analysis.evidence.map((evidence) => <div key={evidence} className="flex items-start gap-2 text-xs leading-5 text-[#B4C7CA]"><Check size={14} className="mt-0.5 shrink-0 text-[#72F2B2]" />{evidence}</div>)}</div></div>
                </div>
                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#7AC6EF]/15 bg-[#7AC6EF]/[0.055] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><CircleHelp size={18} className="mt-0.5 shrink-0 text-[#7AC6EF]" /><div><p className="font-mono text-[10px] tracking-[0.16em] text-[#7AC6EF]">SAFER NEXT STEP</p><p className="mt-1 text-sm leading-6 text-[#D6E6E7]">{analysis.saferAlternative}</p></div></div><button onClick={copyAlternative} className="shrink-0 rounded-lg border border-[#7AC6EF]/25 px-3 py-2 font-mono text-[10px] font-semibold tracking-wide text-[#BDE8FF] transition hover:bg-[#7AC6EF]/10 active:scale-[0.97]">{copied ? "COPIED" : "COPY GUIDANCE"}</button></div>
                <div className="mt-5 flex flex-wrap items-center gap-3"><button onClick={runAnalysis} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.97]" style={{ background: `${currentMeta.color}18`, color: currentMeta.color }}><Play size={15} fill="currentColor" />{analysis.decision === "Blocked" ? "Blocked by policy" : analysis.decision === "Guide" ? "Inspect safer option" : analysis.decision === "Confirm" ? "Request confirmation" : "Allowed in demo"}</button><span className="font-mono text-[10px] text-[#6F868B]">Demo only — no shell command is executed from this browser.</span></div>
              </div>
            </section>
          </div>

          <aside className="order-3 flex flex-col gap-4">
            <div className="rounded-[22px] border border-white/8 bg-[#10181C]/82 p-4 shadow-[0_22px_65px_rgba(0,0,0,0.2)] backdrop-blur-sm"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><History size={15} className="text-[#7AC6EF]" /><span className="font-mono text-[10px] tracking-[0.18em] text-[#7E9499]">LOCAL AUDIT</span></div>{audit.length > 0 && <button onClick={clearAudit} className="font-mono text-[10px] text-[#82979B] transition hover:text-[#FF959B]">CLEAR</button>}</div>{audit.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center"><Clock3 size={18} className="mx-auto mb-2 text-[#668085]" /><p className="text-xs leading-5 text-[#82979B]">Your analyzed commands will appear here.</p></div> : <div className="max-h-[365px] space-y-2 overflow-auto pr-1">{audit.map((entry, index) => <div key={`${entry.timestamp}-${index}`} className="rounded-xl border border-white/7 bg-black/20 p-3"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-[9px] tracking-[0.14em]" style={{ color: riskMeta[entry.risk].color }}>{riskMeta[entry.risk].short}</span><span className="font-mono text-[9px] text-[#71878C]">{formatTime(entry.timestamp)}</span></div><p className="truncate font-mono text-xs text-[#D6E6E7]">$ {entry.command}</p></div>)}</div>}</div>
            <div className="rounded-[22px] border border-[#F7BE67]/14 bg-[#F7BE67]/[0.045] p-4"><div className="flex gap-3"><FileWarning size={18} className="mt-0.5 shrink-0 text-[#F7BE67]" /><div><p className="text-sm font-semibold text-[#F9DCA5]">Built for real Linux workflows</p><p className="mt-1 text-xs leading-5 text-[#BBAE91]">The production CLI pairs these transparent decisions with controlled subprocess execution, policy files, and SQLite auditing.</p><a href="#architecture" className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] tracking-wide text-[#F7BE67] hover:text-[#FFE0A0]">VIEW ARCHITECTURE <ChevronRight size={13} /></a></div></div></div>
          </aside>
        </section>

        <section id="architecture" className="mt-8 grid gap-5 border-t border-white/8 pt-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[26px] border border-white/8 bg-[#10181C]/72 p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#72F2B2]/10"><Command size={18} className="text-[#72F2B2]" /></span><div><p className="font-mono text-[10px] tracking-[0.18em] text-[#7E9499]">COMMAND JOURNEY</p><h2 className="font-display text-xl font-bold tracking-tight text-white">Safety has a visible chain of custody.</h2></div></div><div className="grid gap-3 sm:grid-cols-4">{[["01", "Parse", "Tokenize flags, paths, pipes, and redirects."], ["02", "Context", "Read user, target, permissions, and environment."], ["03", "Decide", "Combine strict rules with AI explanation."], ["04", "Act", "Allow, confirm, guide, or block by policy."]].map(([number, title, copy]) => <div key={number} className="rounded-2xl bg-black/20 p-4"><span className="font-mono text-[10px] text-[#72F2B2]">{number}</span><p className="mt-4 font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-[#879CA1]">{copy}</p></div>)}</div></div>
          <div className="rounded-[26px] border border-white/8 bg-[#0D1518] p-6"><p className="font-mono text-[10px] tracking-[0.18em] text-[#7E9499]">CORE GUARANTEE</p><p className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-white">AI can clarify an action. It cannot overrule a critical policy.</p><div className="mt-5 flex items-center gap-2 text-xs text-[#A7BBBF]"><Info size={14} className="text-[#7AC6EF]" />Designed for local, privacy-conscious Linux deployments.</div></div>
        </section>
      </main>
      <footer className="relative z-10 border-t border-white/8 px-5 py-5 text-center font-mono text-[10px] tracking-wide text-[#657D82]">GUARDSHELL AI · EXPLAINABLE COMMAND SAFETY FOR LINUX</footer>
    </div>
  );
}
