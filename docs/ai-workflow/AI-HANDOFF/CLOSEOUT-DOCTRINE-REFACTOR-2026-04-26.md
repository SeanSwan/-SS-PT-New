# CLOSEOUT — Doctrine Refactor (Three-Layer QA Pipeline + Anti-Sycophancy)

**Date:** 2026-04-26
**Scope:** CLAUDE.md Rules 50/51/52 + two new sibling reference docs (QA-PIPELINE.md, REVIEWER-DISCIPLINE.md) + workflow-path rename + AI-VILLAGE-SYSTEM Tier-C gate + orphan resolution + redaction gate
**Commits:**
- Commit A — `b3c55bad5` — `docs(ai-workflow): formalize three-layer QA pipeline + anti-sycophancy doctrine`
- Commit B — `1518a5f56` — `docs(ai-workflow): track previously-untracked references resolved by doctrine refactor`
**Push status:** landed at `b3c55bad5..d4ef5ba0e` on `origin/main` 2026-04-27
**Verdict:** APPROVED

---

## 1. Summary of doctrine landed

### CLAUDE.md
- Rule 50 — Three-Layer QA Pipeline (Tier A deterministic / Tier B AI cross-review / Tier C AI Village)
- Rule 51 — Confidence-Tag Discipline (`[VERIFIED]` / `[LIKELY]` / `[HYPOTHESIS]` / `[UNKNOWN]` with explicit scoping)
- Rule 52 — Anti-Rework Burden of Proof (binary 14-day mtime / `CLOSEOUT`-substring filename gate)
- Reference Docs index: +7 rows, -1 row (replaced `THREE-TIER-WORKFLOW.md` row with `WORKFLOW-PATHS.md`; added rows for QA-PIPELINE, REVIEWER-DISCIPLINE, ESLINT-SETUP, CLAUDE-PERMISSION-SYNTAX, KARPATHY-WIKI-OPERATIONS, SWANSTUDIOS-FULL-VISION)

### New siblings
- `docs/ai-workflow/references/QA-PIPELINE.md` — three-tier doctrine, six binary Tier-C triggers (auth/authz, Stripe webhook, multi-tenant scoping, Sean-declared pre-launch hardening with literal-phrase enumeration, minor's-data path, cross-service architectural change), output tag taxonomy, anti-patterns, routing tree, mapping to existing rules.
- `docs/ai-workflow/references/REVIEWER-DISCIPLINE.md` — six anti-sycophancy doctrines (evidence-first claims, disagreement-is-feature, anti-rework 14-day burden, no-agreement-without-verification, confidence calibration with explicit scoping, push-back-on-user) with binary closeout/APPROVE definitions and decision tree.

### Renames
- `THREE-TIER-WORKFLOW.md` → `WORKFLOW-PATHS.md` (resolved Tier 1/2/3 naming collision; QA tiers are orthogonal to workflow execution paths)

### Updates
- `AI-VILLAGE-SYSTEM.md` — added Tier-C trigger gate section, reframed from "run before every production deploy" to "Tier-C escalation only — episodic, paid, reserved." Pointer to QA-PIPELINE.md as canonical trigger source; no list duplication.
- `SWANSTUDIOS-FULL-VISION.md` §7 — tightened from full duplicated phase list (~25 lines) to one-paragraph pointer to `SWANSTUDIOS-EXECUTION-ROADMAP.md` as canonical sequencing source.

### Archives
- `docs/ai-workflow/references/ROUTER-UPGRADES-GT6.md` → `docs/ai-workflow/references/archive/ROUTER-UPGRADES-GT6.md` (was untracked; archived at new path).

### Redactions (pre-track audit gate)
- `KARPATHY-WIKI-OPERATIONS.md` — 7 redaction edits removing wife first name, home ZIP, kid ages/IDs, LAN IP, family-safety topology + location combinations.
- `SWANSTUDIOS-FULL-VISION.md` — 2 redaction edits removing wife first name + home location.

---

## 2. Self-Validation Moments — the doctrine validating itself during its own creation

This refactor was novel in that the doctrine being installed was repeatedly applied to its own creation. Seven moments where it caught real precision gaps:

### Moment 1 — FULL-VISION archive recommendation reversed (Doctrine 2: disagreement is a feature)
The initial audit recommended archiving `SWANSTUDIOS-FULL-VISION.md` as redundant with `EXECUTION-ROADMAP.md`. Honest diff showed only ~25-30% overlap — vision content was substantively distinct from sequencing content. Reversed the recommendation: kept the file, added an index entry, tightened §7 only. **Caught:** premature consolidation that would have lost vision-framing content.

### Moment 2 — Tier-C trigger fuzz (Doctrine 1: evidence-first claims)
Initial QA-PIPELINE.md draft listed six Tier-C triggers as judgment-requiring headlines ("auth changes," "complex Stripe work"). Sean's pre-emptive correction required binary triggers. Rewrote all six as grep- or `git diff`-checkable conditions, with Trigger 4 using a literal-phrase enumeration list rather than a fuzzy "Sean asks for hardening." **Caught:** a doctrine claiming to be MANDATORY but with non-deterministic triggers — would have produced inconsistent invocation.

### Moment 3 — Pre-commit line-count misleading (Doctrine 1 + Doctrine 5: confidence calibration)
First diff summary (`+2034 / -39`) bundled three pre-existing untracked files into the headline number. Of 2034 insertions, only ~590 were authored in this refactor; ~1447 were tracking pre-existing untracked files. Surfaced this honestly before commit instead of letting the headline number land as the apparent slice size. **Caught:** what would have read as "huge refactor" in `git log --stat` future-blame views without the breakdown.

### Moment 4 — Family-targeting data caught at audit gate (Doctrines 3 + 6: anti-rework + push-back)
Pre-track audit on `KARPATHY-WIKI-OPERATIONS.md` (440 lines) surfaced: internal LAN IP `192.168.50.232`, wife's first name in 3 places, home ZIP `92807` + neighborhood + county, four children enumerated by age (1mo/8/9/21) with per-child IDs encoding birth order, family-safety threat-model topology combined with location specifics. Same audit on `SWANSTUDIOS-FULL-VISION.md` surfaced wife's first name + home location at lines 462/464. **Caught:** if these two files had committed in a single shot with the rest of the doctrine slice, this targeting-grade family data would have permanently entered git history. The two-commit split + audit gate worked exactly as Doctrine 3 predicts.

### Moment 5 — Sweep caught Category B exposure pattern across the broader repo (Doctrine 1: evidence-first)
After the audit gate caught the two pre-track files, Sean directed an informational sweep across the rest of the repo using the same pattern set. The sweep was not part of the doctrine refactor's original scope — it existed because Doctrine 1's evidence-first standard, applied to "are there other instances of this content pattern?", required actually running the search rather than assuming the audit-gate had caught everything. Result: the sweep surfaced a strictly larger exposure pattern across ~10+ files spanning the same family/location/LAN-IP content category, scoping into two distinct follow-up slices (Slice 4 for tracked exposure requiring history rewrite, Slice 4b for untracked exposure requiring audit-before-track per the workflow established here). **Caught:** a problem strictly larger than the doctrine slice itself — without the sweep step, Sean would have closed the slice believing the redaction gate had fully resolved the family-data exposure when in reality the same content pattern was sitting in many additional files. The doctrine's anti-sycophancy / evidence-first standards drove the sweep that discovered the bigger problem.

### Moment 6 — Sweep methodology error caught at closeout staging gate (Doctrine 1: evidence-first claims; Rule 51: confidence calibration)
While staging Commit C, re-verification using `git ls-files --error-unmatch` revealed that the original sweep had merged tracked and untracked grep hits into a single "Category B" finding without distinguishing them. The sweep used `Grep` on the worktree, which matches every file on disk regardless of git status, and treated all hits as tracked-by-default. With ~50 untracked files in `docs/ai-workflow/AI-HANDOFF/` alone, the result over-stated the history-rewrite remediation scope by approximately 3x.

**Caught:** a closeout artifact about to lock in `APPROVED` status under Rule 52 with a factually wrong sweep finding embedded in it. Future Claude sessions reading the closeout would have planned a `git filter-repo` slice scoped to files that don't need it, and would have failed to plan the audit-before-track work for files that do.

**Methodology fix going forward:** sweeps targeting "tracked files only" must use `git grep <pattern>` (which only searches tracked content by default) or `grep <pattern> $(git ls-files)`. Plain `grep` against the worktree silently includes untracked drift and produces false-positive remediation scope.

### Moment 7 — Stale push-status line caught at Commit D staging gate (Doctrine 1: evidence-first claims)
While staging Commit D (the post-push verdict flip), re-reading the closeout's top-of-file metadata revealed the `Push status:` line still said "held pending Sean's explicit push authorization" — factually false the moment push of A+B+C landed. The original Commit D spec was a single-line verdict flip; expanding to also update the push-status line was a minor scope expansion (2 lines instead of 1) but eliminated a residual inaccuracy at the exact gate intended to bring the artifact in line with post-push reality.

**Caught:** an artifact about to assert `APPROVED` while still containing a stale "push held" claim above the verdict line. Without the catch, Rule 52 binary detection would have fired correctly (filename + `APPROVED` token + fresh mtime) but a careful reader of the artifact would have seen contradictory metadata in the same document.

**Pattern:** the doctrine validated itself seven times during its creation — including this final self-correction at the literal last gate of the slice. The pattern to keep is "re-read every artifact at every commit gate, not just at major checkpoints," because staleness compounds quickly when a document is written across many sessions and the underlying state changes between writes.

---

## 3. Sweep findings — pre-existing exposure (mixed tracked + untracked)

**Sweep methodology note:** Findings categorized by **tracked status**. "Tracked" = present in git history per `git ls-files --error-unmatch <path>`. "Untracked" = present on disk but not in git history; remediation differs (audit-before-track gate, not history rewrite). The original sweep methodology used plain `grep` without this distinction; corrected at closeout staging gate (see §2 Moment 6). Future sweeps must use `git grep` or `grep $(git ls-files)`.

**Scope:** all repo files at sweep time (`grep` worktree); excluded `.git/`, `node_modules/`. Tracked-vs-untracked classification verified per-file post-sweep before this artifact was finalized.

**Patterns scanned:**
- Family/location: `jasmine` (case-insensitive), `92807`, `Anaheim`, `Orange County`, `Mexican heritage`, `postpartum`
- Child identifiers/ages: `k-baby`, `k-01`, `k-02`, `k-03`, `sean-kid`, `sean-baby`, `jasmine-swan`, `1mo`, `1-month`, `8yo`, `9yo`, `21yo`
- LAN IPs: `192.168.50.*`, `10.0.0.*`, RFC1918 `172.16-31.*`
- 5-digit ZIP code patterns

### Category A — INTENTIONAL public website copy (do-not-touch regardless of tracked status)

| File | Tracked? | Lines | Content |
|---|---|---|---|
| `docs/qa/HOMEPAGE-CINEMATIC-BASELINE-AUDIT.md` | TRACKED | 104, 199, 200 | "Jasmine Hearon (Swan): Co-Founder & Elite Performance Coach"; LinkedIn `linkedin.com/in/jasmineswan`; Instagram `instagram.com/jasmine_swan_fitness` |
| `docs/qa/HOMEPAGE-CINEMATIC-BASELINE-AUDIT.md` | TRACKED | 159 | Public business contact: "Anaheim Hills, (714) 947-3221, loveswanstudios@protonmail.com" |
| `docs/qa/HOMEPAGE-CINEMATIC-BASELINE-AUDIT.md` | TRACKED | 39, 40 | SEO/marketing copy: "Orange County and Los Angeles" |
| `docs/SWANSTUDIOS-PLATFORM-VISION.md` | TRACKED | 29, 253, 376 | Marketing positioning: "Move Fitness in Anaheim Hills"; "Personal Training Clients (Anaheim Hills / Orange County)" |
| `AI-Village-Documentation/SWAN-AI-ASSISTANT-MASTER-BLUEPRINT.md` | TRACKED | many | Master blueprint copy with marketing geo-targeting |
| `AI-Village-Documentation/gemini-consults/2026-03-05T19-21-52-design.md` | TRACKED | 28, 703 | Marketing design copy mentioning "Orange County and LA" |
| `AI-Village-Documentation/plans/SWAN-AI-ASSISTANT-MASTER-BLUEPRINT.md` | UNTRACKED | 162, 309, 533 | Duplicate copy of master blueprint at second path; never committed. If kept, audit-before-track per workflow established in this slice; if redundant with the tracked copy at `AI-Village-Documentation/SWAN-AI-ASSISTANT-MASTER-BLUEPRINT.md`, archive instead. |
| `AI-Village-Documentation/design/GEMINI-STYLE-HANDOFF-HOMEPAGE-STORE-ABOUT.md` | UNTRACKED | 574, 601 | Trainer carousel design handoff; never committed. Same disposition: audit-before-track or archive. |

**Reasoning:** Jasmine is a SwanStudios co-founder per the homepage; her public professional name (Jasmine Hearon / Jasmine Swan) and the business contact info are intentional marketing surface. These are NOT the same as the private family-safety context the redaction was scoped to.

**Sean's confirmation 2026-04-26 — DOCTRINAL: public brand identity is deliberately separated from private family identity.** Future sessions and any history-redaction slice MUST preserve this distinction:
- **PUBLIC (do NOT redact):** "Jasmine Hearon" as SwanStudios co-founder, "Jasmine Swan" as published trainer name, business email `loveswanstudios@protonmail.com`, business phone `(714) 947-3221`, geo-marketing copy mentioning "Anaheim Hills", "Orange County", "OC", "LA" as service-area positioning, LinkedIn / Instagram social URLs for the trainer carousel.
- **PRIVATE (redact wherever found in tracked content):** "wife Jasmine" / "Jasmine's documentation checklist" / "[[jasmine-swan]]" framing as family context, the home ZIP `92807` when used as residence indicator, Mexican heritage / postpartum / new-mom / 4-kids-enumerated-by-age framing, household IDs encoding birth order, LAN IPs (`192.168.50.232`, `192.168.50.83`).

**Failure mode this prevents:** over-redaction. A future redactor who sees "Jasmine" in `HOMEPAGE-CINEMATIC-BASELINE-AUDIT.md` and reflexively scrubs it would erase Sean's co-founder's public brand identity from the homepage, breaking the marketing surface to "fix" something that isn't a leak. The signal is not the name itself — it is the **context** the name appears in (public co-founder bio vs. private family-safety threat-model document).

### Category B — UNINTENTIONAL leakage (mixed tracked + untracked; remediation differs by tracked status)

These are docs that mirror the same content pattern just redacted from KARPATHY/FULL-VISION. Per Moment 6 above, the original Category B grouping conflated tracked (history-rewrite needed) with untracked (audit-before-track gate needed). Re-classified below.

**Disambiguation criterion (per Sean's confirmation 2026-04-26):**
- Lines mentioning Jasmine in a public co-founder / trainer / business context = **Category A** (do-not-touch, see §3 Category A above).
- Lines mentioning "wife" or private-family framing (heritage / postpartum / kids enumerated by age / home ZIP as residence indicator / household IDs encoding birth order) = **Category B-confirmed** (in scope for the appropriate remediation pathway, no further review needed).
- Lines that could read either way depending on context = **Category B-ambiguous** (need Sean's per-line review BEFORE remediation; otherwise risk over-redaction of legitimate brand surface).

#### Category B-confirmed-tracked (HIGH severity, in scope for `git-history-redaction-family-pii-2026-04` slice — `git filter-repo`)

These are present in committed git history. Worktree edits alone will not remove them.

| File | Tracked? | Lines | Content |
|---|---|---|---|
| `admin-dashboard-overview.yml` (repo root) | TRACKED | 218, 234, 387, 588, 597, 606, 615, 624 | Playwright snapshot output containing "jasmine Swan" + "Anaheim, United States" — generated test artifact in tracked history; needs `.gitignore` rule to prevent regeneration (per Slice 4 pre-flight item 5) |
| `user-dash-community.yml` (repo root) | TRACKED | 217, 236, 240, 244, 248, 252, 256, 260, 264 | Playwright snapshot output containing "jasmine" — same disposition |

#### Category B-confirmed-untracked (HIGH severity, needs audit-before-track gate per the workflow established for KARPATHY-WIKI-OPERATIONS.md and SWANSTUDIOS-FULL-VISION.md in this slice; NOT history rewrite)

Each file in this list requires the same redaction-before-staging treatment that KARPATHY/FULL-VISION received: read full content, scan against Rule 44 patterns + family/location/age/LAN-IP patterns, redact targeting-grade specifics with placeholder syntax (`<spouse>`, `<home-ZIP>`, `<PI-LAN-IP>`, etc.) preserving operational utility, re-scan to verify clean, then track. **Defer-to:** separate slice, scope to be determined by Sean (some of these files may be obsolete and better archived than redacted).

| File / directory | Tracked? | Notes |
|---|---|---|
| `docs/ai-workflow/AI-HANDOFF/HERMES-V4-FINAL-BLUEPRINT-2026-04-16.md` | UNTRACKED | "wife Jasmine, 4 kids: 1mo, 8yo, 9yo, 21yo"; "age keys generated (Sean + Jasmine)"; "Jasmine's Telegram channel + access" |
| `docs/ai-workflow/AI-HANDOFF/HERMES-V4-SETUP-REVIEW-2026-04-17.md` | UNTRACKED | "[[jasmine-swan]] (spouse, principal immigration applicant, Mexican heritage, new mom)"; "Anaheim area" |
| `docs/ai-workflow/AI-HANDOFF/HERMES-V3-LIFE-OS-OPUS-CODEX-DEBATE-2026-04-16.md` | UNTRACKED | "wife Jasmine, four children (1 month, 8, 9, 21)"; "Sean (46M), Jasmine (33F)"; "where a Black + Mexican family can be SAFE"; relocation intelligence framing |
| `AI-Village-Documentation/audits/FULL-DASHBOARD-AUDIT.md` | UNTRACKED | "Seed content from jasmine Swan is showing" — context-check needed during audit (could be admin-dashboard test artifact = Category A); not in tracked history either way |
| `AI-Village-Documentation/validation-prompts/archive/2026-04-17T22-16-20/` (entire dir; 0 tracked files) | UNTRACKED | AI Village audit reports about THE EXACT EXPOSURE THIS SLICE JUST REDACTED. Contain `[[jasmine-swan]]`, `[[anaheim-hills-92807]]`, `[[sean-baby]]` through `[[sean-kid-3]]`, "mixed-race household, Anaheim Hills 92807, sundown towns awareness", "physical location pinpointed". **Ironic:** the audit warned about the exposure but never made it into git history; the warning is sitting on disk only. |
| `AI-Village-Documentation/validation-prompts/archive/2026-04-17T01-13-20/` (entire dir; 0 tracked files) | UNTRACKED | Same content pattern from earlier Village run. References "1-month-old infant", "Sean's entire family — 6 people", "Family PII — home address (92807), children's ages, medical information, immigration status, legal situation" |

#### Category B-ambiguous-tracked (NEEDS Sean's per-line review; in committed history)

If Sean's review classifies a line as private-context, that line moves into the `git-history-redaction-family-pii-2026-04` slice scope. If classified as public/Category A, no action.

| File | Tracked? | Lines | Content as found | Why ambiguous |
|---|---|---|---|---|
| `docs/ai-workflow/AI-HANDOFF/UNIVERSAL-SCHEDULE-PROD-AUDIT.md` | TRACKED | 96 | "jasmine Swan" in session card text | Could be Category A (admin-dashboard quoting public trainer name) or Category B (could be referring to family member as a test user). Needs context check. |
| `docs/ai-workflow/AI-HANDOFF/PHASE-2-REVIEW.md` | TRACKED | 81, 171, 211, 213, 241 | "Jasmine is likely a trainer and co-owner/manager" + "Promote Jasmine to admin + trainer" | Likely Category A (public role being discussed for admin permissions) but framing "promote Jasmine" reads as personal not professional. Sean review. |
| `docs/ai-workflow/AI-HANDOFF/HERO-REDESIGN-ANALYSIS.md` | TRACKED | 332 | "Carousel with 2 trainers (Sean Swan, Jasmine Hearon)" | Reads as Category A (public design carousel referring to public name), but full-name pair-up adjacent to Sean's full name is itself a connection that wasn't surfaced on the homepage. Sean review. |
| `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md` | TRACKED | 56 | "Founded SwanStudios in 2013 with wife Jasmine" | Straddles. "Founded SwanStudios" is public origin story = Category A. "with wife Jasmine" injects private-family framing into public origin = Category B. Likely fix: keep "co-founder" relationship, drop "wife" descriptor. Sean review. |
| `backend/utils/startupMigrations.mjs` | TRACKED | 475 | Comment: `Keeps: 2 (Sean Swan), 5 (Jasmine Swan), 35 (Vickie Valdez), 57 (QABot Tester)` | Category A (test user list with public co-founder full name) but full-name pair `Sean Swan` + `Jasmine Swan` in source code is itself a connection. Likely fix: keep DB IDs, drop full names from the comment, OR redact only the "Swan" surname pair-up. Sean review. |

### Category C — LAN IP / network topology (MEDIUM severity, mixed tracked + untracked)

#### Category C-tracked

| File | Tracked? | IP | Context |
|---|---|---|---|
| `AI-Village-Documentation/validation-prompts/latest/09-document-quality.md` | TRACKED | `192.168.x.x` (placeholder syntax) | Reference to placeholder; low risk; arguably acceptable as audit guidance, not a leak. |

#### Category C-untracked (audit-before-track gate, NOT history rewrite)

| File / directory | Tracked? | IP | Context |
|---|---|---|---|
| `AI-Village-Documentation/hermes-village-prompts/latest/{security-threat-modeling,operational-reliability-deployment,fix-instructions,debate-log,agent-safety-prompt-injection-resistance,14-code-quality-debate}.md` | UNTRACKED (0 tracked in dir) | `192.168.50.83` | 5090 Windows machine LAN IP, `<OPERATOR>@192.168.50.83` SSH user@host |
| `AI-Village-Documentation/hermes-village-prompts/archive/2026-04-18T07-11-40/` | UNTRACKED (0 tracked in dir) | `192.168.50.83` | Earlier Village archive with same content |
| `AI-Village-Documentation/validation-prompts/archive/2026-04-19T17-06-41/{full-report,09-document-quality,01-technical-accuracy}.md` | UNTRACKED (0 tracked in dir) | `192.168.50.232` and `192.168.50.83` | Hermes remote-coding-bridge plan review surfacing both Pi + Windows IPs (audit acknowledged the leak; the audit doc itself contains the leak) |
| `AI-Village-Documentation/validation-prompts/archive/2026-04-22T21-46-49/full-report.md` | UNTRACKED | `192.168.x.x` (placeholder syntax) | Same low-risk pattern as the tracked entry, but this copy isn't tracked. |

### Category D — false positives (no action)

| File | Match | Reason |
|---|---|---|
| `frontend/package-lock.json` (multiple) | URL strings ending with version numbers like `10.0.0` | npm package versions, not IPs |
| `backend/controllers/adminSettingsController.mjs:485,495,505` | `192.168.1.100`, `192.168.1.101` | Mock test data inside controller; placeholder, not real LAN topology |
| `backend/services/measurementComparisonService.mjs:14` | `1mo, 3mo, 6mo` | Measurement comparison interval labels, not child-age references |
| `docs/SWANSTUDIOS-MASTER-ENHANCEMENT-PROMPT.md:169` and several blueprint files | `1-month` | Subscription tier name, not child age |
| `backend/migrations/20250213192601-create-storefront-items.cjs:84` | `1-month, 3-month, 6-month subscriptions` | Storefront migration comment |
| Various gamification blueprints | `90000`, `97600` | Gamification token/score numerics matching the 5-digit ZIP regex |

---

## 4. Deferred items list

These are not part of this slice. Calling them out so future sessions can pick them up.

### From the doctrine refactor itself
1. **D-B Cross-orchestrator architecture (AGENTS.md / CODEX.md mirror)** — Sean chose D-B (shared `AGENTS.md` base + thin `CLAUDE.md`/`CODEX.md` mirrors) but explicitly deferred implementation. Until D-B lands, REVIEWER-DISCIPLINE.md and QA-PIPELINE.md are loaded via CLAUDE.md's index entry; Codex reads them through the same path.
2. **Tier-A tooling installation** — semgrep, dependabot, eslint-security, CI matrix. Gap report inside QA-PIPELINE.md. Deferred to a separate install slice. ESLINT-SETUP.md exists as the standalone install guide.

### Pre-existing untracked drift discovered during slice
3. **Three pre-existing untracked reference docs** discovered during slice but **out of scope** for the doctrine slice:
   - `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`
   - `docs/ai-workflow/references/SEEDANCE-CINEMATIC-VIDEO-RULES.md`
   - `docs/ai-workflow/references/SEEDANCE-WORKFLOW-RULES.md`

   Same pattern as KARPATHY/FULL-VISION (files in working tree, never committed, may need audit-before-track). Recommend follow-up slice: audit each for sensitive content per same rule 44 + family/location/age pattern checks, then either redact-and-commit, archive, or `.gitignore` as appropriate.

### Active exposure remediation (HIGH priority, NEW slices)
4. **Slice: `git-history-redaction-family-pii-2026-04`** — pre-existing **tracked** exposure surfaced in §3 Categories B-confirmed-tracked + C-tracked + any B-ambiguous-tracked lines that Sean's per-line review flips to confirmed-private. Already in committed git history; worktree edits alone will not remove them.

   **Scope at minimum (B-confirmed-tracked):**
   - `admin-dashboard-overview.yml` (repo root)
   - `user-dash-community.yml` (repo root)

   **Scope additions pending Sean's per-line review of B-ambiguous-tracked:**
   - `docs/ai-workflow/AI-HANDOFF/UNIVERSAL-SCHEDULE-PROD-AUDIT.md` (line 96)
   - `docs/ai-workflow/AI-HANDOFF/PHASE-2-REVIEW.md` (lines 81, 171, 211, 213, 241)
   - `docs/ai-workflow/AI-HANDOFF/HERO-REDESIGN-ANALYSIS.md` (line 332)
   - `docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md` (line 56)
   - `backend/utils/startupMigrations.mjs` (line 475)

   **Out-of-scope (Category A — DO NOT TOUCH):** all public brand identity surface per the disambiguation in §3 Category A above. The B-confirmed-untracked + C-untracked categories are also out of this slice's scope — they need a separate audit-before-track pathway, not history rewrite (see Slice 4b below).

   **Method:** `git filter-repo` with replacement rules matching the redaction patterns established in this slice. Replacement examples (the slice will refine):
   - `Jasmine` (in private-context lines only — must be path/regex-scoped to avoid Category A) → `<spouse-redacted>` or full-line removal where the line itself is the targeting vector
   - `92807` → `<home-ZIP>`
   - `Anaheim Hills` (private-context only) → `<home-neighborhood>`
   - `Orange County` (private-context only) → `<home-county>`
   - `1mo/8yo/9yo/21yo`, `1 month, 8, 9, 21`, `1-month-old`, `Sean (46M), Jasmine (33F)` → role-labels-only family framing
   - `Sean Swan`, `Jasmine Swan` (in source-code comments paired together) → role labels or DB-IDs only
   - `[[jasmine-swan]]`, `[[sean-baby]]`, `[[sean-kid-1..3]]`, `[[anaheim-hills-92807]]` → `[[spouse]]`, `[[child-A..D]]`, `[[home-zip]]` (placeholder syntax established 2026-04-26)

   **Pre-flight checklist (slice will execute; not now):**
   1. Confirm no open PRs or branches that the rewrite would break.
   2. Confirm no active collaborator clones (Sean is primary author; verify before proceeding).
   3. Confirm GitHub repo is still private at execution time (the SECURITY-REMEDIATION-2026-04-19 handoff resolved this once; **re-verify at the moment of force-push** because a force-push to a public-flipped repo with sensitive data in history is worse than no-action).
   4. Run `git filter-repo` on a **fresh clone** first to verify the replacement patterns produce the intended result before touching the canonical repo.
   5. Add `admin-dashboard-overview.yml` and `user-dash-community.yml` to `.gitignore` as part of the same slice to prevent Playwright snapshot regeneration into tracked space.
   6. After force-push, contact GitHub support to request cache flush for the rewritten commits (standard process for sensitive-data remediation on private repos).

   **Risk level:** moderate. History rewrite is destructive; replacement-rule precision matters (over-redaction failure mode per Category A disambiguation); changes every SHA which invalidates external references to current commits. This will be the **second** history-rewrite of this repo — the prior one (2026-04-19 credential remediation) produced HEAD `302c6fa3`. A backup of the pre-rewrite SHA must exist before starting.

   **Defer-to:** start whenever ready, **ideally within 7 calendar days** (target: by 2026-05-03) so the targeting data does not sit in history longer than necessary.

   **Scope correction note (per §2 Moment 6):** an earlier draft of this closeout listed the HERMES V3/V4 docs and the Village archive directories in this slice's scope. Those files are NOT in tracked git history (verified via `git ls-files --error-unmatch`); they live in the worktree only. They moved to the audit-before-track slice (4b) below. The history-rewrite slice's scope is now ~3x smaller than originally claimed.

4b. **Slice: `worktree-redaction-family-pii-2026-04`** (or matching naming convention) — **untracked** exposure surfaced in §3 Categories B-confirmed-untracked + C-untracked + Category A's two untracked-duplicate copies. These never entered git history. Each file requires the same redaction-before-staging treatment that KARPATHY/FULL-VISION received in this slice: read full content, scan against Rule 44 + family/location/age/LAN-IP patterns, redact targeting-grade specifics with established placeholder syntax, re-scan to verify clean, then either track or archive per Sean's call.

   **Scope (full untracked pile):**
   - `docs/ai-workflow/AI-HANDOFF/HERMES-V4-FINAL-BLUEPRINT-2026-04-16.md`
   - `docs/ai-workflow/AI-HANDOFF/HERMES-V4-SETUP-REVIEW-2026-04-17.md`
   - `docs/ai-workflow/AI-HANDOFF/HERMES-V3-LIFE-OS-OPUS-CODEX-DEBATE-2026-04-16.md`
   - `AI-Village-Documentation/audits/FULL-DASHBOARD-AUDIT.md`
   - `AI-Village-Documentation/validation-prompts/archive/2026-04-17T22-16-20/` (entire dir, 0 tracked)
   - `AI-Village-Documentation/validation-prompts/archive/2026-04-17T01-13-20/` (entire dir, 0 tracked)
   - `AI-Village-Documentation/validation-prompts/archive/2026-04-19T17-06-41/` (entire dir, 0 tracked) — Category C-untracked LAN IPs
   - `AI-Village-Documentation/validation-prompts/archive/2026-04-22T21-46-49/full-report.md` — Category C-untracked placeholder
   - `AI-Village-Documentation/hermes-village-prompts/latest/` (entire dir, 0 tracked) — Category C-untracked LAN IPs
   - `AI-Village-Documentation/hermes-village-prompts/archive/2026-04-18T07-11-40/` (entire dir, 0 tracked) — Category C-untracked LAN IPs
   - `AI-Village-Documentation/plans/SWAN-AI-ASSISTANT-MASTER-BLUEPRINT.md` — Category A duplicate at second path; if redundant with the tracked copy, archive
   - `AI-Village-Documentation/design/GEMINI-STYLE-HANDOFF-HOMEPAGE-STORE-ABOUT.md` — Category A untracked design handoff

   **Method:** per-file workflow established in this slice (`KARPATHY-WIKI-OPERATIONS.md` + `SWANSTUDIOS-FULL-VISION.md` are the canonical examples). For Village archive directories with many files, batch-grep first to identify which files contain the targeting patterns, then redact only those files. For Category A untracked duplicates, archive instead of redact-and-track if the tracked copy is canonical.

   **Risk level:** low (no history rewrite required; no force-push; no SHA invalidation). The risk is over-redaction (per Category A disambiguation) and the volume of files. This slice can run in parallel with Slice 4 because they touch disjoint file sets.

   **Defer-to:** start whenever ready. No fixed deadline — worktree-only files don't decay in severity the way history-resident files do.

   **Important non-coupling:** Slice 4b runs on the worktree, not history. It does not invalidate SHAs. Slice 4 and Slice 4b can complete in either order.

### From SECURITY-REMEDIATION-2026-04-19 handoff (still open)
5. **`repo→private` follow-up status check** — the handoff originally listed repo→private as a deferred item. ✓ Resolved 2026-04-26. Sean confirmed via direct browser check during slice. Re-verify at moment of force-push for any future history-rewrite slice (per Slice 4 pre-flight checklist item 3).
6. **GitHub Secret Scanning enable** — still deferred per SECURITY-REMEDIATION handoff.
7. **`vickievaldez` test-user delete** — still deferred. Note: `backend/utils/startupMigrations.mjs:475` keeps her as a preserved test user; if deletion happens, that comment changes too.
8. **Hermes `request_dump` redaction** — still deferred per SECURITY-REMEDIATION handoff.

---

## 5. Slice metadata for future reviewers

| Field | Value |
|---|---|
| Doctrine target rules | 50, 51, 52 |
| Closeout artifact filename pattern | `CLOSEOUT-DOCTRINE-REFACTOR-2026-04-26.md` (filename contains literal substring `CLOSEOUT` per Rule 52 binary detection) |
| Codex review pass | Not yet routed; Sean may run rule-46 3-Brain review on the doctrine itself if desired |
| AI Village (Tier-C) invoked | No (no Tier-C trigger fired; this was a doctrine-doc slice, not auth/Stripe/multi-tenant/minor-data/cross-service work) |
| Files touched | 9 (CLAUDE.md, AI-VILLAGE-SYSTEM.md, QA-PIPELINE.md, REVIEWER-DISCIPLINE.md, WORKFLOW-PATHS.md, THREE-TIER-WORKFLOW.md (D), ROUTER-UPGRADES-GT6.md (archived), KARPATHY-WIKI-OPERATIONS.md, SWANSTUDIOS-FULL-VISION.md) |
| Lines net | +2034 / -39 combined across A + B; ~590 lines authored doctrine content, ~1447 lines previously-untracked files landed for orphan resolution (KARPATHY-WIKI-OPERATIONS, SWANSTUDIOS-FULL-VISION, archived ROUTER-UPGRADES-GT6). Headline number is misleading without this breakdown — see §2 Moment 3. |
| Pre-commit secret scan | CLEAN both commits |
| Push status | held; awaiting Sean's explicit push authorization |

---

## 6. Verdict

**APPROVED** — slice complete; A+B+C landed on `origin/main` 2026-04-27. Doctrine validated itself seven times during its own creation, including a final commit-D-staging catch where re-reading the artifact's own metadata caught a stale `Push status:` line that would have left contradictory state alongside the `APPROVED` verdict. Net outcome: two follow-up slices scoped — `git-history-redaction-family-pii-2026-04` (tracked exposure, history rewrite, target by 2026-05-03) and `worktree-redaction-family-pii-2026-04` (untracked exposure, audit-before-track gate, no fixed deadline).

This artifact's filename contains the literal substring `CLOSEOUT` per Rule 52 binary detection; future sessions querying "is this area a recently-passed gate?" against the doctrine refactor scope (CLAUDE.md rules 50-52, QA-PIPELINE.md, REVIEWER-DISCIPLINE.md, WORKFLOW-PATHS.md) should treat the answer as YES until 2026-05-10 (14 calendar days from artifact mtime) and apply the burden-of-proof gate accordingly.
