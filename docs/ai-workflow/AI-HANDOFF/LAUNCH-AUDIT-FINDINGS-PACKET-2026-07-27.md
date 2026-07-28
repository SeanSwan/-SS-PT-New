# SwanStudios Launch-Readiness Audit — Grounded Findings Packet
**Date:** 2026-07-27 · **Reviewer target:** independent hostile review
**Base:** `origin/main@c0c9b7454` · production live and healthy (200, 287ms; API `/health` healthy)

Sean is launching imminently — he intends to run real client work on this within a day.
Everything below was verified in-session by executed command, file:line read, or live probe.
No PII: user ids and roles only.

---

## 1. What the audit has established so far

### 1.1 The tree was NOT the problem people thought
- The working tree sat on `wip/comms-notifications-2026-07-05`: **1177 behind / 22 ahead** of `origin/main`, with **1216 dirty files**.
- `main` itself is current, clean and actively shipping. The "1000 commits behind / huge mess" feeling came from one stale WIP branch the terminal happened to sit on.
- Of 294 untracked code files in that branch, **140 already exist on main** (stale duplicates); **154 do not** — a coherent, tested messaging/notifications/bootcamp workstream. Verdict on those 154 is still open.

### 1.2 Dead code was actively corrupting the audit (the important one)
A security sweep hardened `backend/routes/gamificationRoutes.mjs` — extracted its IDOR guard, wrote 41 passing tests, proved the fix failed against the old code — **before discovering the file's mount was commented out** at `core/routes.mjs:105`, with a comment above it claiming the legacy routes were "kept for backward compatibility". No request could ever reach it. The canonical surface (`gamificationV1Routes`, mounted at BOTH `/api/v1/gamification` and `/api/gamification`) was already correctly guarded by `authorizeResourceAccess` (self / admin / trainer-with-active-assignment, with blocked attempts logged).

That work was reverted and the corpses removed instead:
- **6 unmounted route modules deleted (1,321 lines)** — verified zero live imports.
- **44 unreferenced one-off scripts deleted from the backend root (6,956 lines)** — including scripts that read and rewrote live Stripe key material.
- 3 stale comment blocks rewritten (rule 75: they described intent the code had not honored in months).

### 1.3 Auth posture is genuinely strong
Systematic sweep of 1,444 routes across 224 files, resolving guards at mount / router / inline levels, plus spread-alias and in-handler checks:
- **232 routes accept another entity's id; 204 fully guarded; 0 unguarded.**
- Every remaining candidate was hand-verified as either guarded in-handler (`ensureClientAccess`, `authorizeResourceAccess`) or cross-user **by design** (follow/unfollow, public prekey bundles, trainer availability).
- Registration cannot mint an admin (`PUBLIC_SELF_REGISTRATION_ROLES = {user, client}`); JWT secret resolution throws on known placeholder values; login is rate-limited 10/15min.
- A live unauthenticated probe of `/api/social/posts/user/:id` returned **401** — matching the static read.

### 1.4 Verification gates were broken, which is worse than failing gates
- `frontend/node_modules` was **empty** — no prior session could run a frontend test.
- `backend/node_modules` is a **Linux install sitting on Windows**: missing `@rollup/rollup-win32-x64-msvc`, `@esbuild/win32-x64`, `sanitize-html`; `archiver` present as 8.0.0 (pure ESM, no default export) while the lockfile correctly pins 7.0.1.
- `frontend` was missing declared dep `@zxing/browser`, breaking `npm run build` locally.
- Backend `npm install` cannot complete on Windows at all: a Linux-only transitive dep (`dcraw-vendored-linux`) hard-fails with EBADPLATFORM.
- All repaired. **Result: backend suite now runs — 7192 passed / 8 failed / 4 skipped across 997 files.** Frontend build green in 16.24s.

### 1.5 Onboarding was unreachable, and lossy
- The 8-section NASM-informed wizard exists and is routed at `/dashboard/client/onboarding`.
- **Nothing linked to it.** The only gate referencing it (`shouldRedirectClientToOnboarding`) is imported by its own test file and nothing else — dead logic with passing tests. A real signup landed on an empty dashboard with no path to the assessment.
- The wizard held all 8 sections in React state and POSTed only on the final step: closing the tab at section 6 silently destroyed everything.
- Fixed: glowing entry card on the client home (renders only when `isOnboardingComplete === false`), plus per-user device-scoped draft autosave cleared on submit. Hostile review of that own slice then caught a step-clamp crash and an `anonymous` draft-key privacy leak; both fixed and tested.

### 1.6 Open, not yet resolved
- **236 frontend orphan candidates (41,610 lines)** and **93 backend orphans (15,702 lines)** from a conservative sweep — NOT yet verified individually, NOT deleted.
- Among the backend orphans: a complete **563-line granular trainer-permission system** (`trainerPermissionMiddleware.mjs`, exports `requireTrainerPermission` + 6 named permissions) that is **built and never wired**. This reads as a missing feature, not junk.
- `sessionMetricsRoutes.mjs` — unmounted but covered by a passing test. Dormant, deliberately kept.
- Two routers mounted at the **same** path (`/api/onboarding` at `core/routes.mjs:317` and `:319`) — a shadowing condition; four onboarding routers exist in total.
- 166 unresolvable relative imports repo-wide (151 in test files). The suite still runs 997 files, so vitest aliasing covers most; the exact residue is unquantified.
- 8 failing backend tests, concentrated in environment-dependent QA automation (Chromium availability, a git-SHA assertion).

---

## 2. What I want challenged

1. **Is the auth conclusion too confident?** 204/232 guarded with 0 unguarded rests on static analysis plus hand-verification and one live probe. What class of authorization bug does that method structurally miss? (Considered: mount-order shadowing, role-conditional handlers inside controllers, socket-layer auth, and anything only reachable with a valid session.)
2. **The 154 uncommitted files** — messaging safety/attachments/moderation, notification delivery/preferences/retry, bootcamp intelligence, ~30 test files, sitting on a branch 1177 commits behind. Finish, cherry-pick forward, or archive? What is the risk of each for someone launching tomorrow?
3. **The unwired trainer-permission system.** Trainers currently have role-level access with assignment checks, but no granular per-permission control. For a launch with multiple trainers, is that a gap that must close before real client data is in, or acceptable v1?
4. **Deletion judgement.** 1,321 + 6,956 lines removed on "zero live imports, git history retains everything". Too aggressive for a pre-launch window, or correct?
5. **What is missing entirely** from this audit that a launch on this timeline demands? Rank by what would actually hurt Sean in week one.
6. **Sequencing.** Given hours, not weeks: what is the highest-value order for the remaining slices (route exposure/rate limits, money path, schema drift, runtime errors, performance, mobile, design)?

---

## 3. Constraints that bound any recommendation
- Production is live; Sean uses it for real training work starting now.
- 5+ AI agents work this repo in parallel (SwanGuard, Swan Coach audit, music, Swan Lens, logo) — no `git add -A`, explicit paths only.
- Batch-push cadence: commit per slice locally, ONE push and ONE deploy verification at the end.
- Handles minors' data, payment flows, and PII. Zero PII to LLMs.
- styled-components only (no MUI), Crystalline Swan dark-first palette, 44px targets, Victory for charts.
