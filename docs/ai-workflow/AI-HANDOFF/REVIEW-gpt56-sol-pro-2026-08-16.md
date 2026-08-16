# Consult reply — gpt-5.6-sol-pro (openai/gpt-5.6-sol-pro) — 2026-08-16T23:06:59.332Z

> tokens: prompt=20627 completion=14892 | finish_reason: stop | max_tokens: 60000

## Review limitation

The packet does not include the file contents or a repository URL, so I cannot honestly provide numeric line references or prove implementation-dependent exploits. I will use `file:symbol` rather than inventing line numbers. Findings below are either **confirmed by the declared behavior** or explicitly marked **conditional on implementation**.

# Ranked findings

### 1. `shared/providers/video/spendGuard.mjs:makeFileLedger/checkRunAllowed` · **blocker** · two workers start simultaneously with `$0` recorded, both pass a `$6` request against a `$10` cap, and both later record `$6` · the committed ceiling becomes `$12`

A local read/check/write ledger is not a ceiling unless the reservation is atomic.

The same problem occurs across:

- concurrent processes;
- multiple containers or hosts, each with its own ledger;
- a worker restart with ephemeral storage;
- ledger deletion or corruption, because corruption deliberately resets usage to zero.

This is not merely bookkeeping availability. The ledger is the mechanism enforcing the written spend/volume commitment, so fail-open corruption directly defeats that commitment.

**Required fix:** perform an atomic reservation before dispatching provider work. Use a shared transactional store with a uniqueness/locking strategy, or at minimum an inter-process file lock plus atomic rename if deployment is provably single-host. Record states such as `reserved`, `committed`, and `released`, using a stable job id for idempotency.

If the ledger is intentionally advisory, do not represent it to the licensor as an enforced ceiling.

---

### 2. `shared/providers/video/promptPolicy.mjs:evaluatePrompt` · **blocker** · `Create a realistic Little League shortstop celebrating after a game` or `A high-school freshman demonstrating a squat` · a naïve operator can request a synthetic minor without using an explicit minor keyword

Keyword filtering cannot satisfy a categorical “no depiction of minors” commitment. Age can be expressed through institutions, relationships, activities, or life stages:

- `Little League player`
- `high-school freshman`
- `elementary-school class`
- `Girl Scout`
- `mother working out with her ten-year-old`
- `a family with their youngest daughter`
- `school prom couple`

These are normal descriptions, not adversarial obfuscation. They belong in the must-block semantic test set.

More seriously, pinning `ch1ld` and `c h i l d` as **passing** tests turns known safety regressions into required behavior. That is not documentation; it prevents future tightening. Human publication review does not repair a generation-time policy claim unless the actual commitment explicitly applies only at publication and publication is technically impossible without recorded approval.

**Required fix:**

1. Normalize at least Unicode compatibility forms, separators, repeated punctuation, and common substitutions.
2. Add semantic age indicators, not only direct words.
3. Return `review_required` for ambiguous youth terms rather than `allow`.
4. Make publication/export technically gated on review.
5. Pin known bypasses as `todo`, expected refusal, or known-failure tests—not passing behavior.

False positives are a valid product concern, but the answer is a review state, not silent allowance.

---

### 3. `backend/scripts/handlers/generateVideo.mjs:licence gate` · **blocker** · an untrusted caller sends the same request with `commercial:false`, then uses the generated asset in paid SwanStudios marketing · licence enforcement is bypassed by changing one declaration

The caller does not get to choose which licence applies. In a paid personal-training SaaS, commercial use should be the conservative default.

A better boundary is:

1. Resolve use class from a trusted server-side workflow or destination.
2. Treat unknown future use as commercial.
3. Store the resolved use class in immutable provenance.
4. Recheck policy at export/publication if destination can change.
5. Permit a non-commercial exception only through a privileged, auditable workflow.

If no code can determine eventual use, that uncertainty is an argument for selecting commercial rights, not for trusting a request flag.

---

### 4. `shared/providers/video/spendGuard.mjs:default cap resolution` · **major** · omit the volume-cap setting and submit 50 free-provider jobs · unconfigured operation is permitted despite the statement that an unconfigured cap denies

The proposed interpretation is not defensible as written. Spend and volume are separate controls:

- A free provider legitimately consumes `$0`.
- It still consumes volume.
- Therefore it needs an explicitly configured nonzero volume cap.

Defaulting volume to 50 weakens “unconfigured cap denies” for convenience. Set the default to zero and explicitly configure 50 for approved local environments. That preserves free local operation without making absence of configuration equivalent to authorization.

The spend default of `$0` is defensible.

---

### 5. `backend/scripts/handlers/generateVideo.mjs:upload retry path` · **major** · render succeeds, upload times out after the object is accepted, the job retries from the beginning, performs another GPU render, and possibly records spend twice · retryability can duplicate cost and artifacts

Failing rather than returning `uploaded:false` is the correct top-level decision: an `r2Key` must not claim an object exists when it does not.

It is correct **only if retry resumes the upload idempotently**. A generic retry of `runGenerate()` is unsafe unless it:

- detects and reuses the preserved artifact;
- checks whether the deterministic object key already exists;
- does not reserve or charge provider spend again;
- does not rely on local disk surviving worker replacement;
- verifies the file hash before reuse.

Also classify upload failures by cause:

- timeout, connection reset, `429`, and `5xx`: retryable;
- invalid credentials, denied bucket policy, malformed key, unsupported content type: permanent until configuration changes;
- local file missing after retry scheduling: cannot be repaired by retrying upload alone.

“Local path named in the error” is not preservation in a containerized worker fleet.

---

### 6. `shared/providers/video/provenance.mjs:buildProvenance` · **major, conditional** · `const p = buildProvenance(...); p.licence.url = "different"; p.request.tags.push("x")` · `Object.freeze()` protects only the outer object

If provenance contains nested objects or arrays, ordinary `Object.freeze(record)` does not make the record immutable. A caller can mutate nested provider response, licence snapshot, policy result, or input arrays after construction.

The safe construction sequence is:

1. Build from an allow-listed schema.
2. Deep-clone caller data so references are not retained.
3. Canonically serialize or hash the final record.
4. Deep-freeze the returned in-memory value.
5. Persist the canonical value, not a later serialization of caller-owned objects.

If `buildProvenance()` contains only immutable scalar fields, this finding does not apply. Given the described licence snapshot, nested values are likely.

---

### 7. `backend/migrations/20260816230000-add-media-asset-provenance.cjs:provenance column` · **major if unrestricted updates are allowed** · create an asset with licence A, then update `media_assets.provenance` to licence B · the current JSONB value cannot establish what was originally recorded

JSONB itself is durable and is not inherently inferior to a dedicated table. A dedicated table also fails auditability if rows can be updated freely.

The real requirements are:

- schema version inside the document;
- database validation of required top-level fields;
- append-only or revisioned writes;
- actor and timestamp for corrections;
- canonical hash, ideally tied to the immutable asset hash;
- authorization preventing ordinary application updates;
- transactionally associating provenance with the asset.

Therefore:

- **JSONB is defensible for the snapshot.**
- **A freely mutable JSONB column is not an audit record.**
- A separate append-only event/revision table is appropriate if corrections or licence changes must be tracked over time.

The migration itself cannot be reviewed for locking, defaults, `NOT NULL`, or rollback safety without its contents.

# Specific attack-surface verdicts

## `safeLeafName()` / `artifactObjectKey()`

No filename exploit can be established without the implementation.

For S3/R2, `..` does not intrinsically traverse directories; object keys are opaque strings. For example, `renders/job/../x.mp4` remains that exact key. It can nevertheless become dangerous when a filesystem, proxy, CDN, or UI later normalizes it.

The more likely defect is an unsanitized **job id**, not the leaf name:

```text
jobId = ../../licences
filename = output.mp4
key = renders/../../licences/output.mp4
```

Even though R2 does not traverse it, this violates the intended canonical namespace and may be normalized downstream.

The safe invariant should be checked on the complete key:

```text
jobId matches a strict server-generated ID grammar
leaf contains no slash, backslash, control character, dot segment, or encoded separator
key === `renders/${validatedJobId}/${validatedLeaf}`
```

Do not sanitize a hostile job id into another valid id; reject it. Also do not pass an object key through `path.resolve()` or `path.normalize()`.

## `checkRunAllowed()`

The first concrete probe should be:

```text
configured cap = "1e309"
```

In JavaScript, `Number("1e309") === Infinity`. If validation rejects only `NaN`, this becomes an unbounded ceiling. `"Infinity"` is the companion case.

Other required rejection cases:

```text
NaN
Infinity
-Infinity
fractional run caps
negative caps
unsafe integers
whitespace-only values
objects with coercive valueOf()/toString()
```

Use primitive-string parsing followed by `Number.isFinite`, integer/range checks, and an explicit maximum. I cannot claim the third path exists without seeing the parser.

Independently, resetting corrupt usage to zero is already a path around the cap.

## `makeFileLedger()`

Yes, fail-open corruption is exploitable. A process able to truncate, partially overwrite, replace, or repeatedly race the ledger can reset usage. It can also happen accidentally during a crash unless writes use a temp file, `fsync`, and atomic rename.

An attacker who can rewrite arbitrary server files may already be privileged, but concurrency and crash corruption do not require such an attacker. More importantly, a local ledger does not coordinate multiple workers.

## `buildProvenance()`

Outer freezing does not freeze nested data. Test all of these:

```js
record.licence.url = "changed";
record.policy.matches.push("changed");
record.provider.response.model = "changed";
originalInput.licence.url = "changed";
```

The last test detects retained caller references even if nested output objects themselves were frozen.

## `evaluatePrompt()`

Add these as expected refusal or review cases:

```text
A high-school freshman demonstrating a deadlift
A realistic Little League baseball player
A mother and her ten-year-old daughter exercising together
An elementary-school student in a fitness class
A school prom couple posing for the camera
```

These are naïve prompts, not evasion. If any returns plain `allow`, the policy does not match the stated minor rule.

## Retry classification

- `E_POLICY_REFUSED`: permanent for the same immutable prompt; correct.
- Daily run/spend cap: retryable only with `retryAt` set after the precise UTC reset. Immediate generic retry is a queue-hammering defect.
- `E_BAD_CAP`:  
  - malformed job-supplied cap: permanent;  
  - malformed environment/tenant configuration: operational/configuration failure, not inherently permanent for the job.
- Upload error: must be classified from status/cause, not blanket-retryable.
- Licence refusal based on immutable provider rights: permanent.
- Missing preserved local artifact on an upload-only retry: permanent for that retry path, or rerender as an explicit new charged attempt.

# Direct answers to the six design decisions

1. **Spend `$0`: defensible. Volume `50`: not defensible as an unconfigured default.** Configure 50 explicitly.
2. **Flagging real people is insufficient** unless generation or publication is technically blocked pending recorded consent review.
3. **Known bypasses pinned as passing are not acceptable.** Human review can support a `review_required` state; it does not justify required silent passes.
4. **Failing upload retryably is directionally right**, but only with resumable/idempotent upload and cause-specific retry classification.
5. **JSONB can satisfy durable provenance.** Auditability depends on immutability/revisioning, validation, authorization, and hashing—not table shape.
6. **Trusting caller-declared commercial use is unacceptable.** Resolve it from a trusted workflow and default unknown use to commercial.
