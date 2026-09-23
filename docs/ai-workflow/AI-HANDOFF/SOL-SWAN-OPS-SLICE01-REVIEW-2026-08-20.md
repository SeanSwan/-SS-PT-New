# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-2026-08-20.md
**Seed:** (none)
**Tokens:** 92767 in / 51602 out · **Cost:** ~$1.0059 · **Wall:** 398.7s

---

## PASS 1 — CORRECTNESS

### P1-1 — HIGH; exploit cost: trivial — A truncated or nearly empty report publishes

**File:** `lib/Publish.ps1`  
**Anchor:** `Ok = ($reasons.Count -eq 0)`

The gate validates only four assertions, not report completeness. A file containing only:

```text
RUN_VERDICT: VALID
CONTROL_POSITIVE: PASS
CONTROL_NEGATIVE: PASS
INJECTION_OBSERVED: NO
```

passes. So does a report truncated immediately after those lines.

This directly contradicts the gate’s claim that truncation no longer publishes. Because the mandatory block is at the beginning, ordinary truncation is especially likely to preserve the passing block while losing the actual report. The existing healthy test is also far too weak: it proves no required sections, evidence, sources, or meaningful body exist.

**Fix:** Treat completion separately from the opening metadata. Require successful process exit, required headings, a sensible minimum and maximum size, and preferably a completion marker written last after the report is finalized. Better still, have the agent write a temporary file and let the launcher validate and copy it only after completion.

---

### P1-2 — HIGH; exploit cost: trivial — Absence of the required block can still publish

**File:** `lib/Publish.ps1`  
**Anchor:**

```powershell
$m = [regex]::Matches($text, "(?im)^\s*$name\s*:\s*([A-Z_]+)\s*$")
```

The implementation searches the entire report independently for each field. It does not require:

- the first four lines;
- a contiguous block;
- field order;
- exact capitalization;
- only the documented outward-action exception above it.

This concrete input has no four-line verdict block but passes:

```text
# Report
RUN_VERDICT: VALID
## Bottom line
CONTROL_POSITIVE: PASS
## The competitive set
CONTROL_NEGATIVE: PASS
## Sources
INJECTION_OBSERVED: NO
```

Therefore the documented assertion that a missing block fails closed is false. A hostile page quote or ordinary body text can supply the missing fields.

The test suite actually blesses part of this mismatch with `lowercase values` and `disclosure line above block`, despite the prompt requiring `same spelling` and placement at the top.

**Fix:** Parse an exact, bounded header rather than running four whole-file regex searches. Normalize only CRLF versus LF. Require the four lines contiguously and in order, with only a narrowly parsed outward-action line allowed before them. Use `[ \t]*` rather than `\s*`, because `\s` also consumes line breaks.

---

### P1-3 — HIGH; exploit cost: trivial — The launcher reports success based on stale destination state

**File:** `Swan-Ops.ps1`  
**Anchors:**

```powershell
$landed = Publish-Report -ProducedPath $producedPath -ReportPath $reportPath -QuarantineDir $QuarantineDir
```

and:

```powershell
if (Test-Path $reportPath) {
```

The outcome branch ignores what `Publish-Report` actually did.

Concrete failures:

1. `$reportPath` already exists from an earlier run and `$producedPath` does not exist. `Publish-Report` returns null, but the launcher enters `DONE` and returns true.
2. `$reportPath` already exists, while the new produced report fails the gate and is quarantined. The launcher still enters `DONE` before reaching the quarantine branch.
3. If the existing path is a directory, `Test-Path` succeeds and the subsequent `.Length` access can fail under StrictMode.

This is exactly the second-run/stale-state failure the review remit warned about.

**Fix:** Return a typed result with an explicit status and switch on that status. Do not infer this run’s result from destination existence. On publication, verify that the returned destination is the expected path and that it is a regular file created by this invocation.

---

### P1-4 — HIGH; exploit cost: trivial or accidental — Exit status and file freshness are ignored

**File:** `Swan-Ops.ps1`  
**Anchor:**

```powershell
$exit = $LASTEXITCODE
```

`$exit` affects only the final no-report display. A process can write the passing four lines, fail halfway through the body, exit nonzero, and still publish. That compounds P1-1.

There is also no shown pre-run removal of `$producedPath`, creation-time check, nonce, or freshness check. Any stale passing file left after an interrupted earlier invocation can be treated as this run’s product.

**Fix:** Require exit code zero for publication. Remove or reject an existing produced path before launching. Give each run a unique, unpredictable staging path and require that the file be created during the current invocation.

---

### P1-5 — HIGH; exploit cost: cheap — Unbounded files and tokens can exhaust memory or hang the console

**File:** `lib/Publish.ps1`  
**Anchors:**

```powershell
$bytes = [System.IO.File]::ReadAllBytes($Path)
```

and:

```powershell
([A-Z_]+)
```

The implementation reads and decodes the entire report, then scans it five times. There is no size limit.

A captured agent can create a very large file or a single enormous uppercase field value. The latter is captured, converted with `ToUpperInvariant`, copied into `$reasons`, written into the sidecar, and printed through `Write-Host`. This creates several large allocations plus potentially enormous console output.

The comment saying `Never throws` is false. Only `ReadAllBytes` is inside the `try`; decoding, replacement, regex matching, allocations, and reason construction are not protected. An out-of-memory failure may terminate the process rather than produce quarantine.

**Fix:** Enforce a small report-size ceiling before reading. Parse only a bounded header for verdict fields. If the body marker remains, scan with a streaming reader under the same total-size ceiling. Match explicit allowed values rather than unbounded `[A-Z_]+`.

---

### P1-6 — MEDIUM; exploit cost: ordinary filesystem conditions — Move and sidecar failures escape every outcome branch

**File:** `lib/Publish.ps1`  
**Anchors:**

```powershell
Move-Item -LiteralPath $ProducedPath -Destination $ReportPath -Force
```

```powershell
Move-Item -LiteralPath $ProducedPath -Destination $dest -Force
```

```powershell
Set-Content -Path "$dest.QUARANTINE.txt" -Value $note -Encoding UTF8
```

With `$ErrorActionPreference='Stop'`, a locked destination, ACL denial, disk-full condition, destination directory collision, antivirus race, or cross-volume failure terminates the launcher before any of the three displayed outcome branches.

There is also a partial-failure state: the report can be successfully moved to quarantine and then sidecar creation can fail. The function throws after altering state, and the operator receives neither the intended quarantine branch nor a reliable note.

`Set-Content` uses `-Path`, not `-LiteralPath`. A project or report path containing wildcard characters can fail or target a different existing path.

**Fix:** Wrap the complete publish/quarantine transaction in error handling. Return an explicit failure status containing the source and destination state. Use `-LiteralPath` wherever available. Write the note to a temporary literal path before committing the report, then rename atomically where possible.

---

### P1-7 — MEDIUM; exploit cost: zero-byte operator file — `Get-HandlesBlock` can call a method on null

**File:** `lib/Handles.ps1`  
**Anchor:**

```powershell
(Get-Content -Path $handlesFile -Raw -Encoding UTF8).Trim()
```

On Windows PowerShell 5.1, an empty file can yield no object from `Get-Content`, making the parenthesized expression null. Calling `.Trim()` then fails instead of taking the documented safe-default branch. The acceptance test covers whitespace-only content but not a zero-byte `handles.txt`.

The root path can also contain wildcard characters: existence is checked with `-LiteralPath`, but reading switches back to `-Path`.

**Fix:** Read with `[System.IO.File]::ReadAllText`, or assign first and explicitly handle null before calling `.Trim()`. Use literal-path semantics consistently. Add a zero-byte test.

This extraction has not been demonstrated behavior-preserving: the tests establish three current behaviors, not equivalence to the removed implementation.

---

### P1-8 — MEDIUM; exploit cost: accidental encoding drift — BOM handling is fail-closed but not encoding-robust or exact

**File:** `lib/Publish.ps1`  
**Anchor:**

```powershell
$text = $text -replace ([char]0xFEFF), ''
```

Problems:

- UTF-16 without a BOM is decoded as UTF-8 and quarantined.
- UTF-32LE begins with the UTF-16LE BOM prefix and is misidentified as UTF-16LE.
- Global removal of every U+FEFF normalizes non-ASCII content inside field names and values into accepted ASCII. That contradicts the exact ASCII contract.
- Invalid UTF-8 is silently replacement-decoded rather than rejected.

CRLF itself is handled correctly because the trailing `\s*` consumes the carriage return. That does not justify using `\s` for the whole parser.

These are predominantly false-negative/contract-consistency failures rather than useful publication bypasses. The claim that ASCII matching makes encoding concerns disappear is too broad.

**Fix:** Support an explicit finite encoding set, remove only an actual leading BOM, reject malformed decoding, and reject non-ASCII bytes in the bounded verdict header. Add BOMless UTF-8, BOMless UTF-16 rejection, UTF-32, malformed UTF-8, and embedded-U+FEFF tests.

---

### P1-9 — LOW; exploit cost: none — The acceptance test does not prove where files land

**File:** `tests/test-publish-gate.ps1`  
**Anchor:**

```powershell
$got = if (-not $landed) { 'NOTHING' }
       elseif ($landed -like "$Qua*") { 'QUARANTINE' }
       else { 'PUBLISH' }
```

The classification trusts the function’s returned string. It does not assert that:

- the source disappeared;
- the expected destination exists;
- the destination contains the original bytes;
- the sidecar exists;
- a published file is absent after quarantine;
- move failures produce a controlled result.

The later file counts are printed but not asserted. Thus the README’s routing evidence is weaker than represented.

Missing cases include pre-existing report paths, pre-existing quarantine paths, no produced file, nonzero agent exit, zero-byte handles, move failure, sidecar failure, huge input, body-scattered fields, four-line-only truncation, and repeated filenames.

**Fix:** Assert filesystem state and content for every case, and add launcher-level tests rather than only function-return tests.

---

### Function-output and StrictMode assessment

There is no current success-stream pollution in the normal `Publish-Report` paths: `Move-Item` without `-PassThru` does not normally emit an item, and `Write-Host` does not become success output. `$verdict.Ok` and `$verdict.Reasons` are valid hashtable adapter accesses on the current return paths.

That does not make the API robust. `$landed` is an untyped truthiness protocol, and any future unsuppressed success output would turn it into an array and corrupt launcher control flow. An explicit result object is warranted.

The concrete null/StrictMode bug is in `Get-HandlesBlock`, and the stale-directory branch can also lead to invalid property access.

---

## PASS 2 — SECURITY

### P2-1 — CRITICAL; exploit cost: zero once the agent is captured — The attacker simply writes the passing assertions

**Files:** `jobs/market-recon.md`, `lib/Publish.ps1`  
**Accepted block:**

```text
RUN_VERDICT: VALID
CONTROL_POSITIVE: PASS
CONTROL_NEGATIVE: PASS
INJECTION_OBSERVED: NO
```

Under the required threat model, the attacker already controls the component producing both the report and its verdict. It does not need an encoding trick, race, regex exploit, or missing-block bypass. It writes the accepted fields and any fabricated body it wants.

The controls are not independently rerun, no evidence artifacts are checked, and injection observation is not derived from browser captures or logs. The body scan catches only voluntary use of `INJECTION ATTEMPT OBSERVED`; a captured agent omits that text.

The author’s narrow risk assessment in `lib/Publish.ps1` is substantially honest: this can route honest self-reported failures and some accidents, but cannot constrain a captured agent. However, claiming this closes the publication-control finding is not justified unless that finding is explicitly narrowed to accidental omission. It does not close fabricated-report publication.

**Fix:** Do not treat model self-attestation as a security verdict. Independent launcher-controlled checks must consume trusted run artifacts, process status, control results, and provenance. Even those checks do not replace OPEN-1.

---

### P2-2 — CRITICAL; exploit cost: trivial after injection — OPEN-
