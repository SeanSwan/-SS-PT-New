# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** C:/tmp/ss-dash-trust-20260821/docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-LIVE-AUTH-PASS-HANDOFF-2026-08-21.md
**Seed:** C:/tmp/ss-dash-trust-20260821/docs/ai-workflow/AI-HANDOFF/panel-liveauth-plan-2026-08-22/FABLE-SEED-DISPOSITIONS.md
**Tokens:** 14179 in / 10686 out · **Cost:** ~$0.6761 · **Wall:** 153.1s

---

# FABLE 5 — FINAL RULING ON SWA-187 v2 (base `1360209b0`)

**VERDICT: LOCK-WITH-CHANGES** — with one ruling that supersedes everything below it, so it comes first.

---

## RULING ZERO — The review scaffold does not match the artifact. I will not ratify phantoms.

The tasking handed to me cites "§8 decisions D1–D8," "an F10 override (L1→L3 fast path)," "§9.1 UX," "§10 slices incl. S1.5," "§14 audit," and "repo reality in §2/§4 with file:line." **None of those exist in the document under review.** The artifact's §8 is closeout gates, not a decision register. Its §10 is "still owed beyond this slice." There is no §14. The file:line evidence lives in §1 and §3 (`profileController.mjs:378-389`, `ClientsWorkspace.tsx:106`, `HomeTabVisionCenter.tsx:117`, `HomeTabVision.styles.ts:91`), not §2/§4. There is no F10, no L1/L2/L3 routing question, and no pre-existing S-slice plan anywhere in this brief or its seed.

This is exactly the bug class this workstream exists to kill: **a verdict claiming authority over content that was never there.** If I "ratified the F10 override," a worker-bot building to the letter would go hunting for an L1→L3 fast path that does not exist in this repo's plan and would improvise one. Struck from the record. Where the requested structure maps onto real decisions in the artifact, I rule on the real decisions and bind the labels to them explicitly below. Where it maps onto nothing, I say so and rule on nothing.

The seed asked me two direct questions and three open rulings. Those are real. They are answered inline.

---

## DECISION RULINGS — D1–D8, bound to the eight actual decisions in this artifact

There is no literal D1–D8 register; these labels now bind to the eight material decisions the orchestrator actually made. This mapping is part of the lock.

- **D1 — Discard of Sol P1#2 ("admin route consumer unproven"): CONFIRMED.** The 16-line-wrapper code-read is correct, and keeping B/C as behavioural checks for Kimi's reason (code-reading ≠ proof) is the right epistemics.
- **D2 — Discard of DeepSeek Pro P0#1 ("document contains PII"): CONFIRMED, WITH AMENDMENT.** No client PII exists in the doc. But yes — genericise Sean's machine path in §6 trap 1 to `<LOCAL-SHARED-TREE — DO NOT USE>`. This repo has a credential-leak history and was once public; personal usernames in committed paths are free reconnaissance. The trap's teaching value survives the redaction.
- **D3 — Fixtures as Sean-gated blocking preconditions (§0.5): CONFIRMED, WITH SEQUENCING OVERRIDE.** The gate is right; the shape is wrong. As written, the agent's first move is "ask Sean and wait." My locked sequence (below) puts fixture-free work *before* the gate so the slice produces value on day one regardless. This answers the seed's open question: **lead with fixture-free journeys — yes.**
- **D4 — A2 failure injection on production without its own gate: CONFIRMED, WITH TECHNICAL CORRECTION.** Offline and expired-auth on a *synthetic* account are reversible and acceptable; no extra gate. But the injection mechanisms as specified are underspecified to the point of untrustworthiness — see the highest-risk section. The correction is mandatory before build.
- **D5 — `PROOF: N/A` closed for A2/B/C/D (§8.4): CONFIRMED.** This was v1's fatal escape hatch; welding it shut is correct. "Slice NOT COMPLETE — blocked on X" is the only honest incomplete state.
- **D6 — localhost demoted to exploration-only (§2): CONFIRMED.** Different bundle, cookies, headers — and it writes to the production DB. It can never close this slice.
- **D7 — §3 reposture from "do not re-litigate" to "verify behaviourally, do not rebuild": CONFIRMED.** Kimi's catch was the sharpest in the panel and the fix preserves the search-saving value without the epistemic contradiction.
- **D8 — §9 Playwright specs recommend-only, no code changes during verification (§4 red path): CONFIRMED.** A verification agent holding a file map, a worktree, and a prod-connected localhost is one temptation away from an unreviewed production change. The `data-swan-measure` deferral is correctly disciplined.

---

## TRIANGLE / PANEL DISPOSITIONS — ratified or overruled

- **Accepted findings 1–14: ALL RATIFIED.** The forced-failure test (finding 1) is the correct headline; A6's reproduce-the-actual-defect rewrite (finding 11) and the deploy-identity check (finding 14, §0.1) are the two best self-generated additions.
- **Discards A and B: RATIFIED** per D1/D2 above.
- **The alleged "F10 override" and "D2/D3 write-path staging": VOID — no such items exist in this artifact.** However, the *spirit* of an "S1.5 data backbone" maps cleanly onto the one real staging decision available: fixture provisioning is the data backbone of this slice, and I formalize it as **S1.5** in the locked sequence. That is the only sense in which S1.5 survives, and it is my construction, not a ratification.
- **Over-specification question (seed Q2): NO — the weight is in the right places.** 26k characters is fine when the reader is a literal-execution agent; ambiguity costs more than length here. The only trimmable block is §11's cost-calibration paragraph, which belongs in the panel reference dir, not the handoff — but it's harmless. Do not cut §0.5, §1.A2, §2.1, or §4.
- **Sol's 9× input tokens (seed Q3): answered.** A hostile-loop harness that re-sends the full packet each round, plus system prompt and tool schemas, without prompt caching, multiplies input linearly per round: ~5k doc × multiple rounds + scaffolding ≈ 46k. Sol Pro also bills cache-miss re-reads at full input rate. Fix: single-shot packets or enable caching; the estimator isn't wrong about the doc, it's wrong about the loop.

---

## WHAT BOTH PANELS MISSED — attack findings, mandatory fixes BEFORE build

**F-1 (P0) — A3's handle measurement is physically impossible as written.** §1.A3 says measure the handle via "`getBoundingClientRect()` on the `::after` target area." **Pseudo-elements are not in the DOM; `getBoundingClientRect()` cannot be called on them.** A literal worker-bot hits a wall and either improvises (measures the wrong box, passes a 20px handle) or stalls. Fix: specify `getComputedStyle(handleEl, '::after')` for width/height plus padding, or verify the hit target empirically with `document.elementFromPoint()` sampling at ±22px from the handle center. This is a house-rule check (44px targets) resting on a broken instruction — seven seats and the orchestrator all missed it.

**F-2 (P0) — §2.1 contradicts A2's restore step, and a literal bot will deadlock on it.** §2.1: "Never record field values." A2: "restore the account's original values" — which is impossible without recording them. On a synthetic account with placeholder data this is safe, but the rule as written doesn't carve it out, and this document trains agents to follow rules literally. Fix: amend §2.1 — "Synthetic-fixture field values are placeholders, not PII; recording them for restore purposes is permitted. Real-account field values remain forbidden absolutely."

**F-3 (P1) — A2 pass 3 (expired auth) has an implementation-dependent outcome the plan doesn't acknowledge.** "Log out in a second tab, then Save in the first" only forces a failure if logout revokes the token server-side or clears shared storage the first tab re-reads. If auth is a stateless JWT held in memory, the save in tab 1 **succeeds legitimately** — and the agent records a false red against a surface that did nothing wrong. Fix under highest-risk below.

**F-4 (P1) — A2 pass 2 (offline) doesn't rule on reconnect-retry.** "Restore the network; confirm the field did not persist" — if the fetch layer or a service worker queues and replays the write on reconnect, the field *will* persist, possibly by design. The plan must state: after the error state is shown, the UI must not flip to success without user action; if a queued retry lands the write, that is a **finding to report**, not an automatic red or green.

**F-5 (P2) — A6's fixture position is nondeterministic as specified.** "A workout post at position 7–20" — position in what ordering, established how? Fix: the fixture recipe must be "create the workout post *first*, then ≥7 non-workout posts, so recency ordering deterministically places it past position 6"; record its index at test time.

**F-6 (P2) — §D viewports need the mechanism named.** 1440×900 exceeds many physical screens minus chrome; specify DevTools responsive mode set to exact dimensions, devtools undocked (the doc already forbids side-dock; make undocked the instruction, not the option).

**F-7 (P2) — §0 assumes the worktree exists.** "ALREADY EXISTS" with no fallback. Add one line: if absent, `git worktree add c:/tmp/ss-dash-trust-20260821 origin/main` from the canonical clone — never the shared Desktop tree (§6.1).

**F-8 (P2) — §0.5 fixture sub-task has no done-criteria.** Add: done = synthetic account IDs recorded (IDs only, per Rule 8), R2 keys verified to exist under `photos/{category}/{clientId}/`, photo pair confirmed same-angle, and a one-line verification query result. Without this, "Sean-gated" becomes "Sean-shaped ambiguity."

**House-rule audit of the document itself: CLEAN.** No "yoga/meditation," no "NASM-certified," no chart-library or MUI violations (no code is authored in this slice), 44px and 4.5:1 are enforced as measured checks (A3/E), Rule 8 is enforced structurally (§2, §2.1). The only house-rule exposure is F-1's broken measurement instruction, fixed above.

---

## FINAL LOCKED SEQUENCE

Reordered from the document's implicit order. Fixture-free value ships first; the flagship test runs first among fixture-dependent journeys; B/C run back-to-back because they exercise one code path.

| Slice | Content | Gate |
|---|---|---|
| **S0** | §0.1 bundle-identity check (`lostpointercapture` present) + worktree sanity (F-7) | Hard stop if stale bundle |
| **S1** | Fixture-free journeys: **D** (CenterColumn, measured), **E** (contrast ratios), **A7** (Mute User gone) | None — runs regardless |
| **S1.5** | **Fixture provisioning (the data backbone):** synthetic member/trainer/admin, R2 photo pair, 1-photo/0-photo members, feed post, A6 post ordering per F-5 | **Sean-gated (§0.5)**; done-criteria per F-8; the only sanctioned production writes |
| **S2** | **A1 + A2** — all three passes with F-2/F-3/F-4 corrections, then restore + verify restore | The slice's reason to exist |
| **S3** | **A3** — slider, both surfaces; pointer/keyboard/touch; handle measured per F-1 | |
| **S4** | **A4** — empty/partial states | |
| **S5** | **A5** — workout modal, member | |
| **S6** | **A6** — Workouts filter shows post past position 6; empty state names the filter | |
| **S7** | **B** — trainer intent → *visible logger* | |
| **S8** | **C** — admin intent → *visible logger* | |
| **S9** | Evidence assembly (§2.1 discipline), red-path filings on SWA-187, fixture restore confirmed | |
| **S10** | §9 Playwright proposal (recommend-only) + §8 closeout gates, `PROOF:` per D5 | Sean decides §9 |

If S1.5 is denied or deferred: S1 results ship, S2–S8 close as **"NOT RUN — blocked on fixtures,"** never as passed. That path is already in §0.5 and is ratified.

---

## SINGLE HIGHEST RISK — and the de-risk

**The flagship test (A2 forced-failure) can itself claim a verdict it did not earn.** Both failure injections are mechanism-fragile: expired-auth may not fail at all under stateless JWT (F-3, false red), and offline may "un-fail" via reconnect retry (F-4, ambiguous red/green). Seven panel seats demanded the forced-failure test; **none of them, and not the orchestrator, checked whether the specified injections deterministically produce a failure in this stack.** A trust-repair slice whose central test is nondeterministic is the original defect wearing a lab coat.

**De-risk before build (≈30 minutes, code-read only, no code changes — §4-compliant):**
1. Read the auth layer once: token storage (cookie vs localStorage), server-side revocation yes/no, fetch-layer retry/queue behavior. This is a code-read to *aim* the test, exactly the posture §3 licenses.
2. **Promote a deterministic primary injection:** DevTools Network request blocking (or local override → 500) on the settings write endpoint. It fails identically regardless of auth model or retry logic, and it directly simulates "the write did not happen" — the titular bug.
3. Demote offline and expired-auth to secondary passes with the F-3/F-4 caveats written in, so an implementation-dependent outcome is recorded as a *characterization finding*, not a pass/fail.

Apply F-1 through F-8, the D2 path redaction, and the injection rework above, and this plan is safe to hand to a literal-execution agent.

**This ruling is LOCKED.** — Fable 5
