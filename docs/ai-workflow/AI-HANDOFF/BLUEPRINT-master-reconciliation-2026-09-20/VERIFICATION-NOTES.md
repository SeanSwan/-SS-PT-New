# VERIFICATION NOTES — adjudication of every A1 and A2 finding

**Read this first.** This is the entry point to the package's review record.
**Adjudicated by:** the package filer (not Astra). Astra issued findings; it did not adjudicate them.
**Adjudication instant:** 2026-09-20T17:35-07:00, at HEAD `32a9c0b91`.
**Companion:** `HOSTILE-REVIEW.md` (Astra's PART A, unaltered).

## Method and the rule applied

Every finding was reproduced against shipped source or measured on this machine before being
marked resolved. **Nothing was relayed unchecked, and nothing was edited into correctness.** Where I
disagree with Astra, the disagreement is recorded as a disagreement.

Status vocabulary:

- **RESOLVED** — the named fix exists and I verified it at the cited location.
- **PARTIALLY RESOLVED** — the fix exists but a named remainder is genuinely outstanding.
- **OPEN — operator** — the fix requires an operator decision or a lane's own work; not mine to close.
- **REJECTED** — I measured the claim and it does not hold.

Astra's own labelling was careful (`[VERIFIED]` / `[LIKELY]` / `[HYPOTHESIS]` / `[UNKNOWN]`, and it
refused to invent line numbers). That discipline is preserved here: **no line number appears below
that I did not read.**

## Closure arithmetic — counted from the headings, not summarised

| Verdict | Count | Findings |
|---|---|---|
| **RESOLVED** | **8** | A1-01, A1-03, A1-04, A1-05, A1-06, A1-07, A1-08, A1-10 |
| **PARTIALLY RESOLVED** | **1** | A1-02 |
| **OPEN — operator** | **1** | A1-09 |
| **REJECTED** | **0** | — |

**Correction, 2026-09-21.** An earlier revision of `MANIFEST.md` summarised this as *"9 resolved,
1 open by design, 0 rejected"*. **That is wrong.** A1-02 is `PARTIALLY RESOLVED`, not resolved, and
the A1 verdict headings in this document have said so since they were written — the miscount was in
the summary line, never in the adjudication. It was caught by the round-2 hostile review (R2-01) and
is recorded here rather than quietly corrected. **Count the verdicts from the headings below.**

**This document now has three parts.** PART A (below) adjudicates the ten A1 findings. PART B
adjudicates the six A2 findings. **PART C**, at the end, records the round-2 hostile review
(Astra, 2026-09-21): its `DEFECTS-FOUND` verdict, the binding of its input and output, the
adjudication of all twelve R2 defects, and the three checker code defects carried open with the
reviewer's own named fix. **A verdict in PART A is a filer verdict. PART C is where a hostile
reviewer attacked it.**

---

## PART A — the ten A1 findings

### A1-01 — High — False enforcement across lanes · **RESOLVED**

Astra: the specified controller is absent, yet concurrent writers remain active; a written freeze
cannot establish that a native hook blocks their edits. Fix: select an explicitly manual workflow and
amend the actual canonical mandate to remove active controller/hook claims.

**Verified absent.** A pruned repo-wide search for `workflow*.mjs` / `workflow*.js` (excluding
`node_modules`, `.git`, `graphified`, `generated`) returns only unrelated hits: a skill's
`workflow-guardrails.test.mjs` and historical *evidence* copies inside a salvage worktree's
`docs/.../workflow-repair/` directory. `git ls-files` contains no `scripts/workflow.mjs`,
`scripts/workflow-policy.mjs` or `scripts/workflow-hook.mjs`. **`.git/hooks/` contains no active
hook** — only `.sample` files.

**Fix applied.** The canonical mandate at
`C:\Users\BigotSmasher\.agents\standards\MAKEER-BLUEPRINTS.canonical.md` had its section
`### Installed mechanism and usage` replaced by `### Admission mechanism and usage — manual protocol,
NOT an installed controller` (new text at `:211-244`). It now states `Status: NOT INSTALLED`, names
the three non-existent scripts, and states plainly that no native enrollment, write-blocking or
runtime enforcement is claimed.

- Prior text preserved verbatim: `MANDATE-PRIOR-SNAPSHOT.md`,
  sha256 `e41046d19a9f364349ef7aa03173542a32f0b1e64407dccd151d05b5595b9e49` (22,286 B, 336 lines).
  Snapshot re-hashed after copy — identical.
- Post-amendment mandate sha256 `58f5aad81da815a72f7aaff3df0ea1cdd8d50876ca673f80529bf89f043208a0`
  (22,441 B). *(An earlier revision of this document recorded `0558ae92…`, which was the hash
  taken **between** the two edits — after the section replacement but before the pointer warning
  was added. It was never the final state. Corrected here; the archive record carries only the
  prior-snapshot hash and was not affected.)*
- **A1-01's fix was initially incomplete, and that is recorded rather than tidied away.** The
  mandate exists in **triplicate** in that repo, and all three copies were byte-identical before
  the amendment (`e41046d1…`): `standards/MAKEER-BLUEPRINTS.canonical.md`, `MAKEER-BLUEPRINTS.md`,
  and `skills/non-vibe-coding/references/makeer-blueprints.md`. The first pass amended **only the
  canonical copy**, leaving the false `Installed mechanism` claim live on two other paths that a
  reader could equally well open. All three now carry the identical replacement text. The
  triplication is itself a finding: three copies of one authority with no pointer relationship
  means any future amendment must be applied three times or it silently diverges.
- **No second file with the same basename was created** — the contract's explicit prohibition.
- A residual contradiction was found and is disclosed rather than silently fixed: the
  `non-vibe-coding` skill's `references/workflow-usage.md` (29,865 B) is an operator contract whose
  own head calls it "the operator contract for the existing `workflow.mjs` controller". The mandate
  points readers at it. I did **not** rewrite the skill — it is shared and may be accurate where a
  controller is installed — but the amended mandate now carries an explicit **pointer warning** so a
  reader who follows it is not misled in this repo.

### A1-02 — Critical — L6 preservation equivalence unproven · **PARTIALLY RESOLVED**

Astra: L6 contains uncommitted, ignored work; the registered salvage worktree and the lane's original
source directory are different locations whose equivalence is unknown. Treating the salvage worktree
as proof of preservation could strand a unique version. Fix: inventory and preserve each candidate
independently; start a provisional rescue immediately; then obtain writer quiescence, reconcile
inventories, verify stable copies.

**Provisional rescue: done and independently verified.** M0 preserved **212 files across 5
independently inventoried candidates** — 3 from the registered salvage worktree
(`tmp/worktrees/brain-console-salvage-20260918`) and 2 from an **orphaned, unregistered** second
worktree (`tmp/worktrees/brain-console-20260913`). **5/5 copies agree** across two storage failure
domains: `C:/tmp/master-blueprint/preservation/L6/r0001` (storageId
`C-Disk3-SabrentRocket4-1TB-NVMe`) and `S:/blueprint-preservation/L6/r0001` (storageId
`S-Disk1-WDBLACK-SN850X-2000GB-NVMe`). Four physically distinct disks confirmed via
`Get-Disk`/`Get-Partition` (C:=3, S:=1, P:=0, Z:=2), all `DriveType=Fixed`, none network. Records:
`evidence/r0001/inventory-S-L6-*.json` (5), `storage-attestation.json`,
`preservation-records.json`. Copy-only; nothing deleted.

**Astra's prediction was correct, and worse than assumed.** The orphaned `brain-console-20260913`
worktree carries a **divergent** copy — 17 vs 65 files in the console scope. Had the registered
salvage worktree been accepted as proof of preservation, that divergence would have been lost. This
is now the concrete evidence for A1-02 rather than the hypothesis it was filed as.

**Remainder outstanding (why not RESOLVED):** Astra's second phase — *writer quiescence, reconciled
inventories, verified stable copies* — is not complete. L6's writer is quiet but not formally
declared quiesced, and the inventory divergence between the two worktrees is **explained, not
reconciled**. L6 also reports its console as "12 files, 2,840 lines" while measurement gives **65
files / 10,387 `.mjs`+`.js` lines**. That gap is disclosed in the register but unresolved.

**Honest limit:** preservation is **single-machine, device-level only**. Two NVMe devices in one
chassis are not two failure domains in the sense that survives fire, theft or controller failure.

### A1-03 — High — `S5 BUILDABLE` must not become admission · **RESOLVED**

Astra: `S5 BUILDABLE` is a lane-local claim and the archive records an L4 correctness review with
`DEFECTS-FOUND`; a master queue must not promote that label into current admission.

Verified at `00-README.md:71-78`: every one of the eight lanes' *Product implementation admission*
column reads **Blocked**, each with its own named reason. L4's row (`:74`) reads *"Blocked: exact
current reviewed revision and defect disposition absent."* No lane receives implementation admission
from this package, and `00-README.md:3` carries `Status: PLAN ISSUED — ADMISSION BLOCKED` with
`Implementation verified: No`.

### A1-04 — High — Unverified ≠ absent; require adopt/extend/preserve · **RESOLVED**

Astra: eight unverified implementations do not imply eight absent implementations; treating these
lanes as greenfield risks duplicate systems. Fix: require an adopt/extend/preserve classification
before each lane slice.

**Fix applied, and the finding was vindicated at scale.** `11-lane-test-index.md` now classifies the
three lanes that had no test document, by measuring rather than assuming:

- **L3 — PRESERVE + ADOPT.** Astra's warning was correct and understated. Two checkpoint-**PASSED**
  slices (`72acf8cd3`, `6238e3a65`; both verified present) are stranded on `codex/cortex-phase1`:
  **2,267 insertions across 22 files**, including 281 lines of tests. That branch is **not merged into
  `main`**, **not contained in HEAD**, **640 ahead / 581 behind**, last committed **2026-07-14**.
  Against HEAD, L3's own test filters match **0** files. Rebuilding Slices 1–2 would duplicate 2,267
  lines and discard two passing suites.
- **L5 — EXTEND.** `backend/services/automationService.mjs`, `backend/routes/leadRoutes.mjs` and
  `backend/routes/automationSafetyRoutes.mjs` all exist, and the two regression suites S3 requires
  (`backend/__tests__/automationService.triggerLead.test.mjs`,
  `automationService.preview.test.mjs`) are already on disk. Only the email layer is absent.
- **L7 — GREENFIELD.** `mobile/` has **0 tracked files**. Every criterion is `NOT YET BUILT` — a
  different state from a missing document.

The `00-README.md:71-78` table already refuses admission; the classification now supplies the
evidence for *how* each lane should be admitted rather than rebuilt.

### A1-05 — High — Aliases, supersession and authority are different concerns · **RESOLVED**

Astra: a universal "old path redirects to new authority" rule would collapse distinct concerns. Fix:
one registry with separate fields for canonical paths, aliases, document status and authority scope;
keep L6's `MEGA-BLUEPRINT.md` authoritative inside L6.

`package-registry.json` (38,570 B, 8 lanes) carries exactly the separated fields:
`canonicalPackagePath`, `aliases`, `authorities[{path,scope,precedence}]`,
`documents[{path,status,supersededBy,permittedUse}]`, with `precedence` unique within a lane. It was
**generated from `readdirSync` rather than typed**, so a non-existent path cannot be written down —
a deliberate anti-fabrication measure. Verified: all 8 canonical paths exist, no path collisions, no
case-insensitive collisions. L6's rejected August merge document is `REJECTED` and is **not** an
authority (README rule 6), evidenced by L6 `00-README.md:7`.

### A1-06 — High — No proven runtime dependency edges · **RESOLVED**

Astra: shared product vocabulary is insufficient to prove L2 consumes L3, or that L4 consumes L3
events. Fix: separate mandatory gates, scheduling priorities and conditional dependencies; a
conditional edge becomes hard only when a frozen caller/contract receipt proves it.

`01-architecture.md:127-139` classifies every edge and gives the bounded rule. Mandatory:
L6 provisional rescue → stable preservation (`:127`), shared admission substrate → every
implementation slice (`:128`), L6 verified preservation → L6 integration (`:129`), L8↔L1 boundary
gate if overlap is confirmed (`:133`), shared API change → L7 revalidation (`:137`). Conditional,
hard only on a bound consumer receipt: L3→L2 (`:134`), L3→L4 (`:135`), L6 fleet→L1 (`:136`).
And `:139` states the bounded skip rule explicitly: until a consumer receipt proves a conditional
edge, it must not block an independent lane indefinitely nor justify an unreviewed integration.

### A1-07 — High — X7 is dated; do not infer compatibility from peer ranges · **RESOLVED**

Astra: X7 provides no tested replacement cohort, no complete transitive compatibility evidence, no
React 19 runtime results; the `framer-motion`/`motion` row spans different package names. Fix: carry
the measurement unchanged as baseline; require an exact lockfile cohort and import/API audit.

Both instruments now exist and were validated:

- `scripts/dependency-version-receipt.mjs` implements the Resolve leg (declared / locked /
  installed side by side, with the correct rule that only locked≠installed is a defect). Measured on
  `frontend`: **74 declared deps, 0 drift, 0 locked-but-absent**. Note `typescript` declared `^5.3.3`
  → installed **5.9.3**, a 5.3→5.9 jump.
- `scripts/intake-reach.mjs` (8,668 B) implements the Reach leg — importers by module specifier,
  static *and* dynamic (`import … from`, side-effect `import '…'`, `export … from`, `import()`,
  `require()`), comments stripped, counting distinct importer **files**. It **reproduced the packet's
  hand counts exactly** for `victory 87`, `date-fns 13`, `moment 7`, `three 5`, `socket.io-client 5`
  — and disagreed with the naive method in the correct direction (naive over-counts) for every
  package. That is the discrimination A1-07 asked for.

X7 is carried unchanged as the planning baseline. L1 A remains independent.

### A1-08 — Medium — L3/L5/L7 lack a separately named test document · **RESOLVED**

Astra: whether their existing documents already contain usable tests is unknown; missing filenames
are not proof that testing content is absent. Fix: produce a lane test index by first mapping
existing tests and acceptance criteria.

**`11-lane-test-index.md` issued.** It maps every acceptance criterion for L3, L5 and L7 to its named
artifact and measures each against `git ls-files` at HEAD (13,034 tracked files), and — where absent
from HEAD — against the lane's own build branch via `git ls-tree`. The "absent from HEAD ≠ absent"
distinction is the document's central method, and it is what surfaced the L3 find.

Coverage gaps **established** (not assumed): L3 Slices 3–5 have no test file anywhere; L5 has 5
absent suites and 3 absent source modules while its substrate exists; L7's entire application is
unbuilt. Astra's caution held — L5's criteria give `__tests__/…` and `tests/api/…` while the real
suites live in `backend/__tests__/`, so the lane's own relative paths are not all resolvable as
written. That path drift is recorded, not silently normalised.

### A1-09 — High — L7's unchanged-API boundary · **OPEN — operator**

Astra: L7's inherited boundary is an unchanged existing API and no web modifications; its endpoint
contracts are not supplied, so a master "shared API improvement" could silently violate that lane
decision. Fix: freeze the API contract used by mobile before Phase 1/2 admission; if mobile needs
backend changes, block that requirement and obtain an explicit scope amendment.

**This is genuinely open and I am not closing it.** The reason is measured, not procedural: there is
no contract to freeze, because `mobile/` does not exist (0 tracked files) and L7's phases 3–6 are
roadmap-only. The freeze is a **precondition of L7 Phase 1/2 admission**, and it is recorded as such
in the test index §4. The concrete risk is named there: AC-0.3.2 asserts `/api/workout/sessions`
**mount order**, and AC-0.3.3 requires `git diff --stat` to show only the new test file — mount-order
assertion is precisely where a well-meant shared API change would breach the lane boundary.

### A1-10 — High — The caller files this review and records its archive ID · **RESOLVED**

Astra: the archive summary supplies verdicts and IDs, not review bodies or reviewed bytes; this
response cannot establish that an old defect is closed or that a new package is filed.

Filed to `Z:\HostileReviews` under Rule 86 with the standard header and the `Snapshot-SHA256:`
binding line. **Archive ID and the binding hash are recorded in the filing receipt section below.**
The master review does not supersede any lane review; each lane's later admission still requires its
own applicable review, revision binding and resolution evidence.

---

## PART B — the six A2 findings (fixes reflected in the emitted package)

Each was checked against the emitted documents, not against the review's own claim that it was fixed.

| ID | Astra's draft defect | Verified reflection |
|---|---|---|
| A2-01 | Requiring a fully stabilized source before taking any L6 copy would prolong data-loss exposure. | **Verified.** `01-architecture.md:127` — "L6 provisional rescue → stable preservation \| Mandatory preservation order \| **A rescue copy alone is not verified S0 evidence**". The two phases are separate, and the rescue authorizes no build or deletion. M0 was executed under exactly this split. |
| A2-02 | A single ordered list made scheduling preferences resemble proven dependencies. | **Verified.** `01-architecture.md:127-137` labels every edge Mandatory / Conditional / Mandatory-when-API-changes, with `:139` supplying the bounded skip rule. |
| A2-03 | Review receipts inside the artifact they hash create a circular identity. | **Verified.** `03-contracts.md:69` — "Supporting records live **outside** the frozen checkout… Each revision receives a new directory; prior records remain preserved." `:108` — "`snapshot.json` is serialized once. Its SHA-256 hashes its exact raw bytes. **It contains no self-hash, review result or later test output.**" |
| A2-04 | "All evidence tests pass" could be mistaken for product acceptance. | **Verified.** `07-checkpoints.md:8,11` separate G5 (reviewed and filed) from G8 (deployed, separate release authority). `:27` records `Deployment: **Not established**`. `:38` lists what remains `unproven`. |
| A2-05 | A universal reviewer chain would overwrite lane-specific authority. | **Verified.** `03-contracts.md:7` — "records the applicable review policy… obtains the existing final authority's admission". `00-README.md:15-21` fixes authority precedence and states the master supersedes no lane package or archived review. No master-selected replacement reviewer exists. |
| A2-06 | A salvage test trusting the labels "two devices" would overclaim independent preservation. | **Verified.** `09-tests.md:172,176,180` require `storageAttestation`, `unique(record.copies.map(c => c.storageId))`, and absolute `copy.root` + `storageId` per copy. `:260` states the limit in the test table itself: physical device independence and original-inventory completeness are **excluded** from what the automated check proves and require operator verification. M0's four-disk `Get-Disk` check is that operator verification. |

---

## What I could not verify — stated plainly

- **No test was executed for this adjudication.** The fault-injection matrices were run during the
  build, but the A1/A2 adjudication above is a *source and filesystem* verification, not a runtime
  one. **See the round-2 record below for what the matrices actually report, measured.**
- **The L3 stranded suites may not be mergeable.** They were written against a base 581 commits
  behind HEAD, and both slice commits modify `associations.mjs` and `index.mjs`. Their **existence**
  is proven; their **applicability** is not. That requires a checkout and a run, which this document
  does not authorize.
- **The ~200 unmerged branches were not scanned** for the same pattern. The L3 find came from
  following L3's own checkpoint record. The technique has not been applied lane-by-lane across the
  backlog, so **more stranded PASSED work may exist and this document does not rule it out.**
- **A1-09 is open** and is the only finding left unresolved by design.
- **`main` is 17 days stale** (`2b3e7a62a`, 2026-09-03), so "merged into main" was not used anywhere
  above as a completion signal.

## Filing receipt

See `FILE-RECEIPT.md` in this package for the archive ID, the binding `Snapshot-SHA256:` line, and
the `new-review.mjs` invocation that produced it.

---

# PART C — round-2 hostile review (Astra, 2026-09-21): adjudication of R2-01 … R2-12

**Verdict: `DEFECTS-FOUND`.** Astra's own summary: *"Admission remains blocked."* Its closing line:
*"Round 3: warranted. Its single most valuable target is the repaired admission caller path."*

This round examined **the built artifact and the filer's own adjudication**. It is deliberately
distinct from round 1, which reviewed the planning packet and issued no implementation verdict. The
round-2 remit said, verbatim:

> *"A filer marking its own work RESOLVED is not evidence that it is resolved. Your primary job is to
> ATTACK THOSE VERDICTS."*

That framing is the reason this round found things round 1 could not. Twelve defects were returned —
**seven High, five Medium** — and **all twelve are accepted.** They are not, however, all closed:

| Outcome | Count | Defects |
|---|---|---|
| Closed by a document edit or a code fix | **6** | R2-02, R2-03, R2-04, R2-07, R2-09, R2-12 |
| **Carried open — checker code** | **3** | R2-06, R2-08, R2-10 |
| **Part fixed, part carried open** | **3** | R2-01, R2-05, R2-11 |

The distinction is not softened below: where a fix was partial, the remainder is named with the
reviewer's own fix text rather than left to look finished. A filer marking its own work closed is
not evidence that it is closed — which is what this round was commissioned to test.

## C.1 Binding — round-2 input, output and remit, bound separately

| Artifact | Bytes | SHA-256 |
|---|---|---|
| Round-2 consult packet (input) | 83,499 | `a6e9cf948db8078779b478b97450424708e83e61db579b6cf00882b9847d40e6` |
| Round-2 remit | 4,128 | `48d26001d93ad943ca55c9fed40bb7271e10c65914adbd1fe43dfb18d6dd1ddc` |
| Round-2 reply (output) | 61,434 | `9b59e7a764bfd434150762c0021a3164bbb8fedbafa2976b86ba25df84ea6373` |

Carried in this package as `ASTRA-REPLY-ROUND2.md`, `ASTRA-REPLY-ROUND2.meta.json` and
`ASTRA-ROUND2-REMIT.txt`. Transport: `codex exec` on a ChatGPT subscription, `$0` marginal, effort
`xhigh`, wall 986.1 s, in 189,054 / out 32,020 / reasoning 18,510 tokens. The metadata records
`servedModel: null` and `identityVerified: false` — `codex exec --json` emits no model field, so the
**requested** model is provable and the **served** model is not.

Structural verification was performed before reading: fences balanced; `## PART A/B/C` present at
fence depth 0 in order; exactly nine `### NN-` document headings in the emitted order.

**What this binding does NOT cover.** These three hashes bind the round-2 exchange only. They do not
bind this file, `package-registry.json`, `scripts/blueprint-master-evidence.test.mjs`, the `.agents`
mandate amendment, or the filer additions — the same distinction R2-11 drew about the round-1
binding. Each is bound, or not, on its own terms.

## C.2 Adjudication of every round-2 defect

| ID | Sev | Astra's finding | Verdict | Disposition |
|---|---|---|---|---|
| R2-01 | **Medium** | The evidence inventory and closure arithmetic are unreliable: the packet describes "two fault-injection matrices, 4/4 each", "MT-01…MT-07 plus a control: 8/8", and "six registered `node:test` cases", with **no mapping between them and no case-level outputs**; and the two requested self-report histories (an incomplete first repair; a stale published hash later corrected) are absent. | **ACCEPTED — PART FIXED, PART CARRIED OPEN** | The closure summary was replaced with **8 resolved / 1 partial / 1 open** (`MANIFEST.md:38` and the closure table above). The case definitions, control results, exact injected changes, targeted failures, output bindings **and the two error histories are carried open** — see C.4. |
| R2-02 | High | "Stranded" substitutes inactivity for ownership and expands scope. B4 (reviews that day) was placed on the wrong side of a binary "live vs stranded" split; B2 is L6's source worktree, not an additional lane; B1's damage establishes a preservation hazard, not absence of an owner; B3/B5's elapsed time establishes recency, not abandonment; and the categorical "do not roll in what is live" rule is the **filer's** interpretation, not a sentence in the operator quotation. | **ACCEPTED** | Fixed: `10-lane-register-beyond-the-eight.md` §2 retitled "Recovery candidates — recorded, **ownership UNKNOWN**" with Activity / Ownership / Integration state / Hazard / Admission as separate columns; B1/B3/B5 → recovery candidates `not admitted`; B4 → "**review activity observed — not stranded**"; B2 → "**not a separate lane — L6 source alias**"; X1–X5 recorded as activity observations with timestamps; and the filer's added rule is now blockquoted and labelled as the filer's, not the operator's. |
| R2-03 | High | A moving branch tip is confused with changed reviewed material: the register calls L4's review binding stale because shared HEAD advanced, which establishes commit drift but not that L4's reviewed files, dependencies, policy or packet changed. | **ACCEPTED** | Fixed: `10-lane-register-beyond-the-eight.md` §1 now separates **historical packet identity / exact-checkout identity / scoped applicability** and calls the condition **revision mismatch**, not proof that reviewed content changed. Carry-forward requires a documented scope comparison and the existing authority's acceptance. |
| R2-04 | High | L3's recovery conclusion exceeds both the Git evidence and the arithmetic: 22 file-change **entries**, not 22 files; the union is **at most 20 distinct paths**; and testing branch-tip ancestry does not test either named slice commit. | **ACCEPTED** | Fixed: L3 restated as "at most 20 distinct paths", classification changed to **PRESERVE; evaluate adoption**, "recover the 22 files" withdrawn, and the reviewer's falsification method recorded in the document. |
| R2-05 | **Medium** | The test index converts bounded searches into global absence claims: "no test file anywhere" from checking HEAD and one branch; L5 names **four** absent artifacts (three modules **plus one component**) under "three source modules"; zero tracked files under `mobile/` does not establish the directory does not exist; five artifact groups summarise ~30 criteria with no coverage proof. | **ACCEPTED — PART FIXED, PART CARRIED OPEN** | Fixed: every `ABSENT` → **`NOT FOUND`**; a new §0 table states what *was* and *was not* searched; L5 corrected to **three backend modules + one frontend component**; L7 downgraded to a tracked-file measurement with "~30 criteria, 5 mapped" disclosed. **The remaining criteria are disclosed, not mapped — carried open.** See C.4. |
| R2-06 | High | Hash-correct garbage can satisfy admission evidence — `artifact()` proves bytes match a hash, not that the bytes support the receipt's assertion. | **ACCEPTED — CARRIED OPEN (code)** | See C.3. |
| R2-07 | High | Preservation could count the same copy twice: two entries with different `storageId` and the same resolved root enumerate one directory. | **ACCEPTED** | **Fixed in code.** `scripts/blueprint-master-evidence.test.mjs` now rejects duplicate resolved roots (case-folded) *before* trusting storage labels. |
| R2-08 | High | Reach has false negatives and does not implement its relative-target promise. | **ACCEPTED — CARRIED OPEN (code)** | See C.3. |
| R2-09 | High | The mandate amendment replaced one overclaim with several others: "do not exist in this repository", "was ever installed here", "detects drift at checkpoints" — bound to no repository, revision or search scope. | **ACCEPTED** | Fixed in the `.agents` repository, commit `e074bcb`. See C.5. |
| R2-10 | Medium | A filesystem-generated registry is not an authority validator. | **ACCEPTED — CARRIED OPEN (code)** | See C.3. |
| R2-11 | Medium | Filing provenance mixes a historical review with a later adjudication: four HEAD transitions reported as "three"; the round-1 `Snapshot-SHA256` does not cover the registry, the scripts, the mandate amendment or the filer additions; and the two self-report histories are unsupplied. | **ACCEPTED — PART FIXED, PART CARRIED OPEN** | Fixed: `FILE-RECEIPT.md` now says **four**, carries a table of exactly what the round-1 binding does *not* cover, and separates the 17:35 from the 17:32:41 timestamps; C.1 above binds the round-2 input, remit and output **separately**, and filer conclusions are attributed to the filer throughout. The stale-hash and incomplete-fix self-report histories remain **carried open** — see C.4. |
| R2-12 | Medium | The Guardian observation establishes neither a universal admission prerequisite nor a safe repair; and "135 MB/h" mixes units. | **ACCEPTED** | Fixed: unit corrected to **135.0 MiB/h ≈ 142 MB/h**, with a three-bullet correction recording that "add a maximum age" is insufficient and that the Guardian item is an **operational hazard with UNKNOWN communication impact**. |

**Where the filer did not follow Astra.** On R2-01, Astra's own gloss said "9 open or partially
resolved"; the headings give **1 partially resolved (A1-02) + 1 open (A1-09)**, not 9. The
substantive correction stands and was applied; the gloss was not adopted. Recorded so that a reader
does not take this table as blanket agreement with the reviewer's every word.

## C.3 Carried open — the three checker code defects

These three are **accepted and not fixed**. Each requires a rewrite of the evidence checker rather
than a document edit, and a hurried rewrite would leave the checker in a worse state than a named,
recorded defect. They are carried open with Astra's own fix text, and `03-contracts.md` /
`09-tests.md` in this package were corrected to stop asserting what these defects break.

| ID | Astra's named fix (quoted) | Why carried open |
|---|---|---|
| R2-06 | *"parse and cross-check structured evidence, require consumed source/policy artifacts to belong to their declared frozen scope, and separate **structural consistency** from **authorized human admission**. Authenticity requires a trusted collection/authority boundary; adding more self-authored JSON does not create one."* | Requires a semantic parser for every evidence class and a trusted collection boundary that does not exist yet. This is an architecture change, not a patch. |
| R2-08 | *"report syntactic reference evidence without claiming runtime liveness. Parse supported source syntax, resolve relative imports, distinguish reference classes, and expose incomplete scans. Unsupported resolution and I/O failures must prevent absence/deletion conclusions."* | Requires a real parser and a resolution step. The current regex+comment-stripper cannot be incrementally corrected into one. |
| R2-10 | *"validate aliases as normalized repository-relative paths with explicit alias semantics; bind registry and authority contents; validate precedence against the applicable authority decision. Keep **path exists**, **document status**, and **authority is valid** as separate results."* | Requires an authority model, not a filesystem walk. |

Astra also named the acceptance test for R2-06, which is the right bar for whoever picks it up:

> *"A negative fixture must preserve valid hashes and fail on the semantic contradiction. A missing
> file, spawn error, malformed fixture setup, or unrelated dirty-tree failure is not a successful
> rejection test."*

## C.4 Carried open — evidence bindings and the two self-report histories

R2-01 and R2-11 both asked for records this package still does not carry. They are listed here so
that "accepted" is not read as "closed".

| Item | Requested by | Status |
|---|---|---|
| The mapping from the six registered `node:test` cases to the fault-injection scenarios, with each scenario's exact injected change, targeted failure and bound output | R2-01 | **CARRIED OPEN.** The two matrices were run during the build and their headline results are `4/4`; the case-level bindings were not preserved in a form this package can cite. |
| The two self-report histories — (a) the incomplete first repair, (b) the stale published hash later corrected — each as an identifiable before/after record | R2-01, R2-11 | **CARRIED OPEN.** Astra's bar: *"require both published values, their corresponding bytes, publication/correction times, and every consumer that could still trust the earlier value"*, and for the incomplete fix *"the original defect, first repair, counterexample, final repair, and remaining affected paths"*. Neither history is reconstructible from this package. **A pointer contradiction and a statement that hashes match do not establish them.** |
| A complete criterion-by-criterion mapping for the mobile index (currently ~30 criteria, 5 mapped) | R2-05 | **CARRIED OPEN.** The gap is now disclosed in `11-lane-test-index.md` rather than hidden behind a coverage claim; mapping it requires the mobile admission decision that A1-09 leaves to the operator. |

None of the three is a reason to withhold the package. Each is a reason not to read the closure
arithmetic above as a complete evidence inventory.

## C.5 The R2-09 correction, in detail

R2-09 is the only defect this round that was **false as written**, not merely unsupported. The
previous amendment claimed the controller scripts "do not exist in this repository" and that the
mechanism "was ever installed here". Measured at `.agents` revision `3c4d040` (the parent of the
commit carrying the correction, `e074bcb`), by exact-basename search:

| Observed | Evidence |
|---|---|
| **PRESENT** | `skills/non-vibe-coding/scripts/workflow.mjs` (19,467 B), `workflow-policy.mjs` (25,798 B), `workflow-hook.mjs` (11,564 B), each with a `.test.mjs` sibling — all tracked. |
| **PRESENT** | `build-protocol/enrollments/` — 14 tracked records, schema 4, chained through `previousEnrollment`; every `repoRoot` names a path under `SS-PT/tmp/worktrees/…`. Enrollment has demonstrably run, against SS-PT worktrees. |
| **ABSENT** | At **two named hook paths only**: `core.hooksPath` is unset and `.git/hooks/` holds no active hook in `.agents`; SS-PT's `.githooks/` holds the lane, secret-scan, ASCII and egress gates, not the controller hook. |

The corrected section is therefore a **target-repository capability status**: the source is present
and enrollment has run, but no enforcing hook was found at the two paths checked. Absence at a path
does not exclude `core.hooksPath` redirection, a native harness guard, or a differently-named
mechanism, and current absence cannot establish historical absence. The enforcement claim is
**unverified, not refuted**. "Detects drift at checkpoints" was replaced with the actual manual
obligation to compare bound artifacts by hand at each checkpoint. An availability notice was added at
the `workflow-usage.md` entry point, which R2-09 named as the door left unprotected.

The amended section is byte-identical across all three mandate copies (section sha256
`13bd6e238112ba032b036a04…`, 86 lines).

## C.6 Round 3

Astra named round 3 as warranted and pointed it at one target: **the repaired admission caller
path**, exercised with an isolated valid frozen fixture — *"Keep all hashes valid, then introduce
contradictory test/review/admission evidence and duplicate preservation roots. Require rejection for
the named contradiction while the unmutated control passes. Inspect the actual caller wiring and
evidence collection boundary; do not accept helper-only green results."*

That is consistent with this lane's own recorded next-intent: a **non-redundant change-set consult**,
not a re-run of the master review.
