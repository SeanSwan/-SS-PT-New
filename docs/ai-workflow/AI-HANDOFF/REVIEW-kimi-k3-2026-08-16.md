# Consult reply — kimi-k3 (moonshotai/kimi-k3) — 2026-08-16T23:07:01.338Z

> tokens: prompt=1388 completion=3253 | finish_reason: stop | max_tokens: 60000

# Review: video compliance controls

**Upfront disclosure, because it matters for how you weight this:** the packet describes the files but doesn't include their source. I will not fabricate line numbers. Every finding below is either (a) a direct answer to a design question, which I can answer from the stated design, or (b) a predicted defect with the concrete input to test — flagged as **unverified against source**. If you want line-pinned findings, send the six files.

---

## Design decisions, ranked by how much I disagree

### 1. Spend=$0 / runs=50 split — **defensible, but your framing is wrong and the run cap is weaker than you think**

The split itself is correct: "unconfigured denies" was a commitment about *spend authorization*, not about whether a free local renderer may run. Fail-closed on money, fail-open-but-finite on volume is the right reading. Don't relitigate it.

What you should relitigate:

- **Run cap of 50 is not a ceiling, it's a speed bump that resets daily.** 50 runs/day of a GPU video pipeline *is* unbounded for cost-control purposes if any billing provider is ever wired to the same ledger — you said spend is the guard for that, fine — but 50/day is also unbounded for *policy* purposes: an operator can generate 50 non-compliant assets/day indefinitely and the cap never bites. Your licensor commitment says "spend/volume ceilings." A volume ceiling that regenerates at UTC midnight is a rate limit. Say that in the licensor doc, or make the cap cumulative.
- **UTC-day expiry is why you classified run-cap refusals as retryable — but a retrying worker at 23:59 UTC will burn the *next* day's quota for *yesterday's* backlog.** If the retry loop is unattended, day N's failures consume day N+1's entire 50-run budget before any fresh work runs. That's a self-inflicted starvation bug. Test: enqueue 60 jobs at 23:00, watch day 2's interactive work fail.

### 2. Flagging real people — **insufficient as stated, but fixable without blocking**

"No depiction of identifiable real people without consent" is a *consent* condition, and a flag without a consent artifact is just a log line nobody reads. The filter's job isn't to decide consent — it's to **force the consent question to be answered**. So the defensible design is: flag → job completes → **asset is quarantined from publication until a human attaches a consent note to the provenance record**. You have human review of every asset anyway (your answer to Q3). If the flag currently just lands in a log or a UI badge with no gate on the publish path, you have a filter that documents its own irrelevance. Blocking capitalized names would indeed be false-positive hell — don't do that. But "flag + no gate" is the weakest of the three options and you picked it.

### 3. Pinned bypasses — **acceptable, and the people telling you otherwise are wrong**

Digit substitution and letter spacing are an adversarial-evasion class, and you have a human reviewing every asset before publication. A regex arms race against leetspeak is unwinnable and the false-positive cost is real (your stated reason is correct: an operator trained to disable the filter is worse than a filter with documented holes). The test-pinning is exactly right — it converts "unknown hole" into "known, monitored boundary."

One condition: **the bypass tests must fail loudly if the filter ever *accidentally catches* those strings** — otherwise a future "improvement" that over-matches will be pinned silently. And the licensor doc must say "first-pass automated filter with mandatory human review," not "content policy filter" full stop. If the email said the latter, you have a disclosure gap, not a code gap.

### 4. Retryable upload failure — **right call, one caveat**

Completing with a dangling `r2Key` is strictly worse — you've created a provenance record pointing at an object that doesn't exist, which is the exact lie this whole workstream exists to prevent. Retryable failure with the GPU artifact named in the error is correct. Caveat: **the local-disk path in the error must be machine-readable and the retry must re-resolve it** — if the error carries the path only in a human-readable message and the local file is cleaned by any tmp reaper before retry, the retry fails with a confusing "artifact missing" that will be misclassified. Test: fail upload, delete the local file, retry, and check the retry classification — if that comes back retryable, you have an infinite retry loop.

### 5. JSONB provenance — **satisfies the commitment, don't build the table**

"Durable record" requires immutability, retrievability, and asset-lifetime durability. A JSONB column on `media_assets` (which outlives jobs, per your own statement) gives you all three. A dedicated table buys you per-field indexing and schema enforcement you have no consumer for today — that's speculative generality with a migration cost on a database you can't safely migrate (local dev points at production — see below). The real risk to durability isn't JSONB vs. table; it's **whether anything can UPDATE the column**. JSONB is mutable by default. If `buildProvenance()` freezing the object is your only immutability guarantee, see the attack surface below — that's where the real defect is, not the storage format.

### 6. Caller-declared `commercial` flag — **the boundary is wrong, but not the way you think**

"No code can know how a video will eventually be used" is true and beside the point. The defect is that the flag is **declared at generation time by the caller**, when the decision point is **publication time by the publisher**. A video generated non-commercially and later put in a paid ad has provenance that *lies* — and the lie is attested, frozen, and JSONB-durable. The better boundary: the licence snapshot records "generated under licence terms X" (a fact about the provider relationship, knowable at generation time), and the commercial-use *gate* lives on the publish path, not the generate path. If MiniMax's licence tiers are generation-time, ignore this — but verify that in the actual licence, because it's the difference between your provenance being accurate and being decorative.

---

## Attack surface — concrete inputs to run

**`safeLeafName()` — namespace escape.** The canonical failures, in order of likelihood:
1. `artifactName = ".."` — passes most naive sanitizers that strip `/` but not bare dots; `renders/<jobId>/..` normalizes to `renders/` on some S3-compatible clients' presign logic, and R2's key handling of `.`/`..` segments differs from POSIX. Test the literal two-dot string, not just `../`.
2. `artifactName = "a/../../b"` — if the sanitizer strips `/` you get `a....b`, harmless; if it strips only `../` sequences non-recursively you get `a/b`, escaping one level. **Recursive-strip vs single-pass is the whole game here.**
3. Unicode: `artifactName = "\u202Erenders/admin/x.mp4"` (RTL override) — displays as a safe name in any UI while the key is not what it renders as. A phishing-grade defect in a review UI that shows keys to the human reviewer (and you have mandatory human review — the reviewer is your last line and you're feeding them spoofable text).
4. If `jobId` itself ever flows from the client (you say the key is "derived from the job, never the client" — verify the job record's ID is server-minted and not client-echoed anywhere in the key path), all of the above applies to `jobId` too.

**`checkRunAllowed()` — third path to unbounded ceiling.** You named malformed-cap (throws — good) and `null` cost (infinite — bad, and I'd call this a **major**: `null` is not "free," it's "unknown," and unknown cost on a billing provider should fail closed, full stop). The third paths to test:
- `cap = "50"` (string) — if compared with `>=` against a number, JS coerces; if parsed with `parseInt` without radix checking, `"50abc"` → 50 but `"abc"` → `NaN`, and **`NaN >= anything` is false**, which depending on which side of the comparison you wrote means *always allowed* or *always denied*. Test `"50abc"`, `"0x32"`, `""`.
- `cap = Infinity` — does your config schema reject it?
- Negative `cost` on the usage side: a refund/adjustment path writing a negative ledger entry buys back unlimited headroom. Test whether the ledger accepts negative deltas.

**`makeFileLedger()` corrupt-reads-as-zero — yes, exploitable, and you already know it.** Deliberate fail-open on bookkeeping is defensible for availability; it is *not* defensible as a cap, because the cap's threat model includes an actor who can write to the ledger file (anyone with disk access to the worker, which on a GPU box running arbitrary model pipelines is not a high bar). Truncating the file to `{` resets the day. Mitigation without failing closed on outages: on corrupt read, refuse **billing** providers, allow the free local provider. That preserves your "no outage from bookkeeping" property for the case that matters (local dev) and removes the exploit for the case that costs money.

**`buildProvenance()` frozen record — the freeze is almost certainly shallow.** `Object.freeze()` freezes the top level only. If the licence snapshot is a nested object (`{ provider: { licence: {...} } }`), the caller mutates `record.provider.licence.terms` after the fact and the frozen record lies. Test: deep-mutate one nested field post-freeze. Fix is a deep freeze or a structural clone with frozen sub-objects. **Severity: blocker if the licence snapshot is nested, because this is the licensor-facing attestation.** Also: frozen-in-memory says nothing about the JSONB column — is there anything (trigger, revoked UPDATE grant, app-level discipline) preventing an UPDATE on `media_assets.provenance`? App-level discipline is not a control; you found eight defects in your own app-level code today.

**`evaluatePrompt()` — naive phrasings yielding a synthetic minor.** The class you haven't closed is **age-ambiguous role nouns plus a body description**, no digits or spacing required:
- "a **schoolgirl** in gym class doing stretches" — contains no token on a minor-blocklist built around "child/kid/minor," and is the single most common naive phrasing in a *fitness* product (school sports content). If your list keys on "child" but not "schoolgirl/schoolboy/school kid/teen," this sails through. **Test this exact string.**
- "high school athlete, 17-year-old track star" — age stated *explicitly*, not obfuscated. A blocklist looking for obfuscation misses honest declaration.
- "my **daughter**'s first 5K, she's twelve" — relational nouns.
- "young gymnast" — "young" + a child-coded sport. This one is genuinely hard (young adult gymnasts exist) and is exactly the flag-don't-block case from Q2.
The pattern: your fixed nine were evasions; the un-fixed class is **honest child-adjacent vocabulary** (school-, teen, daughter/son, "year-old"). A regex over an enumerated minor lexicon will never close this class; it needs an age-mention detector (any `\d{1,2}[ -]year[ -]old` ≤ 17 → block) plus the flag gate from Q2 catching the residue. Test the four strings above; I predict at least two pass today.

**Retry classification.** The obvious misclassification to hunt: **upload failures after a *successful* policy-pass and spend-deduction**. Sequence: ledger records the spend, upload fails, job retries, ledger records the spend *again*. Does the retry re-charge? If spend is debited pre-render and the retry re-runs the render, a flaky R2 endpoint doubles your actual spend against the provider while the ledger shows one job. Test: fail the first upload, retry to completion, diff the ledger. Expected: one debit. Also verify `E_BAD_CAP` is truly permanent — if the cap is config and an operator fixes the config at 2pm, a permanently-failed job from 9am can never be retried; that's a permanent failure caused by a transient config state. Either `E_BAD_CAP` should be retryable or the retry path must re-validate config rather than trusting the recorded error class.

---

## The finding you didn't ask about

**Your dev environment points at production while an unrun migration exists.** Everything above is secondary to this. The first time any code path runs against prod with the old schema — a manual test, a curious colleague, a CI job with the wrong env file — you get either a silent `provenance` column miss (provenance written nowhere, licensor commitment void, *and no error*) or a hard failure on a production table. The JSONB write path failing silently is the nightmare version because it's indistinguishable from success. This is a **blocker on process, not code**: gate the environment, or add a startup schema assertion that refuses to boot if `media_assets.provenance` doesn't exist. An unrun migration plus a prod-pointing dev environment is a bomb with a random timer.

## Verdicts, compressed

| Decision | Verdict |
|---|---|
| Spend $0 / runs 50 | Defensible; but 50/day is a rate limit — say so to the licensor, and watch the UTC-midnight retry stampede |
| Flag real people | Insufficient unless the flag gates publication pending consent |
| Pinned bypasses | Defensible, given mandatory human review — conditional on honest licensor wording |
| Retryable upload failure | Correct |
| JSONB provenance | Fine; immutability enforcement is the real gap (shallow freeze + mutable column) |
| Caller `commercial` flag | Wrong boundary; move the commercial gate to publish, record licence facts at generate |

**Predicted blockers:** shallow `Object.freeze` on a nested licence snapshot; silent provenance loss from the unrun migration + prod-pointing dev. **Predicted majors:** `null`-cost-as-infinite, corrupt-ledger-as-zero for billing providers, naive minor vocabulary ("schoolgirl", explicit "17-year-old") passing the filter, double-debit on upload-retry.
