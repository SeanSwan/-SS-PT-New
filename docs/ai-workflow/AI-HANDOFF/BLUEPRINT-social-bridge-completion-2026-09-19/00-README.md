# 00 — README: Builder Contract and build order

**Blueprint:** Social Bridge Completion — Studio Spotlight S5–S8
**Package root:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/`
**Status:** ARCHITECTURE DECIDED · G0 **EVIDENCE SUPPLIED, NOT CLOSED** · CORRECTIONS 1–7 APPLIED (correction 3 superseded) · S5 BUILDABLE

**Read in this order:** `CORRECTIONS-APPLIED.md` (what changed, and how each change was verified) →
`G0-SOURCE-EXCERPTS.md` (source truth) → this file (contract and build order) → `05-slices.md`
(the plan). **Where this package and the excerpts disagree, the excerpts win.**

---

**Destination**

`docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/`

> Earlier drafts of this line named `BLUEPRINT-studio-spotlight-completion-2026-09-19/`. The package
> directory on disk is `BLUEPRINT-social-bridge-completion-2026-09-19/`; that is the path above.

**Status: ARCHITECTURE DECIDED; CORRECTIONS 1–7 APPLIED; G0 EVIDENCE SUPPLIED — GATE NOT CLOSED.**

**Corrected 2026-09-20 (hostile review D5 / F09).** This section previously read *"Gate G0 is
closed"*. That was **false**, and the contradiction was in this package's own files: `MANIFEST.md`
admitted surviving `BLOCKED-G0` markers, `:71` below still demands that a G0 deliverable *"replaces
every `BLOCKED-G0` entry"*, and `08-decision-density-self-test.md` lists **seven** rows marked
*"Blocked G0"*. Six supplied excerpts are not the nine truth artifacts and not a zero-blocker
criterion.

**What is actually true, split so the two are not conflated:**

| Gate | Question | State |
|---|---|---|
| **G0-evidence** | Have the source excerpts that were missing been supplied? | **PARTIAL.** `G0-SOURCE-EXCERPTS.md` supplies six; three artifacts remain unread and are listed in `04-build-order.md`'s integration-edit table. |
| **G0-release** | May implementation proceed on every decision G0 was meant to license? | **NOT CLOSED.** Seven decisions remain `BLOCKED-G0`. |

Corrections 1–7 from `VERIFICATION-NOTES.md` Part 4 are applied **except correction 3, which is
superseded** (operator ruling 2026-09-19 — `postId` stays nullable; see `05-slices.md` §3). The
authoritative record of what changed and where is `CORRECTIONS-APPLIED.md`. **S5 is buildable** —
that is a separate claim from G0-release, and it is the one this package supports.

#### Working root (Correction 2)

Build S5 in **`Desktop/@Everything/SwanGuard-Newsroom`** on branch **`merge/newsroom-mainline-v3`**
(HEAD `1bd08d4`, re-pinned 2026-09-20; the earlier pin `d830bed` was 12 commits stale and the push
that advanced it is confirmed complete on the remote) — **not** in
`family-first-intelligence-command-center` on `main`, which has no
`apps/web/src/newsroom/` directory at all. `SwanGuard-Newsroom` is a **linked git worktree**: `.git`
there is a file, not a directory.

These are proposed document contents, not files written into either repository. No tests or commands below have been executed.

#### Builder Contract

> You are the builder, not the architect. Follow the package to the letter. Where the package decides, you do not re-decide — even if you'd do it differently. Where the package is silent on something that matters, STOP and return the question; do not improvise. Build ONE slice at a time; after each slice, output the diff + the acceptance-criteria evidence and WAIT for the checkpoint verdict before continuing. Never claim a criterion passed without pasting its output.

#### Build order

| Gate/slice | Deliverable |
|---|---|
| G0 | Repository evidence, worktree preservation, approved integration baselines |
| R1 | Signal constraints/quota correctness; receiver revision/image hardening |
| R2 | SwanStudios Spotlight administration and measurement |
| S5a | SwanGuard publication storage, authorization, outbox, receipts, kill-switch integration |
| S5b | Separate Studio Spotlight operator console and ceremony |
| S7 | Aggregate pulse, manifest reconciliation, Studio Pulse tile |
| S6 | Scheduled faction ceremony and bounded Three.js enhancement |
| S8 | Template-only in-app weekly digest |
| E1 | Staging rehearsal, production canary, explicit enablement |

Do not renumber the product slices to imply S1–S4 were rebuilt.

#### G0: evidence the repository-capable reviewer must attach

The **reviewer**, not the context-free builder, supplies numbered excerpts with commit SHA, path, and line range.

| Artifact | Required contents |
|---|---|
| `truth/01-baselines.txt` | Worktree list, branch status, commit SHAs, dirty inventory, protected backup verification |
| `truth/02-bridge.md` | Entire `spotlight.v1` validation schema; accepted/rejected bodies; exact success/error bodies; raw parser and route mounts; flag reader; HMAC implementation |
| `truth/03-ss-schema.md` | CoachSignal, SwanSpotlight, canonical user/post/session keys, actual indexes/checks/FKs, database drift comparison |
| `truth/04-ss-patterns.md` | Working authenticated admin route, frontend admin mount, model registration, top-level migration example, scheduler, test commands |
| `truth/05-sg-patterns.md` | Complete relevant route handler/dispatch excerpt, owner authorization, kill-switch persistence and checks, DB transaction/worker pattern, test commands |
| `truth/06-sg-surfaces.md` | Operator surface registration; `OperatorGrantConsole` excerpts; protected-file hashes; actual `bridge-policy.json` location and schema |
| `truth/07-domain-adapters.md` | Authoritative faction scoring, MVP eligibility, XP ledger, streaks, friendship visibility, preferences, client name resolver |
| `truth/08-runtime.md` | Runtime versions, database dialects, deployment topology, scheduler ownership, R2 helper, CORS/CSP, bundle baseline |
| `truth/09-baseline-results.txt` | Actual test/typecheck/build output, secret scan, production-router smoke tests |

**G0 deliverable:** An architect revision that replaces every `BLOCKED-G0` entry in this package with actual excerpts, final model definitions, exact integration edits, and executable repository-native commands.

#### Worktree preservation procedure

Run only after stopping editors, agents, dev servers that write generated files, and background git operations:

```bash
WT="$HOME/Desktop/@Everything/SwanGuard-Newsroom"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$HOME/SwanGuard-recovery-$STAMP"
mkdir -m 700 "$BACKUP"

git -C "$WT" status --porcelain=v2 --branch > "$BACKUP/status.txt"
git -C "$WT" worktree list --porcelain > "$BACKUP/worktrees.txt"
git -C "$WT" show-ref > "$BACKUP/refs.txt"
git -C "$WT" diff --binary > "$BACKUP/unstaged.patch"
git -C "$WT" diff --cached --binary > "$BACKUP/staged.patch"
git -C "$WT" ls-files --others --exclude-standard -z \
  > "$BACKUP/untracked-files.zlist"
git -C "$WT" bundle create "$BACKUP/repository.bundle" --all
git -C "$WT" bundle verify "$BACKUP/repository.bundle"
```

These commands are **not the complete backup**. Also take a protected filesystem copy of both the worktree and the repository’s shared git directory, including ignored files. The copy may contain secrets: restrict access and never commit it.

Verify restoration in a disposable location. Then fetch, record the actual divergence, and classify changes before making explicit-path commits. Create a clean feature worktree only from Sean’s approved integration commit.

> **SEAN MUST DECIDE:** Approve the SwanGuard integration commit and publication/push destination after the dirty-state audit. No automatic push to `main`, and no assumption that the 12 commits are all feature prerequisites.

---
