# Hostile review packet — video compliance controls + artifact path

**Reviewers:** Kimi K3, GLM-5.3, HY3, Opus 5 (self) · **Date:** 2026-08-16
**On main:** `c08ee7e2c`

You are reviewing code that backs **written commitments made to a licensor**. On 2026-08-16
a licensing request went to MiniMax stating SwanStudios has per-asset provenance,
spend/volume ceilings, and a content policy filter. Three of those were aspirational when
the email was sent. This work makes them true.

**Be hostile.** Assume the author is wrong. The author has already found eight defects in
his own work today, so the base rate of remaining defects is not zero.

---

## What to review

| File | Role |
|---|---|
| `shared/providers/video/provenance.mjs` | frozen per-asset record; licence snapshot |
| `shared/providers/video/spendGuard.mjs` | run/spend ceilings + local usage ledger |
| `shared/providers/video/promptPolicy.mjs` | content guardrail |
| `backend/services/videoRenderArtifactUpload.mjs` | presigned upload; key derivation |
| `backend/scripts/handlers/generateVideo.mjs` | the handler that composes all of it |
| `backend/migrations/20260816230000-add-media-asset-provenance.cjs` | **UNRUN** |

---

## Design decisions I want attacked

**1. Spend ceiling defaults to $0, run ceiling defaults to 50.**
The commitment said "an unconfigured cap denies rather than permits." Read literally that
would block the FREE local provider over money never spent. I split it: spend is
fail-closed at zero (a billing provider is denied until a number is set), volume is finite
but non-zero. *Is that a defensible reading, or did I weaken a stated commitment for
convenience?*

**2. The policy filter blocks minors/impersonation/deception but only FLAGS possible real
people.** Rationale: blocking every capitalised name in a personal-training product causes
constant false refusals and trains the operator to disable the filter. *Is flagging
sufficient for "no depiction of identifiable real people without consent"?*

**3. Known bypasses are pinned as passing tests.** Digit substitution ("ch1ld") and letter
spacing ("c h i l d") defeat the filter. I documented and test-pinned them rather than
attempting to close them, on the grounds that reliable de-obfuscation costs false
positives. *Is shipping a filter with documented holes acceptable when a human reviews
every asset before publication — or is this rationalising?*

**4. Upload failure fails the job RETRYABLY rather than completing with `uploaded:false`.**
The GPU work is preserved on local disk and named in the error. Alternative was completing
with an r2Key whose object does not exist. *Right call?*

**5. Provenance lives in `media_assets.provenance` (JSONB), not a dedicated table.**
Assets outlive jobs. *Does a JSONB blob satisfy "durable record", or does an auditable
commitment need a real schema?*

**6. The licence gate trusts the caller's declared `commercial` flag.**
No code can know how a video will eventually be used. *Is there a better boundary?*

---

## Specific attack surface

- `safeLeafName()` / `artifactObjectKey()` — the object key is derived from the job, never
  the client. **Find a filename that escapes the `renders/<jobId>/` namespace.**
- `checkRunAllowed()` — **find an input that yields an unbounded ceiling.** A malformed cap
  throws; `null` cost is treated as infinite; is there a third path?
- `makeFileLedger()` — reads a corrupt ledger as zero (fail-OPEN, deliberate: a bookkeeping
  problem should not become an outage). **Is that exploitable to defeat the cap?**
- `buildProvenance()` — the record is frozen. **Can a caller mutate it after the fact?**
- `evaluatePrompt()` — **find a NAIVE phrasing (not deliberate evasion) that still yields a
  synthetic minor.** That is the class that matters; nine were fixed today.
- `runGenerate()` retry classification — `E_POLICY_REFUSED` and `E_BAD_CAP` are permanent;
  run/spend caps are retryable because they expire at the UTC day boundary. **Is any code
  classified the wrong way?**

---

## What is NOT in scope

- The migration is written and **NOT RUN** (local dev points at production). Reviewing its
  safety is in scope; running it is the owner's decision.
- No video has ever been generated. The ComfyUI transport is proven only against a stub.
- `normalizeProviderResponse` has no production caller until a hosted adapter exists.

---

## Answer format

For each finding: **file:line · severity (blocker/major/minor) · the concrete failing
input or sequence · why it matters.** Prefer three real defects over twenty style notes.
If a design decision above is defensible, say so plainly rather than inventing a concern —
a false positive costs more than a silence here, because it displaces attention from the
real one.
