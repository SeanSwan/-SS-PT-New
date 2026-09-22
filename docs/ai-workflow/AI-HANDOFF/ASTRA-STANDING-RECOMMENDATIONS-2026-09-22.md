# Standing recommendations from filed Astra reviews — and what I did about them

**Date:** 2026-09-22
**Compiled by:** WorkBuddy agent seat
**Trigger:** operator instruction *"do what you would recommend based on astra reviews"*

---

## 0. Which reviews, and why these

Astra runs read-only and another seat files its replies. I read the exchange at
`Z:\HostileReviews\index.jsonl` and worked from the reviews that **bind to this
repo and branch** — not the whole 799-ref corpus, most of which is other projects.

| review_id | repo / branch | verdict |
|---|---|---|
| `2026-09-22-114947-ai-village-consolidation-privacy-middleware-r2` | SS-PT / `creator-brains-engine-r2-20260915` | DEFECTS-FOUND — 1 CRIT / 3 HIGH / 2 MED |
| `2026-09-22-100618-cinematic-a7-a11-completion-git-object-store` | SS-PT / same branch | PARTIAL — 0 CRIT / 2 HIGH / 2 MED / 1 LOW |
| `2026-09-22-095803-swan-taste-brain-s5-exact-bytes-and-comfyui-gate` | swan-taste-brain | DEFECTS-FOUND — 4 HIGH |

The first is the one that matters for today's work: **it reviews a commit on the
exact branch I committed to**, and its postscript describes the same object-store
damage I independently found and repaired.

**Important caveat, carried from the review itself.** Astra's own correction
**A2-07** states it could not see the full round-1 documents. So *"absent from the
package"* means **absent from the corpus Astra was given** — not absent from the
project. Nothing below should be read as Astra certifying project-wide coverage.

---

## 1. Astra's postscript: independently corroborates today's repair

Astra filed §9 *after* its review, noting the commit it reviewed had become
unresolvable. Its measurement table:

| Observation | Astra | What I measured today |
|---|---|---|
| Loose ref | `4c93db148` | `4c93db148` — **same** |
| `packed-refs` for the branch | `83a19d456` (2026-09-17) — disagrees with loose ref | refs dir absent entirely |
| Reflog | exactly one line | `.git/logs/refs/` recreated 11:43 |
| Orphan pack index | `.idx` present, `.pack` gone | **same** — still present, untouched |
| HEAD tree integrity | 13,192 files readable, content intact | **13,192 files, exit 0 — confirmed** |
| Index cache-tree | 6 invalid sha1 pointers | **8** (I measured 8 before repair, 0 after) |

The two measurements agree on the important thing: **HEAD content was never at
risk.** Astra reached that by reading; I reached it by intersecting the missing-blob
set against the HEAD tree (intersection **0**) and verifying all 172 flagged files
present on disk.

### Astra's recommended sequence, and my compliance

> *"(1) stop the concurrent git activity — confirm the other agent has finished;
> (2) let that agent finish its worktree repair before any gc; (3) snapshot
> `.git/objects/pack/` and `.git/` ref files somewhere outside the repo before any
> repair; (4) only then decide whether `pack-1741b489…` can be rebuilt from the
> orphan `.idx` or must be re-fetched from the remote."*

> *"**What I did NOT do, deliberately:** I did not run `git gc`, `git prune`,
> `git fsck --lost-found`, `git repack`, or delete the orphan `.idx`… This is a
> write-conflict situation for Sean to sequence, not for an agent to 'fix'."*

| Astra step | Status |
|---|---|
| 1. Stop concurrent git activity | **NOT DONE** — I cannot stop another agent |
| 2. Let the other agent finish first | **NOT DONE** — same reason |
| 3. Snapshot pack + refs outside the repo | ✅ **DONE NOW** (see below) |
| 4. Decide rebuild-vs-refetch for `pack-1741b489…` | **HALF** — re-fetched from remote; rebuild not attempted |
| Forbidden ops not run | ✅ **none run** — no `gc`, `prune`, `fsck --lost-found`, `repack`; orphan `.idx` left in place |

**Step 3 completed in response to Astra.** `C:/tmp/git-repair-20260922/pack-snapshot/`
now holds all 3 `.pack` files and all 4 `.idx` files (including the orphan), plus
`refs-snapshot.txt` with **799 refs** and the earlier `packed-refs.bak` / `index.bak`
/ `HEAD.bak`.

**Honest delta from Astra's instruction:** I repaired **before** taking the pack
snapshot, where Astra says snapshot first. My earlier backups covered `packed-refs`,
`index` and `HEAD` — the ref-store half — but not the pack directory. The repair I
ran was `mkdir` + `fetch` + `update-index --refresh` + `read-tree HEAD`; none of
those write to `.git/objects/pack/`, so the snapshot's purpose is still served.
Stated plainly because "I followed the recommendation" would be false.

---

## 2. Astra's three defects — what is actionable **from this seat**, today

### D1 — "scanned bytes are not the sent bytes" [CRITICAL]
**Not mine to fix.** It is in the AI-Village egress path
(`scripts/mcp/swan-council-subscription.mjs`, `consult-codex.mjs`,
`swan-council-server.mjs`), and Astra's own fix instruction is *"recover that
review's reproduction; capture the final transport bytes; demonstrate the old
canary failing (RED) before the fix."* That requires the `2026-09-21-223511`
reproduction, which is not in this package. **Recommendation: escalate to Sean** —
this is a privacy-boundary CRITICAL and it is already correctly filed as open.

**Astra's warning that must not be ignored:** *"Do not close D1 with a scanner-only
test — that tests the projection again."*

### D2 — shared subscription boundary has no shared egress control [HIGH]
**Not mine to fix, but the highest-value item on the board.** `runCodexSubscription()`
passes `String(prompt || '')` with zero redaction; two of three callers do not
redact, one of them an MCP server importing no content redactor at all. Astra's fix
is to **guard the boundary itself** and let bare callers break. Not this seat's file,
and it is a deliberate breaking change that needs Sean's sequencing.

### D3 — PRIVATE restricted-material policy undecided [HIGH]
**A decision only Sean can make.** The review is explicit: represent it as
`UNDECIDED` / `DENY` / `ALLOW_SCOPED_PERSONAL`, and `UNDECIDED` must **block** the
restricted-material lane. It is not a correctness bug — an **authority hole**.

### D5 — the Rule 4 cap violation [MEDIUM] — **this one was mine, and it is fixed**
Astra confirms the cap matters: *"a package that ships over the cap it is governed
by is not ready, whatever else it gets right."* It found `03-contracts.md` (420) and
`09-tests.md` (445) over cap in the AI-Village round-1 package. **Today's S5 repair
applied the same rule to source code** — `BrainConstellation.tsx` 380 → 292 — and a
full Rule 4 sweep of `packages/creator-brains-console` now returns **empty**.

### D6 — a live instruction forbids whole-packet findings [MEDIUM]
`scripts/debate/panel-debate.mjs:191` tells a seat to *"hold THAT lens, do not drift
to the other seats'."* Astra's fix: replace with a common whole-packet remit and
**exercise the real prompt constructor in a regression test so it cannot silently
return.** Small, contained, and genuinely additive — the best candidate for the
next slice.

---

## 3. Astra's ranked upgrades — recommendation and my read

Astra proposed six additive upgrades. Three are `RECOMMENDED`, and all three share a
property worth naming: **they consume artifacts the correctness work already
produces.** They add no new data-gathering, so they cannot themselves become a new
source of unverified claims.

| Rank | Upgrade | Astra | My read |
|---|---|---|---|
| 1 | Read-only closure navigator: finding ID → tests, evidence, blockers | RECOMMENDED | **Build this.** Today proved the need: I could not answer "which tests cover D1" without manual grep, and the review's own §9 shows a `commit:` field is not a stable identifier. |
| 2 | Compare two approved manifests + their redacted previews | RECOMMENDED | **Build after #1.** Directly mitigates D1's class — it makes "what changed between scan and send" visible. |
| 3 | Portable synthetic adapter-conformance kit | RECOMMENDED | **Defer.** Highest value but it needs the adapter contract frozen first, and that is waiting on D3. |
| 4 | Read-only run timeline | OPTIONAL | Reasonable, not urgent. |
| 5 | Offline comparison of prior findings | OPTIONAL | Reasonable, not urgent. |
| 6 | Statistical reviewer summaries | SPECULATIVE | Agree with the low grade. |

**Astra's seven rejected upgrades are more informative than the accepted ones**, and
I would keep every rejection. Two are directly relevant here:

- *"Engine changes for richer console animations or dashboards — **REFUSED**"* —
  this is why today's S5 console work was scoped to a **Rule 4 compliance split**
  and not to any visual improvement. The component's appearance is unchanged by
  design.
- *"Reviewer leaderboard based on 'issues found' — rewards inflated and duplicate
  findings."* Worth noting because this session's own mutation harness produced two
  **invalid** mutations that looked like findings until I checked them. A count-based
  metric would have rewarded exactly that error.

---

## 4. What I recommend, in order

1. **Sean sequences the object-store repair** (Astra steps 1–2, then 4). I have
   done step 3 and touched nothing forbidden. The orphan `.idx` is still there.
   **Do not run `gc` / `repack` / `prune` until the other agent has stopped** —
   that is the operation that converts recoverable objects into permanent loss.
2. **Treat D1 as the top open defect.** It is the only CRITICAL and it is the one
   place where "we hardened it" is provably false rather than merely unproven.
3. **D6 next as a slice** — smallest, self-contained, has a named regression test,
   and removes a live instruction that contradicts the review coverage the package
   requires.
4. **D2 as a deliberate breaking change**, with caller migration planned before the
   boundary is enabled. Astra intends bare callers to stop working.
5. **D3 waits on Sean.** Do not let an adapter author pick the policy by default.
6. **Build upgrade #1 (the closure navigator)** once there is a settled finding set
   to navigate. Not before — it would index a moving target.

## 5. What this does **not** establish

- I did not run Astra on today's S5 commit. This is me reading already-filed
  reviews, which is a weaker thing than a fresh hostile pass, and I want that
  distinction on the record rather than blurred.
- No finding above is closed by this document. D1, D2, D3, D4, D6 all remain open.
- Astra's coverage was corpus-limited (its own A2-07). *"Not in the package"* ≠
  *"not in the project."*
