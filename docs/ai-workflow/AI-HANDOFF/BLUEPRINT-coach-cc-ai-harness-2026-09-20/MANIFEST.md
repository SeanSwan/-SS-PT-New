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

## Build order

Per `04-build-order.md` and `05-slices.md`. Build ONE slice at a time; after each slice, produce the diff + the acceptance-criteria evidence and WAIT for the checkpoint verdict before continuing.
