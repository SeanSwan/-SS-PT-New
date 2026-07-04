# 150 — Executive Summary for Sean

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Pass:** Fable Control Layer + Hermes Agentic OS + Design Brain (61 files, docs + 2 static prototypes, zero production code)

---

## What was corrected

"Paybolt" was a transcription error for "Fable." Two repo-wide sweeps (including gitignored/hidden files) found **zero** pre-existing Paybolt references — nothing needed renaming or quarantining, and no payment content had leaked in under that name. The word now exists only in correction records, and the CLAUDE/AGENTS patch proposal includes a guard so it can't re-seed. Full record: `101-paybolt-mishearing-cleanup.md`.

## What Fable built (plain English)

Three connected systems, all documentation and static prototypes, nothing touching production:

1. **The control layer** — three canonical reference docs that answer "which brain does which job, at which risk level, with whose permission": the Fable spec (when Fable is worth spending), the Hermes↔SwanStudios operator bridge (the boundary + the T0–T4 risk ladder — this file was referenced by CLAUDE.md for months but missing on disk; it now exists), and the skill & operator registry (~45 rows; anything unregistered is blocked by default).
2. **The Hermes Agentic OS** — a 21-doc operating system for your private operator brain: how repeated work becomes skills (with interview prompts for grilling you), how skills earn automation, how loops improve without drifting, how memory routes between Hermes / the Obsidian wiki / the real database, plus the safety spine (approval gates, audit receipts, fail-closed kill switches, no shell through chat, ever) and a beautiful static **Crystalline Cyberforest command-center prototype** you can open in a browser.
3. **The Design Brain** — a callable design system at `docs/ai-workflow/design-brain/`: `design.md` (canonical) + `design.html` (visual mirror), motion doctrine, component patterns, an explicit banned list, three QA gates, per-agent adapters, a 20-archetype website factory, the cinematic-page doctrine, and the Obsidian/Graphify knowledge bridges. It adapts — never replaces — SWAN-CINEMATIC-DESIGN-SYSTEM.md.

## What each system now means

- **Hermes Agentic OS** = governance-first automation: nothing runs unless registered with a tier, an owner, a receipt format, and a kill switch; T3/T4 (outward-visible/destructive) always waits for your approval.
- **Design Brain** = one place every agent reads before touching UI, strict enough to stop drift, flexible enough to generate 20 kinds of site.
- **Obsidian/Karpathy bridge** = raw/wiki/outputs/runs/graph-imports/references/templates lanes, index.md in every folder, provenance + stale-dates, zero client PII.
- **Graphify bridge** = quarantine-first: imports land in `graph-imports/`, get promoted to `wiki/` only through a human-reviewed checklist, and stay removable.
- **AI Village** = ten named modes (`130-fable-ai-village-review-packet.md`); paid modes stay rule-16 gated and triangle-ratified.

## Canonical vs not

- **Canonical:** the three reference docs, both new doc trees, the 130 packet. **Historical:** docs 000–090 (the Codex audit that preceded this build). **110 patch: APPLIED 2026-07-04** to CLAUDE.md/AGENTS.md/ACTIVE-INDEX.md (working tree, uncommitted — commit timing is Sean's). **Non-production demo artifacts:** both HTML prototypes (banner-labeled). **Not canonical anywhere:** Paybolt.
- **Hostile-review loop (2026-07-03→04): CONVERGED DRY.** Round 1 (two independent reviewers): 6 blockers, 17 majors, 17 minors — ALL fixed (T4 made human-executed with mandatory cross-channel arm; qa-session-start unified at T0; Q1 allowlist matched to the real T2 table; Discord auto-send reframed as a bridge-§7-amendment proposal; tier-badge ladder + all semantic colors converged on design.md canon; design.html brought into compliance with motion.md's own bans; prototype re-badged and de-transcripted). Round 2: mechanical sweep + independent 13-point verifier → DRY, zero new findings.

## Read first (15 minutes)

1. `references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` — the boundary + T0–T4 ladder everything else uses
2. `references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` — who may do what
3. `hermes-agentic-os/README.md` → open `prototypes/hermes-agentic-os-command-center.html` in a browser
4. `design-brain/design.md` → open `design-brain/design.html` in a browser
5. `140-fable-implementation-slices.md` — what happens next and in what order

## Run next / don't build yet

- **Next:** (1) your open-in-browser pass on both prototypes; (2) approve + apply the CLAUDE/AGENTS patch (110) so agents discover this layer at session start; (3) paste the Hermes update prompt (120) and run its three probes; (4) then the first runtime slice — deterministic receipt + approval-queue scripts (Codex/Claude, tests-first).
- **Don't build yet:** the real command-center app, Discord broker, headless runner, voice layer — each is spec'd and each waits its turn per `hermes-agentic-os/implementation-slices.md`. Don't run Graphify until installed/safe; don't run paid Village modes without the rule-16 ask.

## Top 10 workflow/safety decisions
1. T0–T4 defined ONCE (bridge §4); ambiguity rounds up; chains inherit the max
2. Unregistered command = BLOCKED, not read-only
3. T3/T4 = explicit approval + audit receipt, always; blanket approvals invalid; scope drift voids approval
4. No receipt → the action didn't happen correctly
5. Kill switches fail closed; untested switches presumed broken; master switch per runtime
6. No shell through Telegram/Discord/harness — permanent posture, forbidden-row documented
7. Discord inbound has zero command authority; voice never approves actions
8. SwanStudios APIs are the only write path; Postgres is truth; wikis are derived views
9. PLAUD/transcripts: local-private, redaction-first, never fanned out
10. Deterministic-first (vending machine before slot machine); agents only for multi-step uncertainty

## Top 10 design decisions
1. design.md canonical, design.html mirrors, update together, design.md wins
2. Two modes, one token system: Crystalline Swan (product) / Crystalline Cyberforest (operator-only, never client-facing)
3. Tier badges T0–T4 with fixed colors, text+color never color-alone
4. Dual-Button Glow wins all conflicts (LILA BAN stays quarantined)
5. Arctic Cyan is data-only; Danger red is the one off-palette semantic, never decorative
6. One signature moment per page; calm zones (data/operator surfaces) get none
7. Reduced-motion is DUAL-gated (CSS + JS) — one layer is a defect
8. Wide monitors get more columns, never stretched cards; 320px designed first
9. Empty states are onboarding moments; fake metrics are banned as truth violations
10. Every UI slice exits through three QA gates with a written receipt — "looks good" is not a verdict

## Top 10 Agentic OS decisions
1. Six levels: audit → skills → automations → loops → memory → command center → distribution
2. A workflow becomes a skill only after ~5 boring manual runs + your yes to the SPECIFIC skill
3. Automations demote to manual when their prompt/scope changes (approval reset)
4. Loops are healthy when receipts get boring; skills propose improvements, humans apply them
5. Three-brain memory: Hermes working memory / vault / Postgres-as-truth
6. The dashboard is a window; the broker is the engine — buttons wear tier badges
7. First three buttons: health sweep (T0), morning briefing (T1), approval queue (T2)
8. Distribution ladder: Sean-only → trainers via product auth (2026-06-18 decision) → clients via Swan Coach → public: nothing
9. Headless runner has no shell BY ABSENCE of capability, not by restraint
10. Every automation ships with owner, trigger, tier, receipt, kill switch — or it doesn't ship

## Unresolved questions (consolidated)
`hermes-agentic-os/open-questions.md` + bridge §11 + registry §14 + Fable spec §12 — the big five: T2 standing-allowlist contents; Discord alert taxonomy; approval expiry defaults (24h T3 / single-use T4 proposed); first-three-buttons confirmation; Fable cadence after the parallel-coding window.

## Confidence

**[VERIFIED]** 61 files on disk; zero production code touched (this pass wrote only under `docs/ai-workflow/**` + its own coordination lane note); both prototypes self-contained (grep: zero external requests — design.html's only console entry in a live render was the browser's own automatic favicon request); hostile sweeps clean (Paybolt / secrets / shell bans / retired tokens / forbidden language / credentials rule); **both HTML artifacts rendered in a real browser** (command-center: Playwright at 1680px + 414px during build; design.html: Playwright at desktop + 375px post-build — clean stacking, tokens/TOC/operator-console panels correct; one cosmetic nit: sticky-TOC anchor offset can tuck a section heading at certain scroll positions). **[LIKELY]** internal cross-references are coherent (spot-checked, not exhaustively link-checked). **[UNVERIFIED]** instrument-measured contrast (hand-computed only); your own eyes on both pages. Overall: **high confidence, ready for your review — nothing here executes anything until you approve the next slices.**
