# 10 — Lane register beyond the eight

**Status:** `REGISTER ISSUED — SCOPE EXTENSION, NOT YET ADMITTED`
**Implementation verified:** No.
**Authored by:** the filer of this package (not Astra). This document is **not** part of Astra's
reply and is **not** covered by `MANIFEST.md`'s generated table — see the *Filer additions* section
of that manifest.
**Survey instant:** 2026-09-20T17:08-07:00 (≈14 h after the package was split at 03:11).

---

## 0. Why this document exists

The operator asked, in session:

> "look at the other agents' lanes and see what they're doing, and then from there you'll be able to
> make the best decision to see if you should go ahead and bring all those other ones into the Ultra
> Master Plan … if we can catch anything else that is stranded and not being worked on, I'd like to
> roll that all up in it too while we're at it. Why not?"

The master package as forged by Astra governs **eight** lanes (L1–L8). That set was correct at
03:11. It is **incomplete at 17:08**: at least four lanes outside the eight were active today, and
at least five carry work that nobody is on. This document records the survey, applies the
operator's own rule, and states what changes.

## 0.1 The decision rule — what the operator said, and what the filer added

The operator's words, verbatim and complete:

> "look at the other agents' lanes and see what they're doing, and then from there you'll be able to
> make the best decision to see if you should go ahead and bring all those other ones into the Ultra
> Master Plan … if we can catch anything else that is stranded and not being worked on, I'd like to
> roll that all up in it too while we're at it. Why not?"

**Correction, 2026-09-21 (round-2 hostile review, R2-02).** An earlier revision of this section put
*"Roll in what is stranded and not being worked on. Do **not** roll in what is live."* in a blockquote
directly beneath the operator's words, where it read as part of them. **It is not.** The second
sentence appears nowhere in the operator's message; it is the **filer's** reading, and it is a
categorical rule the operator did not state. It is kept here because it is still the right default —
but it is labelled a filer decision, and the operator can reverse it.

Folding an active lane into a master plan creates a second authority over work someone else is
mid-flight on — the failure this package exists to prevent. On that reasoning live lanes are
*recorded as coordination constraints*, not folded in.

## 0.2 Method, and what it can and cannot see

| Source | What it establishes | Limit |
|---|---|---|
| `git worktree list`, `git branch --merged`, `for-each-ref` | Where work physically lives; recency; divergence | Says nothing about whether a human/agent is *on* it |
| `.ai-workflow/coordination/*.lane.md` + `activity.log.md` | Seat claims, tasks, declared locks | **Self-reported.** `claim()` does not verify (§4.1) |
| `Z:\HostileReviews\index.jsonl` (59 entries) | Which lanes reached review, at which commit | Only lanes that got reviewed |
| `C:\tmp\*dispatch*.log`, `*astracall*.log`, packet mtimes | Dispatches **in flight right now** | A log with no `complete` line is the only in-flight signal available |
| Process table (`Get-Process` / `Get-CimInstance`) | What is actually executing | Cannot attribute a process to a lane without its command line |

**Not measured:** which lanes have a human owner; whether any lane's agent is idle-but-alive;
`C:/Users/BigotSmasher/.agents` internals beyond its packet header.

---

## 1. LIVE at the survey instant — recorded, **not** folded in

| ID | Lane | Evidence of liveness | In flight? |
|---|---|---|---|
| X1 | **L4 — Social Bridge R1 remediation** (already in the eight) | `coordination/workbuddy.lane.md` rewritten 17:02, `Status: in-progress`, 5 declared paths; `R1-REVIEW-ROUND-2-REPLY.md` written 17:06:35 | Review **landed** 17:06:35; the seat was holding its commit on it |
| X2 | **Coordination discovery** (harness-neutral lane discovery) | `BLUEPRINT-coordination-discovery-2026-09-20/` 12 files at 17:06; `scripts/hooks/lane-session-start.mjs` modified **17:07**; review filed 17:07:23 | No — but the fix is being edited as this is written |
| X3 | **Migrations reconciliation** | `BLUEPRINT-migrations-reconciliation-2026-09-20/CONSULT-PACKET.md` at 16:59; dispatch log `C:\tmp\astra-migrations-dispatch.log` shows `effort=xhigh`, 70,760 chars, **no `complete` line** | **YES** |
| X4 | **Skill-library governance instrument, round 7** | `C:\tmp\astra-packet-r7.md` at 17:02 (309,100 chars); `C:\tmp\astra-run-r7.log`; target repo `C:/Users/BigotSmasher/.agents` @ `6f08ee1` on `master` | **YES** |
| X5 | **L1 — Creator Brains console** (already in the eight) | HEAD `b23155b99` committed 16:58:01 ("close R5-01..R5-04") | No — committed |

**Consequence of X1–X5:** five lanes moved between 16:55 and 17:07.

**Correction, 2026-09-21 (round-2 hostile review, R2-03).** An earlier revision called the binding
*"stale for any lane that has moved since its review was filed"*, and offered L4's HEAD advance from
`4977987a7` to `b23155b99` as though it showed that L4's *reviewed material* had changed. **A moving
branch tip is not changed reviewed material.** Three distinct things were collapsed into one:

1. **Historical packet identity** — the bytes that were reviewed. `FILE-RECEIPT.md` is right that a
   fixed packet remains the same packet after HEAD moves. X1–X5 do not change this.
2. **Exact-checkout identity** — whether the reviewed content is still what a given checkout holds.
   **Not measured** for any of X1–X5.
3. **Scoped applicability** — whether a review of `4977987a7` may be carried forward onto a later
   HEAD. **Not measured**, and not decidable by comparing hashes.

What X1–X5 establish is **revision mismatch** for L4: the review is bound to a commit that is no
longer the tip. A strict exact-commit admission gate may reject that as a matter of policy — but that
is a policy outcome, **not** proof that the reviewed content changed. Carry-forward requires a
documented scope comparison and the existing authority's acceptance; a hash match settles neither.

## 2. Recovery candidates — recorded, **ownership UNKNOWN**

**Correction, 2026-09-21 (round-2 hostile review, R2-02).** This section was headed *"STRANDED —
rolled in"*, and its last column asserted a single verdict: *"Why it qualifies as stranded"*. Both
were wrong. **Inactivity is not absence of an owner.** Elapsed quiet time establishes *recency*; a
damaged worktree establishes a *hazard*; neither establishes that nobody owns the work, and neither
authorizes a scope transfer. The table now carries the four things that were being conflated —
activity, ownership, integration state and hazard — as separate columns.

| ID | Lane | Activity (measured) | Ownership | Integration state | Hazard | Admission |
|---|---|---|---|---|---|---|
| **B1** | Swan media-api | commit 04:10 today; review `2026-09-20-041049`; ~13 h quiet | **UNKNOWN** | `feat/media-api-2026-09-18` @ `3609b5fb9`, not merged | **YES — worktree structurally damaged (§3.2)** | recovery candidate, **not admitted** |
| **B2** | Swan Brain Console V3 salvage | review `2026-09-20-022403`; branch commit 2026-09-16 | **UNKNOWN** | `swan-brain-console-v3-salvage-20260918` @ `53f93854b` | overlaps L6 | **not a separate lane — L6 source alias** |
| **B3** | Swan Coach (astra-owned) | commit 02:38 today; ~14 h quiet | **UNKNOWN** | `53005a6da`, tree clean, not merged into `main` | none established | recovery candidate, **not admitted** |
| **B4** | Aftertaste standalone | **reviews ran today 03:15–04:16**; no commit since 2026-09-03 | **UNKNOWN** | `codex/aftertaste-hardening-20260830` @ `051f2fa2b` | none established | **review activity observed — not stranded** |
| **B5** | Rolodex bootcamp planner | commit 2026-09-16; 4 days quiet | **UNKNOWN** | `codex/rolodex-bootcamp-planner-20260913` @ `90feb17e8`, not merged | none established | recovery candidate, **not admitted** |

**Three corrections that each change a classification:**

1. **B4 Aftertaste was on the wrong side of the binary.** Reviews are work. This document itself
   reports reviews running on that lane *today* — and then excluded the lane from "being worked on".
   That is a contradiction in the original text, not a judgement call. B4 is **review activity
   observed**.
2. **B2 is not an additional lane.** It is L6's **source worktree**; §3.4 already said so. Listing it
   as a sixth stranded lane double-counted it.
3. **B1's damage is a hazard, not evidence about ownership.** A structurally damaged worktree argues
   for preserving it. It says nothing about whether an owner exists.

**No ownership transfer follows from elapsed hours.** Nothing in this section authorizes taking over,
merging, or discarding any branch. Every entry is a candidate for the operator's decision, which is
why the admission column reads `not admitted` throughout.

### 2.1 Structural items — recorded, not lanes

| ID | Item | Measurement | Why it matters to admission |
|---|---|---|---|
| **B6** | **`main` is 17 days stale** | `main` @ `2b3e7a62a`, committed 2026-09-03; the active branch is `creator-brains-engine-r2-20260915` | "merged into `main`" is **not** a completion signal in this repo. Any admission rule that keys on it is measuring the wrong thing. |
| **B7** | **Unmerged branch backlog** | 336 branches are merged into `main`; ~200 are not | The eight-lane model covers a fraction of the tree. This is the population the register was drawn from, and it is not exhausted. |

## 3. Blockers found by the survey

### 3.1 BLOCKER S1 — the Hermes inbox has been starved for 13 hours by a screen recording

This is the highest-severity finding of the survey and it is **not** a lane.

**Mechanism, measured:**

1. `C:\tmp\SwanWorkstationGuardian\config.json` lists `"ffmpeg"` under `busyGate.renderProcesses`.
2. `WorkstationGuardian.psm1:26-29` matches on **process name only** — no path, no age, no duration.
3. A process named `ffmpeg.exe` therefore sets reason `render:ffmpeg`, and
   `Get-GuardianDecision:70-73` returns `Defer`.
4. `hermes2-inbox-heartbeat.ps1:452-455` defers the whole drain run on that decision.

**What that ffmpeg actually is** (command line, verbatim):

```
"C:\Program Files\ShareX\ffmpeg.exe" -f gdigrab -thread_queue_size 1024 -rtbufsize 256M
  -framerate 30 -offset_x 3840 -offset_y 141 -video_size 3840x2018 -draw_mouse 1 -i desktop
  -c:v libx264 -r 30 -preset ultrafast -tune zerolatency -crf 28 -pix_fmt yuv420p
  -movflags +faststart -y "...\ShareX\Screenshots\2026-09\brave_M2nY4Y7I9w.mp4"
```

It is a **ShareX desktop screen recording** (parent `ShareX.exe`, PID 6832), not a render.

| Measurement | Value |
|---|---|
| PID / start | 73536, started 2026-09-20 **03:51:59** |
| Elapsed at survey | **~13 h 16 m** |
| Output file | `...\2026-09\brave_M2nY4Y7I9w.mp4` — **3,782.0 MB**, still growing |
| Growth | **+786,432 B in 20 s** = 39,321.6 B/s = **135.0 MiB/h ≈ 142 MB/h** |
| CPU | **26.55 s per 20 s wall ≈ 1.33 cores** — healthy, not hung |
| Guardian deferrals | **13 consecutive hourly runs**, 04:50 → 16:50, all `reasons=render:ffmpeg` |
| Inbox cost | `HEALTH.json`: `pending_count 13`, `last_outcome "deferred"`, `last_detail "busy: render:ffmpeg"` |

**The defect class, stated generally:** a name-based busy gate with **no maximum age** cannot
distinguish a render from a screen recorder, and has no escape hatch. One forgotten recording
starves the queue indefinitely. Note that `orphanPolicy` — the only age-aware rule in the module
(`minimumAgeMinutes: 240`) — is a **separate code path** and its `allowedProcessNames` is `["tail"]`,
so it does not cover this at all.

**Correction, 2026-09-21 (round-2 hostile review, R2-12).** One unit error and two overclaims:

- **Unit error.** `135 MB/h` mixed units. The measurement is 135.0 **MiB**/h, which is ≈**142 MB/h**.
  Corrected in the table above.
- **"Add a maximum age" is not a sufficient repair, and this document must not be read as prescribing
  one.** An old render can still consume resources, and an age-based bypass can replace starvation
  with resource contention. The mechanism is recorded here as an **operational hazard**.
- **This is not a universal admission prerequisite.** Nothing here establishes that all cross-lane
  communication depends on this inbox, that the gate was ever intended to permit sustained screen
  recording, or that draining *during* a recording is safe. The **communication impact is UNKNOWN.**
  A lane that needs a coordination channel may use another complete, acknowledged one.

A repair needs workload classification, queue-age escalation, resource limits and an
operator-controlled override — decisions that are not this document's to make. Unrelated lanes must
not be made to depend on speculative Guardian work.

**Why this belongs in the master plan:** the inbox is the channel by which lanes learn what other
lanes did. A 13-hour blind window is a 13-hour hole in cross-lane awareness, which is the substrate
MR-04/MR-07 depend on.

### 3.2 BLOCKER S2 — the media-api worktree reports 12,971 deletions and is a commit trap

| Measurement | Value |
|---|---|
| Worktree | `C:/tmp/ss-media-api`, branch `feat/media-api-2026-09-18` @ `3609b5fb9` |
| `git status --porcelain` | **12,971 entries — every one ` D`** (0 modified, 0 untracked, 0 staged) |
| Files tracked at HEAD | 14,682 |
| Deleted paths **not** in HEAD | **0** — every deletion is a genuine tracked file |
| Absent trees | `frontend/` **5,635** (the whole tree), `backend/` 2,863, `docs/` 1,545, `archive/` 1,248, `AI-Village-Documentation/` 679, `scripts/` 467, `.ai-workflow/` 214, `.claude/` 82, `.agents/` 68 … |
| `git sparse-checkout list` | `fatal: this worktree is not sparse` |
| Worktree reflog | **one entry only** — the round-25 commit; no checkout entry |

**The hazard:** in that worktree, `git add -A` or `git commit -a` stages 12,971 deletions and
removes `frontend/` from branch `feat/media-api-2026-09-18`.

**Cause — stated as unproven.** Two mechanisms fit the evidence and I did not establish which:
(a) a partial checkout truncated under disk pressure — the guardian log records **`freeGB=5.5` on
C: at 03:50:06**, 1 m 53 s before the recording and the worktree both started, and C: now has
106 GB free, so ~100 GB was freed at some point after; or (b) a deliberate prune of the trees the
media-api lane does not need. The reflog's missing checkout entry is consistent with (b) but does
not prove it. **Either way the hazard is identical**, and the honest label is *cause not
established*.

### 3.3 BLOCKER S3 — the coordination instrument cannot detect a conflicting claim

Verified by reading shipped source, not relayed from a review:

- `scripts/lane.mjs:97-119` — `claim()` writes its own lane file and calls `logActivity()`. It
  **reads no other lane**, and performs **no conflict check of any kind**.
- `scripts/lane.mjs:121-129` — `release()` **does** guard: `const mtimeAtRead = statSync(LANE_PATH).mtimeMs;`
  with a comment explaining the concurrent-write race it prevents.

So the guarded operation is release; the operation other agents *act on* is unguarded.

**What this invalidates:** `workbuddy.lane.md:13-14` states *"Verified before claiming: no other
lane claims these paths. `grep -l` over `coordination/*.lane.md` matched only my own lane."* That is
a **manual procedure performed diligently by one seat** — not an invariant the instrument enforces.
A less diligent seat claiming the same path gets no warning.

**Consequence for this package:** the master plan's cross-lane safety currently rests on
**convention, not mechanism**. MR-04 and MR-06 must not assume claim exclusivity. Until `claim()`
checks, the master plan needs its own conflict detection rather than inheriting the ledger's.

**Corroborated independently:** `scripts/lane.mjs` truncates at four sites — `SIBLING_CAP = 3`
(`:218`, `:221`, `:224`, `:227`), `l.locks.length > 5` (`:235`), `live.length > 6` (`:237`), and
`l.locks.length > 40` (`:325`). A `digest` read is therefore **not** a complete lock inventory, and
an agent that treats it as clearance to edit is acting on a truncated view.

### 3.4 Finding S4 — L6 and B2 are two authorities over the same salvage

L6 (`BLUEPRINT-swan-brain-console-v3-merge-2026-09-18`) already governs the Swan Brain Console V3
salvage and holds internal decision authority (README authority rule 5). B2 is the **live worktree
and branch** (`swan-brain-console-v3-salvage-20260918`) that the same salvage was committed from,
and it was reviewed as recently as 02:24 today.

Folding B2 in naively would create a second authority over L6's subject. **Resolution required
before admission:** B2 is admitted as *the source location for L6's M0 preservation slice*, not as
an independent lane. This is a **contradiction to record**, per README authority rule 6 — not one
for the builder to resolve silently.

### 3.5 Finding S5 — a concurrent reconciliation blueprint exists for the same repo and branch

`BLUEPRINT-migrations-reconciliation-2026-09-20/CONSULT-PACKET.md` (16:59) targets
`SeanSwan/-SS-PT-New`, branch `creator-brains-engine-r2-20260915` — **the same repo and branch this
package governs**, and its subject is "the correctness of the database migration system and the
reconciliation of a 30-round hostile-review ledger."

This is not necessarily a duplicate: this package reconciles *package references and admission*;
that one reconciles *the migration system*. But two reconciliation packages on one branch, authored
by different seats within 3.5 hours, is exactly the overlap the register exists to surface. **It is
recorded as a coordination constraint on X3, and no attempt was made to adjudicate it.**

---

## 4. What changes in this package

1. **Scope.** The register B1–B5 + B6/B7 is added as *surveyed, not admitted*. Nothing in
   `00-README.md`'s eight-lane table is withdrawn or renumbered.
2. **Admission gate gains a precondition, restated (R2-03).** Before any slice is admitted, the
   admitting seat must state whether the target lane's **reviewed content** still matches the checkout
   the slice would build on — and, where it does not, must obtain the existing authority's acceptance
   for carry-forward. A **moved tip alone is a revision mismatch**; it is not evidence that reviewed
   content changed. X1 makes this non-hypothetical: L4's round-2 packet was bound to `4977987a7` while
   HEAD advanced to `b23155b99`, and nothing in this survey measured whether L4's reviewed files
   changed.
3. **MR-04/MR-06 may not assume claim exclusivity** (§3.3). Conflict detection is this package's
   responsibility, not the ledger's.
4. **S1 is recorded as an operational hazard with an UNKNOWN communication impact — not a lane, and
   not a universal admission prerequisite (R2-12).** It is infrastructure. **No repair is authorized
   or prescribed here:** "add a maximum age" is *insufficient*, because an old render can still
   consume resources and an age bypass can convert starvation into contention. Choosing a repair
   requires workload classification, queue-age escalation, resource limits and an operator-controlled
   override — all operator decisions.
5. **S2 is recorded as a hazard, with no action taken.** No file in `C:/tmp/ss-media-api` was
   modified, restored or staged by this survey; that worktree belongs to another seat.

## 5. Limits of this survey — what a reader must not conclude

- **Ownership is UNKNOWN for every B-lane, and this survey did not measure it.** The register records
  *no recent activity*; it does not establish *no owner*, and nothing in §2 authorizes taking over,
  merging or discarding anything. "Stranded" was the wrong word for that column and has been replaced
  by the separate activity / ownership / integration-state / hazard fields (R2-02).
- **The lane set is not exhausted.** §2.1 B7 measured ~200 unmerged branches. This survey examined
  the worktrees, the ledger, the archive and the in-flight dispatches — not all ~200 branches.
- **Activity inference is indirect.** No process was attributed to a lane without its command line;
  the four in-flight/just-landed calls in §1 are established from dispatch logs and file mtimes, not
  from process ownership.
- **The `deferred` inbox state is 13 memos of *unknown* content.** They were not read by this survey,
  so whether any of them bears on admission is **unestablished**.
