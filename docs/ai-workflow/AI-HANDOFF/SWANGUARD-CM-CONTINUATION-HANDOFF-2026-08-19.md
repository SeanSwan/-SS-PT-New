---
decision: Continuation handoff for the SwanGuard Creator Manager workstream and the SS-PT blast-radius guard hardening
status: open
supersedes: none
---

# SwanGuard — Continuation Handoff

**Date:** 2026-08-19 · **Outgoing agent:** Claude Opus 5 · **Linear:** SWA-70
**Hostile-reviewed by GLM-5.3 + Kimi K3 (both REVISE); findings applied — see §9.**

**Do §0 and §1 before you touch anything. In that order. They take four minutes.**

### Staleness legend
`🔒 STABLE` — decisions and laws; only change with Sean.
`⏳ PERISHABLE` — true at 2026-08-19, decays as soon as anyone works. **Re-derive, never quote.**
Everything in §1's table, `HEAD 64cb2f7`, "10 of 28 routes", "152 tables", and every video/subscriber count is `⏳`.

---

## 0. FIRST ACTIONS — do these before reading further

### 0.1 🔒 Snapshot the work. It is uncommitted in BOTH repos and one command from gone.

Every change from this session is uncommitted working-tree state, and **the SS-PT guard files are untracked (`??`) — not in git at all**, so there is no `git checkout` and no stash entry to recover them from.

**Do this first. It is non-destructive, needs no permission, and takes ten seconds.**

```bash
# 1. SwanGuard — capture tracked changes + copy untracked work
cd <HOME>/Desktop/SwanGuard-Newsroom
git diff > ../swanguard-backup-$(date +%Y%m%d-%H%M).patch
cp -r apps/web/src/creators ../swanguard-untracked-backup/creators
cp packages/database/migrations/0028_creator_catalog.sql ../swanguard-untracked-backup/

# 2. SS-PT — the guard files have NO git history; copying is the ONLY backup
cd <REPO>
mkdir -p ../ss-pt-guard-backup
cp scripts/hooks/db-blast-radius-gate.mjs scripts/lib/blast-radius-analyze.mjs \
   scripts/blast-radius-approve.mjs scripts/hooks/db-blast-radius-*.test.mjs \
   ../ss-pt-guard-backup/
cp -r .ai-workflow/blast-radius ../ss-pt-guard-backup/
```

Also untracked and therefore part of the same exposure — **and NOT copied by the commands above; copy them too**:

```bash
mkdir -p <HOME>/Desktop/ss-pt-guard-backup/exposure-set
cp "<HOME>/Desktop/Swan Guard.cmd"    "<HOME>/Desktop/Swan Guard.cmd.bak-20260817"    "<HOME>/Desktop/SwanGuard-Newsroom/config/owner-seed.json"    <HOME>/Desktop/ss-pt-guard-backup/exposure-set/
```

**Then:** never run `git clean -fd`, `git stash` (it does not save untracked files by default), `git reset --hard`, or `git checkout -- .` in either repo without Sean. Rule 45 applies with extra force — the guard files have no history to fall back on.

**Committing is Sean's call (§6).** The snapshot above is the interim mitigation so you are not carrying that risk while you wait.

### 0.2 ⏳ Re-run the baseline. If your numbers differ from §1, this document no longer describes your tree.

```bash
cd <HOME>/Desktop/SwanGuard-Newsroom/apps/web && npx vitest run
cd <HOME>/Desktop/SwanGuard-Newsroom/packages/database && npx vitest run
cd <HOME>/Desktop/SwanGuard-Newsroom && npm run type-check
cd <HOME>/Desktop/SwanGuard-Newsroom && npm run build -w @family-first/web
cd <HOME>/Desktop/SwanGuard-Newsroom && npm run test:scripts
cd <REPO> && node --test scripts/hooks/db-blast-radius-gate.test.mjs scripts/hooks/db-blast-radius-approval.test.mjs
```

**A mismatch is information, not an error** — someone worked after this was written. Reconcile before building; do not assume the doc is right.

### 0.3 🔒 The test runner will lie to you about your working directory

`vitest --root apps/web` moves vitest's root but **not `process.cwd()`**. Any test using `resolve('src/...')` then reads a nonexistent path and fails for no reason. **This produced two false failure reports in one session.** Always `cd` into the workspace, as in §0.2 — never `--root` from the repo root.

**Tests do not type-check.** A widened union type passed 66/66 while the build was broken. Tests, type-check, and build are three independent pieces of evidence.

### 0.4 🔒 Two repos, two applications

SwanGuard is **not** SwanStudios. Separate app, separate database (Postgres on **:5434**), separate migrations. The blast-radius guard lives in SS-PT and hooks **every** tool call, including ones targeting SwanGuard — see §5.1 for how to tell a correct block from a false one.

---

## 1. State at handoff ⏳ — every number bound to its command

Re-derive with §0.2. Quoting these without re-running is the mistake this table exists to prevent.

| Surface | Result at 2026-08-19 | Command |
|---|---|---|
| SwanGuard web suite | 361 passed / 8 skipped | `cd apps/web && npx vitest run` |
| SwanGuard database suite | 76 / 76 | `cd packages/database && npx vitest run` |
| SwanGuard api suite | 399 passed / 1 **pre-existing** fail / 3 skipped | `cd apps/api && npx vitest run` |
| Creator catalog live (routes + Postgres) | 9 / 9 | `SWANGUARD_ALLOW_POSTGRES_SMOKE=true DATABASE_URL=<dev> npx vitest run src/postgresCreatorCatalog.test.ts` |
| Type-check (5 workspaces) | 0 errors | `npm run type-check` |
| Build + bundle budget | passes | `npm run build -w @family-first/web` |
| Root scripts suite | 138 / 138 | `npm run test:scripts` |
| **Root `npm test` (all workspaces)** | **RED — 1 pre-existing failure in `apps/api`, see §10** | `npm test` |
| Creator-law probe (opt-in, live DB) | 4/4 refused | `npm run smoke:creator-law:postgres` (see §2.1) |
| SS-PT guard suite | 38 / 38 | `node --test scripts/hooks/db-blast-radius-{gate,approval}.test.mjs` |
| SwanGuard branch / HEAD | `codex/swanguard-newsroom-recovery-20260801` @ `64cb2f7` | `git status -sb && git log --oneline -1` |

**HEAD goes stale the moment anyone commits — including when Sean executes §6's commit decision, which silently invalidates §0.1's recovery instructions. Re-check it.**

### What was verified THIS session vs. what is remembered

| Claim | Status |
|---|---|
| Test/type-check/build figures above | ✅ **verified this session** |
| Migration 0028 applied to live Postgres (`applied 1, skipped 27`) | ✅ **verified this session** |
| Default-off law refuses 4 attack classes on live Postgres | ✅ **verified this session** — but **no committed reproduction script exists.** See §2.1. |
| YouTube + Twitch credentials work | ✅ verified this session — **but keys expire and quotas reset. Re-run `node scripts/verify-creator-keys.mjs` before trusting it.** |
| `Swan Guard.cmd` boots the full live path | ✅ verified this session, end to end from cold |
| Creator Manager reachable as a 4th tab | ✅ verified by test; **not** verified by a human opening a browser |

**Known residue:** the four-attack verification created and then deleted test rows (`yt:TEST`, `yt:EVIL`); final state was `creators remaining: 0`. If you find rows in `creator`, someone worked after this doc.

---

## 2. The laws 🔒 — do not relax without Sean

1. **Default-off is absolute.** Every creator is born disabled. Only the owner enables, only via `enable_creator()` / `CreatorService.enable()`, and only with an owner-attributed audit event **in the same transaction**. Enforced by DB trigger, not by discipline.
2. **Anything that shapes the feed FILTERS the enabled set; nothing except the owner WRITES to it.** Snooze is a read-time `snooze_until` filter — expiry writes nothing. Profiles are **lenses**: `feed = enabled ∩ profile`, so a lens can only subtract. Both were law-violating bulk-enable paths in the first draft.
3. **Never fabricate to fill a gap.** Empty lanes say they are empty. A failed write never renders as success.
4. **Legal-only acquisition.** Official APIs, publisher RSS, owner-authenticated OAuth. No scraping. Headline + snippet + link-out; never republished bodies.
5. **Evidence, not scores.** Suggested creators show *why*. An opaque confidence float is the algorithm-smell this app exists to escape.
6. **A correct block is answered by fixing the input, never by spending an approval.**

### 2.1 ✅ The law's proof is now a committed, executable probe

*(Was: "no committed reproduction — reproduce it yourself." Closed 2026-08-19.)*

```bash
cd <HOME>/Desktop/SwanGuard-Newsroom
docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d
SWANGUARD_ALLOW_POSTGRES_SMOKE=true DATABASE_URL=<dev connection string>   npm run smoke:creator-law:postgres
```

Dev credentials live in `docker-compose.dev.yml` and are deliberately not restated here.

**It proves four attack classes, not two.** The earlier inline probe covered
`direct-update` and `wrong-actor` only, while §1 claimed four — so the document's
strongest claim was also its least supported. The committed probe adds:

| Attack | What it models | Guard |
|---|---|---|
| `born-enabled` | poisoned seed / upsert echo inserting an already-enabled creator | `creator_reject_enabled_insert` |
| `direct-update` | ORM write or hand-run SQL flipping the flag | `creator_enforce_owner_enable` |
| `wrong-actor` | automation calling the sanctioned route as `system` | `enable_creator` |
| `stale-owner-event` | owner event committed in an EARLIER transaction, enable attempted later | the trigger's `e.at >= transaction_timestamp()` clause |

`stale-owner-event` is the one no text-matching test can reach, and the reason that
clause exists. The probe asserts its own precondition — that the stale event really
landed — because it raises the *same message* as `direct-update`, so a missing
precondition would score a fourth refusal while covering three.

**Reading the result.** A returned result IS the proof; a breach throws. There is no
`lawHolds: false` to forget to check. On success you get
`law upheld: 4/4 attack classes refused` and `creators remaining=0`.

**What the probe does NOT prove.** That it correctly reports a breach *against a live
broken database*. Demonstrating that would mean dropping a trigger on the dev DB —
destructive DDL, and exactly what the blast-radius guard exists to stop. The breach
paths are proven against a fake client in `scripts/postgres-creator-law-smoke.test.mjs`
(19 tests), and both new guards were mutation-tested: remove either, exactly the
matching test(s) fail. Fake proves the probe can *report*; live proves the DB
*refuses*. Neither substitutes for the other.

**Note on unbounded SQL.** An unbounded `update creator set enabled = true;` is
correctly refused by the blast-radius guard. Fix the SQL; do not spend an approval on
genuinely destructive input.

---

## 3. What exists and works

- **Live path.** `Swan Guard.cmd` boots backend mode + dev Postgres, applies migrations, opens the app. Demo is `--demo`. Original preserved at `Swan Guard.cmd.bak-20260817` *(also untracked — see §0.1)*.
- **Credentials.** YouTube Data API v3 + Twitch Helix. `node scripts/verify-creator-keys.mjs` prints presence and the API verdict, **never** the key. `.env` gitignored; `.env.example` is the template.
- **Creator catalog.** 51 follows — 40 YouTube channels, 5 Twitch channels, 6 Twitch game categories — resolved against live APIs into `config/owner-seed.json`, **all `enabled:false`**.
- **Creator Manager (CM2)** as a fourth Newsroom tab, gated on a wired `CreatorService`.

**Not yet true:** the Feed renders an honest empty state because the outlet registry is empty (§4.3). Creator on/off does **not** survive a reload — the service is in-memory (§4.2).

---

## 4. Recommended slice order

**Reordered after hostile review.** The outgoing agent originally put the HTTP service first; both reviewers called that a *product* argument, not a *handoff-sequencing* one. Opening a new persistence layer on an uncommitted tree, before you have calibrated against the repo, is the highest-risk possible first move.

### 4.0 FIRST — one small, high-trust item to calibrate

Pick either. Both retire an explicit debt, both finish in one session, both teach you the repo's shape before you write anything large.

- ~~**(a) Commit the §2.1 probe as an integration test.**~~ **DONE 2026-08-19** — `scripts/postgres-creator-law-smoke.mjs` + 19-test unit suite, wired as `npm run smoke:creator-law:postgres`. See §2.1.
- **(b) Approval `be60fd2c92e5bc61`** — text-only fix to the guard's overclaiming deny message. Change request is written; Sean runs one command.
- **(c) The H0.5 owed test** — exercise the operator-reachable enablement path through the *service*, not `store.setOwnerEnabled`. Sean is owed this one (§6).

### 4.1 ✅ DONE 2026-08-20 — HTTP creator service (toggles are durable)

**Why it matters:** it is the last untrue thing on a shipped screen. The catalog is real; on/off evaporates on reload, and the UI currently has to *apologise* for that via `CREATOR_NOTE` in `RootApp.tsx`.

**Built:** `apps/api/src/creatorCatalog.ts` (store contract + memory impl) · `postgresCreatorCatalog.ts` (durable impl; `enable` delegates to `enable_creator()`) · `creatorCatalogRoutes.ts` (owner-gated `/api/creators*`) · `apps/web/src/creators/httpCreatorService.ts` · wired through `featureStores` / `featureDispatchOwnerOperator` / `runtime`.

**Gates, and how each was actually met:**
- *A toggle survives a reload* — proven end to end: a real HTTP request through the real routes over the real Postgres store, then a **raw** `select enabled` that trusts neither the route's response nor the store's return value.
- *The API refuses a non-owner actor with the DB's own error* — met, plus the part the gate did not name: **the actor is derived from the session, never the request body.** The database can only check the string it is handed, so a body-supplied actor would have left its check decorative. A test posts `{"actor":"system"}` and asserts the event is still attributed to the owner; mutation-tested.
- *Delete `CREATOR_NOTE`* — **deliberately not done as written.** Demo mode has no backend, so its toggles genuinely do not persist; deleting the note everywhere would trade one dishonest screen for another. Backend mode drops it, demo keeps a reworded one. The note was a true statement, not a TODO marker.

**Known gaps (disclosed, not fixed):** feed profiles / categories / app settings have `0028` tables but no routes — the HTTP service refuses those writes loudly rather than no-opping. `RootApp.tsx` mode wiring is type-checked and builds but has no behavioural test; there is no `RootApp.test.tsx` in the repo.

### 4.2 THEN — CM3, per-creator controls

Daily cap, duration floor/ceiling, keyword mute, priority, Shorts/live/premieres. Fields already exist in migration 0028 and `types.ts`. `CreatorSettingsPatch` deliberately **omits `enabled`** and `updateSettings` strips it at runtime — keep both.

**Why caps matter:** the catalog spans ~160k videos ⏳. The two largest channels carry ~24k each; the smallest ~400. Without caps the loud channels erase the quiet ones. *(Re-derive counts from `config/owner-seed.json`; do not quote these.)*

### 4.3 THEN — seed real news sources (H0.5 → S2/S3)

The registry is empty, which is why the Feed is blank. Remaining criteria: `docs/266-h0-5-hostile-review-corrected-acceptance-matrix.md`. Criterion 4 was **restated by Sean's decision**, recorded in §A of that doc — read §A before touching it; the restatement narrowed what must be proven but did **not** waive the owed test. Sean's locality for T1 local: **Anaheim Hills / Orange County / CA**.

### 4.4 Queued
**CM5 discovery** (bounded, owner-triggered, candidates land `suggested` + disabled with transparent evidence and durable `dismissedAt`) · **presence-gated approvals** (Sean approved; outgoing agent recommended deferring until bypass paths are closed — see §5.3).

---

## 5. Traps this session paid for

### 5.1 The blast-radius guard is repo-blind by default — and here is how to diagnose a block

It validates against SS-PT's `backend/schema-snapshot.json` (~152 tables ⏳, from `backend/models/*.mjs`). SwanGuard tables are not in it and never will be. Class B (referential drift) now abstains for files outside the snapshot's repo; classes A/C/D remain universal.

**When you are blocked, the denial message names the class. Read it before assuming:**
- **Class A (destructive) / C (unbounded)** → almost certainly a **correct block**. Fix your SQL.
- **Class B (referential drift) on a SwanGuard file** → suspect the gate. Confirm with:
  ```bash
  cd <REPO>
  node -e "const s=require('./backend/schema-snapshot.json');console.log('tables:',Object.keys(s.tables).length,'| has your table?',Object.keys(s.tables).includes('YOUR_TABLE'))"
  ```
- **Class S (guard self-modification)** → correct and intentional. Write a change request, do not route around it.

The gate is `scripts/hooks/db-blast-radius-gate.mjs`, registered in `.claude/settings.json` (itself now protected).

### 5.2 A guard's dominant failure mode is crying wolf
Fixing it introduced a hole caught only by the guard's **own** suite. When you modify a system that has tests, **its** suite is the acceptance bar — yours shares your blind spot by construction. Run the incumbent tests **before** writing your own, so you can state an honest bar instead of guessing a number.

### 5.3 The approval system is accident-proof, not tamper-proof
Read `docs/ai-workflow/references/APPROVAL-SECURITY-MODEL.md` before touching it. Against an agent with shell access as the key-owning user, **prevention is impossible** — that needs an OS boundary (separate UID / sandbox), not more patterns. A number of approval-directory write routes remain open **by design** ⏳ (both reviewers ruled patching them blocklist theatre; **re-derive the current count, do not quote it**). Never restate the claim that nothing the agent runs can mint an approval — it is false.

### 5.4 Reviewer output is a hypothesis
Both external reviewers produced excellent findings **and** verifiable errors: one claimed a YouTube API part was deprecated (it is not — verified live), one claimed the native Write tool bypassed the approval directory (it does not). One fabricated a "consolidated GLM + Kimi" header while GLM had not returned. **Verify before acting.** A wrong hypothesis aimed at the right layer is still valuable — testing the false Write-tool claim is what uncovered the unprotected `.claude/settings.json`.

---

## 6. Owner-owed items

| Item | Detail |
|---|---|
| **Approval `be60fd2c92e5bc61`** | Text-only fix to the guard's overclaiming deny message. Request written; Sean runs one command. |
| **Commit decision** | Everything uncommitted in both repos (§0.1). Sean decides when and how. **Snapshot first regardless.** |
| **H0.5 criterion 4 owed test** | Restatement was Sean's call; the operator-path test remains owed. |
| **Presence-gated approvals** | Sean approved; outgoing agent recommended deferring until bypass paths close. Queued, not dropped. |

---

## 7. Key file map

| Path | What |
|---|---|
| `config/owner-seed.json` | The 51 follows, all disabled. Catalog source of truth. |
| `packages/database/migrations/0028_creator_catalog.sql` | Schema + both triggers + `enable_creator()`. **The law lives here.** |
| `apps/web/src/creators/creatorService.ts` | `CreatorService` interface + in-memory impl. Implement HTTP against this. |
| `apps/web/src/creators/CreatorManager.tsx` | CM2 screen. Never assigns `enabled`. |
| `apps/web/src/newsroom/sectionRegistry.tsx` | Tab config; `gate` controls visibility. |
| `scripts/verify-creator-keys.mjs` | Credential check that never prints a key. |
| `docs/SWANGUARD-SUPER-HUB-MASTER-PROMPT-v3-2026-08-17.md` | Governing product plan (v3 supersedes v2). |
| `docs/SWANGUARD-CREATOR-MANAGER-BLUEPRINT-2026-08-18.md` | CM blueprint + panel adjudication. |
| `docs/ai-workflow/references/APPROVAL-SECURITY-MODEL.md` *(SS-PT)* | Honest security model. Read before touching the guard. |

---

## 8. Working agreements Sean expects 🔒

- **Proof, not assertion.** No "done/fixed/passing" without current-session evidence in the same message. Mutation-test any assertion guarding an invariant — break the rule, confirm exactly one test fails, revert.
- **Hostile review until dry**, then one confirming round.
- **Plain-English summary first**, technical second.
- **Every command handed to Sean ships with its `cd`.** Three failed for want of one.
- **Board sync is unprompted** — update SWA-70 without being asked.
- **Say what you did NOT do.** Sean values a named gap over a smooth omission.
- **State an acceptance bar only after measuring the baseline.** A bar quoted without measurement is a guess wearing a number.

---

## 9. What this handoff got wrong (applied from hostile review)

Recorded because the next reviewer should know which parts were weakest.

| Finding | Fix |
|---|---|
| **Warned that work could be destroyed, gave no interim mitigation** (Kimi B1) — told the reader it was one accident from annihilation, that only Sean could commit, and then nothing. A "don't" with no "do". | §0.1 now leads with non-destructive snapshot commands. |
| **State table was unverifiable** (both, B2/B1) — numbers with no bound commands and no "re-run first" instruction, violating the doc's own §8 law. | §1 binds every figure to its command; §0.2 makes re-running the first action. |
| **The law's live-DB proof had no reproduction** (GLM B2) — the strongest claim rested on a transcript. | §2.1 adds a runnable probe and flags committing it as a candidate first slice. |
| **Slice order was a product argument, not a sequencing one** (Kimi M1) | §4.0 inserts a small calibration slice before the HTTP service. |
| **Cross-repo warning asserted, not operationalised** (Kimi M2) | §5.1 adds a correct-vs-false block diagnostic. |
| **Decorative precision that will drift** (Kimi M3) | Staleness legend added; perishable figures marked `⏳` and softened to "re-derive, do not quote". |
| **"What works" mixed verified with remembered** (Kimi M4) | §1 splits them explicitly. |
| **No staleness legend; HEAD invalidates §0.1 once Sean commits** (Kimi m1) | Legend added; the HEAD trap called out inline. |
| **`.bak` file cited as reassurance while itself untracked** (Kimi m2) | Now listed in §0.1's exposure set. |

---

## 10. What the CONTINUATION session found (2026-08-19, second agent)

The incoming agent ran §0.1 and §0.2 as written, then took §4.0(a). Recorded here on the
same principle as §9: the next reviewer should know which parts were still weak after the
first hostile pass.

| Finding | Severity | Fix |
|---|---|---|
| **The repo's own root `npm test` was RED and the handoff never ran it.** `scripts/postgres-migration-runner.test.mjs` hardcodes migrations `0001`–`0027`; the CM workstream added `0028` without updating it. §1's five baseline commands did not include `npm run test:scripts`, so a green baseline was reported over a red suite. | HIGH | Test updated to expect `0028` + a name assertion added. §0.2 and §1 now include `test:scripts`. |
| **Migration `0028` collides with a reservation.** `docs/11-slice-registry.md` reserved `0028` for batch graduation (H2.5). CM took it, and it is already applied to the live dev DB, so it cannot be cheaply renumbered. | HIGH | Recorded in the registry with `0030` **proposed** for H2.5. **Resolution owed to Sean** — an agent building H2.5 must confirm, not assume. |
| **The whole CM chain was absent from the slice registry**, which SwanGuard's own slice-close rule requires. That absence is what let the `0028` collision happen unseen. | HIGH | CM1/CM2/CM3/CM5 + the probe recorded retroactively, flagged as reconstructed-from-working-tree, not from commits. |
| **§1 claimed the law refuses 4 attack classes; §2.1's probe exercised 2.** The document's strongest claim was also its least supported — the same defect GLM caught, one layer down. | MEDIUM | The committed probe covers all four, including `stale-owner-event`, which no text-matching test can reach. |
| **§0.1's snapshot commands did not copy the three files §0.1 itself names** as part of the same exposure. A "do this first" block that omits part of its own exposure set is the §9 Kimi-B1 defect in miniature. | MEDIUM | Commands added. |
| **`npm test` is RED in `apps/api` too, and the baseline never ran that either.** `src/civicOfficialSourcesRoutes.test.ts` → "returns nothing while gated…" gets `items: []` where it expects one Federal Register record. **NOT caused by this session** — `apps/api/src` has zero imports from `scripts/`, and the continuation agent's entire change set is four files under `scripts/` plus one npm script name. Every modified `apps/api` file was already modified at snapshot time. | HIGH | **NOT FIXED — deliberately out of scope.** It sits in the officialConnector/civic lane, not the creator lane, and diagnosing another agent's uncommitted work in a different feature area is how a calibration slice turns into an unbounded one. Recorded so the next agent inherits a known-red baseline instead of discovering it. |
| **§1 said type-check covers 4 workspaces; it covers 5** (api, web, contracts, database, domain). SwanGuard's own `CLAUDE.md` §5 already said five. | LOW | Corrected. |

### Mistakes the continuation agent made

- **Built a fake client less faithful than the real driver.** It matched refusals against
  SQL text, but `pg` sends the actor as a bound parameter — `select enable_creator($1,$2,$3)`
  contains no literal `'system'`. Six tests failed for a reason that had nothing to do with
  the code under test. A fake that is weaker than the driver tests the fake.
- **First probe design collected breaches instead of stopping at one.** Because the trigger
  fires only on a `false→true` transition, every attack after a successful one also
  "succeeds" — so the collected report would have named one real breach and a train of
  cascade artifacts. Caught by a failing test, not by review; the test was right and the
  design was wrong. Changed to fail-fast.
- **Nearly shipped a vacuous attack.** `stale-owner-event` raises the *same message* as
  `direct-update`. Had its precondition silently not landed, it would have scored a fourth
  refusal while covering three — a test that cannot fail. Now asserts its own setup.
- **Restated the dev database password** in a doc comment and used the real one as a test
  fixture, when the compose file already holds it and a synthetic value proves redaction
  equally well. A credential in two files gets rotated in one.

