# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-2026-08-20.md
**Tokens:** 10784 in / 31106 out (reasoning: 26890) | total 41890
**Wall:** 450.8s

---

# Hostile review — swan-ops Slice 0 + Slice 1 (seat: reviewer 4 of 4)

Preliminary note on method: everything below was derived only from the seven files and the "Verified facts" block in this packet. Where a claim depends on code I cannot see (`$reportName` construction, `Test-ReportLinks`, `lib\Console.ps1`, `lib\BrowserPolicy.ps1`, the codex args), I say so rather than guessing. All quoted strings are single-line fragments copied from the packet; none are reconstructed from memory.

I verified by enumeration, not by trusting the comments: the "fails closed on absence" claim is **true**. `Ok = ($reasons.Count -eq 0)` requires all four fields to each match exactly once with allowed values *and* the body scan to be clean; absence produces four `missing` reasons; no return path publishes without the four matches. The publish `Move-Item` is sequenced strictly after the verdict. There is no branch where a malformed or absent block publishes. That claim survives hostile reading.

---

## PASS 1 — CORRECTNESS

### P1-1 (HIGH severity, cost depends on one unseen variable) — The DONE branch tests disk state, not the gate's verdict
**File:** `Swan-Ops.ps1`, outcome block. **Evidence:** `if (Test-Path $reportPath) {` precedes `if ($landed) {`.

The branch order means "this run published" is inferred from *destination file existence*, not from `$landed -eq $ReportPath`. Two concrete wrong behaviors:

1. `$reportPath` already exists from an earlier run, and this run produces **nothing**: `Publish-Report` returns `$null`, `Test-Path $reportPath` is `$true` → console prints `DONE`, runs `Test-ReportLinks -Path $reportPath` on the *stale* file, `return $true`. A no-output run is reported as success.
2. Same pre-existing `$reportPath`, and this run **quarantines**: the new report is moved to quarantine and the sidecar is written — and then branch 1 fires anyway: `DONE`, `return $true`. The quarantine note exists on disk while the console asserts the run passed. This is precisely the failure class Slice 1 exists to kill: a machine-readable outcome that lies.

Reachability hinges entirely on whether `REPORT_FILENAME` is unique per run. The launcher has a `RUN_TS` token, which suggests it is — but the construction of `$reportName` is not in the packet, so I cannot confirm. Even if currently unreachable, this is one refactor away from a silent lie, and the fix is one line: gate the DONE branch on `$landed -and ($landed -eq $ReportPath)`. The quarantine branch testing truthiness of `$landed` is fine; the first branch is the defect.

### P1-2 (MEDIUM, cheap on Windows) — Unhandled exceptions inside `Publish-Report` after the verdict
**File:** `lib/Publish.ps1`. **Evidence:** `Move-Item -LiteralPath $ProducedPath -Destination $ReportPath -Force` and `Move-Item -LiteralPath $ProducedPath -Destination $dest -Force` — neither wrapped.

`$ErrorActionPreference` is restored to `Stop` in the `finally` *before* `Publish-Report` is called (correct for the verdict logic, fatal for the moves). A destination locked by a viewer, a read-only stale `$reportPath`, or an AV scan lock on the freshly-written sandbox file throws a terminating error with no `try/catch` in the launcher's shown region: no branch output, no quarantine, stack trace, script dies. `Test-ReportVerdict` promises and mostly delivers "Never throws"; `Publish-Report` makes no such promise and doesn't deserve one. Failure direction is closed (nothing published on a failed move), but the operator gets a crash instead of a branch. Wrap the moves; treat a failed move as its own "could not publish" outcome.

### P1-3 (MEDIUM, trivial to trigger) — A zero-byte `jobs\handles.txt` crashes the launcher
**File:** `lib/Handles.ps1`. **Evidence:** `(Get-Content -Path $handlesFile -Raw -Encoding UTF8).Trim()`.

On Windows PowerShell 5.1, `Get-Content -Raw` on a 0-byte file produces no output — `$null` — and calling `.Trim()` on `$null` is a terminating error under `EAP='Stop'`. The launcher dies before the menu. The test suite covers absent file, whitespace-only file, and populated file, but never the empty file — the one state an operator's editor most plausibly creates. Repro: `New-Item -ItemType File` at `jobs\handles.txt`, then run the launcher. Fix: capture `$raw`, test it, trim only when non-null. The header claims `Behaviour is unchanged - this is a move, not a redesign` — if the original inline code had the same `.Trim()`, the bug is inherited, not introduced; the packet doesn't show the old code, so I can't distinguish. Either way it's live now. (Minor sibling: `Test-Path -LiteralPath $handlesFile` then `Get-Content -Path` — LiteralPath/Path inconsistency on bracketed install paths.)

### P1-4 (LOW-MEDIUM) — Quarantine collisions destroy prior evidence
**File:** `lib/Publish.ps1`. **Evidence:** `Move-Item -LiteralPath $ProducedPath -Destination $dest -Force` followed by `Set-Content -Path "$dest.QUARANTINE.txt"`.

Two quarantines with the same leaf name: the second `-Force` move overwrites the first held report, and `Set-Content` overwrites the first sidecar. The incidents you most want preserved — repeated bad runs — are exactly the ones silently destroyed. Fix: append the run timestamp to the quarantine leaf name.

### P1-5 (LOW) — No size bound on the read
**File:** `lib/Publish.ps1`. **Evidence:** `[System.IO.File]::ReadAllBytes($Path)`.

A multi-gigabyte "report" becomes a byte array plus a decoded string plus full-text `[regex]::Matches` in a 32-bit-process-prone shell. Outcome is a crash before any move — fail-closed but ungraceful. Since the contract places the block at the top of the file, reading only the first N KiB would bound memory *and* fix S2-1 below.

### P1-6 (LOW, safe direction) — False-positive traps the prompt itself baited
The duplicate rule counts matches over the **whole text** while the doc comment says the block is `the first four lines of every report`. Two honest-run traps follow:

- §5 itself prints the four lines **twice** — once in the standalone fenced block, once inside the `Structure:` template. An agent that copies the structure template faithfully duplicates the block and earns `appears 2 times - ambiguous verdict`. The prompt supplies the duplicate bait.
- §7's instruction to record injections verbatim, combined with FILE 7's `INJECTION ATTEMPT OBSERVED: <source URL>` format, means any honestly-recorded injection trips the body scan — which is by design — but so does honest *prose* echoing the phrase while the header honestly says NO.

All of these quarantine rather than publish; they cost availability, not integrity. See S2-1 for the fix (scan only the head of the file), which is the same fix.

### P1-7 (INFO) — Verified-sound items, for the record
- BOM/decode ladder: FF FE and FE FF cannot begin valid UTF-8, so the sniff cannot misfire on genuine UTF-8; a BOM-less UTF-16 report decodes to garbage under the UTF-8 fallback and correctly quarantines; the global U+FEFF strip handles the leading-BOM char that `BigEndianUnicode.GetString($bytes)` deliberately retains. The `(?im)` `([A-Z_]+)\s*$` tolerates CRLF because `\s` eats the CR — the CRLF test case proves it, and PS 5.1 `Set-Content -Encoding UTF8` writes a BOM, so every "UTF8" test case also exercised the BOM-skip.
- The gate is deliberately more lenient than the contract (`run_verdict: valid` publishes; block accepted anywhere in the file; newline allowed between name and colon via `\s*`). No integrity impact — leniency here only widens what *passes as* a compliant block, and an attacker already controls a fully compliant block. It's a decision, not an accident; I'd leave it.
- StrictMode audit of the new code: every return path of `Test-ReportVerdict` constructs both keys, so `$verdict.Ok` / `.Reasons` never hit a missing-key property error; `$m[0]` is guarded by the `continue`s; the field-name regex is built only from the fixed `$fields` keys; `Write-Host` does not pollute the output stream, and `Publish-Report`'s pipeline output is fully captured or assigned. No output-stream pollution found.
- The token substitution callback in the launcher (`if ($tokens.ContainsKey($k)) { return $tokens[$k] } else { return $m.Value }`) is genuinely single-pass — MatchEvaluator results are not re-scanned — so the comment's claim about sequential `.Replace()` risk is correctly avoided.
- The 18/18 count is consistent with the code: 15 report cases + 3 handle assertions.

### P1-8 (process finding) — Slice 7 bullet 1 failed its own success criterion
`lib/Handles.ps1` says it exists so `that file fits back under the 300-line cap its siblings cite (handoff v3 OPEN-6)`. The verified facts say the launcher is `304 lines - the same count as before this session, still 4 over the 300-line cap`. The extraction bought nothing: net-zero lines, one more dot-source, and P1-3 shipped inside it. **This slice should not have been built in this form** — either land it with the launcher actually under 300, or don't move the code.

---

## PASS 2 — SECURITY (agent already captured, wants its fabrication published)

### S2-1 (DISCLOSED, zero-cost defeat — the headline, and it is honest) — Under this pass's threat model the gate is a no-op
A captured agent writes the four passing lines and its fabrication. Cost: four lines of ASCII. The file itself says exactly this: `Do not let "the publish gate is in"` carry the claim that the problem is solved, and the header's WHAT-THIS-GATE-DOES-NOT-DO section states a captured agent `can still write RUN_VERDICT: VALID over a fabricated report`. **The author's risk assessment (question 8) is correct and correctly scoped**: this gate constrains omission, truncation, negligence, and honest self-reporting of failure; it converts "silently do nothing" into "actively forge," which has some forensic value and near-zero security value. I checked for accidental strength beyond the claim and found none — and none was claimed. The README's new table row (`A report is published only if the run passed its own checks`) is accurate *because* "its own checks" are self-reported; I'd still append "(self-reported)" so a skimming reader can't mistake it for an independent check.

### S2-2 (MEDIUM, a few dollars) — Poison-ad quarantine DoS against the research itself
The duplicate rule and the body scan run over the whole file, and FILE 7 *mandates* verbatim quoting of hostile ad copy. A competitor buys ad text containing `RUN_VERDICT: VOID` or the phrase `INJECTION ATTEMPT OBSERVED`. Every honest run that quotes it quarantines itself — correct direction for integrity, but it makes the tool cheaply burnable: under the attended-only freeze, every poisoned run costs a human-supervised session. Fix (cheap, also fixes P1-6 and P1-5): restrict all verdict matching and the body scan to the head of the file — the first ~10 lines — where §5 places the block, and stop treating body duplicates as ambiguity. The `first four lines` comment already describes this design; the code doesn't implement it.

### S2-3 (MEDIUM, zero cost to violate) — The freeze is unenforced prose, by the repo's own argument
The README freeze line — `Do not run this tool with -Yes (unattended), and do not run it at all on a machine holding live production credentials.` — is honest about its limits (`The freeze is not a fix.`), and its expiry condition is genuinely good (observed refusal, `Configuration alone does not lift this freeze.`). But nothing enforces it: the launcher still accepts `-Yes`. `lib/Publish.ps1`'s own thesis is that guardrails were `unenforced prose until this file existed` — the same indictment applies verbatim to the freeze. Two lines of launcher code refusing `-Yes` until Slice 2 is verified would convert the freeze from theatre to control. Until then it is a document, not a mechanism. This is the "security theatre" answer: the freeze *text* is candid, the freeze *mechanism* doesn't exist.

### S2-4 (inherited, still open) — The README remains dishonest in exactly one cell
`| Reaches only the two public ad libraries + their CDNs | --allowed-origins |` — OPEN-3 (`https://www.google.com` in the allowlist) is acknowledged in the packet as open, and this session edited the README's table without fixing that row. Not new, but every README edit that leaves it standing extends the misleading claim's shelf life.

### S2-5 (NEW surface inventory: effectively none, one marginal note)
- The regex pattern is built from fixed field names; file content never reaches pattern position. Paths are launcher-chosen; the agent cannot steer `Move-Item`. Quarantine reasons echo attacker-influenced text only through `([A-Z_]+)` — no injection into the sidecar. An agent creating a *directory* at the produced path lands in quarantine via the `report unreadable:` catch; contained.
- Crash-before-move fails closed (publish happens only after verdict), so P1-2/P1-5 are availability, not bypasses.
- No encoding bypass exists: the verdict grammar is ASCII-only (`[A-Z_]`), and ASCII decodes identically under every codec the ladder handles; homoglyphs can't match; non-ASCII mangling degrades to quarantine, never to pass. The one artifact — the global U+FEFF strip can weld `RUN_VERDICT` and `: VALID` fragments into a match — only makes the gate more lenient and buys a captured agent nothing it didn't already have.
- Marginal new leverage: §5 now documents the exact machine check *to the agent*, so any successful prompt injection gets the gate spec for free. Incremental power: none (forging was already trivial, per S2-1). Worth one sentence in the threat model, not a finding.

### On the work-order deviation (asked explicitly)
The work order's two grep targets (the `CONTROL_WORKED` / `TRIMOV_STATUS` strings, described in the packet narrative — they appear in **no** file in this packet) would have produced a gate that matches nothing, i.e., a publish-everything gate wearing a badge. Literal compliance would have been worse than the status quo it replaced. The deviation — mandatory block plus fail-closed absence handling — is strictly better and was disclosed at the top of the packet rather than buried. Correct call, correctly surfaced.

---

## Direct answers to the eight skeptic prompts
1. **Fails closed on absence?** Yes — verified by enumerating every return path (see preliminary note). The one lie available is P1-1, where the *launcher* reports success off stale disk state after the gate already did its job correctly.
2. **ASCII/BOM approach?** Sound; no bypass found; one benign leniency artifact (FEFF welding).
3. **Body scan?** Bypass: omit the phrase — inherent, disclosed. False positives: prose echo and prompt-baited duplicates (P1-6) — safe direction; poison variant is S2-2.
4. **`Count > 1`?** Right polarity (ambiguity → quarantine); exploitable only as availability attack; fix by head-scanning.
5. **Freeze?** Candid text, no mechanism (S2-3). Not a fix and doesn't claim to be — but it should cost two lines of code, not zero.
6. **§5 contract?** Clear enough for an honest agent; the checklist reinforcement is good; against a captured agent it is prose, as is everything else until OPEN-1 closes.
7. **Handles extraction behaviour-preserving?** Functionally yes on the three tested states; the 0-byte state crashes (P1-3); no differential test against the old inline code exists.
8. **Author's risk assessment honest?** Yes — the scope stated in the file header matches what the code can and cannot do, exactly. The one place the docs outrun reality is S2-4 (inherited) and, weakly, the unenforced freeze.

## Slice verdicts
- **Slice 0 (freeze):** keep, but half-built until `-Yes` is mechanically refused. As shipped it is a promise, not a control.
- **Slice 1 (publish gate):** should exist. Real class closed (omission/truncation/honest failure), correctly fail-closed, honestly scoped, correct deviation from a broken work order. Needs P1-1/P1-2 fixes and head-scanning.
- **Slice 7.1 (Handles extraction):** should not have shipped in this form — net-zero launcher lines, cap still violated, one new crash mode, zero behavioral gain.

## Ranked summary (severity, then exploit cost)
1. **P1-1** DONE branch on stale disk state — HIGH (conditional on unseen filename scheme), cost: filename collision. The slice's core promise broken in its own launcher.
2. **S2-1** Captured agent forges the block — zero cost, but disclosed and correctly scoped; not a defect of this change.
3. **S2-2** Poison-ad quarantine DoS — MEDIUM, dollars.
4. **P1-2** Unhandled move exceptions — MEDIUM, everyday Windows locks.
5. **P1-3** Empty `handles.txt` crash — MEDIUM, one `New-Item`.
6. **S2-3** Unenforced freeze — MEDIUM, zero cost to violate.
7. **P1-4** Quarantine overwrite loses evidence — LOW-MED.
8. **P1-5** No size bound — LOW.
9. **P1-6** Prompt-baited false positives — LOW.
10. **S2-4** Stale allowlist row — inherited, open.
11. **P1-8** Cap goal unmet — process.

The gate is the first control in this workstream that fails closed, admits its limits, and passes the tests it claims to pass. It ships inside a launcher that can still report the wrong outcome (P1-1), crash instead of branch (P1-2, P1-3), and a freeze that is enforced by nobody. Fix those four; this does not need a rewrite, and it must not be mistaken for progress on OPEN-1.

REVISE
