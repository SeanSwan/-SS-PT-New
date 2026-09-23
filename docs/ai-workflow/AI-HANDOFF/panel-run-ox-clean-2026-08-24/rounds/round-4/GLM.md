# GLM Consult

**Model:** glm-5.3
**Document:** docs\ai-workflow\AI-HANDOFF\panel-run-ox-clean-2026-08-24\rounds\round-4\REVIEW-DOC.md
**Tokens:** 6343 in / 11768 out (reasoning: 9495) | total 18111
**Wall:** 136.0s

---

**GLM 5.3 — Round 4, full-spectrum lens (correctness / security / schema truth / the 8 constraints line by line).**

The integrated ruling on F1–F4 is evidence-backed and I adopt it — but its acceptance-criteria set covers 3 of the 8 non-negotiable constraints. The packet's own probe table admits gaps on entitlement and receipts that the candidate demotes to "residual risks." Constraints are acceptance gates, not risks. I carry three new MAJORs and one REJECT of the candidate's scope.

## The 8 constraints, line by line vs. the candidate

| # | Constraint | Packet evidence | Candidate coverage | Ruling |
|---|---|---|---|---|
| C1 | Least privilege | Probe table, `/api/ai-command` row: "server entitlement behavior for every command family is not yet proven" (`aiCommandRoutes.mjs L110-145`) | none | **F6** |
| C2 | Wrong-client mutation catastrophic | Two scope channels: `AiConversation.mjs L24-83` (`targetUserId`, accepted at `aiChatRoutes.mjs L308-344`, trainer-checked at `:610-625`) vs `selectedClientId` (`aiCommandRoutes.mjs L111-145` → `commandExecutor.mjs L309-343`). No packet evidence binds them. | none | **F5** |
| C3 | Receipts are truth | Boundary section: `AiCommandAuditLog.mjs L24-91` has "no action_id or unique idempotency key" | F1 partial — but conflates audit rows with replayable receipts | **F1 amendment** |
| C4 | No "saved" before authoritative write | `aiWorkoutEvents.ts L121-128` returns only a dispatcher boolean; packet caption: "must not infer a committed workout write from this event acknowledgement" | demoted to residual risk | **F7** |
| C5 | Server-enforced roles | `clientResolver.mjs L110-166` "scopes trainers but not admins beyond role"; Hermes (`hermesRoutes.mjs L43,90,127,142`) and debate (`aiDebateRoutes.mjs L54-76`) classification pending | none | **F6** |
| C6 | Offline/degraded story | `useCoachCommand.ts L96,170,207` posts with no evidenced queue/reconcile | "residual risk," zero acceptance criterion | **Q3 + F1 amendment** |
| C7 | UI standards | No violating code in packet; blueprint-time check | n/a | NOTE |
| C8 | Redaction to Ox Alpha | Packet header complies | n/a | NOTE |

Schema-truth cross-check on F4: the mount snippet contains exactly five `app.use` lines → the gate-refresh citation `routes.mjs L630-634` is internally consistent; the appendix caption `L625-634` is the stale one. F4 confirmed as stated.

## Adoptions with engineering amendments (rule 6)

- **F1 AGREE, amended.** WHAT: idempotent execute. WHERE: `AiCommandAuditLog.mjs L24-91` + command executor insertion path. HOW: (a) the UNIQUE constraint race must be handled — two concurrent duplicate POSTs both insert; one takes the constraint violation; the executor must catch it and re-read/return the original row, not assume sequential duplicates; (b) the key must span the full lifecycle at `useCoachCommand.ts L96, L170, L207` — a retried `confirm` after timeout is the classic double-apply, and `cancel`-after-`confirm` needs defined semantics under the same key; (c) the model already records an "operation ID" per the boundary section — the ruling must state precedence between it and `commandIdemKey` or the schema is ambiguous; (d) audit rows record `outcome` and `error code` — failed/cancelled rows must **not** replay as success receipts; the receipt semantics must be outcome-classed (Question 5's action classes).
- **F2 AGREE, amended.** `buildChatParams` at `AITerminalPanel.tsx L124-133`, plus explicitly type the params object across `useAIChat.ts L217, L425, L448` so the drift can't recur at the signature level.
- **F3 AGREE.** Mark `APP-AI-HIVE-MIND.md L7-22` DORMANT; acceptance criterion (3) as written.
- **F4 AGREE.** Single authoritative range `L630-634`.

## New findings

**F5 = MAJOR — unbound dual client-scope channels.** A conversation carries `targetUserId` (`AiConversation.mjs L24-83`, set at `aiChatRoutes.mjs L308-344`); a command carries `selectedClientId` (`aiCommandRoutes.mjs L111-145`, resolved at `commandExecutor.mjs L309-343`). Nothing in the packet binds the executed command to the conversation's target. Operator coaches client A in chat, command executes on client B, no layer detects divergence — this is the exact C2 catastrophe. FIX: in `commandExecutor.mjs L309-343`, when `selectedClientId` differs from the active conversation's `targetUserId`, require explicit re-grounding (confirm target) or reject with 409 and mint no receipt. ACCEPT: divergence test — command on B from A-scoped conversation without re-grounding → rejected, no receipt row.

**F6 = MAJOR — per-family entitlement unproven, demoted to residual risk.** The packet's own probe table requires "a denied operation cannot mint a success receipt" and admits `clientResolver.mjs L110-166` scopes trainers but not admins beyond role. An integrated ruling cannot leave an admitted-unproven authorization invariant (C1/C5) outside its findings. FIX: gate the build on a role × command-family × cross-client authorization matrix probe; verify every dispatcher re-checks access before any receipt is written. ACCEPT: denied op in any family produces no success receipt.

**F7 = MAJOR — workout-bridge receipt contract deferred.** `aiWorkoutEvents.ts L121-128` returns a browser-dispatch boolean; the boundary section states the authoritative receipt contract "remains unproven and must be designed by the panel before implementation." Deferring it to residual risk invites the builder to ship saved-states off the boolean (C4). FIX: no component may enter a persisted/committed state derived from `dispatchAIWorkoutEvent`'s return; "saved" requires a server receipt. ACCEPT: consumer audit + test proving no saved-state transition from the boolean.

**F8 = MINOR — aiChatRoutes middleware ordering ignored.** Running state has carried `aiChatRoutes.mjs L283 / L308-344 vs L466` since round 1; the ruling is silent. If the subscription/rate-limit/PII middleware at `:466` registers after the conversation-creation route at `:308-344` in the same router, creation bypasses rate limiting entirely. FIX: one live probe to establish actual ordering; if creation precedes the gates, move the middleware above `:308`. ACCEPT: documented ordering + creation request observed under rate limit.

## The REJECT

The candidate's acceptance criteria verify idempotency, call-shape parity, and doc hygiene — real, but they gate none of C2, C4, C5, C6. Those four have named evidence in this packet and two have sat in running state for three rounds (`AiConversation.mjs L24-83`, `aiChatRoutes L283/L308-344 vs L466`). An "integrated ruling" that demotes them to residual risks manufactures partial consensus. They go back into findings with acceptance criteria, or the ruling is not integrated.

=== VERDICT ===
status: DISPUTE
confidence: 90
findings: F5=MAJOR: AiConversation.mjs L24-83 + aiChatRoutes.mjs L308-344 vs aiCommandRoutes.mjs L111-145 + commandExecutor.mjs L309-343: targetUserId and selectedClientId are two unbound client-scope channels — a command can execute on a different client than its conversation targets, wrong-client mutation path (C2) | F6=MAJOR: clientResolver.mjs L110-166 + aiCommandRoutes.mjs L110-145: per-command-family entitlement admitted unproven, admins scoped by role only, denied-op-cannot-mint-receipt unverified — must be a gated finding, not residual risk (C1/C5) | F7=MAJOR: aiWorkoutEvents.ts L121-128: dispatcher boolean is the sole workout-bridge acknowledgement, no receipt contract exists per boundary section — saved-before-write risk demoted to residual risk (C3/C4) | F8=MINOR: aiChatRoutes.mjs L308-344 vs L466: middleware/route ordering unverified — if the L466 subscription/rate/PII middleware registers after the creation route, conversation creation bypasses rate limits; running-state item the ruling ignores
rebuttals: F1=AGREE+amend: handle UNIQUE-violation race by catch-and-return-original-row; key must span execute/confirm/cancel (useCoachCommand.ts L96,L170,L207); state precedence vs existing operationID field (AiCommandAuditLog.mjs L24-91); failed/cancelled rows must not replay as receipts | F2=AGREE+amend: also type the params object across useAIChat.ts L217,L425,L448 | F3=AGREE | F4=AGREE: five mounts = L630-634, appendix caption L625-634 is stale | AC-SCOPE=REJECT: candidate gates 3 of 8 constraints; C2/C4/C5/C6 have named packet evidence and running-state entries and were demoted to residual risks — an integrated ruling must carry them as findings with acceptance criteria
open: Q1=is admin cross-client freedom in clientResolver.mjs L110-166 an intentional entitlement or a gap (entitlement matrix must state it; sets F6 severity) | Q2=receipt store: extend AiCommandAuditLog vs dedicated receipts table (F1/F7 fixes depend on this) | Q3=which implementation slice owns the offline duplicate-prevention/reconcile acceptance criterion (C6) | Q4=live probe result for actual middleware order at aiChatRoutes.mjs L308-344 vs L466
=== END-VERDICT ===
