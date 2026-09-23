# HOSTILE DEBATE — MAXROUNDS RESULT

**Packet:** `docs/ai-workflow/AI-HANDOFF/PANEL-SWAN-COACH-UNIFIED-BRAIN-2026-08-23.md`
**Rounds answered:** 10 · **Real spend:** ~$0.7055 · **Strongest seat:** dspro
**Roster:** GLM 5.3 · Grok 4.6 (seat A) · DeepSeek V4 Pro

---

> ⚠ **DISPUTE REMAINS** — debate stopped at round 10 of 10 (maxrounds). No fake consensus: the strongest candidate ruling so far is below; the unresolved items are listed in `docs\ai-workflow\AI-HANDOFF\panel-run-clean-2026-08-23\debate-state.json`.

Candidate block:

FIX BEFORE BUILD: F1 (add actionId unique key + idempotent executor + receipt return in AiCommandAuditLog.mjs/aiCommandRoutes.mjs:111-145/useCoachCommand.ts:96,170,207), F3 (single canonical targetUserId user-PK identity; server-reject null targets with 400 TARGET_REQUIRED; receipts echo alias+resolved PK), F2 (capability registry checked post-resolution pre-execution in commandExecutor.mjs:309-343; denial writes audit row and returns denial-shaped response), F6 (conditional UPDATE ... WHERE status='pending' transaction + idempotent apply + durable applied/failed receipt at coachProposalRoutes.mjs:30-54), F5 (apply aiChatRoutes.mjs:466 middleware family + TTL to coachIntakeRoutes.mjs:23-25 and coachProposalRoutes.mjs:15-16; parity table gate). MUST-FIX PER SLICE: F4 (IndexedDB intent queue keyed by actionId; UI states queued/sending/verified only; reconcile replays exactly once), F7 (spike method inventory + disabled-404 on every method), F10 (ensureClientAccess on aiDebateRoutes.mjs:57-76 start path), F11 (fence SwanCoachAssistantPage, migrate tests, cite or drop 'locks'), F8 (cite the review-gate code or strike header claim), F9 (archive/rewrite hive doc). ACCEPTED AS INTENTIONAL (pending panel ruling): admin unbounded scope in clientResolver.mjs:110-166 IF ruled policy and tagged in audit; Express specific-before-prefix mount order at routes.mjs:630-634 is correct practice, not a defect. RESIDUAL RISKS: constraints 2/3/4/6 unverifiable until F1/F3/F4 land; all absence-based MAJORs require live probes confirming, not assuming; Hermes/debate classification unresolved; acceptance criterion 7 (44px/WCAG) has zero packet artifacts and must be carried entirely by the blueprint verification matrix.

