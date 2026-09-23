# GLM Consult

**Model:** glm-5.3-flash
**Document:** C:/tmp/swanguard-glm-flash-harden.md
**Tokens:** 11323 in / 24000 out (reasoning: 18355) | total 35323
**Wall:** 581.4s

---

# HARDENING PATCH — INC-S1+V2+V3+S2h

## BLOCKERS

**B1 · Step 0 preamble · poisoned first command**
The line `` `git -C "$HOME/SanGuard"…` — no: exact commands: `` contains a wrong repo path that a literal worker may execute. **Fix:** delete that line entirely. The only valid first command is the §7(c) block, verbatim: `cd "$HOME/SwanGuard-Newsroom" && git fetch origin --quiet && git checkout merge/newsroom-mainline-v3 --quiet && git rev-parse HEAD`.

**B2 · Step 0.2 · `psqlq.sh` is written with undefined variables**
As printed, `psqlq.sh` dereferences `$PGC/$PGU/$PGD` that are never defined inside the file — every later invocation dies. **Fix:** write the file with the expanded values substituted at authoring time (not shell defaults):

```bash
#!/usr/bin/env bash
set -euo pipefail
PGC='<literal container Name>'
PGU='<literal user>'
PGD='<literal db>'
exec docker exec -i "$PGC" psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1 "$@"
```

Extract values without jq (no-new-deps law) via python3 stdlib, tolerant of both compose-ps output shapes:

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

**B3 · Step 1 · fallback migration loop destroys the run on the dev DB**
`for f in packages/database/migrations/*.sql` replays 0001–0029 against an already-migrated DB → `ON_ERROR_STOP` fires on 0001 → halt, and it violates "Do not touch migrations 0001–0029". **Fix:** dev DB gets exactly the one new file; the all-files loop is reserved exclusively for the scratch DB (Step 1 acceptance):

```bash
# dev DB (one file only):
docker exec -i "$PGC" psql -U "$PGU" -d "$PGD" -v ON_ERROR_STOP=1 \
  < packages/database/migrations/0030_owner_gate_hardening.sql || exit 1
# scratch DB only (later): see M6/01-fresh
for f in $(ls packages/database/migrations/*.sql | sort -V); do
  docker exec -i swg-scratch psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f" || exit 1
done
```

If F3 finds a tracked runner, prefer it; if it misbehaves, use the above and record `runner_fallback_used: true`.

**B4 · Step 1 §A2b · pseudo-SQL cannot be pasted**
`WHERE clause: feed_set_urls IS NULL AND <scope IS NULL / wildcard>` is prose. **Exact A2b text** (choose mechanically, never author):

```sql
UPDATE contract_approvals ca
SET feed_set_urls = s.urls,
    feed_set_hash = encode(sha256(convert_to(array_to_string(s.urls, E'\n'), 'UTF8')), 'hex')
FROM (SELECT array_agg(feed_url ORDER BY feed_url COLLATE "C") AS urls
      FROM news_rss_sources WHERE feed_url IS NOT NULL) s
WHERE ca.feed_set_urls IS NULL
  AND ca.<F7.family_col> IS NULL;
```

New fourth outcome added to the A2 decision: **(iv)** no candidate row at all → `STOP(SCOPE_AMBIGUOUS)` — falling through would silently ship a 0/39 console. Also pin: the family VALUE `'news_rss'` in §A2 and the `latestForFamily('news_rss')` argument in Step 4 must both come from the single F7-resolved string.

**B5 · Steps 2 & 8 · `<REDACTED-DB-URL>` is unrunnable**
Literal resolution (throwaway creds on the D11 scratch container only, passed by env — never argv):

```
SWG_TEST_DATABASE_URL=postgresql://postgres:scratch@127.0.0.1:5435/postgres
SWG_TEST_N_DEFAULTS=<integer recorded as F6.N_DEFAULTS>
```

**B6 · Step 8 E4/E8/E9 + Step 0.5 · the activation phrase is missing from build.env**
Enable is gated on the exact phrase; without it E4/E9 (positive enable) and E8 (wrong phrase) are impossible. Extend `~/.config/swanguard/build.env` schema exactly:

```
SWG_E2E_OWNER_TOKEN=
SWG_E2E_VIEWER_TOKEN=
SWG_E2E_API_BASE=
SWG_E2E_ACTIVATE_PHRASE=
LEDGER_CMD=
```

Add fact **F13b**: `grep -rn "phrase\|activation" apps/api/src | head -40` → record the request BODY FIELD NAME carrying the phrase. Absent → `STOP(AUTH_MECHANISM)`.

**B7 · Steps 3b & 4 · tests are pseudocode comments, i.e. authorship**
Ship these files verbatim.

Step 4 test (pure helper — fully determined, five cases):

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

Step 3b file — the ONLY permitted adaptation is the constructor line marked `ADAPT-CTOR`, copied verbatim from an existing file under `apps/api/src/__tests__/` that instantiates officialConnectors; **if no such file exists → `STOP(SEAM_MISSING)` before committing anything of Step 3**:

```ts
import { describe, it, expect, vi } from 'vitest';
import { OfficialConnectors } from '../officialConnectors';           // ADAPT-CTOR: exact exported symbol
// import or factory from the chosen existing test for construction wiring
const unexpected = () => { throw new Error('unexpected store call'); };
function neverStore() {
  return new Proxy({}, { get: (_t, p) =>
    typeof p === 'string' && p !== 'isKnownOutlet' && p !== 'outletFeedUrl'
      ? () => { throw new Error('unexpected call: ' + p); } : undefined });
}
describe('V2 — unknown_outlet gate, both directions', () => {
  it('enable of unregistered key -> 404 unknown_outlet, zero writes', async () => {
    const store = { ...neverStore(), isKnownOutlet: vi.fn(async () => false) };
    const c = new OfficialConnectors(/* ADAPT-_ctor args */ store /* remainder copied */);
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
    const c = new OfficialConnectors(/* ADAPT-ctor args */ store);
    await expect(c.setOwnerEnabled('<pick literal from an existing api test>', false)).resolves.not.toMatchObject({ status: 404 });
    expect(store.isKnownOutlet).toHaveBeenCalled();
  });
});
```

**B8 · Step 5 · `parseOwnerHash` routes every non-owner hash into the ForbiddenPanel, killing the main surface**
This contradicts mermaid HR2 (“hash-route /owner/\* ? no → MAIN”). Replace `ownerRouting.ts` wholesale:

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

RootApp wiring is then exactly one ternary: `{route.area ? <OwnerArea role={sessionRole} /> : (<>EXISTING_AUTHENTICATED_SUBTREE_VERBATIM</>)}`, where `sessionRole` is acquired via the F8 mechanism. Primary rule for the api prop: **pass no api prop at all** — panels self-acquire via the D9-edited runtime module; `selectOwnerConsoleApi` is imported only if F8 proves a prop exists (removes the unused-import lint trap). `/owner/typo` still renders the ForbiddenPanel inside OwnerArea, as specced.

## GAPS

**G1 · F12 circularity.** You cannot run `WHERE <keycol> LIKE 'news_rss:%'` before knowing keycol. Exact procedure:
```bash
bash build-artifacts/s1/psqlq.sh -At -c "SELECT column_name FROM information_schema.columns \
 WHERE table_name='news_rss_sources' AND data_type IN ('text','character varying','character')"
```
For each returned column run `SELECT count(*) FROM news_rss_sources WHERE "<col>" LIKE 'news_rss:%';`. Exactly one column with count=39 is `<F12.keycol>`. Zero or >1 → `STOP(SCHEMA_MISMATCH)`. Also pre-verify: `ls packages/database/migrations | sort -V | tail -1` begins `0029` else `STOP(SCHEMA_MISMATCH)`.

**G2 · Reaper NULL trap.** `NOT IN (subquery)` silently deletes nothing if the registry column ever holds NULL (unique-col case). Replace §C exactly:
```sql
DELETE FROM official_connector_states c
WHERE c.connector_key LIKE 'news_rss:%'
  AND NOT EXISTS (SELECT 1 FROM news_rss_sources s WHERE s.<F12.keycol> = c.connector_key);
```

**G3 · Hash-recompute collation flake.** SQL `array_agg(... ORDER BY feed_url)` sorts under DB locale; JS `.sort()`/`.join` sorts by UTF-16 units — non-byte-safe for mixed case. Fixes: use `COLLATE "C"` in both A2a/A2b array_agg (as in B4), and this exact checker appended to `01-backfill.json`:
```bash
H=$(bash build-artifacts/s1/psqlq.sh -At -c "SELECT feed_set_hash FROM contract_approvals WHERE feed_set_urls IS NOT NULL LIMIT 1")
J=$(bash build-artifacts/s1/psqlq.sh -At -c "SELECT json_agg(u)::text FROM (SELECT feed_url u FROM news_rss_sources WHERE feed_url IS NOT NULL ORDER BY u COLLATE \"C\") t")
node -e 'const[h,j]=[process.argv[1],JSON.parse(process.argv[2])];const d=require("crypto").createHash("sha256").update(h?.length&&j.join("\n"),"utf8");console.log(JSON.stringify({stored:process.argv[1],computed:d.digest("hex"),urls:j.length}))' "$H" "$J" > build-artifacts/s1/01-backfill-hashcheck.json
```
PASS = `computed === stored` and `urls === 39` in the JSON (record it, not free-form).

**G4 · §B literal transcription rules.** Single-quote doubling `''`; NULL bare; booleans `true/false` lowercase; numbers unquoted; text arrays `'{}'`; timestamptz values cast `'...'::timestamptz`. Preserve F6 source order. Any jsonb/blob-typed default column → `STOP(SCHEMA_MISMATCH)` (transcription fidelity cannot be guaranteed).

**G5 · Placeholder-free seal for 0030.** Acceptance line (runs AFTER substitutions):
```bash
grep -nE '\<[A-Z][A-Z0-9_]*(_col|_table|_pk|DEFAULTS)\>' packages/database/migrations/0030_owner_gate_hardening.sql && { echo PLACEHOLDER_REMAINS; exit 1; } || true
```

**G6 · pg_dump artifact commands.**
```bash
docker exec "$PGC" pg_dump -U "$PGU" -d "$PGD" --data-only --inserts \
  -t contract_approvals -t official_connector_states -t "$F6_TABLE" > build-artifacts/s1/01-pre.sql
# second apply, then same command → 01-post.sql
sha256sum build-artifacts/s1/01-{pre,post}.sql   # digests must be equal
```

**G7 · Ghost-key sanity.** Before any Step-3 probe: `SELECT count(*) FROM news_rss_sources WHERE <F12.keycol>='news_rss:ghost_outlet'` must be **0**, else `STOP(SCHEMA_MISMATCH)`.

**G8 · Probe pollution rollback.** The branch-(b) *detection* disable may itself write an orphan row (it runs before the gate lands). After the edit, if `SELECT count(*) FROM official_connector_states WHERE connector_key='news_rss:ghost_outlet'` = 1, run exactly:
`bash build-artifacts/s1/psqlq.sh -c "DELETE FROM official_connector_states WHERE connector_key='news_rss:ghost_outlet'"` and record the line in `03-v2-live.txt` as `fixture_rollback:`. This is de-pollution of our own probe, not a state write.

**G9 · 404-insert return-shape fallback.** Try the four-field literal; if TypeScript rejects fields, use `{ status: 404, code: 'unknown_outlet' }` (drop trailing fields only). Record which shape compiled in BUILD-LOG. `isKnownOutlet`/`outletFeedUrl` client-acquisition: copy the EXACT pattern of any existing SELECT in `postgresNewsRssSources.ts`; if the store contains no prior SELECT → `STOP(SEAM_MISSING)`.

**G10 · Move the approvals-seam discovery to Step 0 (ordering).** Add fact **F14** in the Step-0 table: `grep -rn "approval" apps/api/src/index.ts apps/api/src/featureDispatchOwnerOperator.ts apps/api/src/officialConnectors.ts | head -30`. No injectable approvals accessor usable from `officialConnectors` → `STOP(SEAM_MISSING)` **now**, before migration/console land — otherwise a mid-build halt ships a half-hardened increment.

**G11 · Step 4 insertion position.** Paste the S2h block strictly BELOW the Step-3 `isKnownOutlet` block, so unknown-outlet 404 wins over 409 (mermaid E0 before E1). Replace token `enabled` in the pasted block with the function's real enable-direction parameter name.

**G12 · Fact-F15 default-export audit:** `grep -n "export default" apps/web/src/components/OwnerConsolePanel.tsx apps/web/src/components/OwnerKillSwitchPanel.tsx`. Named-only panels require:
`lazy(() => import('./components/OwnerConsolePanel').then(m => ({ default: m.OwnerConsolePanel })))` (mirror for kill-switch with its export name).

**G13 · Ledger capability check.** Three entries semantically require: present-in-exactly-one-non-entry-chunk ×2 + present-exactly-once-in-entry + absent-from-entry. If F10's schema can't express a predicate, do NOT degrade to presence-only (weakens the drift guard): `STOP(LEDGER_MISSING)` with the schema excerpt. Persist the runnable invocation as `LEDGER_CMD=` in build.env at F10 time; all six `$PM run build && <ledger cmd>` sites become `$LEDGER_CMD`.

**G14 · Baseline build for the size budget is nowhere scheduled.** Append to Step 0, after install: `$PM run build -w apps/web` (exact script name from F1) → `cp -r apps/web/dist build-artifacts/s1/dist-baseline` → write `07-baseline.sizes` containing per-chunk entry/gzip bytes:
`for f in build-artifacts/s1/dist-baseline/assets/*.js; do printf '%s %s %s\n' "$(wc -c <"$f")" "$(gzip -c "$f" | wc -c)" "$(basename "$f")"; done | tee build-artifacts/s1/07-baseline.sizes`.

**G15 · Mutation-drill ordering.** Fixed order inside Step 6: panel-marker edits → ledger edits → build → `$LEDGER_CMD` green (`08-ledger.txt`) → sed mutation → build → `$LEDGER_CMD` must exit ≠0 (`08b-mutation.txt`) → `git checkout -- apps/web/src/components/OwnerConsolePanel.tsx` → rebuild → green → commit all together. Kill-switch panel gets the identical marker block with constant/name `GOV_MARKER_KS` / `'__SWG_OWNER_KILL_SWITCH__'` — a verbatim find/replace pair, no interpretation.

**G16 · Step 7 details.** (a) Wrap the mount in exactly the provider elements `apps/web/src/main.tsx` composes around RootApp (structure mirrored, no DOM side effects) — unclear main.tsx → `STOP(SEAM_MISSING)`. (b) All `waitFor(..., { timeout: 5000 })`. (c) Copy the literal `403 · owner_only` byte-for-byte from OwnerForbiddenPanel source into the assertion (middle dot U+00B7).

**G17 · Step 8 mechanics.** Static server: `spawn('python3', ['-m','http.server','4173','--bind','127.0.0.1','--directory', DIST])`, poll `GET /` until 200 (≤60×1s), `srv.kill()` in `finally` (no new deps; no sudo). E1: fetch `/`, extract `<script …src="/assets/X.js">` → entry chunk; assert `!entry.includes('__SWG_OWNER_CONSOLE__')`. E2: launch per F2 start string in tmux session `swg-dev-api`, health = successful TCP connect to F2 port. Start `tmux pipe-pane -o -t swg-dev-api 'cat >> build-artifacts/s1/api.log'` before E-calls (feeds M5). E4/E8 bodies: phrase field name from F13b; correct phrase read ONLY from env. E5 snapshots: `SELECT json_build_object('row',(SELECT row_to_json(t) FROM official_connector_states t WHERE connector_key='$K'),'audits',(SELECT count(*) FROM $AUDIT))` before/after; deep-equal. Audit table pinning: `grep -n "CREATE TABLE" packages/database/migrations/0022*.sql` → table + actor/action/occurred_at column names; 0022 missing those → widen with `grep -rln audit packages/database/migrations | tail -1`; unresolved → `STOP(SCHEMA_MISMATCH)`. Summary-route pinning (E7): `grep -rn "summary" apps/api/src/index.ts apps/api/src/featureDispatchOwnerOperator.ts | head -20` → `ROUTE_SUMMARY`; absent → `STOP(SEAM_MISSING)`. `10-e2e.json` fixed shape: `{"inc":"INC-S1+V2+V3+S2h","results":[{"id":"E1","pass":true,"evidence":{}},…],"finished_at":"<ISO>"}`; script re-reads it and exits 1 if any `"pass":false`.

**G18 · CORS/credentials (browser-real vs served-page).** Fact **F16**: `grep -rn "cors\|Access-Control-Allow-Origin\|credentials" apps/api/src | head -30`. Page :4173 calling API on another origin may be blocked. **No API edits** (outside manifest): record `known_limit_cors: true|false` + F16 excerpt in `11-serve.txt` for Sean. Also record whether the Http client sends `credentials:'include'` — observation only.

## MISSING ACCEPTANCE

**M1 · Step 5 has no artifact.** Add: `$PM test -w apps/web > build-artifacts/s1/05-web-test.txt 2>&1 || { cat build-artifacts/s1/05-web-test.txt; exit 1; }` — "still green" is now a file.

**M2 · Step 0 completion test.** `node -e "JSON.parse(require('fs').readFileSync('build-artifacts/s1/00-prefact.json'))" && grep -q '\"F14\"' build-artifacts/s1/00-prefact.json` must exit 0.

**M3 · Step 8 execution + gate.** `node scripts/e2e/s1OwnerConsole.e2e.mjs 2>&1 | tee build-artifacts/s1/10-e2e-run.txt; grep -q '"pass":false' build-artifacts/s1/10-e2e.json && exit 1 || true`.

**M4 · Fresh-env reaper proof (behavioral, scratch-only).** In `swg-scratch` after all migrations: discover minimal writable row via `docker exec swg-scratch psql -U postgres -c '\d official_connector_states'`, `INSERT INTO official_connector_states(<required cols>) VALUES ('news_rss:synthetic_orphan', …defaults…)`, run reaper §C against scratch, assert `SELECT count(*) … WHERE connector_key='news_rss:synthetic_orphan'` = 0 → artifact `01-reaper-fresh.json`. This upgrades 01-fresh from "counts match" to "gate demonstrably kills orphans" without touching the dev DB.

**M5 · Step 9 proof artifact.** Against the piped `api.log`: 
```bash
f=$(mktemp); umask 077; printf '%s' "$SWG_E2E_ACTIVATE_PHRASE" > "$f"
grep -RIlc -F -f "$f" build-artifacts/s1/api.log > /dev/null 2>&1; hits=$(grep -RIl -F -f "$f" build-artifacts/s1/api.log | wc -l); shred -u "$f"
printf 'phrase_occurrences_in_logs=%s\n' "$hits" >> build-artifacts/s1/09-v4-proof.txt
```
PASS = `hits=0` (branch a) or `hits=0` AFTER the redaction edit (branch b). The `mktemp`+`grep -f` pattern keeps the phrase off argv and out of command history and artifacts.

**M6 · Final seal gate.** Before tagging, rerun the M5 sweep for OWNER/VIEWER tokens (artifacts must contain only their sha256) and: `git tag increment/s1-v2-v3-s2h && git tag --points-at HEAD | grep -qx increment/s1-v2-v3-s2h`. Teardown hardened to be rerunnable: `docker rm -f swg-scratch >/dev/null 2>&1 || true`.

## CONTRADICTIONS

**C1 · Blueprint-internal path conflict.** The Step-0 draft `"$HOME/SanGuard"` vs the authoritative `$HOME/SwanGuard-Newsroom` (§7c). Resolved by B1 — strike the line.

**C2 · Router semantics.** Provided `parseOwnerHash` makes every foreign hash land in OwnerForbiddenPanel, contradicting mermaid HR2 (non-owner hashes → MAIN) and D1's promise that the newsroom surface is untouched. Resolved by B8.

**C3 · Selector import vs optional prop.** Step 5 mandates importing `selectOwnerConsoleApi` while commenting its usage is conditional — guaranteed lint/TS failure or dead import. Resolved: no-prop is the primary branch
