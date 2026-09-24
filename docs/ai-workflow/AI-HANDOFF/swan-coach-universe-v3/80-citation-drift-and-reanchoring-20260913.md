# Citation drift and its re-anchoring — 2026-09-13

**Why this file exists.** A hostile review of docs 70–79 found that a large number
of their `file:line` citations no longer point at the code they describe. The
claims are not false — every citation checked was accurate at the revision that
authored it — but the numbers were invalidated by *later commits in this same
session*, which inserted lines above the cited positions. A reviewer who follows
a citation today lands on unrelated code.

That matters here specifically because rules 54 and 55 require a reviewer to be
able to **re-run the evidence**. A citation that cannot be followed is not
evidence.

Worktree `tmp/worktrees/swan-coach-astra-owned-20260906`, branch
`codex/swan-coach-astra-owned-20260906`. Nothing was pushed.

---

## 1. The measured shifts

Each row was established by diffing the cited file at the parent of the commit
that changed it against that commit, not by inference.

| File | Shifting commit | Shift | Uniform? | Verified how |
|---|---|---|---|---|
| `backend/routes/aiChatRoutes.mjs` | `474b3524c` (F1–F5) | **+21** | **Yes** — one hunk, `@@ -370,6 +370,27 @@`, 21 insertions / 0 deletions; file total 1323 → 1344 | Three cites matched their claim byte-for-byte at the pre-revision: `:512` `const requestController = new AbortController();`, `:519` `requestSignal.throwIfAborted();`, `:1055` `if (requestSignal.aborted || res.destroyed) return;` |
| `backend/core/routes.mjs` | `47012147e` (G09) | **+2** | **Yes** — diffstat `2 insertions(+)`, one import and one `app.use` | `:715`→`:717` `app.use('/api/ai-command', aiCommandRoutes)`; `:718`→`:720` `app.use('/api/admin/ai-bff', aiBffRoutes)`; `:498`→`:500` `app.use('/api/admin', adminRoutes)` |
| `backend/services/coachProactiveNudgeCron.mjs` | `474b3524c` + later | not uniform | **No** | Real role sites are `:183` (`hasDeliveryAccess`) and `:220` (the query `where`); `:205` is `sequelize = null,` |
| `backend/services/clientDataOverviewQueryService.mjs` | `474b3524c` + later | not uniform | **No** | Real predicate is `:26`; `:21` is a blank line. The file's own comment at `:22-24` explains the fix |
| `backend/controllers/videoCatalogController.mjs` | `d05e9eaa0` (P77-B) | +34 total | **No** — 50 insertions / 9 deletions across two files, so arithmetic re-anchoring is unsafe | `:38` still correct; `:41`, `:58`, `:653`, `:659`, `:660` all moved |
| `backend/routes/videoCatalogRoutes.mjs` | `d05e9eaa0` | +3 | Yes | `:22` `router.get('/job-queue-health', jobQueueHealth)` verified at the pre-revision |

**Where the shift is uniform, arithmetic re-anchoring is safe. Where it is not,
re-derive by content** — search for the described construct rather than adding a
constant.

## 2. Citations repaired in place

| Doc | Was | Now | Basis |
|---|---|---|---|
| 72 | `core/routes.mjs:715` / `:718` / `:498` | `:717` / `:720` / `:500` | diffstat-proven +2 |
| 73 | `aiChatRoutes.mjs:512-516` / `:921` / `:1055` | `:533-537` / `:942` / `:1076` | diffstat-proven +21 |
| 77 | `clientDataOverviewQueryService.mjs:21` | `:26` | read at HEAD |
| 77 | `coachProactiveNudgeCron.mjs:205` and `:168` | `:220` and `:183` | read at HEAD |
| 78 | `clientDataOverviewQueryService.mjs:21`; `coachProactiveNudgeCron.mjs:205,168` | `:26`; `:220,183` | read at HEAD |
| 79 | `clientDataOverviewQueryService.mjs:21` | `:26` | read at HEAD |

Doc 73's `requestSignal.throwIfAborted()` list (`:519, 629, 673, 725, 745, 779,
833, 872, 881, 942, 951, 1004, 1013`) is **not** renumbered: it is a 13-number
run inside a table cell and every entry shifts by the same +21, so the mapping in
§1 is sufficient and hand-editing that many numbers only invites fresh error.
Doc 76 is treated the same way, because its shift is not uniform.

## 3. Citations left deliberately unrenumbered

Both docs below describe **pre-fix states on purpose**, as findings. Renumbering
them onto post-fix code would destroy the finding. They carry a re-anchor pointer
instead.

- **Doc 76 findings 2–4** describe `videoCatalogController.mjs` and
  `videoCatalogRoutes.mjs` *before* `d05e9eaa0` fixed them (doc 77 records CT-2,
  CT-3, CT-4 as CLOSED). Reading those citations at HEAD lands on the repaired
  code — that is expected, not a defect.
- **Doc 73's "Original claim" rows** quote pre-fix line numbers deliberately, as
  the claim being adjudicated.

**In-code citation drift (recorded, deliberately not repaired).**
`frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.controllerEffects.routedThreadHydration.test.tsx:154-155`
cites `CoachCommandCenter.controllerEffects.ts:19` and `:77` for
`ROUTED_THREAD_LOAD_ATTEMPT_LIMIT` and its guard. At this revision the constant is
at `:43` and the guard at `:120`. It is left alone on purpose: the C2/C3 slice is
editing that source file concurrently, so any number written now would be stale
within the hour. Repair it once `controllerEffects.ts` settles.

## 4. The status-staleness finding this pass produced

The citation drift exposed a second, more consequential defect. Doc 77 opens with
*"Everything here is OPEN unless the Status column says otherwise."* At the time
of this review, five MAJOR rows in its §A table still read **"Fix in progress"**
(F1, F1b, F2, F3, F5) while doc 79 already recorded all five as **CLOSED** under
`474b3524c`.

That is worse than a stale line number: a reader consulting the register — which
is the document a reader is *told* to consult for the open set — would conclude
five MAJOR privacy and 403 defects were still outstanding.

Root re-verified each independently before correcting doc 77, rather than
trusting doc 79:

| Finding | Verification at HEAD |
|---|---|
| F1 | `clientDataOverviewQueryService.mjs:26` is `const includeTrainerNoteSummary = !isClientEquivalentRole(requesterRole);` |
| F2 | `painEntryRoutes.mjs:41,44,45,46` each carry `'user'` in the `authorize` list alongside `verifyClientAccessByUserId` |
| F3 | `aiChatRoutes.mjs:390` emits `code: 'COACH_CONVERSATION_AUDIENCE_UNAVAILABLE'` |
| F5 | `coachProactiveNudgeCron.mjs:83` derives the audience from the shared predicate; `:183` and `:220` both consume it |
| F1b | Converted to a behavioural case per doc 79; not independently re-run in this pass |

## 5. What was checked and found sound

So the finding is bounded rather than open-ended, the full check is recorded:

- **33 distinct 9-hex commit tokens** across docs 70–79 — **all 33 resolve to real
  commits** in this branch. Zero phantom hashes.
- **Zero citations past end-of-file** on any resolvable path.
- **`aiChatRoutes.mjs:372`** (docs 77, 78) is **still correct** — the +21 insert
  landed below it. Verified against the pre-revision.
- **`videoCatalogController.mjs:38`** (doc 76) is **still correct**.
- **`checkoutReconciliationCron.mjs:6`** (docs 70, 76) is **still correct**.
- **`checkoutReconciliationService.mjs:70-72`** (doc 70) is off by one — `:70` is
  blank and the statement begins at `:71` — but the enclosing function
  `reconcileStalePendingCarts` is real and the row is already annotated CORRECTED.
  Left as-is; recorded here so it is not re-flagged.

**No substantive claim in docs 70–79 was found false by this pass.** Every
citation that could be checked described real code at its authoring revision. The
defect is one of navigability and status currency, not of fabricated findings.

## 6. Recomputed totals

| Metric | Value |
|---|---|
| Citation tokens inspected | 163 path tokens (119 resolvable) + 88 with line numbers dumped and read |
| Commit hashes verified | 33 / 33 resolve |
| Citations confirmed rotted | 3 in doc 72, 4 headline in doc 73, 5+ in doc 76, 2 in doc 77, 2 in doc 78, 1 in doc 79 |
| Substantively false claims found | **0** |
| Stale status rows found | 5 (doc 77 §A: F1, F1b, F2, F3, F5) |

## 7. Follow-up hook for the next reviewer

Re-run the drift check before trusting any citation in this packet. Both probes
live in `tmp/coach-astra-hostile-20260912/` **inside this worktree**, and both take
no arguments:

```
node tmp/coach-astra-hostile-20260912/doc-cite-staleness.mjs
node tmp/coach-astra-hostile-20260912/cite-content-sweep.mjs
```

**These probes are NOT committed.** `tmp/` is gitignored (`.gitignore:146`), so
they exist on this machine's disk only. If this tree is ever re-cloned or the
`tmp/` directory is cleared, the two probes must be re-created from the
description below rather than expected to be present — the citation repairs in §2
are committed and permanent, but the tooling that found them is not.

- `doc-cite-staleness.mjs` reports citations whose target file was modified *after*
  the citing doc — the reverse ordering. **It structurally cannot catch the doc-72
  and doc-73 cases**, where the doc was edited *after* the file changed but kept
  pre-shift numbers inherited from an earlier draft.
- `cite-content-sweep.mjs` dumps the current content of every citation for a human
  read. **This is what caught the doc-72 and doc-73 cases.** Do not rely on the
  automated probe alone.
- `cite-pre-vs-head.mjs` prints a cited line at the parent of the commit that
  changed its file *and* at HEAD, which is how §1's "verified how" column was
  produced.
- `verify-doc-claims.mjs` resolves every commit hash and path token in docs 70–79
  and flags unresolvable ones.
