# 11 — Lane test index (L3, L5, L7)

**Status:** `INDEX ISSUED — COVERAGE MAPPED, NOT ADMITTED`
**Implementation verified:** No.
**Authored by:** the filer of this package (not Astra). Not part of Astra's reply — see the
*Filer additions* section of `MANIFEST.md`.
**Closes:** A1-08 (*"L3, L5 and L7 lack separately named `09-tests.md` documents… Produce a lane test
index by first mapping existing tests and acceptance criteria. Add missing executable cases only
where an actual coverage gap is established. Missing filenames are not proof that testing content is
absent."*)

**Method.** Each lane's acceptance criteria were read from its own `05-slices.md` and
`07-checkpoints.md`. Every named artifact was then checked against `git ls-files` at HEAD
`32a9c0b91` (13,034 tracked files) and, where absent, against `git ls-tree` on the lane's own build
branch. **A file absent from HEAD is not reported as absent until the lane's branch has also been
checked** — that distinction is the whole point of this document.

**Measurement instant:** 2026-09-20T17:30-07:00.

---

## 0. Reading this index — what `NOT FOUND` does and does not mean

**Correction, 2026-09-21 (round-2 hostile review, R2-05).** An earlier revision used the label
`ABSENT`, and in places prose that read as a global claim — *"no test file anywhere"*, *"`mobile/`
does not exist"*. Both overran the search that was actually run.

**Every `NOT FOUND` below means `NOT FOUND IN` the named revision and the search scope in this table.**
It is **not** a claim of global absence.

| What WAS searched | What was NOT |
|---|---|
| `git ls-files` at HEAD | untracked files outside the tracked set |
| each lane's own branch, where a row names one | the ~200 unmerged branches not named |
| the filename and filter patterns recorded per row | equivalent work under a different name, following renames |
| | whether any lane has an active owner |

Where a row's scope is narrower than the above, the row says so. **Unresolved paths are retained
deliberately** — an unresolved path is not an absence.

---

## 1. Headline: L3's first two slices are built, tested and PASSED — and not adopted

> Earlier revisions of this heading said *"and stranded"*. **"Stranded" asserted an ownership claim
> this survey never measured** (R2-02/R2-04). The finding stands; the word does not. L3's slices are
> **built, checkpoint-passed, and not present at HEAD** — and **preserved**, with adoption to be
> *evaluated*, not assumed.

This index was commissioned to map *missing test documents*. It found something larger.

L3's `07-checkpoints.md:26-27` records two checkpoints **PASSED**:

| Checkpoint | Date | Commit | Verdict |
|---|---|---|---|
| 1 | 2026-07-14 | `72acf8cd3` | PASS |
| 2 | 2026-07-14 | `6238e3a65` | PASS |

Both commits exist. Both are on **`codex/cortex-phase1`**, which is:

- **not** merged into `main` (`git branch --merged main` → 0 matches);
- **not** contained in the current branch (`git merge-base --is-ancestor codex/cortex-phase1 HEAD` → false);
- **640 commits ahead / 581 behind** current HEAD;
- last committed **2026-07-14** — 68 days before this measurement.

**What is actually on that branch** (from `git show --stat`):

| Slice | Commit | Files | Insertions | Contents |
|---|---|---|---|---|
| 1 — Source Library | `72acf8cd3` | 11 | 1,088 | `migrations/20260714000001-create-cortex-source-library.cjs` (235 L) · models `KnowledgeSource`, `SourceFile`, `Workshop`, `WorkshopNote`, `Credential`, `ContinuingEducation` · `seeders/20260714-seed-cortex-founding-sources.mjs` (149 L) · **`tests/cortexSourceLibrary.test.mjs` (117 L)** |
| 2 — Rules layer | `6238e3a65` | 11 | 1,179 | `migrations/20260714000002-create-cortex-rules.cjs` (224 L) · models `KnowledgeRule`, `RuleVersion`, `RuleSource`, `RuleConflict`, `KnowledgeConcept` · `cortexRuleEnums.mjs` · `services/cortex/knowledgeRuleService.mjs` (250 L) · **`tests/cortexKnowledgeRuleService.test.mjs` (164 L)** |

**2,267 summed insertions across 22 file-change *entries* (11 + 11), including 281 lines of tests,
both slices checkpoint-PASSED.**

**Correction, 2026-09-21 (round-2 hostile review, R2-04).** An earlier revision read *"2,267
insertions across 22 files"*. **22 is the number of file-change entries, not of distinct files.**
Both slice commits modify `associations.mjs` and `index.mjs`; if those are the same two paths, the
distinct-path union is **at most 20**. The arithmetic supports `1,088 + 1,179 = 2,267` insertions and
`11 + 11 = 22` entries. It does not support 22 distinct files, and this document should not have
claimed that it did.

Against the current branch, L3's own test filters match **nothing**:

| Filter from `05-slices.md` | Matches at HEAD |
|---|---|
| `cortexSourceLibrary` | 0 |
| `cortexKnowledgeRuleService` | 0 |
| `cortexKnowledgeRoutes` | 0 |
| `cortexProgressionEvents` | 0 |
| `admin-knowledge` | 0 |

The four `cortex*` files that *do* exist at HEAD are a **different subsystem** —
`swanCoachCortexService.mjs` / `swanCoachCortexPolicyConfig.mjs` and their two unit tests — the Swan
Coach cortex service, not L3's knowledge spine. Counting those as L3's implementation would be a
category error.

**Consequence for L3's admission — restated (R2-04).** L3's classification is **PRESERVE; evaluate
adoption.** It is **not** "PRESERVE + ADOPT", and adoption is **not mandatory**:

- **PRESERVE** the branch. `codex/cortex-phase1` holds two checkpoint-passed slices and must not be
  discarded. That follows from the evidence and stands.
- **Evaluate** adoption. Nothing here establishes that the slices are *applicable* to the current
  base. They were written against a base 581 commits behind, and their test filters match nothing at
  HEAD. **Existence is proven; applicability is not.**
- **"Recover the 22 files" is withdrawn.** There is no established count of 22 distinct files to
  recover (see the correction above), and recovery is a *different* task from writing tests.

**What would falsify each half of this finding.** To test "missing from HEAD": check each named slice
commit's ancestry **independently** — testing whether the *branch tip* is an ancestor of HEAD does
**not** test either slice commit — then compare patch equivalence against HEAD, produce a distinct
changed-path union, and inspect the corresponding implementation and tests at HEAD **following
renames**. To test "no owner": measure it, which this survey did not. Finding equivalent integrated
behaviour would falsify "missing from HEAD"; finding an active owner would falsify the ownership
reading. **Neither result permits discarding the preserved branch automatically.**

---

## 2. L3 — cortex phase 1 knowledge spine

**Package:** `BLUEPRINT-cortex-phase1-knowledge-spine-2026-07-14/` — 00–07 + `PACKAGE-ALL.md`;
**no `09-tests.md`.**

Acceptance criteria live in `05-slices.md` as prose blocks (no `AC-*` identifiers). Five slices:

| Slice | Stated acceptance | Named test artifact | State at HEAD | State on `codex/cortex-phase1` |
|---|---|---|---|---|
| 1 Source Library | migrate + undo + re-migrate; seeder idempotent ×2; `npm test -- cortexSourceLibrary` ≥8 assertions; SQL shows 10 rows; backend boots clean | `tests/cortexSourceLibrary.test.mjs` | **NOT FOUND** | **PRESENT (117 L)** |
| 2 Rules layer | migrate cycle; `npm test -- cortexKnowledgeRuleService`; transition matrix ≥4 rejections; REPL proof `rule_versions` count = 3 | `tests/cortexKnowledgeRuleService.test.mjs` | **NOT FOUND** | **PRESENT (164 L)** |
| 3 API + runtime wiring | curl: 503 flag gate, 401/403, 201/400 cases; `npm test -- cortexKnowledgeRoutes` ≥10 assertions; policy loader proof; full backend suite | `cortexKnowledgeRoutes` | **NOT FOUND** | NOT FOUND |
| 4 Knowledge Console UI | `tsc --noEmit` zero new errors; `npx vitest run admin-knowledge` ≥6 tests; 8 screenshots; interaction proof | `admin-knowledge` | **NOT FOUND** | NOT FOUND |
| 5 Progression events | migrate cycle; `npm test -- cortexProgressionEvents`; curl 403/201/400 | `cortexProgressionEvents` | **NOT FOUND** | NOT FOUND |

**Coverage gap established — within scope.** Slices 3–5's named test artifacts are **NOT FOUND IN**
HEAD plus the `codex/cortex-phase1` branch. Slices 1–2 have tests, but not on the current branch.
**This is not a claim that no test file exists anywhere** — see §0 for what was and was not searched.
Neither is it a claim that no *equivalent* coverage exists under a different name: equivalence would
require following renames and comparing responsibilities, which this index did not do.

---

## 3. L5 — speed-to-lead email

**Package:** `BLUEPRINT-speed-to-lead-email-2026-07-16/` — 00–07 only; **no `09-tests.md`.**
`05-slices.md` names exact files and commands per slice. Six slices.

| Slice | Named test artifact | State at HEAD |
|---|---|---|
| S1 Templates + unsubscribe tokens | `__tests__/emailTemplates.test.mjs` (≥8) | **NOT FOUND** |
| S1 (source) | `emailTemplates.mjs`, `leadUnsubscribeToken.mjs` | **NOT FOUND** |
| S2 Public unsubscribe endpoint | `tests/api/leadUnsubscribe.test.mjs` (≥6) | **NOT FOUND** |
| S3 Email channel in processor | `__tests__/automationService.emailChannel.test.mjs` (≥7) | **NOT FOUND** |
| S3 (source) | `emailAutomationSender.mjs` | **NOT FOUND** |
| S4 speed_to_lead sequence | `__tests__/automationService.speedToLead.test.mjs` (≥5) | **NOT FOUND** |
| S5 Admin visibility | `SpeedToLeadStatusCard.test.tsx` (≥6) | **NOT FOUND** |
| S5 (source) | `SpeedToLeadStatusCard.tsx` | **NOT FOUND** |

**What L5 does have** — the substrate and a real regression baseline:

| Artifact | State |
|---|---|
| `backend/services/automationService.mjs` | **PRESENT** |
| `backend/routes/leadRoutes.mjs` | **PRESENT** |
| `backend/routes/automationSafetyRoutes.mjs` | **PRESENT** |
| `backend/__tests__/automationService.triggerLead.test.mjs` | **PRESENT** — S3's stated SMS-branch regression |
| `backend/__tests__/automationService.preview.test.mjs` | **PRESENT** — S3's stated SMS-branch regression |
| `frontend/.../marketing/LeadPipelinePanel.test.tsx` | **PRESENT** — S5 mounts above this component |
| `frontend/.../marketing/LeadPipelinePanel.styles.ts` | **PRESENT** |

**Classification: EXTEND, not greenfield** (A1-04). Three of the four modified-in-place files already
exist, and the two regression suites S3 requires are already on disk. The gap is the email layer
itself: 5 test suites and **three backend source modules plus one frontend component**, none found.

**Correction, 2026-09-21 (R2-05).** An earlier revision said *"3 source modules"*. That silently
excluded the frontend component — `SpeedToLeadStatusCard.tsx`, which is row S5 of the table above —
without explaining the distinction. The count is **three backend modules + one frontend component**.

**Note on path drift.** L5's criteria give S1/S3 as `__tests__/…` and S2 as `tests/api/…`, but the
two existing suites live in `backend/__tests__/`. The lane's own relative paths are therefore not
all resolvable as written; the index records the *basename* as authoritative and the directory as
requiring reconciliation at admission.

---

## 4. L7 — swan native mobile

**Package:** `BLUEPRINT-swan-native-mobile-2026-07-13/` — 00–07 only; **no `09-tests.md`.**
This lane is the best-specified of the three: `05-slices.md` uses explicit `AC-<slice>.<n>`
identifiers throughout (~30 criteria across 8 slices), and `07-checkpoints.md:12-13` defines an
evidence format (`[AC-<n>.1] <criterion> → PASTED OUTPUT`).

**0 tracked files under `mobile/`; no named test artifact found.** This is a *tracked-file*
measurement, **not** proof that the directory is absent — untracked work under `mobile/` would not
appear in `git ls-files`, and this index did not look for it.

| Slice | Named test artifact | State |
|---|---|---|
| 0.2 Contracts + tokenStore + apiClient | `loggerReducer`-adjacent suite, `apiClient`/`tokenStore` ≥15 tests; `probe.ts` | **NOT FOUND** |
| 0.3 Backend contract lock | `mobile-v1-contracts.test.mjs` in `backend/tests/contracts/` | **NOT FOUND** |
| 2.2 Logger + drafts | `loggerReducer.test.ts` (≥12) | **NOT FOUND** |
| 2.3 Save + offline queue | `offlineQueue.test.ts` (≥8) | **NOT FOUND** |
| 2.4 Progress chart | `volumeSpec.test.ts` (≥6) | **NOT FOUND** |

**Classification: GREENFIELD — with one correction (R2-05).** Unlike L3 and L5, no prior
implementation was found to adopt: the lane's own README scopes Phases 3–6 as roadmap-only, and 0
tracked files sit under `mobile/`. Every criterion is `NOT YET BUILT`, which is a different state
from `MISSING DOCUMENT` and must not be reported as a coverage gap in an existing system.

**Two claims withdrawn.** *"`mobile/` does not exist"* — see the correction above; *"no
implementation found in the scope searched"* is what this index can support. And the implication that
the mobile table covers every criterion: it summarizes **five artifact groups** while the lane defines
**~30 `AC-` criteria**. The criterion-to-row mapping is **not complete**, and an unmapped criterion is
not a passing one.

**Boundary risk (A1-09).** AC-0.3.2 asserts `/api/workout/sessions` **mount order**, and AC-0.3.3
requires `git diff --stat` to show only the new test file. L7's inherited constraint is an unchanged
existing API. Any admission must freeze that contract first; a mount-order assertion is precisely
where a well-meant "shared API improvement" would silently violate the lane boundary.

---

## 5. Summary table

| Lane | `09-tests.md` | Existing tests at HEAD | Named artifacts NOT FOUND | Classification |
|---|---|---|---|---|
| L3 | absent | 2 (different subsystem — not L3's) | 5 filters, all 0 | **PRESERVE; evaluate adoption** — 2 slices on `codex/cortex-phase1`; applicability unestablished |
| L5 | absent | 2 regression suites + 1 component test | 5 suites + 3 backend modules + 1 frontend component | **EXTEND** — substrate present, email layer not found |
| L7 | absent | 0 | 5 suites + all source | **GREENFIELD** — 0 tracked files under `mobile/`; ~30 criteria, 5 mapped |

## 6. What this index does not establish

- **No test was executed.** Every state above is a *file-existence* measurement against a tracked
  file list. Whether the L3 suites on `codex/cortex-phase1` still pass against the current base is
  **UNESTABLISHED** — that requires a checkout and a run, which this index does not authorize.
- **L3's stranded suites may not be mergeable as-is.** They were written against a base 581 commits
  behind HEAD; `associations.mjs` and `index.mjs` are both modified by the slice commits, so a
  conflict there is likely. Their *existence* is proven; their *applicability* is not.
- **The ~200 other unmerged branches were not scanned.** The L3 find came from following the lane's
  own checkpoint record. The same technique has not been applied lane-by-lane across the backlog
  (see `10-lane-register-beyond-the-eight.md` §2.1 B7).
- **No test document has been authored.** A1-08 asked for an index *first*, and for missing
  executable cases to be added "only where an actual coverage gap is established." For L3 the
  correct next step is recovery, not authoring; for L7 the gap is the entire application.
