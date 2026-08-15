# GuardShell AI — Design Exploration

## Three Directions

### 1. Signal Lantern
**Very Brief Intro:** A calm forensic-console aesthetic that turns opaque command risk into legible, confident decisions. It feels like a trusted field instrument rather than a typical dark developer dashboard.

**Probability:** 0.07

### 2. Terminal Folklore
**Very Brief Intro:** A warm, editorial interface inspired by annotated Unix manuals, archive cards, and operational checklists. It brings approachability to Linux safety without becoming playful.

**Probability:** 0.04

### 3. Containment Grid
**Very Brief Intro:** A high-contrast command-center style with a dense grid, alert lights, and live containment visualizations. It emphasizes urgency and adversarial security monitoring.

**Probability:** 0.09

## Chosen Direction: Signal Lantern

### Design Movement
**Forensic instrumentation meets contemporary Swiss information design.** The interface resembles a carefully calibrated diagnostic device: dark mineral surfaces, strict hierarchy, illuminated status accents, and high-confidence data presentation.

### Core Principles
1. **Explain before alarming:** Risk is presented as a readable decision with evidence, not as vague red danger.
2. **Command is the focal object:** The input command, intent, impact, and safer path remain visually adjacent.
3. **Earned contrast:** Dark surfaces carry light type and warm alert colors only where attention is needed.
4. **Operational calm:** Every interaction is deliberate, grounded, and free from noisy cyberpunk decoration.

### Color Philosophy
The base is graphite and blue-black, creating a credible Linux operations environment. A luminous safety green signals safe execution, amber signals informed caution, and a restrained ember red represents blocked actions. A muted ice-blue carries neutral context and navigation, avoiding generic neon gradients.

### Layout Paradigm
A **diagnostic workbench** rather than a centered landing page. A narrow left rail holds the active system state. The central stage is a command analysis bench with a large terminal input and a vertically sequenced explanation path. A right-side evidence column collects policy signals and audit entries. On small screens, these sections stack in the order of a command’s journey.

### Signature Elements
1. **The Command Beam:** A horizontal, softly illuminated input rail that anchors every analysis.
2. **Risk Spectrum:** Four compact, labeled states with a linear indicator from Safe to Critical.
3. **Forensic Stamp:** Audit events carry a timestamp-like visual marker and a small status dot.

### Interaction Philosophy
The interface reacts like an expert observer. Submitting a command produces an immediate, structured conclusion. Command samples populate the input with one action. Risk-level transitions are quick and clear; blocked actions feel firm, while safer alternatives invite the next best step.

### Animation
Use fast opacity and transform transitions with a 180–240ms custom ease-out. The result panel enters with a small upward motion, audit entries cascade by 40ms, and the risk spectrum indicator glides between positions. Avoid looping ambient animation except a very subtle pulse on the active safety state. Respect reduced-motion preferences.

### Typography System
**Space Grotesk** provides precise, modern display and interface labels. **IBM Plex Mono** is reserved for commands, paths, rules, and audit metadata. Headlines use a strong 600–700 weight; body copy uses Space Grotesk 400–500; mono text is medium-weight with generous line height. Never use Inter.

### Brand Essence
**GuardShell AI is the explainable command-safety layer for Linux users who want confidence before execution.**

Personality adjectives: **precise, protective, lucid.**

### Brand Voice
Headlines are decisive and instructional. CTAs use action language and communicate the result of the action, not generic product language.

Examples:

> “Inspect impact before it reaches the system.”

> “Run the safer command instead.”

### Wordmark & Logo
The mark combines a terminal prompt chevron with a protective shield cutout, forming a bold angular silhouette. The wordmark uses wide, precise lettering with a single bright green prompt accent.

### Signature Brand Color
**Signal Mint — #72F2B2.**

## Style Decisions

- Above the fold must read as an **active diagnostic instrument**: the Command Beam, policy mode, risk spectrum, and evidence chain outrank marketing language.
- GuardShell visuals favor **policy grids, command traces, calibrated rails, and chain-of-custody stamps** over atmospheric cybersecurity imagery.
- Every decision record uses a recurring forensic stamp language: a status dot, timestamp-like mono metadata, and a compact evidence identifier.

## Redesign Direction: Unix Field Manual

### Design Movement
The redesign moves away from the forensic-dashboard aesthetic toward an **industrial safety manual for a local Unix utility**. It should feel designed by a product team that understands operational tools: considered paper-like surfaces, ink-heavy typography, purposeful labels, and small functional details rather than atmospheric visual effects.

### Revised Principles
1. **Editorial before ornamental:** generous whitespace, an unhurried reading rhythm, and clear content hierarchy take priority over decorative panels.
2. **The command is a document:** the command input reads like a marked-up line in a field manual, not a glowing futuristic console.
3. **One interface, one job:** analysis, evidence, and session history retain their functions but no longer compete as separate dashboard widgets.
4. **Human signals:** concise language, non-uniform alignment, selective serif type, and tactile dividers replace generic AI-product visual cues.

### Revised Visual System
Use warm mineral paper (`#F3F0E8`), charcoal ink (`#1E2523`), dark pine (`#0B4A3F`), safety orange (`#D95C35`), and institutional blue (`#355F8E`). Pair **Fraunces** for editorial headings with **DM Mono** for command text and metadata. Remove gradients, glows, floating imagery, pill-heavy controls, and uniform large-radius cards.

### Revised Layout
Use a top editorial masthead, then a two-column command workbench: a broad reading and analysis sheet on the left, and a narrow session ledger on the right. The risk outcome appears as a coloured margin note alongside the analysis, and evidence is rendered as a short inspection checklist rather than a dashboard card.
