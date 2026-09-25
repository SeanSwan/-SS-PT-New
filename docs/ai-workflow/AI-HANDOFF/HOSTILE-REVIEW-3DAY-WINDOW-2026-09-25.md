# Hostile Review — 3-Day Commit Window (2026-09-21 to 2026-09-24)

**Filed:** 2026-09-25 by the vs-claude seat (ZCode / GLM-5.3-Flash), at Sean's request.
**Scope:** all 67 commits from `e195d6ede` (09-21 09:43) through `dd4809786` (09-24 14:31) — 2,199 files, +535,859 / -18,032 lines vs the incident floor `4c93db148`.
**Method:** five parallel read-only review passes (rescue commits G1-G9; creator-brains engine/console; redaction/privacy rounds 9b-9d; spotlight/migrations/tooling guards; cross-cutting secret/docs/tree sweeps), each doing real diff-level review with file:line evidence, plus live-probe testing of the redaction engine. Verification followed on the four pre-main fixes (see §5).
**Overall verdict at review time:** REVISE — do not merge to main until the four pre-main blockers landed. They have now landed (§5). The remaining majors (§3) are next.

---

## 1. Pre-main blockers — ALL FIXED 2026-09-25

1. **Fresh clones could not make their first commit.** `config/ai-egress-policy.json` was untracked while the committed `.githooks/pre-commit` runs `scripts/qa/ai-egress-audit.mjs:16-17` (bare `JSON.parse(readFileSync(...))`). The G9 review record's "ai-egress-audit CLEAN" row was a working-tree-dependent fact, false of the committed tree. The only commit that ever touched the policy (`8b6855c96`) was on no branch. **FIXED** `d4082e9aa` — policy committed (read first; policy-only content, zero secrets).
2. **Migration skip-guards left a permanently incomplete schema on from-empty rebuilds.** `05fc32b99` guarded five add-migrations to skip on absent tables, but `20250305000000-create-sessions.cjs` omitted the four cancellation-charge columns and `20260308-create-gallery-tables.cjs` omitted `enhancement_credits` / `is_vip` / `free_enhancements_used` / `user_id`; nothing healed the gap at boot, and the CI shadow seeder (all-attribute INSERTs, exit 1 on failure) would run red on every PR. The G9 before-main review did not check the create-table contents — its central blind spot. **FIXED** `26c4fc3c3` — columns folded into the create-tables, `20260308-add-enhancement-credits` made per-column idempotent and transactional, every `down()` guarded against absent tables (six files). `user_id` is folded WITHOUT its FK: the FK targets `"Users"`, which no migration creates (schema-authority debt M-02); a hard FK in the create-table would have killed the from-empty chain outright. The FK-bearing addColumn remains in `20260308-add-gallery-visitor-user-link` for databases that predate the fold.
3. **13.5 MB of generated esbuild bundles committed as "evidence"** under `docs/ai-workflow/AI-HANDOFF/swan-logo-3d-2026-09-18/evidence/` (logo-bundle.js 53K lines, component-bundle.js 46K, blit-bundle.js 20K, bundle.js 20K, swan-mark.spec.json 20K). **FIXED** `6cd3ea72f` — five files removed from tracking; nested `.gitignore` prevents regeneration via blanket `git add`; receipts and screenshots beside them stay.
4. **`.githooks/pre-commit` mode flipped 100755 -> 100644** in `05fc32b99`, undisclosed — silently dead guard chain on any POSIX checkout using `core.hooksPath`. **FIXED** `d9f12a916` — `git update-index --chmod=+x` (the index is the carrier; Windows worktree filemode is not meaningful).
5. (Cheap pre-main, also fixed) `backend/package.json` `test:security` referenced `tests/unit/htmlEscapeContract.test.mjs`, which did not exist anywhere — the script could not run. **FIXED** `6bacf9041` — contract test written and green; `test:security` now runs 101/101 (27 ratchet + 37 templateBindings + 26 emailUrlPolicy + 11 contract).

## 2. The eight majors — ALL FIXED 2026-09-25 (commits `6c9f15490..8509b2f39`, pushed)

1. **Console repair 200-on-failure** — FIXED `6c9f15490`: an `ok:false` record now throws `ApiError(REFUSED)` carrying the engine's note; the adapter maps it onto the existing repair-error alert. Three new cases; console suite 358/358.
2. **Daily-run release discards the boolean** — FIXED `0761650fc`: `withOwnership` goes through `releaseStore` (retried); exhaustion surfaces as `record.releaseFailed` + stderr; `withLock` reports too. `lock-release.mjs` docblock names the fifth site. Engine suite 235/235 (the consistency gate caught my first draft pushing `lock.mjs` to 304 lines — fixed to exactly 300).
3. **Creator-add late-reply straddle** — FIXED `b6030a83d`: the handler drops settled replies. The deterministic test pins the invariant; on Node v24 `port.close()` drops post-close messages, so the guard-less mutant SURVIVES HERE — recorded honestly in the test header; the guard is version-proof insurance. Console 358/358.
4. **Keyed-id redaction gap** — FIXED `9eb93e6b2`: rows accept any id-suffixed key plus bare `chat` (32-char prefix bound); family marker moved to the class expression; R9-E5b pins 10 leak shapes + 3 over-refusal guards; rows 262/262, egress 83/83, roundtrip green; all five review probes now redact.
5. **Photo-number race** — FIXED `ac2e13a90`: `createPhotoWithRacingNumber` re-numbers the row on 23505 and retries (bounded), keeping the uploaded keys; all three create sites wired; allocation docblock now states the reservation is a hint. 4/4 constructed interleavings.
6. **Socket revocation bypass** — FIXED `bbfb7a1a1`: socket auth consults `isAccessTokenRevoked` after verify+family, before the DB fetch; structural pin per the repo's socket-suite convention; socket suites 21/21.
7. **Import-closure guard wired to nothing** — FIXED `8509b2f39`: runs `--staged` in pre-commit and blocks; verified exit 0 on the tree before wiring.
8. **`selectedClientName` hole** — FIXED `d18cc8e91`: the drop is unconditional; six boundary cases; 6/6.

Baseline disclosure (rule 56): the backend unit suite at this pass is 4000/4008 with 8 failures in 5 files (awardWorkoutXP, clientSelfServiceCommandDispatcherContract, coachActionProposalClarificationApprovalService, +2) — mock-expectation drift with ZERO import linkage to this slice's files (verified by grep). These are pre-existing branch noise, slice-clean not baseline-clean.

## 3. Clean bills (attacked, held)

- Zero secrets in ~460K added lines across all 67 commits (synthetic canaries/fixtures only); render.yaml pins all `sync: false`. [VERIFIED]
- Image-admission hardening fail-closed at every layer: https-only, allowlist-first IPv6, pinned-dispatcher DNS (rebinding closed), `redirect: 'error'`, single fetch-to-decode. Residual: no port restriction (blind-probe class, minor). [VERIFIED]
- Redaction canary is fail-closed (runtime tamper probes blocked at the transport); row-deletion drift is caught by the test-time inventory, not the socket — documented split. [VERIFIED]
- Creator-brains lock-safety core: no double-acquire, no lost-mutex; reclaim fail-closed to the exclusive-create gate. [VERIFIED]
- Old `scripts/creator-brains/console` deletion left zero dangling references. [VERIFIED]
- Fresh-clone untracked-imports count is 0 (the "70" class fully closed by d5a268974 + b1ab001bd + rescues). [VERIFIED]
- Frontend rescue (G4) clean on rules 4/6/43. Migration SQL: no injection, no Users/users casing hazard; N-1 acceptance gate fail-closed with negative self-test. [VERIFIED]

## 4. The `git gc` schedule question — ANSWERED (2026-09-25)

Incident file §10.2 / §5.1 asked whether a scheduled `git gc`/repack exists on this machine. Findings:

- **No Windows scheduled task** matching git or maintenance exists (full `schtasks /query` sweep: 0 matches). **No `git maintenance` registration**, no global `gc.*`/`maintenance.*` config.
- **The repo already disables auto-gc**: `gc.auto=0`, `gc.autodetach=false`, `maintenance.auto=false` (someone set this deliberately post-incident).
- **But the object store carries the race's physical residue: 681 garbage tmp entries (~6.6 MB)** — 679 `tmp_obj_*` files across `.git/objects/XX/` plus `tmp_pack_*`/`tmp_idx_*` in `.git/objects/pack/`. These are writes interrupted mid-flight, exactly consistent with the incident §4 concurrent-writers mechanism (racing repack/index writes from multiple agent sessions), and NOT with a scheduled job. The debris is inert (never referenced) but pollutes `git count-objects`; **do not prune** — the incident rules forbid `git gc`/`git prune` until Sean decides, and freeable residue is not worth breaking that boundary.
- **Net answer:** nothing scheduled will do this again; what will do it again is uncoordinated concurrent git processes. The standing mitigations (rule 12 emergency block, gc.auto=0, GIT_INDEX_FILE plumbing) address the mechanism; the tmp debris is its fingerprint and can be catalogued as the baseline for detecting the next race.

## 5. Verification evidence for the fixes

- `backend` vitest: htmlEscapeContract 11/11, migrationGuardTableNames 5/5 (register still exact — no new violations), orientationMigrationGuard 5/5. [run 2026-09-25]
- `npm run test:security`: 101/101 across all four files (first complete run of that script). [VERIFIED]
- All six edited migrations `node --check` clean. [VERIFIED]
- From-empty chain: a live run was attempted via a scratch-database launcher and **correctly refused** — `DATABASE_URL` resolves to the remote Render production DB (`dpg-...oregon-postgres.render.com`), and the check only ever runs against a local throwaway instance. The from-empty completeness now rests on: definitions byte-identical to the add-migrations + guard tests green + the CI shadow workflow (the designed end-to-end verifier) on next run. Residual stated honestly: no local from-empty Postgres run was executed.
- Commits: `26c4fc3c3` (migrations), `d4082e9aa` (policy), `d9f12a916` (exec bit), `6cd3ea72f` (bundles), `6bacf9041` (contract test). All staged by explicit path; a foreign staged deletion of `G9-BEFORE-MAIN-REVIEW-2026-09-24.md` was found in the shared index and unstaged untouched (worktree state preserved for whichever seat owns it).

## 6. Still open beyond this window (carry-forward)

- `PANEL-GLM-STATION-CREDENTIALS-2026-08-20.md` — untracked, unignored, credentials-named; inspect + relocate/ignore (not opened, rule 59).
- 741 porcelain-untracked entries (~68K expanded), `.codex-direction-a-link` junction polluting every census; four orphaned worktrees under `.claude/worktrees/` need a content-diff before anyone calls them junk.
- The bcrypt-on-Node-22 first-deploy watch item has no owner/trigger outside the G9 review doc.
- The overlay landing proof (8a675ab96) remains honestly UNVERIFIED, unreproduced; the ops-wave receipt partially supersedes it.
- Query-redaction `userToken` dead entry (`core/middleware/index.mjs:25` vs `:49`); `compare-keys.mjs` prints partial live Stripe key material (local-only); Z:\HostileReviews tooling unversioned; orphaned R2 objects have no GC sweep; socket/revoke and the §2 majors above.
