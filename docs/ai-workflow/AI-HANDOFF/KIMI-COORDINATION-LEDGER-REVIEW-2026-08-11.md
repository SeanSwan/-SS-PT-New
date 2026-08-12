# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-LEDGER-HOSTILE-REVIEW-PACKET-2026-08-11.md
**Seed:** (none)
**Tokens:** 3579 in / 11529 out | **Cost:** ~$0.1837 | **Wall:** 155.5s | **finish_reason:** stop

---

# Hostile Review — Coordination Ledger Upgrade (Rule 67 / LCL)

Reviewer pass, one shot. Section 4 gets the most weight because that's where new failure modes are being *purchased*.

---

## 1. Breaking §4

### §4.1 — The canonical-ledger fix has three holes

**1a. It anchors the coordination hub to the rottenest tree in the repo.** `<git-common-dir>/../.ai-workflow/coordination/` resolves into the *main working tree* — the same tree F6 documents as carrying 225 dirty files and 176 untracked. You've made the system's single source of truth a tenant of the tree most likely to be `git clean`-ed, reset, or abandoned by the owner. The ledger is gitignored, so a cleanup that wipes untracked files wipes coordination state with zero record. You are centralizing on the least stable node.

**1b. Lane writes are read-modify-write with no concurrency story.** "Overwritten each claim" (§1.2) plus 184 worktrees now pointing at one directory means the ledger itself becomes the contended resource it exists to prevent. Two agents claiming within the same second: last-writer-wins, one claim silently erased. Worse for `review-queue.md` and `activity.log.md` — agents append via read-then-Write-tool-rewrite, not `O_APPEND`, so concurrent appends lose entries. **You already have the evidence this happens: `review-queue.md.orig`, a 225 KB merge artifact, sitting in the ledger since 2026-07-19 (F6).** The ledger has *already* suffered the collision class it prevents, and §4.1 increases the write concurrency on it by two orders of magnitude without specifying atomic write (temp + rename), append discipline, or a merge rule.

**1c. "Orphaned content merged forward" violates R4 by construction.** Merged by whom? Any agent performing the merge writes lanes that aren't its own. And the orphans are from 2026-07-12 through 2026-08-03 — merging their lock lists forward imports *phantom locks* from dead sessions into the live ledger, freezing files nobody is editing. There is no defined arbiter for "is this orphaned claim still live," and R5 explicitly forbids agents from making that call. §4.1 creates a migration task the rulebook prohibits anyone from performing.

### §4.2 — The skill is F2 wearing a trench coat

A skill "fires" when the model invokes it. That is the exact enforcement mechanism F2 indicts: *a duty enforced only by the model remembering is a duty that will eventually be dropped.* §4.2 is either redundant with the §4.3 SessionStart hook (which is the actual deterministic layer) or it's a second, softer copy of the procedure that will drift from the hook's copy. Two sources of procedural truth, one of them optional.

Worse: **"publish an opening claim before the first edit" is unsatisfiable as specced.** At session start the agent does not know its `🔒 EDITING NOW` list. So the opening claim is either (a) empty of locks — other agents read it, see no locks, and proceed into the files you're about to touch, which is *worse than no lane* because it carries a fresh timestamp and an authoritative `Status: in-progress`; or (b) over-broad — lock the whole standing lane, which serializes the fleet and trains everyone that locks are noise. Lock-before-you-know is a timing contradiction at the heart of the design, and §4.2 mandates it.

### §4.3 — The gates

**SessionStart digest:** "Never blocks" plus ten lanes, 184 worktrees, 225 dirty files, stale warnings, orphan warnings = a multi-hundred-line wall of text prepended to every session. Context is the scarcest resource these agents have; a digest that reports *everything* trains readers to skim *nothing*. The failure mode isn't removal — it's worse: the hook keeps running, everyone ignores it, and you believe orientation is happening. The threshold error is that it reports state instead of *delta*: what changed since my last claim, and what intersects my declared task. Everything else is banner blindness fuel.

**Stop hook (`lane-freshness-gate`):** This is the gate that gets disabled first, and the threshold is wrong in both directions:

- "≥2 non-emission files" uses *count* as a proxy for *risk*. A one-line change to `render.yaml` is the highest-blast-radius edit in the repo; a 20-file docs sweep is zero-risk. The predicate is uncorrelated with the thing you care about.
- "lane file not updated this session" is satisfiable by the §4.2 opening claim. Claim at T+0, drift for three hours, gate passes. The gate checks the *letter* (mtime) against the *spirit* (lane reflects reality) and can only ever check the letter.
- `LANE: N/A — <reason>` is a free-text escape hatch with no validation and no audit. Agents are helpful pattern-matchers; within a week `LANE: N/A — trivial change` is a reflex emitted on every stop. Every gate with a costless bypass becomes a ritual incantation, then an annoyance, then a removed hook — and you're back to F2, except now with muscle memory for bypassing gates.

**PreToolUse push gate:** Three structural problems.

1. **"The pushed range" is not reliably computable from a command string.** `git push`, `git push origin`, `git push origin HEAD:main`, `git push --force`, `git push origin main --delete`, push with `push.default=upstream`, pushes from inside a script or via `git -C` — the hook must parse arbitrary refspecs and resolve them against remote state it may not have fetched. It will mispredict, in both directions: blocking doc pushes whose branch merely *contains* an old migration (fatigue), and waving through a force-push it misread (false confidence — worse than no gate).
2. **The owner-approval channel is undefined and therefore forgeable.** "Explicitly approved in-session" — represented how? Any artifact the hook can check (a file, an env var, a line in the lane) is an artifact the agent can write. Not maliciously — *helpfully*: "the owner approved this pattern last Tuesday, I'll record that." An approval mechanism the gated party can mint is not an approval mechanism.
3. **It only sees `git push` typed into a hooked shell.** `gh pr merge`, the GitHub API, a cloud agent's own git client — all perform the identical irreversible act with zero hook coverage. See §5 of this review.

### §4.4 — "Computed, not asserted" is computed *once*, then asserted

`Delivery` is computed at SessionStart. Delivery state changes *during* the session — the push is the point of the session. So the field is a T+0 snapshot wearing a "computed" badge, and every other agent reading the lane file mid-session sees stale truth with fresh-looking provenance. You have re-implemented the §2 incident — "my deletion was invisible to them for hours" — as a schema field. Unless the field is recomputed on every *read* (by what? the lane file is static Markdown), it is asserted-at-start, and the schema lies about its own freshness. Same defect for `Blast radius`: self-classified by the agent whose incentive is to finish, or computed by nothing specified.

### §4.5 — The delivery log is a hand-maintained shadow of `git log`, and it will lie

- **It reintroduces the conflict surface the gitignore rationale correctly avoided.** §1.1's own reasoning: a constantly-written shared file, if tracked, causes the collision it prevents. `review-queue.md.orig` is the empirical proof this already happens to your append logs. "One-liners rarely conflict" is doing a lot of work; parallel agents finishing slices at similar times append at the same line offset, and now every delivery carries a merge-conflict tax.
- **It recurses into the doc's own central lesson.** The log is only visible to off-machine agents *when pushed*. Committed ≠ delivered. You've built a delivery-tracking artifact that itself suffers undelivered-work invisibility — the §2 failure, one level up.
- **Append-only with no tombstones lies about reverts.** A delivered slice that gets reverted remains in the log as delivered. There is no `SUPERSEDED`/`REVERTED` line type in the spec.
- **It's redundant.** `git log origin/main` *is* the delivery log — computed, not asserted, with SHAs, authors, and timestamps that can't be hallucinated. The actual gap (F7) is that off-machine agents can't see *unpushed intent*, and a tracked log of *completed* deliveries does nothing for that. §4.5 solves a problem git already solves and ignores the problem it claims to address.

### §4.6 — Sentinel glob is necessary and nowhere near sufficient

Globbing `*.lane.md` surfaces the ten lanes — and also every orphaned worktree ledger, forever, since §4.1 says report-not-delete and §4.6 says report-only. Every SessionStart digest now permanently carries orphan warnings with no sunset clause: guaranteed alert fatigue by design. And the glob does nothing for the identity collision the file list in F5 actually reveals: `claude.lane.md` is one file shared by however many concurrent Claude sessions exist. Two plain `claude` sessions overwrite each other's claims; R4 ("never write another agent's lane") is *unimplementable* when two agents have the same name. §4 contains no identity model at all. Last-writer-wins on a shared identity silently erases a live agent's locks — the worst failure in the whole catalog, because it looks like success.

### What §4 never touches at all

- **Timestamps are agent-authored prose.** R5 staleness and the Stop gate both key off `Updated:` — a field written by a model, from a packet dated 2026-08-11. Hallucinated or stale timestamps make dead lanes look live and live lanes look abandoned. File mtime is right there and cannot be hallucinated; the spec trusts the prose field instead.
- **TOCTOU between R1's read and the claim.** Agent A reads lanes (no lock), begins work; Agent B claims the same file thirty seconds later. Both are now editing, both believe they're compliant. There is no compare-and-swap, and the window is unbounded. §4 adds gates everywhere except on this race.

---

## 2. What §3 missed — the silent failures

1. **Semantic collisions with zero file overlap.** Agent A renames a function in `foo.ts`; Agent B, in a different worktree, writes a new caller in `bar.ts` using the old name. Lock lists are file-granular; no overlap, no warning, both agents fully compliant. Breaks at integration. The ledger detects *file* contention; the codebase fails at *interface* contention. Completely silent until CI — if CI covers the integration.
2. **Ghost dependencies.** Generalizing the §2 "praised a deleted service" case: Agent A deletes service S, unpushed. Agent B writes *new code depending on S*. This isn't a stale review — it's new work built on a phantom, and the cost is the rewrite, not the review correction. F3 covers delivery state of *artifacts*; nothing covers existence state of *dependencies*.
3. **Migration version collisions across worktrees.** Two branches each add migration `047_*.js` with different content. Each passes its own tests. Sequelize runs pending migrations in filename order against prod — so which one runs first, and whether the second one runs at all, is decided at *deploy time on the production database*. This is F4's nastier sibling and the push gate as specced (path-match `backend/migrations/**`) would *approve both pushes* because each individually looks like one clean migration.
4. **Lock-list vs. actual-footprint drift.** R6 checks the declared lock list. An agent that claims X and Y but opportunistically fixes Z mid-session is compliant on paper and colliding in fact. The declared footprint is unverifiable against the actual footprint (git status could check it — nothing does).
5. **Stale-lock deadlock.** Crashed session leaves `in-progress` + locks; R5 says flag the owner, never seize. Owner is asleep: those files are frozen indefinitely, and the *compliant* agents stall while the *pragmatic* ones edit anyway and learn that R1 is optional. The protocol converts crashes into either deadlock or silent rule erosion. There is no timeout-and-release path at all.
6. **Late verdicts are more expensive than no verdicts.** R7 has no SLA and nothing gates continued work on the outcome. A REVISE arriving after three dependent slices are built on the reviewed one requires unwinding a stack. The review queue measures that reviews *happened*, not that they *landed in time to be cheap*.
7. **Enforcement coverage is inversely correlated with blindness.** This is the big one. F7's off-machine agents can't see the ledger — and F2's missing hooks don't apply to them either, because hooks are local. So the actors with *zero visibility* also have *zero gates*, and they can still push to origin. Every §4.3 gate protects against the agents who were already the most coordinated. The highest-blast-radius actor in the fleet — a cloud agent pushing blind — is untouched by the entire upgrade.
8. **No audit of reads.** R1 is unenforceable not just because hooks are missing but because there is no record that an agent *read* anything. You can detect a missing claim (Stop gate); you cannot detect a skipped read-before-edit. The most important rule in the protocol is the least observable.

---

## 3. The case against locks

The strongest case: **the lock function has never paid; the broadcast function paid once, immediately, and is the only thing that has ever paid.**

Look at your own incident (§2). The ledger's proven value was not exclusion — no lock prevented any edit. The value was *visibility*: nine findings, a self-correction, four schema columns caught while still cheap. "They cannot correct what they cannot see." That is an argument for a **presence/broadcast system**, and §4 keeps investing in the *exclusion* half — lock lists, lock-intersection checks in the push gate — that has no demonstrated win.

Against advisory locks specifically:

- **Wrong granularity, in both directions.** File-level locks over-block (two agents editing different functions of one large file would merge cleanly — git operates at hunk level) and under-block (semantic collisions, item 1 above, need no shared file at all). The lock unit matches neither the merge unit nor the failure unit.
- **The lock-holders are unreliable narrators.** Models forget to claim, claim wrong, crash holding locks, and hallucinate timestamps. An exclusion system's guarantee is only as good as its least reliable participant's compliance — and your participants are the entities F2 was written about.
- **Partial participation voids the guarantee while the cost stays universal.** One cloud agent (F7) that can't see the ledger makes every other agent's lock-checking ritual worthless against the exact collision that matters — while they keep paying the ritual cost daily. Advisory locks with known non-participants produce *confidence without coverage*, which is worse than no locks, because no-locks at least keeps everyone paranoid.
- **Git is already the exclusion mechanism, and it's better at it.** 184 worktrees *is* hard partitioning — de facto. Merge conflicts are precise, line-level, and impossible to silently ignore, unlike a Markdown file. The ledger duplicates git's job with worse precision and no teeth.

But note the corollary: **hard partitioning alone already failed.** F1 is a partitioning artifact — isolation is what made nine claims unreadable and a deletion invisible for hours. The 184-worktree fleet proves that partitioning without integration discipline produces silos, not safety.

So the answer is neither locks nor partition: it's **optimistic detection with fast integration**. Small slices, frequent merges to main, CI per branch, and a broadcast layer (what I'm doing, what I deleted, what's unpushed) that exists to *shorten the feedback loop*, not to prevent edits. Demote locks to advisory hints — displayed in the digest, never gated on. Keep R8's ownership as social routing ("ask X before touching their area"), not as exclusion. Spend the enforcement budget on the integration point (see §5 below), where it works regardless of participation.

---

## 4. Gate fatigue — which dies first, and where the thresholds are wrong

**Death order: Stop gate → SessionStart digest (ignored, not removed) → push gate (survives).**

**The Stop gate dies first** because it has the highest firing frequency, the vaguest perceived benefit, and a costless escape hatch. Threshold fixes:

- Replace the file-count predicate with a risk predicate: did the turn touch the executable-on-push set (§5), another lane's declared area, or produce a commit? A 2-file migration turn must gate; a 20-file docs turn must not.
- Replace "updated this session" with "updated after the last write the gate observed" — otherwise the §4.2 opening claim satisfies it at T+0 and the gate checks nothing.
- **Make the gate do the work instead of demanding it.** Auto-draft the lane update from `git status` + diff stat and require only confirmation. Gates that reduce effort survive; gates that add effort get `LANE: N/A`-ed into oblivion.
- Give the escape hatch friction asymmetry and an audit trail: `N/A` permitted only with zero commits and under N changed lines; every `N/A` is logged and *counted in the SessionStart digest*. Social visibility instead of a block. An agent with 40 N/As this week is a conversation; an agent blocked for the 40th time is a disabled hook.

**The SessionStart digest** never blocks, so it won't be removed — it will be *ignored*, which fails silently. Threshold fix: report delta, not state. What changed since my last claim; which locks intersect my declared task; cap at ~20 lines. The full dump belongs behind an on-demand command, not in every session's context window.

**The push gate** survives because it's rare and high-salience — but its false-positive mode is real: any feature-branch push whose range *contains* an already-merged migration (branch behind main) trips the warning. Threshold fix: diff against the remote's actual state, not path patterns in the local range — warn only on migrations *not already on the target remote branch*.

---

## 5. The push gate predicate

"Migration + main" is wrong on both ends, and the deeper problem is that a local hook is the wrong layer entirely.

**Too narrow.** The irreversible set reachable by a push to this repo includes: migrations, seeders, `render.yaml` itself (build/env changes), `package.json` (postinstall scripts, engine bumps), CI workflow files, Dockerfiles — anything automation *executes* on push. Plus force-push (history rewrite), branch deletion, tag pushes that trigger releases, and — critically — **`gh pr merge` and API-driven merges**, which perform the identical irreversible act with zero characters matching `git push` for your PreToolUse matcher to find.

**Too broad.** Migrations are the *normal* deploy path. Requiring in-session owner approval for every migration push trains rubber-stamping (approval fatigue → the approval means nothing within a month) or blocks deploys while the owner sleeps — at which point a helpful agent routes around the gate via `gh`, and you've taught bypass behavior.

**Better predicate:** not "migration + main" but *"does this push expand the set of not-yet-applied effects that automation will execute, on a deploy-linked ref?"* Concretely: compute the range against the remote's actual state; intersect with the executable-on-push set enumerated from `render.yaml` and CI config; warn on any deploy-linked branch; block nothing locally.

**Better layer:** move the block server-side. Branch protection on `main` at the remote — no direct pushes, PR required, status checks required, a CI job that fails on unapplied-migration diffs without an approval label, environment protection on production. This is the only gate that covers `gh pr merge`, the API, and the blind cloud agents of F7 — the actors your local hooks structurally cannot see. Your own doctrine applies to your own fix: a gate enforced only by the agent's choice of shell command is a gate that will eventually be dropped. The local hook's correct role is demoted to *early-warning UX* — compute the blast radius at push time so the agent finds out before the PR does, not after.

---

## 6. Ranking — cost of failure × likelihood

| # | Finding | Cost | Likelihood | Source |
|---|---|---|---|---|
| 1 | Push-to-main executes prod migrations, unguarded (F4) — including via `gh`/API/cloud agents the hooks can't see | Catastrophic, irreversible | High — near-miss already occurred | §3 F4 + my §2.7 |
| 2 | Enforcement/visibility inversion: the blind off-machine actors are also the ungated actors (F7 × F2) | Catastrophic | Certain — structural, ongoing | Mine |
| 3 | Ledger forked across 184 worktrees; coordination believed but void (F1) | High — false confidence is worse than absence | Certain — 9 orphans exist now | §3 F1 |
| 4 | Lane identity collision: N concurrent `claude` sessions share one lane file, last-writer-wins erases live locks | High | High — fleet already >1 Claude | Mine |
| 5 | Delivery state unrepresentable/stale (F3; §4.4 computes once then asserts) | High | High — §2 incident class recurs | §3 F3 + §4.4 |
| 6 | Migration version collision across parallel worktrees → order-dependent prod schema | High | Medium-high, grows with fleet | Mine |
| 7 | Semantic/interface collisions invisible to file-granular locks | Medium (CI usually catches) | High over time | Mine |
| 8 | TOCTOU between R1 read and claim | Medium | Medium | Mine |
| 9 | Stop-gate fatigue → `LANE: N/A` reflex → hook removed → regression to F2 | Medium | High | §4.3 |
| 10 | Sentinel blind to 6/10 lanes (F5) | Medium — monitoring lies | Current | §3 F5 |
| 11 | §4.5 delivery log: conflicts, drift from git, committed-≠-delivered recursion | Medium | High if built | §4.5 |
| 12 | Stale-lock deadlock / silent R1 erosion | Medium | Medium | Mine |
| 13 | Rot, no reaper, 225 KB `.orig` artifact (F6) | Low-medium | Certain, slow | §3 F6 |

**Build first: server-side branch protection on `main`** (PR-required, status checks, no direct pushes, CI check for unapplied-migration diffs). It closes #1 and #2 — the two catastrophic rows — for *every* actor: local, cloud, API, `gh`, present and future. It requires zero agent compliance, zero hook coverage, zero ledger participation, and it's a config change, not a build. Every local gate in §4.3 is a best-effort subset of this one change. Nothing else on the list is close.

**Do not build: §4.5, the committed delivery log.** It is a hand-written shadow of `git log origin/main` — asserted where git is computed, so it will drift and then lie. It reintroduces the tracked-shared-file conflict surface your own §1.1 rationale correctly excluded, and `review-queue.md.orig` is the in-repo proof that your append logs already collide. It recurses into the doc's own central lesson (the log about delivery is itself undelivered until pushed). And its stated purpose — F7 visibility for off-machine agents — is delivered *for free* by the branch-protection change above, since PRs and protected-main history are exactly the cross-machine delivery surface those agents can already read. Build the gate; let git keep the log.
