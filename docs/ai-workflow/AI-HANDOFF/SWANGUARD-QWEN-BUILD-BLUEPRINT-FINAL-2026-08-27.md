# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/swanguard-glm-integrate.md
**Tokens:** 17098 in / 40798 out (reasoning: 22520) | total 57896
**Wall:** 570.9s

---

# SwanGuard — Final Increment Blueprint `INC-S1+V2+V3+S2h` (merged, self-contained)

**Scope (fixed, do not re-derive):** ship the owner console inside `RootApp` (S1) + close the orphan door and reap existing orphans (V2) + move kill-switch catalog seeding into a migration so reads literally never write (V3) + the buildable half of S2: `feed_set_hash`/`feed_set_urls` binding with migration backfill for the existing 39.

**Repo facts (authoritative):** `merge/newsroom-mainline-v3` @ `745867e` · monorepo `apps/api`, `apps/web`, `packages/{contracts,database,domain}` · next migration = **0030** · dev DB via `docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d` (Postgres port 5434) · `apps/api` esbuild is Linux-ELF → **the entire protocol runs on radar, never on the Windows checkout**.

**Builder:** Qwen 3.8. You make **zero** decisions. Every fact you lack is captured in the Step 0 fact table; every fact that cannot be captured is a **STOP condition**. When in doubt: STOP and write `STOP-REPORT.md` (fields: step, command, expected, actual, STOP code). Never guess. Every placeholder in this document is of the form `<F…>` and is resolved mechanically from the Step 0 fact table — there are no other placeholders.

---

## 0. Resolved decisions (all pre-decided)

| # | Question | Resolution | One-line reason |
|---|---|---|---|
| D1 | Router for `/owner` | **Hash routing** via a minimal hash-router module (~40 lines); **no** `react-router-dom` | Zero new deps; static serve on radar needs no SPA fallback; canonical operator URL `/#/owner/outlets`; non-owner hashes leave the main surface untouched |
| D2 | Store hash or URL set? | **Both**: `feed_set_urls text[]` (enforceable membership) + `feed_set_hash` (signed fingerprint shown in console) | A hash alone cannot answer "is this outlet in the set" without the set |
| D3 | One migration or several | **One**: `0030_owner_gate_hardening.sql`, four lettered sections | Atomic ordering (backfill before gate code, seed before read-path edit); number fixed at 0030 |
| D4 | Runtime orphan reaper? | **No** — reaper lives in migration 0030 only | Law 5 (reads write nothing, below); the V2 gate prevents new orphans |
| D5 | Gate the disable path with licence checks? | **Never** | A gate that traps an already-enabled outlet is worse than the hole it closes |
| D6 | Families with `NULL feed_set_urls` | Gate **not enforced** for them | Inventing sets for unseen families is a silent policy change; they get their own slice |
| D7 | `feed_set_hash` NOT NULL? | Nullable at DB, shape-checked; enforced app-side for the news lane | Other families' approval rows are not backfilled |
| D8 | Console chunk | **Lazy** via `React.lazy`; markers pinned with `globalThis` side-effect | S1 spec; survives minification; ledger can assert entry/lazy split |
| D9 | `ownerConsoleApiRuntime` default | **Http** unless `MODE==='test'` or `VITE_OWNER_CONSOLE_DEMO==='1'` | The console must be real in production; Demo stays for tests |
| D10 | V2 code edit | **Conditional on live probe** — S0 may already have landed the 404 gate | Both branches fully specified in Step 3; never refactor working code |
| D11 | Fresh-env proof | **Scratch** Postgres container on port 5435, throwaway password `scratch` | Never wipe the dev DB |
| D12 | e2e outlet choice | Deterministic SQL pick, reverted after evidence | Reproducible artifact |
| D13 | Serving on radar | `python3 -m http.server` bound to the tailscale IP, in `tmux`, non-sudo | No new deps, no sudo; systemd `--user` + linger needs one sudo from Sean — queued, not Qwen's |
| D14 | `lifecycle`/V1 | **Untouched** this increment; display metadata; no copy may call it a gate | Panel tabled the lifecycle decision for S4 |
| D15 | Batch phrase | Still per-outlet this increment; Step 9 is verify-and-redact only | Single-phrase batch API is S5 scope |
| D16 | Build/test host | **radar only** | Windows esbuild is dead; radar Linux unblocks it |
| D17 | `App.tsx` / `testAppHarness.ts` | **Left intact** | Tests depend on them; divergence is closed by wiring + ledger, not deletion |
| D18 | Git | Commit per step (messages fixed below), tag final, **never push** | Sean reviews on radar |
| D19 | Approval *authoring* with explicit sets | Out of scope; backfill binds the existing 39; adding outlets requires re-attestation (banner says so) | This increment binds what exists |
| D20 | Console panels and the api object | **No `api` prop at all** — panels self-acquire via the D9-edited `ownerConsoleApiRuntime` module; `selectOwnerConsoleApi` is imported **only** if fact F8 proves the panels take an `api` prop | Removes the dead-import/lint trap; the runtime module is the single selection point |

---

## 1. Target-state mermaid

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
    ROLE -->|"yes"| OC["OwnerConsolePanel + OwnerKillSwitchPanel - lazy chunks<br/>no api prop - panels self-acquire via runtime module - actor from session - never from body"]
    OC --> API["apps/api owner routes - esbuild - Linux - radar"]
    API --> GATES["gate chain: registry 404 - feed_set 409 - kill switch - phrase - enable"]
```

---

## 2. Wireframe

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
└────────────────────────────────────────────────────────────────────────────────────┘
```

Frame 2 — non-owner (or typo'd owner path) at `/#/owner/*` (NEW S1). The literal string `403 · owner_only` below uses the middle dot **U+00B7** and is copied byte-for-byte into the component (Step 5) and the test assertion (Step 7):

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

Conventions: `$PM` = the repo's package manager (fact F1); `psqlq` invocations are always written out in full as `bash build-artifacts/s1/psqlq.sh …`; every step ends with a **commit command**; every acceptance is an **artifact under `build-artifacts/s1/`**, never an intention. Artifacts are untracked evidence — never `git add` anything under `build-artifacts/`.

### Step 0 — Preflight: environment + fact table (no repo edits)

**Create (not committed):** `build-artifacts/s1/BUILD-LOG.md`, `build-artifacts/s1/00-prefact.json`, `~/.config/swanguard/build.env` (`chmod 600`), `build-artifacts/s1/psqlq.sh`.

**0.1 — Environment.** Run exactly:

```bash
cd "$HOME/SwanGuard-Newsroom"
git fetch origin --quiet
git checkout merge/newsroom-mainline-v3 --quiet
git rev-parse HEAD          # MUST print a hash starting 745867e → else STOP(ENV)
node -v                     # MUST be >= v20 → else STOP(ENV)
docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d
docker compose -p swanguard-newsroom -f docker-compose.dev.yml ps --format json > build-artifacts/s1/00-compose.json
```

**0.2 — Postgres identity → literal-valued `psqlq.sh`.** Extract the container identity without jq (python3 stdlib; tolerant of both compose-ps output shapes — a single JSON array or JSON-lines):

```bash
python3 - <<'PY' | tee build-artifacts/s1/00-pgident.json
import json,sys
raw=open('build-artifacts/s1/00-compose.json').read()
try: rows=json.loads(raw)
except Exception: rows=[json.loads(l) for l in raw.splitlines() if l.strip()]
pg=[r for r in rows if 'postgres' in str(r.get('Image',''))]
assert len(pg)==1, 'expected exactly one postgres container, got %d'%len(pg)
print(json.dumps({'name':pg[0]['Name'],'image':pg[0]['Image'],'service':pg[0].get('Service')}))
PY
```

The assertion failing (not exactly one postgres container) → `STOP(ENV)`. Then get user/db from the compose file (image defaults are `postgres`/`postgres` when unset):

```bash
grep -nE 'POSTGRES_(USER|DB)' docker-compose.dev.yml || echo "no override → PGU=postgres PGD=postgres"
```

Write `psqlq.sh` with the **literal values substituted at authoring time** (container name from `00-pgident.json`; user/db from the grep above or the image defaults) — not shell defaults, not environment lookups:

```bash
#!/usr/bin/env bash
set -euo pipefail
PGC='<literal container Name from 00-pgident.json>'
PGU='<literal user>'
PGD='<literal db>'
exec docker exec -i "$PGC" psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1 "$@"
```

Record `PGC/PGU/PGD/PGIMAGE` literals into `00-prefact.json`.

**0.3 — Install.** `$PM install` at repo root; manager chosen by lockfile: `package-lock.json`→npm, `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn. Record which in `00-prefact.json`.

**0.4 — Baseline build (size-budget reference).** Using the exact build script name from F1:

```bash
$PM run build -w apps/web
cp -r apps/web/dist build-artifacts/s1/dist-baseline
for f in build-artifacts/s1/dist-baseline/assets/*.js; do printf '%s %s %s\n' "$(wc -c <"$f")" "$(gzip -c "$f" | wc -c)" "$(basename "$f")"; done | tee build-artifacts/s1/07-baseline.sizes
```

This is the pre-console bundle; Step 6's budget is measured against it.

**0.5 — Fact table.** Record facts **F1–F16 (incl. F13b)** into `00-prefact.json` by running exactly these commands and pasting outputs. JSON keys are the literal strings `F1`…`F16`, `F13b`.

| Fact | Command | STOP rule |
|---|---|---|
| F1 manager/scripts | `cat package.json apps/api/package.json apps/web/package.json` | none |
| F2 API start + port + owner route strings | `grep -rn "listen\|PORT" apps/api/src/index.ts apps/api/src/*.ts \| head -50` and `grep -rn "owner" apps/api/src/featureDispatchOwnerOperator.ts \| head -40` | no owner enable route found → STOP(AUTH_MECHANISM) |
| F3 migration runner | `ls packages/database` + grep `"migrate` in package.json files | none — fallback commands given in Step 1 |
| F4 `officialConnectors` DI seam | `grep -n "function create\|constructor\|store" apps/api/src/officialConnectors.ts \| head -30`; also the exact exported symbol name and the signature of `setOwnerEnabled` (record its enable-direction parameter name) | no injectable store → STOP(SEAM_MISSING) |
| F5 `listKillSwitches` signature | `grep -n "listKillSwitches\|export function" apps/api/src/ownerKillSwitches.ts` | cannot accept injected client/pool → STOP(SEAM_MISSING) |
| F6 kill-switch catalog literal | `sed -n '1,120p' apps/api/src/ownerKillSwitches.ts` (capture the array the first-read seeding inserts; `N_DEFAULTS` = its length; capture the `INSERT INTO` table name, its column list, and its conflict/PK column) **plus** `bash build-artifacts/s1/psqlq.sh -c '\d <that table>'` (record every column's type — needed for the transcription rules in Step 1 §B) | no seeding block → STOP(SEAM_MISSING) |
| F7 approval rows + scope column | `bash build-artifacts/s1/psqlq.sh -c '\x' -c 'SELECT * FROM contract_approvals'` + `bash build-artifacts/s1/psqlq.sh -c '\d contract_approvals'`. Record: the family/scope column name; the family **value** as it appears (this exact string is `F7.family_value`, used in Step 1 §A2 and Step 4 — typed once, referenced everywhere); which scope variant F7 selects: `A2a` / `A2b` / ambiguous | See the four-outcome rule in Step 1 §A2 |
| F8 web session/role seam + panel props | `sed -n '1,80p' apps/web/src/AuthGate.tsx` + `grep -n "Props\|role\|api" apps/web/src/components/OwnerConsolePanel.tsx apps/web/src/components/OwnerKillSwitchPanel.tsx \| head -20` + `grep -rn "session" apps/web/src/testAppHarness.ts \| head -20` (how existing tests inject sessions) | AuthGate exposes no role → STOP(SEAM_MISSING) |
| F9 tailscale IP | `tailscale ip -4` (may be empty) | none |
| F10 ledger file + capability check | `git show --stat d45e0e7 ca99643 e6bca37 \| grep -i "ledger\|marker\|bundle"` then `git show e6bca37:<path>`; capture the ledger's entry schema. **Capability check:** the three Step-6 entries semantically require the predicates *present-in-exactly-one-non-entry-chunk* (×2) and *present-exactly-once-in-entry + absent-from-entry*. If the schema cannot express a predicate, do **not** degrade to presence-only — STOP(LEDGER_MISSING) with the schema excerpt. Persist the runnable invocation as `LEDGER_CMD=` in `build.env` now | no ledger file, or schema cannot express the predicates → STOP(LEDGER_MISSING) |
| F11 CI marker job | `grep -rn "ledger\|marker" .github/workflows/ 2>/dev/null` | absent → STOP(LEDGER_MISSING) |
| F12 registry columns (non-circular procedure) | Pre-verify: `ls packages/database/migrations \| sort -V \| tail -1` must begin `0029` → else STOP(SCHEMA_MISMATCH). Then list text-ish columns: `bash build-artifacts/s1/psqlq.sh -At -c "SELECT column_name FROM information_schema.columns WHERE table_name='news_rss_sources' AND data_type IN ('text','character varying','character')"`. For **each** returned column run `SELECT count(*) FROM news_rss_sources WHERE "<col>" LIKE 'news_rss:%';`. **Exactly one** column with count = 39 is `<F12.keycol>`; zero or more than one → STOP(SCHEMA_MISMATCH) — do not guess synonyms. Then verify `SELECT count(*) FROM news_rss_sources` = **39** and the URL column: `SELECT count(*) FROM news_rss_sources WHERE feed_url LIKE 'http%'` = 39 (if `feed_url` is absent → STOP(SCHEMA_MISMATCH)) | any count ≠ 39, column names differ, or keycol not unique → STOP(SCHEMA_MISMATCH) |
| F13 auth tokens + body logging | grep the session middleware for how a dev owner/viewer token is minted; `grep -rn "req.body\|body" apps/api/src --include=*middle*` plus any logger file | no token mechanism for e2e → STOP(AUTH_MECHANISM) |
| F13b activation-phrase body field | `grep -rn "phrase\|activation" apps/api/src \| head -40` → record the request **BODY FIELD NAME** carrying the phrase | absent → STOP(AUTH_MECHANISM) |
| F14 approvals seam (checked **now**, before anything lands) | `grep -rn "approval" apps/api/src/index.ts apps/api/src/featureDispatchOwnerOperator.ts apps/api/src/officialConnectors.ts \| head -30` | no injectable approvals accessor usable from `officialConnectors` → STOP(SEAM_MISSING) — halting here is the point: a mid-build halt would ship a half-hardened increment |
| F15 default-export audit | `grep -n "export default\|export function\|export const" apps/web/src/components/OwnerConsolePanel.tsx apps/web/src/components/OwnerKillSwitchPanel.tsx` — record each panel's export form and exact export names | none (pure selector; decides which `lazy()` form Step 5 uses) |
| F16 CORS/credentials (observation only — **no API edits**) | `grep -rn "cors\|Access-Control-Allow-Origin\|credentials" apps/api/src \| head -30` and `grep -rn "credentials" apps/web/src/api \| head -20` (does the Http client send `credentials:'include'`?) | none |

**0.6 — `build.env` (chmod 600).** Fill **exactly this schema**, values from F13/F13b/F10 (LEDGER_CMD was persisted at F10 time above):

```
SWG_E2E_OWNER_TOKEN=
SWG_E2E_VIEWER_TOKEN=
SWG_E2E_API_BASE=
SWG_E2E_ACTIVATE_PHRASE=
LEDGER_CMD=
```

**No secret ever appears in a command line or an artifact; artifacts record sha256 digests only** (`sha256sum` of tokens and phrase, not the values). Any shell step that needs these values starts with `set -a; . "$HOME/.config/swanguard/build.env"; set +a`.

**0.7 — Completion gate:**

```bash
node -e "JSON.parse(require('fs').readFileSync('build-artifacts/s1/00-prefact.json'))" && grep -q '"F14"' build-artifacts/s1/00-prefact.json
```

must exit 0 → else fix `00-prefact.json` or STOP(ENV). Commit: none (artifacts only).

---

### Step 1 — Migration 0030 (CREATE `packages/database/migrations/0030_owner_gate_hardening.sql`)

Author the file as follows. The only substitutions are `<F7.family_col>`, `<F12.keycol>`, and the `<F6.table>/<F6.columns>/<F6.pk>` literal block — all from Step 0 facts. The §A2 scope choice is **mechanical** from F7:

- **(i)** a family column with value `'news_rss'` on exactly one row → keep **A2a**, delete the A2b block;
- **(ii)** a single wildcard/NULL-scope row (plus non-covering others) → keep **A2b**, delete the A2a block;
- **(iii)** two rows both plausibly covering news_rss → `STOP(SCOPE_AMBIGUOUS)` — do not pick;
- **(iv)** no candidate row at all → `STOP(SCOPE_AMBIGUOUS)` — falling through would silently ship a 0/39 console.

The literal family string in A2a and the argument later passed to `latestForFamily` (Step 4) are the **same** `F7.family_value` recorded once in `00-prefact.json`.

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

-- [A2] Backfill (scope variant chosen mechanically from F7; delete the unused variant).
--      Sorting is COLLATE "C" on both sides so the SQL hash and the JS recompute in the
--      acceptance proof are byte-identical regardless of database locale.
-- A2a (variant i — family column = F7.family_value):
UPDATE contract_approvals ca
SET feed_set_urls = s.urls,
    feed_set_hash = encode(sha256(convert_to(array_to_string(s.urls, E'\n'), 'UTF8')), 'hex')
FROM (SELECT array_agg(feed_url ORDER BY feed_url COLLATE "C") AS urls
      FROM news_rss_sources WHERE feed_url IS NOT NULL) s
WHERE ca.feed_set_urls IS NULL
  AND ca.<F7.family_col> = 'news_rss';
-- A2b (variant ii — wildcard/NULL scope):
UPDATE contract_approvals ca
SET feed_set_urls = s.urls,
    feed_set_hash = encode(sha256(convert_to(array_to_string(s.urls, E'\n'), 'UTF8')), 'hex')
FROM (SELECT array_agg(feed_url ORDER BY feed_url COLLATE "C") AS urls
      FROM news_rss_sources WHERE feed_url IS NOT NULL) s
WHERE ca.feed_set_urls IS NULL
  AND ca.<F7.family_col> IS NULL;

-- Shape constraint. (reviewed: the ADD is existence-guarded so the mandated second
-- apply in the idempotency proof succeeds — a bare ADD CONSTRAINT would abort with
-- duplicate_object; VALIDATE on an already-valid constraint is a successful no-op.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_approvals_feed_set_shape_chk') THEN
    ALTER TABLE contract_approvals
      ADD CONSTRAINT contract_approvals_feed_set_shape_chk
      CHECK (feed_set_urls IS NULL OR (feed_set_hash IS NOT NULL AND length(feed_set_hash) = 64)) NOT VALID;
  END IF;
END $$;
ALTER TABLE contract_approvals VALIDATE CONSTRAINT contract_approvals_feed_set_shape_chk;

-- [B] V3: the catalog literal currently seeded lazily by ownerKillSwitches.ts (fact F6).
--      Transcribe EVERY entry VERBATIM, source order, N = N_DEFAULTS, applying:
--        - single quotes doubled as ''      - NULL written bare
--        - booleans lowercase true/false    - numbers unquoted
--        - text arrays as '{}'              - timestamptz as '...'::timestamptz
--      Any jsonb/blob-typed default column in F6's \d output → STOP(SCHEMA_MISMATCH)
--      (transcription fidelity cannot be guaranteed).
-- INSERT INTO <F6.table> (<F6.columns>)
-- VALUES (<row1>), (<row2>), ... (<rowN>)
-- ON CONFLICT (<F6.pk>) DO NOTHING;
-- RULE: the INSERT introduces NO state changes — kill-switch defaults only;
--       it must not enable, create, or alter any outlet/connector state row.

-- [C] V2: one-time reaper — news-lane state rows with no registry row (D4: migration-only).
--      NOT EXISTS (not NOT IN) so a NULL in the registry column can never widen the delete.
DELETE FROM official_connector_states c
WHERE c.connector_key LIKE 'news_rss:%'
  AND NOT EXISTS (SELECT 1 FROM news_rss_sources s WHERE s.<F12.keycol> = c.connector_key);

-- [D]
CREATE INDEX IF NOT EXISTS idx_contract_approvals_feed_set_hash
  ON contract_approvals (feed_set_hash);

COMMIT;
```

**Placeholder seal (run before applying; must pass):**

```bash
grep -nE '\<[A-Z][A-Z0-9_]*(_col|_table|_pk|DEFAULTS)\>' packages/database/migrations/0030_owner_gate_hardening.sql && { echo PLACEHOLDER_REMAINS; exit 1; } || true
```

**Apply to the DEV DB — exactly this one file, never the full directory** (replaying 0001–0029 against the migrated dev DB would abort on 0001 and violates "do not touch migrations 0001–0029"):

```bash
docker exec -i "$PGC" psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1 \
  < packages/database/migrations/0030_owner_gate_hardening.sql || exit 1
```

If F3 found a tracked runner, prefer it; if it misbehaves, use the command above and append `runner_fallback_used: true` to BUILD-LOG.

**Acceptance (artifacts):**

1. `01-orphans.txt` — **before** applying (capture first, then apply):

   ```bash
   bash build-artifacts/s1/psqlq.sh -c "SELECT connector_key FROM official_connector_states WHERE connector_key LIKE 'news_rss:%' AND NOT EXISTS (SELECT 1 FROM news_rss_sources s WHERE s.<F12.keycol> = official_connector_states.connector_key);"
   ```

   capture the list (expect `news_rss:ghost_outlet` et al.); after apply, the same query returns **0 rows**. Note in the artifact: deleting state rows cannot enable anything (absent row ⇒ `COALESCE(owner_enabled,false)=false` ⇒ still disabled).

2. `01-backfill.json` — `SELECT feed_set_hash, array_length(feed_set_urls,1) FROM contract_approvals WHERE feed_set_urls IS NOT NULL;` → exactly the F7-selected row, length **39**. Then the collation-safe recompute:

   ```bash
   H=$(bash build-artifacts/s1/psqlq.sh -At -c "SELECT feed_set_hash FROM contract_approvals WHERE feed_set_urls IS NOT NULL LIMIT 1")
   J=$(bash build-artifacts/s1/psqlq.sh -At -c "SELECT json_agg(u)::text FROM (SELECT feed_url u FROM news_rss_sources WHERE feed_url IS NOT NULL ORDER BY u COLLATE \"C\") t")
   node -e 'const[h,j]=[process.argv[1],JSON.parse(process.argv[2])];const d=require("crypto").createHash("sha256").update(h?.length&&j.join("\n"),"utf8");console.log(JSON.stringify({stored:process.argv[1],computed:d.digest("hex"),urls:j.length}))' "$H" "$J" > build-artifacts/s1/01-backfill-hashcheck.json
   ```

   PASS = `computed === stored` and `urls === 39` **in the JSON file** (record the JSON, not free-form prose).

3. `01-idempotent` — data-only dumps around a second apply:

   ```bash
   docker exec "$PGC" pg_dump -U "$PGU" -d "$PGD" --data-only --inserts \
     -t contract_approvals -t official_connector_states -t "<F6.table literal>" > build-artifacts/s1/01-pre.sql
   docker exec -i "$PGC" psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1 \
     < packages/database/migrations/0030_owner_gate_hardening.sql
   docker exec "$PGC" pg_dump -U "$PGU" -d "$PGD" --data-only --inserts \
     -t contract_approvals -t official_connector_states -t "<F6.table literal>" > build-artifacts/s1/01-post.sql
   sha256sum build-artifacts/s1/01-pre.sql build-artifacts/s1/01-post.sql   # digests must be equal
   ```

4. `01-fresh.txt` + `01-reaper-fresh.json` — scratch DB (D11), all migrations, behavioral reaper proof:

   ```bash
   PGIMAGE=$(python3 -c "import json;print(json.load(open('build-artifacts/s1/00-pgident.json'))['image'])")
   docker run --rm -d --name swg-scratch -p 5435:5432 -e POSTGRES_PASSWORD=scratch "$PGIMAGE"
   for i in $(seq 1 30); do docker exec swg-scratch pg_isready -U postgres -q && break; sleep 1; done
   for f in $(ls packages/database/migrations/*.sql | sort -V); do
     docker exec -i swg-scratch psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f" || exit 1
   done
   docker exec swg-scratch psql -U postgres -d postgres -At -c "SELECT count(*) FROM <F6.table literal>"   # MUST equal N_DEFAULTS on a DB that has NEVER run the app
   ```

   Then the behavioral reaper proof (scratch only; never the dev DB): discover the minimal writable row via `docker exec swg-scratch psql -U postgres -c '\d official_connector_states'` (capture the `\d` output into the artifact); `INSERT INTO official_connector_states(<required cols>) VALUES ('news_rss:synthetic_orphan', …defaults/required values…)` — if any required column has no default and its meaning is not evident from `\d` → `STOP(SCHEMA_MISMATCH)`. Then run the reaper §C statement (the same DELETE text, with `<F12.keycol>` substituted) against scratch, and assert `SELECT count(*) FROM official_connector_states WHERE connector_key='news_rss:synthetic_orphan'` = **0**. Write both the before-insert and after-reaper evidence to `build-artifacts/s1/01-reaper-fresh.json`. Keep `swg-scratch` running for Steps 2 and 8; it is killed in Step 10.

Commit: `git add packages/database/migrations/0030_owner_gate_hardening.sql && git commit -m "0030: owner gate hardening (S2h backfill, V3 seed, V2 reaper)"`

---

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

Run (throwaway scratch credentials, passed by environment assignment — never argv; `N` is the integer recorded in F6 as `N_DEFAULTS`, substituted literally):

```bash
SWG_TEST_DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5435/postgres' \
SWG_TEST_N_DEFAULTS=<F6.N_DEFAULTS as an integer literal> \
  $PM test -w apps/api ownerKillSwitches.readOnly 2>&1 | tee build-artifacts/s1/02-v3.txt
```

Green required → else STOP(ACCEPTANCE_RED).

Commit: `git add apps/api/src/ownerKillSwitches.ts apps/api/src/__tests__/ownerKillSwitches.readOnly.test.ts && git commit -m "api: v3 kill-switch reads write nothing"`

---

### Step 3 — V2: 404 both directions + regression (conditional EDIT `apps/api/src/officialConnectors.ts`, `postgresNewsRssSources.ts`)

**Ghost-key sanity first:**

```bash
bash build-artifacts/s1/psqlq.sh -At -c "SELECT count(*) FROM news_rss_sources WHERE <F12.keycol>='news_rss:ghost_outlet'"
```

must be **0** → else `STOP(SCHEMA_MISMATCH)` (the fixture key is not actually a ghost; do not proceed).

**Probe** (dev API running per the F2 start command; owner token sourced from `build.env`): disable `news_rss:ghost_outlet` using the exact call from F2's route strings.

- **(a) Returns 404 `unknown_outlet`:** S0 already landed the gate → **skip the code edit**, still land the tests (3b), record the probe output in `03-v2-live.txt`, and verify `bash build-artifacts/s1/psqlq.sh -At -c "SELECT count(*) FROM official_connector_states WHERE connector_key='news_rss:ghost_outlet'"` = **0** (no rollback needed — nothing was written).
- **(b) Returns 200:** apply this edit and only this edit — in `setOwnerEnabled`, before any other logic (so it covers **both** directions), insert:

```ts
const known = await this.store.isKnownOutlet(outletKey);
if (!known) return { status: 404, code: 'unknown_outlet', outletKey, wrote: false };
```

  Return-shape fallback: try the four-field literal; if TypeScript rejects the trailing fields, use `{ status: 404, code: 'unknown_outlet' }` (drop trailing fields **only**) and record which shape compiled in BUILD-LOG. Add to the store (EDIT `apps/api/src/postgresNewsRssSources.ts`, column names from F12; **copy the exact client-acquisition pattern of any existing SELECT in that file** — if the store contains no prior SELECT → `STOP(SEAM_MISSING)`):

```ts
async isKnownOutlet(outletKey: string): Promise<boolean> {
  const r = await this.query('SELECT 1 FROM news_rss_sources WHERE <F12.keycol> = $1 LIMIT 1', [outletKey]);
  return r.rowCount === 1;
}
```

  All pre-existing checks (readiness, audit-in-same-txn) stay untouched — these are pure reads placed **before** the write transaction opens, so the same-transaction audit law is preserved. Restart the dev API per the F2 start command, re-probe: enable **and** disable of `news_rss:ghost_outlet` → both 404 JSON; capture both in `03-v2-live.txt`. **Probe-pollution rollback:** the branch-(b) *detection* disable ran before the gate landed and may have written an orphan row; if `SELECT count(*) FROM official_connector_states WHERE connector_key='news_rss:ghost_outlet'` = 1, run exactly:

```bash
bash build-artifacts/s1/psqlq.sh -c "DELETE FROM official_connector_states WHERE connector_key='news_rss:ghost_outlet'"
```

  and record the line in `03-v2-live.txt` as `fixture_rollback:`. This is de-pollution of our own probe, not a state write.

**3b (always, both branches) CREATE** `apps/api/src/__tests__/officialConnectors.unknownOutlet.test.ts` — this file verbatim. The **only** permitted adaptation is the constructor line(s) marked `ADAPT-ctor`, copied verbatim from an existing file under `apps/api/src/__tests__/` that instantiates `officialConnectors` (import symbol also adapted to F4's exact exported name). **If no such file exists → `STOP(SEAM_MISSING)` before committing anything of Step 3.** If the disable path requires further store/approval members before returning in the third test, stub them the same way, copied from that same existing test — the invariant under test is only *registered key ⇒ not a 404*.

```ts
import { describe, it, expect, vi } from 'vitest';
import { OfficialConnectors } from '../officialConnectors';           // ADAPT-ctor: exact exported symbol from F4
// constructor wiring imported/factory-copied from the chosen existing test
const unexpected = () => { throw new Error('unexpected store call'); };
function neverStore() {
  return new Proxy({}, { get: (_t, p) =>
    typeof p === 'string' && p !== 'isKnownOutlet' && p !== 'outletFeedUrl'
      ? () => { throw new Error('unexpected call: ' + p); } : undefined });
}
describe('V2 — unknown_outlet gate, both directions', () => {
  it('enable of unregistered key -> 404 unknown_outlet, zero writes', async () => {
    const store = { ...neverStore(), isKnownOutlet: vi.fn(async () => false) };
    const c = new OfficialConnectors(/* ADAPT-ctor args */ store /* remainder copied */);
    await expect(c.setOwnerEnabled('news_rss:ghost_outlet', true)).resolves.toMatchObject({ status: 404, code: 'unknown_outlet' });
    expect(store.isKnownOutlet).toHaveBeenCalled();
  });
  it('disable of unregistered key -> 404 unknown_outlet, zero writes', async () => {
    const store = { ...neverStore(), isKnownOutlet: vi.fn(async () => false) };
    const c = new OfficialConnectors(/* ADAPT-ctor args */ store);
    await expect(c.setOwnerEnabled('news_rss:ghost_outlet', false)).resolves.toMatchObject({ status: 404, code: 'unknown_outlet' });
  });
  it('disable of REGISTERED key still reaches the store (gate never traps)', async () => {
    const store = { ...neverStore(), isKnownOutlet: vi.fn(async () => true) };
    const c = new OfficialConnectors(/* ADAPT-ctor args */ store /* + any further members the same existing test stubs for a disable */);
    await expect(c.setOwnerEnabled('<registered key literal from an existing api test; if none exists, the output of: bash build-artifacts/s1/psqlq.sh -At -c "SELECT <F12.keycol> FROM news_rss_sources ORDER BY 1 LIMIT 1">', false)).resolves.not.toMatchObject({ status: 404 });
    expect(store.isKnownOutlet).toHaveBeenCalled();
  });
});
```

**Acceptance:** tests green → `03-v2-unit.txt`; live artifact `03-v2-live.txt` per the branch above, ending with `SELECT count(*) … WHERE connector_key='news_rss:ghost_outlet'` = **0**.

Commit: `git add apps/api/src/officialConnectors.ts apps/api/src/postgresNewsRssSources.ts apps/api/src/__tests__/officialConnectors.unknownOutlet.test.ts && git commit -m "api: v2 unknown_outlet 404 both directions + regression"`

---

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

**EDIT `apps/api/src/officialConnectors.ts`** — in the **enable path only**, placed strictly **below** the Step-3 `isKnownOutlet` block so the unknown-outlet 404 wins over 409 (gate order E0 before E1), and before the write transaction. The token `enabled` below is replaced by the function's real enable-direction parameter name recorded in F4:

```ts
if (enabled) {                                   // D5: disable is never licence-gated
  const approval = await this.approvals.latestForFamily('<F7.family_value>');  // the single F7-resolved string
  const feedUrl  = await this.store.outletFeedUrl(outletKey);                   // F12 column
  if (!isKeyCovered(approval, feedUrl)) {
    return { status: 409, code: 'contract_not_signed', outletKey, wrote: false };
  }
}
```

(`outletFeedUrl` added to the store the same way as Step 3's `isKnownOutlet`, same SELECT-pattern rule.) This only **adds** a block on enable — no gate is relaxed anywhere. The approvals accessor is the F14-verified injectable seam.

**CREATE** `apps/api/src/__tests__/ownerContractApprovals.feedSet.test.ts` — verbatim:

```ts
import { describe, it, expect } from 'vitest';
import { isKeyCovered } from '../ownerContractApprovals';

describe('S2h — isKeyCovered', () => {
  it('null approval -> covered',        () => expect(isKeyCovered(null, 'http://x')).toBe(true));
  it('NULL set -> covered (legacy)',    () => expect(isKeyCovered({ feed_set_urls: null }, 'http://x')).toBe(true));
  it('URL outside set -> blocked',      () => expect(isKeyCovered({ feed_set_urls: ['http://a'] }, 'http://b')).toBe(false));
  it('URL inside set -> proceeds',      () => expect(isKeyCovered({ feed_set_urls: ['http://a'] }, 'http://a')).toBe(true));
  it('registry row w/ NULL URL -> blocked', () => expect(isKeyCovered({ feed_set_urls: ['http://a'] }, null)).toBe(false));
});
```

Run → green → `04-s2h-unit.txt` → else STOP(ACCEPTANCE_RED).

Commit: `git add apps/api/src/ownerContractApprovals.ts apps/api/src/ownerContractApprovalContracts.ts apps/api/src/officialConnectors.ts apps/api/src/postgresNewsRssSources.ts apps/api/src/__tests__/ownerContractApprovals.feedSet.test.ts && git commit -m "api: s2h feed_set_hash membership gate on enable"`

---

### Step 5 — S1: ship the console inside RootApp

**CREATE `apps/web/src/ownerRouting.ts`** — this file verbatim (D1; non-owner hashes return `{area:false}` and the main surface renders untouched — matching the routing mermaid):

```ts
import { useEffect, useState } from 'react';

export type OwnerHashRoute =
  | { area: false }
  | { area: true; panel: 'outlets' | 'kill-switches' | 'not-found' };

export function parseOwnerHash(hash: string): OwnerHashRoute {
  const h = hash.replace(/^#\/?/, '');
  if (!h.startsWith('owner')) return { area: false };
  if (h === '' || h === 'owner' || h === 'owner/outlets') return { area: true, panel: 'outlets' };
  if (h === 'owner/kill-switches') return { area: true, panel: 'kill-switches' };
  return { area: true, panel: 'not-found' };
}

export function useOwnerHashRoute(): OwnerHashRoute {
  const [route, setRoute] = useState<OwnerHashRoute>(() => parseOwnerHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseOwnerHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
```

**CREATE `apps/web/src/components/OwnerForbiddenPanel.tsx`** — default-exported (so the import below is valid), exact body: a centered panel rendering the literal text `403 · owner_only` (middle dot **U+00B7**, byte-for-byte as in Frame 2), the two explanatory lines of Frame 2, and a link `href="#/"` labelled `back to newsroom`. No API calls.

**EDIT `apps/web/src/RootApp.tsx`** — add imports (`lazy`, `Suspense`, `useOwnerHashRoute`, `OwnerForbiddenPanel`) and at module scope:

```ts
// Governance marker — the ledger asserts this string is in the ENTRY chunk exactly once
// and the console markers are NOT. Anti-drift guard for the App/RootApp split.
const ROOT_APP_OWNER_BOUNDARY = '__SWG_ROOTAPP_OWNER_ROUTE__';
(globalThis as Record<string, unknown>).__SWG_ROOTAPP_OWNER_ROUTE__ = ROOT_APP_OWNER_BOUNDARY;

// F15 decides the form — keep exactly ONE line per panel:
// (F15 shows `export default` in the file:)
const OwnerConsoleLazy = lazy(() => import('./components/OwnerConsolePanel'));
const OwnerKillSwitchLazy = lazy(() => import('./components/OwnerKillSwitchPanel'));
// (F15 shows named-only exports — use instead, with F15's exact export names:)
// const OwnerConsoleLazy = lazy(() => import('./components/OwnerConsolePanel').then(m => ({ default: m.OwnerConsolePanel })));
// const OwnerKillSwitchLazy = lazy(() => import('./components/OwnerKillSwitchPanel').then(m => ({ default: m.OwnerKillSwitchPanel })));
```

and inside the authenticated subtree AuthGate renders (role prop name per F8), add:

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
        {route.panel === 'outlets' ? <OwnerConsoleLazy /> : <OwnerKillSwitchLazy />}
      </Suspense>
    </div>
  );
}
```

Wiring is exactly one ternary in the authenticated render (the existing main surface is preserved **verbatim** in the else branch — D17, no overlay, no deletion):

```tsx
const ownerRoute = useOwnerHashRoute();
const sessionRole = /* F8 session mechanism — the same name it uses, e.g. session.role */;
return ownerRoute.area
  ? <OwnerArea role={sessionRole} />
  : (<>/* EXISTING AUTHENTICATED SUBTREE, VERBATIM, UNTOUCHED */</>);
```

**Api prop rule (D20):** pass **no** `api` prop at all — the panels self-acquire through the D9-edited `ownerConsoleApiRuntime` module. Import `selectOwnerConsoleApi` **only** if F8 proves the panels take an `api` prop (then pass `api={selectOwnerConsoleApi()}` to both lazies); otherwise it is not imported anywhere. Actor reaches the API from the **session**, never from component state or body (Law).

**EDIT `apps/web/src/api/ownerConsoleApiRuntime.ts`** — record the original selection body in BUILD-LOG, then replace only the selection logic (D9): `return import.meta.env.MODE === 'test' || import.meta.env.VITE_OWNER_CONSOLE_DEMO === '1' ? demo : http;` preserving existing export names.

**EDIT `apps/web/src/api/ownerConsoleApiTypes.ts`** — append `'contract_not_signed'` to the existing blocker union (append only), and add `feedSetHash: string | null; signedCount: number; totalOutlets: number;` to the approvals summary type.

**EDIT `apps/web/src/components/OwnerConsolePanel.tsx`** — root element gains `data-testid="owner-console-root"`; header gains the banner line, exact template:
`Contract: {signedCount} / {totalOutlets} in signed set · hash {feedSetHash?.slice(0,8)}… · ADDING OUTLETS REQUIRES RE-ATTESTATION`.

**Acceptance (artifact, mandatory):**

```bash
$PM test -w apps/web > build-artifacts/s1/05-web-test.txt 2>&1 || { cat build-artifacts/s1/05-web-test.txt; exit 1; }
```

"Still green" is now a file (Demo runtime unchanged for tests). Build deferred to Step 6 (markers first, so the first built bundle is the one asserted).

Commit: `git add apps/web/src/ownerRouting.ts apps/web/src/components/OwnerForbiddenPanel.tsx apps/web/src/RootApp.tsx apps/web/src/api/ownerConsoleApiRuntime.ts apps/web/src/api/ownerConsoleApiTypes.ts apps/web/src/components/OwnerConsolePanel.tsx && git commit -m "web: ship /owner console inside RootApp (lazy, role-gated)"`

---

### Step 6 — Markers, ledger, build, budget, mutation drill

**Marker edits.** In `OwnerConsolePanel.tsx`, module scope:

```ts
// Governance marker — asserted by the bundle-marker ledger. Do not remove or rename.
export const GOV_MARKER = '__SWG_OWNER_CONSOLE__';
(globalThis as Record<string, unknown>).__SWG_OWNER_CONSOLE__ = GOV_MARKER;
```

In `OwnerKillSwitchPanel.tsx` — the **identical block as a verbatim find/replace pair** (`GOV_MARKER` → `GOV_MARKER_KS`, `'__SWG_OWNER_CONSOLE__'` → `'__SWG_OWNER_KILL_SWITCH__`'), no interpretation:

```ts
// Governance marker — asserted by the bundle-marker ledger. Do not remove or rename.
export const GOV_MARKER_KS = '__SWG_OWNER_KILL_SWITCH__';
(globalThis as Record<string, unknown>).__SWG_OWNER_KILL_SWITCH__ = GOV_MARKER_KS;
```

**Ledger edits.** EDIT the F10 ledger file — add three entries translated to its existing entry schema, semantics exactly: `__SWG_ROOTAPP_OWNER_ROUTE__` present in the **entry** chunk exactly once; `__SWG_OWNER_CONSOLE__` and `__SWG_OWNER_KILL_SWITCH__` each present in exactly **one non-entry chunk** and **absent from entry**. (The F10 capability check in Step 0 already guaranteed these predicates are expressible; if they turn out not to be, `STOP(LEDGER_MISSING)` with the schema excerpt — never degrade to presence-only.)

**Fixed order of operations (do not reorder):** panel-marker edits → ledger edits → build → ledger green → mutation → build → ledger must fail → revert → rebuild → ledger green → commit all together.

```bash
set -a; . "$HOME/.config/swanguard/build.env"; set +a
$PM run build -w apps/web 2>&1 | tee build-artifacts/s1/07-build.txt
$LEDGER_CMD 2>&1 | tee build-artifacts/s1/08-ledger.txt        # MUST exit 0 → else STOP(ACCEPTANCE_RED)

# size budget vs the Step-0 baseline (gzip bytes):
E_NEW=$(grep -o 'assets/[^"]*\.js' apps/web/dist/index.html | head -1)
E_OLD=$(grep -o 'assets/[^"]*\.js' build-artifacts/s1/dist-baseline/index.html | head -1)
NEW_G=$(gzip -c "apps/web/dist/$E_NEW" | wc -c)
OLD_G=$(gzip -c "build-artifacts/s1/dist-baseline/$E_OLD" | wc -c)
for f in apps/web/dist/assets/*.js; do printf '%s %s %s\n' "$(wc -c <"$f")" "$(gzip -c "$f" | wc -c)" "$(basename "$f")"; done | tee build-artifacts/s1/07-sizes.txt
node -e 'const fs=require("fs");const rows=fs.readFileSync("build-artifacts/s1/07-sizes.txt","utf8").trim().split("\n").map(l=>l.split(/\s+/));fs.writeFileSync("build-artifacts/s1/07-sizes.json",JSON.stringify({entry_gzip_new:Number(process.argv[1]),entry_gzip_baseline:Number(process.argv[2]),entry_gzip_delta:Number(process.argv[1])-Number(process.argv[2]),chunks:rows.map(r=>({file:r[2],bytes:Number(r[0]),gzip:Number(r[1])}))},null,2))' "$NEW_G" "$OLD_G"
```

Budget rules (read from `07-sizes.json`): entry-chunk gzip delta ≤ **2048 bytes**; each lazy console chunk (the chunks containing the console markers) ≤ **153600 bytes** gzip. Breach → `STOP(BUDGET_BREACH)` — Sean decides, not Qwen.

**Mutation drill (mandatory, then revert):**

```bash
sed -i 's/__SWG_OWNER_CONSOLE__/__SWG_OWNER_CONSOLE_X__/' apps/web/src/components/OwnerConsolePanel.tsx
$PM run build -w apps/web && $LEDGER_CMD 2>&1 | tee build-artifacts/s1/08b-mutation.txt   # MUST exit non-zero
git checkout -- apps/web/src/components/OwnerConsolePanel.tsx
$PM run build -w apps/web && $LEDGER_CMD   # MUST exit 0
```

Commit (all Step-6 changes together): `git add apps/web/src/components/OwnerConsolePanel.tsx apps/web/src/components/OwnerKillSwitchPanel.tsx <F10 ledger file path> && git commit -m "web: governance markers + ledger entries + size budget"`

---

### Step 7 — RootApp runtime test (the drift killer)

**CREATE** `apps/web/src/__tests__/rootAppOwnerRoute.test.tsx` — imports **`RootApp` directly**; the file opens with this comment verbatim: *"This test deliberately does NOT use testAppHarness. The panel found the console 'shipped' only in App.tsx via the harness while production rendered RootApp. This file renders the production entry."* Session injection uses the F8 seam applied to RootApp — never the harness itself (D17). The mount is wrapped in **exactly the provider elements `apps/web/src/main.tsx` composes around RootApp**, structure mirrored, no DOM side effects; if `main.tsx` is unclear → `STOP(SEAM_MISSING)`. Every `waitFor` uses `{ timeout: 5000 }`. The literal `403 · owner_only` in the assertion is copied byte-for-byte (U+00B7) from `OwnerForbiddenPanel.tsx` source:

```tsx
// This test deliberately does NOT use testAppHarness. The panel found the console
// "shipped" only in App.tsx via the harness while production rendered RootApp.
// This file renders the production entry.
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { RootApp } from '../RootApp';   // import form adapted to RootApp's actual export (F8)

describe('S1 — RootApp owner route (production entry)', () => {
  it('owner at #/owner/outlets renders the lazy console', async () => {
    window.location.hash = '#/owner/outlets';
    render(<PROVIDERS_FROM_MAIN_TSX><RootApp /* F8 session injection: role=owner */ /></PROVIDERS_FROM_MAIN_TSX>);
    await waitFor(() =>
      expect(document.querySelector('[data-testid="owner-console-root"]')).not.toBeNull(),
      { timeout: 5000 });
  });
  it('viewer at #/owner/outlets gets 403 · owner_only and no console', async () => {
    window.location.hash = '#/owner/outlets';
    render(<PROVIDERS_FROM_MAIN_TSX><RootApp /* F8 session injection: role=viewer */ /></PROVIDERS_FROM_MAIN_TSX>);
    await waitFor(() =>
      expect(document.body.textContent).toContain('403 · owner_only'),   // U+00B7, byte-for-byte
      { timeout: 5000 });
    expect(document.querySelector('[data-testid="owner-console-root"]')).toBeNull();
  });
});
```

Run → green → `09-rootapp-test.txt` → else STOP(ACCEPTANCE_RED). Verify F11 shows the ledger job runs in CI (read-only check; if absent → `STOP(LEDGER_MISSING)`).

Commit: `git add apps/web/src/__tests__/rootAppOwnerRoute.test.tsx && git commit -m "test: rootapp owner route (no testAppHarness)"`

---

### Step 8 — e2e on the built preview

**CREATE** `scripts/e2e/s1OwnerConsole.e2e.mjs`. It reads `~/.config/swanguard/build.env` (never argv — the script itself opens that file), and executes assertions **E1–E9** in order. Mechanics are fixed:

- **Static server (no new deps, no sudo):** `spawn('python3', ['-m','http.server','4173','--bind','127.0.0.1','--directory', DIST])`; poll `GET /` until 200 (≤60 × 1s); `srv.kill()` in `finally`.
- **E1:** fetch `/`, extract the entry chunk from `<script … src="/assets/X.js">`; assert `!entry.includes('__SWG_OWNER_CONSOLE__')`.
- **E2:** start the built `apps/api` (esbuild — Linux/radar) via the F2 start string in tmux session `swg-dev-api` (`tmux new-session -d -s swg-dev-api -c "$HOME/SwanGuard-Newsroom" 'bash -lc "set -a; . ~/.config/swanguard/build.env; set +a; <F2 api start cmd>"'`); health = a successful TCP connect to the F2 port. **Before any E-call:** `tmux pipe-pane -o -t swg-dev-api 'cat >> build-artifacts/s1/api.log'` (this log feeds the Step-9 proof).
- **E3 (deterministic pick, via psqlq):** `SELECT <F12.keycol> FROM news_rss_sources s LEFT JOIN official_connector_states c ON c.connector_key = s.<F12.keycol> WHERE COALESCE(c.owner_enabled,false)=false ORDER BY 1 LIMIT 1`.
- **E4 (owner enable):** owner token → enable E3's outlet (request body's phrase field name from **F13b**; the correct phrase read **only** from the env var) → **200**; then `SELECT actor FROM <audit table> ORDER BY occurred_at DESC LIMIT 1` = the session owner principal (**actor from session, never body** — Law). Audit table pinning: `grep -n "CREATE TABLE" packages/database/migrations/0022*.sql` → table + actor/action/occurred_at column names; if 0022 lacks them, widen with `grep -rln audit packages/database/migrations | tail -1`; unresolved → `STOP(SCHEMA_MISMATCH)`.
- **E5 (non-owner):** viewer token → same enable call → **HTTP 403**; state/audit snapshots before/after must be deep-equal: `SELECT json_build_object('row',(SELECT row_to_json(t) FROM official_connector_states t WHERE connector_key='$K'),'audits',(SELECT count(*) FROM $AUDIT))`.
- **E6 (ghost):** owner token → enable `news_rss:ghost_outlet` → **404**; disable same → **404**; state count for that key = 0.
- **E7 (unsigned negative control, data-level):** unit proof is Step 4; here pin the summary route first — `grep -rn "summary" apps/api/src/index.ts apps/api/src/featureDispatchOwnerOperator.ts | head -20` → record the route (`ROUTE_SUMMARY`); absent → `STOP(SEAM_MISSING)`. Owner token → `ROUTE_SUMMARY` returns `signedCount=39`, `totalOutlets=39`, `feedSetHash` matching `01-backfill-hashcheck.json`'s `stored` hex.
- **E8 (phrase attempt):** owner enable with wrong phrase (literal `'wrong-phrase-e2e'` in the F13b field) → no state change (existing behavior — proves no gate was relaxed by this increment).
- **E9 (revert):** owner disable of E3's outlet → 200; `owner_enabled=false`; an audit row exists for the disable (proves D5: disable never licence-gated).

**Output shape (fixed):** the script writes each result to `build-artifacts/s1/10-e2e.json` as `{"inc":"INC-S1+V2+V3+S2h","results":[{"id":"E1","pass":true,"evidence":{}},…],"finished_at":"<ISO>"}`, then **re-reads the file and exits 1 if any `"pass":false`**. Execution gate:

```bash
set -a; . "$HOME/.config/swanguard/build.env"; set +a
node scripts/e2e/s1OwnerConsole.e2e.mjs 2>&1 | tee build-artifacts/s1/10-e2e-run.txt
grep -q '"pass":false' build-artifacts/s1/10-e2e.json && exit 1 || true
```

Commit: `git add scripts/e2e/s1OwnerConsole.e2e.mjs && git commit -m "e2e: s1 owner console built-preview suite"`

---

### Step 9 — V4 record (bounded conditional, both branches pre-specified)

Run the F13 body-logging grep.

- **(a) Bodies not logged:** append `phrase-not-logged: verified` + the grep output to BUILD-LOG, then run the log-sweep proof below against `build-artifacts/s1/api.log` (populated by Step 8's pipe-pane).
- **(b) Bodies logged:** apply exactly one edit — add the activation-phrase field (F13b's name) to the logger's existing redaction list (file per F13; if the logger has no redaction list, CREATE one list containing only that field and apply it to body logging). Rebuild the API, truncate the log (`: > build-artifacts/s1/api.log`), restart `swg-dev-api` with pipe-pane, rerun `node scripts/e2e/s1OwnerConsole.e2e.mjs`, then run the sweep — PASS requires `hits=0` **after** the edit. Record the rerun in BUILD-LOG. Nothing else changes.

**Log-sweep proof (phrase never on argv, never in artifacts):**

```bash
set -a; . "$HOME/.config/swanguard/build.env"; set +a
f=$(mktemp); umask 077; printf '%s' "$SWG_E2E_ACTIVATE_PHRASE" > "$f"
grep -RIl -F -f "$f" build-artifacts/s1/api.log | wc -l; hits=$(grep -RIl -F -f "$f" build-artifacts/s1/api.log | wc -l); shred -u "$f"
printf 'phrase_occurrences_in_logs=%s\n' "$hits" >> build-artifacts/s1/09-v4-proof.txt
```

PASS = `hits=0` (branch a) or `hits=0` after the redaction edit (branch b). After PASS is recorded, remove the raw log — its evidentiary value is captured in `09-v4-proof.txt` and it may otherwise hold request data: `rm -f build-artifacts/s1/api.log`.

Commit: `git add <F13 logger file, only branch b> && git commit -m "chore: v4 phrase-log verification record"` — in branch (a), commit with `--allow-empty`: `git commit --allow-empty -m "chore: v4 phrase-log verification record"`.

---

### Step 10 — Seal

**Token sweep (artifacts must contain only sha256 digests of the tokens):**

```bash
set -a; . "$HOME/.config/swanguard/build.env"; set +a
for VAR in SWG_E2E_OWNER_TOKEN SWG_E2E_VIEWER_TOKEN; do
  f=$(mktemp); umask 077; printf '%s' "${!VAR}" > "$f"
  hits=$(grep -RIl -F -f "$f" build-artifacts/s1/ | wc -l); shred -u "$f"
  printf 'token_hits[%s]=%s\n' "$VAR" "$hits" >> build-artifacts/s1/10-seal.txt
done
```

Both hits must be 0; any hit → `STOP(ACCEPTANCE_RED)` before tagging (record the offending file names in `STOP-REPORT.md`; digests only, never contents).

**Tag + verified teardown (rerunnable):**

```bash
git tag increment/s1-v2-v3-s2h && git tag --points-at HEAD | grep -qx increment/s1-v2-v3-s2h
docker rm -f swg-scratch >/dev/null 2>&1 || true
```

Write `build-artifacts/s1/INDEX.md` listing every artifact with a one-line meaning (including `00-prefact.json`, `00-compose.json`, `00-pgident.json`, `07-baseline.sizes`, `dist-baseline/`, `01-*` through `11-*`). **No push.**

---

### Step 11 — Serve on radar (runbook execution)

Everything executes **on radar** (Ubuntu 24.04, non-sudo user) — radar's Linux is what unblocks the `apps/api` esbuild step (Linux-ELF binary, dead on the Windows checkout); this is the first increment whose full build+e2e can run. Serving, tailnet-scoped, no sudo:

```bash
set -a; . "$HOME/.config/swanguard/build.env"; set +a
TI=$(tailscale ip -4)   # F9
tmux new-session -d -s swanguard-api -c "$HOME/SwanGuard-Newsroom" 'bash -lc "set -a; . ~/.config/swanguard/build.env; set +a; <F2 api start cmd>"'
tmux new-session -d -s swanguard-web -c "$HOME/SwanGuard-Newsroom/apps/web" "python3 -m http.server 4173 --bind $TI --directory dist"
```

Hash routing means static serve needs no SPA fallback. Sean's console URL: **`http://<radar-host>:4173/#/owner/outlets`**, over Tailscale, from any browser. Durability: tmux survives logout, not reboot; `systemd --user` + `loginctl enable-linger` is the follow-up and needs one sudo from Sean — queued, not Qwen's. If `tailscale ip -4` was empty (F9), bind `127.0.0.1` and let Sean expose via `tailscale serve` — record which branch in `11-serve.txt`.

**Artifacts (`11-serve.txt`):** both `curl -s -o /dev/null -w '%{http_code}' http://<F9-ip>:4173/` → 200; `tmux ls`; plus the **F16 CORS record** (observation only — no API edits, the API is outside this increment's manifest): `known_limit_cors: true|false` with the F16 grep excerpt, and whether the Http client sends `credentials:'include'` — a page on `:4173` calling the API on another origin may be blocked by CORS; if so, that is a known limit for Sean to resolve, recorded here, not patched by Qwen.

---

## 4. Forward roadmap (context for Sean — NOT this build)

- **S3a** Probe spec (`probe.toml`) + recurring re-probe; drift report vs 2026-08-21.
- **S3b** Identity + licence registry for the 107; `independence_group_id`; merge script refuses unreviewed rows.
- **S4** Freeze: provenance columns + retention budget + shadow enforcement job + **lifecycle decision (V1)**.
- **S5** Seed 107 dormant + live batch of 10 + mid-batch abort drill + single-phrase batch API (D15) + attestation UX for explicit-set authoring (D19).
- **S6** Loadgen: 146 outlets / ~3k items on scratch live Postgres; quota ceiling observed firing.
- **S7** `news` as third `WikiSourceModule`; missing family mapping = compile error.
- **S8** Claim extraction; zero-evidence claims rejected loudly; CI bans joins on restated text.
- **S9** Clustering + syndication vs corroboration fixtures; hash-identical clusters.
- **S10** Disagreement map; system-written verdicts refused by trigger.
- Queued (Sean, one sudo): `systemd --user` + linger for radar durability; CORS posture for the split-origin serve (F16 record).

---

## 5. Qwen execution protocol

**Builder: do these in this order — Step 0 → 11. After each step run ITS command(s), compare against ITS expected artifact, then commit with ITS message. If anything fails, does not match, or a fact table entry hits a STOP rule: write `STOP-REPORT.md` (fields: step, command, expected, actual, STOP code) and HALT. Do not improvise. Do not refactor adjacent code. Do not edit files outside the manifest. Do not add dependencies. Do not touch migrations 0001–0029. Do not push. Never place a token, password, or the activation phrase on a command line or in an artifact — secrets live in `~/.config/swanguard/build.env` (chmod 600), artifacts carry sha256 digests only (LoadCredential law). Any shell step needing those values starts with `set -a; . "$HOME/.config/swanguard/build.env"; set +a`. `$LEDGER_CMD` always means the invocation persisted at F10 time.**

**Laws, verbatim in intent — every edit must preserve them; if a step could relax a gate, refuse and STOP:**
1. Every creator/outlet is born DISABLED. `enabled/owner_enabled` goes true through exactly ONE route (owner-attributed, audit event in the SAME transaction). Actor comes from the SESSION, never the body.
2. Anything that shapes the feed FILTERS the enabled set; only the owner WRITES to it.
3. Reads must not write — after this increment, literally, in every environment.
4. The real gate is `official_connector_states.owner_enabled`. `lifecycle=dormant` is display metadata (V1 deferred to S4): no copy, comment, or UI label this increment may call it a gate.

**STOP codes:** `ENV · SCHEMA_MISMATCH · SCOPE_AMBIGUOUS · AUTH_MECHANISM · SEAM_MISSING · LEDGER_MISSING · BUDGET_BREACH · ACCEPTANCE_RED`

---

## 6. Radar deployment note

The dev DB (`docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d`, Postgres port 5434) and the scratch DB (port 5435, throwaway) both run on radar. The build, tests, ledger, mutation drill, and e2e all run on radar (D16). Serving follows Step 11 exactly: `python3 -m http.server` on the tailscale IP in `tmux`, non-sudo (D13). The canonical operator URL is `/#/owner/outlets` — hash routing means no SPA fallback is needed. The Windows checkout is never used for anything that runs `apps/api` build tooling.

---

## 7. Closing

**(a) Ordered file-operation manifest**

```
CREATE build-artifacts/s1/{BUILD-LOG.md,00-prefact.json,00-compose.json,00-pgident.json,psqlq.sh,
       dist-baseline/,07-baseline.sizes}                                    (untracked artifacts, Step 0)
CREATE ~/.config/swanguard/build.env  (chmod 600; OWNER/VIEWER tokens, API base, phrase, LEDGER_CMD)
CREATE packages/database/migrations/0030_owner_gate_hardening.sql
EDIT   apps/api/src/ownerKillSwitches.ts                                   (delete first-read seeding block only)
EDIT   apps/api/src/officialConnectors.ts                                  (V2 gate — conditional branch b; S2h check — always)
EDIT   apps/api/src/postgresNewsRssSources.ts                              (isKnownOutlet, outletFeedUrl)
EDIT   apps/api/src/ownerContractApprovals.ts                              (isKeyCovered + read-model columns)
EDIT   apps/api/src/ownerContractApprovalContracts.ts                      (additive serializer fields)
CREATE apps/api/src/__tests__/ownerKillSwitches.readOnly.test.ts
CREATE apps/api/src/__tests__/officialConnectors.unknownOutlet.test.ts
CREATE apps/api/src/__tests__/ownerContractApprovals.feedSet.test.ts
CREATE apps/web/src/ownerRouting.ts
CREATE apps/web/src/components/OwnerForbiddenPanel.tsx
EDIT   apps/web/src/RootApp.tsx                                            (marker, lazy panels, OwnerArea, one ternary)
EDIT   apps/web/src/api/ownerConsoleApiRuntime.ts                          (D9 selection)
EDIT   apps/web/src/api/ownerConsoleApiTypes.ts                            (append blocker + summary fields)
EDIT   apps/web/src/components/OwnerConsolePanel.tsx                       (banner + testid + GOV_MARKER)
EDIT   apps/web/src/components/OwnerKillSwitchPanel.tsx                    (GOV_MARKER_KS)
EDIT   <F10 ledger file>                                                   (three marker entries)
CREATE apps/web/src/__tests__/rootAppOwnerRoute.test.tsx
CREATE scripts/e2e/s1OwnerConsole.e2e.mjs
EDIT   <F13 logger>                                                        (ONLY branch b of Step 9)
CREATE build-artifacts/s1/{01…11}* evidence artifacts
       (01-orphans, 01-backfill, 01-backfill-hashcheck, 01-pre/01-post, 01-fresh,
        01-reaper-fresh, 02-v3, 03-v2-unit, 03-v2-live, 04-s2h-unit, 05-web-test,
        07-build, 07-sizes.{txt,json}, 08-ledger, 08b-mutation, 09-rootapp-test,
        09-v4-proof, 10-e2e-run, 10-e2e, 10-seal, 11-serve, api.log [ephemeral, removed in Step 9], INDEX.md)
```

**(b) Highest-risk step and mitigation.** Step 1 §A2 — the backfill binding the 39 URLs to the **wrong approval row** would either silently reproduce the "family attestation covers everything" status quo (the licence hole this increment exists to close) or wrongly block all 39. Mitigation: fact F7's row dump with a hard `STOP(SCOPE_AMBIGUOUS)` on any ambiguity **including the no-candidate-row case** (outcome iv — which would otherwise silently ship a 0/39 console), the collation-pinned (`COLLATE "C"` both sides) sha256 recompute proof in `01-backfill-hashcheck.json`, and E7's live assertion `signedCount=39/39` with the Step-4 unit negative control.

**(c) The exact first command Qwen runs to begin:**

```bash
cd "$HOME/SwanGuard-Newsroom" && git fetch origin --quiet && git checkout merge/newsroom-mainline-v3 --quiet && git rev-parse HEAD
```

Expected output begins `745867e`. Anything else → `STOP-REPORT.md`, code `ENV`, halt.
