---
surface: vs-claude
utc: 20260814T081500Z
topic: Kimi failed twice, HY3 carried the rounds — and a paid call that returned nothing was recorded as "ok"
tags: [consult-lane, receipts, review-calibration, hy3, kimi]
---

## What I did / learned

- Sean authorised finishing the rounds plus HY3. Ran Kimi 17, Kimi 18 (×2), HY3 ×3.
- **Kimi K3 failed twice on the same packet** — first an empty response after 4354 billed
  completion tokens, then `finish_reason: error` after 144. **HY3 succeeded on the IDENTICAL
  packet**, which is a clean A/B: the packet was fine, the model was not. Do not assume a bad
  review means a bad prompt; swap the model and find out.
- **The empty response exposed a real defect in the money path.** `transport.mjs` did
  `content || '(empty response)'` and returned it as an ordinary success. The artifact was written,
  the console said `saved ->`, and the receipt recorded `outcome: 'ok'` with full cost. **You pay,
  get nothing, and the audit record calls it a success** — in the module built to make spend honest.
- Second defect in the same area: `receiptV1` had ALWAYS read `result.finishReason` and transport
  never set it, so **every receipt ever written recorded null**. A schema column that cannot be
  populated is a claim the record does not support. Capturing it immediately paid off — the second
  Kimi failure showed `finish:error`, which is how I know it was erroring rather than thinking.
- **HY3 is materially better than expected at implementation review.** It found: my "fixed" test
  tripwire still hardcoded a family regex (a new suite was invisible); an empty response set no
  exit code so automation saw success; a stale enumeration in a header; and — best of all — a
  fail-open inside my own fix for its previous finding.

## Why it matters to Hermes

- **A green pipeline is not an intact payload — and now, a green LEDGER is not honest spend.** The
  receipt system was the thing being built, and it was recording success for calls that produced
  nothing. Any ledger needs a category for "billed and worthless" or its success rows are a lie.
- **When a reviewer fails, swap labs before blaming the input.** Same packet, two models, opposite
  outcomes. That one comparison saved a rewrite.
- **A default parameter is not a guard.** `home = homedir()` fires only on `undefined`; an explicit
  `null` sailed past it and the redaction silently did nothing. Falsy must never mean "skip the
  security control" — it must mean "use the safe default".
- **Reviewer evidence is only as good as the diff you hand it.** HY3's highest-severity finding was
  already fixed; I had sent it `HEAD~1..HEAD`, excluding the fix, and it read my prose description
  of the bug as current state. That wasted a round and it was entirely my error.

## State right now

- Branch `s0/receipt-v1-2026-08-13`, **34 commits, NOT pushed**. Tree clean.
- gateway **148/147/0/1** · mcp-health family **36/36** via the folder runner · hooks **79/79**.
- Test family moved to `scripts/__tests__/mcp-health/` — membership is now the FOLDER, so no
  enumeration exists to drift. Proved by adding an unwired suite: red, named, on-disk list printed.
- **Deferred, Sean-gated:** no repo-wide test runner exists, so a stray suite outside the folder
  never runs. Pre-existing (all eleven unrelated suites in `__tests__` already never run
  automatically), not introduced here. HY3 correctly noted node supports recursive discovery, so my
  stated reason for deferring was partly wrong even though the deferral stands.
- Spend today: Kimi $0.0812 + $0.0843 + $0.0317 = **$0.197**, of which **$0.116 bought nothing**.
  HY3 $0.0060 + $0.0046 + $0.0033 = **$0.014** and carried three useful rounds. HY3 was ~14× cheaper
  per usable review.
- **HY3 bypasses the receipt lane entirely** — it is an older standalone script, so its spend never
  reaches the ledger and its console prints an absolute path. Gap worth closing.

## Mistakes I made

- **Fifth shell-escaping corruption of the session.** A heredoc collapsed `\\` to `\`, producing
  `Invalid hexadecimal escape sequence`. I had already written this up TWICE today, including in a
  durable packet. → rule: string fixtures go in a file via the editor with `String.raw`, never
  through a heredoc. The write-ups did not stop it; only the tool change does.
- **I sent HY3 the wrong diff scope** (`HEAD~1..HEAD`), excluding the fix its highest-severity
  finding was about, and it burned a round on an already-closed issue. → rule: the packet must
  carry the evidence for every claim it makes, including claims about what is already fixed.
- **My W3 fix contained the very class it was fixing.** I closed the `undefined` case with a default
  parameter and left `null`/`''` failing open — a fail-open inside a fail-open fix, caught by the
  reviewer, not me.
- **My dead-import detector produced nine false positives** earlier in the session; I nearly
  recorded a finding from it. Sixth instrument failure.
- **I set a 2-minute timeout on a call whose prior round took 318 seconds**, killed it, and cannot
  observe whether it billed.

## External-model calibration

- **Kimi K3 — 3 attempts today, 1 usable.** Round 17: $0.0812, 3 findings, 2 real as stated, 1
  overstated, 0 hallucinated. Round 18: two consecutive failures ($0.116 for nothing). Its
  cumulative record is still strong (~57/58 real) but **it is currently unreliable on this lane**,
  and the failures were silent until the empty-response fix made them visible.
- **HY3 (`tencent/hy3`) — 3 rounds, 3 usable, $0.014 total.** Excellent implementation review:
  correctly refused UI findings against tooling three times running, traced a defect's evolution
  across four fix attempts, and caught a fail-open inside my fix for its own prior finding. Its one
  wrong call (W1) was caused by my bad packet. **Promote it from design-only to a first-class
  implementation reviewer.**
- Its proposed CODE was wrong twice while its DIRECTION was right both times (a separator
  normalization that would misreport Windows paths; an import-everything runner that claims eleven
  unrelated suites). Take the finding, write the fix yourself.

## Linear tracking

- **N/A — board unreachable** (token 401, re-verified). Queued for filing once rotated: repo-wide
  test runner (HY3 W2); route HY3 through the receipt lane so its spend is auditable; Kimi K3
  reliability watch; Sol price drift in `providers.mjs`.
