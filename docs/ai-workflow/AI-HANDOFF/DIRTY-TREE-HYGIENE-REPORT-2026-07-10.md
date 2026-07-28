# Dirty-Tree Hygiene Report — `wip/comms-notifications-2026-07-05` (2026-07-10)

**Read-only audit. NOTHING was moved, deleted, or committed.** 831 pending paths characterized
(338 modified · 115 deleted · 378 untracked). Produced by a 4-agent classification workflow.

---

## HEADLINE — this is a big-WIP-to-PRESERVE situation, NOT dead-code-to-purge

The working tree holds ONE large, genuine, internally-consistent net-new feature set — an **Enterprise
Comms + Notification Center** (messaging safety/moderation/attachments/actions/idempotency + notification
delivery/preferences/broadcast/health/audit) with matched 2026-06-30/07-01 migrations, models, services,
controllers, and contract+unit tests — that is **NOT on `origin/main`** (6/6 signature files verified absent).
**Only ~32 files + 2 dirs are true throwaway scratch.**

**The real risk isn't clutter — it's that this valuable in-flight work is stranded on a base 304 commits
BEHIND main, and the uncommitted edits are the ONLY copy in existence.** A wrong move loses it.

- ❌ Do NOT blanket-clean / `git add -A` / checkout away → destroys the WIP (it's unsaved + not gitignored).
- ❌ Do NOT blind-merge this stale base into main → risks reverting 304 commits of main progress.
- ✅ DO: snapshot to a salvage branch FIRST, then purge only the named scratch, then replay onto fresh main.

## PRESERVE — the real work (do NOT delete)
- **Enterprise Messaging** (~42 files): `controllers/messaging/{action,attachment,safety}Controller.mjs`;
  `services/messaging{Action,AdminOverrideAudit,Attachment,NotificationRecipient,Policy,ReportModeration,Safety}Service.mjs`;
  migrations (`client_message_id`, action-audit, message-saves); contract+unit tests. Confirmed not on main.
- **Enterprise Notification Center** (~30 files): `models/NotificationDelivery.mjs`;
  `jobs/notificationDeliveryRetryWorker.mjs`; delivery/preferences/broadcast/health/audit services;
  `Notification.mjs` gains category/priority/status/metadata/actions/idempotencyKey. Confirmed not on main.
- **Supporting new source**: ~85 backend runtime files, ~77 backend tests, ~144 frontend source+test files,
  32 `docs/ai-workflow/**` docs (design-brain/hermes-agentic-os — CLAUDE.md-cited), 4 new skills, 2 tooling scripts.
- **Secondary clusters — REAL but RECONCILE vs main** (main may already have shipped): Coach Command Center +
  `workoutLogSourcePolicy` (~44, main likely authoritative), UserDashboard V3 home (~34, main likely auth for
  overlap), WorkoutLogger + daily-form (~25, genuine 3-way divergence), Bootcamp builder (~14), Content
  Studio/Challenge/Equipment migrations (~20, mixed — `ChallengesView.tsx` byte-identical to main = take-main).

## PURGE CANDIDATES — genuine temp/scratch only (~32 files + 2 dirs)
*Rule 34: these are **likely deletion candidates pending Sean's explicit approval**, not "safe to delete."
All confirmed NOT gitignored → a `git add -A` would sweep them in (the Rule 67 collision hazard).*

| Pattern | Count | Why likely-deletable |
|---|---|---|
| `.codex-*.patch` | 27 | Codex intermediate unified-diff dumps at repo root; code already applied in tracked tree |
| `.codex-tmp-*.cjs` | 2 | One-off Codex temp scripts (backfill, provenance) |
| `.codex-worktrees/` | 1 dir | Agent git-worktree scratch (linked checkout) |
| `.kilo/` | 1 dir | Kilo editor-extension working dir (bundled node_modules) |
| `apex-branch.diff` | 1 | One-off 26 KB git-diff export |
| `swanguard-mobile-metrics.json` | 1 | One-off QA responsive-audit dump (regenerable) |

**No `.env`/secret filenames among untracked (checked by name only; nothing opened).**
**Rule 39 (propose only):** add `.gitignore` for `.codex-*.patch` / `.codex-tmp-*.cjs` so root doesn't repopulate.

## DELETIONS (115) — intentional archive hygiene, NOT accidental
All 115 fall under `AI-Village-Documentation/validation-prompts/archive/` (CLAUDE.md classifies these
"reference-only, never default reading"). Zero code/routes/models. Still on `origin/main` + git history
(recoverable via `git checkout origin/main -- <path>`). Low stakes; local cleanup, not a main decision.

## RECOMMENDED SAFE PROCEDURE (execute ONLY on Sean's explicit approval — Rule 34)
1. **Snapshot everything to a salvage branch FIRST** (nothing is lost): from the wip branch, commit the entire
   working tree (incl. untracked source) to a dated branch, e.g. `git checkout -b salvage/comms-notifications-2026-07-10`
   then stage the PRESERVE set + commit, and push it offsite. This makes the WIP recoverable before ANY cleanup.
2. **Purge only the named scratch** (the ~32 files + 2 dirs above) — after the snapshot exists.
3. **Add the `.gitignore` entries** for the scratch class.
4. **Replay the feature onto fresh `main`** in a clean worktree (the comms/notification feature reconciled
   against main's 304 newer commits) — do NOT merge the stale base wholesale.
5. Leave the deletions as-is (or restore from main if any archive doc is wanted).

**No destructive action has been taken. This report is the inventory; execution is a separate approved pass.**
