# ADJUDICATION R5 — the round-5 hostile review, adjudicated

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
| **Served model** | **UNVERIFIABLE** — `codex exec --json` emits no model field (`identityUnverifiableReason`, measured 2026-09-19 on codex-cli 0.154.0). The requested model, the effort and the reasoning tokens actually spent are provable; the served model is not |
| **Transport / billing** | `codex-cli` on the ChatGPT subscription — **$0 marginal** |
| **Wall time** | 447.2 s |
| **Tokens** | in **1,534,287** · out 11,751 · reasoning **4,696** |
| **Packet** | `tmp/coach-cc-ai-harness-20260920/PACKET-R5.md`, SHA-256 `a838aebf…84fc71` |
| **Reply** | `tmp/coach-cc-ai-harness-20260920/REPLY-R5.md`, SHA-256 `bdb97ca3…f4104b9` |
| **Mega Blueprint** | deliberately **not armed** (`--no-mega-blueprint`) |
| **Filed?** | **NO — `NOT FILED / NOT INDEXED`.** Astra's filesystem is read-only, so it cannot write to `Z:\HostileReviews` (Rule 86). Rounds 4 and 5 remain unfiled by the seat |

**One egress redaction, disclosed.** The transport logged `1 redaction(s) before send — <REDACTED-PHONE>×1`.
A phone literal in the packet was stripped by the egress redactor, so **Astra's copy of the packet differed
from the author's in one cell.** The reviewer's evidence was narrower than the author's, by one value. It did
not affect any finding, but it is recorded rather than omitted.

**The 1.53 M input tokens are the story of this round, not a curiosity.** `codex exec` is an *agent*, not a
completion: it loads the repo's instruction files, its skill index, and **reads the changed files from disk**.
Round 3 measured 42,514 input tokens for a comparable packet; rounds 4 and 5 measured 1,426,042 and 1,534,287.
**Consequence, and it is a correction to the seat's own method: a packet is a guide, not the evidence.** The
reviewer can and does read the tree — which is why round 4 found the defect the seat's packet had elided.

---

## 2. Method

Every finding was checked against the **shipped source or the actual artifact** before being accepted or
rejected. Where a claim was about runtime behaviour, it was reproduced by **executing extracted source
verbatim** — never by reasoning about it. Where a claim could not be reproduced, it is marked
**UNVERIFIED** and named as such.

`R5-02` was reproduced with a new probe, `tmp/coach-cc-ai-harness-20260920/probe-r5-template-vs-scanner.mjs`,
which extracts the classifier's fixed template **verbatim** from `intentClassifier.mjs:59-90` (anchored, so
drift fails loudly) and runs the **shipped** `scanForPHI` against it.

---

## 3. Findings — 7 reported, 7 confirmed, 1 added by the seat

| ID | Sev | Claim | Verdict | Evidence |
|---|---|---|---|---|
| **R5-01** | HIGH | The admission rule is still self-contradictory: it admits replayed turns whose content was an admitted `message`, but rejects a name in **any** context channel — so an admitted `Jordan T.` becomes forbidden when replayed. Also: `{role, content}` proves *shape*, not *prior admission* | **CONFIRMED** | `03b` §6.1 table row `previousContext` vs `03b` §8 assertion 4, read side by side. Both were written by this seat, in the same round |
| **R5-02** | HIGH | The zero-match predicate rejects the classifier's **own fixed prompt**, because the template contains *"dates"* and the fuzzy matcher accepts it as ≈*"diabetes"* | **CONFIRMED, independently reproduced** | `probe-r5-template-vs-scanner.mjs` → `TEMPLATE_TRIPS_SCANNER=true`, match `["dates (≈diabetes)"]`, category `medical_fuzzy`. Template at `intentClassifier.mjs:64`,`:69`; matcher at `phiScanner.mjs:81-96`; length guard passes (`\|5−8\|=3` is not `>3`); `levenshtein=3 ≤ ceil(8×0.3)=3` |
| **R5-03** | HIGH | `aiChatService.mjs:2301` retries Pro→Flash **ignoring the error code**; `aiChatRoutes.mjs:823` returns a generic 500 with no privacy code | **CONFIRMED** | Read directly: `:2301-2304` `if (model.includes('pro')) { logger.warn(…); continue; }`; `:823-825` `res.status(500).json({ success:false, error:'Failed to send message' })` |
| **R5-04** | MED | The scoping fix made in `03b-contracts-proposed-artifacts.md` never reached `09-tests.md` — `:76` and `:107` still assert the superseded rule | **CONFIRMED** | `09-tests.md:107` read verbatim: *"…or provide approved evidence that no identifying content crosses"*; `:76` `raw_message_identifier_never_reaches_recording_adapter` |
| **R5-05** | MED | *"absent **or** refused"* permits a silent drop-and-send | **CONFIRMED** | Sibling `09-tests.md:88-89` read verbatim. The disjunction is satisfied by the **worst** branch, which is the behaviour P1 forbids (`03b` §3) |
| **R5-06** | MED | The version pin did not move when the semantics did; `03b` still `@1.0.0`; sibling `03-contracts.md:170` still says *"two"* points | **CONFIRMED** | `03b` frontmatter + §1; sibling `03-contracts.md:168-172` read verbatim. A sweep then found **10 further stale pins/§-references across 7 files** — see §5 |
| **R5-07** | LOW | Markdown was inserted **inside** the `ts` fence in `03-contracts.md`, so the contract example is not valid TypeScript | **CONFIRMED — the seat's own bug** | Extraction of every fenced block; the block spanning the old `:38-98` contained bold prose and a table |
| **R5-08** | MED | **Added by the seat while applying R5-06.** `03b` §9 asserted **293 lines**; the file measured **298** | **CONFIRMED by measuring** | `wc -l` = 298 vs the stated 293. The count went stale when the **round-4** fixes grew the file, and the seat then propagated the stale number into two summaries without re-measuring |
| **R5-09** | LOW | **Added by the seat's own coherence sweep.** Bare sibling filenames — `` `03b-privacy-boundary.md` ``, `` `03c-release-predicate.md` `` — appear unqualified inside the coach-cc package, which contains **no file by either name** | **CONFIRMED by the sweep** | 8 unresolved references across `03-contracts.md`, `09-tests.md`, `ADJUDICATION-R4.md`, `ADJUDICATION-R5.md`. The **live** ones are now package-qualified and the closing section states which file owns what; `ADJUDICATION-R4.md` is left as history |

**Citation accuracy — one off-by-one in the review, recorded because the discipline cuts both ways.**
Astra cited `intentClassifier.mjs:65` for the word *"dates"*. **Line 65 is `"4. Set confidence 0.0-1.0…"` —
it contains no *"dates"*.** The word appears at **`:64`** (*"3. Extract any referenced client names, dates,
times, or parameters."*) and again at **`:69`** (*"8. Parse dates naturally…"*). **The finding is unaffected
and was confirmed independently** — the template does contain *"dates"*, twice — but the citation is wrong,
and a line citation that survives a skim is exactly how a wrong line gets inherited. Corrected in this
seat's own artifacts (`03b` §8, `03c` §6.0, `09-tests.md` §5.3) to `:64`/`:69`.

**All six sites in the round-5 absorber chain were re-read this round rather than cited from memory:**
`intentClassifier.mjs:170` ✓ · `aiChatService.mjs:2034` ✓ · `aiChatService.mjs:2301` ✓ ·
`commandExecutor.mjs:565` ✓ · `aiCommandRoutes.mjs:171` ✓ · `aiChatRoutes.mjs:823` ✓. Each was printed from
the shipped file. `aiCommandRoutes.mjs:164` (`selectedClientName: null`) was re-read for the same reason.

**R5-02 is the highest-value finding of the round, and it is not a leak.** It is an **availability** failure:
under a naive whole-body zero-match rule, *every* classification request is refused. A gate that refuses all
traffic is as broken as one that leaks, and it fails in the direction that looks safe — which is why it
survived four rounds of review focused on leaks.

---

## 4. The seat's own errors this round — four, all disclosed

The pattern the seat has been charging Astra's findings with is *"the evidence was narrower than the claim."*
This round the seat committed it four times.

1. **R5-07 — a bug the seat introduced.** Markdown inserted inside a `ts` fence, in the round-4 fix pass.
   Caught by Astra, not by the seat. **Verified by extraction, then fixed.**
2. **R5-08 — a self-reported line count that had gone stale**, propagated into two summaries as fact. The
   seat did not measure before citing. Fixed by measuring, and then the fix *itself* demonstrated the deeper
   problem: **writing a file's line count into that file changes the count.** The seat wrote *"236"* and
   *"218"* from recollection, measured 240 and 192, corrected to 242, and measured 242. **The rule adopted is
   now in `03b` §9: a self-referential count is a point-in-time measurement; re-measure it, never cite it.**
3. **A false positive from the seat's own verifier.** The first fence checker flagged the `HarnessErrorCode`
   union as Markdown because TypeScript union members start with `|`. Reported `BLOCKS_WITH_MARKDOWN=1` when
   the true value was **0**. This is the **second** time this session the seat's checker measured the wrong
   property (the first was the lane-claim audit, which reported a false clean bill). **Test the property you
   mean — in both directions.**
4. **A propagation sweep keyed on one syntactic form missed a variant.** The script replacing
   `03b-privacy-boundary.md` §6 with `03c` §6 caught 10 sites and missed `06-bans.md:31`, which writes the
   path parenthesised. Found by re-grepping, not by trusting the script's success count.

**Nothing above was self-reported before Astra or a re-check found it.** That is the honest characterisation.

---

## 5. Fixes applied

### 5.1 R5-02 — the predicate is provenance-scoped (`03c` §6.0, new)

The fix is **not an exemption for templates.** The root cause is that the shipped scanner is calibrated for
**raw user dictation**, and all three of its call sites confirm it:

| Call site | Scans |
|---|---|
| `commandAudit.mjs:32` | an audit field |
| `commandExecutor.mjs:192` | `ctx.sanitizedInput` |
| `intentClassifier.mjs:175` | `message` |

**No shipped call site has ever scanned an assembled provider body.** P2 as first written would have been the
first — feeding the detector an input class it was never calibrated for, where *dates*, *parameters*,
*history* and *confidence* all sit within Levenshtein-3 of the medical vocabulary at `phiScanner.mjs:39-44`.

The contract now defines three **provenance classes** — **U** (user), **O** (operator, versioned), **P**
(pipeline) — and scopes the detector: the **fuzzy** pass runs on **U and P only**; **O** is checked by
**exact match plus a version hash**. An O segment that fails the hash is a **rejection**.

**The structural boundary already exists:** `intentClassifier.mjs:125-134` dispatches
`{role:'system', content: systemPrompt}` — pure **O** — and `{role:'user', content: contextualMessage}` —
**U + P**. The contract uses that shipped separation rather than inventing one.

**Honest limit, stated in the contract:** the alternative — recalibrating `phiScanner.mjs` itself — is a
`backend/` change, which `03b` §5 already gates on the operator ruling. **Neither route was taken
unilaterally.**

### 5.2 R5-01 — `previousContext` becomes server-held state

The caller no longer supplies `previousContext` in any form; the server reconstructs prior turns from the
transcript it owns, referenced by conversation id. This closes the contradiction **by construction** rather
than by a check: a caller cannot express an unadmitted turn because it cannot express a turn at all. It also
closes **C5**'s R2-01 exposure as a side effect.

### 5.3 R5-03 — the absorber chain extended from four sites to six

`aiChatService.mjs:2301` (Pro→Flash retry ignoring `err.code`) and `aiChatRoutes.mjs:823` (generic 500) added,
in both packages. "Non-retriable" is restated as **four** obligations, now including **another model** and
**a generic 500**. The contract also records the shipped precedent:
`intentClassifier.mjs:173-184` **already** re-checks PHI and blocks instead of falling back — so the pattern
the fix requires is already acceptable to this codebase.

### 5.4 R5-05 — one disposition per fixture

The disjunction is replaced by three named dispositions — **REFUSED** (zero dispatches), **DROPPED** (canary
absent **and** one dispatch), **PRESENT** — with the rule stated: **REFUSED and DROPPED are never
alternatives for one fixture**, because they are different assertions with different call counts.

A **new §5.4** records the deeper problem the fix exposed: **the contract and the shipped code state
different dispositions.** `commandExecutor.mjs:196-204` **strips** PHI and continues; `intentClassifier.mjs:176`
**blocks**. The two shipped sites disagree with each other. Reconciling them is the operator decision in `03b`
§5, and until it is made the T-04 fixtures assert the **contract's** disposition and are expected to fail
against the shipped code — which is what a specification is for.

### 5.5 R5-04 — one shared matrix, one scoped rule

The superseded *"no identifying content crosses"* rule is replaced: the boundary must **reject an
inadmissible input, or provide evidence the input was admissible.** "No identifying content crosses" would
make every legitimate message containing a client name a defect — **a test that can only be satisfied by
breaking the product.** `:76` is scoped to the **telemetry/recording** channel it actually names. The canary
matrix is defined **once**, in the sibling, and **referenced** from the coach-cc package.

### 5.6 R5-06 and R5-08 — the split, and the version

`03b` was **298/300**. Its own §9 instructs a split. §6–§7 were extracted to
**`BLUEPRINT-swan-coach-live-2026-09-20/03c-release-predicate.md`** (192 lines); `03b` is now **242**. The id
moved to **`@1.1.0`** because the predicate's meaning changed. The bump was propagated to **11 sites across 7
live files**, with `ADJUDICATION-*.md` deliberately **not** rewritten — they are historical records of what a
round did.

### 5.7 R5-07 — the fence

Closed after `HarnessError`, reopened before `ConfirmationV2`. **Verified by extraction:**
`BLOCKS_WITH_REAL_MARKDOWN=0`, `FENCES_BALANCED=true` across all 5 blocks.

---

## 6. Not fixed — named, with the reason

| Item | Why not |
|---|---|
| **The production behaviour change** (`backend/`) | Astra's own PART E condition 1 gates it on **Sean's R2-01 operator ruling**. Four rounds old and still open. **No file under `backend/` was modified.** |
| **The provider-envelope wire schema** | **Not supplied in any reviewed artifact.** `03b` §2 states the allowlist is not implementable until it is captured. S0 prerequisite |
| **Recalibrating `phiScanner.mjs`** | A `backend/` change, operator-gated (above). The contract route was taken instead |
| **`lane-staged-guard.mjs:95`** — `c.replace(/\/?\*+$/, '')` strips `*` but not a bare `/`, so a `dir/` claim covers nothing | **14 void claims across 6 of 85 lane files**, one on a **live** lane. A shared gate; one-line fix identified, **not applied** — it is not this package's file |
| **Rule 86 archival for rounds 4 and 5** | Astra cannot file; the seat has not yet filed. **Owed** |
| **The `rm` shim → hook timeout → orphaned `index.lock` chain** | Root-caused and measured (23,185 ms vs 1,443 ms, 16×); remedy is `unset -f rm`. A Hermes packet was filed. Not a package fix |

---

## 7. Novelty

Rounds 1–3 found **leaks**. Round 4 found a **leak in a check written the same round** (R4-02, the
JSON-escaping false negative). Round 5 found the **inverse failure**: a gate that would refuse all traffic
(R5-02). **The two are the same defect seen from both sides — a detector applied to an input class it was
not calibrated for.** Round 5 is the first round whose highest-severity finding is an **availability**
failure rather than a privacy one.

**Also new this round:** the discovery that the shipped pipeline holds **two contradictory dispositions** for
PHI in user text (`commandExecutor` strips; `intentClassifier` blocks). No prior round named this, and it is
the reason R5-05's disjunction was dangerous rather than merely imprecise.

---

## 8. Status

**Round 5: `REVISE` — 7 findings, all confirmed, all fixed.** `ADJUDICATION-R5.md` is written; the round-6
packet is next.

**The loop has not converged.** Rounds 3, 4 and 5 each returned new findings (5, 5, 7). "Run dry" means a
round that returns **no new findings**; that has not yet happened.

**Every count, hash, line number and code sample in this document was measured against the shipped source or
the actual artifact.** Where a claim could not be reproduced it is marked as such.
