---
decision: "privacy-boundary@1.2.0 — the release predicate is provenance-scoped: the full detector runs on user-authored and pipeline-assembled text, operator-authored STATIC content is admitted by content-hash identity against a versioned registry and is NEVER content-scanned, and previousContext is server-held state referenced by id rather than a caller-supplied array."
status: open
supersedes: "03b-privacy-boundary.md §6 (release predicate) — extracted in round 5 to respect the 300-line cap, corrected by R5-01 and R5-02, then corrected again by R6-01/R6-02/R6-03. §7 (context channels) was extracted onward to 03d-context-channels.md in round 6."
---

# 03c — The release predicate

**Why this file exists.** Round-5 **R5-08** measured `03b-privacy-boundary.md` at **298 lines against the
300-line cap** (`06-bans.md` §1, by `wc -l`) — **two lines of headroom, not the seven its own §9 claimed.**
That §9 instructed that the next substantive addition **split the contract** rather than breach the cap, and
the round-5 fixes are substantive. §6 was extracted here. Nothing was deleted.

**Round 6 then repeated the same failure one level down, and the record matters.** Round 6 measured **this
file at 309 lines against the same cap**, while §8 of this file simultaneously asserted *"It remains under
the cap."* The breach and the false assertion were both this seat's. §7 was extracted onward to
**`03d-context-channels.md`** in round 6 — the split §8 had already prescribed — and §8 was rewritten to
state no number. **A size claim is a measurement with a shelf life of one edit; this file no longer makes
one.**

**Contract id `privacy-boundary@1.2.0`.** Three steps, and the middle one was a correction of the first:
`@1.0.0` → `@1.1.0` at round 5 (**R5-06**, where the meaning *did* change and the id had not moved for several
rounds), then `@1.1.0` → `@1.2.0` at **round 6 (R6-01/R6-02/R6-03)** — O admission moved from exact content
matching to **hash identity**, interpolation was reclassified, and the transcript was separated from the
admission record. Round 7 (**R7-05**) carried no further bump: it corrected *how* the round-6 classes are
described (a substituted value takes its source's provenance) without changing what is admitted. The rule is
in `03b` §1 — *an id moves when the meaning changes*, which is why the `03d` split moved no id while the round-6
semantics change did. `03b` §1–§5 and §8–§9 remain the authority for the gate, its placement, failure
propagation and the canary assertions.

---

## 6. The release predicate — what "privacy is established" means (R3-03)

Rule 3 in `03b` §5.1 previously said *"if privacy cannot be established"* without ever defining
**established**, while rule 5 removes regex coverage as proof. That left the condition that **licenses
sending** undefined. A fail-closed gate whose success branch is unspecified cannot be implemented or tested.

### 6.0 Provenance — the distinction the predicate turns on (round-5 R5-02)

Round 5 found, and this seat **independently reproduced**, that the shipped detector **flags the
classifier's own fixed template**:

```
$ node tmp/coach-cc-ai-harness-20260920/probe-r5-template-vs-scanner.mjs
FLAGGED  the fixed template ALONE          ["dates (≈diabetes)"] ["medical_fuzzy"]
R5_02_CONFIRMED=true
TEMPLATE_TRIPS_SCANNER=true
```

The template is extracted **verbatim** from `intentClassifier.mjs:59-90`, not retyped. The word *"dates"*
appears at `:64` and `:69`. `fuzzyMatchPHI` (`phiScanner.mjs:81-96`) accepts it as approximately *"diabetes"*:
`|5 − 8| = 3` is not `> 3`, so the length guard passes, and `levenshtein("dates","diabetes") = 3 ≤
ceil(8 × 0.3) = 3`. **Under a whole-body zero-match rule (P3 as first written), every classification
request would be refused.** That is an availability failure, and it is distinct from a leak.

**Root cause, and it is not "templates are special".** The shipped scanner is **calibrated for raw user
dictation** — all three of its call sites scan user-derived text and nothing else:

| Call site | Scans |
|---|---|
| `commandAudit.mjs:32` | an audit field |
| `commandExecutor.mjs:192` | `ctx.sanitizedInput` |
| `intentClassifier.mjs:175` | `message` |

**No shipped call site has ever scanned an assembled provider body.** P2 as first written would have been
the first, and it would have fed the detector an input class it was never calibrated for. Fuzzy matching on
ordinary English prose is a **false-positive generator by construction**: *dates*, *parameters*, *history*
and *confidence* all sit within Levenshtein-3 of the medical vocabulary at `phiScanner.mjs:39-44`.

**The predicate is therefore scoped by provenance.** Every byte in the outbound body carries exactly one:

| Class | Authored by | Examples | Regime |
|---|---|---|---|
| **U — user** | the user, this submission or a replayed admitted turn | `message`; a replayed admitted turn's content | **full detector, including fuzzy** — the calibrated regime; fuzzy is load-bearing for dictation misspellings |
| **O — operator, APPROVED** | the operator — **whether static in a template or substituted from an approved registry** | the classifier's fixed template (`intentClassifier.mjs:59-90`); the Coach condition-protocol templates (`aiChatService.mjs:236-253`); **the command registry's own descriptions and patterns** (`commandRegistry/clientCommands.mjs:149`); enumerations; boilerplate | **content-hash identity against the approved registry — NOT content-scanned** (round-6 **R6-01**, corrected by round-7 **R7-01**) |
| **P — pipeline** | the boundary's own **generation** | `buildRouteContextLine` prose; derived fields; any text the boundary composes itself | **full detector**; P is admissible **only** if every input to that generation was itself admitted |

**Round-6 R6-01 killed the first version of this table, and the reason is the whole point.** It said O is
checked by *"exact match against the enforced pattern set, plus a version hash."* **That is wrong, and a
shipped template proves it.** The Coach chat templates are **health-condition protocols** —
`aiChatService.mjs:241` reads `- If on Metformin: supplement B12 (Metformin depletes B12)`, and the admin
template carries a sample phone at `:995`. The shipped regex set flags all of it:

```
FLAGGED  shipped chat template: on Metformin   ["on Metformin","depletes (≈diabetes)"]
FLAGGED  shipped chat template: on insulin     ["on insulin"]
FLAGGED  sample phone in admin template        ["555-123-4567"]
```

**An exact-match pass over operator clinical content cannot succeed, because the vocabulary IS the content.**
A coaching product that discusses diabetes, insulin and Metformin will always trip a detector built to notice
those words — and note that *"depletes"* was also flagged as ≈*"diabetes"*, so the fuzzy problem was never
confined to the fixed classifier template either. **So O is not content-scanned at all. O is admitted by
IDENTITY**: its bytes must hash to an approved, versioned entry in the registry. Content scanning is the
wrong instrument for content the operator authored and approved; a hash is the right one.

**Round-7 R7-01 found that the R6-01 fix was HALF a fix — and the half it missed is the more general one.**
Round 6 scoped the *static template* bytes to hash identity but left **"every interpolation result"** in **P**,
and therefore fully scanned. That made provenance depend on the **mechanism of arrival** (was the value
substituted?) rather than on the **source** (who authored it?). The shipped command registry is
**operator-authored, approved content that arrives by substitution** — and it trips the detector:

```
$ node tmp/coach-cc-ai-harness-20260920/probe-r7-commandlist-and-composition.mjs
[premise ok] admin command list = 11453 chars
FLAGGED  role=admin            chars=11453 ["all (≈ACL)","summary (≈surgery)"]
FLAGGED  role=trainer          chars=8827  ["all (≈ACL)","summary (≈surgery)"]
clean    role=client           chars=1169
FLAGGED  role=(no role filter) chars=12373 ["all (≈ACL)","summary (≈surgery)"]
ROLES_WITH_FLAGGED_COMMAND_LIST=3/4
R7_01_CONFIRMED=true
```

Attributable lines, from the **shipped** builder (`baseSchemas.mjs:137-143`), not retyped:

```
["all (≈ACL)"]        <- list_active_clients: Show all active clients (e.g., "show me all active clients")
["all (≈ACL)"]        <- export_client_list: Export all clients as a list (e.g., "export client list")
["summary (≈surgery)"] <- brief_client: Brief me on a client — cross-domain status summary with attention flags
["all (≈ACL)"]        <- list_trainers: Show all trainers (e.g., "show me all trainers")
```

**"all" is Levenshtein-1 from "ACL"; "summary" is Levenshtein-1 from "surgery."** Both are ordinary English
words in ordinary operator prose, both are in `PHI_TERMS` (`phiScanner.mjs:39-44`), and the length guard at
`phiScanner.mjs:85` admits a three-character term against a three-character term. Note also that the
**client**-role list is **clean** — a fourth instance of the partial-failure pattern (`03d` §7.1, R6-01),
where a gate that passes some inputs looks like it is working.

**The rule, stated once and generally: a substituted value carries the provenance of its SOURCE, never of the
act of substitution.** An approved registry entry substituted into a template is **O** and is admitted by hash
against the registry. The pipeline's **own** prose is **P** and is scanned. **"Interpolation" is a mechanism,
not a provenance class** — round 6 conflated the two, and the same defect class has now recurred in three
consecutive rounds, each time one level down: the fixed template (R5-02), the Coach protocols (R6-01), the
interpolated registry (R7-01).

**This is still not an exemption, and round-6 R6-07 is why.** Round 5 asserted the O check was *"load-bearing"*
while specifying a check a bypass gate could skip entirely — **the R5 assertion pair passes with ZERO O
inspections and ZERO hash checks.** *An O check that is never exercised is not a check.* Required negative
controls (`09-tests.md` T-04.14):

1. **Altered static bytes** — one character changed in an approved template ⇒ **REFUSED**;
2. **Unknown version** — a template id/version absent from the registry ⇒ **REFUSED**;
3. **The hash check disabled** ⇒ **the suite must FAIL.** *A control that passes when the mechanism is
   removed is not testing the mechanism.*

**Substituted values and generated values are classified SEPARATELY (round-6 R6-02, corrected by round-7
R7-01).** Round 5's table said "interpolation results" are **P** while `03d` §7.1 called the interpolated
scheduled-session block an **O**-class assembly — **the same bytes, two classes, in one file.** The rule:

- **the hash covers the STATIC template bytes** — immutable, version-identified;
- **a substituted value carries the provenance of its SOURCE, not of the substitution.** An approved registry
  entry is **O** and is hashed against the registry; text the boundary **generates** is **P** and is scanned.
  Round 6 wrote "each interpolated value … is scanned as U or P", which put approved operator content through
  the detector and is what R7-01 reproduced;
- **the rendered output is never what is hashed.** Reproduced: two valid session inputs produced **different
  rendered hashes**, so a hash over the rendered block proves nothing about which bytes were approved;
- **the mapping must survive assembly — and it needs an INTERFACE.** The boundary records, per segment, *which*
  approved template and *which* admitted values produced it. A block whose provenance cannot be resolved is
  **rejected**, not scanned-and-hoped. **Round-7 R7-03: the proposed `buildProviderMessages` still returns
  plain `{role, content:string}[]`, which cannot carry that map.** A `string` cannot carry provenance, so the
  contract must specify segment metadata or a sidecar **and** its preservation through every transformation.
  Until it does, the requirement is unimplementable as written;
- **per-segment admission does NOT replace a composition check (round-7 R7-03).** A signal can exist **only in
  the adjacency** of two individually-clean segments, so independent per-segment checks cannot see it:

```
$ node tmp/coach-cc-ai-harness-20260920/probe-r7-commandlist-and-composition.mjs
fragments individually:
clean    202
clean    555
clean    1234
FLAGGED  202-555-1234   <- the concatenation
CONCAT_ONLY_SIGNAL=true
```

**The composition check is a DIFFERENT question from content scanning, and it must be stated as such.** It asks
*"does a prohibited signal exist only because two segments are adjacent?"* — not *"does any segment contain
prohibited vocabulary?"*. Keeping the two questions separate is what makes the check implementable without
re-introducing the false positives of R5-02, R6-01 and R7-01. **P2 in `03b` §3 is restated accordingly.**

**The structural boundary partly exists, and `role` is not sufficient.** `intentClassifier.mjs:125-134`
dispatches `{role:'system', content: systemPrompt}` and `{role:'user', content: contextualMessage}`. But the
**system** message contains static O *plus* the `${commandList}` interpolation, and the **user** message is
U *plus* pipeline prose. **`role` alone cannot resolve provenance** — the boundary must track segments, not
infer them from the role.

**Honest limit.** This is a **contract-level** resolution. The alternative — recalibrating `phiScanner.mjs`
(word-boundary anchoring, a stop-list, a minimum term length, and separating *"a user discloses a condition"*
from *"an operator documents a protocol"*) — is a change under `backend/`, which `03b` §5 gates on the
operator ruling. **Neither is taken unilaterally here.**

```
SEND is licensed iff ALL hold:
  P1   every contributing input passed the admission schema, pre-assembly (§6.1)
  P2   the assembled body was inspected PER PROVENANCE CLASS (§6.0) and the inspection COMPLETED
       (no throw, no timeout)
  P2c  the COMPOSITION check ran and found no prohibited signal that exists only in the
       ADJACENCY of segments (round-7 R7-03). This is a different question from P3 and is
       NOT implied by it: per-segment admission cannot see a signal created by concatenation
  P3   zero prohibited content, evaluated PER CLASS:
         U, P → the full detector returns no match
         O    → the segment's bytes HASH to an approved, versioned registry entry.
                O is NOT content-scanned — round-6 R6-01.
                A SUBSTITUTED approved value is O: provenance follows the SOURCE,
                never the act of substitution — round-7 R7-01
  P4   the assembled body contains only allowlisted fields, after P1 (`03b` §2)
  P2b  the inspected text is bound to the exact bytes that will be serialized (`03b` §3)
```

**P5 is deliberately NOT a clause of the predicate.** Round-4 **R4-01**: *"every rejection path is typed and
non-retriable"* is a property of the **implementation**, verified once at build time — putting it in the
predicate made a build-time obligation look like a per-request runtime check. It is an **implementation
obligation** (`03f-absorber-chain.md` §5, **eight** sites) with API-level assertions (`09-tests.md` T-04.7/T-04.9).

### 6.1 Admission, 6.1a the two stores, and 6.2 the predicate's limits - moved to `03e-admission-schema.md`

The whole of **6.1** (the admission schema P1 applies), **6.1a** (*"server-held" is not "admitted"*, the
transcript/admission-record split, and the record's producer contract) and **6.2** (why a successful detector
invocation is not the release predicate) now lives in **`03e-admission-schema.md`**, under the same contract
id `privacy-boundary@1.2.0`. **Nothing was deleted, and the section numbers did not move** - exactly as 7 kept
its number when it went to `03d`. Existing `6.1`/`6.1a`/`6.2` references stay meaningful; only their file
component changes.

**Why this split happened, stated plainly because it is this seat's own failure.** Round 7's fixes added the
**R7-04 producer contract** to 6.1a. Section 8 of this file had just been rewritten to *refuse* to state a
size - *"a document cannot reliably assert its own length"* - and that rewrite was correct, but **refusing to
measure is not the same as staying small.** The file measured **353 lines against the 300-line cap** when
this round's edits landed. Section 8's rule was never *"stop counting"*; it was *"run the check instead of
asserting a number."* This seat had replaced an assertion with a promise and then stopped looking. The check
is still one command, and it is in section 8 below.

---

## 7. The context channels - moved to `03d-context-channels.md`

Section 7 - the C6 split, the seven fields `buildRouteContextLine` actually emits, the DOB-shaped-date
finding, and the second emitter at `aiChatRoutes.mjs:710` - now lives in **`03d-context-channels.md`**, under
the same contract id `privacy-boundary@1.2.0`. It was extracted in round 6 when this file reached **309 lines
against the 300-line cap** (see section 8). **Nothing was deleted.** Section 7 keeps its number, so existing
references to it remain meaningful and only their file component changes.

---

## 8. Size

**This file makes no claim about its own length, and the reason is now written down twice.**

The rule (`03b` section 9) is that a document cannot reliably assert its own size, because the sentence
stating the number is part of it. But round 7 proved the **converse** failure, which this section had not
guarded against: after the round-6 rewrite stopped asserting a number, this file grew from **309 to 353
lines** across rounds 6 and 7 and **nothing noticed**, because a section that refuses to state a number is
also a section that no longer makes anyone look. **The remedy is the command, not the prose:**

```bash
wc -l 03b-privacy-boundary.md 03c-release-predicate.md 03d-context-channels.md \
      03e-admission-schema.md 03f-absorber-chain.md
# every file must be <= 300 (06-bans.md section 1)
```

Run it after **every** substantive addition to the privacy-boundary contract, before the round's findings are
declared applied. `03c` now measures well under the cap; `03e` was created by round 7 for exactly this reason.

**The next substantive addition to this contract should be assessed against all four files before being
written into any of them** - the R2-10 failure this package has now paid for three times.
