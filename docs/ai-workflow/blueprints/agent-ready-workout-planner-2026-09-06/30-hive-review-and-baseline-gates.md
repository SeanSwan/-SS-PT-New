# Hive review (Fable + Astra + Qwen 3.8) — Gates 0/1 closed

## The hive run (Sean-directed, 2026-09-15)

| Seat | Transport | Model | Result | Cost |
|---|---|---|---|---|
| Astra | consult-hive (OpenRouter; flat-rate Codex seat was usage-limited until Sep 19, CLI also upgraded 0.146.1→0.154.0) | openai/gpt-5.5 | hostile review (truncated at output cap mid-D2; D1 legality-gate counting bug + D2 rounds/duration mismatch captured) | $0.28 |
| Qwen 3.8 | consult-hive (setup this session: `scripts/consult-hive.mjs`; max-0902 reasons past any token cap → 3.8-flash used, same 3.8 voice) | qwen/qwen3.8-flash | full ranked review: 4 defects + 8 upgrades + 4 mentions | $0.003 |
| Fable | consult-fable (Context Gateway; SWAN_CONTEXT_MAX_USD set to 0.25 first, raised to 0.85 for the single Final-Decider call after the gateway estimated $0.81) | anthropic/claude-fable-5 | VERDICT: LOCK-WITH-CHANGES + 11 rulings + locked sequence | $0.299 |

**Total actual metered spend: ≈ $0.58** (plus ~$0.10 on two Qwen-max attempts that returned
length-capped empty content — reasoning tokens bill even when content is empty; recorded).

## Fable's rulings — Final-Decider adoption (this agent concurs)

- **Gate 0 (executed):** layered work committed — `9ee2ad5f2` (55 files) + `7ba934e6a` (2 tag-fix
  lines) + `df3b6ee56` (matrix spec missed by git add -u) — tagged `rolodex-bootcamp-baseline-v1`.
  The commit was first blocked by the frontend-guards pre-commit hook: 95 PRE-EXISTING legacy hexes
  across 13 staged files, line-tagged per the guard's own G4 policy (`legacy-pre-5431519a4`;
  prose/comment lines tagged as plain text). Two mis-taggings that broke tsc were caught by Gate-1
  tsc and repaired.
- **Gate 1 (executed on the tag, integrated, machine-emitted):** planner **457 passed (87 files)** ·
  BootcampBuilder **217 passed (39)** · hooks+sprint **280 passed (64)** · UniversalMasterSchedule
  **363 passed (96)** · pain/generation **39 passed (3)** · census suites **1266 (205)** + **869
  (164)** · backend repair group **89 passed (14)** · server-RED **25 passed (4)** incl. real
  PostgreSQL (fixture server had stopped; restarted from its data dir) · `tsc --noEmit` 0 errors.
- **Enhancement backlog (Qwen-ranked, Fable-sequenced behind the gates):** U1 pain-swaps visible in
  the runner; U2 exclusion window (stops back-half novelty starvation); U3 advisory-lock lease
  (deletes ~120 lines of race surface); D-Q1 incremental memory rebuild (O(n²)→n per commit); D-Q3
  claim-cleanup ops visibility; D-Q4 runner clock unification; U4 weekly parallel generation; U5
  gating purity (no input mutation); U6 roster cache; U7 runner persistence + visibilitychange; U8
  progression sparkline. Astra's D1 (requiredSlots −1 counting) and D2 (rounds/duration mismatch)
  join the defect list. Fable's contract items: prescribedWorkSec unit lock, PII/PHI audit of the
  pain path (IDs-only proof at the model boundary), house-rule sweep (≤300-line, copy scan),
  scorer-parity goldens in CI, SSE reconnect backoff.
- **PII note (F-5, taken seriously):** generation requests carry no client PII today (the pain
  gate aggregates server-side); the boundary audit test is queued with the contract hardening.

## Qwen 3.8 "voice" (transcript SWA-160)

The seat now exists in the hive (`consult-hive.mjs --seat qwen` → `qwen/qwen3.8-max-0902`, flash
variant for reasoning-heavy calls) — the Hermes-terminal Qwen 3.8 upgrade from the August
transcript now has a review-channel presence, not just a local model.

## Label

GATE 0 + GATE 1 COMPLETE on `rolodex-bootcamp-baseline-v1` (df3b6ee56). Enhancement backlog ranked
and locked behind the gates. NOT DEPLOYED, no push (Render auto-deploys from main; this branch is
not main). PG audit server left running on 55479 as found.
