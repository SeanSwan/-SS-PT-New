# FABLE CONTROL LAYER — Phase Completion Audit Record (Rule 48)

## 1. Phase header

- **Phase:** Fable Control Layer + Hermes Agentic OS + Design Brain (docs) → first runtime slice (receipt/queue spine)
- **Scope:** SESSION-O doc build (2026-07-03) → hostile-review-to-DRY → 110 operating-file patch → Codex push `529edc02a` → SESSION-P decisions pass + runtime Slice 1 (2026-07-04)
- **Reviewed by:** two independent SESSION-O hostile reviewers (6 blockers / 17 majors / 17 minors — all fixed; 13-point independent verify = DRY) · Codex staged/pushed the doc tree · **Codex hostile review of workstream content + Slice 1 = OPEN in review-queue (Rule 67 R7)** — this record does not claim that verdict.
- **Verdict:** DOCS SHIPPED (origin/main `529edc02a`) · SLICE 1 BUILT + self-hostile-reviewed, 31/31 tests, **close pending Codex review + Sean's golden-digest look**.

## 2. Files involved

- **Reference docs (3 + 1 adjacent):** `docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md` (§12 now DECIDED) · `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` (canonical T0–T4 ladder; §11 folded/decided) · `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` (unregistered = BLOCKED; §14 decided) · `FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` (parallel lane, Codex).
- **Hermes Agentic OS:** `docs/ai-workflow/hermes-agentic-os/` — 21 docs + `prototypes/hermes-agentic-os-command-center.html` (static, browser-verified). `open-questions.md` now carries 8 DECIDED lines; `command-effect-registry.md` gains 2 PROPOSED T2 rows (`receipt-prune`, `vault-init`) pending Sean per its §4.
- **Design Brain:** `docs/ai-workflow/design-brain/` — design.md (canonical) + design.html mirror + motion/components/anti-patterns/qa-gates + 8 adapters + obsidian/ + graphify/ + website-archetypes + cinematic-pages.
- **Upgrade packet:** `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/` 100–160 + checkpoints/010–050 (160 = the session handover, committed this pass).
- **Operating files:** CLAUDE.md / AGENTS.md router blocks + 4 reference rows + rule-40 sentence; ACTIVE-INDEX pointers (shipped in `529edc02a`).
- **Runtime Slice 1 (NEW, this pass):** `scripts/hermes/hermesRunsLib.mjs` (219L core: lanes, switches, redaction, receipt schema, append-only JSONL) · `queueModel.mjs` (258L lifecycle) · `receipt-write.mjs` (75L CLI) · `queue.mjs` (60L CLI) · `receipt-digest.mjs` (139L) · `receipt-prune.mjs` (92L) · 5 test suites + `fixtures/golden-digest-2026-07-01.md`. All ≤300 lines (Rule 4).
- **Adoption wiring:** `.claude/skills/swan-design-router/SKILL.md` load-order item 4 = Design Brain (rule 40 alignment).

## 3. Architecture & runtime flow

Docs define a governance spine: **T0 read · T1 draft · T2 bounded internal write (standing allowlist) · T3 external-visible (per-send queue approval) · T4 destructive (queue + cross-channel arm + HUMAN execution — the broker never executes T4).** Slice 1 implements the accounting layer only, pure local file I/O, no LLM/network/DB/shell:

```
command → fresh kill-switch read (fail closed) → act → receipt (append-only JSONL, redacted at write)
T3/T4 request → queue entry (Q-id) → approve (exact-match phrase | confirm modal) →
  T3: single execution within 24h → receipt
  T4: cross-channel ARM within 10 min → Sean executes at the keyboard → receipt filed against armed entry
daily: receipt-digest renders counts/attention/approval-flow/switch-activity/silence-check
retention: receipt-prune gzips >90-day files into runs/archive (moved, never deleted)
```

Storage: vault `runs/` lanes (`receipts|logs|queue|digests|archive`, each with an index.md) at `HERMES_VAULT_ROOT` (default `~/.hermes/vault`) — **never inside the repo**, never synced to cloud.

## 4. Security logic & posture

- **Fail-closed switches** — unreadable/missing switches file or `false` value → refusal + refusal receipt. Blocks: acting with a pulled/broken brake. Breaks if: a caller bypasses `checkSwitches` (Codex review target) or caches switch state (reads are per-invocation by construction).
- **Append-only receipts, no mutation surface** — the lib exports no update/delete (test-locked). Blocks: history rewriting. Breaks if: someone edits JSONL by hand — corrections are new receipts by doctrine.
- **Write-time redaction** (rule 8/44/59) — Stripe/OpenAI/Slack/Google key shapes, JWTs, Telegram bot tokens, DB URLs, PEM blocks → `<REDACTED-KEY>`; emails → `<REDACTED-EMAIL>`; 500-char caps on free text. Blocks: secrets/PII landing in the flight recorder. Breaks if: a new key format emerges — **review hook below**.
- **Registered-commands-only queueing** — unregistered → refusal receipt; FORBIDDEN rows (raw-shell, direct-sql, env-read, mass-client-message, unreviewed-model-proxy) refuse by name; T2 asking to queue is a tier error. Breaks if: slice 2's live registry lookup diverges from the doc registry (the seed map is a mirror, marked for replacement).
- **Exact-match approval phrases** — `APPROVE Q-… <action>` / `ARM Q-… <action>`; paraphrase → refusal receipt (injection defense). **Cross-channel T4 arm** — same-channel arm refused; 10-minute fuse; no rollback pointer → refuses to arm; broker never executes T4.
- **Expiry closes itself** — sweep on every list/transition; unreadable expiry = expired (fail closed).
- **Duplicate-id hazard closed** (hostile-review catch): prune clamps to ≥1 day so the current day's receipt file can never be archived and reset the R-id sequence.

## 5. Best practices applied

Rules 4 (≤300L), 8 (IDs only), 14 (headers), 18 (spec-first: every behavior traces to a canon §), 44/59 (secret posture), 45 (append-only mirrors no-amend), 61 (hostile pass before report), 67 (lane claims; isolated worktree; explicit-path staging). OWASP A01 posture: fail-closed gates, allowlists, refusal trails.

## 6. Known limitations / non-goals (deliberate)

- Slice 1 has **no triggers, no broker, no scheduler** — scripts are invoked manually until slice 2 (Telegram broker, Codex build lane) and slice 5 (headless runner).
- `QUEUEABLE` is a doc-mirrored seed constant, not a live registry lookup (slice 2 swaps it).
- Receipt-id allocation is scan-then-append — single-operator local store, not concurrent-safe (documented; acceptable until the runner exists).
- Armed T4 entries have no filing timeout (Sean's manual act has no deadline by design).
- `receipt-prune`/`vault-init` registry rows are PROPOSED, pending Sean (registry §4 — T2 rows are Sean-applied).
- Discord template exact text = slice-4 start gate; send authority stays per-send queued.

## 7. Performance & UX considerations

Pure sync local I/O on tiny JSONL files; digest is O(day's receipts). CLI outputs are one-line-per-fact. Command-center UX (44px, tier badges, confirm modals) is slice 3, governed by dashboard-command-center-spec.md + Design Brain Crystalline Cyberforest.

## 8. Test coverage summary

31/31 across 5 suites (`node --test scripts/hermes/*.test.mjs`, Node 22.14): receipt schema/redaction/append-only/id-sequencing (9) · queue lifecycle incl. exact-phrase, T4 cross-channel arm window, expiry-closes-itself, fail-closed switches (11) · digest golden-file + switch-off refusal + silence-check honesty (4) · prune archive-roundtrip/dry-run/same-day clamp (3) · CLI wiring + refusal receipts (4). NOT tested: concurrent writers (out of scope, §6); Windows `node --test <directory>` form misbehaves — use the glob form.

## 9. Rollback plan

- Slice 1: `git revert <this commit>` — nothing imports `scripts/hermes/`; zero product coupling. Any scaffolded local vault at `~/.hermes/vault` can be deleted independently.
- Doc layer: revert `529edc02a` + this commit (docs-only; no runtime reads them programmatically).
- No env vars, no migrations, no Render behavior change (backend/ and frontend/ untouched — Rule 42 audit in commit).

## 10. Future review hooks (most important)

1. Re-examine `SECRET_PATTERNS` in `hermesRunsLib.mjs` against key formats published after 2026-07 (new provider prefixes; the Anthropic key-prefix family is notably absent — the generic `sk-…` rule catches it today, but verify coverage and add an explicit pattern if the shape drifts).
2. When slice 2 lands: verify the broker calls `checkSwitches` on EVERY path and that the live registry lookup exactly replaces `QUEUEABLE` (no second source of truth).
3. Attack the append-only claim at the filesystem level (partial-line writes on crash; consider fsync policy) before the headless runner (slice 5) writes unattended.
4. Rate/DoS: refusal receipts are unbounded — a hostile Telegram sender could flood the receipts lane; add per-sender refusal caps in slice 2.
5. Verify the arm-window sweep can't be raced by clock skew between channels once two real brokers exist.
6. Run `AI_VILLAGE_SAFETY_GOVERNANCE` mode (130 packet) once slices 2–3 exist — the paid pass was deliberately deferred (rule 16) while everything is docs + local scripts.
7. Q2 template texts: Sean must read the three Discord templates verbatim before slice 4 builds.

## 11. Codex / AI review log

- SESSION-O R1: two independent reviewers → 6 blockers/17 majors/17 minors → ALL FIXED. R2: mechanical sweep + 13-point verifier → DRY.
- 2026-07-04: Codex staged + pushed doc tree (`529edc02a`) from clean temp worktree; content hostile review NOT yet run → **OPEN REQ in review-queue** (workstream + Slice 1 + this record).
- SESSION-P Slice 1 self-hostile pass (rule 61): 15 attack vectors; 1 real defect found + fixed + test-locked (prune same-day duplicate-id hazard); residuals disclosed in §6/§10.

## 12. Sign-off

- Sean's directive 2026-07-04: "do all open recommended slices… we're gonna do what you recommend, so let's go" — recorded as scope approval for the decisions pass + Slice 1 build and commit intent for the workstream residuals.
- Ship SHAs: docs `529edc02a` (Codex push) + this commit (Slice 1 + decisions + audit record).
- **Next actions:** Codex hostile review (queue) → Sean reads the golden digest (`scripts/hermes/fixtures/golden-digest-2026-07-01.md`) → Slice 2 (Codex builds, live-test matrix with Sean) → Hermes 120 paste + 3 probes (S17) → Slice 3 after graduation criteria.
