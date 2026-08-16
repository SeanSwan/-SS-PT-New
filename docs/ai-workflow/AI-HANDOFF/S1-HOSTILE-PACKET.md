# HOSTILE REVIEW PACKET — THE S1 "TRUTH COMMITS"

- **Branch:** `claude/design-brain-repave-20260816` @ `57360a699` (4 commits, pushed, NOT merged, nothing deploy-linked)
- **Range under review:** `b258a75dc..57360a699` · **Date:** 2026-08-16
- **Author of the work AND of this packet:** Claude Opus 5. Assume I am the least reliable narrator here.

---

## 0. YOUR REMIT

Attack this diff. Two questions, in priority order:

1. **What did I break, miss, or get wrong in these four commits?**
2. **Two items I deliberately did NOT do — was stopping correct, or am I dressing up avoidance as caution?**

### Output format — TABLES FIRST, PROSE LAST (hard requirement)

Prior reviews in this workstream truncated at the token cap with most of the budget spent on reasoning. So:

1. Findings table: `ID | severity | claim | evidence (file:line or diff hunk) | proposed fix`.
2. Second table on the two stop decisions: `item | was stopping correct? | what you would do instead`.
3. Prose only after both tables.

Severity: **CRITICAL** (ships a wrong build / destroys doctrine) · **HIGH** (silent doctrine loss) · **MEDIUM** · **LOW**.

**Cite the diff.** A finding without a hunk or file:line is a hypothesis — label it one.
**If you cannot verify a mechanism, say so** rather than asserting it exists. That failure mode has bitten this workstream repeatedly, including from reviewers.
**Say plainly where the work is right.** Do not manufacture findings to fill a quota.

---

## 1. CONTEXT — WHAT THIS CORPUS IS AND WHAT WENT WRONG BEFORE

`docs/ai-workflow/design-brain/` is a 28-file markdown doctrine corpus every AI agent loads before building UI. A canon rewrite once renumbered `design.md` from 28 sections down to 17 and **no satellite file followed**. Nothing errored — an agent that follows a dead pointer resolves it *safely*, by silently skipping the doctrine it cannot find. 34 structural defects accumulated invisibly.

A six-class gate now blocks that at commit time (`scripts/design-brain/check-brain-links.mjs`, `npm run brain:links`, wired to pre-commit):

- **D1 DANGLING** — `<file>.md §N` where N doesn't exist in that file
- **D2 UNINDEXED** — a file present but absent from `index.md`, whose own law is "every file in this folder is listed here"
- **D3 ORPHANED** — an `index.md` row for a file not on disk
- **D4 IMPOSSIBLE** — a bare `§N` that resolves under no reading
- **D5 PHANTOM** — a citation of a file that exists nowhere in the repo
- **D6 ATTICKED** — a citation of doctrine that now lives only in `docs/_attic/`

**The governing lesson of this workstream, established the hard way:** *a count is a property of the instrument, not of the world*, and *proof scoped to the inputs you had in mind is not proof*. Four separate defects shipped because a test used the same example the author developed against.

---

## 2. WHAT THE FOUR COMMITS DID

| SHA | What |
|---|---|
| `67897b9f5` | `design.md`'s "Enforcement files" line named **ten** mechanisms; **nine do not exist**. Replaced with real enforcement + an explicit DOES-NOT-EXIST list. Also added a flag that §16 (the thaw protocol) is unfollowable. |
| `1bfa48c9a` | Retired `design.html` → `docs/_attic/2026-08-design-html/`, fixed 8 consumer refs inside the brain. |
| `dfcdc07d6` | Fixed 2 refs **outside** the brain that the retirement orphaned: `swan-design-router/SKILL.md`, `ACTIVE-INDEX.md`. |
| `57360a699` | Fixed a 3rd outside ref: `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`. |

### What I verified by execution this session (not asserted)

- No `canon/` directory exists anywhere in the repo; no `canon:*` npm scripts; no `pnpm-lock.yaml`; `stylelint-config-swan` not installed. `tokens.json` exists but at `scripts/design-brain/config/`, **not** `canon/`.
- **Gate blind spot, found empirically:** after moving `design.html`, `index.md` still carried a live row for it and the gate reported **CLEAN**. All six classes walk only `*.md`, so the corpus's single `.html` file is invisible to every one of them. This disproves the Final Decider's stated rationale that "atticking makes any surviving consumer a D6 defect the gate now catches — the retirement self-audits."
- **D6 baseline claim disproven:** the Final Decider said retiring `adapters/knowledge.md` would "empty the D6 baseline to zero." I emptied the baseline in place and re-ran: **19 violations** appear, from the other four baselined files.
- Gate CLEAN (28 files · 75 refs · 0 defects) and suite **73 pass / 0 fail** after every commit.
- Every edited file diffed against `origin/main` before editing: 3 identical (edited), `CLAUDE.md` differs +14/−11 (left alone).

---

## 3. THE TWO THINGS I STOPPED ON — ATTACK THESE HARDEST

### 3.1 `adapters/knowledge.md` — I refused a Final Decider ruling

The Decider ruled **retire**, based on my own packet's description: *"its entire routing table's Policy column points at four atticked files."* Before deleting, I opened the file. §1's policy column does point at atticked docs — but **§1 is roughly 20% of a 95-line file, and §5 is a live `world-engine-graph/v1` schema**: 7 entity types with stable ID shapes, 6 named edges with direction and validation rules, quarantine-rejection rules, a verification checklist. Authored 2026-07-12, citing **live** files (`worlds.md`, `techniques.md`, `psychology.md`, `experience-mode.md`). Nothing else in the corpus carries it.

Relevant context: `obsidian/index.md` and `graphify/index.md` are now 6-line **TOMBSTONES** reading *"This described a system that never existed on disk… Do not resurrect this prose"* (owner-approved 2026-07-20). So the policies §1 points at were retired as describing a system that never existed.

**Question:** was refusing correct? Or is §5 *also* fiction — a meticulous schema for a graph nobody ever installed — in which case I preserved a more sophisticated ghost and should have retired the whole file? Note §5.4 says defining the schema "does not authorize Graphify installation, a vault scan, a factory run, or any direct Hermes write," which reads as self-aware spec rather than a claim of existing machinery. Is that distinction real or a fig leaf?

### 3.2 The constitution `§18` fix — I did not do it

`CLAUDE.md:157` and `AGENTS.md:163` both cite `cinematic-pages.md §8/§18`. Max is §17; **§18 has never existed in any revision**. `§8` is correct. These are the only 2 real dead refs in live doctrine outside the brain, sitting in the files every agent loads first. The Decider ruled **fix now**.

I did not, because: `CLAUDE.md` differs from `origin/main` (+14/−11) and this branch is **70 commits behind main**, so editing it here risks reverting live constitution work at merge; and editing `AGENTS.md` alone would widen a CLAUDE/AGENTS divergence that a drift-check already warns about.

**Question:** is that sound engineering, or an excuse? A one-character fix deferred for branch hygiene is still a deferred fix, and "defer the cheap fix" is precisely the dynamic that let the original rot persist for months. What would you have done instead?

---

## 4. SPECIFIC ATTACK SURFACES

1. **Did I introduce new fictional mechanisms in my own correction text?** `67897b9f5` adds a long prose block asserting what exists and what does not. If any of *those* claims is wrong, I have committed the exact sin I was fixing, inside the fix.
2. **Did I miss a `design.html` consumer?** I swept `*.md` repo-wide. I did **not** sweep `.html`, `.json`, `.yaml`, `.ts/.tsx`, `.github/`, or git hooks for references to it.
3. **Is the "gate blind to non-`.md`" finding actually right,** or did the CLEAN have a different cause I misattributed? I inferred the mechanism from source reading plus one observation — the same reading-not-executing pattern I criticize elsewhere in this packet.
4. **Is retiring `design.html` correct at all?** It was the only human-visual reference to the design system. Its replacement is nothing. For a *design* corpus, is a drifting visual reference worse than no visual reference?
5. **The `anti-patterns.md` rewrite** replaced a ban on "updating design.html without design.md" with a ban on "re-creating a second visual mirror." Did I convert a live rule into a rule about a thing that no longer exists — dead weight in a file whose job is live bans?
6. **Scope discipline:** commit 4 edits a *reference doc* outside the design brain. Scope creep, or required completeness?
7. **Reversibility:** each commit claims to be independently revertible. Is that actually true, given commits 2–4 are all consequences of the same retirement? Reverting 2 alone would restore the file while leaving 3 and 4's "it was retired" text in place.

---

## 5. THE COMPLETE DIFF (`b258a75dc..57360a699`, markdown, rename-detected)
```diff
diff --git a/.claude/skills/swan-design-router/SKILL.md b/.claude/skills/swan-design-router/SKILL.md
index e853621bb..63df4980b 100644
--- a/.claude/skills/swan-design-router/SKILL.md
+++ b/.claude/skills/swan-design-router/SKILL.md
@@ -261,7 +261,7 @@ hardcode `p.theme.colors.*` hex; CLAUDE.md Rule 46 + the shipped architecture wi
 |---|---|
 | `SWAN-CINEMATIC-DESIGN-SYSTEM.md` | Cinematic/public builds; deep palette + motion values |
 | `SWAN-ASSET-STORYBOARDING.md` | Any generated/commissioned media |
-| `docs/ai-workflow/design-brain/design.md` | The Crystalline Canon (design.md wins over design.html) |
+| `docs/ai-workflow/design-brain/design.md` | The Crystalline Canon — **sole** source of truth (the `design.html` mirror was retired 2026-08-16; there is no second copy to reconcile) |
 | `design.md.pre-redo` / `SKILL.md.pre-redo` | Historical context only |
 
 **Precedence on conflict:** this skill > reference docs > existing components >
diff --git a/ACTIVE-INDEX.md b/ACTIVE-INDEX.md
index da6824052..34dd688b9 100644
--- a/ACTIVE-INDEX.md
+++ b/ACTIVE-INDEX.md
@@ -23,7 +23,7 @@
 - **`docs/ai-workflow/references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md`** - cost-control rule for Fable token economy: semantic compression, query-first reads, image-context estimator, and proxy safety gates
 - **Startup router rule:** fresh AI sessions read `AGENTS.md`/`CLAUDE.md`, then this index; keep bulky protocol details linked here instead of copied into startup context.
 - **`docs/ai-workflow/hermes-agentic-os/index.md`** - Hermes Agentic OS map: approval gates, receipts, kill switches, channels, command center
-- **`docs/ai-workflow/design-brain/index.md`** - Design Brain map: design.md (canonical) + design.html mirror, adapters, archetypes, QA gates
+- **`docs/ai-workflow/design-brain/index.md`** - Design Brain map: design.md (canonical, sole — the design.html mirror was retired 2026-08-16), adapters, archetypes, QA gates
 - **`docs/ai-workflow/references/LENS-ADD-A-STYLE.md`** - the 30-minute five-entry recipe for adding Style Lens #N (proven: aurora-console #26 shipped through it with zero count-literal edits); pairs with `LENS-PORTABILITY-CONTRACT.md` (taking the v2 engine to a new host)
 - **`docs/ai-workflow/AI-HANDOFF/S0-CONSULT-LANE-HANDOFF-2026-08-14.md`** — **START HERE for consult-lane / receipts / model-review work.** S0 is merged (`5b2aa5030`, PR #42): every paid model call now leaves an auditable receipt, and a call that returns nothing is recorded as a failure rather than as `ok`. Carries the mandated hostile review of that work through **both Kimi K3 and HY3** (exact commands, verified dry-run), model calibration showing HY3 at ~40× better cost-per-usable-review, and a **P1: GitHub Actions has been dead repo-wide since 2026-08-12** (100/100 startup_failure) so every merge to main is currently ungated.
 - **`docs/ai-workflow/AI-HANDOFF/SWAN-CONTINUATION-HANDOFF-2026-08-14.md`** — **START HERE for Swan Brain / Forge / taste-curation work.** What is live (Swan Forge, 16 modules, capability truths already paid for — seed and i2i both probed dead, do not re-test), what Sean owes (blind A/B ruling — the file lives ONLY in the primary checkout, `.ai-workflow/` is gitignored), the reviewed 7-slice taste-curation plan (**start at Slice 0**, the contract), how to work alongside parallel agents, and the failure modes that cost this workstream real time. Supersedes `SWAN-MASTER-HANDOFF-2026-08-13.md`
diff --git a/docs/ai-workflow/design-brain/README.md b/docs/ai-workflow/design-brain/README.md
index 10d0b0961..3321171bf 100644
--- a/docs/ai-workflow/design-brain/README.md
+++ b/docs/ai-workflow/design-brain/README.md
@@ -8,7 +8,7 @@
 
 ## 1. What this is
 
-The Design Brain is the **callable form** of the Swan visual operating system. It does not replace the design system — it ADAPTS `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` into a folder an agent can read in minutes before a UI slice, and a human can inspect visually (`design.html`).
+The Design Brain is the **callable form** of the Swan visual operating system. It does not replace the design system — it ADAPTS `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` into a folder an agent can read in minutes before a UI slice.
 
 It exists to make four brains draw the same picture: same tokens, same patterns, same bans, same QA gates — whether the surface is a landing page, a SaaS dashboard, a client portal, a cinematic brand page, or a Sean-only Hermes operator tool.
 
@@ -27,7 +27,7 @@ It exists to make four brains draw the same picture: same tokens, same patterns,
 
 Every agent that builds or reviews UI agrees to this:
 
-1. **`design.md` is canonical.** `design.html` mirrors it visually for humans. **If they disagree, `design.md` wins** — and whoever notices updates both together in the same pass.
+1. **`design.md` is canonical, and now sole.** The `design.html` visual mirror was **retired to `docs/_attic/2026-08-design-html/` on 2026-08-16** — it had drifted into its own section numbering, so citations into it landed on the wrong doctrine. There is no mirror to keep in sync any more; one file, one truth.
 2. **Before any frontend work, read `design.md`.** Not from memory — from disk. Tokens drift; memory drifts faster.
 3. **Reuse documented tokens and components.** If a token or pattern you need exists in `design.md`/`components.md`, use it. Do not fork a near-duplicate.
 4. **Propose — never invent — new tokens.** A new color, spacing step, or radius is a proposal to Sean (and a paired update to `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B + CLAUDE.md Active Palette per that doc's §G maintenance rules). It is never a hardcoded hex in a component.
diff --git a/docs/ai-workflow/design-brain/anti-patterns.md b/docs/ai-workflow/design-brain/anti-patterns.md
index 3ae2865e2..d67904e1f 100644
--- a/docs/ai-workflow/design-brain/anti-patterns.md
+++ b/docs/ai-workflow/design-brain/anti-patterns.md
@@ -68,7 +68,7 @@
 | Ban | Why |
 |---|---|
 | **Inventing new tokens/components inside a slice** | New tokens are PROPOSALS to Sean (design.md §1); silent invention = drift |
-| **Updating design.html without design.md (or vice versa)** | They ship together; divergence makes the mirror a liar (README enforcement contract) |
+| **Re-creating a second "visual mirror" of canon** | The old `design.html` mirror drifted into its own section numbering and was retired 2026-08-16. A hand-maintained mirror becomes a liar the first time someone edits one side. If a visual reference is wanted again, it must be **generated** from `design.md`, never hand-kept |
 | **Skipping the mounted-surface receipt before a UI fix** | Rule 26 — you may be styling a dormant component |
 | **"Looks good" as a QA verdict** | qa-gates.md verdicts are binary gates with receipts, not vibes (rule 19) |
 
diff --git a/docs/ai-workflow/design-brain/design.md b/docs/ai-workflow/design-brain/design.md
index 5c572b682..d44ab40c7 100644
--- a/docs/ai-workflow/design-brain/design.md
+++ b/docs/ai-workflow/design-brain/design.md
@@ -1,8 +1,8 @@
 > **Crystalline Canon — adopted 2026-07-19 (Sean-confirmed)** from KIMI-DESIGN-BRAIN-ENHANCED,
 > the decisive rewrite of the prior Design Brain (killed the hedged "OR" laws; added z/duration/
 > density scales + a `canon:contrast` CI trigger + the SOLID/LIQUID canon lifecycle). Prior version
-> preserved at `design.md.pre-redo`. This canon is the source of truth; `design.html` mirrors it and
-> loses on any conflict. The 6 builder-validated refinements (reduced-motion-in-JS, the fail-closed
+> preserved at `design.md.pre-redo`. This canon is the sole source of truth (the former `design.html`
+> mirror was retired 2026-08-16). The 6 builder-validated refinements (reduced-motion-in-JS, the fail-closed
 > gate/flag scaffold, content-law-scans-comments, Gemini-is-author-not-gate, consult-kimi --effort
 > medium, consumer-vs-emitter world-token boundary) live in the swan-design-router LAWs — canon +
 > law are complementary. Validated by 7 shipped design-overhaul surfaces + their cross-cutting review.
@@ -11,8 +11,20 @@
 
 - **Crystal:** v2.0 · **Status:** CRYSTALLIZED — frozen; change only via §16 thaw · **Date:** 2026-07-04 · **Review pass:** Kimi K3
 - **Supersedes:** Fable draft 2026-07-03. Survives: T0–T4 tiers, dual-glow concept, C11 chart environments, data-only Arctic Cyan, low-motion data cards, 44px discipline. Changes: everything vibes-based is now mechanized or deleted.
-- **Mirror:** `design.html` is GENERATED from this file (`pnpm canon:build`). Hand edits are reverted by CI. One source, one truth.
-- **Enforcement files:** `canon/tokens.json` · `canon/route-manifest.json` · `canon/signature-moments.json` · `canon/motion-caps.json` · `canon/copy-lexicon.json` · `stylelint-config-swan` · gates: `canon:check`, `canon:contrast`, `canon:build`.
+- **Mirror: none — retired 2026-08-16.** `design.html` moved to `docs/_attic/2026-08-design-html/`. It was **never** generated: the claim that it was built by `pnpm canon:build` with CI reverting hand edits was false in three ways at once — no such script, no such CI job, and the repo does not use pnpm. Left hand-maintained, it drifted into its own section numbering (its §2/§3 were TYPOGRAPHY/SPACING against canon's Taste Bible/Optics), so every `design.html §N` citation landed on unrelated doctrine. **If a visual reference is wanted again it must be generated from this file by a real, named script — never hand-kept.**
+- **Enforcement — what actually exists** (corrected 2026-08-16; the previous list was fictional):
+  - **REAL:** `scripts/ci/check-token-discipline.mjs` (raw-hex discipline only — it does **not** check the radius/spacing scales in §9) · `scripts/ci/check-degalaxy.mjs` (retired-palette ban) · `scripts/design-brain/config/tokens.json` · `scripts/design-brain/check-brain-links.mjs` + `npm run brain:links` (cross-reference gate, pre-commit).
+  - **DOES NOT EXIST — do not cite as enforcement:** there is no `canon/` directory anywhere in the repo; no `canon/route-manifest.json`, `canon/signature-moments.json`, `canon/motion-caps.json`, or `canon/copy-lexicon.json`; no `stylelint-config-swan` package; and no `canon:check` / `canon:contrast` / `canon:build` npm script. `tokens.json` is real but lives at `scripts/design-brain/config/`, not `canon/`.
+  - **Why this line changed:** the previous version named ten mechanisms, nine of which were never built. A cited-but-absent mechanism is worse than no mechanism, because it tells every reader "this is handled" and stops them building it.
+
+> **⚠ §16 IS CURRENTLY UNFOLLOWABLE — flagged for Sean, deliberately not "fixed" here.**
+> This file says *"CRYSTALLIZED — frozen; change only via §16 thaw."* But §16 requires opening a
+> LIQUID proposal in `canon/liquid/`, a `canon:contrast` recompute, and manifest/registry diffs —
+> **none of which exist** (verified 2026-08-16). The protocol that governs changing canon depends
+> on the same apparatus this correction just found missing, so canon is either unchangeable by its
+> own law or the law is decorative. **The edits above are truth-corrections — they delete
+> statements that are factually false — not design-law changes, so they do not need a thaw.**
+> Repairing or retiring §16 is a doctrine decision and belongs to Sean.
 
 ## §1 How canon works — Crystallization
 
diff --git a/docs/ai-workflow/design-brain/index.md b/docs/ai-workflow/design-brain/index.md
index 8f42a806f..0f25f51f6 100644
--- a/docs/ai-workflow/design-brain/index.md
+++ b/docs/ai-workflow/design-brain/index.md
@@ -7,7 +7,7 @@
 
 ## What belongs in this folder
 
-Compact, agent-callable design doctrine: tokens, patterns, motion rules, bans, QA gates, page generators, and per-agent adapters. Markdown (plus the single `design.html` visual mirror). Everything here ADAPTS the two source-of-truth docs — it never contradicts them.
+Compact, agent-callable design doctrine: tokens, patterns, motion rules, bans, QA gates, page generators, and per-agent adapters. Markdown only. Everything here ADAPTS the two source-of-truth docs — it never contradicts them.
 
 ## What does NOT belong here
 
@@ -21,8 +21,7 @@ Production code; component implementations; screenshots/QA dumps (those go to QA
 |---|---|
 | `README.md` | What the Design Brain is, load order, enforcement contract, what it does not override |
 | `index.md` | This map |
-| `design.md` | THE dense canonical design system — tokens, modes (Crystalline Swan + Crystalline Cyberforest), type, spacing, surfaces, components-by-surface, states, responsive + a11y rules. `design.html` mirrors it; `design.md` wins conflicts |
-| `design.html` | Static, no-dev-server visual mirror of `design.md` for humans (built by a parallel agent; update together with `design.md`) |
+| `design.md` | THE dense canonical design system — tokens, modes (Crystalline Swan + Crystalline Cyberforest), type, spacing, surfaces, components-by-surface, states, responsive + a11y rules. **Sole source of truth** — the former `design.html` mirror was retired 2026-08-16 |
 | `motion.md` | Motion tiers, GPU-safe rules, reduced-motion gating (CSS + JS), duration/easing tokens, motion bans, signature-moment budget |
 | `components.md` | Component pattern index — purpose / anatomy / states / do–don't / C1–C12 mapping for every canonical pattern |
 | `anti-patterns.md` | The banned list with WHY per item |
diff --git a/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md b/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
index fa06a985d..08c2958e0 100644
--- a/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
+++ b/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
@@ -92,7 +92,7 @@ Data classes: `repo` (code/docs) · `app-meta` (routes, configs, non-client data
 | Entry | Owner | Tier | Decision | Notes |
 |---|---|---|---|---|
 | Design Brain bundle | Fable authors · all builders consume | T1 | CREATE → done | `docs/ai-workflow/design-brain/` — adapts, never replaces, SWAN-CINEMATIC-DESIGN-SYSTEM.md |
-| design.md / design.html enforcement | Claude Code/Codex | T1 gate | CREATE → done | design.md canonical; design.html mirrors it; update together |
+| design.md enforcement | Claude Code/Codex | T1 gate | CREATE → done | `design.md` is canonical **and sole** — the `design.html` mirror was retired 2026-08-16, so there is no "update together" obligation any more. Structural enforcement is `npm run brain:links` (pre-commit) |
 | Fable Design Brain adapter | Fable | T1 | CREATE → done | `adapters/fable.md` |
 | Website archetype codex | Fable authors | T1 | CREATE → done | 21 archetypes, one dense doc; #21 is the licensed Experience/World Showcase archetype |
 | World Engine catalog + M4 license | Fable authors · Codex/Claude execute | T1 doctrine / T2 ignored proof | CREATE → done | 18 World DNA recipes, WFX/PSY contracts, product/Hermes firewall, deterministic proof receipts |
```

---

## 6. THE RETIRED FILE

The retired `design.html` was ~1,340 lines of self-contained static HTML: an 18-section visual mirror of the canon (token swatches, type specimens, component examples). It carried its own section numbering — its §2/§3 were TYPOGRAPHY/SPACING against canon §2 Taste Bible / §3 Optics, plus a §7→§12 gap — so every `design.html §N` citation landed on unrelated doctrine. It is preserved at `docs/_attic/2026-08-design-html/design.html`; nothing was deleted.
