---
decision: Audit of the SwanStudios agentic workflow against the ARMS framework (Jay / Rob Nuggets transcript, 2026-08); 14 gaps found, ranked, with boot-context weight as the P0.
status: open
supersedes: none
---

# ARMS Workflow Audit — SwanStudios vs the transcript

> ## ⚠ CORRECTED — read the synthesis first
> This document was the **input to a 4-seat hostile panel, and the panel rejected its headline 4/4.**
> Do not act on §4's ranking. Known-false content retained below only so the panel reviews stay readable against their source:
> - **§0/§2 M-1 (the ~53.7k-token P0):** overstated. Prompt caching makes "direct spend on every turn" roughly 10× too high. Context-occupancy and attention arguments survive; the cost argument does not.
> - **§1 boot-context arithmetic:** the ~65k floor and the ~107k pair-coding figure are two different agent contexts, not one sum.
> - **§5 Q2 "roughly 40% retrieval-token savings":** **not in the transcript.** Carried from a July consult and misattributed. Struck.
> - **§2 M-2 "CLAUDE.md advertises dead code":** **false.** `swan-brain` appears in neither the script tree nor the reference table on `origin/main`; both exist on the local wip branch. Each branch is self-consistent.
> - **§4 M-1 rated "L effort / HIGH risk":** contradictory. Effort is XL.
>
> **Corrected findings, kill list, and build sequence:** `ARMS-WORKFLOW-SYNTHESIS-2026-08-21.md`

- **Date:** 2026-08-21 · **Author:** Opus 5 (Fable-tier) · **For:** Sean
- **Input A:** transcript — "Agentic OS / ARMS framework" (Applications · Routines · Memory · Skills)
- **Input B:** live repo state, measured against `origin/main` (NOT the local wip branch, which is 2158 commits behind)
- **Prior art:** `HERMES-OS-SECOND-BRAIN-CONSULT-REVIEW-2026-07-07.md` §3 already ran this comparison once (Fable, 6 weeks ago). This audit re-runs it against today's tree and reports **what shipped, what silently didn't, and what the transcript has that we still lack.**
- **Status:** findings only. Nothing built. Panel review (GLM 5.3 / Kimi 3 / Grok 4.6) fires on this document.

---

## 0. Verdict in one paragraph

We are **ahead of the transcript on three of the four ARMS layers and behind on the one that costs the most money.** Our Skills layer (44 skills), Memory layer (83 rules, 146 memory files, 52 learning packets, a 560-row generated catalog), and governance (tier gates, receipts, provenance locks, hostile-review loops) are materially more advanced than anything in the video. But the transcript's *central* insight — that a router file must be **thin**, because the agent pays for it on every single turn — is the exact thing we got backwards. `CLAUDE.md` on `origin/main` is **~53,700 tokens**. The video's is a few hundred. Everything else in this audit is secondary to that number.

Second-largest finding: **the highest-value item from the 2026-07-07 review (`brain-query`, deterministic retrieval) is still not built** — and the one script carrying the name (`scripts/swan-brain.mjs`) queries the *external* Karpathy vault, not this repo, and **exists only on a stale wip branch that will never merge.** A recommendation ranked five stars six weeks ago has not moved.

---

## 1. Measured state — all figures `[VERIFIED]` against `origin/main`, 2026-08-21

| Metric | Value | How measured |
|---|---|---|
| `CLAUDE.md` | 1,176 lines · 214,790 chars · **~53,700 tokens** | `git show origin/main:CLAUDE.md \| wc -c` |
| `AGENTS.md` (Codex mirror) | 1,182 lines · **~53,800 tokens** | same |
| `ACTIVE-INDEX.md` | 308 lines · ~6,700 tokens | same |
| `MEMORY.md` (auto-loaded) | ~4,900 tokens | `wc -c` on memory dir |
| **Boot-context floor, per session, before any work** | **~65,000 tokens** | sum of the above |
| Numbered MANDATORY rules | **83** | `grep -cE '^[0-9]+\. \*\*'` |
| Memory files | 146 | `ls memory/` |
| Skills in `.claude/skills/` | 44 | `git ls-tree origin/main` |
| Skills with more than 2 files (rich references) | **4 of 44** | `git ls-tree -r` + `awk` |
| Hermes learning packets | 52 | `git ls-tree -r` |
| Reference docs | 70 | same |
| AI-HANDOFF docs | **775** | same |
| CATALOG.md coverage | **558 of 775** (regen 2026-07-30) | catalog header |
| Tracked files | 11,940 | `git ls-files \| wc -l` |
| MCP servers wired at project level | **2** (playwright, swan-scout) | `.mcp.json` |
| Deterministic hooks wired | 14 | `.claude/settings.json` |

---

## 2. ARMS layer by layer

### S — Skills · WE WIN, with one structural gap

| Transcript level | Theirs | Ours | Verdict |
|---|---|---|---|
| L1 prebuilt skills | Anthropic gallery | 44 custom + reference libraries in `.agents/skills/` | **ahead** |
| L2 rich references — `SKILL.md` as a *router* to reference files, including **visual/HTML brand refs** | `/robo` skill with `brand.html`, fonts, palettes | **4 of 44 skills have more than 2 files.** `swan-design-router` — *the* design brain — has **2 files.** | **BEHIND** |
| L3 headless trigger (`claude -p`) | skills fire from a dashboard | only `fusion-triangle.mjs` / `lib/fusion-board.mjs` shell out to `claude -p` | **BEHIND** |

**Gap S-1 — thin skills.** The transcript's sharpest craft point: a skill that must produce *branded output* needs the brand as a **file the model can open**, not prose it must reconstruct. Their `/robo` skill one-shots an on-brand PDF because `brand.html` sits next to `SKILL.md`. Our design system lives in a 70-doc reference tree that `swan-design-router` describes in prose and the model must then go find. **Every Swan visual task pays a discovery tax the transcript's does not.**

**Gap S-2 — no `skill-creator`.** The transcript's most-used Anthropic skill. We have 44 skills and `skill-harvest` (which *proposes* skills) but **no skill that writes one to house standard** — 7-star docs, frontmatter, rule cross-references, the reference-bundle pattern. Every new skill is hand-rolled and drifts from its siblings.

**Gap S-3 — no headless skill surface.** Nothing in our stack fires a skill without a chat session, so no skill can be scheduled, dashboarded, or called by another system. This blocks the entire Routines layer from reaching our skills.

### M — Memory · WE WIN ON DEPTH, LOSE ON RETRIEVAL COST

**Gap M-1 — `CLAUDE.md` is a 53,700-token "router". [P0 — this is the whole audit]**

The transcript's thesis: the router file exists so the agent reads *pointers*, opens *one* target, and reads *one* section. Ours inlines 83 full rules, four discipline protocols, the palette, the skills tables, the gotchas, the open-items index, and the co-orchestrator hierarchy — every one of them, in full, on every turn, in both `CLAUDE.md` **and** its `AGENTS.md` mirror. Two agents at ~53.7k each is **~107k tokens of constitution per pair-coding session**, before a single project file is read.

This is not a style complaint. It is (a) direct spend on every turn, (b) the reason context fills early and compaction fires mid-task, and (c) **an attention problem**: Rule 73 sits roughly 1,000 lines into a wall of text, and a rule the model skims is a rule that does not fire — which is precisely the failure mode already recorded in the learning corpus ("a written trap is not a control", 2026-08-21).

*Direction, not yet a plan:* a thin router (identity, palette, load order, the ~10 rules that fire on literally every turn, and a pointer table) plus `docs/ai-workflow/constitution/` sections loaded on trigger. **This is load-bearing and high blast radius** — 83 rules are cited by number across the doc corpus, the `constitution-guard` hook, and the AGENTS mirror sync. It must be specced and reviewed, never improvised.

**Gap M-2 — no deterministic repo retrieval (`brain-query`). Ranked five stars on 2026-07-07; still unbuilt.**

Every retrieval in this repo walks the index *with the model*: Grep, then Read, then Read, then Read — at model prices. The transcript's system scores an index deterministically in Node and hands the model one file and one section. `scripts/swan-brain.mjs` exists but **(a)** targets the external WSL vault, not this repo, and **(b)** lives only on `wip/comms-notifications-2026-07-05`, 2158 commits behind main — ~~**effectively dead code that CLAUDE.md's reference table advertises as live.**~~ **[RETRACTED — FALSE. `swan-brain` is absent from BOTH the script tree and the reference table on `origin/main`; both are present on the local wip branch. Each branch is self-consistent. See the banner and SYNTHESIS §2.3.]**

**Gap M-3 — CATALOG is stale and partial.** 558 of 775 AI-HANDOFF docs indexed; last regenerated 2026-07-30. **217 documents — 28% of the handoff corpus — are invisible to the recall layer**, and Rule 72 instructs agents to grep the catalog *first*. A recall layer that silently omits a quarter of the corpus produces confident "we never decided that" answers.

**Gap M-4 — no per-department router files.** The transcript's second brain has `content.md`, `community.md`, and so on — each a short list of the skills and docs for one lane. We have one monolith plus a 308-line `ACTIVE-INDEX.md`. Lanes exist conceptually (Four-C, the four dashboards, Hermes, marketing, design) but nothing routes them.

**Gap M-5 — memory cross-links are sparse.** Flagged 2026-07-07 as SB-5, still true: `[[name]]` links between the 146 memory files are rare, so multi-hop pointer-following has nothing to follow.

**Gap M-6 — no artifact index.** We generate HTML packets, review docs, and design artifacts constantly — 11 `SWAN-*-PACKET.md` files sit at the local repo root alone. The transcript's "artifacts ring" makes past output findable by client and date. We have no such surface; artifacts are found by remembering their filename.

### R — Routines · BEHIND

| Transcript level | Theirs | Ours |
|---|---|---|
| L1 local scheduled tasks | Claude desktop routines | Hermes native cron — morning briefing LIVE (`scripts/hermes/morning-briefing.mjs`, `register-daily-task.ps1`) |
| L2 **cloud, always-on** | Hermes on a cloud box, 24/7 | **desktop-bound. Machine off, routine does not fire.** |
| L3 VPS-hosted agent with synced context | anticipated | not attempted |

**Gap R-1 — routines die with the desktop.** Our one real routine (morning briefing) depends on the 5090 being awake. Phase E Wake-on-LAN is recorded DEAD in memory after an exhaustive BIOS attempt. So the cadence layer (C4) has exactly one live consumer and it is not reliable.

**Gap R-2 — routines cannot call skills.** Downstream of S-3: with no headless surface, no routine can invoke `drift-check`, `recon`, `catalog-regen`, or `stale-check` on a schedule. **We wrote maintenance skills and then made them manual-only** — which is why CATALOG drifted by 217 docs and ACTIVE-INDEX drifts by weeks.

**Gap R-3 — no cross-machine context sync.** The transcript uses Syncthing to give the always-on agent the same skills and memory as the laptop. Our only mention of it is in an attic doc for the retired Pi.

### A — Applications · BEHIND

**Gap A-1 — only 2 project-level MCP connectors** (playwright, swan-scout). Linear and Mobbin are user-level; Gmail, Calendar, Drive, and Stripe are listed but **unauthorized in this session**. Stripe-read and calendar have been "PLANNED" in the Four-C roadmap since at least 2026-07.

**Gap A-2 — no `search-connectors` skill.** The transcript's pattern: ask the agent to *find* whether an official connector, community CLI, MCP server, or API exists for a tool, vet it for safety, then wire it. We do this ad hoc, which is why connector coverage stalled at two.

**Gap A-3 — no visual command center.** The transcript's dashboard is 20–30% of the value, but it is the part that makes the other 70% *usable daily*. Ours was fully specced on 2026-07-08 — `HERMES-BRAIN-COCKPIT-ULTIMATE-UPGRADE-2026-07-08.md` plus a **seven-document design panel** at `brain-cockpit-panel-2026-07-08/` — and **never built.** Six weeks of design work sitting cold. The 2026-07-07 consult's headline diagnosis was "an engine room with no bridge"; that is still literally true.

---

## 3. What WE have that the transcript does not — do not "upgrade" these away

Governance (T0–T4 tiers, receipts, kill switches) · privacy law (Rule 8, IDs only — his 60,000-file graph would leak PII in ours) · provenance gating (Rule 68 Fable-tier learning corpus) · adversarial review culture (3-brain, triangle fusion, dry-loop) · **the learning corpus itself** (52 durable packets with an error-to-fix-to-repeat ledger — nothing in the video compounds like this) · deterministic Stop-hook enforcement (14 hooks; his discipline is memory-only) · the generated CATALOG.

**Panel note:** the strongest case *against* this audit is that the transcript's system is a solo content operation and ours is a production SaaS with client PII, payments, and two agents sharing one tree. Cheapness bought with governance is a downgrade. Panelists should attack every recommendation on that axis.

---

## 4. Ranked gap table

| # | Gap | Layer | Impact | Effort | Risk of the fix |
|---|---|---|---|---|---|
| M-1 | `CLAUDE.md` ~53.7k tokens on every turn | Memory | **P0** — every turn, both agents | L | **HIGH** — 83 rules cited by number repo-wide |
| M-2 | No deterministic repo retrieval; `swan-brain` stranded off main | Memory | **P0** | M | LOW |
| A-3 | Command center specced six weeks ago, never built | Apps | **P1** — daily usability | M | LOW |
| M-3 | CATALOG stale: 217 of 775 docs uncovered | Memory | **P1** — silent false negatives | S | LOW |
| S-3 / R-2 | No headless skill surface, so maintenance skills cannot be scheduled | Skills / Routines | **P1** | S | LOW |
| S-1 | Skills thin: 4 of 44 have reference bundles; the design router has 2 files | Skills | P1 | M | LOW |
| R-1 | Routines desktop-bound | Routines | P2 | M | MED — recurring cost |
| M-4 | No per-department routers | Memory | P2 | S | LOW |
| S-2 | No `skill-creator` | Skills | P2 | S | LOW |
| A-2 | No `search-connectors` | Apps | P2 | S | LOW |
| M-6 | No artifact index | Memory | P3 | S | LOW |
| M-5 | Sparse memory cross-links | Memory | P3 | S | LOW |
| A-1 | Two project connectors; Stripe and calendar still only planned | Apps | P3 | M | MED — auth and PII |
| R-3 | No cross-machine sync | Routines | P3 | M | MED — secret handling |

---

## 5. What the panel is asked to attack

1. **Is M-1 right, and is the fix worth its blast radius?** A 53.7k-token constitution is expensive — but splitting it risks rules that stop firing. Argue the counter-case: is inlining actually correct for a two-agent tree where a missed rule has broken production before? What is the *minimum* safe version of this change?
2. **Is M-2 real, or theatre?** ~~The transcript claims roughly 40% retrieval-token savings from deterministic scoring.~~ **[RETRACTED — that figure is NOT in the transcript; it was carried from a July consult and misattributed. The question as posed to the panel was built on a false premise.]** Does that hold when the corpus is 775 docs plus a 560-row catalog plus 146 memory files, and `rg` is already fast? Is grepping CATALOG.md already 80% of `brain-query`?
3. **Rank order.** Which single item, built first, changes the most? Attack the table's ordering directly.
4. **What did this audit MISS** — in the transcript, or in the repo? Absence-first: name what should exist and does not, that neither the video nor this document mentions.
5. **What here is cargo-culting a solo content creator's setup into a production SaaS?** Kill anything that trades governance for speed.
