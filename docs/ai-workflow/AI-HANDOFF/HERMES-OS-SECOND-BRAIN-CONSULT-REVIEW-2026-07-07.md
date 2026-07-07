# Hermes Agentic OS + Second Brain — Consult Review & Enhancement Plan

- **Date:** 2026-07-07 · **Author:** Fable (claude-fable-5), acting as external consulting reviewer per Sean's directive ("look at it from a perspective as a consult reviewer who wants to make it better and add more features")
- **Inputs:** the full hermes-agentic-os doc canon + `OPUS-48-HERMES-OS-BUILD-HANDOFF-2026-07-04.md` §12 ledger (state as of E4c) · Sean's two 2026-07-07 transcripts (ARMS second-brain video; Fable-mode extraction video)
- **Status:** PROPOSE-ONLY for all runtime work (hermes-os doctrine: operator-infra slices need Sean's yes). The doc/skill edits shipped alongside this review are listed in §6.
- **Companions:** `HERMES-E4B-REDESIGN-2026-07-05.md` · `HERMES-E4C-OFFBOX-RUNBOOK-2026-07-05.md` · `.claude/skills/fable-mode/SKILL.md` (new, Rule 71) · `docs/ai-workflow/references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md`

---

## 1. Consultant's verdict (read this if nothing else)

The Hermes Agentic OS is architecturally **better than most commercial agent platforms** on the axis that matters: governance. Fail-closed switches, append-only hash-chained receipts, tier-gated commands, broker-never-executes-T4 — these survived multiple adversarial rounds that *correctly killed two E4b builds rather than ship false security*. That restraint is the system's strongest credential.

But a consultant is paid to say the uncomfortable part: **the system is an engine room with no bridge, and the crew went ashore.**

1. **Nothing delivers value to Sean daily yet.** The digest renders to a folder nobody opens (G-11 remains the truest open finding). Slice 3 (command center) and slice 5 (runner) are where the payoff lives; everything shipped so far is load-bearing but invisible.
2. **The loop is parked, not finished.** E4b-final is the named next node; Codex owes 5 hostile-review verdicts + slice 2b. Unreviewed shipped code accumulates risk silently (Rule 46 exists for a reason).
3. **The finish line is drifting.** Each E-slice was justified, but E-work is now 7 slices deep while slice 3 — the thing Sean would actually *see* — hasn't started. Classic infrastructure-perfectionism failure mode.

**Consultant's #1 recommendation: declare a "bridge-first" reprioritization.** Finish E4b-final (it gates the runner), then build slice 3 command center v1 IMMEDIATELY — before E5/E6, before more hardening. Ship something Sean touches every morning. The remaining E-slices harden a system that should already be earning its keep.

## 2. Part A — Hermes OS enhancement proposals (F-series, ranked)

> F-series = consult-proposed features on top of the existing E-slice/G-finding plan. Each is PROPOSED (needs Sean's yes per implementation-slices §0). Tiers per the operator bridge §4. "Synergy" names the existing asset the feature rides on — nothing here is greenfield.

| # | Proposal | Value | Effort | Tier | Synergy |
|---|---|---|---|---|---|
| F-1 | **Finish-first: E4b-final + Codex review sweep + slice 2b nudge** | ★★★★★ | M | — | Already specced; this is sequencing, not scope |
| F-2 | **Command center v1 gets a SECOND BRAIN panel** — the slice-3 cockpit renders the ARMS/Four-C graph (C2 connections, C4 routines, C3 skills, C1/memory) beside health/switches/queue | ★★★★★ | M | T0 | Slice-3 spec + static prototype + `registry.generated.json` already machine-readable |
| F-3 | **`brain-query` — deterministic retrieval as a registered T0 command** (see Part B, SB-1) | ★★★★★ | M | T0 | E1 registry pattern; ACTIVE-INDEX/MEMORY.md already exist as the index layer |
| F-4 | **Briefing delivery: digest → Telegram morning push** (T1 draft, templated, switch-gated) so the digest stops dying in a folder | ★★★★☆ | S | T1 | G-11/E5 `briefing-render` + existing Telegram lane |
| F-5 | **Receipts→second-brain bridge:** daily digest auto-drops a Rule 69 hermes-inbox memo summarizing operator activity — the OS starts feeding the memory layer it lives beside | ★★★★☆ | S | T1 | `hermes-inbox` channel is live; digest already renders the summary |
| F-6 | **Connection risk panel (ARMS "Applications" insight):** command center lists every C2 connection + registered channel with last-used timestamp and tier ceiling; stale connection = "consider disconnecting" attention line. The transcript's sharpest governance idea — power AND risk grow with the blue circle | ★★★☆☆ | M | T0 | Registry-as-data (E1) + receipt stream gives last-used for free |
| F-7 | **Runner schedule gains model+effort columns** (orchestrator-smart/executor-cheap, Rule 71): every scheduled command declares which model tier executes it, so agentic runs are cost-routed by design, not habit | ★★★☆☆ | S | — | Slice-5 schedule table is not built yet — cheapest moment to add columns is before it exists |
| F-8 | **Token-cost telemetry in receipts:** operator runs record tokens/cost; digest gains a cost-trend line. Unit economics visible where Sean already looks | ★★★☆☆ | S | T0 | Receipt schema §2 is extensible; compression protocol already demands measurement |
| F-9 | **Skills/registry drift check generalized:** the E1 "registry is prose" lesson applies to CLAUDE.md's skill tables (see §4 — documented 22 vs 24 real dirs TODAY). A T0 `registry-check --skills` diffing `.claude/skills/` against the doc table | ★★★☆☆ | S | T0 | `registry-build.mjs --check` is the exact pattern |
| F-10 | **Restore-drill calendar hook:** E6's backup gets a quarterly receipted restore drill as a scheduled T0 (runner) so backup rot is caught by the system, not by disaster | ★★☆☆☆ | S | T0 | E6 + slice 5 |

**Explicitly rejected by this consult** (so nobody re-proposes them): a web-exposed command center (LAN-only is a feature); auto-executing T3 after N approvals ("trust earning" must not decay the per-send gate); letting the runner self-modify schedules (violates run-logs §4 no-self-modification).

## 3. Part B — Second-brain verification + gap analysis (ARMS transcript)

### 3.1 Verification: the second brain EXISTS and maps 1:1 to the transcript's ARMS framework

| ARMS (transcript) | SwanStudios equivalent | State | Evidence |
|---|---|---|---|
| **A**pplications | **C2 Connections** (Four-C Router) | LIVE | CLAUDE.md C2: Render PG, R2, consult scripts, Hermes bridge, Oracle/SerpAPI; PLANNED list in FOUR-C-CONNECTIONS-CADENCE-ROADMAP.md |
| **R**outines | **C4 Cadence** | LIVE (thin) | continuity bridge, secret scan, prompt-watcher, hermes-inbox SessionStart hook; hermes-os runner = the big planned routine host |
| **M**emory | **C1 Context** + memory dir + continuity bridge + Design Brain obsidian/graphify lanes | LIVE | `~/.claude/.../memory/MEMORY.md` index + per-fact files; `.ai-workflow/continuity/`; `docs/ai-workflow/design-brain/{obsidian,graphify}/` |
| **S**kills | **C3 Capabilities** | LIVE | 24 dirs in `.claude/skills/` (+ `.agents/skills/` reference libraries) |

**Verdict: we did already build this — and our version is *governed*, which the transcript's isn't.** The Four-C Router predates the video and covers the same territory with tier gates and registries on top. Sean's instinct ("this is something we already did") is confirmed.

### 3.2 What the transcript has that we're MISSING (the 70% that isn't the graph)

The video's own best line: the visual is ~30% of the value; the 70% is **faster + cheaper retrieval in daily work**. Ranked gaps:

- **SB-1 — Deterministic retrieval layer (the brain.js gap). [VERIFIED missing: no retrieval script exists in `scripts/` — only `coach-brain`, a product surface.]** Our index layer is exactly right (CLAUDE.md router → ACTIVE-INDEX → MEMORY.md → reference docs), but every retrieval walks it WITH THE MODEL — Grep/Glob/Read at LLM prices. The transcript's system: deterministic code strips keywords → scores indexed sources WITHOUT opening them → opens only the best candidate → reads only the matching section → follows pointers. ~40% token savings on retrieval, verified by A/B in the video.
  **Proposal:** `scripts/brain/brain-query.mjs` (pure Node, zero model calls): parse ACTIVE-INDEX.md + MEMORY.md + the reference-doc table + hermes-os index into a scored source map (they're ALREADY structured as one-line-pointer indexes — that's the hard part done); keyword-score; emit `file → section → excerpt` for the model to consume. Register as T0 `brain-query` (F-3). Acceptance: an A/B like the video's (same question, with/without) showing ≥30% message-token reduction on retrieval tasks. This is ALSO the compression protocol's "query logs and large data stores through indexes/search instead of raw full reads" — specced, never implemented.
- **SB-2 — Generated workspace graph (the visual 30%).** Graphify sits quarantined in the Design Brain; nothing renders the actual workspace. **Proposal:** fold into slice-3 command center as the second-brain panel (F-2) — one static HTML graph generated from brain-query's source map + registry.generated.json, Crystalline Cyberforest treatment, with the video's performance bar as a /goal (interactive under 10s load, no lag). Also the client-communication trick from the transcript: a governed graph view is a *sales asset* when Sean shows clients how his operation runs.
- **SB-3 — Retrieval benchmark harness.** The transcript A/B-tested speed + token cost before trusting the system. We have no measurement path. **Proposal:** tiny fixture set (10 known-answer questions about the repo) + a script that runs them with/without brain-query and reports token deltas. Gate SB-1's "done" on it.
- **SB-4 — Index freshness check.** Our indexes are hand-maintained (ACTIVE-INDEX "Last updated: 2026-06-26" — already stale vs July shipping). Registry-as-data taught the fix: a T0 drift check that flags index entries pointing at moved/deleted files and recently-shipped surfaces missing from the index. Fold into F-9's `registry-check`.
- **SB-5 — Memory-file linking discipline is under-used.** MEMORY.md points at facts, but cross-links between memory files ([[name]] style) are sparse, so pointer-following (the transcript's multi-hop trick) has little to follow. Cheap habit fix, no code: when writing a memory, link related memories.

### 3.3 What we have that the transcript DOESN'T (keep — do not "upgrade" away)

Governance (tiers/receipts/switches) around the brain · privacy law (Rule 8 IDs-only; his 35k-file graph would leak PII in ours) · provenance gates (Rule 68 Fable-tier learning corpus) · adversarial review culture (his brain.js shipped un-reviewed; our E4b died twice earning its security claims).

## 4. Part C — Doc↔reality drift found during this consult (fix cheap, per F-9/SB-4)

| Drift | Evidence | Severity |
|---|---|---|
| CLAUDE.md skills "documented count = 22" vs **24 real dirs** (now 25 with `fable-mode`) | `ls .claude/skills/` 2026-07-07 | Low, but it's the E1 lesson in miniature |
| `seedance-swan-video` dir LIVE in `.claude/skills/` while CLAUDE.md calls it "retired unified" and claims the two split skills are the default-exposed pair | same `ls` | Low — confusing for fresh sessions |
| CLAUDE.md "Hermes on Raspberry Pi (BLOCKED — SSD POWER)" section vs memory: Hermes LIVE on desktop 5090, Pi retired (2026-07-06) | MEMORY.md `project_hermes_brain_local_qwen3_2026_07` | Medium — a fresh session could plan against retired hardware |
| ACTIVE-INDEX "Last updated 2026-06-26" predates the gallery-print feature, hermes-os E-slices, marketing cockpit | ACTIVE-INDEX.md header | Low-medium |

These are flagged, not fixed (Karpathy #3 surgical; Rule 37 cleanup is a separate pass). The Pi-section rewrite deserves its own small doc slice with Sean's confirmation of current Hermes topology.

## 5. Fable-mode + model routing (transcript 2 → workflow, landed now)

Transcript 2's thesis — "you can't keep the model's intelligence, but you can keep its process" — is existential for this repo: CLAUDE.md's own header says parallel-coding runs "→ ~Fable-5 return", i.e. Fable WILL leave. What landed (Rule 71):

- **`.claude/skills/fable-mode/SKILL.md`** — the five gates (scope adversarially / evidence first / attack own reasoning / verify before declaring / report calibrated) mapped to existing house rules, the leaked-system-prompt habits (training-memory ≠ knowledge; implied files may not exist; answer-then-one-question; own mistakes plainly), the effort-calibration table (with the verified overthink warning on xhigh/max), and the model routing table (cost/intelligence/taste) with the empirical orchestrator-smart/executor-cheap law.
- **Rule 71 in CLAUDE.md + AGENTS.md mirror** — mandatory load for fallback Final Deciders; routing discipline for all subagent/Workflow spawning.
- **Provenance guard:** fable-mode does NOT elevate Rule 68 provenance — Opus-in-fable-mode output is still Opus-tier for the Hermes learning gate. (Prevents the obvious gaming path.)

## 6. What shipped with this review vs what awaits Sean

**Shipped (docs/skill only, zero runtime):** this doc · `.claude/skills/fable-mode/SKILL.md` · CLAUDE.md (Rule 71 + Fable Control Layer pointer + skills-table row/count) · AGENTS.md mirror · ACTIVE-INDEX pointer.

**Awaiting Sean's yes (all propose-only):** F-1..F-10 (§2) · SB-1..SB-4 (§3.2) · the §4 Pi-section doc fix · and the STANDING hermes-os items unchanged from the build handoff: R2 bucket+object-lock (E4c teeth) · golden-digest 30-second look · Q2 Discord template texts · 2 proposed T2 registry rows · G-17 RESUME second-factor.

## 7. Sean decision queue (batched, least-clicks)

1. **Bridge-first reprioritization (F-1→F-2):** yes/no to "E4b-final, then slice-3 command center immediately, E5/E6 after"?
2. **brain-query (SB-1/F-3):** approve as the next second-brain slice? (Highest daily-value item in this review; pure T0 script + tests.)
3. **Briefing→Telegram (F-4):** approve the T1 templated morning push?
4. **The standing five** from §6 (R2 bucket · golden digest · Q2 texts · T2 rows · G-17) — still parked, still yours.

**Next slice (Rule 60):** if Sean approves #1 → resume the §11 build loop at **E4b-final**; if he approves #2 first → **brain-query + benchmark harness** as a standalone T0 slice. Both are unblocked today; E4b-final is the higher-risk-retirement move and my recommendation as Final Decider.
