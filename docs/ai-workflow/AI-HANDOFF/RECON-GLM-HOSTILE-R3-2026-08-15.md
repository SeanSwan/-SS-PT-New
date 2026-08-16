# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/recon-review-r3.md
**Tokens:** 15026 in / 19991 out (reasoning: 17806) | total 35017
**Wall:** 298.0s

---

# Round 3 report

Before anything else, the verification you asked for produced a result I cannot soften:

---

## F1 · CRITICAL · the round-3 self-fix is **not in the code you sent**

You wrote: *"recon-scan.mjs reads it, pushes a per-source warning into notExamined, report.mjs prints a DEGRADED RUN banner ABOVE the decision summary, renderJson now emits degraded, degradedCount, plus per-item needsContentConfirm, filesUnknown, and contentCheck."*

None of that exists in the snapshot above. Specifically:

- **`recon-scan.mjs`, Phase 0 block** — the only statements after `const inv = await census(...)` are the fsck line and the stash-count line. `inv.degraded` is never read. No per-source warnings.
- **`report.mjs`, `renderReport` destructure** — `{ base, baseSha, items, notExamined, workingTree, startedAt, durationMs, deepCount }`. No `degraded`, no `degradedCount`. There is no banner between the title block and `DECISION SUMMARY` — I read the section sequence twice; it goes header → summary directly.
- **`report.mjs`, `renderJson` item map** — fields end at `error`. No `needsContentConfirm`, no `filesUnknown`, no `contentCheck`. Top level has no `degraded`.

Corroborating problem: your live-verification numbers — *"degradedCount 0, 30 items needsContentConfirm, 51 with contentCheck"* — **cannot be produced by the `renderJson` posted here**, because it emits none of those fields. Whatever produced those numbers was not this code. Either you pasted a stale snapshot or the edit was never saved.

Concrete failure scenario (why this stays CRITICAL, not bookkeeping): worktree listing fails → `listWorktrees` returns the flagged empty array → no branch gets `inWorktree` → a branch someone is actively using classifies LANDED/HIGH → `[ARCHIVE]`, with zero warning anywhere. That is the *exact* scenario R2-3's own comment documents ("disarms the ACTIVE_LANE guard silently"). Same for unreadable lanes and failed stash enumeration. The dead `degraded` object is the third instance of the computed-never-consumed class this session, and the changelog entry claiming it's wired is the part that makes this round-blocking: I was instructed the item was answered, and the artifact says otherwise.

**Fix:** apply the edit you described, then verify against the artifact, not memory: `grep -n degraded scripts/recon-scan.mjs scripts/recon/report.mjs` must hit; `renderJson` output must contain `needsContentConfirm` on the ~30-item population. If your working tree already has it, re-send the correct snapshot — this review evaluated the code above.

This re-opens **remit items 1 and 4**: as posted, neither is answered.

---

## F2 · MEDIUM · `report.mjs` renderReport — EXPERIMENTAL verdicts are never rendered

`g(VERDICT.EXPERIMENTAL)` is computed into `byVerdict` and never read. The decision summary counts landed / human / unknown / in-flight; `WHAT TO DO` lists RISK, CONFLICTING, UPGRADE, WIP, COST; EXPERIMENTAL appears in **no count and no section**. `MARK[EXPERIMENTAL] = '[PARK]'` is a dead mapping in practice.

Failure scenario: your own arithmetic — 253 + 21 + 32 + 98 = 404 of 409. Five refs map to no printed category. If any are EXPERIMENTAL, the owner's artifact silently omits them. Amplifier: `NAME_SIGNAL`'s `/try/` is unanchored, so `industry-partners-api`, `country-selector-fix`, `retry-auth` each score −2 → `EXPERIMENTAL` → invisible. Real work disappears from the report the human reads (it survives only in `--json`).

**Fix:** print an EXPERIMENTAL section (or at minimum a count line), and make the decision-summary categories sum to `items.length` so omissions are self-detecting. While there: `risky.slice(0, 6)` prints no `+N more` and no total — with 9 sensitive branches the reader sees 6 and no hint of the rest; `decisions.slice(0, 12)` at least has `needsHuman` counting all. Anchor every truncating slice to a printed total.

## F3 · MEDIUM · `git.mjs` git() — no timeout on any spawn

`execFileAsync` is called without a `timeout`. Remit 2 asked whether a slow check degrades the run: a *failed* check is fine (fail-closed per branch), but a *hung* one is not — a stalled `git diff` (corrupt object triggering recovery, NFS/AV stall on Windows) parks its `mapLimit` worker forever. Twelve hung calls = full deadlock, no diagnostic, and no partial artifact, since the report is written only at the end.

**Fix:** `execFileAsync('git', args, { timeout: 60_000, ... })`, treat `err.killed` as `code: -1` failure. All existing failure paths already handle non-zero results conservatively.

## F4 · MEDIUM · `recon-scan.mjs` deep pass — `commitSubjects(mergeBase, x.item.ref, 40)` uses the SHORT ref

`classify()` fully qualifies refs precisely because gitrevisions resolves `refs/tags/<name>` before `refs/heads/<name>` — your own comment calls this load-bearing. `deepConfirm` correctly uses `x.rec.qualifiedRef ?? x.rec.ref`; `commitSubjects` two lines earlier uses the short name. A repo with tag `v2-payment` and branch `v2-payment` reads subjects from the wrong range → WIP-marker counting runs on evidence about a different object → wrong WIP/UNKNOWN verdict. Not archive-dangerous, but it's silent wrong-evidence classification of the exact class the qualification rule exists to prevent.

**Fix:** `commitSubjects(x.rec.mergeBase, x.rec.qualifiedRef ?? x.item.ref, 40)`.

## F5 · LOW · `equivalence.mjs` classify — contradictory state: HIGH + `needsContentConfirm === true`

Path: cherry absent=0 → LANDED/MEDIUM, flag set → diffStat returns `fileCount === 0` → LANDED/**HIGH** (comment: "never HIGH on patch-id alone") while the flag stays set, and the inline confirm is skipped (`files.length > 0` is false). The `assignVerdict` guard rescues it into CONFLICTING, so the outcome is safe but over-conservative, and the pushed signal `landed-by-patch-id-UNCONFIRMED` misdescribes an empty-diff case. Sibling mislabel, same population safety: a truncated content check with zero differing files logs `content:DIFFERS-at-base(0/2000)` — "DIFFERS" with differing=0; it was truncation.

**Fix:** in the `fileCount === 0` branch, either clear `needsContentConfirm` with an explicit signal, or don't raise confidence past MEDIUM while it's set; label the truncation case `content:TRUNCATED`.

## F6 · LOW · `git.mjs` contentPresentInBase — batch-by-count can still exceed the Windows limit you cite

150 paths × ~220 chars ≈ 33k > CreateProcess's 32,767. Fails closed (`failed: true` → unconfirmed → human), so not a safety bug, but that branch is then *permanently* unconfirmable — recurring [HUMAN] noise. **Fix:** accumulate chunks by cumulative byte length (~24k budget), not count.

## F7 · LOW · cleanup, same dead-code class, smallest instances

- `blobAt` is exported and imported nowhere.
- `--concurrency` / `--deep` passed as bare flags → `Number(undefined) = NaN` → `mapLimit(items, NaN)` builds zero workers → empty sweep rendered as a success-shaped "0 refs" report, exit 0. Validate argv numbers.
- `ALREADY LANDED` header says "content is already on ${base}" — the net-diff-empty population's content is *not* on base (your own in-code comment forbids implying the fix is live). "no net content delta vs base" is the honest wording.

---

## Remit coverage

1. **degraded consumed?** No — see F1. This is the round's decisive finding.
2. **Inline confirm cost:** worst case per cherry-zero branch ≈ 6 + ⌈min(files,2000)/150⌉ ≤ 20 spawns, sequential within branch, ≤12 concurrent — no explosion, and consistent with 16.5s over 409 refs. One bounded duplication: PARTIAL-via-DIFFERS finalists run the content check twice (inline + `deepConfirm`) — harmless. Real exposure is liveness, not cost (F3).
3. **Verdict-flow completeness:** enumerated all five producers of LANDED+HIGH — ancestor, zero-ahead, tree-identical (direct containment proofs, sound without content check), net-diff-empty (sound, see F5/F7 for state and wording), content-confirmed (the check itself). **No reachable LANDED+HIGH on weak evidence.** LOW-confidence records all route to UNKNOWN before the sensitivity floor, which is safe (both print [HUMAN]).
4. **JSON honesty:** fails as posted — F1. Partial mitigation only: a determined consumer can grep `signals` for the warning strings, but signals are display text, not contract.
5. **Structurally new:** F2, F4, F7.

R2-1 through R2-6 verified present and correct as described.

**Not clean — one CRITICAL (claimed fix absent from the artifact) + three MEDIUM + three LOW.** Send the snapshot that actually contains the degraded wiring and I'll re-verify F1 and the JSON field set against it; F2–F4 stand regardless of which snapshot is current.
