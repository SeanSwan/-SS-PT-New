# G9 BEFORE-MAIN REVIEW — 2026-09-24

**Commit under review:** `05fc32b99` — `rescue(G9): migration bootstrap guards and deploy-config pins - REVIEW BEFORE MAIN`
**Reviewer:** vs-claude (ZCode) · **Branch:** `creator-brains-engine-r2-20260915` (at `c34145985`)
**Verdict: APPROVE FOR MAIN — merge is safe; one deploy note to watch on the first Render build.**

## What G9 changes (9 files)

1. **5 backend migrations** — "table absent → skip" guards (H-01/H-02) using
   `queryInterface.tableExists` (the correct boolean API; the commit documents why the
   information_schema pattern silently no-oped here four times). Effect: a database built from
   empty can run the chain (fresh onboarding, CI shadow gates, disaster recovery). On the
   production database the guarded tables exist, so `up()`/`down()` behave exactly as before.
2. **`backend/package.json` + lock** — `engines.node ">=22 <23"`, acorn devDependency,
   `test:security` script; lock regenerated consistently.
3. **`render.yaml`** — `NODE_VERSION=22` pinned, matching the engines pin and the CI
   migration-shadow workflow (Node 22). Today prod inherits Render's default image; merging makes
   the runtime deliberate instead of incidental.
4. **`.githooks/pre-commit`** — ai-egress policy ratchet (already active locally; hooks run from
   the working tree).

## Verification performed (2026-09-24)

| Check | Result |
|---|---|
| `node --check` on all 5 migrations | PASS (5/5) |
| Migration unit suites (`migrationDiscovery`, `migrationRunnerContract`, `safeMigrateControlFlow`, `safeMigrateExitCode`) | 66/66 (with G9 in tree) |
| Full backend suite with G9 in tree | 6,695/6,706 (the 11 failures pre-date G9 and sit in coach/gamification/media lanes) |
| `scripts/qa/ai-egress-audit.mjs` (the new ratchet's target) | CLEAN |
| package.json ↔ lock engines/deps consistency | 0 mismatches (author-measured; lock diff is a plain regeneration) |

## Deploy note (not a blocker)

`bcrypt@5.1.1` and `sharp@0.34.5` are native modules. `sharp` ships Node 22 prebuilds. `bcrypt`
5.1.1 predates Node 22; if its prebuilt matrix lacks ABI 127, Render's build compiles it from
source (python3 + toolchain are present on Render natives) — the first build may run slower.
**Watch the first deploy's build log for a bcrypt source-compile line.**

## Merge mechanics for Sean's ruling

- Merge = fast-forward or merge commit of this branch into `main`; Render auto-deploys `main`.
- Runtime switch to Node 22 is the deliberate deploy effect (that is the point of U-01).
- Rollback if the first deploy misbehaves: revert `render.yaml`'s `NODE_VERSION` block on `main`
  (one-line revert redeploys the previous runtime); the migration guards are no-ops on the
  existing production schema and need no rollback of data.

## Recommendation

Merge when ready. The commit does exactly what its message claims, the guard pattern is the
correct one, CI and prod become Node-consistent, and the only watch-item is the bcrypt
source-compile possibility on the first build.
