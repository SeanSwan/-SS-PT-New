# Debate: validation-orchestrator.mjs Drift Fix

> **Created:** 2026-04-22
> **Author:** Claude Opus 4.7 (CEO)
> **Status:** CONSENSUS REACHED — IMPLEMENTED 2026-04-22 under Sean's executive close-out (Codex gate skipped due to latency; Path 3 Sean-only review per Section 5)
> **Prerequisite:** Phase A permission tightening (CONSENSUS REACHED 2026-04-22)
> **Source memory:** `memory/project_validation_orchestrator_drift_2026_04_22.md`
> **Predecessor evidence:** `CODEX-PERMISSION-TIGHTENING-DEBATE-2026-04-22.md` Section 15 (Village ABORTED)

---

## 1. Context

During Phase A's Village invocation (2026-04-22), the orchestrator output revealed two distinct drift classes from the 2026-04-06 privacy audit. Sean killed the run after Phase 1 completed; one Chinese-model leak (MiniMax M2.7 receiving the permission-tightening debate file) had already occurred.

**Source-of-truth privacy policy** (per `MODELS` object comment at `scripts/validation-orchestrator.mjs:67-68`):
> "Policy: No Chinese models for sensitive roles (security, competitive intel, user research). Remaining Chinese model: MiniMax M2.7 (design debates only — lowest sensitivity, no free US equivalent)."

The script's own comment makes the policy explicit. The drift is a violation of the script's stated policy, not just memory drift.

---

## 2. Scope (Precise Targets from Direct Code Read)

### 2.1 Real audit violations (privacy leaks)

| Site | File:line | Track | Mode | Currently calls |
|---|---|---|---|---|
| **A** | `scripts/validation-orchestrator.mjs:383` | "Architecture & Bug Hunter" | code-review | `MODELS.minimaxM27` |
| **B** | `scripts/validation-orchestrator.mjs:1010` | "Implementation Risk Assessment" | planning | `MODELS.minimaxM27` |
| **C** | `scripts/validation-orchestrator.mjs:81` | escalation2 (constant alias) | both | `'minimax/minimax-m2.7'` |

**Sites A and B are unambiguous violations.** Architecture/bug-hunting and risk assessment are NOT design debates.

**Site C (escalation2 constant) is debatable** — it's invoked from CRITICAL-finding escalation (lines 2141, 2474), where the deep-dive content is whatever was flagged CRITICAL by Phase 1. That could include security findings, data-safety findings, etc. — NOT exclusively design. Tentatively also a violation; flagged for D3 below.

### 2.2 Cosmetic label drift (banner / track names lie)

| Site | File:line | Issue |
|---|---|---|
| `scripts/validation-orchestrator.mjs:539` | track named `'Code Architecture (Qwen)'` but `model: MODELS.nemotron3Super` | Qwen was removed; label stale |
| `scripts/validation-orchestrator.mjs:561` | track named `'Bug Hunter II (Step)'` but `model: MODELS.nemotron3Nano` | Step was removed; label stale |
| `scripts/validation-orchestrator.mjs:1685-1687` | banner mentions `Step Bug Hunter II` and `MiniMax M2.5` debate participants | text refers to removed/incorrect models |
| `scripts/validation-orchestrator.mjs:1732-1735` | top startup banner same drift | text refers to removed Chinese models |
| `scripts/validation-orchestrator.mjs:1739` | banner `A. Security: Step 3.5 ↔ Nemotron 3 Super` | Phase 2A actually runs Nemotron Nano ↔ Nemotron Super |
| `scripts/validation-orchestrator.mjs:1972, 1974` | duplicated banner copy | same drift |
| `scripts/validation-orchestrator.mjs:2330` | comment `Step 3.5 = primary security authority` | Step removed |
| `scripts/validation-orchestrator.mjs:2390` | comment `Only Claude costs, Qwen is free` | Qwen removed |
| `scripts/validation-orchestrator.mjs:2584-2585, 2732-2735` | output filename map / docs reference `qwen` / `step` | label drift propagates to artifact filenames |

### 2.3 Audit-compliant (DO NOT TOUCH)

- **Phase 2C UX/UI Design debate** — `gemini31Pro ↔ minimaxM27` (lines 2090, 2101, 2110, 2417, etc.). This IS a design debate, exactly what the policy permits.
- All currently-US slots (Phase 1 slots 1, 2, 3, 4, 5, 6, 8, 9, 10, 11 in code-review; equivalent in planning).

---

## 3. Proposal

### 3.1 Site A fix — Architecture & Bug Hunter (line 383)

```diff
     {
       name: 'Architecture & Bug Hunter',
-      model: MODELS.minimaxM27,
+      model: MODELS.nemotron3Super,
       prompt: `You are a principal software engineer doing a deep architecture review and bug hunt. ...
```

**Rationale:** Nemotron 3 Super (NVIDIA/US, FREE, 120B MoE) is the established US replacement choice already used in adjacent slots (Security II line 520, Code Architecture line 540). Same risk-tier, same provider, no cost. The "#1 ranked programming AI" claim in the prompt comment becomes inaccurate but the role still gets a competent code reviewer.

### 3.2 Site B fix — Implementation Risk Assessment (line 1010)

```diff
     {
       name: 'Implementation Risk Assessment',
-      model: MODELS.minimaxM27,
+      model: MODELS.nemotron3Nano,
       prompt: `You are a project manager and risk assessor for a software project. ...
```

**Rationale:** Nemotron 3 Nano (NVIDIA/US, FREE, 30B MoE) is the established choice for planning-tier risk/persona work (slot 6 User Research, slot 9 Security & Privacy Planning, slot 12 Mobile & Edge Case). Same risk-tier, no cost.

### 3.3 Site C fix — escalation2 constant (line 81)

**Recommended (option C-1): replace with Nemotron Super:**
```diff
   // ── SMART ESCALATION (only triggered for CRITICAL findings or stalled debates) ──
   escalation1:    'nvidia/nemotron-3-nano-30b-a3b:free',   // FREE — NVIDIA/US — replaces GLM-4.7 (was Z-AI/China)
-  escalation2:    'minimax/minimax-m2.7',                  // $0.30/$1.20 per M — MiniMax/China — CRITICAL escalation only
+  escalation2:    'nvidia/nemotron-3-super-120b-a12b:free', // FREE — NVIDIA/US — CRITICAL escalation deep-dive (replaces MiniMax M2.7)
```

**Alternative (option C-2): keep MiniMax M2.7 in escalation but document the carve-out:**
- Argues escalation is rare, only fires on CRITICAL findings, and Sean explicitly invokes (not auto)
- BUT: when it fires, the content is the CRITICAL finding which is by definition the most sensitive part of the validation
- BUT: the consult-gemini.mjs argv-trace incident (memory) and similar suggest escalation often fires on real production-incident debug content

**Recommendation: C-1.** Escalation receives the most sensitive findings; this is the LEAST appropriate place for a Chinese model.

### 3.4 Site D fix — label drift cleanup

5 sites of stale labels and banner text. The fix is pure string replacement — no behavior change. Examples:

```diff
- name: 'Code Architecture (Qwen)',
+ name: 'Code Architecture (Nemotron Super)',
```

```diff
- name: 'Bug Hunter II (Step)',
+ name: 'Bug Hunter II (Nemotron Nano)',
```

```diff
-   console.log('  ║    Gemini 2.5 Flash · Claude Sonnet 4.6 · Step 3.5    ║');
-   console.log('  ║    Nemotron 3 Super · Step Bug Hunter II · Data Safety   ║');
+   console.log('  ║    Gemini 2.5 Flash · Claude Sonnet 4.6 · Nemotron Nano  ║');
+   console.log('  ║    Nemotron 3 Super · Nemotron Nano (Bug Hunter II) · Data Safety ║');
```

```diff
-     console.log(`    A. Security Planning: Step 3.5 ↔ Nemotron 3 Super (FREE)`);
+     console.log(`    A. Security Planning: Nemotron 3 Nano ↔ Nemotron 3 Super (both FREE)`);
```

Full diff list will follow in implementation phase. Estimated 12-15 string edits.

### 3.5 Site E — defensive audit-compliance fail-fast check

Add at script-init (after `MODELS` object, before any Phase invocation):

```javascript
// Audit-compliance fail-fast (per memory/project_validation_orchestrator_drift_2026_04_22.md)
// Scans all Phase 1 / Phase 2 / escalation model assignments and refuses to run
// if any Chinese model ID appears outside the explicitly-allowed design-debate slots.
function assertAuditCompliance(tracks, debates, escalationConfig) {
  const CHINESE_MODEL_IDS = ['minimax/', 'stepfun/', 'qwen/', 'deepseek/', 'z-ai/'];
  const ALLOWED_DESIGN_SLOTS = ['UX/UI Design Planning Debate (Phase 2C)', 'UX/UI Design Debate (Phase 2C)'];

  const violations = [];
  for (const track of tracks) {
    if (CHINESE_MODEL_IDS.some(prefix => track.model?.startsWith?.(prefix))) {
      if (!ALLOWED_DESIGN_SLOTS.includes(track.name)) {
        violations.push(`${track.name} → ${track.model}`);
      }
    }
  }
  // (similar checks for debates + escalationConfig)

  if (violations.length > 0) {
    console.error('  [AUDIT-FAIL] Chinese model(s) configured outside design-debate slots:');
    violations.forEach(v => console.error(`    - ${v}`));
    console.error('  See memory/project_validation_orchestrator_drift_2026_04_22.md');
    process.exit(2);
  }
  console.log('  [audit-compliance] OK — Chinese models only in design-debate slots');
}
```

Invoked from `main()` before any track launches.

### 3.6 What we are NOT proposing

- **Not** modifying Phase 2C UX/UI Design debate (audit-compliant, intentional design role).
- **Not** changing the `escalation1` constant (already Nemotron Nano, audit-compliant).
- **Not** tightening the model lists more broadly (e.g. moving away from `gemini-2.5-flash` for cost/policy reasons) — out of scope.
- **Not** archiving the `minimaxM27` constant — it's still used by Phase 2C correctly.

---

## 4. Decision Points

### D1 — Replacement model for Sites A & B
- **(a)** Nemotron Super (Site A) + Nemotron Nano (Site B) — recommended; matches existing track-tier patterns; $0.
- **(b)** Both → Claude Sonnet 4.6 — premium quality but ~$0.10-0.30 added per validation run.
- **(c)** Both → Nemotron Nano — cheapest, but Architecture/Bug Hunter benefits from the larger 120B model.

**My recommendation: (a).**

### D2 — Site C escalation2 replacement
- **(a)** Replace with Nemotron Super (option C-1 above) — recommended.
- **(b)** Keep MiniMax M2.7 with documented carve-out (option C-2).
- **(c)** Remove escalation2 entirely; re-route CRITICAL escalation to a single US model.

**My recommendation: (a).**

### D3 — Fail-fast check enforcement strictness
- **(a)** Hard `process.exit(2)` on violation — script refuses to run.
- **(b)** Warn-only on violation — log warning, continue.
- **(c)** Hard fail PLUS visible green check on success ("`[audit-compliance] OK`") so absence of either log is itself a smell.

**My recommendation: (c).**

---

## 5. Review Depth — Sean's Choice

**Path 1 — Full 3-brain (Gemini → Codex → consensus).** Same as Phase A. ~30-60 min total. Catches more issues but Phase A demonstrated Gemini's first pass on tooling-config debates often produces design-flavored scope creep that Codex has to reject. Maybe lower value here.

**Path 2 — Compressed (Codex only).** Skip Gemini, go straight to Codex review. Faster. Codex is the technical-reliability brain; that's exactly the lens this debate needs. Phase A's Codex rounds were where the substantive findings actually landed.

**Path 3 — Sean review only.** No external brain. You read this file, decide, I implement.

**Recommendation: Path 2 (Codex only).** This is a focused tooling fix, not a design or product decision. Gemini's added value would be marginal; Codex's added value is real (verifying my model-ID strings against current OpenRouter listings, catching any false-positive in the fail-fast check, validating the escalation2 reasoning).

---

## 6. Review Chain Final Status

| Round | Reviewer | Status |
|---|---|---|
| 0 | Claude (this draft) | ✅ COMPLETE |
| 1 | Sean — chose Path 2 (Codex compressed); locked D1=a, D2=a, D3=c plus 2 guard refinements (case-insensitive normalize + bidirectional carve-out comments) | ✅ COMPLETE |
| 2 | Codex Round 1 prompt sent | ⏸ ABORTED — gate latency, Sean executive override to Path 3 |
| 3 | Sean direct review-and-approve under Path 3 | ✅ COMPLETE |

---

## 7. Implementation Log

**Status:** IMPLEMENTED 2026-04-22.

### 7.1 Site swaps (privacy-critical)

| Site | Before | After | Method |
|---|---|---|---|
| A (line ~383) | "Architecture & Bug Hunter" → `MODELS.minimaxM27` | → `MODELS.nemotron3Super` | direct constant swap |
| B (line ~1010) | "Implementation Risk Assessment" → `MODELS.minimaxM27` | → `MODELS.nemotron3Nano` | direct constant swap |
| C — constant (line ~81) | `escalation2: 'minimax/minimax-m2.7'` | `escalation2: 'nvidia/nemotron-3-super-120b-a12b:free'` | constant swap |
| **C — call sites (EXPANDED)** | planning escalation (line ~2141) + code-review escalation (line ~2480) called `MODELS.minimaxM27` **directly**, bypassing `escalation2` | both now call `MODELS.escalation2` with updated console output, prompts, cost calc | direct call-site swap |

**Site C scope expansion was discovered mid-implementation.** The original plan assumed the `escalation2` constant rename was sufficient. Source scan revealed two direct `MODELS.minimaxM27` call sites in escalation paths that bypassed the constant entirely. Per Sean's principle ("guard checks actual model IDs, not variable names"), the fix had to extend to the actual call sites. Same principle, larger surface than originally specced.

### 7.2 Label cleanup (9 edits)

- Track name `'Code Architecture (Qwen)'` → `'Code Architecture (Nemotron Super)'`
- Track name `'Bug Hunter II (Step)'` → `'Bug Hunter II (Nemotron Nano)'`
- Top startup banner: 4 lines updated to remove Step/MiniMax non-design references
- Phase 2A banner labels (code-review + planning modes): `'Step 3.5 ↔ Nemotron'` → `'Nemotron Nano ↔ Nemotron Super'`
- Asterisk-header banners in report-generation footer: same Step/Qwen/MiniMax cleanup
- Comment `Step 3.5 = primary security authority` → `Nemotron 3 Nano = primary security authority (post-2026-04-06 privacy audit replacement for Step 3.5)`
- Comment `Only Claude costs, Qwen is free` → `Only Claude costs, Nemotron Super is free`
- Filename map: added new keys for renamed tracks; preserved legacy keys with explicit "Legacy slugs (backwards compat)" annotation
- Docs filename table: updated descriptions to match new model assignments

Phase 2C UX/UI design references (banner mentions of "Gemini 3.1 Pro ↔ MiniMax M2.7") intentionally kept — Phase 2C is the legitimate design-debate exception per policy.

### 7.3 Fail-fast guard

`assertNoChineseProviderInPolicyConstrainedTracks` added between `MODELS` and `CONFIG` constants. Behavior:
- Lowercase-normalizes resolved model ID strings (catches `MiniMax/...` casing variants).
- Prefix-matches against `['minimax/', 'stepfun/', 'qwen/', 'deepseek/', 'z-ai/']`.
- On any violation: prints structured `[AUDIT-FAIL]` log + exits with `process.exit(2)`.
- On clean pass: prints `[audit-compliance] OK at <checkpoint>`.
- JSDoc explicitly documents the limitation: "relies on calling code passing the correct tracks; does NOT auto-discover all model invocations in the file."

Invoked at all 3 Phase 1 launch points: docs (`phase1-docs`), planning (`phase1-planning`), code-review (`phase1-code-review`). Each invocation passes both the Phase 1 tracks array AND `[MODELS.escalation1, MODELS.escalation2]` for combined surface coverage.

### 7.4 Bidirectional carve-out comments at Phase 2C

Per Sean's directive (carve-out discoverable from both guard side AND exempt-call side):
- Phase 2C planning modelB definition (line ~2094): comment added explicitly noting the guard does NOT scan this code path.
- Phase 2C code-review modelB definition (line ~2422): same comment added.
- Guard JSDoc references the Phase 2C carve-out from its own side.

### 7.5 Verification

| Check | Result |
|---|---|
| `node -c scripts/validation-orchestrator.mjs` | ✅ Syntax OK |
| Grep `minimax/\|stepfun/\|qwen/\|deepseek/\|z-ai/` | Only legit `minimaxM27` constant + removed-model docs + guard's own provider list. No active non-design invocations. |
| Grep `Step\|Qwen` | Only normal English ("Step-by-step"), audit-trail comments, and legacy backwards-compat entries (labeled). No active stale labels. |

All 3 audit assertions per Sean's locked scope pass:
- ✅ no non-design MiniMax use
- ✅ no stale Chinese-model labels
- ✅ design-only MiniMax remains allowed (Phase 2C intact)

### 7.6 Closeout

- Memory updated: `memory/project_validation_orchestrator_drift_2026_04_22.md` now reflects FIXED status with full implementation log.
- This debate file is now the canonical record. Per CLAUDE.md debate protocol, will be archived to `debate-archive/` once Phase B opens.

---

## 8. Final Consensus

**CONSENSUS REACHED 2026-04-22.** Orchestrator drift fix IMPLEMENTED. Privacy gap closed. Validation orchestrator can now be safely re-invoked (e.g. for any future Village validation run that needs to be redone).

**Note on Phase A debate:** Section 15 of `CODEX-PERMISSION-TIGHTENING-DEBATE-2026-04-22.md` (Phase A's aborted Village section) is now eligible for re-invocation if Sean wants Village validation on the permission-tightening work. The orchestrator drift that caused the original abort is fixed.

Next workstream: Phase B — cross-system continuity bridge.
