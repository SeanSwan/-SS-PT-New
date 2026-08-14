---
originating_model: claude-opus-5
co_reviewers: moonshotai/kimi-k3 (Fable-tier), tencent/hy3 (NOT Fable-tier — findings included only where independently verified against source)
captured: 2026-08-14
surface: mission QA harness + backend model registry
boards: SWA-157
status: shipped (72332f5ae on claude/qa-harness-slice0-20260811 — committed, not pushed)
models_used:
  - model: claude-opus-5
    role: author, packet builder, verifier, final decider
    did: built the review packet, dispatched both reviewers with one remit each, verified all 17
      findings against source, fixed 13, refuted 4, and wrote proofs that each fix trips
    cost: subscription (flat rate)
  - model: moonshotai/kimi-k3
    role: external hostile reviewer — correctness / fail-open remit
    did: found comment-seeding in the registry parser, four silent parser drops, and BOTH of my
      tests that could not fail for their stated reason
    cost: $0.1224 (one wasted timeout call before it, at a 60k output budget)
  - model: tencent/hy3
    role: external hostile reviewer — absence remit
    did: found that a NAME check is not a VALUE check; over-stated its top finding
    cost: $0.0055
skills_touched:
  - id: backend/utils/modelRegistryAudit.mjs
    change: amended
    motivating_failure: it did not strip comments, so a TODO naming an unregistered model seeded
      that name into the "registered" set — the tripwire could pass over the exact bug class it
      was built to catch.
  - id: frontend/e2e/mission/dashboardRouteManifest.ts
    change: amended
    motivating_failure: single-quote-only path regex and an unbounded role-block search, both of
      which shrink or corrupt the manifest silently.
  - id: none created
    change: n/a
    motivating_failure: the doctrine needed already exists; what was missing was applying it to
      my own tests.
---

# Tests that are decorations

Durable lessons from buying two external hostile reviews of one session's work, and learning that
two of the tests I had written, reviewed, and dry-looped were structurally incapable of failing for
the reasons they claimed. Privacy: IDs and roles only.

---

## 1. A green test is not evidence the assertion exercised what it names

Two tests written, self-reviewed, and passed through a dry-loop in this same session:

- The backend fail-loud guard passed `new URL(import.meta.url).pathname`, which on Windows is
  `/C:/...` — an invalid path. `readFileSync` threw **ENOENT**, not the guard being tested. The
  assertion still went green because the matcher was `/return \{|registry/i` and this file's
  **name** is `modelRegistryDrift.test.mjs`. It would have passed on any error ever thrown.
- The crawl-timeout test called `crawlTimeoutFor` without clearing the env override that function
  checks **first**. In any CI that sets `SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS` — the documented way
  to pin it — every assertion passed while the function was a flat constant, i.e. with the exact
  defect the test names fully present.

My dry-loop rounds all asked "is the suite green?". None asked "can this assertion go red?".

**Rule: for every assertion, ask what would have to be true for it to PASS while the defect it
names is present. If the answer is "quite a lot of ordinary things", the test is a decoration.**
That single question, handed to an external reviewer, found both in one pass.

Corollary: **a guard test must not depend on incidental text.** One passed because of its own
filename; a third instance appeared mid-fix when a new fixture legitimately introduced the anchor
string into the spec file that was using itself as the negative case. Use purpose-built inputs.

---

## 2. A gate can contain the exact bug class it was built to catch

`readRegisteredModels` parsed the model registry without stripping comments. A line like

```js
// TODO: register PaymentPlan, DisputeBatch next sprint
```

inside the returned object put both names into the **registered** set. A
`getModel('PaymentPlan')` call site would then pass the highest-severity assertion while the model
was unregistered — which is precisely the production failure (renewal alerts, dead for months)
that this tripwire was written to make impossible.

The comment-stripping helper already existed **in the same file**. I had applied it to one of two
consumers.

**Rule: after building a detector, run it against the failure it was built for, with the failure
re-introduced. A detector is not proven by finding a bug once; it is proven by failing when the bug
returns in a different disguise.**

---

## 3. Verifying before fixing is what makes an external review worth buying

4 of 17 findings were wrong — including the highest-ranked finding of one reviewer, which claimed
the change would mass-email real users. Verification took minutes: grep the service for any
outbound path. There is none — no email, SMS, or push anywhere in it.

Fixing all 17 uncritically would have meant three unnecessary code changes and one false alarm
escalated to the owner as a production risk.

**Rule: an external finding is a hypothesis with a price tag. Verify against source before acting,
and report back which were real — both to keep the reviewer calibrated and to keep your own trust
in it honest.**

---

## 4. Fixing a silent-failure class requires proving the guard now makes noise

Every finding in this review was of one shape: the code returns a **wrong-but-nonempty** result, so
the fail-loud guard never trips and the gate silently checks less than it claims.

Widening a regex does not fix that. The next unanticipated syntax is dropped just as quietly. What
fixes it is a **count-check** — assert that the number of things parsed equals the number of things
declared — so an unrecognised form fails loudly instead of shrinking the result.

And the fix itself needs proof: four tests now feed deliberately broken sources through the parser
and assert it throws. Fixing silence without demonstrating noise is how the first version shipped.

**Rule: when the failure mode is silence, the test must show the code becoming loud. "It still
passes" is the same evidence the broken version produced.**

---

## 5. Remit separation is load-bearing

Each reviewer got ONE remit — correctness for one, absence for the other — because a dual-remit
packet makes a single model role-play both and do neither well (learned 2026-08-13, held here).

The results diverged exactly as intended: the correctness reviewer produced constructible triggers
with file and line; the absence reviewer produced architectural questions and one sharp catch the
correctness lens would never have surfaced (that a NAME check is not a VALUE check). Neither found
the other's material.

**Rule: one remit per reviewer, and pick remits that cannot be satisfied by the same reasoning.**

---

## Who did what

- **claude-opus-5 (me)** — wrote the work under review, built the packet, dispatched both reviewers,
  verified all 17 findings against source, fixed 13, refuted 4, wrote the proofs. Also authored both
  decoration tests and the tripwire hole; the review found my errors, not someone else's.
- **moonshotai/kimi-k3 (Fable-tier)** — correctness remit. Found the comment-seeding hole, four
  silent parser drops, and both decoration tests. Correctly reported two no-findings rather than
  padding. One refuted claim.
- **tencent/hy3 (NOT Fable-tier)** — absence remit. Its top-ranked finding was materially wrong; its
  #2 was a genuinely sharp architectural catch. Included here only where independently verified.

## Skills created or changed

No new skill. The doctrine that would have prevented all of this — validate the instrument,
proof-before-done, ask what makes an assertion vacuous — already exists in this repo and I wrote
part of it two days ago. The failure was applying it to my own tests, which felt like the verified
thing rather than the thing needing verification. The durable artifacts are the amended parsers and
the four proof tests, both committed.

## Mistakes I made

- **Shipped two tests incapable of failing for their stated reason**, both self-reviewed, both
  through a dry-loop I declared CLEAN×2.
- **Built a drift tripwire containing its own bug class**, with the fix (a comment stripper) already
  present in the same file and applied to only one of two consumers.
- **Repeated the incidental-text failure a third time in one session**, while fixing the first two.
- **Wrote a single-quote-only parser** immediately after spending the session fixing a
  coverage-blindness bug caused by exactly that kind of narrow assumption.
- **Wasted a paid call** by giving Kimi a 60k output budget that hit the transport deadline.
- **Probed for the OpenRouter key in the wrong location first** — one turn after writing up the
  identical two-axis probe failure for the Linear key.

## Error → fix → repeat ledger

| Error class | Times this turn | Previously written up? | What finally stopped it |
|---|---|---|---|
| Test passes for a reason unrelated to its claim | 3 (2 shipped, 1 mid-fix) | No | Ask per assertion: "what makes this pass with the defect present?" Purpose-built negative inputs, never the file itself. |
| Detector contains the bug class it detects | 1 | No | Re-introduce the original failure in a new disguise and confirm the detector fires. |
| Narrow parser assumption drops input silently | 4 | **Yes — this session's own coverage-blindness lesson** | Count-check: parsed == declared, else throw. Widening alone does not fix silence. |
| Two-axis probe → confident false negative | 1 (OpenRouter key) | **Yes — written up ONE TURN EARLIER** | Caught in seconds because the lesson was fresh; the durable fix remains the recorded one-liner. |
| Trusting external findings without verification | 0 (all 17 verified) | Yes | Held. 4 refuted, including a false production-risk alarm. |

The third row is the sharpest. I spent this session fixing coverage blindness caused by narrow
assumptions, then wrote a parser with a narrow assumption. Knowing a lesson in the abstract does not
transfer it to the next artifact you write; only a mechanical check does — here, `parsed ==
declared`. The fourth row shows the opposite: a lesson written up **one turn earlier** was caught
almost instantly. Recency, not understanding, is what made the difference — which argues for
converting lessons into committed checks fast, while they are still fresh enough to act on.

## External-model calibration

| Model | Remit | Real | Refuted | No-finding (correct) | Cost | Verdict |
|---|---|---|---|---|---|---|
| Kimi K3 | correctness / fail-open | 13 (9 fixed, 4 minor) | 1 | 2 | $0.1224 | High precision. Concrete triggers, dropped what it could not construct. Call again for correctness. |
| HY3 | absence | 2 fixed + 3 valid-scope | 2 (incl. its #1) | 0 | $0.0055 | Over-states severity, asserts unverified specifics, but strong structural instincts. Use for "what did I not consider", never for "is this true". |

Total $0.1279 for nine real defects including two vacuous tests. The correctness remit paid for
itself many times; the absence remit paid for itself on one finding out of five. Both are worth
repeating at this price, with verification mandatory on every claim from either.
