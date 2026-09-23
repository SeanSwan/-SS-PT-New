# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-2026-08-20.md
**Seed:** (none)
**Tokens:** 10751 in / 4709 out | **Cost:** ~$0.1029 | **Wall:** 86.1s | **finish_reason:** stop

---

# HOSTILE REVIEW — swan-ops Slice 0+1

## PASS 1 — CORRECTNESS

### F1 (HIGH, cheap to trigger): `Get-HandlesBlock` crashes on a 0-byte `handles.txt` — StrictMode/null method call
`lib/Handles.ps1`: `(Get-Content -Path $handlesFile -Raw -Encoding UTF8).Trim()`

On PS 5.1, `Get-Content -Raw` on a **truly empty (0-byte) file returns `$null`**, not `''`. `.Trim()` on `$null` throws "You cannot call a method on a null-valued expression" — and with `$ErrorActionPreference='Stop'` the launcher dies before dispatch. The test suite covers *whitespace-only* (`"   `n  "`) but never a 0-byte file, which is exactly what `New-Item handles.txt` or an emptied editor buffer produces. The header promises "Empty is a safe default" — it isn't; only *whitespace* is.
**Fix:** `$raw = Get-Content ... -Raw -Encoding UTF8; $handles = if ($raw) { $raw.Trim() } else { '' }`. Add a 0-byte test case.

### F2 (HIGH correctness, needs filename reuse): launcher branches on `Test-Path $reportPath`, not on what the gate actually did
`Swan-Ops.ps1`: after `Publish-Report`, the first branch is `if (Test-Path $reportPath)`. If a **stale report from a previous run already sits at `$reportPath`** (rerun with the same `$reportName`, or an operator manually restoring a file), and the current run is quarantined or produces nothing, the launcher prints `DONE`, runs `Test-ReportLinks` on the *stale* file, and **returns `$true`** — the exact "shipped the grade unread" failure this slice exists to kill, one directory level up. The gate's verdict is never consulted in the success branch.
**Fix:** branch on `$landed -eq $reportPath` (and `$landed` non-null), not on path existence.

### F3 (MEDIUM): `Publish-Report` *can* throw — `Move-Item` under `$ErrorActionPreference='Stop'`
`Test-ReportVerdict` honors "Never throws", but `Publish-Report` does not. `Move-Item` on a file still locked by a dying codex process, or an AV scan, raises a terminating error under EAP=Stop. Result: unhandled launcher crash, report stranded in `sandbox\reports\`, **no quarantine note, no console verdict** — the worst UX branch, and it bypasses the "loud, next to the file" design entirely. Same for the quarantine-side `Move-Item` and `Set-Content`.
**Fix:** wrap both moves in try/catch; on publish-move failure, treat as quarantine; on quarantine-move failure, emit the note next to `$ProducedPath` instead.

### F4 (MEDIUM): case-sensitivity inconsistency between the two injection checks
Field regex is `(?im)` — case-insensitive. The body scan `$text -match 'INJECTION ATTEMPT OBSERVED'` is **case-sensitive**. An agent (or a page quote) writing `Injection attempt observed` trips neither the body scan nor, if the header lies `NO`, anything else. The two layers disagree about what the same signal looks like.
**Fix:** `(?i)` on the body scan, or normalize.

### F5 (LOW): quarantine overwrite destroys prior evidence
`$dest = Join-Path $QuarantineDir (Split-Path -Leaf $ReportPath)` + `Move-Item -Force`: a second quarantined run with the same report name **overwrites the first quarantined report and its `.QUARANTINE.txt`**. Quarantine is forensic evidence of a possible injection; silent overwrite is the wrong default there even if it's right for publish.
**Fix:** suffix a timestamp in the quarantine path.

### F6 (LOW): whole-file `ReadAllBytes` + regex on unbounded input
Fine for real reports; a multi-GB stray file in `sandbox\reports\` (agent writes the wrong thing — which is the entire premise of this gate) is loaded fully into memory. Stream the first N KB plus a bounded tail; the verdict block is mandated at the top.

### What I checked and could *not* break
CRLF handling (`\s*$` under `(?m)`), UTF-8/UTF-16LE/BE BOM sniffing, the global U+FEFF strip, duplicate-detection failing closed, output-stream pollution (`New-Item | Out-Null`, `Write-Host` is host-only), hashtable dot-access under StrictMode (keys always present). The deviation from the broken work order (grep for strings the agent never emits) was **unambiguously correct** — following it verbatim would have shipped a gate that matches nothing, i.e., fail-closed on *every* run, which is safe but useless.

## PASS 2 — SECURITY

### F7 (HIGH severity, *cheapest* exploit in the packet): trivial, permanent DoS — and §5 hands the attacker the recipe
The prompt *requires* the agent to record injections verbatim as `INJECTION ATTEMPT OBSERVED: <url> — <quote>`, and the gate quarantines on that string **anywhere in the body**, and quarantines on `INJECTION_OBSERVED: YES`, and quarantines on any duplicate verdict line. So a $5 Meta ad containing the literal text `INJECTION ATTEMPT OBSERVED` — or a line reading `RUN_VERDICT: VOID` — guarantees every run that reads it is quarantined, forever, with zero sophistication. §5's table documents the exact tripwires. The author built a gate where **the honest handling of an attack and the attack itself produce the same outcome**, which means an attacker can suppress all recon output at will. That is a new, attacker-reachable lever this slice *created*.
**Fix:** distinguish "injection observed and handled" (publishable, flagged) from "injection complied with" (quarantine) — e.g., only the `INJECTION_OBSERVED: YES` *field* quarantines, and the body scan requires the string *outside* backtick-quoted evidence. This is a design change, not a one-liner — but as shipped, the body scan + verbatim-quote mandate is self-defeating.

### F8 (the known hole, correctly scoped): a captured agent writes `RUN_VERDICT: VALID` and publishes
The gate reads self-reported tokens; a successfully injected agent emits `VALID/PASS/PASS/NO` over a fabricated report and ships. The author's own header says exactly this ("It cannot make a captured agent honest… OPEN-1 … remains the only control that constrains a captured agent"). **The scope claim is honest and accurate** — this gate stops omission, negligence, truncation, and honest failure reporting. It does not close OPEN-4 against a captured agent, and nothing in the README claims it does. I agree with the author's self-assessment; the slice was worth building.

### F9: README/freeze honesty
The freeze is **not theatre** — attended runs and credential-free machines genuinely reduce OPEN-1's blast radius, and the README says so in those terms ("The freeze is not a fix"). The enforced-constraints row "A report is published only if the run passed its own checks" slightly overstates (it should read "only if the run *reports* passing its own checks"), but the Publish.ps1 header discloses the limitation plainly, so the packet as a whole is honest. The one dishonesty-by-omission: the freeze's expiry condition (observed egress refusal) is good, but nothing in the freeze stops an *attended* run on a machine holding the operator's *personal* `~/.ssh` — "no production credentials" is narrower than "no credentials".

### New attack surface
Minimal. Quarantine dir is operator-pathed; no new parser of attacker content beyond the report the pipeline already moved blindly. Net security posture: improved against negligence, **worsened against cheap DoS** (F7), unchanged against capture.

## Should these slices have been built?
Slice 1: yes, but it is **not done** — F1, F2, F3 are ship-blockers for a file whose entire purpose is failing closed gracefully, and F7 means the gate as specified punishes honest injection reporting. Slice 0 (freeze): yes, correctly framed.

**REVISE**
