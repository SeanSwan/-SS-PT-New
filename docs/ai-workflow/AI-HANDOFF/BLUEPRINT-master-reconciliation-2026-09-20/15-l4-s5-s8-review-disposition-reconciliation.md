# L4 — S5–S8 source-excerpt and review-disposition reconciliation

**Lane:** L4 (Social Bridge Completion — Studio Spotlight S5–S8)
**Package:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/`
**Scheduled position:** 2nd in Astra's round-3 order — **L6 S0 → L4 S5–S8 → L8 R6.1 → …**
**Astra's L4 requirement, verbatim:** *"Reconcile current S5 source excerpts and review dispositions"* —
**gate:** *"Exact applicable review scope and unresolved findings."*
**Prepared:** 2026-09-21 against `144ca8c56`
**Status: RECONCILED — the review chain is complete and DISPOSITIONS ARE ENUMERATED. One finding
(R5-08) is confirmed still OPEN. Implementation is NOT admitted.**

> This document establishes the gate Astra named. It does **not** claim S5 is buildable-and-verified —
> `00-README.md` already separates *S5 buildable* from *G0-release*, and that separation stands.

---

## 1. The review chain, and where its replies actually live

The package directory carries `HOSTILE-REVIEW.md`, `R1-ASTRA-REPLY.md`, and
`R1-REVIEW-ROUND-2-REPLY.md` — but **round 5's packet is present with no reply beside it.** The reply
exists; it is simply not in the package. Checked rather than assumed:

| Round | Reviewer | Reviewed | Verdict | Filed at |
|---|---|---|---|---|
| 1 | astra | R1 as a *proposed* change set (dirty tree) | FAIL 0/6/9/0 | `2026-09-20-025023-social-bridge-completion-r1-correctness` |
| 2 | astra | R1 **as committed** (`4977987a7`) | FAIL 0/6/15/0 | `2026-09-20-171502-social-bridge-completion-r1-correctness` |
| 3 | workbuddy / deepseek-v4.1-flash | the uncommitted SSRF / href delta | DEFECTS-FOUND 0/2/1/2 | `2026-09-20-171602-social-bridge-image-rehost-ssrf-hardening-and` |
| 4 | workbuddy / deepseek-v4.1-flash | the round-2 HIGH remediation, uncommitted worktree | DEFECTS-FOUND 0/2/2/3 | `2026-09-20-172308-social-bridge-round-2-high-remediation-verified` |
| 4b | workbuddy / deepseek-v4.1-flash | D7/D8/D9 closed, the ban-#50 split | — | `2026-09-20-181511-social-bridge-d7-d8-d9-closed-the-ban-50-split` |
| **5** | **astra** | **remediation commit `b4ea7968f`** | **DEFECTS-FOUND 0/4/4/0** | **`2026-09-20-183733-social-bridge-r1-remediation-round-5-astra`** |

**Finding of this reconciliation: all six rounds are filed and indexed.** The gap was discoverable only
by reading `Z:\HostileReviews\index.jsonl` — a reader of the package alone would conclude round 5 never
returned. Round 5's reply is **23,734 bytes**, filed by the dispatching seat because Astra runs read-only
and cannot file its own review.

**Supersession:** round 5 `supersedes` round 2. Rounds 1 and 3–4 stand as their own records. There is no
supersede chain beyond that, which is correct — each round reviewed a different object.

---

## 2. Source-excerpt precedence, and the G0 split

`00-README.md` establishes: *"Where this package and the excerpts disagree, the excerpts win."*
That precedence is what makes this reconciliation decidable at all.

| Gate | Question | State |
|---|---|---|
| **G0-evidence** | Were the missing source excerpts supplied? | **PARTIAL** — six supplied, three artifacts remain unread |
| **G0-release** | May implementation proceed on every decision G0 licenses? | **NOT CLOSED** — **seven** decisions remain `BLOCKED-G0` |

**The false statement is corrected.** `00-README.md` previously asserted *"Gate G0 is closed"*, and
`MANIFEST.md:42` now explicitly retracts it:

> *"…previously asserted *'Gate G0 is **closed**'*, which contradicted this same file's own deviation #1"*

Both `00-README.md:5`/`:22` and `MANIFEST.md:15`/`:39` now read **NOT closed**. R5-06 (**HIGH**) is
therefore **CLOSED in the worktree** — but see §4 for the committed-state caveat Astra attached to it.

**The excerpts are authoritative but incomplete.** Six of nine truth artifacts; the three unread ones
are listed in `04-build-order.md`'s integration-edit table, and seven decisions stay `BLOCKED-G0` until
they are read. **An excerpt that was never supplied cannot be reconciled** — it is named as open, not
treated as absent-and-therefore-fine.

---

## 3. Disposition of round 5's eight findings — every one independently re-verified

Astra's verdict was `0/4/4/0`. Each finding is checked here **against the shipped source at
`144ca8c56`**, not against a claim in a corrections file. That distinction is the whole point: the
archive's recurring failure mode is *"a worktree edit is not a correction"*.

| # | Sev | Finding | Disposition | Evidence in shipped source |
|---|---|---|---|---|
| **R5-01** | HIGH | First-insert race silently drops the newer revision | **CLOSED** | `bridgeSpotlightRevisionApply.mjs:135` now reads `if (current.revision >= revision) return {applied:false,…}` — Astra's prescribed fix **verbatim** — inside a `MAX_APPLY_ATTEMPTS = 3` loop, and the bound's fallthrough **throws** (`:155`) instead of acknowledging. The old code tested `if (current)` with no revision comparison. |
| **R5-02** | HIGH | Normalization aliases distinct item identities | **CLOSED** | The overloaded `str()` was split in `spotlightPayload.mjs`: `str` is now documented display-text (truncates), and a new `identity()` **rejects** over-long values (`:48-56`) with the R5-02 rationale in the header (`:29-31`). `SPOTLIGHT_MAX_ITEM_ID = 36` bound is enforced **before** the model is touched. |
| **R5-03** | MED | A newer revision overwrites a newer image with a stale snapshot | **CLOSED** | `splitImagePayload` drops `imageUrl` from the UPDATE payload via an explicit **sentinel**, with the reasoning recorded (`:51-75`): a value that must survive to commit time cannot be decided by a read taken before the write. The INSERT branch deliberately keeps the column present. |
| **R5-04** | MED | Image-attachment failure fails an already-persisted ingest | **CLOSED** | `bridgeIngestRoutes.mjs:165-177`: the attach is individually wrapped; the catch logs *"non-fatal, text revision kept"* and the 200 response stands. The comment names the exact defect — *"That breaks the design stated three lines up ('never fail the ingest over a picture') one statement after it is honoured."* |
| **R5-05** | MED | Successful R2 uploads produce URLs the serving route rejects | **CLOSED — proven by execution** | The boundary was extracted to `core/photoServeCategories.mjs` (a security boundary made provable on its own) and `routes.mjs:554` now reads `isServablePhotoCategory(category)`. `swan-spotlight` is admitted. **`tests/unit/photoServeCategories.test.mjs` — 11/11 PASS** (run this session), and the central case **reads the objectKey template out of `photoStorageService.mjs`** rather than hand-writing a URL, so the two sides cannot drift again. |
| **R5-06** | HIGH | G0 documentation correction absent from the reviewed commit | **CLOSED — committed** | Corrected in §2 above. Astra's finding was **about the commit** (`b4ea7968f` did not contain these files). `00-README.md` and `MANIFEST.md` are now **clean against HEAD** — landed in `979a95543` (*"test(bridge): land the D8 coverage and the blueprint truth fixes stranded in the worktree"*). The committed-state objection is fully answered. |
| **R5-07** | HIGH | DNS-rebinding documentation correction also absent | **CLOSED — committed** | `04-build-order.md:95,107,111-112,143` now carries the scoped statement: *"DNS rebinding remains an open accepted residual risk"*, and the `rehostImage()` "DONE" claim is explicitly bounded to redirect rejection, HTTPS-only, the streamed byte cap and SVG rejection. Landed in the same commit. |
| **R5-08** | MED | Two changed suites over the 300-line budget | **⚠ STILL OPEN** | `tests/bridgeSpotlightOrdering.contract.test.mjs` measures **417 lines** against ban #50 (*"No source file reaches 300 lines"*). See §5. |

**Seven of eight closed; one open.** Astra's two HIGH documentation findings — the ones most relevant to
*this* reconciliation's gate, since they concern the truth of the package's own claims — are both closed
**and committed**, which is the standard Astra itself set.

---

## 4. The committed-state question, stated honestly

Astra's round-5 finding was precisely that **a worktree edit is not a correction**. That standard was
applied to this reconciliation, and it resolves in the package's favour:

- The **code** findings (R5-01…R5-05) are closed in files verified by reading them **at `144ca8c56`**.
- The **documentation** findings (R5-06/R5-07) are closed **as commits** — `git status` on
  `00-README.md` and `MANIFEST.md` is **clean against HEAD**, landed in `979a95543`. Astra's remedy
  (*"land the documentation corrections as a separately attributable revision"*) **has been carried out**.

This was checked, not assumed, precisely because the opposite was true at round-5 time. The earlier
draft of this section asserted the documentation was still uncommitted; that was **wrong**, and the
correction is recorded here rather than quietly edited away.

**One caveat that remains honest:** `979a95543` is a commit in this checkout, and this reconciliation
did not verify it has been **pushed** to a remote. Local-commit truth is what was measured.

---

## 5. R5-08 — the one confirmed-open finding, and why it is not a one-line fix

`tests/bridgeSpotlightOrdering.contract.test.mjs` is **417 lines** against ban #50's 300-line limit.

**It is not fixed here, deliberately.** Ban #50's own precedent in this package is instructive: when
`spotlightImageFetch.mjs` hit 320 lines, the response was a **split along a natural seam**
(`CORRECTIONS-APPLIED.md` §11b) — URL admission separated from transport/decode — rather than trimming
the comments that carried the reasoning. A 417-line suite needs the same treatment, and where its seam
is has to be read, not guessed. Trimming it to pass a line count would delete the recorded reasoning
that makes the suite worth having, which is the failure the precedent exists to prevent.

**This is a lane action, not a master-reconciliation action**, and it is named here so it is not lost
between them.

---

## 6. Disposition summary — what the gate asked for

Astra's L4 gate: **exact applicable review scope** and **unresolved findings**.

**Applicable review scope.** Six filed rounds covering: R1 as proposed, R1 as committed, the SSRF/href
delta, the round-2 HIGH remediation in the worktree, the D7/D8/D9 closure, and the remediation **as a
commit**. Round 5 is the current head of the chain and supersedes round 2. Rounds 1, 3, 4 and 4b stand
independently because each reviewed a different object — they are not stale, they are narrower.

**Unresolved findings.** Exactly one: **R5-08 (MEDIUM)**, the 417-line suite. Everything else in round 5
is closed and independently re-verified against shipped source in §3, and both documentation findings are
closed **as commits**, not merely on disk.

**Also carried, not closed by this reconciliation:**

- The **three unread G0 artifacts** and the **seven `BLOCKED-G0` decisions** (§2).
- **DNS rebinding** as an **open accepted residual risk** — explicitly scoped, not silently dropped.
- **Whether `979a95543` has been pushed** — local-commit truth is what was measured (§4).
- R5-01's fix is verified **by reading the shipped logic**; its concurrency claim is a claim about
  interleaving and would want an executable race reproduction before S5a is admitted. Astra's own round-5
  note applies: *"the remediation is a concurrency claim, and concurrency claims are what reading cannot
  settle."* **Named as a boundary on this reconciliation, not as a pass.**

**This record does not admit S5.** It supplies the gate's two inputs and says plainly which one is not
empty.
