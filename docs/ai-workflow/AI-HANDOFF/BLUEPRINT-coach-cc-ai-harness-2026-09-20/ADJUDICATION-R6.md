# ADJUDICATION R6 — the round-6 hostile review, adjudicated

**Seat:** WorkBuddy / `vs-claude` lane. **Subject:** the two blueprint packages
`BLUEPRINT-swan-coach-live-2026-09-20/` and `BLUEPRINT-coach-cc-ai-harness-2026-09-20/`.
**Governing instruction:** *"OK LETS DO ALL FIXES THAT ASTRA ASKED FOR NONSTOP UNTIL WE RUN DRY"* — apply
every fix, no pausing, and keep looping until a round returns no new findings.

**This document is seat-authored. It is not Astra's.** It records what was verified, what was fixed, what was
not, and where the seat was wrong.

---

## 1. Provenance

| | |
|---|---|
| **Requested model** | `gpt-6-astra` |
| **Effort** | `xhigh` |
| **Served model** | **UNVERIFIABLE** — `codex exec --json` emits no model field (`identityUnverifiableReason`). The requested model, the effort and the reasoning tokens actually spent are provable; the served model is not |
| **Transport / billing** | `codex-cli` on the ChatGPT subscription — **$0 marginal** |
| **Wall time** | 583.0 s |
| **Tokens** | in **1,914,033** · out 14,259 · reasoning **5,226** |
| **Packet** | `tmp/coach-cc-ai-harness-20260920/PACKET-R6.md`, SHA-256 `1e8d8699…293a298` |
| **Reply** | `tmp/coach-cc-ai-harness-20260920/REPLY-R6.md`, SHA-256 `dbec371a…a026fd` |
| **Mega Blueprint** | deliberately **not armed** (`--no-mega-blueprint`) |
| **Egress redaction** | **none** — `[redact-egress] document: no matches`, `remit: no matches`. Unlike round 5, Astra's copy of the packet was byte-identical to the author's |
| **Filed?** | **NO — `NOT FILED / NOT INDEXED`.** Astra's filesystem is read-only (Rule 86). The seat owes the filing |

**The input-token curve is now flat at ~1.9 M, and that is the method working, not a curiosity.**
`codex exec` is an *agent*: it loads the repo's instruction files, its skill index, and **reads the changed
files from disk**. Round 3 measured 42,514 input tokens; rounds 4, 5 and 6 measured 1,426,042, 1,534,287 and
**1,914,033**. The consequence — recorded in round 5 and confirmed again here — is that **a packet is a
guide, not the evidence.** Round 6 found two defects by reading the tree that the packet had not mentioned,
which is exactly the behaviour the seat should want.

---

## 2. Method

Every finding was checked against the **shipped source or the actual artifact** before being accepted or
rejected. Claims about runtime behaviour were reproduced by **executing extracted source verbatim** — never
by reasoning about it. A new probe was written for this round:

```bash
node tmp/coach-cc-ai-harness-20260920/probe-r6-operator-content-and-dates.mjs
```

It **extracts by anchor** from `aiChatService.mjs` and throws if an anchor moves, so it cannot silently scan
the wrong bytes. It reproduces R6-01 and R6-06 in one run.

---

## 3. Findings — 7 reported, 7 confirmed, 4 added by the seat

| ID | Sev | Claim | Verdict | Evidence |
|---|---|---|---|---|
| **R6-01** | HIGH | *"Exact matching still rejects ordinary Coach chat."* The O class is content-scanned, and the shipped Coach templates trip the scanner | **CONFIRMED, reproduced** | `probe-r6-operator-content-and-dates.mjs` → `OPERATOR_SEGMENTS_FLAGGED=3/4`. `aiChatService.mjs:241` `["on Metformin","depletes (≈diabetes)"]`; `:242` `["on insulin"]`; `:995` `["555-123-4567"]` |
| **R6-02** | HIGH | *"Interpolated content has contradictory provenance and no coherent hash target."* `03c` §6.0 classified interpolation results as **P** while §7.1 called the interpolated block **O** — the same bytes, two classes, one file | **CONFIRMED** | `03c` §6.0 and §7.1 read side by side. Both were written by this seat, in the same round |
| **R6-03** | HIGH | *"Server storage is being substituted for admission evidence."* Round 5 claimed id-reference closed replay *"by construction"* | **CONFIRMED** | `aiChatRoutes.mjs:754-757` read verbatim: `// Store the ORIGINAL user message in conversation history (trainer sees what they typed) // but the AI only ever saw the sanitized version`. The stored transcript is the **un-sanitized** original |
| **R6-04** | HIGH | `previousContext?: unknown` was still declared in the V2 request type | **CONFIRMED by extraction** | Extraction of the type block: `previousContextType="unknown"`. The fix from round 5 reached the prose and not the type |
| **R6-05** | HIGH | The six-site absorber inventory misses the command route's **outer** `catch` | **CONFIRMED, reproduced** | `aiCommandRoutes.mjs:283` → `res.status(500).json({ success:false, error:'Internal server error processing your command' })`. The extracted handler, given a synthetic `PRIVACY_UNAVAILABLE` rejection, returned **HTTP 500 with no privacy code** |
| **R6-06** | MED | *"The new DOB coverage claim is false."* The seat had claimed the full detector catches a DOB-shaped `workoutDate` | **CONFIRMED, reproduced** | Probe → `ROUTE_CONTEXT_DATES_CAUGHT=false`. Both route-context date lines are **clean**; the labelled controls are flagged. The DOB regex (`phiScanner.mjs:33`) requires a **label** |
| **R6-07** | MED | *"Both T-04.13 assertions pass when operator inspection is completely bypassed."* The paired assertion never exercises the O check | **CONFIRMED** | The assertion pair inspects the **template only**. It passes with **zero O inspections and zero hash checks** — an O check that is never exercised is not a check |
| **R6-08** | HIGH | **Added by the seat while preparing this document.** `03c` measured **309 lines against the 300-line cap**, while its own §8 asserted *"It remains under the cap."* | **CONFIRMED by measuring** | `wc -l` = 309. **The third consecutive round in which a size claim in this contract was false** — R5-08 was the count, R6-08 is the compliance claim |
| **R6-09** | MED | **Added by the seat's own coherence sweep.** The propagation script for the §7 extraction missed the **inverted-phrase** variant: the heading *"…context channels — moved to `03c-release-predicate.md`"*, where the filename follows the phrase rather than preceding it | **CONFIRMED by re-grepping** | `03b-privacy-boundary.md:191`. The sweep regex `03c[^)\n]*context channels` cannot match text in the other order |
| **R6-10** | MED | **Added by the seat's sweep.** `09-tests.md:131` still read *"absorbers 1–6"* after round 6 established a **seventh** | **CONFIRMED** | `03b` §5 now has seven rows; the assertion enumerates six |
| **R6-11** | LOW | **Added by the seat.** The recorded note that `BLUEPRINT-coach-cc-ai-harness-2026-09-20/09-tests.md` *"has an odd fence count"* is **false** | **CONFIRMED by counting** | The file contains **zero** code fences — `col0=0`, indented `=0`, `~~~` `=0`. The note was a stale claim about the seat's own artifact |

**Citation accuracy — one off-by-N in the review, recorded because the discipline cuts both ways.**
Astra cited `03-contracts.md:20` for `previousContext`. On the pre-fix file the declaration sat at **`:27`**.
**The finding is unaffected and was confirmed independently** by extracting the type block
(`previousContextType="unknown"`). The line number is **not re-derivable now**, because the file was edited
by R6-04's own fix in the same round — which is itself the reason a line citation should be treated as a
pointer to a revision, not to a file.

**R6-01 is sharper than the finding as filed, and the probe proves it.** The claim was that exact matching
*rejects* ordinary Coach chat. The measurement shows **3 of 4** shipped operator segments are flagged — and
the fourth, the statin protocol at `:255`, is **clean**. That is **worse than a uniform failure**: an O check
that fails on *some* templates and passes on others looks like it works. A coaching product that discusses
diabetes, insulin and Metformin will always trip a detector built to notice those words, because **the
vocabulary IS the content.** Note also that *"depletes"* was flagged as ≈*"diabetes"* — so the fuzzy problem
was never confined to the classifier template either.

---

## 4. The seat's own errors this round — five, all disclosed

1. **R6-02, R6-03, R6-06, R6-07 are the seat's own defects**, introduced or left by rounds 5 and 6 and found
   by Astra. Two of them (R6-03, R6-06) were **claims of closure or coverage** — the seat asserted a property
   it had not exercised. That is the same failure it has been charging Astra's findings with.
2. **R6-08 — a false compliance claim, not merely a stale count.** §8 asserted *"It remains under the cap"*
   at 309 lines. The rule adopted in round 5 (state no number) was followed *in letter* and defeated *in
   substance*, because the sentence asserting compliance is as much a measurement as the number was.
3. **R6-09 — a propagation sweep keyed on one syntactic form missed a variant.** **This is the second
   consecutive round** in which the same class of error occurred (round 5: `06-bans.md:31`, the parenthesised
   path; round 6: `03b:191`, the inverted phrase). The lesson is not "grep more" — it is that **a sweep
   proves what it matched, never what it covered.** Coverage must be established by dumping and triaging
   *every* line that mentions the symbol.
4. **R6-11 — a false claim about the seat's own artifact.** The fence note was never re-measured.
5. **The seat's disclosure went stale mid-round, which is the round-5 lesson firing on the seat one hour
   after it was written.** `PACKET-R6.md` disclosed that rounds 4 and 5 *"remain unfiled"*; the seat filed
   them **between writing the packet and sending it**. Astra replied: *"Rounds 4 and 5 are now filed and
   indexed, contrary to the packet's archival disclosure."* **A packet is a point-in-time artifact, and its
   disclosure is stale the moment the state changes.** The seat had written that rule in round 5 as §1e of
   its own skill and then violated it.

**Nothing above was self-reported before Astra or a re-check found it.** That remains the honest
characterisation.

---

## 5. Fixes applied

### 5.1 R6-01 — O is admitted by **identity**, never content-scanned (`03c` §6.0)

The round-5 rule was *"exact match against the enforced pattern set, plus a version hash."* **That cannot
work**, and the probe shows why. The corrected regime:

| Class | Authored by | Regime |
|---|---|---|
| **U** | the user | full detector including fuzzy |
| **O — STATIC** | the package, versioned and approved | **content-hash identity against the approved registry — NOT content-scanned** |
| **P** | the pipeline, **and every interpolation result** | full detector; admissible only if every input was admitted |

An O segment whose bytes do not hash to an approved, versioned entry is a **rejection** — so this is an
admission rule, not an exemption.

### 5.2 R6-02 — static bytes are O, interpolated values are P, the rendered block is never hashed

The hash covers the **static template bytes only**. Each interpolated value carries its own provenance and is
scanned **before** substitution. **The rendered output is never the hash target** — two valid inputs render
differently, so a hash over the output proves nothing about which bytes were approved. The boundary must
record, **per segment**, which approved template and which admitted values produced it; a block whose
provenance cannot be resolved is **rejected**, not scanned-and-hoped.

### 5.3 R6-03 — two stores, never one (`03c` §6.1a, new)

The transcript (human-facing, holding the **original un-sanitized** text, **never replayable**) is separated
from the admission record (the **only** replayable source, holding the admitted representation, the policy
version, the actor and conversation binding, and the template identifiers used). **Assistant turns are P**,
re-scanned on every send — never inherited as previously admitted.

### 5.4 R6-04 — `previousContext` removed from the type

Replaced by `conversationRef?: string` — opaque, authorisation-bound, server-resolved. Legacy payloads
carrying `previousContext` are **rejected explicitly**, not silently ignored and not coerced.

### 5.5 R6-05 — the absorber chain extended from six sites to **seven** (`03b` §5)

Row 7 is `aiCommandRoutes.mjs:283`, the `/execute` handler's **outer** `catch`. **Rows 5 and 7 are two
different paths through the same route, and rounds 3–5 conflated them:** row 5 is `if (ctx.error)` — the
pipeline **returned** an error; row 7 is the wrapping `try/catch` — the pipeline **threw**. The contract now
records that round 5's own fix *asked* for a recursive call-graph walk and **did not perform it**.

### 5.6 R6-06 — the false DOB claim removed; date admission is a **context** problem

The claim that the full detector catches a DOB-shaped `workoutDate` is deleted. The boundary admits
`YYYY-MM-DD` because the **field** is a known workout/session date from an authorised caller — not because
the value was scanned. **C6a's date fields remain open as a content channel**, and the honest disposition is
*admitted by context, unverified as content*.

### 5.7 R6-07 — the O check is now exercised (`09-tests.md` T-04.14)

Three negative controls added: **altered static bytes** ⇒ REFUSED; **unknown version** ⇒ REFUSED; and the
mutation test — **disable the hash check and the suite must FAIL.** *A control that passes when the mechanism
is removed is not testing the mechanism.*

### 5.8 R6-08 / R6-09 / R6-10 — the split and the propagation

`03c` was **309/300**. §7 was extracted to **`BLUEPRINT-swan-coach-live-2026-09-20/03d-context-channels.md`**
— the split §8 had already prescribed. **The contract id did not move**, because a split moves bytes without
changing meaning (contrast R5-06, where the meaning changed). §7 keeps its number so existing `§7`/`§7.1`
references stay meaningful and only their file component changes. **24 cross-references were updated across
7 files.** `ADJUDICATION-R*.md` were deliberately **not** rewritten — they are historical records.

**Final state, measured:** `03b` 275 · `03c` 261 · `03d` 104 — `OVER_CAP=0`. Stale-reference sweep
`STALE=0`; broken-reference sweep `BROKEN_REFS=0`; fence balance `UNBALANCED=0`.

---

## 6. Not fixed — named, with the reason

| Item | Why not |
|---|---|
| **The production behaviour change** (`backend/`) | Astra's own PART E condition 1 gates it on **Sean's R2-01 operator ruling**. Five rounds old and still open. **No file under `backend/` was modified** — it was read only |
| **The provider-envelope wire schema** | **Not supplied in any reviewed artifact.** `03b` §2 states the allowlist is not implementable until it is captured. S0 prerequisite |
| **Recalibrating `phiScanner.mjs`** | A `backend/` change, operator-gated (above). The contract route was taken instead, and `03c` §6.0 states that limit explicitly |
| **`lane-staged-guard.mjs:95`** — `c.replace(/\/?\*+$/, '')` strips `*` but not a bare `/`, so a `dir/` claim covers nothing | **14 void claims across 6 of 85 lane files.** A shared gate; one-line fix identified, **not applied** — not this package's file |
| **Rule 86 archival for round 6** | Astra cannot file. **Owed by the seat** — rounds 4 and 5 are filed, published, indexed (78 reviews) and reciprocally linked |
| **The `rm` shim → hook timeout → orphaned `index.lock` chain** | Root-caused and measured (23,185 ms vs 1,443 ms). A Hermes packet was filed. Not a package fix |

---

## 7. Novelty

Rounds 1–3 found **leaks**. Round 4 found a **leak in a check written the same round**. Round 5 found the
**inverse** — a gate that would refuse all traffic. Round 6 found that **the fix for round 5 was one notch
too clever**: scoping the detector by provenance is right, but *content-scanning operator content* cannot
work at all when the content is the vocabulary. **A hash is the right instrument for bytes the operator
authored and approved; a detector is the wrong one.**

**The new structural finding is that a partial failure is worse than a total one.** R6-01's probe shows 3 of
4 templates flagged and one clean. A gate that refuses *every* template would be caught immediately as
unusable; a gate that refuses *some* templates looks like it is working, and the operator discovers the
defect only when a coach tries to discuss the condition the product exists to support.

**Also new:** the distinction between the **returned** error path and the **thrown** error path through one
route (R6-05), and the discovery that the server's own transcript is deliberately the **un-sanitized** text
(R6-03) — so *"the server holds it"* is not evidence that it was ever admitted.

---

## 8. Status

**Round 6: `REVISE` — 7 findings, all confirmed, all fixed; 4 further defects added by the seat's own sweep
and all fixed.** `ADJUDICATION-R6.md` is written; filing round 6 and dispatching round 7 are next.

**The loop has not converged.** Rounds 3, 4, 5 and 6 returned **5, 5, 7 and 7** new findings. "Run dry" means
a round that returns **no new findings**; that has not yet happened, and four consecutive non-dry rounds is
itself evidence that the loop is still finding real things rather than churning.

**Every count, hash, line number and code sample in this document was measured against the shipped source or
the actual artifact.** Where a claim could not be reproduced it is marked as such — and the one citation
that cannot now be re-derived (Astra's `:20`) says so explicitly rather than being quietly corrected.
