# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/swanguard-glm-buildpacket.md
**Tokens:** 7212 in / 38784 out (reasoning: 27784) | total 45996
**Wall:** 751.3s

---

# SwanGuard — Increment Blueprint `INC-S1+V2+V3+S2h`

**Scope (fixed, do not re-derive):** ship the owner console inside `RootApp` (S1) + close the orphan door and reap existing orphans (V2) + move kill-switch catalog seeding into a migration so reads literally never write (V3) + the buildable half of S2: `feed_set_hash`/`feed_set_urls` binding with migration backfill for the existing 39.

**Repo facts (authoritative):** `merge/newsroom-mainline-v3` @ `745867e` · monorepo `apps/api`, `apps/web`, `packages/{contracts,database,domain}` · next migration = **0030** · dev DB `docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d` (Postgres port 5434) · `apps/api` esbuild is Linux-ELF → **the entire protocol runs on radar, never on the Windows checkout**.

**Builder:** Qwen 3.8. You make **zero** decisions. Every fact you lack is captured in the Step 0 fact table; every fact that cannot be captured is a **STOP condition**. When in doubt: STOP and write `STOP-REPORT.md`. Never guess.

---

## 0. Resolved decisions (the "choose X or Y" list — all pre-decided)

| # | Question | Resolution | One-line reason |
|---|---|---|---|
| D1 | Router for `/owner` | **Hash routing** via a new 30-line module; **no** `react-router-dom` | Zero new deps; static serve on radar needs no SPA fallback; canonical operator URL `/#/owner/outlets` |
| D2 | Store hash or URL set? | **Both**: `feed_set_urls text[]` (enforceable membership) + `feed_set_hash` (signed fingerprint shown in console) | A hash alone cannot answer "is this outlet in the set" without the set |
| D3 | One migration or several | **One**: `0030_owner_gate_hardening.sql`, four lettered sections | Atomic ordering (backfill before gate code, seed before read-path edit); number fixed at 0030 |
| D4 | Runtime orphan reaper? | **No** — reaper lives in migration 0030 only | Law 5: steady-state reads write nothing; the V2 gate prevents new orphans |
| D5 | Gate the disable path with licence checks? | **Never** | A gate that traps an already-enabled outlet is worse than the hole it closes (matches `ca49041` posture) |
| D6 | Families with `NULL feed_set_urls` | Gate **not enforced** for them | Inventing sets for unseen families is a silent policy change; they get their own slice |
| D7 | `feed_set_hash` NOT NULL? | Nullable at DB, shape-checked; enforced app-side for the news lane | Other families' approval rows are not backfilled |
| D8 | Console chunk | **Lazy** via `React.lazy`; markers pinned with `globalThis` side-effect | S1 spec; survives minification; ledger can assert entry/lazy split |
| D9 | `ownerConsoleApiRuntime` default | **Http** unless `MODE==='test'` or `VITE_OWNER_CONSOLE_DEMO==='1'` | The console must be real in production; Demo stays for tests |
| D10 | V2 code edit | **Conditional on live probe** — S0 may already have landed the 404 gate | Both branches fully specified in Step 3; never refactor working code |
| D11 | Fresh-env proof | **Scratch** Postgres container on port 5435 | Never wipe the dev DB |
| D12 | e2e outlet choice | Deterministic SQL pick, reverted after evidence | Reproducible artifact |
| D13 | Serving on radar | `python3 -m http.server` bound to the tailscale IP, in `tmux`, non-sudo | No new deps, no sudo; systemd `--user` + linger needs one sudo from Sean — queued, not Qwen's |
| D14 | `lifecycle`/V1 | **Untouched** this increment; it is display metadata; no copy may call it a gate | Panel tabled the lifecycle decision for S4 |
| D15 | Batch phrase | Still per-outlet this increment; Step 9 is verify-and-redact only | Single-phrase batch API is S5 scope (where real batches begin) |
| D16 | Build/test host | **radar only** | Windows esbuild is dead; radar Linux unblocks it |
| D17 | `App.tsx` / `testAppHarness.ts` | **Left intact** | Tests depend on them; divergence is closed by wiring + ledger, not deletion |
| D18 | Git | Commit per step (messages fixed below), tag final, **never push** | Sean reviews on radar |
| D19 | Approval *authoring* with explicit sets | Out of scope; backfill binds the existing 39; adding outlets requires re-attestation (banner says so) | Attestation UX is S5-adjacent; this increment binds what exists |

---

## 1. Target-state mermaid (extends §5 — `(NEW)` marks this increment)

```mermaid
flowchart TD
    C["Owner console - hash-route /owner/outlets (NEW S1)<br/>lazy chunk inside RootApp - AuthGate - role=owner - actor from SESSION"] --> BA["Batch intent - N outlets - phrase - owner-attributed"]
    A["Feed candidate"] --> P["Re-probe job (S3a, unchanged)"]
    P -->|"dead / blocks bots"| X1["Excluded - probe_runs row + reason"]
    P -->|"live"| Q{"terms_url + ownership present and resolving?"}
    Q -->|"no"| X1
    Q -->|"yes"| O{"Overlap? domain + publisher + content fingerprint"}
    O -->|"same publisher"| X2["Same independence_group - NOT a second confirmation"]
    O -->|"distinct"| S["Seed - born DISABLED (unchanged law)<br/>enabled absent from INSERT and UPDATE - 0028 triggers enforce"]
    S --> E0{"Outlet in registry? (NEW V2 - BOTH directions)"}
    BA --> E0
    E0 -->|"no"| B0["404 unknown_outlet - zero rows written<br/>migration 0030-C reaped existing orphans (NEW V2)"]
    E0 -->|"yes"| E1{"Inside signed feed set AND terms_url not null?<br/>(NEW S2h - membership vs feed_set_urls - hash on display)"}
    E1 -->|"no"| B1["409 contract_not_signed - no write<br/>disable path NEVER licence-gated (D5)"]
    E1 -->|"yes"| E2{"Kill switch clear?<br/>catalog seeded by migration 0030-B (NEW V3) - reads write nothing"}
    E2 -->|"tripped"| B2["Blocked - kill switch receipt"]
    E2 -->|"clear"| E3{"Exact activation phrase"}
    E3 -->|"wrong"| B3["No state change - attempt logged"]
    E3 -->|"ok"| EN["setOwnerEnabled - owner-attributed audit event - SAME txn (unchanged law)"]
    EN --> L["Batch ledger - N of M - failures named - partial never rounded up"]
    L --> SY["sync per outlet"]
    SY --> QO{"Daily quota ceiling?"}
    QO -->|"exceeded"| R1["Receipt - quota_exhausted - 0 items"]
    QO -->|"ok"| RT{"Retention budget - cap + TTL"}
    RT -->|"over cap"| R2["Receipt - retention_trim - oldest evicted"]
    RT -->|"ok"| IT["official_connector_items - headline + snippet + link - shadow-only"]
    IT --> CE["Claim extraction (S8, unchanged)"]
    CE --> EV{"Source-side evidence?"}
    EV -->|"restated text only"| RJ["REJECT - DB constraint, not a guideline"]
    EV -->|"yes"| CL["claims + claim_evidence"]
    CL --> CG{"Shared source-side pointer?"}
    CG -->|"yes"| SG["Same syndication_group - one story, not two witnesses"]
    CG -->|"no"| SG2["Independent occurrence"]
    SG --> DM["Disagreement map (S10, unchanged)"]
    SG2 --> DM
    DM --> V{"Verdict"}
    V -->|"system"| NV["REFUSED by trigger - verdicts are human-set"]
    V -->|"human"| HV["Recorded with actor + timestamp"]
    BL["CI bundle-marker ledger (NEW S1 drift guard)<br/>entry chunk MUST contain the RootApp owner-boundary marker<br/>entry chunk MUST NOT contain the console markers - lazy chunk MUST"] -.-> C
```

```mermaid
flowchart TD
    U["Sean - browser over Tailscale"] --> HR["GET / - static serve on radar (python3, tailnet IP)"]
    HR --> RA["RootApp - production entry"]
    RA --> AG{"AuthGate - session valid?"}
    AG -->|"no"| LG["Login - session only"]
    LG --> AG
    AG -->|"yes"| HR2{"hash-route /owner/* ?"}
    HR2 -->|"no"| MAIN["Main newsroom surface (unchanged)"]
    HR2 -->|"yes"| ROLE{"session.role = owner?"}
    ROLE -->|"no"| F403["OwnerForbiddenPanel - 403 owner_only<br/>the API would 403 the same calls - defense in depth"]
    ROLE -->|"yes"| OC["OwnerConsolePanel + OwnerKillSwitchPanel - lazy chunks<br/>Http api - actor from session - never from body"]
    OC --> API["apps/api owner routes - esbuild - Linux - radar"]
    API --> GATES["gate chain: registry 404 - feed_set 409 - kill switch - phrase - enable"]
```

---

## 2. Wireframe (extends §6 operator surface)

Frame 1 — owner view, delta lines marked `▸ NEW`:

```
┌─ SwanGuard owner console · /#/owner/outlets · inside RootApp (NEW S1) ─ owner: <name> ─┐
│ ▸ NEW (S2h) Contract: 39 / 39 registry outlets in signed set · hash 9f3e…              │
│   ADDING OUTLETS REQUIRES RE-ATTESTATION · bound by migration 0030                     │
│ Quota: 1,204 / 5,000 items today ▓▓▓░░░░░░░░   Retention: 90d default                   │
│ ▸ NEW (S1)  [ outlets ]  [ kill switches ]                                              │
│ Filters [state ▾] [class ▾] [stale >7d ☐] [unsigned ☐] [ghost ☐] 🔍                     │
├──────┬──────────────────┬───────────┬──────────────────────────────┬───────────┤
│  ☑   │ OUTLET           │ STATE     │ BLOCKER                      │ LAST SYNC │
├──────┼──────────────────┼───────────┼──────────────────────────────┼───────────┤
│  ☐   │ NPR News         │ ● active  │ —                            │ 2m        │
│  ☑   │ AP Top           │ ○ ready   │ owner_not_enabled            │ never     │
│  ☐   │ Reuters World    │ ◐ blocked │ contract_not_signed        ⚠ │ never     │ ← real gate (S2h)
│  ☐   │ npr-new          │ ✖ unknown │ no registry row · 404 BOTH directions 👻 │ ← V2
│      … ~30 rows/screen, virtualised, NO per-row switches …                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Selected 2 · only sole-blocker rows selectable                                          │
│ Activation phrase [________________]   [Enable 2]   [Disable 0]                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│ LAST BATCH · 2026-08-29 14:02 · 18 of 20 enabled · failures named · partial ≠ rounded  │
│ [full receipt →]                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Frame 2 — non-owner at `/#/owner/*` (NEW S1):

```
┌─ SwanGuard ───────────────────────────────── session: <name> (viewer) ─┐
│                                                                        │
│                          403 · owner_only                              │
│      The owner console is role-gated. This view makes no owner          │
│      calls; the API would refuse them with the same 403.               │
│      Roles come from the session — never from the page.                │
│                                                 [ back to newsroom ]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Build plan — dependency-ordered, zero-decision

Conventions used below: `$PM` = the repo's package manager (fact F1); `psqlq` = the DB helper function created in Step 0; every step ends with a **commit command**. Every acceptance is an **artifact under `build-artifacts/s1/`**, never an intention.

### Step 0 — Preflight: environment + fact table (no repo edits)

**Create (not in repo tree):** `build-artifacts/s1/BUILD-LOG.md`, `build-artifacts/s1/00-prefact.json`, `~/.config/swanguard/build.env` (`chmod 600`), `build-artifacts/s1/psqlq.sh`.

1. `git -C "$HOME/SanGuard"…` — no: exact commands:

```bash
cd "$HOME/SwanGuard-Newsroom"
git fetch origin --quiet
git checkout merge/newsroom-mainline-v3 --quiet
git rev-parse HEAD          # MUST print a hash starting 745867e → else STOP(ENV)
node -v                     # MUST be >= v20 → else STOP(ENV)
docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d
docker compose -p swanguard-newsroom -f docker-compose.dev.yml ps --format json > build-artifacts/s1/00-compose.json
```

2. From `00-compose.json`, extract: Postgres container name → `$PGC`, user → `$PGU`, db → `$PGD`, image tag → `$PGIMAGE`. Write into `psqlq.sh`:

```bash
#!/usr/bin/env bash
# build-artifacts/s1/psqlq.sh — single DB door. No credentials on argv (LoadCredential law).
docker exec -i "$PGC" psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1 "$@"
```

3. `$PM install` at repo root (manager chosen by lockfile: `package-lock.json`→npm, `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn). Record which in `00-prefact.json`.

4. Record facts **F1–F13** into `00-prefact.json` by running exactly these commands and pasting outputs:

| Fact | Command | STOP rule |
|---|---|---|
| F1 manager/scripts | `cat package.json apps/api/package.json apps/web/package.json` | none |
| F2 API start + port + owner route strings | `grep -rn "listen\|PORT" apps/api/src/index.ts apps/api/src/*.ts \| head -50` and `grep -rn "owner" apps/api/src/featureDispatchOwnerOperator.ts \| head -40` | no owner enable route found → STOP(AUTH_MECHANISM) |
| F3 migration runner | `ls packages/database` + grep `"migrate` in package.json files | none — fallback psql loop given in Step 1 |
| F4 `officialConnectors` DI seam | `grep -n "function create\|constructor\|store" apps/api/src/officialConnectors.ts \| head -30` | no injectable store → STOP(SEAM_MISSING) |
| F5 `listKillSwitches` signature | `grep -n "listKillSwitches\|export function" apps/api/src/ownerKillSwitches.ts` | cannot accept injected client/pool → STOP(SEAM_MISSING) |
| F6 kill-switch catalog literal | `sed -n '1,120p' apps/api/src/ownerKillSwitches.ts` (capture the array the first-read seeding inserts; `N_DEFAULTS` = its length; capture the table name in its `INSERT INTO`) | no seeding block → STOP(SEAM_MISSING) |
| F7 approval rows + scope column | `bash build-artifacts/s1/psqlq.sh -c '\x' -c 'SELECT * FROM contract_approvals'` + `\d contract_approvals` | See Step 1 §A2 ambiguity rule |
| F8 web session/role seam + panel props | `sed -n '1,80p' apps/web/src/AuthGate.tsx` + `grep -n "Props\|role" apps/web/src/components/OwnerConsolePanel.tsx apps/web/src/components/OwnerKillSwitchPanel.tsx \| head -20` + how existing tests inject sessions: `grep -rn "session" apps/web/src/testAppHarness.ts \| head -20` | AuthGate exposes no role → STOP(SEAM_MISSING) |
| F9 tailscale IP | `tailscale ip -4` (may be empty) | none |
| F10 ledger file (from S0) | `git show --stat d45e0e7 ca99643 e6bca37 \| grep -i "ledger\|marker\|bundle"` then `git show e6bca37:<path>` | no ledger file → STOP(LEDGER_MISSING) |
| F11 CI marker job | `grep -rn "ledger\|marker" .github/workflows/ 2>/dev/null` | absent → STOP(LEDGER_MISSING) |
| F12 registry columns | `\d news_rss_sources`; then verify: `SELECT count(*) FROM news_rss_sources` = **39**; key column = the text PK/unique column whose values match `news_rss:*` (`SELECT count(*) FROM news_rss_sources WHERE <keycol> LIKE 'news_rss:%'` must = 39); URL column = `feed_url` (`SELECT count(*) FROM news_rss_sources WHERE feed_url LIKE 'http%'` must = 39) | any count ≠ 39 or column names differ → STOP(SCHEMA_MISMATCH) — **do not guess synonyms** |
| F13 auth tokens + body logging | grep the session middleware for how a dev owner/viewer token is minted; grep request-logging middleware for body capture (`grep -rn "req.body\|body" apps/api/src --include=*middle*` plus any logger file) | no token mechanism for e2e → STOP(AUTH_MECHANISM) |

5. Fill `~/.config/swanguard/build.env` (chmod 600) with the values F13 discovered (`SWG_E2E_OWNER_TOKEN=`, `SWG_E2E_VIEWER_TOKEN=`, `SWG_E2E_API_BASE=`). **No secret ever appears in a command line or artifact; artifacts record hashes only** (`sha256sum` of tokens, not tokens).

**Acceptance:** `00-prefact.json` contains F1–F13 with all STOP gates passed. Commit: none (artifacts only).

### Step 1 — Migration 0030 (CREATE `packages/database/migrations/0030_owner_gate_hardening.sql`)

Write exactly this file. Only two placeholders exist, both resolved by F6/F7/F12 — **no others**:

```sql
-- 0030_owner_gate_hardening.sql
-- [A] S2h: bind the news-family attestation to its exact feed set (backfill the 39)
-- [B] V3 : kill-switch catalog seeded by migration — reads stop writing
-- [C] V2 : one-time orphan state reaper
-- [D] supporting index
BEGIN;

-- [A1] columns (D2: set for enforcement, hash as signed fingerprint)
ALTER TABLE contract_approvals
  ADD COLUMN IF NOT EXISTS feed_set_urls text[],
  ADD COLUMN IF NOT EXISTS feed_set_hash text;

-- [A2] Backfill. <F7.family_col> and the WHERE scope clause come from fact F7.
--      Scope rule (fixed): the backfill targets the ONE approval row whose scope
--      covers the news_rss family. If F7 shows (i) a family column = 'news_rss'
--      → use variant A2a; (ii) a single wildcard/NULL-scope row plus others
--      → use variant A2b on the wildcard row; (iii) two rows both plausibly
--      covering news_rss → STOP(SCOPE_AMBIGUOUS) — do not pick.
-- A2a:
UPDATE contract_approvals
SET feed_set_urls = s.urls,
    feed_set_hash = encode(sha256(convert_to(array_to_string(s.urls, E'\n'), 'UTF8')), 'hex')
FROM (SELECT array_agg(feed_url ORDER BY feed_url) AS urls
      FROM news_rss_sources WHERE feed_url IS NOT NULL) s
WHERE contract_approvals.feed_set_urls IS NULL
  AND contract_approvals.<F7.family_col> = 'news_rss';
-- A2b: same SET/FROM, WHERE clause: feed_set_urls IS NULL AND <scope IS NULL / wildcard>

ALTER TABLE contract_approvals
  ADD CONSTRAINT contract_approvals_feed_set_shape_chk
  CHECK (feed_set_urls IS NULL OR (feed_set_hash IS NOT NULL AND length(feed_set_hash) = 64)) NOT VALID;
ALTER TABLE contract_approvals VALIDATE CONSTRAINT contract_approvals_feed_set_shape_chk;

-- [B] V3: the catalog literal currently seeded lazily by ownerKillSwitches.ts (fact F6).
--      Transcribe EVERY entry VERBATIM, source order, N = N_DEFAULTS:
-- INSERT INTO <F6.table> (<F6.columns>)
-- VALUES (<row1>), (<row2>), ... (<rowN>)
-- ON CONFLICT (<F6.pk>) DO NOTHING;
-- RULE: the INSERT introduces NO state changes — kill-switch defaults only;
--       it must not enable, create, or alter any outlet/connector state row.

-- [C] V2: one-time reaper — news-lane state rows with no registry row (D4: migration-only).
DELETE FROM official_connector_states
WHERE connector_key LIKE 'news_rss:%'
  AND connector_key NOT IN (SELECT <F12.keycol> FROM news_rss_sources);

-- [D]
CREATE INDEX IF NOT EXISTS idx_contract_approvals_feed_set_hash
  ON contract_approvals (feed_set_hash);

COMMIT;
```

Apply with the F3 runner if one exists; else the fallback loop:

```bash
for f in packages/database/migrations/*.sql; do
  docker exec -i "$PGC" psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1 < "$f" || exit 1
done
```

**Acceptance (artifacts):**
- `01-orphans.txt`: before §C, `SELECT connector_key FROM official_connector_states WHERE connector_key LIKE 'news_rss:%' AND connector_key NOT IN (SELECT <keycol> FROM news_rss_sources);` — capture the list (expect `news_rss:ghost_outlet` et al.); after apply, same query returns **0 rows**. Deleting state rows cannot enable anything (absent row ⇒ `COALESCE(owner_enabled,false)=false` ⇒ still disabled).
- `01-backfill.json`: `SELECT feed_set_hash, array_length(feed_set_urls,1) FROM contract_approvals WHERE feed_set_urls IS NOT NULL;` → exactly the F7-selected row(s), length **39**, and a Node one-liner recomputing `sha256(sortedUrls.join('\n'))` matches `feed_set_hash` hex-for-hex.
- `01-idempotent.txt`: `pg_dump --data-only` of `contract_approvals`, `official_connector_states`, and the F6 table → sha256; apply 0030 a second time; dump again → **identical hashes**.
- `01-fresh.txt` (scratch DB, D11): `docker run --rm -d --name swg-scratch -p 5435:5432 -e POSTGRES_PASSWORD=scratch "$PGIMAGE"` → wait `pg_isready` → apply ALL migrations into it (`docker exec -i swg-scratch psql -U postgres …`) → `SELECT count(*) FROM <F6.table>` = `N_DEFAULTS` on a database that has **never run the app**. Keep the container running for Steps 2 and 8; kill it in Step 10.

Commit: `git add packages/database/migrations/0030_owner_gate_hardening.sql && git commit -m "0030: owner gate hardening (S2h backfill, V3 seed, V2 reaper)"`

### Step 2 — V3: read purity (EDIT `apps/api/src/ownerKillSwitches.ts`)

**Contract:** delete the first-read seeding block (the one F6 captured) so `listKillSwitches` is read-only in every environment. No other line in the file changes. The catalog now comes from 0030 §B.

**CREATE** `apps/api/src/__tests__/ownerKillSwitches.readOnly.test.ts` (test directory = the dominant existing pattern from F1; if none exists use `__tests__`):

```ts
import { describe, it, expect } from 'vitest';
import { Client } from 'pg';
import { listKillSwitches } from '../ownerKillSwitches';

describe('V3 — reads write nothing, in EVERY environment', () => {
  it('listKillSwitches succeeds inside a READ ONLY transaction on a freshly migrated DB', async () => {
    const client = new Client(process.env.SWG_TEST_DATABASE_URL!); // scratch DB, migrations applied
    await client.connect();
    await client.query('START TRANSACTION READ ONLY');   // any write here throws
    const rows = await listKillSwitches(client as never); // F5 seam: injected client
    await client.query('COMMIT');
    expect(rows.length).toBe(Number(process.env.SWG_TEST_N_DEFAULTS!));
  });
});
```

Run: `SWG_TEST_DATABASE_URL=postgres://postgres:scratch@localhost:5435/postgres SWG_TEST_N_DEFAULTS=<N> $PM test -w apps/api ownerKillSwitches.readOnly` → green, output captured to `build-artifacts/s1/02-v3.txt`.

Commit: `api: v3 kill-switch reads write nothing`

### Step 3 — V2: 404 both directions + regression (conditional EDIT `apps/api/src/officialConnectors.ts`, `postgresNewsRssSources.ts`)

**Probe first:** with the dev API running, disable a ghost: `news_rss:ghost_outlet` (exact call from F2's route strings, owner token from `build.env`).
- **(a) If it returns 404 `unknown_outlet`:** S0 already landed the gate → **skip the edit**, still land the tests (Step 3b), record probe output in `03-v2-live.txt`.
- **(b) If it returns 200:** apply this edit and only this edit — in `setOwnerEnabled`, before any other logic (so it covers **both** directions), insert:

```ts
const known = await this.store.isKnownOutlet(outletKey);
if (!known) return { status: 404, code: 'unknown_outlet', outletKey, wrote: false };
```

and add to the store (EDIT `apps/api/src/postgresNewsRssSources.ts`, column names from F12):

```ts
async isKnownOutlet(outletKey: string): Promise<boolean> {
  const r = await this.query('SELECT 1 FROM news_rss_sources WHERE <F12.keycol> = $1 LIMIT 1', [outletKey]);
  return r.rowCount === 1;
}
```

All pre-existing checks (readiness, audit-in-same-txn) stay untouched — these are pure reads placed **before** the write transaction opens, so the same-transaction audit law is preserved.

**3b (always) CREATE** `apps/api/src/__tests__/officialConnectors.unknownOutlet.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
// F4 seam: construct via the recorded factory. Any store member not expected in
// the scenario THROWS — copy this pattern for every member you must stub.
const thrower = new Proxy({}, { get: (_t, p) => { throw new Error('unexpected call: ' + String(p)); } });

describe('V2 — unknown_outlet gate, both directions', () => {
  it('enable of unregistered key -> 404 unknown_outlet, zero writes', async () => { /* store.isKnownOutlet=false; expect 404; setOwnerEnabled never called */ });
  it('disable of unregistered key -> 404 unknown_outlet, zero writes', async () => { /* same, direction false */ });
  it('disable of a REGISTERED key still reaches the store (gate must never trap an enabled outlet)', async () => { /* isKnownOutlet=true; expect store called */ });
});
```

**Acceptance:** tests green (`03-v2-unit.txt`); live probe artifact `03-v2-live.txt` showing enable **and** disable of `news_rss:ghost_outlet` → 404 JSON, and `psqlq -c "SELECT count(*) FROM official_connector_states WHERE connector_key='news_rss:ghost_outlet'"` = **0**.

Commit: `api: v2 unknown_outlet 404 both directions + regression`

### Step 4 — S2h: feed-set membership gate on enable

**EDIT `apps/api/src/ownerContractApprovals.ts`** — add exported pure helper + extend read model:

```ts
// Pure, unit-testable. D6: NULL set = family not bound = not enforced.
export function isKeyCovered(approval: { feed_set_urls: string[] | null } | null, feedUrl: string | null): boolean {
  if (!approval || approval.feed_set_urls === null) return true;      // legacy family — unenforced
  if (!feedUrl) return false;                                          // registry row without URL — blocked
  return approval.feed_set_urls.includes(feedUrl);
}
```

Read model: the approval SELECT adds `feed_set_urls, feed_set_hash`; the summary/response serializer (contracts in `ownerContractApprovalContracts.ts`, **EDIT**) adds `feedSetHash: string | null`, `signedCount: number`, `totalOutlets: number`, where `signedCount` comes from `SELECT count(*) FROM news_rss_sources WHERE feed_url = ANY($1)`. Additive fields only — remove nothing.

**EDIT `apps/api/src/officialConnectors.ts`** — in the **enable path only**, after the registry gate and before the write transaction:

```ts
if (enabled) {                                   // D5: disable is never licence-gated
  const approval = await this.approvals.latestForFamily('news_rss');
  const feedUrl  = await this.store.outletFeedUrl(outletKey);   // F12 column
  if (!isKeyCovered(approval, feedUrl)) {
    return { status: 409, code: 'contract_not_signed', outletKey, wrote: false };
  }
}
```

(`outletFeedUrl` added to the store the same way as Step 3's `isKnownOutlet`.) This only **adds** a block on enable — no gate is relaxed anywhere.

**CREATE** `apps/api/src/__tests__/ownerContractApprovals.feedSet.test.ts`: four cases — null set → covered; URL outside set → `contract_not_signed`; URL inside set → proceeds; registry row with NULL URL → blocked. Run → green (`04-s2h-unit.txt`).

Commit: `api: s2h feed_set_hash membership gate on enable`

### Step 5 — S1: ship the console inside RootApp

**CREATE `apps/web/src/ownerRouting.ts`** (D1):

```ts
import { useEffect, useState } from 'react';

export type OwnerHashRoute = { panel: 'outlets' } | { panel: 'kill-switches' } | { panel: 'not-found' };

export function parseOwnerHash(hash: string): OwnerHashRoute {
  const h = hash.replace(/^#\/?/, '');
  if (h === '' || h === 'owner' || h === 'owner/outlets') return { panel: 'outlets' };
  if (h === 'owner/kill-switches') return { panel: 'kill-switches' };
  return { panel: 'not-found' };
}

export function useOwnerHashRoute(): OwnerHashRoute {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parseOwnerHash(hash);
}
```

**CREATE `apps/web/src/components/OwnerForbiddenPanel.tsx`** — exact body: a centered panel rendering the literal text `403 · owner_only` plus the three lines of Frame 2 above and a link `#/` labelled `back to newsroom`. No API calls.

**EDIT `apps/web/src/RootApp.tsx`** — add imports (`lazy`, `Suspense`, the two panels, `useOwnerHashRoute`, `selectOwnerConsoleApi`, `OwnerForbiddenPanel`), add at module scope:

```ts
// Governance marker — ledger asserts this string is in the ENTRY chunk and the
// console markers are NOT. This is the anti-drift guard for the App/RootApp split.
const ROOT_APP_OWNER_BOUNDARY = '__SWG_ROOTAPP_OWNER_ROUTE__';
(globalThis as Record<string, unknown>).__SWG_ROOTAPP_OWNER_ROUTE__ = ROOT_APP_OWNER_BOUNDARY;

const OwnerConsoleLazy = lazy(() => import('./components/OwnerConsolePanel'));
const OwnerKillSwitchLazy = lazy(() => import('./components/OwnerKillSwitchPanel'));
```

and inside the authenticated subtree AuthGate renders (role prop name per F8), insert exactly:

```tsx
function OwnerArea({ role }: { role: string }) {
  const route = useOwnerHashRoute();
  if (role !== 'owner') return <OwnerForbiddenPanel />;
  if (route.panel === 'not-found') return <OwnerForbiddenPanel />; // same panel; text stays owner_only
  return (
    <div data-testid="owner-area">
      <nav aria-label="owner">
        <a href="#/owner/outlets">outlets</a>
        <a href="#/owner/kill-switches">kill switches</a>
      </nav>
      <Suspense fallback={<p data-testid="owner-console-loading">loading owner console…</p>}>
        {route.panel === 'outlets'
          ? <OwnerConsoleLazy /* api={selectOwnerConsoleApi()} only if F8 shows the panels take an api prop */ />
          : <OwnerKillSwitchLazy /* same rule */ />}
      </Suspense>
    </div>
  );
}
```

Rendering rule: `OwnerArea` is rendered when the hash path starts `#/owner`; the existing main surface renders otherwise. Both can coexist (console as an overlay route) — implement as: `{hashIsOwner ? <OwnerArea role={session.role}/> : <ExistingMain/>}` where `session.role` is the F8 name. Actor reaches the API from the **session**, never from component state or body (Law).

**EDIT `apps/web/src/api/ownerConsoleApiRuntime.ts`** — replace only the selection logic (D9): `return import.meta.env.MODE === 'test' || import.meta.env.VITE_OWNER_CONSOLE_DEMO === '1' ? demo : http;` preserving existing export names (record the original body in BUILD-LOG before replacing).

**EDIT `apps/web/src/api/ownerConsoleApiTypes.ts`** — append `'contract_not_signed'` to the existing blocker union (append only), and add `feedSetHash: string | null; signedCount: number; totalOutlets: number;` to the approvals summary type.

**EDIT `apps/web/src/components/OwnerConsolePanel.tsx`** — root element gains `data-testid="owner-console-root"`; header gains the banner line, exact template:
`Contract: {signedCount} / {totalOutlets} in signed set · hash {feedSetHash?.slice(0,8)}… · ADDING OUTLETS REQUIRES RE-ATTESTATION`.

**Acceptance:** `$PM test -w apps/web` still green (Demo runtime unchanged for tests). Build deferred to Step 6 (markers first, so the first built bundle is the one we assert).

Commit: `web: ship /owner console inside RootApp (lazy, role-gated)`

### Step 6 — Markers, ledger, build, budget, mutation drill

**EDIT** `OwnerConsolePanel.tsx` and `OwnerKillSwitchPanel.tsx`, module scope:

```ts
// Governance marker — asserted by the bundle-marker ledger. Do not remove or rename.
export const GOV_MARKER = '__SWG_OWNER_CONSOLE__'; // kill-switch panel uses __SWG_OWNER_KILL_SWITCH__
(globalThis as Record<string, unknown>).__SWG_OWNER_CONSOLE__ = GOV_MARKER;
```

**EDIT the F10 ledger file** — add three entries translated to its existing entry schema, semantics exactly: `__SWG_ROOTAPP_OWNER_ROUTE__` present in the **entry** chunk exactly once; `__SWG_OWNER_CONSOLE__` and `__SWG_OWNER_KILL_SWITCH__` each present in exactly **one non-entry chunk** and **absent from entry**.

**Commands:** build web (`$PM run build -w apps.web` equivalent from F1) → run ledger → `07-build.txt`, `08-ledger.txt`. Size budget (artifact `07-sizes.json`, gzip): entry-chunk delta vs the pre-Step-5 build ≤ **2048 bytes**; each lazy console chunk ≤ **153600 bytes**. Breach → STOP(BUDGET_BREACH) — Sean decides, not Qwen.

**Mutation drill (mandatory, then revert):**
```bash
sed -i 's/__SWG_OWNER_CONSOLE__/__SWG_OWNER_CONSOLE_X__/' apps/web/src/components/OwnerConsolePanel.tsx
$PM run build -w apps/web && <ledger cmd>   # MUST exit non-zero → capture to 08b-mutation.txt
git checkout -- apps/web/src/components/OwnerConsolePanel.tsx
$PM run build -w apps/web && <ledger cmd>   # MUST exit 0
```

Commit: `web: governance markers + ledger entries + size budget`

### Step 7 — RootApp runtime test (the drift killer)

**CREATE** `apps/web/src/__tests__/rootAppOwnerRoute.test.tsx` — imports **`RootApp` directly**; the file opens with the comment: *“This test deliberately does NOT use testAppHarness. The panel found the console 'shipped' only in App.tsx via the harness while production rendered RootApp. This file renders the production entry.”* Session injection uses the F8 seam (same mechanism the harness uses, applied to RootApp — never the harness itself). Two assertions: (1) role=owner at `#/owner/outlets` → `waitFor` finds `[data-testid="owner-console-root"]` (lazy resolves); (2) role=viewer → finds text `403 · owner_only` and `[data-testid="owner-console-root"]` is **null**. Run → green → `09-rootapp-test.txt`. Verify F11 shows the ledger job runs in CI (read-only check; if absent → STOP(LEDGER_MISSING)).

Commit: `test: rootapp owner route (no testAppHarness)`

### Step 8 — e2e on the built preview

**CREATE** `scripts/e2e/s1OwnerConsole.e2e.mjs`. It reads `~/.config/swanguard/build.env` (never argv), and executes, in order, assertions **E1–E9**, writing each result + evidence to `build-artifacts/s1/10-e2e.json`; exits non-zero on any failure:

- **E1** serve `apps/web/dist` on `127.0.0.1:4173` (in-process static server); `GET /` → 200 and the served entry chunk does **not** contain `__SWG_OWNER_CONSOLE__`.
- **E2** start the built `apps/api` (esbuild — Linux/radar) on its F2 port; health check.
- **E3** pick outlet deterministically: `SELECT <keycol> FROM news_rss_sources s LEFT JOIN official_connector_states c ON c.connector_key = s.<keycol> WHERE COALESCE(c.owner_enabled,false)=false ORDER BY 1 LIMIT 1` (via psqlq).
- **E4 owner enable**: owner token → enable E3's outlet → **200**; then `SELECT actor FROM <audit events table, from 0022 schema> ORDER BY occurred_at DESC LIMIT 1` = the session owner principal (**actor from session, never body** — Law).
- **E5 non-owner**: viewer token → same enable call → **HTTP 403**; audit-event count unchanged; state row unchanged (before/after dump in artifact).
- **E6 ghost**: owner token → enable `news_rss:ghost_outlet` → **404**; disable same → **404**; state count for that key = 0.
- **E7 unsigned (negative control)**: unit-level proof is Step 4; here assert the banner data: approvals summary endpoint returns `signedCount=39`, `totalOutlets=39`, `feedSetHash` matching `01-backfill.json` hex.
- **E8 phrase attempt**: owner enable with wrong phrase → no state change (existing behavior — proves no gate was relaxed by this increment).
- **E9 revert**: owner disable of E3's outlet → 200; `owner_enabled=false`; audit row exists for the disable (proves D5: disable never licence-gated).

Commit: `e2e: s1 owner console built-preview suite`

### Step 9 — V4 record (bounded conditional, both branches pre-specified)

Run the F13 body-logging grep. **(a)** bodies not logged → append `phrase-not-logged: verified` + grep output to BUILD-LOG. **(b)** bodies logged → apply exactly one edit: add the activation-phrase field to the logger's existing redaction list (file per F13; if the logger has no redaction list, CREATE one list containing only that field and apply it to body logging), rerun the grep proof, record. Nothing else.

Commit: `chore: v4 phrase-log verification record`

### Step 10 — Seal

`docker rm -f swg-scratch`; write `build-artifacts/s1/INDEX.md` listing every artifact with a one-line meaning; `git tag increment/s1-v2-v3-s2h`. **No push.**

### Step 11 — Serve on radar (runbook execution)

See §6. Artifacts: `11-serve.txt` (both `curl -s -o /dev/null -w '%{http_code}' http://<F9-ip>:4173/` → 200; `tmux ls`).

---

## 4. Forward roadmap (context for Sean — NOT this build)

- **S3a** Probe spec (`probe.toml`) + recurring re-probe; drift report vs 2026-08-21.
- **S3b** Identity + licence registry for the 107; `independence_group_id`; merge script refuses unreviewed rows.
- **S4** Freeze: provenance columns + retention budget + shadow enforcement job + **lifecycle decision (V1)**.
- **S5** Seed 107 dormant + live batch of 10 + mid-batch abort drill + single-phrase batch API (D15).
- **S6** Loadgen: 146 outlets / ~3k items on scratch live Postgres; quota ceiling observed firing.
- **S7** `news` as third `WikiSourceModule`; missing family mapping = compile error.
- **S8** Claim extraction; zero-evidence claims rejected loudly; CI bans joins on restated text.
- **S9** Clustering + syndication vs corroboration fixtures; hash-identical clusters.
- **S10** Disagreement map; system-written verdicts refused by trigger.

---

## 5. Qwen execution protocol

**Builder: do these in this order — Step 0 → 11. After each step run ITS command(s), compare against ITS expected artifact, then commit with ITS message. If anything fails, does not match, or a fact table entry hits a STOP rule: write `STOP-REPORT.md` (fields: step, command, expected, actual, STOP code) and HALT. Do not improvise. Do not refactor adjacent code. Do not edit files outside the manifest. Do not add dependencies. Do not touch migrations 0001–0029. Do not push. Never place a token, password, or the activation phrase on a command line or in an artifact — secrets live in `~/.config/swanguard/build.env` (chmod 600) and artifacts carry sha256 hashes only (LoadCredential law).**

**Laws, verbatim in intent — every edit must preserve them; if a step could relax a gate, refuse and STOP:**
1. Every creator/outlet is born DISABLED. `enabled/owner_enabled` goes true through exactly ONE route (owner-attributed, audit event in the SAME transaction). Actor comes from the SESSION, never the body.
2. Anything that shapes the feed FILTERS the enabled set; only the owner WRITES to it.
3. Reads must not write — after this increment, literally, in every environment.
4. The real gate is `official_connector_states.owner_enabled`. `lifecycle=dormant` is display metadata (V1 deferred to S4): no copy, comment, or UI label this increment may call it a gate.

STOP codes: `ENV · SCHEMA_MISMATCH · SCOPE_AMBIGUOUS · AUTH_MECHANISM · SEAM_MISSING · LEDGER_MISSING · BUDGET_BREACH · ACCEPTANCE_RED`.

---

## 6. Radar deployment note (short)

Everything above executes **on radar** (Ubuntu 24.04, non-sudo user) — radar being Linux is what unblocks the `apps/api` esbuild step (Linux-ELF binary, dead on the Windows checkout); this is the first increment whose full build+e2e can actually run. Serving (Step 11), tailnet-scoped, no sudo:

```bash
TI=$(tailscale ip -4)   # F9
tmux new-session -d -s swanguard-api -c "$HOME/SwanGuard-Newsroom" 'bash -lc "source ~/.config/swanguard/build.env; <F2 api start cmd>"'
tmux new-session -d -s swanguard-web -c "$HOME/SwanGuard-Newsroom/apps/web" "python3 -m http.server 4173 --bind $TI --directory dist"
```

Hash routing means static serve needs no SPA fallback. Sean's console URL: **`http://<radar-host>:4173/#/owner/outlets`**, over Tailscale, from any browser. Durability note: tmux survives logout, not reboot; `systemd --user` + `loginctl enable-linger` is the follow-up and needs one sudo from Sean — queued, not Qwen's. If `tailscale ip -4` was empty (F9), bind `127.0.0.1` and let Sean expose via `tailscale serve` — record which branch in `11-serve.txt`.

---

## 7. Closing

**(a) Ordered file-operation manifest**

```
CREATE build-artifacts/s1/{BUILD-LOG.md,00-prefact.json,psqlq.sh}        (artifacts, Step 0)
CREATE packages/database/migrations/0030_owner_gate_hardening.sql
EDIT   apps/api/src/ownerKillSwitches.ts
EDIT   apps/api/src/officialConnectors.ts                                (V2 gate — conditional branch b; S2h check — always)
EDIT   apps/api/src/postgresNewsRssSources.ts                            (isKnownOutlet, outletFeedUrl — with branch b / always)
EDIT   apps/api/src/ownerContractApprovals.ts
EDIT   apps/api/src/ownerContractApprovalContracts.ts
CREATE apps/api/src/__tests__/ownerKillSwitches.readOnly.test.ts
CREATE apps/api/src/__tests__/officialConnectors.unknownOutlet.test.ts
CREATE apps/api/src/__tests__/ownerContractApprovals.feedSet.test.ts
CREATE apps/web/src/ownerRouting.ts
CREATE apps/web/src/components/OwnerForbiddenPanel.tsx
EDIT   apps/web/src/RootApp.tsx
EDIT   apps/web/src/api/ownerConsoleApiRuntime.ts
EDIT   apps/web/src/api/ownerConsoleApiTypes.ts
EDIT   apps/web/src/components/OwnerConsolePanel.tsx                      (banner + marker + testid)
EDIT   apps/web/src/components/OwnerKillSwitchPanel.tsx                   (marker)
EDIT   <F10 ledger file>                                                  (three marker entries)
CREATE apps/web/src/__tests__/rootAppOwnerRoute.test.tsx
CREATE scripts/e2e/s1OwnerConsole.e2e.mjs
EDIT   <F13 logger>                                                      (ONLY branch b of Step 9)
CREATE build-artifacts/s1/01…11*                                         (evidence artifacts)
```

**(b) Highest-risk step and mitigation.** Step 1 §A2 — the backfill binding the 39 URLs to the **wrong approval row** would either silently reproduce the "family attestation covers everything" status quo (the licence hole this increment exists to close) or wrongly block all 39. Mitigation: fact F7's row dump with a hard `STOP(SCOPE_AMBIGUOUS)` on any ambiguity, the JS sha256 recompute proof in `01-backfill.json`, and E7's live assertion `signedCount=39/39` with the unit negative control from Step 4.

**(c) The exact first command Qwen runs to begin:**

```bash
cd "$HOME/SwanGuard-Newsroom" && git fetch origin --quiet && git checkout merge/newsroom-mainline-v3 --quiet && git rev-parse HEAD
```

Expected output begins `745867e`. Anything else → `STOP-REPORT.md`, code `ENV`, halt.
