---
decision: Hook-coverage audit of all 83 MANDATORY rules on origin/main. 13 rules have deterministic blocking enforcement, 9 partial, 2 non-actionable, 59 are prose-only. Ranked hookability list for the safety subset.
status: open
supersedes: none
---

# Hook-Coverage Audit — which of the 83 rules actually fire

- **Date:** 2026-08-21 · **Author:** Opus 5 · **Issue:** SWA-38 (Tier 1)
- **Measured against:** `origin/main` (this working tree is 2,158 commits behind and has only **73** rules — every figure below is main's)
- **Premise:** Qwen's line from the ARMS panel — *"the hooks are the control; the prompt is the documentation."* If a rule is not backed by a hook or a test, it fires only when the model happens to read it.
- **Read-only.** Nothing changed. No hook was added or modified.

---

## 0. Headline

**13 of 83 rules (16%) have deterministic blocking enforcement.** 9 more are partially covered. 2 are not action-shaped. **59 rules (71%) are prose-only** — they fire only if a model reads and heeds them.

That is not automatically a failure: most of the 59 are judgement disciplines that a grep genuinely cannot check. **The actionable finding is narrower and sharper: several rules whose violation is cheap to detect and expensive to miss are currently unenforced** — and one rule already has a working checker that nothing runs automatically.

**Correction to the ARMS audit, verified here:** I previously reported **109 rules**. The true count on `origin/main` is **83**, contiguous 1–83, no gaps. My `grep -cE "^[0-9]+\. \*\*"` ran over the whole file and swept in five unrelated numbered lists (the 4 Karpathy principles, 7 dual-pass steps, 7 design-critique steps, 2 load-order items, 6 priority items). Isolating the `## MANDATORY Rules` section first gives 83. Every prior document and the SWA-38 comment carried 109; all are corrected.

---

## 1. The enforcement surfaces that exist

| # | Surface | Event | Blocking? | Scripts |
|---|---|---|---|---|
| S1 | Claude `UserPromptSubmit` | every prompt | no (injects) | `prompt-watcher.mjs` |
| S2 | Claude `PreToolUse` (Bash) | before shell | **yes** | `privacy-boundary-gate.mjs --pretool`, `push-blast-radius.mjs` |
| S3 | Claude `SessionStart` | session open | no (injects) | `hermes-inbox-reminder.mjs`, `lane-session-start.mjs` |
| S4 | Claude `Stop` | turn end | **yes** | `privacy-boundary-gate`, `hermes-closeout-gate`, `dry-loop-gate`, `linear-sync-gate`, `dual-tier-gate`, `lesson-recall-gate`, `context-watch-gate`, `backup-after-work` |
| S5 | **git `pre-commit`** (`core.hooksPath=.githooks`) | every commit | **yes** | secret scan, `frontend-guards.mjs`, `constitution-guard.mjs`, `constitution-references.mjs` |
| S6 | npm script | **manual only** | no | `token-registry-check.mjs` (`npm run tokens:check`) |

`[VERIFIED]` — 12 distinct scripts wired in `.claude/settings.json`; 3 more wired in `.githooks/pre-commit`; 1 (`token-registry-check`) wired **only** as an npm script. `.githooks/pre-commit` is present and executable in this tree (`-rwxr-xr-x`, Aug 16), and `core.hooksPath` resolves to `.githooks`.

**S5 firing conditions differ per script** — read from the pre-commit body, not its header:

| Script | Fires when | Notes |
|---|---|---|
| `scan-secrets.sh --staged` | **every commit** | hard-fails if the scanner is not executable — fail-closed |
| `frontend-guards.mjs --staged` | **every commit** | walks staged `frontend/src` only |
| `constitution-guard.mjs` | **every commit**, if the script exists | if absent *and* `CLAUDE.md`/`AGENTS.md` is staged, the commit is **blocked** with a rebase instruction — a genuinely well-built fallback |
| `constitution-references.mjs` | **only when `CLAUDE.md` or `AGENTS.md` is staged** | resolves cited paths; its first run found five documents that never existed in git, two marked MANDATORY |

**`frontend-guards.mjs` implements six named checks** (`G1`–`G6`), which is why the frontend rules score better than the rest:

| Check | Rule | Behaviour |
|---|---|---|
| G1 | Rule 1 — no `@mui/*` | **blocks** |
| G2 | Rule 10 — no recharts | **blocks** |
| G3 | identity — retired Galaxy-Swan palette | **blocks**, no allowlist |
| G4 | Rule 6 — raw hex outside `var(--token, #hex)` | **blocks** (opt-out: `swan-guard-allow-hex`) |
| G5 | Rule 43 — `css\`\`` required for interpolating shared fragments | **blocks** (opt-out: `swan-guard-allow-template`) |
| G6 | Rule 4 — 300-line cap | **warns only** |

Scope caveat: G1–G6 run on **staged `frontend/src` files only**. Unstaged work and backend files are untouched.

---

## 2. Coverage map — all 83 rules

**Legend:** 🟢 blocking · 🟡 partial · ⚪ not action-shaped · 🔴 prose-only

### 🟢 ENFORCED — 13 rules

| Rule | Enforced by | Surface |
|---|---|---|
| 1 No Material-UI | `frontend-guards` G1 | S5 |
| 6 No hardcoded colors | `frontend-guards` G4 (*shape only* — see §3.1) | S5 |
| 8 Zero PII to LLMs | `privacy-boundary-gate` — **the only fail-closed gate** | S2+S4 |
| 10 Victory only | `frontend-guards` G2 | S5 |
| 43 `css\`\`` helper for style chunks | `frontend-guards` G5 | S5 |
| 44 Secret scanning on writes | pre-commit secret scan + `privacy-boundary-gate` | S5+S4 |
| 57 Dual-Tier Summary | `dual-tier-gate` | S4 |
| 61 Slice-internal hostile review | `dry-loop-gate` | S4 |
| 66 prompt-watcher | `prompt-watcher` | S1 |
| 68 Hermes learning packet | `hermes-closeout-gate` | S4 |
| 69 Hermes inbox memo | `hermes-closeout-gate` + `hermes-inbox-reminder` | S4+S3 |
| 74 Proof-Before-Done | `dry-loop-gate` PROOF token | S4 |
| 83 Handoff skill | `context-watch-gate` | S4 |

*(Also enforced but not numbered rules: SWA-23 Linear board sync via `linear-sync-gate`; the constitution's own integrity via `constitution-guard`; lesson repetition via `lesson-recall-gate`; backups via `backup-after-work`.)*

### 🟡 PARTIAL — 9 rules

| Rule | What's covered | What isn't |
|---|---|---|
| 4 Max 300 lines | G6 **warns** | never blocks; opt-out is a bare comment |
| 17 Dual-pass completion | dry-loop rounds | the *builder-then-reviewer* role switch is unchecked |
| 19 No speculative success language | PROOF token required | the forbidden phrases themselves are not scanned |
| 28 Claim-to-Evidence Lock | PROOF token | no check that a Canonical Surface Receipt exists |
| 41 Closeout routes through the skill | the Stop gates do the work | the skill itself is never confirmed loaded |
| 42 Pre-Push Backend Audit | `push-blast-radius` covers migration/deploy blast radius | **the two `git ls-files --others` / `git diff` checks that Rule 42 actually mandates are not run** |
| 59 Read-time secret exposure | `privacy-boundary-gate` guards writes/commits | **the read side — `Grep -output_mode content` on `.env` — is not gated** |
| 67 Multi-agent coordination | `lane-session-start` orients; `push-blast-radius` guards push | no read-before-edit enforcement on the edit itself |
| 73 ADW discipline | dry-loop marker | the three-actor separation is unchecked |

### ⚪ NOT ACTION-SHAPED — 2 rules
Rule 11 (Render is a paid plan — a fact) · Rule 12 (repealed tombstone).

### 🔴 PROSE-ONLY — 59 rules
2, 3, 5, 7, 9, 13, 14, 15, 16, 18, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 60, 62, 63, 64, 65, 70, 71, 72, 75, 76, 77, 78, 79, 80, 81, 82.

---

## 3. The actionable subset — cheap to detect, expensive to miss

Most of the 59 are judgement calls a grep cannot adjudicate (Rule 22 "premium design standard" has no mechanical form). **These do not.** Ranked by (damage if missed) ÷ (cost to hook):

### 3.1 — Rule 6 already has a checker that nothing runs. **Fix first.**
`token-registry-check.mjs` exists on main and is wired **only** as `npm run tokens:check`. Its own header states the gap precisely: G4 proves the *shape* is right (`var(--token, #fallback)`) but nothing checks the token **exists**. So a typo'd token name passes the blocking gate and silently falls back forever. **The checker is written, tested, and unwired.** Adding it to `.githooks/pre-commit` beside `frontend-guards` is a one-line change and the highest value-per-character item in this audit.

### 3.2 — Rule 42 is enforced in name only. **Highest damage.**
Rule 42 exists because untracked or modified-uncommitted backend files **crash Render at boot** — a documented 2026-04-12 incident with a crash-loop series. The rule mandates two specific commands. `push-blast-radius.mjs` guards migrations and deploy blast radius, which is adjacent but different: it does not run `git ls-files --others --exclude-standard backend/` or `git diff --name-only HEAD backend/`. Both are sub-second, purely mechanical, and map to a production-outage failure mode. This is the clearest unenforced rule with a real incident behind it.

### 3.3 — Rule 59's read side is ungated.
`privacy-boundary-gate` is fail-closed on writes and commits. The **read** path that caused the 2026-05-04 incident — a `Grep` with `output_mode: "content"` against `.env`, surfacing a live API key into chat — has no PreToolUse gate. A matcher on `Grep`/`Read`/`Bash` targeting `.env`-class paths with content output would close it. Note this is a **tool-level** gate, not Bash-only, so it needs a different matcher than the existing `PreToolUse: Bash` entries.

### 3.4 — Rule 72's freshness check exists and is unscheduled.
`catalog-regen.mjs --check` exits 2 when distillation is needed (confirmed: exits 2 today, 338/584 visible rows stale). Nothing runs it. This is the same class as 3.1 — a written checker with no trigger — and it is exactly why the catalog went ~215 docs dark. **Do not wire this as a pre-commit hook**: run from a stale branch it would drop ~189 docs. It belongs on the allowlisted maintenance runner (ARMS Tier 2), scoped to `main`.

### 3.5 — Rule 45 (no amend/rebase/force-push without Sean) is greppable and unhooked.
A `PreToolUse: Bash` matcher for `commit --amend`, `rebase`, `push --force`/`-f`, `reset --hard` is the same shape as the existing `push-blast-radius` entry and covers an irreversible-action rule. Low effort, high blast radius if missed.

### 3.6 — Rules 2 / 5 / 7 are mechanically checkable and would extend `frontend-guards` cheaply.
Rule 2 (44px touch targets) and Rule 5 (blueprint header on components >100 lines) are greppable with the same staged-file walk G1–G6 already does. Rule 7 (WCAG 4.5:1) is computable — and `colorScience.ts` already exists in-repo as a WCAG+OKLab auditor (per MEMORY.md, from the Swan Lens work). These are G7/G8/G9 candidates, not new infrastructure.

### 3.7 — Rule 4's advisory status is a deliberate choice worth revisiting, not a defect.
G6 warns rather than blocks, with a bare-comment opt-out. Given Rule 4 is one of the most-cited rules, "warn with a free opt-out" is close to unenforced. Flagging for Sean's call rather than proposing a change — tightening it would fire on existing violations across the tree (Rule 34: no blind cleanup).

---

## 4. What this does NOT recommend

- **Do not try to hook the other 52 prose rules.** Rules 15 (recursive planning), 22 (premium design), 26 (canonical surface receipt), 51 (confidence tags), 62 (strategy gate) and their kin encode judgement. A grep-shaped proxy for them produces exactly the failure the learning corpus already recorded twice this month — *"a gate that scores adjacent properties certifies the failure"* and *"a written trap is not a control."* A bad gate is worse than an honest absence because it reports green.
- **Do not treat 16% as a scandal.** The 13 enforced rules are, with the exception of Rule 42, the *right* 13: PII, secrets, the two closeout channels, proof-before-done, the hostile loop, and the frontend bans. The gaps are specific, not systemic.
- **This does not unblock the CLAUDE.md size work.** Even at full coverage of §3, ~50 rules stay prose-only, so "thin the file and rely on triggers" remains the unsafe half of SWA-38. Extract the brochure; keep the rules inline.

---

## 5. Recommended order

| # | Action | Effort | Risk | Why |
|---|---|---|---|---|
| 1 | Wire `token-registry-check` into `.githooks/pre-commit` | XS | LOW | checker already written and tested; one line |
| 2 | Add Rule 42's two `git` checks to the pre-push/pre-commit path | XS | LOW | maps to a real Render crash-loop incident |
| 3 | `PreToolUse` gate for Rule 45 irreversible git ops | S | LOW | mirrors `push-blast-radius`'s existing shape |
| 4 | `PreToolUse` gate for Rule 59 read-side secret exposure | S | MED | needs a non-Bash matcher; verify it doesn't fire on ordinary reads |
| 5 | `catalog-regen --check` on the maintenance runner, `main`-scoped | S | LOW | blocked on ARMS Tier 2; **must not** be a pre-commit hook |
| 6 | G7/G8/G9 in `frontend-guards` (Rules 2, 5, 7) | M | MED | will surface existing violations — needs a Rule 34 pass first |
| 7 | Sean's call on Rule 4 blocking vs advisory | — | — | decision, not a build |

**Next slice (Rule 60):** items 1 and 2 together — both are XS, both wire existing or trivially-written checks into the pre-commit path that already runs, and item 2 closes the only unenforced rule in this audit with a production outage behind it.
