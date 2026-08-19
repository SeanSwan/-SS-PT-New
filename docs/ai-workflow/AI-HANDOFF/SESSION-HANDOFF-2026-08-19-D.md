---
decision: "Handoff D: guards shipped and hostile-looped (3 rounds, 14 defects); unified-assistant plan written from a 3-model panel that rejected the author's central claim 3-0; next slice is the eval items, which gate everything and may conclude no training should happen"
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-2026-08-17-C.md
sanitized: true
---

# SESSION HANDOFF D — 2026-08-19
**Author:** Opus 5 · **For:** the next agent, cold

---

## 0. READ FIRST — two things that will waste your time if you skip them

**1. `node_modules` IS BEING WIPED REPEATEDLY. Check it before believing any failure.**

Right now, this instant: root `node_modules` = **70 entries**. A working tree needs ~499. Every backend script therefore dies with `Cannot find package 'dotenv'` / `'sequelize'`.

This has happened **twice in ~18 hours**. First occurrence is documented in `review-queue.md` — an agent chained a `cd` with a destructive git command; the `cd` failed and the destructive half ran in the shared main tree. It was fixed (`npm install` → 499 entries, verified), and it has now recurred, most likely alongside a merge from a parallel agent's branch.

**Fix:** `cd backend && npm install` — deps land in **root** `node_modules`; `backend/node_modules` staying at 0 is correct, Node resolves upward.

**Why this matters more than the fix:** I lost roughly an hour reading these failures as seven separate bugs in my own code, because my `grep` filters removed the error text and left only silence. **A script that worked an hour ago and now produces nothing is an environment problem until proven otherwise.** Run the raw command with no pipe before diagnosing anything.

**2. Load the `handoff` skill at session start** (`.claude/skills/handoff/SKILL.md`, Rule 83). Your session will also end in a transfer.

**Branches:** `main` deploys (Render). SWA-169 work is on `wip/comms-notifications-2026-07-05`, which **cannot merge** (SWA-79 boot-breaker). Never merge it. Guards live on `main`; the fine-tuning program lives on `wip`.

---

## 1. Verified state (commands run this session, re-derive before trusting)

```
git log -1                              -> cbaa9fb97 (wip), 0 unpushed
git log origin/main -1                  -> 4e8394673 (a parallel agent merged PR #49)
frontend-guards.test.mjs (main worktree)-> 21 passed, 0 failed
ai-agent-tuning: npm test               -> 47 tests, 47 pass, 0 fail  @ 80938bf
backend/scripts/schema-drift-check.mjs  -> FAILS: dotenv unresolvable (see §0)
root node_modules                       -> 70 entries (BROKEN; needs ~499)
```

---

## 2. What exists now

**Three deterministic guards, shipped on `main`:**
- `backend/scripts/schema-drift-check.mjs` — models vs live DB. **All four detectors proven able to fail** (mutation-tested: fake column → MISSING_COLUMN; fake table → MISSING_TABLE; wrong type → TYPE_DRIFT; predicate inversion → **238** FK_TARGET_DRIFT findings). Refuses to report CLEAN on an empty run.
- `frontend-guards.mjs` **G5** (Rule 43 mount-crash, css-helper) + **G6** (advisory 300-line cap). 21 tests. G5 resolves *direct relative* imports only — barrel/aliased re-exports are a known unfixed bound.
- `scripts/hooks/token-registry-check.mjs` — **607 distinct CSS tokens are used but never defined**, across 1,786 sites. They render a hardcoded fallback forever and can never respond to theming. **Plausible root cause for theme changes not applying**; advisory, unfixed, and a real product finding.

**Desktop launchers:** `Swan Training Studio.cmd` (VRAM preflight → stops Hermes with consent → Studio) and `Swan Code Guards.cmd` (menu; reports **NOT PRESENT — THIS IS NOT A PASS** when a check is absent rather than faking a pass).

**Agent identity:** `scripts/coordination-identity.mjs` — per-session ID anchored on `CLAUDE_CODE_SESSION_ID`, yielding a per-session lane filename so two `claude` sessions can no longer share one lane. `SWAN_AGENT_SURFACE`/`SWAN_AGENT_MODEL` are unset in this environment, so it displays `unknown-*`; setting them at launch makes lanes self-describing.

---

## 3. The hostile loop — NOT DRY, and honest about it

**3 valid rounds, 0 clean, 14 defects fixed.** Every round found real defects, so none can serve as the confirming round. `CLEAN×2` has never been earned and must not be claimed.

A fourth round would now be legitimate — its blocker (the unfalsified FK detector) is resolved.

**Round ledger:** H1 → GLM 16 findings / Qwen 3 / 4 found by my own pass → 8 fixed. H2 → Qwen DRY, GLM 3, my own new-vantage pass found 2 more → 5 fixed. H3 → **invalid**, I sent a packet with no source; GLM correctly refused (*"summaries are not attack surface"*), **Qwen certified it SOUND/DRY anyway**. H3-rerun → GLM 2 findings → 1 fixed, 1 is a known bound.

**Calibration that matters for routing:** GLM has been consistently strongest on methodology, but its H2 verdict line said "DRY" while its own body listed three findings — **take the findings, not the label**. Qwen returned DRY three times on rounds containing real defects, including one that never ran. **Qwen's verdicts are not usable as verdicts; only its individual findings, verified.**

---

## 4. The unified-assistant program (the main thread)

Sean re-scoped from three specialised models to **ONE assistant** — coding + Hermes tool-calling + training domain — on **Qwen3.8-27B** (verified trainable; no prebuilt 4-bit → quantize-on-load; training evicts Hermes at ~17GB).

**Plan:** `docs/ai-workflow/brainstorms/UNIFIED-ASSISTANT-PLAN-2026-08-19.md`. **Panel:** GLM + Qwen + Kimi ($0.92, approved) in `unified-assistant-consults-2026-08-19/`.

**My central claim was rejected 3–0.** I argued the three capabilities are one skill and reinforce; all three families called it motivated reasoning (it conflates *output format* with *cognitive mode*). **Unification survives on operational grounds** — one session reads a client record then patches the component rendering it. Do not re-litigate; do not re-adopt the synergy argument.

**Findings to build on:** tool-calling is **80–95% free from prompting alone** · coding is where weights earn their keep (prompts wall out ~18–24 rules; tacit convention can't be listed) · **calibration ("I don't know that token — retrieve it") is barely promptable and has the highest yield-per-row.**

**Three live dissents, preserved not averaged** — architecture (one weights set + mode tags vs three adapters), scale (**~3,050 vs 15,000 rows**), coding ceiling. Each has a named resolving experiment. **Do not split the difference.**

**"No regression ever" is impossible** over unmeasured behavior; reframed as **auditable** — none ships unmeasured, none survives unflagged. Protocol is a three-tier ledger with a **paired exact test** (block p<0.05, `L−W ≥ 2√d`, **no gating below d=5**), judge pinning as a versioned artifact, greedy/fixed-seed/batch-1.

---

## 5. YOUR WORK, in order

**1. Restore deps and verify** (§0). `cd backend && npm install`, then `node backend/scripts/schema-drift-check.mjs --model User` must print models/attributes. **If it fails, read the raw error with no pipe.**

**2. Eval items — 100 per capability. This gates everything.**
Kill criterion K3, verbatim: *"A no-regression program with n=40 suites is astrology."* Below ~100 items/capability the gate cannot separate signal from noise, and the honest deliverable becomes the prompt plus rollback discipline, **not training**.
**Sean authors the safety, voice and domain ideals personally** — R1 requires it, and a model writing its own grading key makes the benchmark worthless. Present the input, let him dictate the ideal. **10 at a time, safety slice first** — a 100-item block will never start.

**3. Measure the prompt ceiling** for coding and tool-calling against a deliberately strong baseline (Prompt 2 in the plan). This decides whether training happens at all. A weak baseline flatters the tune and is how the experiment lies.

**4. Only then** build ~3,000 rows → smoke-train 200 → full run → evaluate through the ledger.

**5. Hostile round H4** on the guards — legitimate now that FK is resolved. Fire GLM + Qwen ($0). **Kimi is PAID — ask Sean before any new campaign.** Bundle the actual source; a summary is not attack surface.

---

## 6. Sean's standing queue (only he can do these)
- **Rotate the Render API key** (exposed 2026-08-12).
- **DMARC record (SWA-13)** — his explicit standing ask.
- **Author the eval ideals** (§5.2) — the true critical path.
- Decide whether the 607 undefined CSS tokens get fixed, and whether the comms-branch migrations ever run (they are absent from the live DB; merging that branch without them breaks production).

---

## 7. Traps, all hit live
- **Deps vanish; silence is the symptom.** Check `node_modules` before diagnosing anything (§0).
- **`cd` persists between shell calls.** After `cd backend`, `node backend/scripts/x` resolves to `backend/backend/scripts/x` — a doubled-path error that looks identical to a missing package.
- **`$?` after a pipe reports the *pipe's* status**, not the program's. Measure exit codes directly.
- **`grep` filters hide errors.** Read raw output first; add filters only once the shape is known. This cost an hour.
- **`npm install` can look like it did nothing** — check where it actually wrote before concluding.
- **Non-ASCII breaks PowerShell `-File`** (ANSI vs UTF-8), and a syntax check reading UTF-8 will say "parses OK" while execution dies.
- **Git Bash mangles heredocs and hand-escaped shell.** Use file-write tools.
- **`unsloth train` exits 0 on failure.** Assert the checkpoint artifact.

---

## 8. PASTE-READY AGENT PROMPT

> You are picking up SwanStudios work mid-programme. Read `docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-2026-08-19-D.md` fully — it assumes zero context.
>
> **First: load the `handoff` skill** (`.claude/skills/handoff/SKILL.md`, Rule 83). Your session will also end in a transfer.
>
> **Before anything else, check `node_modules`.** It has been wiped twice in 18 hours by a parallel agent. Root should have ~499 entries; if it has ~70, run `cd backend && npm install`. **A script that worked recently and now produces no output is an environment problem until proven otherwise — read the raw error with no `grep`, no pipe.**
>
> **Branch discipline:** `main` deploys. SWA-169 lives on `wip/comms-notifications-2026-07-05`, which **cannot merge** (SWA-79). Never merge it. Another agent works this tree — read `.ai-workflow/coordination/`, claim your own lane via `node scripts/coordination-identity.mjs --lane`, and never overwrite someone else's.
>
> **Standing laws.** Proof-before-done: no "done/fixed/passing" without current-session reproducible evidence in the same message. Dry-loop: hostile rounds until one finds nothing, then one more confirming round — the loop is at **3 rounds, 0 clean**, so do not claim `CLEAN×2`. Panels fire GLM + Qwen ($0); **Kimi is PAID — ask Sean first.** Regression tests must assert the defeat condition: **mutate the code and watch the test die** before calling it proof.
>
> **Your work, in order:** (1) restore deps and verify; (2) **eval items, 100 per capability — Sean authors the safety/voice/domain ideals himself, 10 at a time, safety first**; (3) measure the prompt ceiling against a deliberately strong baseline; (4) only then build rows; (5) hostile round H4 with the real source bundled.
>
> **Guardrails:** never re-adopt the capability-synergy argument (rejected 3–0). Never average the recorded dissents — each has a named resolving experiment. Never generate the eval ideals yourself. Applying the comms-branch migrations to production is Sean's call alone.
>
> **Close** with the house gates: dual-tier summary (plain English first), dry-loop ledger, Linear sync to SWA-169, Hermes memo.
