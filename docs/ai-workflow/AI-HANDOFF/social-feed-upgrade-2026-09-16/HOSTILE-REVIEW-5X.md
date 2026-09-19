# HOSTILE REVIEW ×5 — Social Feed Upgrade (S1 + MEGA-BLUEPRINT)

**Date:** 2026-09-18 · **Reviewer:** GLM-5.3-Flash (claude lane) · **Rule basis:** 17, 19, 20, 26, 28, 41, 56, 58, 61
**Scope:** S1 Coach Signal (backend + frontend), MEGA-BLUEPRINT.md v1.0, workstream artifacts.
**Method:** Five independent adversarial lenses. Every finding carries a file:line or a command receipt.
Re-verified by execution, not by reading status lines.

---

## 0. Ground truth first (what is actually built)

| Slice | Blueprint claim | Measured reality | Verdict |
|---|---|---|---|
| Phase 1 (audit + 5-seat panel + blueprint) | complete | 12 artifacts present, all non-empty | ✅ TRUE |
| **S1 Coach Signal** | "backend + frontend SHIPPED locally" | model, migration, routes, 2 mounts, feed attach, banner, picker, dock chip all present | ⚠️ **TRUE but unreachable + untested** |
| S2 Proof Card | not started | no `ProofCard.tsx`, no `/proof-card/:sessionId` | ❌ NOT BUILT |
| S3 Spotlight receive | not started | no `SwanSpotlight`, no `bridgeIngestRoutes`, no `SpotlightRail` | ❌ NOT BUILT |
| S4 Prompt chips / Comeback | not started | absent | ❌ NOT BUILT |
| S5 SwanGuard publisher | not started | absent | ❌ NOT BUILT |
| S6 Faction War card | not started | absent | ❌ NOT BUILT |
| S7 Operator pulse | not started | absent | ❌ NOT BUILT |
| S8 Weekly digest | not started | absent | ❌ NOT BUILT |

**Answer to "has it been finished?": No.** Phase 1 is genuinely complete and high quality. S1 is ~85% built
but ships a dead user-facing path and zero frontend tests. S2–S8 are untouched. **Nothing is committed.**

Executed verification receipts:
- `node --test tests/api/coachSignalRoutes.contract.test.mjs` → pass (6 assertions, all source-pattern based)
- `npx vitest run src/components/Social` → **44 files / 208 tests passed**
- `npx tsc --noEmit` → **OOM crash** at default heap (see F5.1)

---

## PASS 1 — Blueprint conformance & claim integrity

**F1.1 [HIGH] S1's headline deliverable is unreachable in the live app.**
Verified: `SocialCoachDock` is imported only by `SocialCoachDock.test.tsx`. `DashboardFeedTab.tsx` (its mount
point, line 65) has **no live consumer** — the only references are negative assertions in test files
(`SocialCoachDock.test.tsx:218`, `NotificationBell.test.tsx:59-60`, `useActivityTicker.authPipeline.test.ts:22`).
The blueprint honestly flags this as "RESIDUAL / FLAGGED TO SEAN", but still labels S1 "SHIPPED". A slice whose
only user-facing action cannot be reached is not shipped — it is staged. (Rules 19/28.)

**F1.2 [MEDIUM] Blueprint cites two evidence files at wrong paths.**
- §4.2 cites `scripts/safe-migrate.mjs:146` → actual `backend/scripts/safe-migrate.mjs:146`
- §4.2 cites `scripts/shadow-delta-audit.mjs:73-76` → actual `backend/scripts/shadow-delta-audit.mjs`
The *underlying claim is TRUE* (verified: non-recursive `readdirSync` at that line), but a context-free builder
following the Forge contract would fail to locate the receipts. Rule 26 discipline.

**F1.3 [MEDIUM] Blueprint's S1 test evidence is stale and unreproducible.**
Blueprint §6 S1 says "frontend social suites **80/80 (16 files)**". Measured today: **208 tests / 44 files**.
A verification receipt that no longer matches reality cannot be used as a receipt.

**F1.4 [HIGH] ACCEPT criterion "new tests green" is unsatisfied.**
No `CoachSignalBanner.test.tsx` and no `InlineSignalPicker.test.tsx` exist (`find` returns only the two `.tsx`
sources). The 208 passing tests contain **zero** coverage of S1's frontend. Every sibling component in those same
directories has a test. (Rule 61 step 4: "tests where feasible" — these are feasible.)

**F1.5 [MEDIUM] §4.3 payload contract does not match the code.**
Blueprint: `coachSignal: {coachId, note}`. Actual feed payload (`posts.mjs:443-446` → `coachSignalMap`):
`{coachId, coachDisplayName, coachPhoto, note}`. A builder following §4.3 literally would render a banner with no
name. The code is better than the doc; the doc is wrong.

**F1.6 [LOW] Blueprint cites abbreviated frontend paths.**
"`components/CoachSignalBanner.tsx`" resolves to `frontend/src/components/Social/Feed/components/CoachSignalBanner.tsx`.
Resolvable, but the Forge contract requires exact paths.

---

## PASS 2 — Security, authorization, abuse

**F2.1 [CRITICAL] The self-signal guard is dead code — type mismatch makes it always false.**
```js
// backend/routes/social/coachSignalRoutes.mjs:76
if (post.userId === req.user.id) {
```
`post.userId` is an INTEGER column → JS **number**.
`req.user.id` is built as `toStringId(user.id)` → JS **string** (`backend/middleware/authMiddleware.mjs:357`).
`5 === '5'` is `false`, **always**. The guard never fires.

**Impact:** a coach who is also a post author can send themselves a gold "Coach Signal" — self-awarded authority
praise, exactly the mechanic the blueprint rations at 5/day to keep precious. The notification path then fires to
their own account.
**Why no test caught it:** all 6 contract assertions are source-pattern greps, not behavioural tests. There is no
test that constructs a coach-authored post and asserts 403.
**Fix:** compare on normalized strings on both sides.

**F2.2 [MEDIUM] Assignment lookup relies on implicit string→int coercion.**
`coachSignalRoutes.mjs:83`: `where: { trainerId: req.user.id, clientId: post.userId, status: 'active' }` —
`req.user.id` (string) against an INTEGER column. It works only because Postgres infers the parameter type from
context; it is inconsistent with the codebase's `toStringId` convention and brittle. Rule 20 sibling sweep: the
same pattern appears at lines 91, 99, and 157.

**F2.3 [MEDIUM] NULL-status assignments silently deny legitimate coaches (rule 58 drift class).**
`ClientTrainerAssignment.status` is `STRING, allowNull: true, defaultValue 'active'`
(`backend/models/ClientTrainerAssignment.mjs:88-93`). The route demands exactly `status: 'active'`. The default
only applies on Sequelize inserts — any row written by raw SQL or an older backfill with NULL status yields a
**403 for a legitimate coach**. Treat NULL as active, or add a data guard.

**F2.4 [MEDIUM] Note over-length is silently truncated instead of rejected.**
`coachSignalRoutes.mjs:59`: `note.trim().slice(0, NOTE_MAX_LENGTH)`. A 500-character note is silently cut to 120.
The blueprint's contract implies a `<=120` constraint; silently mutating user input is worse than a 422.

**F2.5 [LOW] `Op.or: ['approved', null]` is dead logic.**
`coachSignalRoutes.mjs:69`. `moderationStatus` is `ENUM, allowNull: false, defaultValue 'approved'`
(`SocialPost.mjs:33-38`) — NULL is impossible, and `IN ('approved', NULL)` never matches NULL in SQL anyway.
Harmless, but misleading. It also silently excludes `pending` posts (arguably correct — just undocumented).

**F2.6 [LOW] No throttle beyond the daily cap; no pagination on the read path.**
`GET /received` hard-caps at `limit: 50` with no cursor, so a member with >50 signals silently loses history.
Acceptable for v1 — should be written down as a known bound rather than discovered.

---

## PASS 3 — Data integrity & schema drift

**F3.1 [MEDIUM] Model and migration disagree about `updatedAt`.**
Model: `timestamps: true, updatedAt: false` — no `updatedAt` attribute (`CoachSignal.mjs:55-56`).
Migration: creates `updatedAt DATE NOT NULL DEFAULT NOW()` (`20260916-create-coach-signals.cjs:46-50`).
The column exists and is written by the DB default, but the model never reads or writes it. This is precisely the
"model declares one shape, DB has another" class rule 58 exists to catch. Pick one side.

**F3.2 [PASS] Migration location is correct — the blueprint's central warning is TRUE.**
Verified top-level `backend/migrations/20260916-create-coach-signals.cjs`, and
`backend/scripts/safe-migrate.mjs:146-147` does a **non-recursive** `readdirSync().filter(.cjs|.js)`. A migration
placed in `migrations/social/` would indeed never run on deploy. S1 complied. Good catch by the earlier pass.

**F3.3 [MEDIUM] `UNIQUE (coachId, postId)` stops protecting the moment `postId` goes NULL.**
In Postgres, NULLs are distinct in unique indexes. The model comment at `CoachSignal.mjs:34-35` explicitly
anticipates workout-session-targeted signals with `postId = NULL`. Once that lands, the "one signal per coach per
post" guarantee silently does not apply, and a coach can send unlimited NULL-postId signals. Latent trap the
comment invites. Needs a partial unique index or a sentinel.

**F3.4 [MEDIUM] `onDelete: 'CASCADE'` on the `postId` FK contradicts "signals are immutable".**
`20260916-create-coach-signals.cjs:33-36`. Deleting a post permanently erases the member's record of coach
recognition. The model comment says signals are immutable once sent (`CoachSignal.mjs:56`). `SET NULL` fits both
the immutability intent and the already-nullable column.

**F3.5 [LOW] Mixed index-naming conventions in one migration.**
Three `addIndex` calls omit names; the unique constraint is explicitly named `coach_signals_coach_post_unique`.

---

## PASS 4 — Frontend, product, design (rules 22–25)

**F4.1 [HIGH] `SIGNALABLE_TYPES` does not match the real post ENUM — the candidate list is starved.**
`InlineSignalPicker.tsx:47-54` allows: `milestone, achievement, workout, transformation, challenge, progress`.
Real ENUM (`SocialPost.mjs:23`): `general, workout, achievement, challenge, milestone, creative, dance, music,
singing, art, gaming, comedy`.
- `transformation` and `progress` **do not exist** → dead entries.
- `general` is the **default type for every post** and is **excluded** → the single most common post a client
  makes can never receive a signal.
Compounds F1.6: even if the dock were reachable, it would usually be empty.

**F4.2 [MEDIUM] Candidate source is the coach's own feed — an unrelated algorithm.**
`InlineSignalPicker.tsx:90` fetches `/api/social/posts/feed` (the *viewer's* feed) and intersects with client IDs.
Whether a client's win surfaces depends on the coach's feed composition and visibility rules, not on the
assignment. The empty-state copy ("they'll appear here after your clients train and share") quietly admits it.
A coach with 20 clients can legitimately see 0 candidates. Correct approach: query posts by the client IDs.

**F4.3 [MEDIUM] Inline hardcoded colors contradict the file's own stated posture.**
`InlineSignalPicker.tsx:174-183` uses an inline `style` with literal `rgba(3,7,18,0.55)` and
`rgba(198,168,75,0.4)`, while the header comment (lines 26-27) claims it "Reuses InlineChallengeFinder.styles
dock-panel vocabulary… no new visual class." House rule: no hardcoded colors — use tokens.

**F4.4 [MEDIUM] `MAX_CANDIDATES = 2` is an undocumented product cap.**
`InlineSignalPicker.tsx:74`. Nothing in the blueprint specifies 2, and nothing explains it.

**F4.5 [MEDIUM] Responsive acceptance is unproven.**
Blueprint ACCEPT requires a "mobile 414px check"; rule 24 requires 414/2560/3840. No evidence artifact exists.
The banner is fluid-width so it is *plausible*, but plausible is not verified.

**F4.6 [LOW] Banner has no live-region semantics.**
`CoachSignalBanner.tsx:111` renders asynchronously with the feed; screen-reader users get no announcement.
Arguably fine since it lives in feed flow — note only.

**F4.7 [PASS] Motion accessibility is correct.**
`CoachSignalBanner.tsx:45-49`: one 1200 ms gold pulse, `animation: none` under `prefers-reduced-motion`. Rule 25 met.
Gold token `#C6A84B` is consumed via `var(--gold-accent, …)`, not hardcoded as a bare literal in the styled layer.

**F4.8 [PASS] PostCard stayed under the ceiling.**
Measured **294 lines** (rule 9 / blueprint ban #9), and the banner was extracted rather than inlined.

---

## PASS 5 — Ops, deploy, governance

**F5.1 [HIGH] The documented verification command does not run.**
`npx tsc --noEmit` dies with `FATAL ERROR: Ineffective mark-compacts near heap limit — JavaScript heap out of
memory` at ~4.0 GB. The blueprint's "`npx tsc --noEmit` slice-clean" line is therefore **not reproducible as
written**. It must be documented as `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`.
Also note: piping to `tail` masks tsc's exit code — the earlier run reported "exit 0" while tsc had crashed.
Rule 56 disclosure was honest about the baseline, but a command that cannot execute is worse than an unknown baseline.

**F5.2 [HIGH] Nothing is committed — and a partial landing would crash the backend.**
`git status`: `?? backend/models/social/CoachSignal.mjs`, `?? backend/routes/social/coachSignalRoutes.mjs`,
`?? docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/`, plus modified `posts.mjs`, `models/social/index.mjs`,
`routes/social/index.mjs`.
Rule 42 exists precisely for this. `routes/social/index.mjs` (modified, uncommitted) **imports**
`coachSignalRoutes.mjs` (untracked). If the modified mount lands without the untracked files, Render crash-loops
with `ERR_MODULE_NOT_FOUND`. Highest operational risk in the workstream.

**F5.3 [MEDIUM] The coordination lane was overwritten by an unrelated workstream.**
`.ai-workflow/coordination/claude.lane.md` (mtime 2026-09-17) now describes MiniSwan GPU launchers and declares
"Status: idle". The social workstream's lane claim and 🔒 EDITING NOW block are gone. A concurrent agent reading
the lane file would conclude the social lane is free.

**F5.4 [MEDIUM] The package deviates from the Forge's mandated shape.**
`fable-blueprint-forge` Phase 2 requires `BLUEPRINT-<slug>-<date>/` containing `00-README.md` … `07-checkpoints.md`,
each ≤~300 lines, so a builder can load them piecemeal. The actual artifact is a single 291-line
`MEGA-BLUEPRINT.md` in a differently-named directory. Content quality is genuinely high (locked decisions, bans,
per-slice ACCEPT) so the *spirit* is met — but `00-README.md` (Builder Contract) and `07-checkpoints.md`
(checkpoint protocol) are absent, and the Builder Contract is the mechanism that stops a builder from improvising.

**F5.5 [INFO] No secret-scan artifact for the package.**
The Forge requires `bash scripts/scan-secrets.sh` over the package dir. No evidence it ran. Inspection shows env
var *names* only, so risk is low.

**F5.6 [PASS] S1's rollback posture is sound.**
Additive table, documented unmount path (blueprint §8), no new feature flag needed. Ban #10 (flags default OFF)
is not violated because S1 introduces none.

---

## Consolidated defect register

| ID | Sev | One-line | Status |
|---|---|---|---|
| F2.1 | **CRITICAL** | Self-signal guard always false (string vs number) | **FIXED** |
| F5.2 | HIGH | Workstream uncommitted; partial landing crash-loops backend | flagged → Sean (no push without him) |
| F1.1 | HIGH | Coach action unreachable (orphaned dock) | **FIXED** (S1.5 wiring) |
| F4.1 | HIGH | `SIGNALABLE_TYPES` mismatched with real ENUM | **FIXED** |
| F1.4/F4.4 | HIGH | Zero frontend tests for S1 | **FIXED** (tests added) |
| F5.1 | HIGH | `tsc` OOMs at default heap; command not reproducible | **FIXED** (documented + rerun) |
| F2.3 | MED | NULL-status assignment denies legit coach | **FIXED** |
| F2.4 | MED | Note silently truncated instead of 422 | **FIXED** |
| F3.1 | MED | Model/migration `updatedAt` drift | **FIXED** |
| F3.3 | MED | UNIQUE index stops protecting when postId NULL | flagged (needs partial index at S-future) |
| F3.4 | MED | CASCADE erases recognition history | **FIXED** (SET NULL) |
| F4.2 | MED | Candidate source is an unrelated feed | flagged → S1.5 scope |
| F4.3 | MED | Inline hardcoded colors | **FIXED** |
| F5.3 | MED | Lane file overwritten | **FIXED** (lane reclaimed) |
| F5.4 | MED | Package not in Forge shape | **FIXED** (00-README + 07-checkpoints added) |
| F1.2/F1.3/F1.5/F1.6 | LOW-MED | Wrong cited paths, stale counts, contract drift | **FIXED** (blueprint corrections) |
| F2.5/F2.6/F3.5/F4.5/F4.6 | LOW | Dead logic, bounds, naming, a11y, responsive proof | noted |

**Headline:** S1's backend is well-built but its one authorization guard never fires, its user-facing action is
unreachable, and its frontend has no tests. Fixes applied — see `FIX-LOG-5X.md`.
