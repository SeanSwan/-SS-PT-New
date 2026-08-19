---
name: create-with-context
description: The Swan creation workflow — for any substantial creation (net-new feature/component/page/system/design/upgrade), GROUND in a real audit (never from memory), ENHANCE Sean's prompt to fill the gaps he missed, pull an EXPERT brain (Kimi K3 for design; the right expert otherwise) as a CREATIVE PEER, generate your OWN original ideas alongside it, then CLAUDE AUTHORS the FUSION of both idea sets — creativity ~50/50, authorship 100% Claude — and present a blueprint + build with proof. Auto-applies on every chat. Sean 2026-07-24 - "use your creativity AND Kimi's, combine them both for the final creativity idea." Triggers on "create/build/upgrade/design/make X better", or any substantial net-new build.
---

# create-with-context — the Swan creation workflow (expert = creative peer, Claude = author)

**The one-line law (Sean 2026-07-24, tightened same day):** when creating something
substantial, the expert brain (Kimi/Gemini/Codex/Oracle/fusion/an audit agent) is a
**CREATIVE PEER whose ideas FUSE into the creation — not a mere reference, and not the
author.** The split is: **creativity ~50/50** (BOTH you and the expert generate real,
original ideas — you must bring your OWN, not just curate the expert's), but
**authorship 100% Claude** (you own the fusion and are accountable for it — you keep the
best of both, reject what fights the Swan vision/house rules, and synthesize ONE final
creation). Never relay an expert's output as the deliverable; never reduce yourself to a
transcriber either. Both brains create; you author.

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

> **A7 recall contract (R2 ruling 2026-08-18):** before proposing any page/surface
> layout, read `docs/ai-workflow/design-brain/archetypes/index.json` (a ~4KB routing
> table) and load **≤3** matching `archetypes/<nn>-<id>.md` splits — never the 61KB
> monolith. A capability is reachable only if the skill that needs it loads it by
> contract; this line is that contract.

### 1. GROUND — find what exists, then make it BETTER
Audit the **real current state** before designing anything. Spawn an `Explore`/audit
agent (or run `canonical-surface-audit`) to establish: what's actually shipped, what's
stranded/half-built, what's mock vs real data, what's a genuine gap, where it mounts.
Cite file:line. This honors Rule 18 (existing-pattern-first), Rule 26 (canonical surface),
Rule 58 (schema drift), Rule 52 (anti-rework). **Memory is a hypothesis; the audit is
truth.** A creation built on a wrong assumption about current state is wasted.

**Grounding is not only "don't duplicate" — it's "improve what's there" (Sean 2026-07-24).**
When grounding surfaces existing work, LOOK IT OVER FOR UPGRADES: does it match the
vision, the house rules (tokens, Victory, dark-first, 44px, ≤300 lines, reduced-motion),
the least-clicks bar, the premium bar? Then **EXTEND / IMPROVE it toward the vision**
rather than rebuilding from scratch OR leaving it as-is. **Both failures are banned:**
don't-reinvent (wasteful) AND don't-leave-it-weak (a missed upgrade). Existing code is a
starting point to make better — the deliverable of a "create" task on an existing surface
is usually an UPGRADE, not a greenfield build. Produce an upgrade list (what's built →
what to improve → why it's better) as the creation's spine.

### 2. ENHANCE — remake the prompt, fill the gaps
Take Sean's prompt and rewrite it into a grounded brief that fills the gaps he may have
missed (states, edge cases, data source, the four dashboards + social, Coach hive-mind,
privacy, mobile, perf, the next-best-action it serves, the least-clicks bar) and adds
surgical amplifying features that strengthen coaching / adherence / progress-proof /
community / revenue / trust (Rule 62). This is the `prompt-watcher` enhancement, written
down as a brief. Privacy: IDs/roles only (Rule 8).

### 3. EXPERT AS CREATIVE PEER — pull the right brain, and bring your OWN ideas too
Feed the grounded brief to the RIGHT expert for creative ideas + hostile critique. This
is a two-sided creative step: the expert generates, AND you generate your own original
ideas in parallel — do not outsource creativity, match it.
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

### 4. FUSE — Claude authors the synthesis from BOTH idea sets
Now **you author the fusion.** Put YOUR original ideas and the expert's ideas on the
table together, judge both against the Swan vision + house rules, keep the best of each,
cut what doesn't fit (including the expert's — a bad expert idea gets rejected, not
shipped), and synthesize ONE final creation with **real, concrete, opinionated
decisions**. Track provenance so the fusion is visible — mark which ideas are the
expert's, which are yours, and what you cut and why. Do NOT assert "premium/alive/awe";
DESIGN it (name the tokens, layout, signature moment, CTA priority, phasing). The
blueprint header must state authorship: **Claude authored the fusion; <expert> was a
creative peer; <audit> was ground truth** — with an idea-provenance note (his / mine /
cut). Land it in `docs/ai-workflow/AI-HANDOFF/` or `brainstorms/` with `decision:`/
`status:` frontmatter.

### 5. PRESENT + BUILD WITH PROOF
Present: the blueprint, the taste-cut decisions Sean must make before code, and the
recommended first slice (Rule 60 next-slice). Then build through the normal gates
(`swan-orchestrator` -> `swan-design-router` if UI -> build). Every completion claim
carries Rule 74 proof + the DRY-LOOP hostile pass. Close via `closeout-evidence-lock`
(Rule 41) + Linear sync (Rule 76 board sync) + Hermes inbox (Rule 69).

## Principles
- **Expert = creative peer, Claude = author.** The non-negotiable. Creativity ~50/50
  (both generate real ideas); authorship 100% Claude (you own the fusion, you're
  accountable). Never relay; never merely transcribe; synthesize both idea sets.
- **Bring your own ideas.** If the only ideas on the table are the expert's, you failed
  the step — generate original ones and put them next to the expert's before fusing.
- **Ground before create.** No memory-based creation.
- **Keep the best of both; cut the rest — including the expert's.** A bad expert idea is
  rejected, not shipped. Reject anything that fights the Swan strategy or house rules
  (Rule 6 tokens, Rule 10 Victory, Dual-Button Glow, dark-first, 44px, <=300 lines,
  reduced-motion).
- **Honors the pipeline** — this is the creation method, not a gate bypass.
- **Surgical amplification** (Rule 3) — added scope must serve the loop, or be cut.

## Non-goals
- Not a replacement for grill-me (intent extraction) or chromie (bet pressure-test) —
  it composes with them.
- Not "consult an AI and paste its answer" — that is the failure mode this skill exists
  to prevent.
- Not "Claude transcribes the expert" either — Claude must bring original creativity, not
  just curate. Both create; Claude authors.
- Does not fire on trivial/mechanical work.