# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/recon-review-r4.md
**Tokens:** 15465 in / 19005 out (reasoning: 17230) | total 34470
**Wall:** 269.8s

---

## F1–F6 verification against this snapshot

| Fix | Status | Evidence |
|---|---|---|
| F1 `degraded` wiring | **VERIFIED** | `census()` returns `degraded:{worktrees,stashes,lanes,status}`; `recon-scan.mjs` reads `inv.degraded`, pushes the four ⚠ lines into `notExamined`, computes `degradedCount`; `report.mjs` prints the `DEGRADED RUN` banner before `DECISION SUMMARY`; `renderJson` emits `degraded`, `degradedCount`, and per-item `needsContentConfirm`/`filesUnknown`/`contentCheck{...}`. Round-3 F1 was indeed a packet artifact, not a code gap. |
| F2 EXPERIMENTAL rendered | **VERIFIED** | `decisions` includes `...g(VERDICT.EXPERIMENTAL)`; `MARK` maps it to `[PARK]`; `assignVerdict` returns it after the sensitivity floor. |
| F3 timeout | **VERIFIED** | `timeout = 60_000` default + `killSignal: 'SIGKILL'` in `git()`. |
| F4 `qualifiedRef` at call site | **VERIFIED** | `commitSubjects(x.rec.mergeBase, x.rec.qualifiedRef ?? x.item.ref, 40)`; `deepConfirm` also uses `rec.qualifiedRef ?? rec.ref`. |
| F5 flag clearing + TRUNCATED label | **VERIFIED** | net-diff-empty sets `rec.needsContentConfirm = false`; inline check has the `res?.truncated && res.differing === 0` branch pushing `content:TRUNCATED(...)`. |
| F6 byte-length batching | **VERIFIED** | `maxArgBytes = 24_000`, `Buffer.byteLength(p, 'utf8') + 1` accumulation. |

Verified-state arithmetic is internally consistent (98+253+32+21+5 = 409; 30 needsContentConfirm vs 21 conflicting + downgraded unknowns is plausible). I can't execute anything — this is a static read of the packet.

## Verdict: NOT clean — two findings, then I believe the loop is dry

I am not padding. Finding A is the same class as the round-2/3 coverage bugs; Finding B is small but user-visible. Everything else I chased (argument order in `isAncestor`/`aheadBehind`, left-right count parsing, `-z` numstat parsing, the LANDED-verdict gating, the sensitivity-floor ordering, the truncate/failed handling in `neverAgeOut`, the freshness gate inversion, the four-or-five sub-paths through `classify` for cherry-absent-0, degenerate `--concurrency 0`) checked out correct or degenerates conservatively.

---

### Finding A (moderate) — AUDIT DELTA population treats `equivalence: LANDED` as proof, including the records the classifier explicitly declined to prove

`report.mjs`:
```js
const nonLanded = items.filter((it) => it.rec.equivalence !== EQUIV.LANDED);
```

`neverAgeOut()` established the invariant: `needsContentConfirm`, `contentCheck.truncated`, `contentCheck.failed`, `filesUnknown` all mean *shipped-ness not established*. The AUDIT DELTA is the one consumer that ignores it — it filters on `equivalence`, which remains `already-landed` in exactly these reachable states:

- (a) cherry `absent===0` → LANDED MEDIUM, `needsContentConfirm`; inline content check returns `failed: true` → stays LANDED, LOW;
- (b) same, but content check truncated (>2000 files) with 0 differing → stays LANDED, LOW;
- (c) cherry `absent===0` and `diffStat` fails → files empty, inline check skipped, `filesUnknown`, stays LANDED, LOW.

All three get verdict CONFLICTING ([HUMAN]) — the decision path is safe — but they are **excluded from both `risky` and `unresolved`** in the AUDIT DELTA, because the population filter runs before those predicates ever see them.

**Concrete scenario.** Branch `claude/checkout-guestfix`, 12 commits, all squash-merged into `origin/main`, then reverted on main. `git cherry` → absent 0 → LANDED MEDIUM, `needsContentConfirm`. The content check errors on one batched diff (`failed: true`) — or the branch touches >2000 files, truncating the check. Result: a cart/checkout branch whose only live copy may be the branch itself appears in **neither** the ⚠ sensitive list **nor** the "could NOT be inspected" count, and the section prints either *"Sensitive paths: NO unpushed changes detected across all N non-landed refs"* or *"No sensitive unpushed changes found in the N refs we could fully inspect"* — a coverage claim computed over a population that omits the one ref the engine flagged as unproven. With 21 conflicting verdicts and `decisions.slice(0, 12)`, the branch may not even be named in the body; only the `needsHuman` count contains it. Wrong output: a false-clean sensitive-surface claim in the section whose entire job is that claim.

**Fix (one line):**
```js
const nonLanded = items.filter((it) => it.verdict !== VERDICT.LANDED);
```
`VERDICT.LANDED` is precisely the content-proven HIGH set — everything else is either non-landed or unconfirmed. (This also pulls ACTIVE_LANE items whose content is proven into the population; slightly conservative, and correct for a section titled "what an audit of base will NOT see".) Alternatively keep the equivalence filter and add `|| it.rec.needsContentConfirm === true || it.rec.filesUnknown === true`.

### Finding B (low) — the report advertises a `--full` flag that does not exist

`report.mjs`: `+ ${landed.length - 8} more  [--full to list]`. `recon-scan.mjs` parses `--base`, `--deep`, `--json`, `--out`, `--stale-ok`, `--concurrency` — no `--full`.

**Scenario:** live run has 253 landed branches → report says `+ 245 more  [--full to list]` → user runs `node scripts/recon-scan.mjs --full` → the token is silently ignored, identical 8-branch list, exit 0. Wrong output: an instructed action that is a no-op with no error. Fix: implement it (raise/remove the `landed` slice) or drop the hint.

---

## Non-blocking notes

- `VERDICT.SUPERSEDED` has no producer and is absent from `decisions` — dead enum member today (unlike F2, nothing assigns it, so no rendering hole exists). If Phase 3 starts assigning it, add it to `decisions` then.
- `blobAt()` is exported and unused.
- `deepConfirm` re-runs `contentPresent` for inline-downgraded PARTIAL records — deterministic duplicate work, harmless. But note its `wantsPresenceCheck` branch lacks the F5 truncated-0 guard and would print `content:DIFFERS-at-base(0 of 2000)`. It is unreachable today only because truncated-0 records stay equivalence-LANDED and never become finalists; if finalist selection ever changes, F5's bug re-enters through this path. Worth a one-line guard next time the file is touched.
- `--concurrency 0` silently yields "0 refs swept" (holes filtered out). Garbage-in edge; a guard would be nice.

## Recommendation

Apply A (it's a one-liner closing the last consumer that violates the needsContentConfirm invariant) and B trivially. I do not believe either warrants another full round: A's trigger paths are all failure/rare branches and the verdict layer already routes those records to [HUMAN] — the defect is confined to the audit-delta coverage statement. If you patch both and the diff touches nothing else, I'd call the loop dry on the next pass without re-verifying F1–F6.
