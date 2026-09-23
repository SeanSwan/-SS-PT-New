# swan-ops Slice 0+1 — four-reviewer hostile panel, synthesis

**Date:** 2026-08-20 · **Panel:** GLM-5.3, Kimi-K3, GPT-5.6-Sol-Pro, Claude Opus 5 (author)
**Packet:** `SWAN-OPS-SLICE01-REVIEW-PACKET-2026-08-20.md` (40.7 KB, secret-scanned 0 hits)
**Cost:** Kimi $0.1029 + $0.3109 · Sol $1.0059 · GLM $0 (subscription) · Qwen $0 (local) — **$1.42 total**
**Rounds:** 8 (Sol capped at one run by the owner). **Defects per round: 10 → 9 → 4 → 1 → 1 → 1 → 1 → 0.**
**DRY at round 8 — both seats APPROVE.** Suite 18 → **53**. Every claim was executed before it
was acted on; **two reviewer claims were DISPROVED** and correctly not acted on.
**Cost: $1.78** (Kimi $0.78 across 8 runs, Sol $1.01 for one, GLM and Qwen $0).

---

## 1. The rule that made this panel worth running

Every finding below was treated as a hypothesis (Rule 30) and **verified by execution**
before a line changed. That is not ceremony — it caught a false one:

**Kimi F4 — DISPROVED.** Kimi claimed the body scan `$text -match 'INJECTION ATTEMPT
OBSERVED'` is case-sensitive, so `Injection attempt observed` would evade it. PowerShell's
`-match` is **case-insensitive by default** (`-cmatch` is the case-sensitive form). Executed:
a report with the lowercase phrase quarantined correctly, and `'ABC' -match 'abc'` returns
`True`. Had this been "fixed" on trust, the change would have been noise justified by a
false premise.

**This is Kimi's second incorrect specific claim across two reviews of this workstream** —
the first was a fabricated quoted string (`view_all_page_id=<REDACTED_PHONE>85199`) on
2026-08-15. Kimi's *architectural* findings remain the sharpest in the panel (F7 below is
the best single finding anyone produced). Its *specific mechanical assertions* need checking.
That is the calibration, and it is stable across two runs: **trust Kimi's frame, verify
Kimi's facts.**

---

## 2. Verification results — 10 claims, executed

| # | Claim | Source | Result |
|---|---|---|---|
| A | 0-byte `handles.txt` → `Get-Content -Raw` returns `$null` → `.Trim()` throws | GLM P1-3, Kimi F1, Sol P1-7 | **CONFIRMED** — launcher died before the menu |
| B | Fields scattered through the body publish with no verdict block present | Sol P1-2 | **CONFIRMED** |
| C | A report truncated to just the 4 lines publishes | Sol P1-1 | **CONFIRMED** |
| D | Body scan is case-sensitive | Kimi F4 | **DISPROVED** |
| E | Launcher prints DONE off stale disk state | GLM P1-1, Kimi F2, Sol P1-3 | **CONFIRMED** |
| F | "Never throws" false — `try` covered only `ReadAllBytes` | Sol P1-5, Qwen 1.2 | **CONFIRMED** |
| G | §5 printed the verdict block **twice** — prompt supplied its own duplicate tripwire | GLM P1-6 | **CONFIRMED** (2 occurrences) |
| H | The freeze is unenforced prose; launcher still accepted `-Yes` | GLM S2-3 | **CONFIRMED** |
| I | Second quarantine overwrites the first's evidence | GLM P1-4, Kimi F5 | **CONFIRMED** |
| J | The test asserted the return string, never the filesystem | Sol P1-9 | **CONFIRMED** |

---

## 3. What changed

**The three that reshaped the design:**

**Head-scan, not whole-file** (Sol P1-2, GLM S2-2, Kimi F7). Four independent whole-file
regex searches put the verdict inside attacker-controlled text. Two verified consequences:
scattered body fields passed as a "block", and — because the job *mandates* verbatim quoting
of hostile ad copy — anyone could buy a $5 ad containing `RUN_VERDICT: VOID` and every honest
run that quoted it would quarantine itself. The block is now parsed from a bounded head (40
lines), four lines, **contiguous and in order**, with an 8 MB file ceiling.

**An observed injection is a finding, not a failure** (Kimi F7 — best finding of the panel).
Quarantining on `INJECTION_OBSERVED: YES` made the honest handling of an attack and the
attack itself produce the same outcome. It handed an attacker a cheap permanent DoS *and*
gave the agent a reason to hide injections to protect its own report. Now: observed-and-handled
**publishes with a flag**; only a **discrepancy** (body records an injection while the header
claims `NO`) quarantines. *(The round-1 implementation excluded backtick-quoted spans; round 2
showed that reopened the DoS — see GLM R2-F1 below. The scan is now anchored to the record
format instead.)*

**The caller must not infer the outcome** (GLM P1-1, Kimi F2, Sol P1-3). The launcher printed
`DONE` when a file merely existed at the destination — so a stale report could be announced as
this run's success while the real one sat in quarantine. That is the exact "shipped the grade
unread" failure this slice exists to kill, reproduced one directory up. `Publish-Report` now
returns an explicit status (`PUBLISHED`/`FLAGGED`/`QUARANTINED`/`NOTHING`/`ERROR`) and owns
the outcome message.

**The rest:** 0-byte handles crash fixed (assign-then-test); both moves and the sidecar write
wrapped so a lock or full disk yields a reported outcome instead of a stack trace; quarantine
names timestamped so repeated bad runs stop destroying each other's evidence; non-zero agent
exit now blocks publication; `Test-ReportVerdict` genuinely never throws; the §5 duplicate
bait removed; the prompt rewritten to match the new semantics.

**The freeze became a mechanism** (GLM S2-3). `-Yes` now exits 4 before any spend. GLM's hit
landed hardest because it used this project's own argument against it: the file lecturing that
guardrails are "unenforced prose until this file existed" had shipped its freeze as prose.

---

## 4. Where the reviewers disagreed — and who was right

**Sol P1-2 vs GLM's verification.** GLM enumerated every return path and concluded "fails
closed on absence" was **true**. Sol said the opposite. Both were right about different
questions: with *zero* fields present the gate fails closed (GLM), but a report with **no
contiguous block** whose fields appear scattered in body prose **published** (Sol — confirmed
by execution). GLM saw the leniency and explicitly said "It's a decision, not an accident; I'd
leave it." Sol treated it as a HIGH bypass. **Sol was right to escalate**: the documented
contract says "the first four lines", and a gate looser than its own contract is a gate whose
documentation cannot be trusted. Both converged on the same fix — head-scan — which GLM
independently reached from the DoS direction.

**Sol P2-1 vs GLM S2-1 / Kimi F8 on scope honesty.** Kimi and GLM both audited the author's
self-assessment and called it accurate. Sol agreed it was "substantially honest" but added
that **claiming OPEN-4 closed is not justified unless the finding is explicitly narrowed**.
Sol is right, and the handoff previously marked OPEN-4 `CLOSED`. It is now **NARROWED**:
closed against omission, malformed output, non-zero exit and honest self-reported failure;
**open against a captured agent.**

---

## 5. Per-reviewer calibration (carry this forward)

- **GLM-5.3** — best *systems* reviewer of the four. Verified claims by enumeration rather
  than asserting, explicitly flagged where it could not see a file rather than guessing, and
  produced the two findings nobody else got: the §5 duplicate bait (the prompt baiting its own
  tripwire) and the unenforced freeze. Also the only reviewer to call the Slice-7.1 extraction
  worthless *on its own stated success criterion*. 450s, $0. **Highest value per dollar in the
  panel by a wide margin.**
- **Kimi-K3** — best *architectural* framing, weakest on mechanical detail. F7 is the single
  best finding produced. Also produced the panel's only false claim. 86s, $0.10.
- **GPT-5.6-Sol-Pro** — most thorough per-finding analysis; strongest on contract-vs-code
  divergence and test weakness. **Truncated mid-P2-2 and never emitted a verdict**, having
  billed 92,767 input tokens on a 10.5k-token packet (pro reasoning re-reads internally).
  398s, $1.01 — **10× the panel's other paid seat for one incomplete review.** Sean capped Sol
  at one run, so it was not re-run. If used again, budget for truncation and ask for the
  verdict first.
- **Qwen 3.8 (local, free)** — converged on the Move-Item and captured-agent findings
  independently. Found nothing unique, contributed no false claims, cost nothing, 27s.
  Correct as a confirmatory seat; never a lead.

---

## 6. Still open — unchanged by this panel

`OPEN-1` (unsandboxed egress + unscrubbed env) remains the only control that constrains a
captured agent, and all four reviewers said so. `OPEN-2` (unpinned `@playwright/mcp@latest`
running outside the sandbox as the user), `OPEN-3` (the `www.google.com` row, now explicitly
marked overstated in the README rather than silently left), `OPEN-5`, `OPEN-7`..`OPEN-10`.

**The gate has still never run through a live `codex` invocation.** All 27 assertions are
function-level plus launcher parse/load/refusal. First attended run is the end-to-end proof.


---

# ROUND 2 — attacking the fixes

Round 1's fixes were substantial enough that the gate was largely rewritten, so round 2 asked
one question: **did the fixes introduce new defects?** They had. Four of round 2's nine
findings were defects *created by round-1 fixes* — the project rule that "the round which
applies a fix is the next round's primary attack surface" held again, for the fourth time in
this workstream's history.

Both seats returned **REVISE**.

## The finding that mattered most — GLM R2-F1

Round 1 closed the poison-ad DoS by stripping backtick-delimited spans before scanning the
body, reasoning that hostile quotes are backticked by mandate. GLM showed **that reopens the
same DoS one character more expensively**: if the attacker's ad copy *itself begins with a
backtick*, a compliant agent quoting it puts three backticks in the file. The regex pairs #1–#2
around an empty span, and the tripwire phrase survives naked. Honest agent, honest `NO` header,
quarantined run — Kimi F7's exact shape at Kimi F7's exact price.

The principle GLM stated is the durable lesson: **if the text is attacker-controlled, so is the
pairing.** A parity-dependent parser cannot be a control over hostile input.

**My own attack test had already produced this exact result and I read it backwards.** I ran an
odd-backtick case, saw `QUARANTINED`, and marked it "as-expected" — because I was testing
whether a discrepancy could be *hidden* (fail-open) and quarantine meant it couldn't. I never
asked what that same result meant in the *other* direction, which was the DoS I had just
claimed to close. Same observation, opposite significance, and only the reviewer saw it.

Fixed by removing backtick logic entirely: the scan is now anchored to the mandated **record
format** — a line that *starts* with `INJECTION ATTEMPT OBSERVED` (optionally as a markdown
bullet). Mid-line occurrences in quoted copy cannot fire; a real record at column 0 still does.

## Round 2's other confirmed findings

| # | Finding | Source | Fix |
|---|---|---|---|
| R2-1 | **The FLAG was never persisted.** A flagged report was byte-identical to a clean one on disk, while §5 promised the report would "carry a flag". Violated this file's own rule that a reason living only in scrollback is worthless. | Kimi R2-F1 | `<report>.FLAGGED.txt` sidecar |
| R2-2 | **FLAGGED and PUBLISHED collapsed into exit 0** — a scheduler could not tell an attacked run from a clean one. | GLM R2-F3 | `Write-PublishOutcome` returns the status string; exit **3** for flagged |
| R2-3 | **`Write-PublishOutcome` had zero test coverage** — the one function that decides the exit code. | GLM R2-F2, Kimi R2-F2 | 5 cases asserting exact return type and value |
| R2-4 | **`Test-ReportLinks` threw** on a report with URLs but no `VERIFIED` — publishing the report, then crashing the launcher. **Pre-existing**, latent since the function was written. | found by my own adversarial test | `@()` around the pipeline |
| R2-5 | **`Test-ReportLinks` threw again** on a report with exactly **one** unique URL. Same class, different expression. **Pre-existing.** | found by the new coverage from R2-3 | `@()` around `$urls` |
| R2-6 | **Quarantine names were second-resolution**, so two failures inside one second still overwrote — **and the test slept 1.1s to step around it.** The test accommodated the defect it claimed to close. | Kimi R2-F4, GLM R2-F4 | milliseconds in the name; sleep deleted |
| R2-7 | **Head-scan boundary was never pinned** — only a 45-line-deep case existed. | GLM R2-Q1 | cases at exactly line 40 (publishes) and line 38 (falls off) |
| R2-8 | **README cited 27/27 against a 28-test file.** A stale evidence cell in the honesty table, in a round whose question was "is the documentation honest". | GLM R2-F6 | now 39/39 |
| R2-9 | **"FIXED by design change" overstated** the DoS closure — it was contingent on agent quoting compliance. | Kimi R2-F3 | superseded: the anchored scan removes the contingency entirely |

R2-4 and R2-5 are worth separating out: both are **pre-existing latent crashes in code this
session did not write**, surfaced only because round 2 demanded real coverage of the outcome
path. Neither had ever fired, because real reports always contain `[VERIFIED]` tags and more
than one URL. They would have fired eventually, after publishing, with a stack trace.

## Disproved in round 2

Qwen rated the backtick-parity issue **Critical** and worked through the regex to conclude the
behaviour was "actually the desired behavior" — its own analysis contradicted its severity.
Its cases (unclosed backticks) were already covered by my attack script and all **quarantine**:
availability, never integrity. GLM found the same mechanism and correctly identified the one
direction that mattered. Qwen: no unique findings across two rounds, no false claims, $0.

## Updated per-reviewer calibration

- **GLM-5.3** — best seat in the panel across both rounds, and free. Round 2 produced the single
  most important finding (F1), the exit-code channel gap, the stale README cell, and the
  boundary-test gap. It also verified rather than asserted, and said plainly where it could not
  see a file instead of guessing. 433s, $0.
- **Kimi-K3** — again the sharpest *architectural* framing (the flag-not-persisted finding is a
  design critique, not a bug report) and again over-confident on mechanism: it flagged the
  exit-code contract as "needs execution" rather than testing it, which is honest, but its round-1
  F4 remains the panel's only outright false claim. 2 rounds, $0.41 total.
- **GPT-5.6-Sol-Pro** — one run, $1.01, truncated before its verdict. Its P1-2 (contiguity) was the
  round-1 finding that reshaped the parser, so the money bought something real — but at 10× Kimi
  and ∞× GLM for an incomplete review.
- **Qwen 3.8 (local)** — confirmatory only, zero cost, zero false claims, zero unique findings.

## Is the loop dry?

**No — round 2 found nine things.** Round 3 is required before any claim of dryness, and the
history of this workstream says round 3 should be expected to find something in the round-2
fixes, which touched the parser, the publish path, the exit contract and the test suite.


---

# ROUND 3 — attacking the round-2 fixes

Both seats returned **REVISE** again, and both opened with the same sentence in different
words: *the loop is not dry.* Round 3 found four things, and one of them forced the largest
design change of the whole workstream.

## The impossibility result

Round 2 replaced backtick-stripping with an anchor to the mandated record format — a line that
*starts* with `INJECTION ATTEMPT OBSERVED`. GLM and Kimi independently attacked it from
opposite ends and met in the middle:

- **Kimi:** ad copy containing an embedded newline, quoted verbatim as the job mandates, puts
  the phrase at column zero. Honest agent, honest `NO` header, quarantined run.
- **GLM:** a blockquote or numbered-list prefix hides a *real* record from the same anchor.

GLM then stated the result that ends the argument:

> "The anchor is neither sufficient for 'agent recorded an injection' (quoted copy) nor
> necessary (blockquote/numbered). **No purely textual discriminator over text containing
> verbatim hostile quotes can be both.**"

That is not a bug to fix; it is a proof that the check as specified cannot work. Two rounds
had been spent building successively cleverer discriminators — whole-file scan, backtick
parity, line anchor — each of which failed in the same shape because each tried to separate
*the agent's words* from *the attacker's words* inside a document that is required to contain
both, verbatim, with no marker distinguishing them.

**The re-decision:** a discrepancy is now **FLAGGED**, not quarantined. The report publishes,
carries a `.FLAGGED.txt`, and exits 3. This kills the DoS class entirely — no input a report
can contain blocks publication on injection grounds — at the cost of not quarantining a lying
header, which was always evadable by simply omitting the record. Trading a real attacker
capability for a check that only ever bound a careless agent is the right trade.

## What my own self-attack got, and got wrong

Before the reviews returned I ran a self-attack on the same anchor and found the blockquote,
numbered-list and bold cases — the same hiding direction GLM found — and fixed them. **But in
round 2 I had already run an odd-backtick case, seen `QUARANTINED`, and marked it
"as-expected"** because I was testing whether a discrepancy could be *hidden*. I never asked
what that same result meant in the other direction, which was the DoS I had just claimed to
close. The observation was in my own terminal, correctly produced, and I read it backwards.

That is the durable lesson of this panel: **a test result means nothing until you ask what it
means in both directions.** An outcome that is "expected" under the question you asked can be
the defect under the question you didn't.

## Round 3's other findings

| # | Finding | Source | Fix |
|---|---|---|---|
| R3-1 | The `.FLAGGED.txt` write sat in a **bare `try {} catch { }`**. On failure the report publishes byte-identical to a clean one — recreating the exact defect the sidecar was added to close, silently. The quarantine path twenty lines away already recorded its failures. | GLM R3-c, Kimi R3-F2 | failure appended to `Flags` |
| R3-2 | Report names are second-resolution, so a clean run could **inherit a previous run's `.FLAGGED.txt`** — a warning attached to the wrong report. | GLM R3 edge note | stale sidecar deleted on publish |
| R3-3 | Blockquote / numbered-list / bold prefixes hid a real record. | my self-attack + Kimi + GLM | anchor prefix class widened |

## What round 3 confirmed as DRY

GLM traced the round-2 exit-code refactor end to end — every status `Publish-Report` can emit,
every branch of the switch, the early `ABORTED` returns, the menu loop's handling of a string,
and an emission sweep of `Write-PublishOutcome` — and found no path that escapes to a wrong
code. It also swept every `.Count` in the shown files and found them all `@()`-wrapped, and
found no false documentation claims. Those three areas are the round-2 attack surface, and
they held.


---

# ROUNDS 4-6 — the tail, and what it cost to actually reach dry

The interesting thing about the tail is its shape: **10 → 9 → 4 → 1 → 1 → 0**, and the last
three rounds found *nothing but documentation*.

## Round 4 — logic confirmed dry, prose was not

Kimi returned **APPROVE** outright. GLM returned REVISE on a single finding: three places
inside `lib/Publish.ps1` still described the pre-round-3 gate **in the present tense** —

1. the file-header narrative, in the very section a maintainer is told to read "before
   trusting it", still said a discrepancy "quarantines, because then the header is lying";
2. the **operator-facing quarantine sidecar**, written to disk beside every held report,
   listed "the header contradicted the body" among the reasons a report lands there — a
   control that can no longer fire under any input;
3. the flag sidecar asserted "the agent reported that something tried to manipulate it",
   which over-claims in exactly the discrepancy case round 3 had declared indistinguishable.

Round 3 had updated the check, its inline comment, the tests and the job prompt — and missed
the narrative and the two operator-facing strings. **The code was right and the documents
around it were lying**, which is the failure mode this workstream exists to prevent.

Both reviewers independently confirmed the round-3 logic dry: the FLAG demotion, the widened
anchor, the exit-code contract and the `.Count`/StrictMode sweep all held under attack.

## Round 5 — one more of the same class, and one I had already seen

Kimi: **APPROVE, dry.** GLM: REVISE, one finding — `ConvertFrom-ReportBytes` was documented
as *"Returns `$null` if it cannot"* decode. It cannot. .NET's `UTF8.GetString` uses
replacement fallback and never fails; `Unicode.GetString` does not throw on odd lengths.
Verified against invalid UTF-8, odd-length UTF-16, a lone `0xFF` and all-high bytes — every
one returned a string. So the docstring promised a contract that never existed, the
`if ($null -eq $text)` branch was unreachable, and its operator-facing reason string
`'report could not be decoded'` could never print.

**I had already noticed this in round 2 and consciously left it** — my note at the time was
"technically unreachable… it's defensive. I'll leave it." That was wrong twice over: dead
code is not defence, and a docstring promising a failure mode that cannot occur will be
trusted by the next maintainer. Fail-closed is real here, but by a *different* mechanism —
mojibake fails the ASCII scan — and that mechanism is now pinned by a test rather than
assumed.

## Round 6 — dry

Both seats returned **APPROVE**. Kimi: *"no remaining documentation/behaviour disagreement
found… Dry."*

## What the tail actually teaches

**Documentation rot is a defect class with its own decay curve, and it lags the code by
exactly one round.** Every round that changed behaviour left prose behind, and the prose that
survived longest was the prose *furthest from the change site* — a file header, an operator
sidecar, a docstring on a helper. The inline comment at the changed line was updated every
single time; the narrative three hundred lines up never was, until a reviewer swept for it.

That is worth institutionalising: after any behaviour change, **grep the whole file for the
old behaviour's vocabulary**, not just the lines you touched. Round 3 changed quarantine to
flag and updated four places; two more went stale for two rounds because nobody searched for
the word "quarantine".

**The panel earned its keep in the tail, not just the head.** Rounds 4–6 cost about $0.20 and
produced two findings that no test could ever have caught — a passing suite cannot detect a
comment that lies. If the loop had been stopped at round 3 on the strength of 45/45 green,
the file would have shipped telling its next maintainer three things that were not true.


---

# ROUNDS 7-8 — the seats swap, and the loop goes dry

## Round 7 — the reviewers split

**GLM: APPROVE. Kimi: REVISE.** The first genuine disagreement of the panel, and the most
useful moment in it.

GLM produced the analytical result that explains the whole tail. Asked whether removing the
emphasis *bound* ends the sequence or merely postpones it:

> "A bound admits a finite subset of an infinite natural set — `{0,2}` accepted `*` and `**`
> while the set of real emphasis runs is unbounded, so there was *always* a next string one
> character wider... `[*_]*` is **total over its alphabet**... The sequence ends, it does not
> postpone."

That is the difference between rounds 3/6 (which *moved* a boundary and leaked one character
wider the next round) and round 7 (which *removed* one). It is the reason to prefer
enumeration over patching, stated precisely.

GLM then mapped the remaining prefix space and judged headings, strikethrough, links and
checkboxes out of scope: "none of these is a way an agent renders the *mandated record line*;
each rewrites or decorates its tokens rather than wrapping the line."

**Kimi disagreed on exactly one:** the `##` heading. Its argument was that `#` is not a word
character, so admitting it cannot let prose precede the phrase nor reopen the DoS — the
identical logic GLM had just used to justify unbounding emphasis.

**I sided with Kimi** and closed it, on the grounds that a `##` prefix does not rewrite or
decorate the record's tokens — it *prefixes* them, exactly as `>` and `-` do, both of which GLM
accepts — so GLM's own safe-by-construction argument applies to `#` unchanged.

I also stopped waiting for the next form to be reported and **enumerated the space myself**: a
34-form sweep across indentation, blockquotes (incl. nested), headings, every list marker
(incl. multi-digit and `)`), every emphasis run, and their combinations — plus 5 prose forms
that must *not* flag, and the one accepted limit. All pinned in the suite.

## Round 8 — dry, and GLM reverses itself

**Both seats APPROVE.** GLM did not merely concede the heading call; it produced a better
justification for it than mine:

> "This file contains two anchors with two different tolerance policies, and GLM applied the
> strict one's lens to the tolerant one. The verdict block is a machine contract: deviation
> there *should* fail closed... The injection record is a tripwire over free-form prose, where
> the failure mode that matters is the false *negative* — a real record publishing clean, which
> is silent — while the false positive costs a flag on a report that still publishes."

And on why the sequence is now genuinely over:

> "Rounds 3, 6, and 7 each proved reviewer intuition under-predicts legitimate renderings; the
> enumeration replaces that intuition with a generating grammar — block-structure prefixes plus
> emphasis — and **`#` was the last block-structure prefix markdown has**."

Kimi's independent verdict: *"The loop is dry. Four consecutive single-defect rounds, each
defect a boundary moved one character wider; round 7 replaced discovery with enumeration and
pinned the full form space... The remaining exclusions are decisions with stated rationale, not
gaps."*

**Deliberately still excluded, as decisions with recorded reasons:** a line-opening backtick
(the prompt's mandated *quoting* marker — admitting it would convert honestly quoted ad lines
into flags, the trade round 2 already rejected); strikethrough, link-wrapping and checkboxes
(these rewrite the record's own tokens and discard the mandated `: <url> - <quote>` suffix);
and `- > ` (a blockquote nested inside a list item — both seats ruled it out, so I did not
override them).

---

# The verdict matrix

| Round | GLM-5.3 | Kimi-K3 | Defects |
|---|---|---|---|
| 1 | REVISE | REVISE | 10 |
| 2 | REVISE | REVISE | 9 |
| 3 | REVISE | REVISE | 4 |
| 4 | REVISE | **APPROVE** | 1 (prose) |
| 5 | REVISE | **APPROVE** | 1 (prose) |
| 6 | REVISE | **APPROVE** | 1 (logic) |
| 7 | **APPROVE** | REVISE | 1 (logic) |
| 8 | **APPROVE** | **APPROVE** | **0 — DRY** |

The swap at round 7 is worth noticing: three rounds of Kimi approving while GLM kept finding
things, then one round of the reverse, then agreement. **A single-seat "dry" was wrong three
times running.** Two seats is not redundancy here; it is the mechanism.

---

# Final calibration — carry this forward

- **GLM-5.3 (free, subscription).** Best seat in the panel by a wide margin, and it cost
  nothing. Found the single most important finding in three separate rounds (the backtick
  parity reopening, the exit-code channel, the emphasis bound), verified rather than asserted,
  said plainly where it could not see a file, produced the analytical framing that ended the
  sequence, and **reversed its own position when Kimi's argument was better**. ~450s/round.
- **Kimi-K3 ($0.78 across 8 runs).** Sharpest *architectural* framing — the flag-not-persisted
  finding and the original F7 DoS are design critiques no test would produce. Also the panel's
  only two false claims (a fabricated quoted string on 2026-08-15, and the case-sensitivity
  claim disproved in round 1). **Trust Kimi's frame; verify Kimi's facts.** Stable across ten
  reviews now.
- **GPT-5.6-Sol-Pro ($1.01, one run).** Its P1-2 reshaped the parser, so the money bought
  something real — but it truncated before its verdict having billed 92,767 input tokens on a
  10.5k-token packet, and cost more than eight Kimi runs combined. If used again: budget for
  truncation, and ask for the verdict first.
- **Qwen 3.8 (local, free).** Two rounds, zero unique findings, zero false claims. Its one
  "Critical" contradicted its own analysis. Correct as a confirmatory seat; never a lead.

# What this panel is worth

Rounds 4-8 cost roughly **$0.30** and produced five findings a green test suite could never
have caught: three lying comments, a docstring promising a contract that never existed, and
two silent false-negatives in a tripwire. Stopping at round 3 on the strength of 45/45 green
would have shipped a file that told its next maintainer three untrue things and let a real
injection record publish silently in six different renderings.
