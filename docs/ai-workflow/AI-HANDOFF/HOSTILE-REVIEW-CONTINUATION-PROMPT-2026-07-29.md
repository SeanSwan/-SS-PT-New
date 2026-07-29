---
decision: Continuation prompt for a fresh agent to run 40 more hostile-review rounds to dry on the SwanStudios launch-audit surfaces; rounds 1-9 are already complete and their vantages are burned, so round 10 must open a NEW vantage
status: open
supersedes: none
---

# CONTINUATION PROMPT — 40 hostile-review rounds to dry

**Paste everything below the line into a fresh agent.** It is self-contained: it carries the session history, the standing laws, what has already been proven (so you don't re-prove it), the vantages already burned (so you don't repeat them), and 24 concrete unburned vantages to start from.

**Written:** 2026-07-29 · **By:** vs-claude (Opus 5) · **Linear:** SWA-75 (parent), SWA-62, SWA-87, SWA-89, SWA-74
**Predecessor handoff (READ IT FIRST):** `docs/ai-workflow/AI-HANDOFF/BRANCH-PARITY-AND-UNLANDED-WORK-HANDOFF-2026-07-29.md`

---

## YOUR TASK

You are continuing a hostile-review loop on SwanStudios (production PT SaaS, `sswanstudios.com`, Render). Sean's instruction, verbatim: *"do another 40 runs of hostile review on this until dry."*

**Run up to 40 hostile-review rounds. Fix what you find. Stop early ONLY when two consecutive rounds find nothing fixable.** Report honestly — if you go dry at round 14, say so and stop. **Do not manufacture findings to reach 40.** The predecessor stopped at 9 real fixes when asked for 20, and that was correct.

### The DRY-LOOP law (Sean 2026-07-21) — this is how a round counts

- A round must **gather NEW evidence from a vantage not yet tried** — a different cwd/worktree, a different mode/flag, a different role, a different viewport, the real caller path, live data instead of code, execution instead of reading.
- **Re-reading code is NOT a round.**
- **The round that applied fixes is the next round's primary attack surface.** Your own fixes are the most likely place for the next defect. This paid out repeatedly in rounds 1–9: five of seven defects were in code or docs the predecessor had written hours earlier.
- Hostile rounds repeat until a round finds **nothing fixable**, then **ONE MORE confirmation round** runs. Two consecutive CLEAN rounds = dry.
- End your closeout with the round ledger and the literal marker `DRY-LOOP: CLEAN×2 (rounds: N)`.
- **Sean-gated findings go to Linear (do not fix them):** anything touching production data destruction, Stripe/billing keys, back-pay, prod user resets, or a policy decision that is Sean's to make.

### Rule 74 — PROOF-BEFORE-DONE (hard gate)

You may not write **done / fixed / complete / working / passing** unless the SAME message carries current-session proof you generated: executed command output, a failing→passing regression test on the real caller path, a live probe, or file:line + observed value. `[LIKELY]`/`[HYPOTHESIS]` is not proof. If something can't be proven here (e.g. needs an authenticated browser), **disclose the gap explicitly** and scope the claim.

---

## SESSION HISTORY — what happened before you

### Origin

Sean asked for a comprehensive launch audit: fix dirty files, catch work up to current, push unfinished work, run a **defensive security sweep** (nobody can break in, no route lets you log in as someone else), find dead/broken/incomplete files, and actively propose upgrades. His metaphor: *"taking a comb and combing out lice from hair"* until there's no lice left. Standing bar: *"always enhancement, always upgrade, always triple A, always enterprise."*

### Phase 1 — the launch audit (COMPLETE, shipped to `origin/main`)

| Slice | Outcome | Commit |
| -- | -- | -- |
| S1 data-subject rights | export + erasure (anonymisation — financial skeleton survives), mutation-proven. **Deliberately NOT route-wired**, pending Sean's access-control decision | `1389f0d0d` |
| S2+S7 | email-failure visibility + `DEPLOY-ROLLBACK-POLICY.md` | `e431a9bda` |
| S5 observability | 5xx captured at the **response boundary** — the global Express handler saw only ~8% (1,094 direct `res.status(5xx)` across 203 files) | `42c888ecb` |
| S8 orphans | 3 components / 1,934 lines deleted, 4-way verified | `2231bbc52` |
| Hostile pass A | 6 URL/PII capture defects + 3 erasure defects, both sets mutation-proven | `14032c035`, `451e611f8` |
| Handoff + 9 dry rounds | branch-parity report, then self-correction | `d85f0502a`, `2d2c12c28`, `d84dd1745` |

**Also deleted earlier in the session:** 6 dead route modules (1,321 lines) whose mounts were commented out behind a comment that *claimed* they were "kept for backward compatibility" — a lie; and 44 backend-root scripts (6,956 lines) including four that read and rewrote **live Stripe key material**.

### Phase 2 — branch parity (the current work)

Sean asked whether the branch sitting ~1,240 commits behind `main` was losing work "in translation." **Answer: no — 48 commits are genuinely unlanded; 11 of 13 key runtime files don't exist on `main` at all.** Verifying that surfaced three live defects (below).

### Phase 3 — 9 hostile rounds against that handoff

Seven real defects, five of them in the predecessor's own output. Full ledger in the "burned vantages" table below.

---

## GROUND TRUTH — verified, do NOT re-prove

Re-proving these wastes rounds. Treat as `[VERIFIED]` unless you have contrary evidence.

### Proven STRONG (attack elsewhere first)

- **Auth surface:** 204/232 routes guarded, **0 unguarded**. `protect` re-reads role from the DB, so a demotion is immediate. Impersonation is owner-gated, audited, de-escalating.
- **Money path:** prices server-derived, webhooks signature-verified, grants idempotent, cart mutation scoped to the owner.
- **Auth throttling exists** — six limiters (register 10/hr, login 100/15min + per-account 10/15min, refresh 20/15min, reset 5/15min ×2, change-password 10/15min).
- **Support/report channel exists end-to-end and is linked** (`/api/support/issues` + admin inbox + `CompactFooter.tsx:89` + client dashboard).
- **`sendEmail` returns `{success, error}` and all four call sites inspect it.**
- **`TrainerCommission` model↔table mapping is CORRECT** — `tableName: 'trainer_commissions'` + `underscored: true`, all 10 NOT-NULL-no-default columns supplied.
- **`ClientDashboardHomeTab`** fetches its own data via hooks with a 3-tier avatar fallback. The hardcoded `EMPTY_STATS`/`profilePosts` props passed by `ClientHomeTab` are **vestigial and unused** — they look like a data-truth bug and are not one. **Do not "fix" them.**

### Proven BROKEN on `main` (fix candidates)

**§A — MONEY (LATENT, closing window).** `creditsController.mjs:132` calls `calculateCommissionSplit` with **4 args**; the 5th (`{trainerType}`) is never passed → `|| 'hired'` → else-branch → **65% where an independent trainer is owed 85%**. `grep -c trainerType` in that file = **0**. Route mounted `core/routes.mjs:720`. Split is **persisted** to `trainer_commissions` (`:176-192`). Trainer endpoint uses `req.user.id` (`:257,:303`) so an independent trainer **shorts themselves**.
- Executed: **$1,680** / **$3,360** / **$6,720** short on the $8.4k / $16.8k / $33.6k packages — a **constant 20 points of gross** across every leadSource and with the loyalty bump.
- **LATENT:** live DB has **0 trainer-role users** and `trainer_commissions` **0 rows**. Nothing lost. Fix before the first independent trainer onboards = free.
- ⚠️ **The unlanded branch fix does NOT close it.** `commissionCalculator.mjs:59` = `options.trainerType || DEFAULT_TRAINER_TYPE`, and `DEFAULT_TRAINER_TYPE='affiliated'` = `{35,65}` — the same 65%. Proven: `{trainerType:'affiliated'}` is **byte-identical** to omitting the arg. `git show 0b60de7db --name-only` excludes `creditsController.mjs`.
- **Fix pattern:** copy the branch's `CommissionService.mjs:97-104` house style — validate against `TRAINER_TYPES` → `logger.warn` naming trainer id + bad value → fall back to `DEFAULT_TRAINER_TYPE`. **Not a throw.** Do NOT invent a third pattern.

**§B — AUTHZ (LIVE).** `adminPackageRoutes.mjs:325` `DELETE /:id` and `:596` `DELETE /variants/:variantId` have no owner-gate; `grep -c ownerAdminOnly` on `origin/main` = **0**. Any `role==='admin'` can delete storefront packages. Fix exists unlanded in `0b60de7db`.

**§C — SCHEMA (LIVE, = SWA-87).** Live-DB verified column lists:

| Table | Exists | Rows | Problem |
| -- | -- | -- | -- |
| `UserAchievements` | YES (PascalCase) | **0** | model declares `maxProgress` (main:65, used :386-387); **not a real column** → unrestricted read at `progressController.mjs:733` throws, is swallowed, reports 0. Both write paths (`gamificationController.mjs:1639,1753`) structurally impossible → **no achievement can ever be awarded** |
| `user_achievements` | **NO SUCH TABLE** | — | don't chase it |
| `food_scan_history` | YES | **0** | `productName` is NOT NULL no-default and the model never declares it; caller `foodScannerService.mjs:498` writes `productId`/`barcode`/`wasConsumed` — **none exist** (real col is `productCode`). **TWO independent blockers** |
| `trainer_permissions` | YES | **0** | NOT NULL no-default: `trainerId`, `permissionType`, `grantedBy` — undeclared |

⚠️ **Sequelize `create()` builds its INSERT from ALL model-declared attributes**, not just the keys you pass. **Trimming the caller's payload does NOT fix a write** — reconcile the model against the table.

### Known gaps (not defects — capability limits)

- **No version/build endpoint.** `/version`→503, `/api/version`→404. You cannot tell what is deployed without the Render dashboard. ~15 lines exposing `RENDER_GIT_COMMIT` fixes it permanently and is read-only/safe.
- **S6 mobile pass** (3 flows × 2 browsers) needs a real authenticated browser session — not doable headless. Playwright MCP is available but has no logged-in session.
- **Failing-test baseline = 23 across ~10 files**, verified identical on a pristine `origin/main` worktree. **Not regressions.** It grew 21→23 mid-session from another agent's `dayBriefCommand` push. **Confirm on a clean worktree before blaming your own change.**

### Sean-only — flag to Linear, never execute

Restore drill (tooling shipped + guard-tested, **never run**) · Stripe key rotation → live `$1 charge → webhook → refund` · external uptime probe · `NASMAdminDashboard.tsx` (1,128 lines) wire/park/archive ruling · data-rights route access policy (owner-only vs client self-service) · **back-pay decision if trainers onboard before §A lands** · prod data reset · DMARC record (SWA-13, standing).

---

## BURNED VANTAGES — rounds 1–9. Do NOT repeat these.

| R | Vantage used | What it found |
| -- | -- | -- |
| 1 | **Executed** the calculator (had only read it) | figures exact; constant-20pts fact; `'affiliated'` ≡ omitted, byte-identical |
| 2 | Route guards + persistence trace | trainer endpoint self-assigns `req.user.id`; split is persisted, not displayed |
| 3 | **Live DB query** | 0 trainers / 0 commission rows → **LATENT**, not draining. Model↔table mapping verified clean |
| 4 | Re-verify **relayed** claims (Rule 30) | all 3 SWA-87 claims held; produced real column lists |
| 5 | Landing-hazard simulation | `'hired'` absent from new `BASE_RATES` **would** have thrown — branch already fixed it; predecessor's "fail loudly" advice was wrong |
| 6 | **Different worktree / different cwd** | count drifted 47→48 mid-session; 3 stale `1,237` refs survived an earlier fix |
| 7 | Rule 53 wording-class sweep | stale claim **also** survived in the recommendation section; shell heredoc ate backticks |
| 8 | Contradiction + secret scan | CLEAN |
| 9 | Citation resolution (all cited line numbers) | all 11 re-resolve exact — CLEAN |

**Earlier burned (phase 1):** unbounded growth, adversarial scale, encoding tricks (`%3F`, `;`), prototype pollution, type confusion, case variation, mutation testing, supertest with mocked `protect`.

---

## 24 UNBURNED VANTAGES — start round 10 here

Pick by expected yield. **Vantages marked 🔬 have historically produced the most real findings in this repo: execution over reading, live data over code, and the real caller path over the unit.**

### Execution / runtime
1. 🔬 **Drive the real credits endpoint** with supertest + mocked `protect` as an *independent* trainer; assert the persisted `trainer_commissions` row's `commission_rate_trainer`. This is §A's failing regression test and the highest-value single item.
2. 🔬 **Execute the two write-broken model INSERTs** in isolated rolled-back transactions (one transaction PER assertion — Postgres aborts the whole tx after the first error; a shared tx produces false findings). Run a **control probe** on a drift-free model.
3. **Boot the backend** and walk the mount order for real (`app._router.stack`) — Rule 31 shadowing. Overlapping mounts like `/api/workout` + `/api/workout/sessions` shadow silently.
4. **Run the full suite from a pristine `origin/main` worktree** and diff the failure set against 23 — catch any regression the predecessor introduced.
5. **`node --check` + import-execution smoke** on every backend module touched this session (Rule 42's two crash classes).

### Live data
6. 🔬 **Column-drift sweep across ALL models** vs `information_schema` — the predecessor only verified 4 tables. `audit-write-paths.mjs` exists on the unlanded branch; run it from there.
7. **Orphaned-row / FK integrity sweep** — the dual `users`/`"Users"` table hazard (FKs must reference `"Users"`).
8. **Row counts on every feature table** — a 0-row table for a shipped feature is the "quiet, not broken" signature that caught gamification.

### Adversarial security
9. 🔬 **IDOR by execution, not enumeration.** Pick 10 high-value endpoints; drive each with user A's session against user B's resource id and assert the response. The predecessor's *static* IDOR sweep produced ~100 false positives and found nothing real.
10. **Role-escalation matrix** — for each of client/user/trainer/admin/owner, hit the other roles' endpoints and assert the deny.
11. **The `adminOnly` vs `ownerAdminOnly` boundary repo-wide** — §B is one instance; enumerate every destructive route and classify which gate it has.
12. **Rate-limit bypass** — are limiters keyed by IP where they should be keyed by user? (A messaging throttle was fixed this way earlier in the session.)
13. **Soft-delete leakage** — `paranoid: true` models: does any query path return soft-deleted rows?

### Docs & copy truth (Rule 75)
14. 🔬 **User-facing copy sweep** — this was the highest-yield doc vantage of the session (found "Our team has been notified" being false in two places, one on the money path). Sweep for copy that promises behaviour the code doesn't do. **Higher yield than sweeping code comments.**
15. **Every `README`/header in `backend/scripts/`** vs the script's actual flags (the branch has 3 commits fixing exactly this class).
16. **`ACTIVE-INDEX.md` + `CATALOG.md` freshness** — do their rows still resolve after this session's deletions? Rule 72: a row whose `source-SHA` doesn't match is STALE.

### Dead code / drift
17. **Commented-out mounts and "kept for compatibility" claims** — the exact lie class that opened this audit. Sweep `core/routes.mjs` and every router for comments contradicting the code.
18. **Test files whose subject is dead** — SWA-99 is one confirmed instance (a green test guarding unreachable code). Find the rest.
19. **Exports with zero importers** across `backend/services` and `backend/utils`.
20. **Frontend orphan re-check** — `FRONTEND-ORPHAN-INVENTORY-2026-07-28.md` classified 236 orphans and deleted ZERO. Re-verify a sample; some may now be genuinely deletable, others may have gained importers.

### Frontend / UX
21. **Responsive matrix on the surfaces this session touched** — `320/375/414/768/1024/1280/1440/1920/2560×1440/3840×2160`. `ClientOnboardingLaunchCard` and the onboarding wizard are new and unverified at phone width.
22. **Keyboard/focus + 44px targets** on the new onboarding entry card and wizard (Rule 2). A destructive-action gate being mouse-only was a real finding in a prior session.
23. **Loading / empty / error / stale-after-failure states** on the onboarding draft autosave (`useOnboardingDraft.ts`, 30-day TTL) — what happens when the draft is corrupt, or the TTL boundary is crossed mid-session?

### Meta
24. **Attack this handoff itself.** The predecessor's own artifacts were the single richest defect source (5 of 7 findings in rounds 1–9). Verify every claim in *this* document — the ground-truth table, the line numbers, the "proven strong" list. If a claim here is wrong, that is a finding.

---

## OPERATING RULES (condensed — full set in `CLAUDE.md`)

**Coordination (Rule 67) — other agents are editing this same tree right now.**
- At session start read `.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` + `review-queue.md`, then `node scripts/coordination-prune.mjs`.
- **Read-before-edit.** If your target is in the other agent's 🔒 EDITING NOW, pick something else.
- Claim your files in **your own** lane file. `claude.lane.md` belongs to a *different* Claude session — the predecessor used `claude-launch-audit.lane.md`. Use your own name.
- **Never `git add -A`** while the other agent has files locked. Stage explicit paths only.

**Git / deploy**
- **Rule 70 batch-push:** commit per slice locally (explicit paths), push ONCE at batch end → one Render deploy → one verification. Don't wait per push.
- **Rule 42 before ANY backend push — both commands, every time:**
  ```bash
  git ls-files --others --exclude-standard backend/   # untracked -> ERR_MODULE_NOT_FOUND at boot
  git diff --name-only HEAD backend/                  # modified-uncommitted -> missing-export crash
  ```
- **Rule 45:** no `--amend`, no rebase-to-polish, no force-push without Sean.
- The predecessor pushed via `git push origin HEAD:main` from worktree `c:/tmp/ss-launch-audit-20260727` (branch `claude/launch-audit-20260727`).

**Privacy**
- **Rule 8:** zero PII to LLMs — IDs and roles only.
- **Rule 59:** never `Read`/`Grep --content`/`cat` a `.env`-class file. Let `dotenv` load `DATABASE_URL` **inside** a script; never echo it. Use `output_mode: files_with_matches` or `count` for presence checks.
- **Rule 44:** secret-scan every doc/commit — `bash scripts/scan-secrets.sh <paths>`. A pre-commit hook also runs it on staged blobs.

**Closeout (fires every substantial turn)**
- **Hermes inbox (Rule 69):** write a privacy-safe memo to `.ai-workflow/hermes-inbox/pending/<UTC-YYYYMMDDThhmmssZ>-<surface>-<slug>.md`. One file per memo — never append to a shared file.
- **Learning packet (Rule 68):** ONLY for verified Fable-tier synthesis. **Your output is sub-Fable → quarantine, never the durable corpus.** Do not emit one.
- **Rule 57 dual-tier summary:** plain-English first (no paths/jargon), then technical (files, commits, tests, deferred).
- **Rule 60:** end every closeout with the next slice, or state that none remains.

---

## HARD-WON GOTCHAS — these cost the predecessor real time

- **`grep -c` exits 1 on zero matches** and silently truncates an `&&` chain. Two verification batches "passed" while having died mid-run. **Append `|| true`.**
- **Never edit backtick-bearing markdown through a bash heredoc** — the shell performs command substitution on the backticks and silently corrupts your text. Use the file-edit tool.
- **`git cat-file -e <ref>:<path>` inside an `&&`/`||` chain returned a false ABSENT** for a file `git ls-tree` listed. When two git queries disagree, resolve with `ls-tree` on the exact path, then read the blob by SHA.
- **Counts drift under you** — `main` moves continuously. Put the derivation command in the doc, not just the number.
- **A retry loop exited 0 while all 6 attempts failed.** Read the output; don't trust the exit code.
- **Windows junction hazard:** `git worktree remove --force` followed a junction and gutted the shared `backend/node_modules` (550→44 packages). **`rmdir` the junction BEFORE `git worktree remove`.**
- **`npm install` in `backend/` fails on Windows** — Linux-only `dcraw-vendored-linux` → EBADPLATFORM. Install to a scratch dir and copy in.
- **Probe DB from `backend/`** — `sequelize` is not resolvable from the repo root.
- **Postgres aborts the whole transaction after the first error** — one isolated rolled-back transaction PER assertion, plus a control probe.
- **The `.claude/settings.json` merge trap:** `main` carries a Hermes auto-closeout **command** hook (`5c2eb2f08`). If you reconcile that file, **keep main's version.**
- **Deleting a "dead" file: verify the mount, not the import.** A lazy `import()` declaration is NOT proof of mount; JSX usage is (Rule 26). The predecessor hardened a file with 41 tests before discovering its mount was commented out — Sean caught it.

---

## ⚠️ TREE TOPOLOGY — read this before any command

There are **two working trees**, and the gitignored operational files exist in only one of them. Sending yourself to the wrong one silently returns nothing.

| | Path | Branch | Holds |
| -- | -- | -- | -- |
| **Primary** (Sean's) | `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT` | `wip/comms-notifications-2026-07-05` (~1,240 behind main, 48 unlanded) | **the gitignored operational files** — coordination lanes, continuity log |
| **Worktree** (predecessor's) | `c:/tmp/ss-launch-audit-20260727` | `claude/launch-audit-20260727` (tracks main) | clean main-tracking tree; where the pushes came from |

**`[VERIFIED]` These exist ONLY in the primary tree** (gitignored → absent from the worktree, and that is correct, not broken):
`.ai-workflow/continuity/rolling-last-done.md` · `.ai-workflow/coordination/claude.lane.md` · `codex.lane.md` · `review-queue.md` · `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md`

**Recommended:** read coordination/continuity from the **primary** tree; do code work and push from a **main-tracking** tree (reuse the predecessor's worktree or make your own). Reading `main` truth from the primary tree will lie to you — it is ~1,240 commits behind.

⚠️ **Do NOT `git push` the primary tree's branch to main.** 48 unlanded commits, no fast-forward. Landing it is a deliberate reviewed operation (see the predecessor handoff §3/§5), and it may be another agent's live lane.

⚠️ **Windows junction hazard when creating/removing worktrees** — `rmdir` any `node_modules` junction BEFORE `git worktree remove`, or it follows the junction and guts the shared install (this happened: 550→44 packages).

---

## ORIENTATION — first 5 minutes

```bash
# 1. truth about what is deployed  (run from a MAIN-TRACKING tree)
git fetch origin main && git log origin/main --oneline -5

# 2. who else is working right now  (run from the PRIMARY tree — gitignored files live there)
cd c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT
cat .ai-workflow/coordination/*.lane.md .ai-workflow/coordination/review-queue.md
node scripts/coordination-prune.mjs

# 3. baseline BEFORE you touch anything (expect 23 failing across ~10 files)
cd backend && npm test 2>&1 | tail -20

# 4. confirm the three defects still exist (they may have been landed since)
#    NOTE: grep -c exits 1 on zero matches — the `|| true` is required
git show origin/main:backend/controllers/creditsController.mjs | grep -c trainerType || true   # 0 = §A live
git show origin/main:backend/routes/adminPackageRoutes.mjs | grep -c ownerAdminOnly || true    # 0 = §B live
git show origin/main:backend/models/FoodScanHistory.mjs | grep -c productName || true          # 0 = §C live
```

**Load order:** `CLAUDE.md` → `ACTIVE-INDEX.md` → `.ai-workflow/continuity/rolling-last-done.md` *(primary tree only)* → coordination lanes *(primary tree only)* → `BRANCH-PARITY-AND-UNLANDED-WORK-HANDOFF-2026-07-29.md` → this file.

**Before answering any "what did we decide / where is X / has this been done before" question,** grep the catalogs first rather than loading them (Rule 72):
```bash
rg "<topic>" docs/ai-workflow/CATALOG.md .ai-workflow/CATALOG.local.md
```
Rows are **pointers, never canon** — open the source file before acting on one. A row whose `source-SHA` no longer matches its file is STALE; regenerate with `node scripts/catalog-regen.mjs`.

**Has §A started costing money yet?** It had not as of 2026-07-29. Re-check before assuming back-pay is needed — from `backend/`, read-only:

```sql
SELECT "trainerType", COUNT(*) FROM "Users" WHERE role='trainer' GROUP BY 1;
SELECT COUNT(*), SUM(tc.gross_amount)
FROM trainer_commissions tc JOIN "Users" u ON u.id = tc.trainer_id
WHERE u."trainerType" = 'independent' AND tc.commission_rate_trainer < 85;
```

---

## DELIVERABLE

1. **A round ledger** — one line per round: number, vantage used, what it found (including "nothing"). A round with no new vantage doesn't count.
2. **Fixes** for everything found, each with current-session proof (Rule 74). Mutation-prove where feasible: revert the fix, confirm the test fails, restore.
3. **Linear comments** for Sean-gated findings — do not fix those.
4. **The literal marker** `DRY-LOOP: CLEAN×2 (rounds: N)` when dry.
5. **A Rule 57 dual-tier summary** — plain-English first, then technical.
6. **A Hermes inbox memo** (Rule 69). No learning packet (sub-Fable provenance).
7. **Rule 60 next-slice line.**

**If you go dry before 40, stop and say so.** Nine real fixes beat twenty padded ones. Sean's standing law: *no proof, no done.*

*IDs, paths and SHAs only. No PII, credentials, or customer data.*
