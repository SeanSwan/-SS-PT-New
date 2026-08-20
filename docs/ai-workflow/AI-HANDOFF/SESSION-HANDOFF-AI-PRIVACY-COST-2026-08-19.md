---
title: "Handoff — AI privacy egress gates, provider allowlist, cost measurement"
date: 2026-08-19
author: Claude Opus 5 (vs-claude)
decision: "Four PRs open and mergeable, none merged (Sean's click). CI checks pass but DO NOT run the test suite. One HARD BLOCKER stops all backend verification."
status: open
linear: SWA-107, SWA-179, SWA-180
supersedes: none
privacy: "No secrets, no key values, no client data. Env var NAMES, file paths, line numbers only."
---

> ## ⚡ UPDATE 2026-08-19T18:45Z — next agent (vs-claude/opus-5@2545428a) executed this handoff
>
> **Four of this document's claims are now superseded by executed evidence. Read this before the body.**
>
> ### 1. The HARD BLOCKER is CLEARED — do not ask Sean for `npm ci`
> `backend/node_modules` = **499 entries**, not 0. Verified 18:14Z:
> `import('sequelize')` from `backend/` **resolves**; `backend/node_modules/.bin/vitest --version`
> reports **`vitest/4.0.18 win32-x64 node-v22.14.0`** — the pinned version this document says to
> check against. **Sean-owed item #4 is satisfied.** (The review-queue note claiming the deps landed
> in *root* is wrong on location: root is still 70, backend is 499. Same outcome, wrong reason.)
>
> **⚠ Scope this correction carefully — the install is PER-WORKTREE, and I did not say so in
> my first pass.** Measured: main tree **499**, `C:/tmp/swan-safety-floor` **499**, a freshly
> created `C:/tmp/ss-mic45` **0** — `import('sequelize')` throws `ERR_MODULE_NOT_FOUND` there.
> **So a next agent who cuts a new worktree will hit the original symptom and may conclude the
> blocker returned.** It did not. Junction `backend/node_modules` (and `frontend/node_modules`)
> from the main tree before running anything, exactly as the Landmines section warns. The
> re-verify command — which is what this document needed everywhere and had nowhere — is:
>
> ```
> ls <worktree>/backend/node_modules | wc -l     # 0 means junction it, not that the blocker is back
> ```
>
> ### 2. PR #45 does NOT have "zero test evidence" — that claim was never checked against the PR diff
> `origin/feat/coach-mic-safety-floor` adds `useVoiceRecorder.latch.test.ts` — **292 new lines, 11
> tests**, absent on `origin/main`. This document asserts twice that #45 carries no test evidence.
> It carries its own suite; nobody had opened the diff.
>
> **Executed, on pinned 4.0.18, worktree `C:/tmp/ss-mic45` @ `dc26cc933`:**
> - 11/11 pass.
> - **Mutation-proven**, per this document's own doctrine #2: reverting `useVoiceRecorder.ts` to
>   `origin/main` (the pre-fix source, `git checkout origin/main -- <path>` — no regex, so the CRLF
>   landmine cannot apply) → **9 of 11 fail.** Restored → 11/11 green. The tests genuinely guard
>   the four leaks; they are not vacuous.
>
> **→ The 🟡 HOLD on #45 is CLEARED.** Its gate was "until its frontend suite runs."
>
> **My first pass cleared it on ONE test file, which does not meet that wording** — caught on my
> own second hostile round. `useVoiceRecorder` has **three consumers**
> (`VoiceRecordingOverlay.tsx`, `useGeminiTranscription.ts`, `hooks/voice/useVoiceCapture.ts`), and
> a 127-line change to a shared hook can pass its own test while breaking a caller. Now closed
> properly: **`coach-assistant` + `hooks/voice` → 162 files, 890/890 pass** with the PR applied.
> The hold is cleared on the gate as written, not on a narrower reading of it.
>
> ### 3. The provenance caveat on #50's suites is resolved
> Both re-run on the **pinned 4.0.18** (not the npx-fetched 4.1.11 this document says not to trust),
> in `C:/tmp/swan-safety-floor/backend` @ `a5b93a1ed`:
> `aiUsageMeter.test.mjs` → **15/15** · `aiProviderAllowlist.test.mjs` → **15/15**.
> #50's other two gates (§D wiring test, `costConfig.mjs` refresh) are **still open** — 🔴 HOLD stands.
>
> ### 4. The credential question is ANSWERED — it is a real exposure, but the repo is clean
> This document called item #1 "unevaluable" and doubted the leak because "a key-shaped string was a
> Windows env var NAME, which is not the same as the value leaking." **That reasoning is wrong.**
> The source record states the variable was created by a `setx` **with name and value swapped** —
> so the key *value* became the *name*. It entered LLM context when variable names were listed.
> **Treat as exposed. Rotation is still required and still only Sean can do it.**
>
> **Blast radius, scanned (paths-only, values never echoed, Rule 59):** CLEAN on tracked
> `HEAD` **and** `origin/main`, and on `hermes-learning-packets/`, `hermes-inbox/`, `continuity/`,
> `AI-HANDOFF/`. **Scanner control-validated both ways** — it returns hits on a planted match and on
> a known-present string, so the negative is trustworthy rather than silent.
> **Conclusion: exposure is confined to LLM transcript/context. Nothing synced, committed, or
> pushed carries it.** Severity for Sean is unchanged (rotate); severity for the repo is nil.
>
> ### Still open, unchanged
> #47's 🟡 HOLD (pre-merge SQL — the three unverified assumptions are still unverified);
> #50's 🔴 HOLD (§D wiring test + costConfig refresh); `history-preview` authorization gap;
> DMARC. **`backend/services/aiChatService.mjs` is locked by a stale lane** (`swan-safety-floor`,
> 13 h, in-progress, 0 dirty) — flagged to Sean per Rule 67 R5, not seized.

# Read this first

**Your job is release-gating and triage, not "continue the workstream."** Production currently
carries two live risks (unmerged microphone fixes; a cross-client `history-preview` authorization
gap) and one possible standing compromise (an exposed credential whose severity nobody has
established). Four PRs are the remediation vehicle. Getting those landed safely outranks building
anything new.

Four PRs are open and mergeable, **none merged — merging is Sean's click and it auto-deploys to
production.** Their CI checks pass but **do not run the test suite** (see below).

There is **one hard blocker that stops every backend verification**, described immediately below.
Backend *test* work is blocked until it is cleared — you will get confusing failures that look like
code regressions and are not. Frontend work and code reading are NOT blocked; see Hour One.

---

## 🚨 BLOCKER — `backend/node_modules` is EMPTY

**Symptom you will hit:** `Cannot find package 'sequelize' imported from …/backend/database.mjs`,
or vitest failing to load its own config with `Cannot find package 'vitest'`.

**Verified state (2026-08-19):**

| Path | Entries |
|---|---|
| `backend/node_modules` | **0** |
| `node_modules` (root) | 70 |
| `frontend/node_modules` | 732 |

Static across a 20-second recheck — nothing is repopulating it. `package-lock.json` is present.

**Fix — ask Sean, then run `cd backend && npm ci`.** Use `npm ci`, not `npm install`:
`package-lock.json` is present and `ci` will not rewrite it. This is Sean's machine and the install
takes a while, so **ask before running it** — see "What to do while you wait" below so the ask does
not park you.

**Why it matters beyond inconvenience — and a correction worth reading.** My first draft of this
document said `npx vitest` "resolves a global." **That was wrong.** `npx` walks up to
`node_modules/.bin`, and when it finds nothing it **fetches current-latest from the registry**.
That is why the banner version *increased* mid-session (`v4.0.18` → `v4.1.11`): not a global
mutating, but npx downloading latest because the local install had vanished.

Consequences you must act on:

- **Do not use `npx vitest`.** After the install it can still silently run an unpinned cached
  version. Use `npm test` (the package script is `vitest run`) or `./node_modules/.bin/vitest`.
- **The expected version is `4.0.18`** (`devDependencies.vitest = ^4.0.18`). That makes the
  toolchain check falsifiable — my first draft said "check the banner" without saying against what,
  which is an unfalsifiable instruction.
- **Nobody has established WHY `backend/node_modules` emptied.** Worktree `node_modules` junctions
  were in play this session (see Landmines) and may be implicated. If the install does not stick,
  suspect a junction or a sync tool before suspecting npm. "Static across a 20-second recheck" is
  weak evidence — treat the cause as unknown.

### The trap I fell into — do not repeat it

I worked around the config-load failure with an import-free vitest config. It loaded and ran, which
felt like success. It reported **319 failed files / 260 failed tests against a known baseline of
20 / 3**, with only **2,941 of 5,298 tests executing**.

Those numbers were instrument error, not findings. **The tell was the 2,357 missing tests: a real
regression makes tests fail, it does not make them vanish.** Discard and diagnose; do not report.

**Rule for this repo:** any full-suite number that disagrees with the known baseline by an order of
magnitude is a claim about your instrument before it is a claim about the code. Check it against a
known-good baseline before believing it.

### Known-good baselines — and their limits

Measured **earlier in this session, on `origin/main` in a separate worktree, while
`backend/node_modules` still existed.** That is how numbers exist for an environment that is now
unrunnable — they predate the breakage. They are not reproducible until the install is restored.

**Provenance:** `origin/main` = `4e8394673` · node `v22.14.0` · vitest **`4.0.18`** (the pinned
local version, not the 4.1.11 npx fetched later).

| Suite | Files | Tests |
|---|---|---|
| `tests/unit` | **20 failed** / 597 passed (617) | **3 failed** / 5,295 passed (5,298) |
| `tests/api` | **15 failed** / 387 passed / 1 skipped (403) | **2 failed** / 2,529 passed / 35 skipped (2,566) |

**Parity with these numbers is the bar — not zero.**

⚠️ **These are COUNTS, not test identities, and that is a real weakness.** You could hit three
completely different failures and honestly report "parity." I did not capture the failing test
names before the environment broke, and I cannot now.

**So your first act after the install is to record the failing tests BY NAME** and write them into
this document as the real baseline. Until then, treat count-parity as weak evidence. Note also that
`origin/main` moves the moment Sean merges anything, so re-measure against the new SHA rather than
trusting these.

My characterisation of the pre-existing failures as "mostly `No test suite found` in Forge specs"
is exactly the kind of hedge that should not survive: **"mostly" is unverified.** Replace it with
the enumerated list.

---

## Open PRs — state and merge order

All four are `MERGEABLE` with CodeRabbit ✅ and GitGuardian ✅. **Merging is Sean's decision.**

⚠️ **Those two checks do NOT run the test suite.** CodeRabbit is a review summary (Free plan);
GitGuardian is a secret scan. A green PR here says nothing about whether tests pass — I cited these
badges as evidence twice before noticing, and PR #46 was in fact breaking a test while showing
green. Never treat ✅ as verification.

| PR | Branch | What it does | Notes |
|---|---|---|---|
| **#45** | `feat/coach-mic-safety-floor` | Closes four microphone leaks in `useVoiceRecorder` | Independent. `main` consumes this hook directly, so these were live bugs |
| **#46** | `feat/voice-consent-gate` | Gates `/transcribe` behind AI consent | **Contained inside #47** |
| **#47** | `feat/plaud-upload-consent-gate` | Gates all three client-audio egress lanes on the **client's** consent | 5 commits; **contains #46**; merging #47 alone delivers both |
| **#50** | `feat/ai-provider-allowlist` | Sub-processor allowlist + AI cost measurement | 2 commits; merges cleanly on top of #47 (proven by trial merge) |

### 🚦 MERGE HOLDS — these are gates, not preferences

A ranking is not a dependency graph. Without these holds it is possible to merge all four in one
sitting — auto-deploying never-executed metering code against a six-month-stale price table — while
following this document to the letter.

| PR | Status | Gate |
|---|---|---|
| **#45** | 🟡 HOLD | Until its frontend suite runs. Four fixes to live production bugs with **zero test evidence attached**. Frontend is runnable now — this is hours, not days |
| **#47** | 🟡 HOLD | Until the pre-merge consent query runs **and the query itself is verified** (see below). Merging first risks 403s for un-onboarded accounts |
| **#50** | 🔴 HOLD | Until (a) `npm ci`, (b) the §D wiring test executes, (c) `costConfig.mjs` is refreshed. It currently ships **unexecuted** metering against a stale table — the exact "under-reporting is worse than none" failure it was built to prevent |
| **#46** | ⚪ | Redundant once #47 lands |

**Ordering once gates clear:** #45 → #47 → #50. Each is independently revertable.

### Rollback — read before merging anything

There is **no feature flag** on any of this, Render **auto-deploys `main`**, and Rule 45 forbids
force-push. **Therefore the only rollback is a revert PR.** No one has rehearsed it.

- **#47 goes wrong** (403 storms on `/transcribe` or uploads): revert the merge commit. There is
  **no backfill script** to create missing `AiPrivacyProfile` rows — writing one is the alternative
  remedy and does not exist yet. Symptom to watch: `AI_CONSENT_MISSING` in logs.
- **#50 goes wrong:** the meter is additive and wrapped in the normal call path, but it has never
  executed. Symptom: errors from `recordAiUsage` inside `sendChatMessage`. Revert the merge commit.
- **#45 goes wrong:** revert; the previous hook behaviour is restored.

**Post-merge watch window:** check Render logs for `AI_CONSENT_MISSING`, `AI_CONSENT_DISABLED`, and
any `[AIUsage]` throw for the first hour.

**Merge relationships:** #47 **contains #46's commits** (merged additively, per Rule 45's no-rebase
rule), so merging #47 delivers both. #50 was trial-merged on top of #47 with zero conflicts — **that
proof decays the moment anything else merges**; re-run the trial merge if the base has moved.

**#46's fate:** its commit SHAs land on `main` with #47, so GitHub will most likely auto-mark it
merged. **Check before acting** — my earlier prediction that it would need manual closure was an
assumption about GitHub's behaviour, not something I verified. If it does linger, close it with a
pointer to #47.

**Not reviewed by me:** #20, #21, #22, #24 are also open from earlier sessions and are outside this
workstream. Do not assume they are current.

### ✅ RESOLVED 2026-08-19 — the pre-merge check, executed. Its draft query was wrong on the axis.

**All three assumptions settled, and a fourth thing nobody had questioned turned out to be the actual defect.**

| # | Assumption | Verdict | Evidence |
|---|---|---|---|
| 1 | Table is `ai_privacy_profiles` | ✅ **CONFIRMED** | Model sets `tableName: 'ai_privacy_profiles'` explicitly (so Sequelize's `AiPrivacyProfiles` default never applies); migration `createTable('ai_privacy_profiles')`; and **live production code already queries it that way** — `aiChatRoutes.mjs:683` runs `SELECT "aiEnabled", "withdrawnAt" FROM ai_privacy_profiles WHERE "userId" = :userId`. Working code beats a model read |
| 2 | Role filter `IN ('admin','trainer')` | ❌ **WRONG AXIS** | See below — this is the real finding |
| 3 | `p."userId"` camelCase | ✅ **CONFIRMED** | Model attribute `userId`, no `underscored`, no `field:` mapping; migration column `userId`; FK → `'Users'` (PascalCase, correct per the dual-table gotcha) |
| 4 | *(unasked)* `requireAiConsent` is fail-closed | ✅ **CONFIRMED** | `middleware/aiConsent.mjs:74` — `if (!profile) → 403 AI_CONSENT_MISSING` |

**The role filter was wrong because `/transcribe` has no `authorize([...])` at all.** The route is
`aiChatRoutes.mjs:1064`; its chain is `router.use(protect)` (`:306`) → `requireSubscription('pro')`
→ `aiRateLimiter` → `selfVoiceConsentGate` → `audioUpload` → `strictPiiMiddleware`.

And **`requireSubscription('pro')` blocks nobody.** `middleware/requireSubscription.mjs:106` returns
`next()` for admin and trainer, and `:216` returns `next()` for everyone else under the comment
*"AI is free for everyone — just attach tier info for model routing."* It is telemetry, not a gate.

**So every authenticated user reaches `/transcribe` — clients included — and the draft query,
by filtering to admin/trainer, was measuring a population that does not correspond to the risk.**

Also worth recording: the gate on #47 is named `selfVoiceConsentGate` (`:132`), a thin wrapper that
pins `req.body.userId = req.user.id` before delegating to `requireAiConsent`. The handoff referred
to `requireAiConsent` directly, which is right about semantics and wrong about the symbol.

#### The query that actually runs — and its result against production

```sql
-- Verified against the live DB 2026-08-19. Read-only.
-- Note u.role::text — role is a Postgres enum, so COALESCE to a string literal
-- errors with: invalid input value for enum "enum_Users_role".
SELECT COALESCE(u.role::text, '(null)') AS role,
       COUNT(*)                         AS users_without_profile
FROM "Users" u
LEFT JOIN ai_privacy_profiles p ON p."userId" = u.id
WHERE p.id IS NULL
GROUP BY u.role::text
ORDER BY users_without_profile DESC;
```

**Result — 6 of 7 users would get `403 AI_CONSENT_MISSING` on `/transcribe` after #47 merges:**

| role | total | with profile | **without** |
|---|---|---|---|
| client | 4 | 0 | **4** |
| admin | 2 | 1 | **1** |
| user | 1 | 0 | **1** |

**The draft query would have reported `1`** and read as "basically transparent." The real answer is
**6 of 7 — effectively everyone.** That gap is the whole reason this check exists.

#### Can they self-remedy? Mostly yes — one account cannot, in-app

`POST /api/ai/consent/grant` (`routes/aiRoutes.mjs:69`) carries **only `protect`** — no `authorize`.
`aiConsentController.mjs` permits a self-grant unconditionally, and a grant *on behalf of* someone
else only when that target's role is `client`. **So fail-closed is a gate, not a dead end** — the
handoff's open question is answered.

The gap is **UI, not authorization**:

- **4 clients + 1 `user`** → covered. `/ai-consent` is mounted at
  `UniversalDashboardLayout.routes.tsx:224`, and `UniversalDashboardLayout.tsx:64` normalizes
  `'user' → 'client'`, so the `user`-role account gets the client dashboard and reaches the screen.
- **1 admin** → **no in-app path.** `/ai-consent` is the only consent route in the entire registry
  and it sits inside the `client:` block (blocks begin `admin:104`, `trainer:183`, `client:214`).
  The admin block has 65 routes and none is consent. That account can still self-grant via one
  authenticated `POST /api/ai/consent/grant` — so this is a missing screen, not a lockout.

#### Verdict on the 🟡 hold

**#47's merge is safe once the 6 accounts are handled, and the handling is cheap** — there is still
no backfill migration, but one authenticated POST per account clears it, and 5 of the 6 can do it
themselves from the dashboard. **The one admin needs either an API call or an admin-side link to
`/ai-consent`.** Adding that link is the smallest change that makes the merge fully self-service.

#### Detector re-proven independently (Hour One §B2)

`nutritionLlmEgress.test.mjs` on `origin/feat/plaud-upload-consent-gate` @ `47acc299a`: **8/8**,
including *"leaves no transcribeAudio caller ungated."* **Mutation-proven from scratch rather than
taken on trust:** planted an untracked rogue `transcribeAudio` caller — confirmed `git grep` was
blind to it (0 tracked hits, the exact blind spot the detector exists to cover) — and the suite
**failed**. Removed it; back to 8/8, worktree clean.

#### Coverage gap noticed, not fixed

`backend/tests/api/aiPrivacy.test.mjs` covers de-identification only. **Nothing tests the consent
grant/withdraw flow or the 403 fail-closed path.** Out of scope here; worth a slice.

### Pre-merge check Sean owes on #46/#47

`requireAiConsent` is **fail-closed on a missing profile**. `AiPrivacyProfile` rows are created
only by the consent flow and **there is no backfill migration**; `aiEnabled` defaults to `false`.
So after merge, `/transcribe` returns 403 `AI_CONSENT_MISSING` for anyone who never completed the
consent flow — possibly including Sean's own account.

```sql
-- ⚠️ UNVERIFIED — do NOT hand this to Sean until you have checked it.
SELECT COUNT(*) FROM "Users" u
LEFT JOIN ai_privacy_profiles p ON p."userId" = u.id
WHERE p.id IS NULL AND u.role IN ('admin','trainer');
```

**This query has never been executed and three things in it are asserted, not verified:**

1. **The table name.** The migration is `20260225000001-create-ai-privacy-profiles.cjs`, implying
   `ai_privacy_profiles` — but Sequelize defaults would give `AiPrivacyProfiles`. **Read
   `backend/models/AiPrivacyProfile.mjs` for `tableName` before running it.** Snake-case table with
   a camelCase `"userId"` column is exactly the mixed-convention drift Rule 58 exists for, and this
   repo has the dual `users`/`"Users"` problem on top.
2. **The role filter.** It checks admin/trainer only. **Can a `client` reach `/transcribe`?** If so
   they belong in the count. Verify against the route's `authorize([...])`.
3. **`p."userId"` casing.**

Verify all three, run it, then hand Sean a query that works. An unexecuted check is a claim.

0 → merge is transparent. >0 → those accounts need the consent flow first.

**One more thing nobody has verified:** "profiles are created only by the consent flow" is asserted
from `aiConsentController.mjs`. **Nobody confirmed the consent-flow UI actually ships for the
affected roles.** If it does not, fail-closed is a dead end rather than a gate, and the SQL check is
moot — users would have no way to obtain a profile.

**Sean ratified fail-closed for `/transcribe` and fail-open-on-missing-profile for the upload
lanes.** Do not change either without asking; the asymmetry is deliberate.

---

## Hour one — do this in this order

The backend install needs Sean. **Ask immediately, then work the unblocked items while you wait.**
Do not park.

### A. Send Sean one severity-ranked message (5 minutes)

Ranked by blast radius, not by workstream — see the Sean section below for the ranked list. Send it
as one message so nothing waits on a second round trip.

### B. Work these while waiting — none need the backend install

0. **Scope the credential exposure — this is agent work, not Sean's.** Sean can only *rotate*; you
   can determine whether item #1 is an incident or hygiene, and right now **nobody is assigned to
   it.** Search the repo, `docs/ai-workflow/`, learning packets and hermes memos for the key
   *value* (never echo it — presence/absence only, Rule 59), check git history, and establish
   whether the 2026-08-12 output persisted anywhere synced. **The record is ambiguous on its face:
   the note says a key-shaped string was a Windows env var NAME, which is not the same as the value
   leaking.** Resolve that before calling it a standing compromise — the top-ranked item is
   currently unevaluable from this document.

1. **Verify PR #45.** Four microphone leaks in `useVoiceRecorder`, described as live bugs on
   `main`, and **this handoff cites zero test evidence for them.** The *frontend* has 732 packages
   installed and is runnable right now. Run its suite and the hook's tests. This is unmerged work
   fixing live production bugs with no proof attached — the highest-value unblocked task here.
2. **Mutation-test PR #47's category detector.** It is the headline deliverable of #47: a test
   enumerating `transcribeAudio(` callers that fails when an unlisted one appears. It *was*
   mutation-tested during authoring by planting an **untracked** rogue caller (that is how the
   original `git grep` blind spot was found — `git grep` cannot see untracked files, which was the
   exact case it existed to catch). **Re-prove it yourself; do not take my word.** It is a
   filesystem walk now, and the test lives in `backend/tests/unit/nutritionLlmEgress.test.mjs`.
3. **Author the step-D test** (below) so it is ready to run the moment the install lands.
4. **Refresh `services/ai/costConfig.mjs`** — see the pre-merge note under #50.

### C. Once Sean approves the install

0. **`git status` and diff against `origin/main` FIRST.** Whatever emptied `node_modules` is
   unidentified, and an event that silently wipes one directory may have touched others. Establish
   the tree is intact before installing into it.
1. `cd backend && npm ci`
2. Confirm the toolchain: `npm test -- --version` or check the run banner reads **`4.0.18`**. Not
   `npx`.
3. `npm test tests/unit/aiUsageMeter.test.mjs` → expect **15/15**.
4. `npm test tests/unit/aiProviderAllowlist.test.mjs` → expect **15/15**.
5. **Full-suite parity** vs the baselines above — and **record the failing tests by name** to
   replace the count-only baseline.

### D. The actual gap — PR #50's wiring

`backend/services/aiChatService.mjs` wires `recordAiUsage()` into `sendChatMessage()`. It is
**syntax-checked only, never executed**, because `sequelize` would not resolve.

**The metering semantics are already implemented — do not invent them.** The test must assert what
the code does:

- **Per attempt, not per success.** Every provider attempt records once.
- **A successful attempt** records `{provider, model, tokenUsage, ok: true}` and the returned object
  gains `estimatedCostUsd`.
- **A failed attempt** records `{provider, model: null, tokenUsage: null, ok: false}` — deliberate,
  so a flapping provider cannot look free. It increments `calls` *and* `failedCalls`.
- On failover, cost is attributed to **the provider that answered**, not the one first attempted.

Write it with a mocked provider covering success and provider-failure. **Check whether providers are
constructed from env at import time** before reaching for a naive `vi.mock` — `getAvailableProviders()`
reads `process.env` per call, so env manipulation in `beforeEach` works, but confirm rather than assume.

**While you are in that harness, also do the failover failure matrix** — timeout, 429, 5xx,
malformed response, auth failure. This handoff originally deferred that to SWA-180 behind "second
hosted provider configured," but only the *provider* is Sean-gated; **mocked failure evidence is
achievable now**, in this same test file.

6. Update PR #50 and SWA-179 with the result.

**Believed proven — but re-run it rather than trusting me.** `aiUsageMeter.mjs`: 15/15,
self-contained, passing with zero packages installed, mutation-proven three ways (exact-match-only
❌caught ×3, shortest-prefix ❌caught ×2, stop-counting-unpriced ❌caught ×1).

⚠️ **Provenance caveat, by this document's own standard:** those runs happened *during the broken
window*, on the **npx-fetched 4.1.11**, not the pinned 4.0.18 — which the blocker section tells you
not to trust. The mutations were applied with `perl -0pi`, the tool the Landmines section says
silently fails on CRLF. Marker counts *were* checked on each run, which is why one non-applying
mutation was caught — but the strongest evidence in this document rests on its least-trusted
instrument. **Re-run both suites on 4.0.18 after the install and treat that as the real result.**

---

## Then, in recommended order

### 1. SWA-179 — persistence for the usage summary *(needs a Sean decision first)*

The rolling summary is **in-memory and resets on deploy**. The durable record today is the per-call
`[AIUsage]` structured log line. A DB table is the obvious next step but **needs a schema decision
that is not an agent's to take** — ask Sean before designing a migration.

### 2. SWA-179 — refresh `services/ai/costConfig.mjs` ⚠️ **do this BEFORE #50 merges**

Last verified **2026-02-24** — six months stale. `claude-sonnet-4-20250514` is known-unpriced (the
table holds `claude-sonnet-4-6`), and OpenAI dated ids resolve only by prefix.

**Why it is pre-merge and not a follow-up:** #50 would ship with muted Anthropic cost, and the
signal that tells you so (`usage.unpricedModels`) lives in an **in-memory summary that resets on
every deploy**. That is precisely the "under-reporting is worse than none" failure the meter was
built to prevent — reintroduced by shipping it against a stale table. Either refresh the prices
first, or state the limitation explicitly in the merge note.

Prices come from the vendors' published pricing pages (linked in `costConfig.mjs`'s header).
**Confirming prefix coverage with zero traffic:** call `resolvePricedModel()` directly against the
model ids the chat path actually requests — `gpt-4o-mini` (`aiChatService.mjs:2273`),
`claude-sonnet-4-20250514` (`:2311`), `process.env.GEMINI_MODEL || 'gemini-2.5-flash'` (`:2351`),
`llama-3.3-70b` (`:2427`) — plus a dated variant of each. No live calls needed.

### 3. SWA-180 — second hosted provider *(the failure matrix moves earlier — see Hour One §D)*

Failover **exists in code** in `sendChatMessage` — it walks providers, catches per-provider errors,
records `failoverTrace`, returns the answering `provider`. **"Exists in code" is not "works":** by
this document's own standard that path is as unexecuted as the meter wiring, so do not describe it
as working until you have run it.

Only **configuring a second provider** is Sean-gated (it is a disclosure decision — another company
receiving client health data). The **mocked failure matrix is not gated** and belongs in Hour One
§D. Also surface `provider` + `failoverTrace` in the UI; the service already returns both.

⚠️ **Never silently cross a governance boundary on failover.** See SWA-156 (local-brain prompts
reached OpenRouter under fail-OPEN routing). If a failover target has different data-handling
terms, the failover is a **disclosure event**, not a convenience.

### 4. Still ungated, deliberately

`equipmentRoutes /:id/scan` is authenticated but has no consent gate. Lower sensitivity (equipment
photos), and Sean has not ruled on it. **Do not gate it unilaterally.**

`workoutLogUploadRoutes /history-preview` has **no trainer-client assignment check at all** — any
trainer can preview any client's history. Pre-existing, not introduced by this work. It is an
authorization change on a live route, so it needs Sean's call.

---

## Sean-owned — surface these, do not do them

**Ranked by blast radius.** My first draft sorted these by workstream, which put a live exposed
credential *below* an `.env.example` entry. Send them as one message.

| # | Item | Why it ranks here |
|---|---|---|
| **1** | **Rotate the Render API key** exposed 2026-08-12 | A live production credential, exposed for a week. Nothing else on this list is a standing compromise |
| **2** | **Merge #45** | Four **live** microphone leaks in production `main` — the only item that is a user-facing bug shipping today |
| **3** | **Rule on `history-preview` authorization** | Any trainer can preview **any** client's history — a live cross-client data-access gap. Pre-existing, needs a product call |
| **4** | **`npm ci` in `backend/`** | Unblocks all verification. Nothing below can be proven until this lands |
| **5** | **Pre-merge SQL check**, then merge #47 (and #50) | The consent gates. Check first or `/transcribe` 403s for un-onboarded accounts |
| **6** | **DMARC record (SWA-13)** | Standing ask, ~10 min in Namecheap; gates nurture/booking email |
| **7** | **Hit `GET /api/ai-chat/diagnostics` as admin** (after #50 deploys) | Answers "which AI companies receive client data" — including the `AI_API_KEY` alias (`services/ai/adapters/openaiAdapter.mjs:29`, `AI_API_KEY \|\| OPENAI_API_KEY`) that makes OpenAI invisible to a naive `OPENAI_API_KEY` check. Names and booleans only, never key values |
| **8** | **`.env.example`** needs `AI_PROVIDER_ALLOWLIST=` with narrowing semantics | Behind the env-file permission guard; I did not route around it and neither should you |

**On the exposed key and the ✅ badges:** GitGuardian passing on these PRs does **not** clear that
key. The badges check the PR diffs; the exposure was separate (a Windows env var name surfaced in
2026-08-12 session output). Do not read a green PR as evidence the credential is safe.

---

## Landmines in this repo — read before you spend an hour on one

- **Rule 45: no rebase, no amend, no force-push** without Sean asking. When PRs #46 and #47
  conflicted, the resolution was an additive merge commit, not a rebase. Do the same.
- **A test file was BINARY to git.** `nutritionLlmEgress.test.mjs` held `brand: '\0\a'` (a literal
  NUL) from a heredoc that interpreted its escapes. Git classified the file as binary → no
  line-level diff → every concurrent edit conflicted unresolvably. Fixed in #47. **Never write code
  files with shell heredocs; use the edit tool.** Worth adding a pre-commit NUL-byte check.
- **Git Bash `<rev>:<path>` lies.** Use `MSYS_NO_PATHCONV=1 git show <rev>:<path>` or it reports
  files absent that exist.
- **`tsc --noEmit` OOMs** without `NODE_OPTIONS=--max-old-space-size=8192`.
- **Worktrees need their own `node_modules` junction** — and vitest writes its transpiled config
  into the nearest `node_modules`, which through a junction resolves somewhere that cannot resolve
  `vitest`. If you hit that, fix the install rather than building a workaround config (see the trap
  above).
- **`perl -0pi` mutation patterns silently fail on CRLF.** Always count the marker in the mutated
  file before believing the test result. This bit me three times in one session.

---

## Doctrine that earned itself this session

These are not general advice; each cost real time here.

1. **Fix the category, not the instance.** I scoped a consent fix to two routes I had found;
   enumerating every caller of `transcribeAudio` surfaced a third (the actual PLAUD merge lane). I
   would have shipped two of three. #47 therefore ships a **detector** — a test that fails when an
   unlisted caller appears — not a third instance fix.
2. **A test that has never failed on purpose is not evidence.** Two locks this session silently
   covered less than they claimed: a `git grep` category lock blind to untracked files (the exact
   case it existed to catch), and a `toMatch` freeze assertion satisfied by *other* entries.
   **Mutate the guarded code and watch the test fail, or you do not know what it tests.**
3. **Name what your instrument cannot see.** `node --check` parses but does not resolve imports —
   a wrong relative path is a Render boot crash-loop it cannot detect. `git grep` cannot see
   untracked files. CI badges here run CodeRabbit and GitGuardian, **not the test suite** — I cited
   them as evidence twice before noticing.
4. **Telemetry that under-reports is worse than none.** The cost table matches models by exact key;
   providers return different strings. A naive wiring would have reported ~$0 for the two most
   expensive providers and made "cheap-model routing saves nothing" look measured. **Any
   lookup-based metric needs a miss counter, or its gaps read as zeroes.**
5. **"We don't keep it" is not a privacy answer when the duty is to answer questions about it.**
   Non-retention feels private, but WA MHMD / NV SB 370 grant access and deletion rights — a
   record you never kept is a request you cannot answer.
6. **A scoped-down deliverable that no longer solves the original problem is worse than a refusal.**
   A reviewer proposed shipping local-Qwen as a labeled scratchpad; a second reviewer named it
   face-saving scope. Test: *if this ships, does the person's problem go away?*
7. **Verify a reviewer's conclusion separately from its findings.** GLM was right about every
   mechanism and wrong about what to do. A strong track record is not evidence for the next claim.

---

## Panel notes (if you run one)

- `node scripts/consult-glm.mjs --document <path> [--out <path>] [--remit "…"]` — ZAI subscription,
  no spend gate. **Best at concrete mechanism**; tends to land on compromises — take its facts,
  re-derive its recommendation.
- `node scripts/consult-kimi.mjs --document <path> --out <path> --max-tokens 20000 --cap-usd 0.45
  --confirm-spend --remit "…"` — paid, **ask Sean first**. Best at attacking the frame and
  surfacing legal/consent ground. Its *code-hygiene* assumptions go stale — verify its checklists.
  Note the preflight worst-case estimate ran **31× above actual** ($0.93 estimated, $0.03 charged);
  trim `--max-tokens` rather than raising the cap.
- **Two reviewers with different attack angles beat one good reviewer.** They reached opposite
  conclusions on the same document for three cents, and the disagreement was the product.

---

## Where the record lives

| Artifact | Path |
|---|---|
| Media egress decision brief | `docs/ai-workflow/AI-HANDOFF/SWANSTUDIOS-MEDIA-EGRESS-DECISION-BRIEF-2026-08-17.md` |
| Local-Qwen design + both reviews | `docs/ai-workflow/AI-HANDOFF/ADMIN-PROVIDER-CHOICE-LOCAL-QWEN-DESIGN-2026-08-18.md` (+ `GLM-…`, `KIMI-…`) |
| Learning packets | `docs/ai-workflow/hermes-learning-packets/2026-08-18-*.md` |
| Hermes memos (gitignored, drain at session start) | `.ai-workflow/hermes-inbox/pending/` |
| Linear | SWA-107 (egress/privacy), SWA-179 (cost routing), SWA-180 (failover) |
