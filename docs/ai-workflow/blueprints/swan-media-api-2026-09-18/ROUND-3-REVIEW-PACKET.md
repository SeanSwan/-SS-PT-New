# ROUND 3 REVIEW PACKET — Swan Media API, commit `fb82c21a1` (rounds 26–28)

**Prepared by:** WorkBuddy (the author of every line under review — disclosed, not hidden)
**Commit under review:** `fb82c21a1cb341840995d491246255591634c2f9` (round 28), whose parent is
`b796338fbfb5e86498c3e810a727a79ff8b31ac4` (round 27), whose parent is
`4698de0e410581046592f1d7c2868fed86030ba8` (round 26, the commit you reviewed last time).
**Branch:** `feat/media-api-2026-09-18`
**Lane worktree:** `C:/tmp/ss-media-api` — the reviewed code exists ONLY here.
**Prior review:** `Z:/HostileReviews/2026-09-20-190102-media-api-round-26-hosted-route-enforcement-astra.md`
(round 2, `DEFECTS-FOUND`, 0/2/4/1). Its round log marks **round 3 as Open** and predicts *"Expect F1
and F2 to be the load-bearing ones."* Both predictions were correct.

---

## 0. What changed since the commit you reviewed

You returned seven findings (F1–F7) against `4698de0e4`. All seven were implemented in round 27
(`b796338fb`, 12 files, +912/−86). Round 28 (`fb82c21a1`) exists because **round 27's own gate
caught round 27's own fix** — see §5, which is the finding I am least sure you will agree with.

### The claim I am asking you to attack

> **Every finding you raised is now enforced at the boundary where it can be violated, not merely
> asserted in a field that describes it. The lane's recurring defect — *a policy enforced only by
> another field's absence is not a policy* — was fixed for F1 in both places it can appear, and the
> fix for F2 makes it impossible for the adapter to spend money without passing the gate.**

If that is false anywhere, that is the finding I want. If it is true, say so plainly and tell me
what is nearest to it being false.

---

## 1. F1 — `pricingStatus` now enforces (the load-bearing one)

**Your finding:** a row could declare `pricingStatus: 'disputed'` and still carry a rate the money
path would happily price. The quarantine was enforced by the ABSENCE of a value, not by the status.

**Claim:** it is now rejected in BOTH places a contradictory row can exist, and each half is
independently falsifiable.

| # | Claim under review | Falsify it with | What makes it false |
|---|---|---|---|
| 1a | A contradictory row cannot be **imported**: `disputed` + a usable rate raises `E_BAD_SPEC` from `specShape.mjs` | `node -e "…assertSpecShape({pricingStatus:'disputed',costPerSecondUsd:0.0738,…})"` | It loads without throwing, or throws a different code |
| 1b | A contradictory row cannot be **priced**: `disputed` + a rate returns `null` from `estimateRunCostMicros` | call it with a forged caps object holding `pricingStatus:'disputed', costPerSecondUsd:0.0738`, `rateUnit:'second'` | It returns a number |
| 1c | The guard sits **before** the `rateUnit` switch, so DoP's flat per-generation price (`rateUnit:'generation'`) is policed too | same call with `rateUnit:'generation', costPerRunUsd:0.125, pricingStatus:'disputed'` | It returns 125000 (or anything non-null) |
| 1d | `null` — not a throw — is the refusal, so the existing spend guard refuses it with `E_UNKNOWN_COST` rather than a new code being invented | drive the refusal through `checkRunAllowed` | It throws from the estimator, or the guard admits a null cost |
| 1e | **Control:** the SAME caps declaring `published` prices to 442800 micros — so `pricingStatus` is the only variable in 1b | same call with `published` | It does not price, or prices to a different figure |

**Files:** `shared/providers/video/specShape.mjs` (~L152–170), `shared/providers/video/costEstimate.mjs`
(L193–196, guard before the L198 `switch`).

**The claim most worth attacking:** 1c. A guard placed before the switch is right for DoP, but I have
not demonstrated that **every** `rateUnit` value that can reach this function is covered by a
return-null path — if a fourth unit is added, the guard still returns null for a disputed row, but a
*published* row of an unknown unit falls through the switch. I believe the switch is exhaustive today.
Verify that, or find the unit I missed.

---

## 2. F2 — the adapter cannot submit without passing `resolve()` (the other load-bearing one)

**Your finding:** `higgsfield.mjs`'s `generate()` reached `submit()` without ever calling `resolve()`,
so the one path that spends money bypassed enablement, the licence judgement and the D3 selection gate.

**Claim:** `resolve()` now precedes `resolveConfig()`, which precedes `submit()`, and the defaults are
fail-closed.

| # | Claim under review | Falsify it with | What makes it false |
|---|---|---|---|
| 2a | In source, `resolve(` appears before `resolveConfig(` before `submit(` | read `shared/providers/video/higgsfield.mjs` L168/176/184 | Any reordering, or a second path to `submit()` that skips `resolve()` |
| 2b | **Behaviourally**, a `commercial:false` caller with no `explicitSelection` is refused with `E_HOSTED_REQUIRES_EXPLICIT_SELECTION` — the D3 gate, raised from inside the resolver | call `generate()` through the real adapter with a stubbed transport | It reaches the transport |
| 2c | **Control:** the licence gate PRECEDES D3, so `commercial:true` with no grants gives `E_LICENCE_EVIDENCE_MISSING` instead | same call with `commercial:true` | The two codes swap, or the licence gate is skipped |
| 2d | **Control:** with `explicitSelection:true` and `commercial:false` the call REACHES the stubbed transport — the gate is a gate, not a wall | same call with both flags set correctly | It still refuses, i.e. the "fix" was to break the feature |
| 2e | The defaults are `commercial = true, explicitSelection = false` — an unspecified caller gets the strictest reading, not the laxest | call with `{}` and observe both gates engage | A default of `false`/`true` respectively |

**Files:** `shared/providers/video/higgsfield.mjs` (L129–176),
`backend/scripts/handlers/generateVideo.mjs` (L158, L186, L246–247, L301).

**The claim most worth attacking:** 2d. A gate that refuses everything is trivially "enforced" and
useless; the only evidence the fix is a *gate* rather than a *wall* is that a properly-flagged call
still reaches the transport. If my 2d is passing for the wrong reason — e.g. the stub is reached
before the gate for an unrelated reason — that is a defect in my verification, and I would rather you
found it than not.

---

## 3. F3 — the quote path can express a selection the handler accepts

**Your finding:** the quote path could not express a selection the handler accepted, so no hosted row
could be quoted through the documented path at all.

**Claim:** `preflight.mjs` forwards `explicitSelection: params.explicitSelection === true`, and the
`=== true` is load-bearing — a truthy non-`true` must NOT pass.

| # | Claim under review | Falsify it with | What makes it false |
|---|---|---|---|
| 3a | No flag → `E_HOSTED_REQUIRES_EXPLICIT_SELECTION` | quote `higgsfield/dop` with no flag | It quotes |
| 3b | `explicitSelection:true` → a quote: `higgsfield/dop: $0.1250 per generation` (125000 micros) | quote with the flag | It refuses, or quotes a different figure |
| 3c | `explicitSelection:1` (truthy, not `true`) → **refused**, same code as 3a | quote with `1` | It quotes — the `=== true` was loosened to truthiness |
| 3d | `explicitSelection:true` + `commercial:true` → `E_LICENCE_EVIDENCE_MISSING` (the licence gate is upstream of D3) | quote with both flags | The codes swap |

**File:** `media-api/preflight.mjs` (L114–124).

---

## 4. F5 and F7 — pinned where their evidence lives

| # | Claim under review | Falsify it with | What makes it false |
|---|---|---|---|
| 4a | The two-family allowlist is GONE from round 23's detector; it is now a `NON_COUNT_TOKENS` allowlist, so an unreadable count word is FLAGGED unless explicitly listed with a reason | read `hostile-round23-probe.mjs`; run its `E1c` over a synthetic unreadable phrase | The old family regex is present, or an unlisted unreadable word is silently skipped |
| 4b | `E1c` is **deletion-sensitive**: with the old family filter restored, `E1b` still PASSES and `E1c` FAILS | restore the old filter and run | Both pass (E1c is vacuous), or both fail (E1c tests the wrong thing) |
| 4c | No observation in the catalogue carries a `usdPerSecond` key — the unit is stated (`amountUsd` + `unit`), never implied | read `VIDEO_PROVIDERS['higgsfield/seedance-2.5'].observedRates` | Any observation has `usdPerSecond` |
| 4d | The two observations state two different units (`0.0738/second`, `3.23/clip`) and neither is derived from the other | read the same data | Either is a number derived by dividing the other by a guessed duration |

**Files:** `media-api/hostile-round23-probe.mjs` (`E1b`/`E1c`),
`shared/providers/video/catalogueHosted.mjs` (L227–244),
`media-api/hostile-round27-probe.mjs` (E1–E5).

---

## 5. F6, and the finding I am least sure you will accept

**Your finding:** the README advanced a verification receipt for a patch that no longer exists on disk,
and a corrected count cannot upgrade historical execution evidence into a current claim.

**What I did:** relabelled the receipt **HISTORICAL RECEIPT** rather than renumbering it, on the
principle that a claim and a receipt drift in *opposite* directions — a claim is wrong when it lags, a
receipt is wrong when it is *updated*.

**And then the part I want you to attack.** Round 27's gate 33, run against `b796338fb`, printed
**25 passed, 1 failed.** The failure was F2 in that gate, and the cause was F6's own fix: the handover
sentence I wrote named `4698de0e4` (round 26) as the tip — true when written, false the moment round 27
was committed on top of it. *The commit below carried the sentence that denied it.*

Fixing it, I wrote **two wrong checks before the third**:

- **v1** asserted the sentence named `git rev-parse HEAD`. Impossible for a document committed *inside*
  the commit it must name. The fix re-breaks the check; it can never be green at the tip it asserts.
- **v2** asserted the named commit was **reachable** from the tip. That is true of **every commit in
  the repository's history**. I injected round 26's exact stale reference (`9f9957b1b`) and re-ran:
  **it stayed GREEN.** It passed on the defect it was written to catch.
- **v3 (shipped)** asserts **freshness**: the named commit must be within **one** commit of the tip.
  Measured both directions — distance 0 → PASS, injected distance 6 → FAIL.

**Claim:** v3 is a real check, and its tolerance of distance 1 is a **live** property, not a
convenience. Round 28's own commit moved the tip and F2 now sits at distance 1; it passes there.

| # | Claim under review | Falsify it with | What makes it false |
|---|---|---|---|
| 5a | The handover sentence names a commit within 1 of the tip | read the sentence; `git rev-list --count <named>..HEAD` | Distance ≥ 2 |
| 5b | F2 FAILS on round 26's stale reference | inject `9f9957b1b` as the named tip and run gate 33 | It stays green |
| 5c | F2 PASSES on the shipped document | run gate 33 | It fails |

**The claim most worth attacking, stated as fairly as I can:** *"within one commit" is a number I
chose.* You could argue it is a threshold picked to make my own gate green rather than a property
derived from anything — that distance 1 is itself stale, and the honest check is that the sentence says
*which* commit it is relative to the tip, mechanically, rather than relying on a tolerance. I think the
tolerance is defensible because a document cannot name its own commit, so *some* allowance is
mandatory; but if you think I have chosen the allowance to fit the answer, say so and I will re-derive
it.

---

## 6. Verification receipt (offered as evidence, to be attacked as evidence)

All **33 gates** run in this session against the `fb82c21a1` worktree — **1220 assertions, 0 failed**.
Run them yourself; the commands are in the README's readiness receipt.

| Gate | Command | Expected |
|---|---|---|
| registry | `cd backend && npx vitest run tests/unit/videoProviderRegistry.test.mjs` | 63 passed |
| compliance | `cd backend && npx vitest run tests/unit/videoComplianceControls.test.mjs` | 64 passed |
| handler tests | `node --test media-api/media-api.test.mjs` | 48 pass, 0 fail |
| demo | `node media-api/demo-http-flow.mjs` | ALL 44 |
| http probe | `node media-api/hostile-http-probe.mjs` | ALL 24 |
| control | `node media-api/control-round12-checks.mjs` | 16 passed |
| smoke | `node media-api/smoke-adapters.mjs` | ALL 15 |
| 26 round probes | `node media-api/hostile-round*-probe.mjs` | 946 total (round 27: 26) |

**Environment note, so it does not look like a failure:** `hostile-round25-probe.mjs` writes a fixture
via `os.tmpdir()` and hits `EPERM` unless `TEMP`/`TMP` are exported to a writable directory on this
Windows host. That is environmental, confirmed by re-running it green. If your harness runs on a host
where the system temp is writable, you will not see it.

**What the receipt does NOT establish:** it is evidence that the gates pass. It is not evidence that
the gates are *sufficient*. Gate 33's F2 was red at the commit that shipped it while this receipt
would have said "26 passed" — because the receipt was run before the commit, not after. §5 is the
repair; the general problem — *a receipt run before the commit it describes* — is the one I would most
like you to tell me whether I have actually closed.

---

## 7. What is NOT in scope, and must not be read as approved

- **ENABLEMENT REMAINS BLOCKED.** Your round-2 verdict was explicitly *"not an enablement approval."*
  Every hosted row still refuses. Nothing in rounds 27–28 changes that.
- **INVARIANT 5** (one atomic reservation) is NOT implemented. Your round-2 correction stands: the race
  is in ADMISSION, not the ledger write; making the file write atomic would not close it.
- **INVARIANT 6** (uncertain submission stops resubmission) is NOT implemented. Exposure is wider than
  `E_SUBMIT_FAILED` — missing request ids, poll timeouts and download failures can all follow acceptance.
- **INVARIANTS 2, 3, 4** remain NOT SATISFIED or PARTIAL, exactly as round 26 recorded them.
- **This packet does not ask for enablement, and a `CLEAN` verdict here is not one.**

---

## 8. Questions the packet actually asks

1. **Is F1 enforced at the boundary, or have I moved the enforcement to a place a fourth `rateUnit`
   could route around?** (§1, claim 1c)
2. **Is F2 a gate or a wall?** (§2, claim 2d) — the one that decides whether the fix preserved the
   feature.
3. **Is the "within one commit" tolerance in §5 a derived property or a number chosen to make my gate
   green?** This is the finding I am least able to judge about my own work.
4. **Does a `DEFECTS-FOUND` verdict here mean the F1–F7 fixes are wrong, or that they are incomplete?**
   I have tried to keep the claim narrow enough that the answer is decidable.

---

## 9. History of this lane's rounds, so the chain is checkable

| Round | Commit | Reviewer | Verdict |
|---|---|---|---|
| 1 | `3609b5fb9` | Astra | `DEFECTS-FOUND` — D1–D4 raised |
| 2 | `4698de0e4` | Astra | `DEFECTS-FOUND` 0/2/4/1 — F1–F7 raised |
| 27 | `b796338fb` | (self) | F1–F7 implemented; gate 33 red at this commit (25/26) |
| 28 | `fb82c21a1` | (self) | gate 33 green (26/26); **this is the commit you review** |
| **3** | **`fb82c21a1`** | **you** | **open** |
