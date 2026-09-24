# Swan Coach Brain v4 — One Brain, One Registry, One Ledger, One Stream

**Package ID:** `SWAN-COACH-BRAIN-V4-20260922`
**Location:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-brain-v4-2026-09-22/`
**Current status (2026-09-24):** Astra's independent review of the unified Swan Coach (REVISE, 3H/3M/1L) is repaired, with a second hostile round and a booked-session date fix in the workout-form backend — see [13 §7](13-unified-coach-names-pdf-floor.md#7-astra-review-round-2026-09-24). Reviewer of record: Astra or Opus 5.5 (Kimi no longer required, per Sean). Not deployed; S83 still blocks merge.

**Earlier (2026-09-23, late):** the unified Swan Coach (Chat · Today · Floor, names on screen, PDFs from chat) is built on top of Codex's branch — see [13 — unified coach](13-unified-coach-names-pdf-floor.md); not deployed. Earlier the same day: D1 workspace repaired on `codex/coach-v4-hostile-20260923`; builder audit PARTIAL. See [12 — repair and verification receipt](12-astra-hostile-repair-20260923.md). S83 delivery and independent review remain blocked/pending; D2–D4 and D9–D10 remain pending. The historical round-3 approval in `11` does not approve these new changes.
**Implementation verified:** Local frontend repairs — unit + 27 browser checks with mocked APIs + full frontend TypeScript check. Evidence and limitations in `12`. **Deployed:** No.
**Evidence basis:** Hostile review `Z:\HostileReviews\2026-09-22-153136-swan-coach-coach-command-center-whole-system.md` (3C/8H/6M/2L), run against:
- `origin/main@53f93854b`
- `codex/swan-coach-astra-owned-20260906@70547685c`
- the `creator-brains-engine-r2-20260915` working tree

Every repository fact below carries its file path. Anything not measured is marked **UNVERIFIED**.

---

## Outcome

A trainer talks, or types, to one coach in plain language, and that coach:

- **understands** the sentence without first-word tricks;
- **looks things up** across the app by itself, deciding which tools to use;
- **proposes** any change as a clear before → after card that a human approves;
- **remembers** what matters about each client across weeks;
- **streams** its thinking and answer as it works;
- **runs on any brain** (Claude, GPT, Gemini, OpenRouter models, local models), swapped by configuration.

The screen reads like the best of Claude Code and Codex: one conversation, one composer, a quiet activity timeline, inline approvals, and an inspector on demand, skinned by the Swan theme lens.

## The four laws of this package

1. **One Brain.** One server-side turn loop handles every coach message. Nothing in the browser decides whether a sentence may act.
2. **One Registry.** The 139 existing registry commands and the 9 chat proposal types become one tool registry. Reads auto-run. Writes can only *request* approval.
3. **One Ledger.** Every write goes through one approval ledger: signed, bound to actor, client, payload hash, version and expiry, and consumed once. This reuses the coach branch's `pendingOperationStore` and HMAC signing, which are already built.
4. **One Stream.** One streamed turn transport carries text, tool activity, approval requests and terminal states. The client renders events and invents nothing.

## Scope

**In:**
- lineage consolidation (P0)
- turn transport and loop
- tool registry unification
- approval ledger reuse
- memory wiring
- brain harness (provider adapters, model registry, routing, cost)
- privacy-at-source
- Command Center redesign
- evals and observability
- voice on the new turn (late phase)

**Out:**
- Plaud ingestion internals
- bootcamp and planner internals (they remain tool targets)
- payments execution (read-only tools only in this package)
- mobile native app
- the S83 Postgres harness internals, which the vs-claude lane owns

## Requirements (IDs used by every other document)

| ID | Requirement | Measurable acceptance |
|---|---|---|
| J01 | One canonical coach lineage | `rev-list` shows coach paths edited on one branch only after P0; the other two frozen by lane lock |
| J02 | Every turn ends visibly | 0 silent terminal states; each refusal renders a typed reason (T-J02 matrix) |
| J03 | Streaming turn | First event ≤ 800 ms p50; first text token ≤ 1.5 s p50 (prod); cancel stops provider ≤ 1 s |
| J04 | Server decides read vs act | `shouldRouteToCommandLane` deleted; 12-utterance probe routes correctly via tools |
| J05 | Model-selected tools, bounded loop | ≤ 8 tool calls, ≤ 4 model rounds, ≤ 45 s wall; tool choice logged per turn |
| J06 | No write without approval | 100% of write tools yield `approval.required`; 0 domain mutations before approve (T-J06) |
| J07 | One action vocabulary | Proposal types map 1:1 to registry write tools; both old paths removed after P3 |
| J08 | Memory that works | Rolling summary + `getMemoryForTask` in every client-bound turn; post-turn fact proposals queue; forget honoured |
| J09 | Pluggable brains | Adding a provider = 1 adapter file + 1 registry row; capability flags gate use |
| J10 | Evals gate brains | Golden set ≥ 60 utterances; tool-selection ≥ 90%; write-without-approval 0 |
| J11 | Privacy at source | Final serialized provider payload contains 0 roster names (canary test) |
| J12 | Coverage | P5 adds read tools for messaging, sessions/credits, orders, waivers, leads |
| J13 | Clean UI | 1 composer, 1 client concept, ≤ 12 controls first paint (desktop), transcript ≥ 70% mobile height |
| J14 | Theme lens | New components use only lens tokens; lens switch re-skins without reload |
| J15 | Voice on the turn | Hands-free dictation → streamed turn; TTS of final text; barge-in (P6) |
| J16 | Proactive | Morning brief + nudges (existing G10 engine) render in inspector |
| J17 | Reliability | Provider fallback via circuit breaker; every timeout aborts its request |
| J18 | File size | Brain core split to ≤ 300 lines/file **before** any addition to it |
| J19 | Observability | Per-turn trace (tools, latency, tokens, cost, provider/model) viewable by admin |
| J20 | Process | One agent per worktree; reviews run only on the canonical branch; one PR per phase |

## Read order

1. `PART-A-hostile-review.md`: why the existing plans are superseded where they are.
2. `01-architecture.md` → `03-contracts.md`: what gets built.
3. `04-build-order.md` → `05-slices.md`: in what order, file by file.
4. `02-wireframes.md`: the screen.
5. `06-bans.md`, `07-checkpoints.md`, `09-tests.md`: guard rails, gates and proof.
6. `PART-C-decisions.md`: what only Sean can decide.
7. `10-local-first-hive-brain.md` (added 2026-09-22 evening): the one-and-only surface plan, local-first/privacy-first brain routing, hive-brain entry points, the Style Lens and Master Schedule findings, and the D1/D2/D3 updates. Where it conflicts with PART-C, `10-` wins.
8. `12-astra-hostile-repair-20260923.md` (Codex): the D1 repair and verification receipt.
9. `13-unified-coach-names-pdf-floor.md` (2026-09-23, repaired 2026-09-24): Sean's unified design (Chat · Today · Floor), names on screen with the coach blind, PDFs from chat, Floor mode — what exists now, its privacy paths, evidence, residual risks, and the Astra review round (§7).

## Authority and supersession

| Existing package | Disposition |
|---|---|
| `BLUEPRINT-coach-cc-ai-harness-2026-09-20` (fork) | **Partly superseded.** Its H01–H11 intent is preserved and mapped into J02, J06, J07, J11 and J17. Its S2 durable-operations slice is **already built** on the coach branch and is not re-specified. Its privacy admission contract is replaced by §P in `03-contracts.md` |
| `BLUEPRINT-swan-coach-live-2026-09-20` (fork) | **Preserved** as the voice/freestyle contract, consumed at P6 (capture ownership, atomic append, handoff vs destruction) |
| `BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19` | **Unchanged.** It is owned by the vs-claude lane. P0 requires its landing (C3) |
| `SWAN-COACH-ASSISTANT-MASTER-BLUEPRINT.md`, JARVIS blueprint (`dce965656`) | Vision preserved; normative text superseded by this index |

The historical records stay where they are, and nothing is deleted. From P0 onward this README is the single index for coach-brain work, and new coach planning appends here.

## Baseline evidence (measured 2026-09-22, cloud sandbox)

- coach branch: frontend coach+hooks **1,538/1,538 pass**, backend AI unit **1,298/1,298 pass**
- mounted smoke `e2e/coach-command-center-mobile-smoke.spec.ts`: **main 3/3 PASS, coach branch 3/3 FAIL** (C2)
- registry census: 139 commands, 14 categories, 45 write-flagged, client role 13
- routing probe: 3/12 natural utterances reach the command lane (H1)

**PLAN READY, IMPLEMENTATION VERIFIED and DEPLOYED are separate states.** This package claims none of them.
- `11-v4-review-log.md` — what shipped on `coach/brain-v4`, the three hostile-review rounds, evidence, residual risks, next slice.
- `12-astra-hostile-repair-20260923.md` — current residual-defect repairs, exact validation, delivery gaps and archive successor.
