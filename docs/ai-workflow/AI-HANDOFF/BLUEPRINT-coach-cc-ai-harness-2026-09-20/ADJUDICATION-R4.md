# ADJUDICATION — Astra round 4 (Coach Command Center AI harness + Swan Coach Live privacy boundary)

**Round:** 4 · **Reviewer:** sable (WorkBuddy seat) / `gpt-6-astra` via `codex-cli`
**Adjudicated:** 2026-09-20 · **Seat verdict:** `REVISE`, **advisory only**. Rule 46's Final-Decider gate
is **not** satisfied by this document, and nothing in it authorises a commit or a merge.

## 0. Provenance

| Artifact | SHA-256 | Size |
|---|---|---|
| `tmp/coach-cc-ai-harness-20260920/PACKET-R4.md` | `a1bd9ada554681b61b5e14e89562f12524fc65e431de02e65c4832c197259a40` | 21,119 B / 301 lines |
| `tmp/coach-cc-ai-harness-20260920/REPLY-R4.md` | `3b3a6d0852f44123b95e2d3c427c572557e76d2e81e0644e0acd678b827f4a62` | 9,142 B / 72 lines |

Transport `codex-cli` · requested `gpt-6-astra` · **served model NOT OBSERVABLE** (`codex exec --json`
emits no model field) · effort `xhigh` · `reasoningOutputTokens: 7204` (round 3 at the same effort: 6,249 —
same order, so depth was applied) · wall **530.8 s** · `megaBlueprint: false` · billing
`chatgpt-subscription`, **marginal cost $0**.

**Input tokens: 1,426,042** (round 3: 42,514 — a 33× increase). `codex exec` is an agent, not a bare
completion: it loads the repo's instruction files and skill index, and it **read the changed files from disk
during the review** (its citations are absolute paths). Recorded because it changes what a packet must
contain: **the reviewer can read the tree, so a packet is a guide, not the evidence.** Round 4 found the
§6.1 contradiction *despite* our having truncated that clause out of the packet.

## 1. Method — every claim re-measured, and one reproduced independently

Each finding was verified against the **shipped** source before being accepted, and the two that could be
executed were:

- `tmp/coach-cc-ai-harness-20260920/probe-r4-json-escape-gap.mjs` — runs the **shipped** `scanForPHI`
  against whitespace-separated identifiers, raw and JSON-serialized, and against the provider-decoded
  content. Result: `FALSE_NEGATIVE_COUNT=2`, `R4_02_REPRODUCED=true`.
- `tmp/coach-cc-ai-harness-20260920/probe-r4-emitted-fields.mjs` — executes the **shipped**
  `buildRouteContextLine` (extracted verbatim, anchored so drift fails loudly). Result:
  `EMITTED_FIELD_COUNT=7`, `FIELD_SET_MATCHES=true`.

Line references were verified by printing the cited lines: `aiCommandRoutes.mjs:121,164,167`,
`intentClassifier.mjs:25,106,116,118-120,133,170,187`, `commandExecutor.mjs:192,565`,
`aiChatService.mjs:2034`, `aiChatRoutes.mjs:710`, `phiScanner.mjs:31`. **All matched.**

## 2. Disposition — all five CONFIRMED

| id | severity | Adjudication |
|---|---|---|
| **R4-01** | HIGH | **CONFIRMED.** §6.1 admitted free-text fields *and* required a name that passes the detector to be blocked. The two cannot both hold; the predicate had no content clause. |
| **R4-02** | HIGH | **CONFIRMED and independently reproduced.** Scanning the serialized body is strictly weaker than scanning what the provider decodes. |
| **R4-03** | MEDIUM | **CONFIRMED.** The fix for R3-02 reached `03-contracts.md` but not `03b-contracts-proposed-artifacts.md`. A real miss. |
| **R4-04** | MEDIUM | **CONFIRMED, and the mechanism is worse than round 3 knew** — see §3.1. |
| **R4-05** | MEDIUM | **CONFIRMED.** Three sub-findings, all verified: conditional T-04 rows, the mock-vs-fake contradiction, and the `aiChatRoutes.mjs:710` emitter. |

Round 4 also **confirmed what closed**: R3-01 closes narrowly (seven fields, `selectedClientName` null on
this route), R3-02 closes except for the manifest, and P4 stays uncheckable pending the envelope capture.

## 3. What round 4 found that round 3 did not

### 3.1 The provider failover loop is a third absorber, and it retries

Round 3 (D-B) identified one absorber: `classifyIntent`'s `catch` converting a rejection into a chat
fallback. Round 4 named a second and more dangerous one:

```js
// aiChatService.mjs:2034
} catch (err) {
  failoverTrace.push(`${provider.name}:provider_error`);
  logger.warn(`[AIChatService] ${provider.name} failed: ${err.message}`);
  continue;                      // <-- next provider
}
```

A `continue` in a provider failover loop means a privacy rejection raised inside a provider call is treated
as a **provider error** and the request is **re-sent to the next provider** — the exact outcome rule 4
forbids. Round 3's two-site enumeration was therefore incomplete in the direction that leaks.

The full chain is now tabulated (round 4's count) in `03b-privacy-boundary.md` §5: `intentClassifier.mjs:170`
→ `aiChatService.mjs:2034` → `commandExecutor.mjs:565` → `aiCommandRoutes.mjs:171` (**HTTP 200**). Verified
by printing all four sites.

**This is the strongest argument yet for the production change being a real defect and not a paper one** —
and it remains blocked on the operator ruling (§6).

### 3.2 The serialization gap is a genuine counterexample, not a hypothetical

`phiScanner.mjs:31`'s phone pattern uses the character class `[-.\s]`, which accepts whitespace. JSON
escapes whitespace. So:

| input | in memory | on the serialized bytes | provider decodes to |
|---|---|---|---|
| `202`⏎`555`⏎`0199` | `true` | **`false`** | the same three groups |
| `202`⇥`555`⇥`0199` | `true` | **`false`** | the same three groups |
| `202-555-0199` | `true` | `true` | — |
| `123-45-6789` | `true` | `true` | — |

The seat's own P2 as written in round 3 — *"scan the assembled body as one string"* on the **final serialized
bytes** — **had this hole**. Round 4 found it by testing the proposed check rather than the deployed gate,
which is exactly the falsification the packet asked for. Reproduced independently before acceptance.

### 3.3 The emission inventory was incomplete in a second place

`aiChatRoutes.mjs:710` appends `buildSelectedScheduledSessionPromptBlock(...)` to `systemPrompt`. That is
route-context-derived content reaching a provider through a path `buildRouteContextLine` never touches. The
"seven fields" measurement is therefore correct **about the classifier formatter** and incomplete **as an
inventory** — which round 4 said, and which round 3's own falsification target 5 had invited.

## 4. A packet-construction error of the seat's own, disclosed

Round 4's packet reproduced `03b-privacy-boundary.md` §6.1 as **"full"** and **dropped the second half of
the controlled-identifiers bullet** — the clause that made a name admissible in a free-text field, i.e. the
one clause that created the R4-01 contradiction.

The reviewer found the contradiction anyway, because it read the file from disk. **The omission is the
seat's**, and it is recorded rather than quietly repaired: a section presented as verbatim must be verbatim,
and truncating the clause that creates a contradiction is the worst possible place to abbreviate.

**This is the third consecutive packet with a construction error of the same class:**

| Round | Error |
|---|---|
| 3 | supplied one side's contract and asked a two-sided question |
| 4 | truncated a quoted clause, hiding the contradiction it created |
| — | *both are the same shape: the packet's evidence was narrower than the packet's question.* |

It is written down here because the pattern, not the incident, is the finding.

## 5. Fixes applied

| File | Change |
|---|---|
| `BLUEPRINT-swan-coach-live-2026-09-20/03b-privacy-boundary.md` | §3 → **three** points (P1/P2/P2b) with the R4-02 measurement table; §5 → four-site propagation chain incl. the failover absorber; §5.1 rule 2 → semantic text, not encoded; §6 → predicate minus P5, P2 as semantic text, P2b binding; §6.1 → executable admission table (authored vs assembled); §8 → items 4/5/6 rewritten, two added; §9 → size warning |
| `…swan-coach-live-2026-09-20/09-tests.md` | T-04 → marker classes + explicit outcomes, T-04.11/T-04.12 added; §8 → the shared byte-capture rule |
| `BLUEPRINT-coach-cc-ai-harness-2026-09-20/03-contracts.md` | `privacy_unavailable` added to `HarnessErrorCode`; four-site chain tabulated |
| `…coach-cc-ai-harness-2026-09-20/03b-contracts-proposed-artifacts.md` | Scope note — the bullets govern **new** templates only; the pin recorded |
| `…coach-cc-ai-harness-2026-09-20/09-tests.md` | "Recording fake" defined as intercepted transport, not a stub; §5 item 4 channel-scoped |

**Line counts, all ≤ 300 by `wc -l`:** `03b-privacy-boundary.md` **293** — 7 lines of headroom, flagged in
its own §9 so the next substantive addition splits rather than breaches. All others ≤ 238.

**No file under `backend/` was modified.** Every code reference above is read-only evidence.

## 6. Not fixed, and why

- **The production behaviour change** — blocked on the operator ruling, which is round 3's own PART E
  condition 1. Round 4 explicitly respected the deferral (*"the acknowledged production deferral remains
  respected"*), which is the correct reading: the *specification* was incomplete, not the deferral.
- **The approved S0 implementation manifest** — the reconciled contract and the measurable release
  criterion exist; approval is not the seat's to give.
- **The provider envelope capture** — absent, so the allowlist is not implementable. Retained as a stated
  prerequisite rather than papered over.
- **R2-06** remains latent under the process-local ownership model, unchanged.

## 7. Novelty (Rule 86)

- **R4-01, R4-03, R4-05** adjudicate remedies the seat itself wrote in round 4. **Not claimed as
  discoveries** — they are defects in a fix, found one round after the fix.
- **R4-02 is new and independently reproduced.** No prior round tested the *proposed* check; the JSON
  escaping interaction between `phiScanner.mjs:31`'s `[-.\s]` class and serialization had not been measured.
- **R4-04's failover absorber is new.** Round 3 found the classifier `catch`; round 4 found
  `aiChatService.mjs:2034`'s `continue`, which is a **retry**, not merely a fallback.
- **The seat's own packet-construction pattern** (§4) is now recorded three rounds running.

## 8. Status

`REVISE` — **advisory.** Round 4 was **not dry**: it found two HIGH defects, one of which (R4-02) was a hole
in a check the seat had proposed in the same round it was written. Round 5 was dispatched with the fixes and
seven falsification targets.

**Nothing here is committed.** Sean's instruction was *"do all fixes Astra asked for nonstop until we run
dry"*; the loop has not converged, and the commit remains his call.
