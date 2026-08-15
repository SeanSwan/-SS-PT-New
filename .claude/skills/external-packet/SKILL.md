---
name: external-packet
description: Preflight gate for every outbound call to an external model that sends a hand-authored document. Proves the packet carries the real artifact — byte-verified source, resolving premises, clean hygiene — then STOPS for human spend approval. Use before any consult-*.mjs --document run, or when Sean says "send this to Kimi", "get a review", "packet this up".
---

# external-packet — the packet carries the artifact, or the call does not happen

**THE INVARIANT:** *The model's context contains the real artifact — provably, mechanically — or
the call does not happen.*

**TRUNCATION GUARD:** if you cannot see the line `END OF SKILL — 6 checks, v1` at the bottom of
this file, it was truncated. Re-read before acting. A skill about confabulation is itself subject
to the failure it governs.

## Owner decisions — settled, verbatim, do not re-litigate

1. **Oversized packet → REFUSE and make the operator narrow it. Never substitute a summary.**
2. **The skill builds the packet, runs the zero-call preflight, then STOPS for approval.
   Spend approval stays human.**

## Legend

- **[M]** mechanical — a script enforces it. Green means bytes were verified.
- **[A]** advisory — judgment. Green means nobody checked; it means nobody objected.

Prose exhorts, scripts enforce. A rule that can be mechanical and isn't will become decorative.

---

## 1. When this fires

Before **any** outbound call to an external model that carries a hand-authored document —
`consult-kimi.mjs`, `consult-fable.mjs`, `consult-hy3-design.mjs`, `consult-opus5.mjs`,
`consult-openrouter-panel.mjs`, or ad-hoc API use — run:

```bash
node scripts/packet-gate.mjs --document <path.md> \
  [--remit "…"] [--seed <path.md>] [--provider kimi] \
  [--budget-chars 24000] [--overhead-chars 2200] [--max-tokens 60000] [--json]
```

Exit `0` = cleared (a human still runs the send). Exit `1` = refused. Exit `2` = the gate could not
run, which is also a refusal.

**R1 measures the assembled prompt, not the document.** `context-gateway/src/consult.mjs` sends
`remit + fence scaffolding + document + seed`, and the wrappers prepend a fixed remit
(consult-kimi.mjs alone is ~1,738 chars). `--overhead-chars` covers that; pass `--seed` so the seed
file is counted too. Measuring the document alone under-reports the very quantity R1 bounds. **Answering about this repo's code from memory, through any transport,
is the violation this skill exists to prevent.**

## 2. Two lanes — one invariant, two mechanisms

| Lane | Mechanism | Status |
|---|---|---|
| **compiled** — `context-gateway` pulls line windows from the repo | byte-exact by construction: `safeRead` windows, `packet.mjs` blob SHAs, `egress.mjs` value redaction, `providers.mjs` ceiling | **already built.** Not re-checked here |
| **document** — `--document <file.md>`, hand-authored | nothing mechanical stood between typed-from-memory code and the wire | **this gate** |

By-reference is not "a cheaper inline" — it is a different operation with different failure modes.

> **NOT BUILT IN v1 — the chat lane.** The blueprint also specifies a Hermes/chat lane with
> proof-of-read (sha-echo + ≥5 probes sampled fresh from pinned bytes, ≥2 from remit-named seams,
> ≥1 negative-space, script-verified, receipt before findings, one retry then refuse) and
> sha-pinned memo expiry. **None of that exists yet.** It is specified in
> `docs/ai-workflow/AI-HANDOFF/KIMI-REVIEW-5-SKILL-BLUEPRINT-2026-08-13.md` §6. Do not cite this
> skill as evidence that the chat lane is governed. It is not.

Two chat-lane insights worth preserving even though the lane is unbuilt:

- **For a repo-reading agent, the repo IS the packet.** Stale memos and superseded reviews in the
  ingest path become ambient context, and the agent will confabulate from your own committed
  sediment with perfect citation. Consult memos must expire when their target's sha moves.
- **Probe ground truth must be gitignored.** Hermes reads the repo; committing the answers hands
  it the exam.

## 3. The six v1 checks

Ship exactly these. The blueprint lists sixteen; the other ten are deferred **until measured**,
because the design's own top-ranked failure is operators routing around expensive gates.

| Code | Refuses when | Why — the evidence |
|---|---|---|
| **R1** [M] | packet exceeds the context budget | owner decision. A context budget can bind while cap-usd would clear |
| **R3** [M] | a cited block fails byte re-extraction | hand-typed code is prose wearing a fence |
| **R4** [M] | remit asks about code, no cited artifact | makes the failed prose review structurally unrepeatable |
| **R5** [M] | remit names a path/route grep cannot find | a paid review spent a finding on `/unblock`, which does not exist |
| **R6** [M] | secret/PII scan hits the assembled packet | sending real code means real secret risk |
| **R15** [M] | canary suite stale (>30d) or red | a gate with no canary history is presumed broken |

### Citing an artifact

A block is **cited** when its fence declares provenance. Only cited blocks are byte-checked:

````
```js path=backend/services/sessions/sessionBlockAuthorization.mjs lines=1-25
<verbatim bytes, extracted — never retyped>
```
````

Uncited fences stay legal for illustration and are never byte-checked. But if the remit names code
and **no** block is cited, R4 refuses.

### Deliberate precision choices

- **R5 refuses on paths and routes; bare symbols only WARN.** A remit legitimately names a symbol
  to be created. Refusing on those teaches the operator that refusals are noise, and alarm
  conditioning precedes the real failure sailing through.
- **R6 refuses; it does not auto-redact.** This diverges from `egress.mjs`, which auto-redacts and
  is right to: it governs windows the compiler pulled mechanically, where a hit is an accident of
  the source. Here a hit means a human put a secret in a document by hand, and silently rewriting
  their prose can destroy the very lines under review — auth code mentions tokens by nature.
  Sanitization is an operator decision, then re-run.
- **An absent remit exits 2, fail-closed.** R4 and R5 derive from the remit's anchors, so no remit
  makes them *unevaluable*, not passing. Without this, omitting the remit is a one-word bypass.
- **R5 resolves premises against code, never prose — and never tests.** Markdown, tests, specs and
  fixtures are excluded: a route documented in a design doc, or named only in a test assertion, is
  not an implemented route.
  > ⚠ **Never write a phantom route literally anywhere in this repo — not in a test, and NOT IN A
  > COMMENT.** `git grep` finds it, the phantom resolves, and R5 goes quiet. This happened twice
  > during the build: once via the test suite, once via a comment *explaining the first one*.
  > Describe phantoms; build test needles from fragments at runtime.
- **An anchor-free remit plus uncited code fences is exit 2, not "artifact not required".** This was
  the gate's own worst bypass — see §6.
- **Numeric flags must be non-negative, not merely finite.** A negative `--overhead-chars` shrank
  the measured total and let an oversize packet through.
- **R6 scans the document *and* the seed.** Anything that reaches the model gets scanned.
- **Uncited code fences are WARNED, not refused.** R4 is satisfied by one cited block, so a packet
  can pair real source with hand-typed fences the model reads as equally authoritative. The
  preflight prints how many and where. Refusing would punish legitimate illustrative snippets;
  promote to a refusal only if measured abuse justifies it.

## 4. Selftest — the gate on the gates

```bash
node scripts/packet-gate/selftest.mjs      # writes out/packet-gate/selftest.json (gitignored)
```

37 canaries — the original 26 plus one per defect found by the paid hostile reviews (§6), so none
of them can rot back. Each RED canary must drive its gate red on purpose; each GREEN canary must produce
zero findings, because a check that fires on clean input is a bug of equal severity to one that
never fires. One canary is an **integration** case that runs the real `scan-secrets.sh` against a
runtime-assembled secret-shaped string — the pure check would stay green forever if the scanner
silently stopped matching.

**A gate with no canary history is presumed broken.** R15 blocks every send, including known-good
packets, until the suite runs green. Verified: with `selftest.json` removed, a byte-clean packet
is still refused.

## 5. How this rots

1. **Bypass economics — the one that kills it.** The transport is unchanged: `consult-kimi.mjs`
   accepts any `--document`. Nothing *forces* this gate. You cannot prevent bypass without changing
   the transport; you can only make it unnecessary (every refusal ships a one-command remedy) and
   visible. **Audit, not cryptography. If you find yourself wanting a hard lock, the economics are
   wrong — fix the remedy menu, not the lock.**
2. **Refusal fatigue.** False refusals teach the operator to ignore refusals. Every mismatch prints
   the first divergence with both sides, so a refusal is diagnosable in 30 seconds. GREEN canaries
   measure the false-block rate.
3. **Mechanical-check rot.** Secret patterns go stale; a Windows path bug starts passing
   everything. A broken gate exiting 0 is worse than no gate — hence the integration canary and
   R15's default-deny.
4. **Section theater.** Content validators catch lazy emptiness, not plausible emptiness. The last
   10% is a human reading one packet, monthly. Pretending otherwise is how gates become decorative.
5. **Origin-story erasure — terminal.** In a year someone concludes this is ceremony and deletes
   it. The violations stopped *because of it*, which is indistinguishable from never having been
   possible. There is no mechanical tripwire. The defense is §6: keep the receipts so a cold reader
   can re-derive the rule in ninety seconds instead of trusting it.

## 6. SETTLED — the origin story, in evidence form

Four paid reviews, **$0.77 total, same model, same price band**:

| Packet contained | Cost | Findings | Verified real |
|---|---|---|---|
| source of a QA gate | $0.1958 | 9 | every checked claim |
| **a prose description** | **$0.0849** | **3** | **1 of 3** |
| source of the four fixes | $0.2294 | 8 | 5 of 8 |
| source post-fix | $0.2550 | 10 | both same-day items |

**Send the source, never a description.** The model's judgement on *what to do next* was reliable
every time; its claims about *what the code currently does* were reliable only when it could read
that code. Verify every factual claim before acting.

Two more receipts worth keeping:

- **The `/unblock` phantom.** A review spent a finding on a route that does not exist in this repo.
  Phantom premises produce confident reviews of systems that were never built. That is R5.
- **The gate that silently did not run.** While building this, the remit parser used a
  `(?=^##\s|\Z)` lookahead. `\Z` is not a JavaScript assertion — under `/i` it matched the literal
  letter **z**, truncating the remit at the first "z" in "authorization". Anchors after it vanished,
  and **R4 and R5 silently reported clean because they had nothing left to check.** Nothing failed
  loudly. It was caught only by running the gate against a packet whose refusal was known in
  advance. That is why every check has a canary, and why the fix ships with a regression canary
  pinned to the exact defect.

- **The check that blessed the phantom it was built to catch.** R5 first resolved premises with a
  repo-wide `git grep`. But `/api/client/analytics-summary` and `/api/immigration/study-sessions`
  appear **only in markdown** and are implemented nowhere — so R5 confirmed them as real. A check
  against documentation of intent is not a check against reality. Markdown is now excluded.
- **The gate that measured the wrong thing.** R1 compared the *document* against the budget, but
  `consult.mjs` sends `remit + scaffolding + document + seed` — under-reporting by ~2KB minimum and
  by an unbounded amount whenever `--seed` is used. A size gate that measures the wrong quantity is
  not a conservative gate; it is a decorative one.
- **The tool that lied about the tool.** While hunting the above, a Git Bash probe reported
  `/api/sessions` as absent — a string that occurs 413 times. MSYS path conversion had rewritten the
  leading-slash pattern into a Windows path before `git` saw it. The *code* was fine; only the
  shell-based probe was broken. **Validate the instrument before believing a negative** — and note
  that the fix here was a regression test pinning the working behavior, not a change to working code.

### What two paid hostile reviews found that three of my own passes did not

Kimi K3 ($0.1047, 78s) and Tencent HY3 ($0.0172, 343s) reviewed the gate's **source**. Both
independently found the same critical bypass, and each found real defects the other missed. Every
claim below was verified by running the code before it was fixed — and every one is now a canary.

- **The bypass the gate shipped with (both reviewers, independently).** `aboutCode` decided whether
  the artifact invariant applied *at all*, and the packet author writes the remit that sets it. So:
  hand-type fabricated fences with no `path=`, write a remit naming nothing — R4 returned `[]`, R5
  had no anchors, and the gate printed **PACKET READY**. It was the *default* outcome for any
  plainly-worded remit. Review-2's failure, reproduced by the tool built to prevent it.
- **Gate 0 was the easiest check to fake (Kimi S2, HY3 S3).** `{"ranAt":"<now>"}` passed R15 with
  zero canaries ever run: `undefined > 0` is false and `undefined !== undefined` is false, so both
  refusal branches were skipped. A future-dated record never expired at all.
- **R4 was cleared by a description (Kimi S4).** `cited` meant only "has a `path=`", so
  ` ```md path=docs/notes.md ` satisfied the one check whose entire purpose is *a description of
  code is not code*.
- **R6 never scanned the seed (HY3 S2)** — while the code comment claimed it scanned "the assembled
  packet" and the preflight printed `HYGIENE clean [ok]`.
- **A negative `--overhead-chars` defeated R1 (HY3 S5).** A 30,003-char document measured as 1,033.
- **`path=""` crashed with an uncaught EISDIR stack trace; `path=../../.env` was read happily
  (Kimi S6/S7).**
- **Broken-tool and no-match were conflated (Kimi S6.2).** A missing git or wrong cwd made every
  route in every legitimate remit refuse — a false-refusal machine.

**The lesson, stated plainly: 26 canaries passed and the gate was still bypassable by writing a
plainly-worded remit.** A green suite proves the cases you thought of. Two adversarial readers of
the *source* found what the suite was built blind to. That is what the paid call is for — and it
only worked because the packet contained the code, not a description of it.

**Calibration keying:** identity = the model; slicing = the task class; transport = delivery only.
`"Hermes"` is never a calibration key — its local and cloud brains are separate records.

---

END OF SKILL — 6 checks, v1
