---
name: create-with-context
description: The Swan creation workflow — for any substantial creation (net-new feature/component/page/system/design/upgrade), GROUND in a real audit (never from memory), ENHANCE Sean's prompt to fill the gaps he missed, pull an EXPERT brain (Kimi K3 for design; the right expert otherwise) as CONTEXT that FEEDS the work, then CLAUDE AUTHORS the synthesized creation using that context as raw material — the expert is context, Claude is the author — and present a blueprint + build with proof. Auto-applies on every chat. Sean 2026-07-24 - "I want you AND Kimi doing creation, Kimi is just context for your creation." Triggers on "create/build/upgrade/design/make X better", or any substantial net-new build.
---

# create-with-context — the Swan creation workflow (expert = context, Claude = author)

**The one-line law (Sean 2026-07-24):** when creating something substantial, the expert
brain (Kimi/Gemini/Codex/Oracle/fusion/an audit agent) is **CONTEXT that feeds your
creation — it is NOT the author.** Claude owns the creation. Never relay an expert's
output as the deliverable; synthesize your own, using theirs as one input among your own
design decisions.

This is the CREATION spine inside the existing pipeline (`prompt-watcher` -> `grill-me`/
`chromie` -> `swan-orchestrator` -> `swan-design-router` -> build -> `closeout-evidence-
lock`). It does not bypass those gates — it names how the *creating* happens between them.

## When it fires (auto — every chat)
Any substantial **creation**: a net-new feature, component, page, dashboard surface,
system, design, or a meaningful **upgrade/redesign** of an existing one. Also whenever
Sean says "create / build / upgrade / design / make X better / expand X." Fires via
Rule 76 (boot context every chat) + the `prompt-watcher` VISION path.

**Does NOT fire** for: trivial edits, bug fixes, single-file mechanical changes, questions,
status, or corrections. Bias to skipping on small work — this is for creation, not chores.

## The five steps

### 1. GROUND — never create from memory
Audit the **real current state** before designing anything. Spawn an `Explore`/audit
agent (or run `canonical-surface-audit`) to establish: what's actually shipped, what's
stranded/half-built, what's mock vs real data, what's a genuine gap, where it mounts.
Cite file:line. This honors Rule 18 (existing-pattern-first), Rule 26 (canonical surface),
Rule 58 (schema drift), Rule 52 (anti-rework). **Memory is a hypothesis; the audit is
truth.** A creation built on a wrong assumption about current state is wasted.

### 2. ENHANCE — remake the prompt, fill the gaps
Take Sean's prompt and rewrite it into a grounded brief that fills the gaps he may have
missed (states, edge cases, data source, the four dashboards + social, Coach hive-mind,
privacy, mobile, perf, the next-best-action it serves, the least-clicks bar) and adds
surgical amplifying features that strengthen coaching / adherence / progress-proof /
community / revenue / trust (Rule 62). This is the `prompt-watcher` enhancement, written
down as a brief. Privacy: IDs/roles only (Rule 8).

### 3. EXPERT CONTEXT — pull the right brain as CONTEXT (not author)
Feed the grounded brief to the RIGHT expert for creative ideas + hostile critique:
- **Design / front-end / visual / layout / motion** -> **Kimi K3** (`node scripts/
  consult-kimi.mjs --document <brief> --out <path> --effort medium --max-tokens 16000`).
  Kimi is the design guru; pair `--effort medium` with high `--max-tokens` (high effort
  can burn the budget and return empty).
- **Architecture / "is this right" / hard call** -> free **triangle fusion**
  (Claude+Codex+Gemini) or `swan-oracle` (GPT-Pro) for deep strategy.
- **Must-be-right / high-stakes** (auth/billing/multi-tenant/minors/legal/irreversible)
  -> propose paid **AI Village** and ASK first (Rule 16).
Cost gate: if Sean names the expert (e.g. "get Kimi's input"), the paid consult is
pre-authorized for that turn. Otherwise free-first, ask before paid (Rule 16 / fusion
gate). The expert's remit is to make YOUR creation better — creative ideas, signature
moments, fidelity gaps, competitor moves — not to hand you the deliverable.

### 4. CREATE — Claude authors the synthesis
Now **you create.** Take the expert's input as raw material and produce the actual
creation (blueprint / spec / design / implementation plan) with **real, concrete,
opinionated decisions** — answer every gap the expert flagged. Do NOT assert "premium/
alive/awe"; DESIGN it (name the tokens, the layout, the signature moment, the CTA
priority, the phasing). If the expert flagged "the design is absent," the fix is to
make the decisions, not to re-ask. The blueprint header must state authorship: **Claude
authored; <expert> was context; <audit> was ground truth.** Land it in
`docs/ai-workflow/AI-HANDOFF/` or `brainstorms/` with `decision:`/`status:` frontmatter.

### 5. PRESENT + BUILD WITH PROOF
Present: the blueprint, the taste-cut decisions Sean must make before code, and the
recommended first slice (Rule 60 next-slice). Then build through the normal gates
(`swan-orchestrator` -> `swan-design-router` if UI -> build). Every completion claim
carries Rule 74 proof + the DRY-LOOP hostile pass. Close via `closeout-evidence-lock`
(Rule 41) + Linear sync (Rule 76 board sync) + Hermes inbox (Rule 69).

## Principles
- **Expert = context, Claude = author.** The non-negotiable. Never relay; synthesize.
- **Ground before create.** No memory-based creation.
- **The expert makes the creation better, not different.** Take the sharpest ideas;
  reject what fights the Swan strategy or house rules (Rule 6 tokens, Rule 10 Victory,
  Dual-Button Glow, dark-first, 44px, <=300 lines, reduced-motion).
- **Honors the pipeline** — this is the creation method, not a gate bypass.
- **Surgical amplification** (Rule 3) — added scope must serve the loop, or be cut.

## Non-goals
- Not a replacement for grill-me (intent extraction) or chromie (bet pressure-test) —
  it composes with them.
- Not "consult an AI and paste its answer" — that is the failure mode this skill exists
  to prevent.
- Does not fire on trivial/mechanical work.