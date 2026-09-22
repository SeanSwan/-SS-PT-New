# Package Manifest — Coach Command Center AI Harness Blueprint

**Generated:** 2026-09-20T08:30:39.224Z
**Source reply:** `tmp/coach-cc-ai-harness-20260920/REPLY.md`
**Packet:** `tmp/coach-cc-ai-harness-20260920/PACKET.md`

## Documents

The twelve below were **split from Astra's reply** by `scripts/split-astra-blueprint.mjs`. They are Astra's
text; the only edit to any of them is a factual correction (`00-README.md:49`, Rule 74 → **Rule 86**).

**Conventions, stated because two documents in this package count differently.** `Lines` here is
**`split('\n').length`** — one higher than `wc -l`, which is the convention `REVIEW-MANIFEST.md` uses. The
`Fenced blocks` column is the generator's header, but what it actually holds is the count of **fence lines**
(`match(/^\s*```/gm)`), i.e. **twice the number of blocks** in a balanced file. Header kept verbatim so a
regeneration is idempotent. No file is near the 300-line cap under either convention.

**Table corrected 2026-09-20.** It was generated at `2026-09-20T08:30:39Z`, *before* the round-2 edits, so
four rows had gone stale: `03-contracts.md` (182 → **179**, fences 14 → **8**),
`03b-contracts-proposed-artifacts.md` (fences 8 → **6**), `05-slices.md` (135 → **147**) and
`09-tests.md` (164 → **193**). Caught by a post-commit coherence pass; the other eight rows were already
correct. **Do not hand-edit this table — regenerate it with the splitter, or it drifts again.**

| File | Lines | Fenced blocks |
|---|---|---|
| `HOSTILE-REVIEW.md` | 48 | 0 |
| `00-README.md` | 75 | 0 |
| `01-architecture.md` | 239 | 16 |
| `02-wireframes.md` | 171 | 10 |
| `03-contracts.md` | 182 | 8 |
| `03b-contracts-proposed-artifacts.md` | 188 | 6 |
| `04-build-order.md` | 76 | 4 |
| `05-slices.md` | 147 | 14 |
| `06-bans.md` | 59 | 0 |
| `07-checkpoints.md` | 105 | 2 |
| `09-tests.md` | 193 | 0 |
| `08-decision-density-self-test.md` | 51 | 0 |

**Document count: 11 → 12.** Astra emitted `03-contracts.md` as **one 352-line document**, violating
the package's own 300-line ban. Round-2 review **R2-10** established that the ban's
pre-existing-file qualification does not exempt a *new* artifact, so the caller split it at the
natural boundary — existing-surface contracts vs proposed artifacts — mirroring the
`BLUEPRINT-social-bridge-completion-2026-09-19/03b-contracts-s6-s8-and-interfaces.md` precedent.
**No content was altered or dropped.** Each part carries a caller note; both remain unreviewed in
their split form. Do not treat this split as an Astra document.

**Resolved 2026-09-20 — the splitter warning below is no longer live.** The original note read:
*"`03-contracts.md` is 352 lines — over the Rule 4 cap of 300. Flagged by the splitter and carried
rather than hidden; the builder must split it, not paste it."* **It has since been split** into
179 + 188 lines, both well under the cap. The warning is retained only as the record that the overage
was disclosed rather than hidden — **do not act on it.**

## Governance records — WorkBuddy seat, NOT Astra

These four were **not** produced by Astra and are not part of the forged package. They are the adjudication
trail: read them before trusting the twelve above.

| File | What it is |
|---|---|
| `ADJUDICATION.md` | Round 1: all 16 Astra findings re-measured against the real repo — 11 confirmed, 3 downgraded, 1 refuted, 1 unverified. Every verdict carries its evidence. |
| `ADJUDICATION-R2.md` | **Round 2: the second Astra hostile review, adjudicated.** 10 findings (R2-01…R2-10) re-measured. Includes the seat's own retraction check, an empirical refutation of one Astra claim, and the one live privacy leak that needs an operator ruling. **Read this before the round-1 adjudication.** |
| `REMEDIATION.md` | What was fixed, what was deferred and why, and **§0: a HIGH the seat raised and retracted** (D12), with the mechanism of the error. Read §0 before repeating any claim about the PHI gate. |
| `REVIEW-MANIFEST.md` | Per-file SHA-256 for all 16 reviewed files, re-verified. **Re-check a hash before trusting this review** — the tree is dirty and HEAD has moved since review. |

**Round 2 was dispatched without the sibling archive review**
`2026-09-20-015541-s83-coach-harness-work-and-coach-assistant` (filed by another lane 23 minutes after
round 1). Astra's PART D explicitly noted it could not establish novelty against prior findings because
the full round-1 review was absent from its packet. **Reconciled afterwards: no overlap** — that review's
own scope excludes "backend coach services", which is this package's entire subject. Recorded because a
review run without prior archive evidence must say so.

## Round-3 fixes — the package is no longer "Astra's text, unmodified"

**Added 2026-09-20, round 3.** The claim above — that the twelve documents are *Astra's text, the only edit
being a factual correction* — is now **out of date**. The round-3 fix pass edited four of them:

| File | What changed |
|---|---|
| `00-README.md` | **H06** now names the pinned contract `privacy-boundary@1.1.0` and points at its assertions |
| `03-contracts.md` | new closing section: the cross-package privacy boundary, pinned by id **and version** (round-3 **R3-02**) |
| `06-bans.md` | three new privacy bans — a clean scan is not the release predicate (**R3-03**), a generic `catch` must not absorb a rejection (**D-B**), `routeContext` is not "bounded and therefore handled" (**D-A**) |
| `09-tests.md` | the four privacy-boundary assertions: dispatcher call count, the fallback path, repeated identifiers, detector false negatives |

**The `Lines` column is stale for those four rows.** The table was already internally inconsistent before
this pass: the note at `:18-22` records corrections (`03-contracts.md` 182 → **179**) that were never
applied to the table, which still reads 182.

**Do NOT regenerate with `scripts/split-astra-blueprint.mjs` to fix it.** The splitter rebuilds these
documents from Astra's original reply, which would **revert every round-3 fix above**. The generator is the
right tool for a fresh split and the wrong tool for a package repaired in place. Recompute the four rows by
hand, or extend the splitter to preserve post-split edits first.

## Rounds 4 and 5 — the claim is now doubly out of date

**Added 2026-09-20, rounds 4 and 5.** The `Lines` column was already stale at round 3; it is now stale for
**every** row that has been edited, and the fence counts for several. **Treat the whole table as a
generator artifact, not a fact about the current files** — measure with `wc -l` before citing any number in
it. This is the same defect class as round-5 **R5-08** in the sibling package, where a file's own §9
asserted a line count that had gone stale when the file grew.

| Round | Files edited | What changed |
|---|---|---|
| **4** | `03-contracts.md`, `03b-contracts-proposed-artifacts.md`, `09-tests.md`, `06-bans.md` | `privacy_unavailable` added to `HarnessErrorCode` + the four-site propagation chain (**R4-04**); the proposed-artifacts scope note (**R4-03**); the recording-fake rule redefined as **intercepted transport** (**R4-05**); T-04 marker classes |
| **5** | `03-contracts.md`, `09-tests.md`, `06-bans.md`, `00-README.md`, `03b-contracts-proposed-artifacts.md` | **R5-07** — a `ts` fence closed after `HarnessError` and reopened before `ConfirmationV2`; the Markdown that had been inserted **inside** the fence is now outside it, so the contract example is valid TypeScript again. **R5-03** — the chain extended from four sites to **six** (`aiChatService.mjs:2301`, `aiChatRoutes.mjs:823`). **R5-04** — the superseded *"no identifying content crosses"* rule replaced by a scoped rule, and the canary matrix reduced to **one shared disposition matrix**. **R5-06** — the pin moved to `@1.1.0` across all seven live files. |
| **7** | **this package:** `03-contracts.md`, `09-tests.md`. **sibling:** new `03e-admission-schema.md`, new `03f-absorber-chain.md`, `03b-privacy-boundary.md`, `03c-release-predicate.md`, `03d-context-channels.md`, `00-README.md`, `03-contracts.md`, `09-tests.md` | **R7-01** — half of R6-01 was wrong: scoping *static template* bytes to hash identity is right, but leaving *every interpolation result* in **P** made provenance depend on the **mechanism of arrival**, not the **source**. A substituted approved value is **O** — the first finding where the fix was itself the defect. **R7-02** — the absorber chain extended to **eight**: `debate/debateOrchestrator.mjs:480` is an **asynchronous** job's `catch`, returning `null` and letting the job finish `complete`; the honest wire form is a **terminal job state**, never a salvaged plan. **R7-03** — §3's *"scanned as one string"* contradicted hash-only O; the segment map has **no interface**, and a concat-only signal was measured. **R7-04** — the admission record had **no producer contract**; a store specified only on read is not specified. **R7-05** — the **seat's own** error: round 6 needed a version bump that the seat argued against, so the pin moved to `@1.2.0` across **22 current-state sites in 12 files**, with **4 historical mentions preserved**. **R7-06 (seat-found)** — `03c` measured **353 lines against the cap** and was split again (→ `03e`), then `03b` measured **305** and was split (→ `03f`); both breaches were found by *running* the check, not by the section that had been rewritten to refuse to state a size. |

**Governance records added since round 2:** `ADJUDICATION-R3.md` (round 3), `ADJUDICATION-R4.md` (round 4),
`ADJUDICATION-R5.md` (round 5), `ADJUDICATION-R6.md` (round 6), `ADJUDICATION-R7.md` (round 7). These are
**seat-authored**, not Astra's.

**The archival gap — closed for rounds 4, 5 and 6; round 7 owed at the time of writing.** Every Astra reply
ends `NOT FILED / NOT INDEXED`: Astra's filesystem is read-only, so it **cannot** file its own review to the
Rule 86 archive (`Z:\HostileReviews`). The seat owes the filing. **Rounds 4, 5 and 6 are filed, published,
indexed (81 reviews) and reciprocally linked; round 7's filing is the seat's next act.** The archive is the
one place a later review is told to look before reviewing, so an unfiled round is a round that a later round
cannot see.

**This paragraph was itself stale when round 6 was dispatched, and Astra said so.** `PACKET-R6.md` disclosed
that rounds 4 and 5 *"remain unfiled"* — written before the seat filed them, sent after. Astra's reply noted
the contradiction. **A disclosure about mutable state is stale the moment the state changes**; state it with
the measurement, not from memory.

**The `Lines` / `Fences` table above is retained as a round-3 artifact only.** Round 7 did not regenerate it:
every row has been edited since, and the sibling package's own split history (`03c` → `03d` → `03e`, `03b` →
`03f`) is the proof that these numbers have no shelf life. The check is `wc -l`, run at the moment of citing.

## Build order

Per `04-build-order.md` and `05-slices.md`. Build ONE slice at a time; after each slice, produce the diff + the acceptance-criteria evidence and WAIT for the checkpoint verdict before continuing.
