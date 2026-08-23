# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-S0-S2-REVIEW-PACKET-2026-08-23.md
**Tokens:** 4159 in / 23185 out (reasoning: 18810) | total 27344
**Wall:** 325.1s

---

Scope note that governs half of this: the section-5 diff touches four files. Several §1/§2 claims depend on code in files the diff does not contain (`dispatchRequest`/`createApiApp`, provider builders, `config/bundle-markers.json`, any test file). Where a finding hinges on that, the confidence mark says so explicitly.

## Findings, ranked

### 1. The orphan guard can be bypassed entirely if `isNewsRssOutletKey` and `definitionFor` disagree, or if `getProvider` builds providers on demand

**File:** `apps/api/src/officialConnectors.ts` (`setOwnerEnabled` guard; `isNewsRssOutletKey` and `getProvider` are referenced but not in the diff).

**Symptom:** The factory was open because `definitionFor` resolves *any* `news_rss:*` string. The fix closes it with a *different* predicate, `isNewsRssOutletKey`. Every key shape that `definitionFor` news-resolves but `isNewsRssOutletKey` rejects (`news_rss:` empty suffix, if the impl is a `.+` regex; whitespace/case variants if either side normalises) skips the guard, hits the old disable fall-through, and mints a permanent row. Second bypass: if either runtime provider builder constructs a provider for an arbitrary `news_rss:*` from the family template rather than a registry row, `getProvider(ghost)` is truthy, the guard's *first* arm passes it, and the guard is a no-op for every ghost.

**Reproduction (two minutes, run before anything else):**
```bash
# A. Ghost enable with the family activation phrase. Expected: 404 outlet_unknown.
#    Any other response (409, activation-phrase error) proves the ghost cleared the guard.
curl -i -X PUT "$API/connectors/news_rss%3Aintel-probe/owner-enabled" \
  -H 'content-type: application/json' \
  -d '{"enabled":true,"confirmation":"<family phrase>","userId":"probe"}'

# B. Boundary shapes on the disable path, then look for minted rows:
for k in 'news_rss%3A' 'NEWS_RSS%3Ax' 'news_rss%3Ax%20' 'news_rss%3Ax%0A'; do
  curl -s -X PUT "$API/connectors/$k/owner-enabled" \
    -H 'content-type: application/json' \
    -d '{"enabled":false,"userId":"probe"}' -o /dev/null -w "%{http_code} $k\n"
done
psql "$DATABASE_URL" -c "select connector_key from official_connector_state
                         where connector_key ilike 'news_rss%' order by 1;"
# Any row whose key is absent from the registry = factory still open.
```
Plus one containment test:
```ts
for (const key of ['news_rss:', 'news_rss: ', 'news_rss:a b', 'news_rss:Ünicode',
                   'NEWS_RSS:x', 'news_rss:x%20y', 'news_rss:x\n', ' news_rss:x']) {
  if (key !== 'news_rss' && definitionFor(key)) {
    expect(isNewsRssOutletKey(key)).toBe(true); // invariant: factory predicate ⊆ guard predicate
  }
}
```

**Confidence:** SPECULATIVE on mechanism (both functions are outside the diff), but consequence is full reopen and the probe is two minutes.

**Replacement:** derive the guard from the same source of truth as the factory, and put it where the write happens, not on one caller — see finding 3's `assertOutletKnown`. Minimum concrete change if you keep it local: define `isNewsRssOutletKey` as `definitionFor(k) !== undefined && k !== 'news_rss'` so the two predicates cannot diverge, and land the containment test above.

---

### 2. Nothing in the diff ever produces `now` — the clock "fix" is one consumer, zero producers, and the class is untouched

**File:** `apps/api/src/featureDispatchContext.ts` (adds `now?: () => Date`), `apps/api/src/civicOfficialSources.ts` (only consumer).

**Symptom:** The diff shows the field added and one route reading it with a wall-clock fallback. No `dispatchRequest`, no `dispatchFeatureRoute`, no `createApiApp` change appears — so within the artifact of record, `ctx.now` is always `undefined`, every civic call uses the wall clock, and the carried-red test should still be red. Since §2 claims 0 red, the wiring must exist in files the diff omits — meaning this diff is not the record of commit `d45e0e7(b)`. Separately, the fix is per-route opt-in enforced by a doc comment; any other time-filtering route (`listActiveItems` callers for the news lane, staleness checks) calling `new Date()` directly has the identical time bomb.

**Reproduction:**
```bash
git show d45e0e7 --stat        # does it touch dispatchRequest.ts / createApiApp.ts at all?
grep -rn "now:" apps/api/src/dispatchRequest.ts apps/api/src/createApiApp.ts 2>/dev/null
grep -rn "new Date(" apps/api/src --include='*.ts' | grep -v test   # every hit = unfixed instance of the class
```

**Confidence:** CERTAIN that the shown diff contains no producer and converts exactly one route. SPECULATIVE that the repo lacks it (their 0-red claim suggests it exists somewhere unshown).

**Replacement:** one default site, required field, mechanical ban:
```ts
// dispatchRequest.ts — the ONLY wall-clock default in the API:
const now = input.now ?? (() => new Date());

// featureDispatchContext.ts:
now: () => Date;          // required, delete the `?`

// civicOfficialSources.ts:
const items = active ? await loadStories(input.store, input.now) : [];
```
```json
// eslint overrides for apps/api/src/**/routes/*:
"no-restricted-syntax": ["error",
  {"selector": "NewExpression[callee.name='Date']",
   "message": "use ctx.now — wall clocks make route tests rot"}]
```

---

### 3. The "or it already holds state" arm makes every *other* state-writer an orphan factory whose output is permanently legitimate

**File:** `apps/api/src/officialConnectors.ts` (`setOwnerEnabled` guard).

**Symptom:** The guard protects one method. The service exposes suspension (`status.suspended` is computed from somewhere) and contract state; any sibling method that upserts state for a caller-supplied key — `setSuspended`, admin/import tooling, a quota reset job — mints a row for `news_rss:anything`, after which the second arm declares the key a real outlet forever, `listOutletStatuses()` shows it forever, and (per §1's own admission) no delete path exists. The fix converts "one endpoint can pollute the list" into "any state-writing endpoint can pollute the list irreversibly."

**Reproduction:**
```bash
grep -rnE "saveState|upsertState|setState|updateState|setSuspended|recordContract" \
  apps/api/src --include='*.ts' | grep -v test
# For each caller with a user-controlled connectorKey:
curl -s -X PUT "$API/connectors/news_rss:intel-probe/suspended" -d '{"suspended":true}' -o /dev/null
curl -s "$API/outlets" | grep intel-probe && echo "HOLE: row minted + legitimised"
```

**Confidence:** LIKELY that sibling writers exist (something sets `suspended`); SPECULATIVE that any accepts arbitrary keys.

**Replacement:** one choke point, called by every mutator, with a point read:
```ts
async function assertOutletKnown(connectorKey: string): Promise<void> {
  if (!isNewsRssOutletKey(connectorKey)) return;
  if (await getProvider(connectorKey)) return;
  if (await input.store.getState(connectorKey)) return;   // add point read; see finding 7
  throw new HttpError(404, 'outlet_unknown', 'Unknown news outlet');
}
```
Call it first in `setOwnerEnabled`, `setSuspended`, and every other method that writes state.

---

### 4. The bundle gate is not wired into the build anywhere in the diff, and it passes stale artifacts

**File:** `scripts/web-bundle-reachability.mjs`.

**Symptom:** The script is a standalone file reading `apps/web/dist` from disk. The diff contains no `package.json` change, no CI change, and not even `config/bundle-markers.json` itself. As shipped here: (a) running it against a dist from a previous build gives a false green after source has changed; (b) nothing shown makes `npm run build` invoke it, so the §2 mutation-test claim has no support in the artifact.

**Reproduction:**
```bash
[ -f config/bundle-markers.json ] && echo ledger-exists || echo "LEDGER ABSENT — script crashes ENOENT"
node scripts/web-bundle-reachability.mjs          # passes
echo 'import "./App";' >> apps/web/src/main.tsx   # console now enters the production tree
node scripts/web-bundle-reachability.mjs          # still "ok" — stale dist, false green
npm run build && echo $?                          # does the build even run the script?
```

**Confidence:** CERTAIN that the diff contains neither wiring nor ledger; the false-green-on-stale-dist behaviour is CERTAIN from the code.

**Replacement:**
```json
// package.json
"build:web": "vite build && node scripts/web-bundle-reachability.mjs"
```
plus a CI step running the script against the artifact built in the same job, and a readable failure instead of an ENOENT stack:
```js
let ledger;
try { ledger = JSON.parse(await readFile(ledgerPath, 'utf8')); }
catch (e) { console.error(`[bundle-reachability] unreadable ledger ${ledgerPath}: ${e.message}`); process.exit(2); }
```

---

### 5. `evaluateMarkers` substring matching: absent-markers collide with present-markers and vendor text; an emptied ledger passes vacuously

**File:** `scripts/web-bundle-reachability.mjs`, `evaluateMarkers` / `main`.

**Symptom:** (a) Any absent marker that is a substring of a present marker, of vendor chunk text, or simply short (`"e"`, `"App"`, `"console"`) fires permanent UNDECLARED SHIP noise — or worse, trains people to resolve noise by moving markers to `present`. (b) `{"present":[],"absent":[]}` exits 0 with "ok — 0 marker(s)": delete the ledger contents and the gate passes. (c) With `minify:false` or any non-minified chunk, marker strings in retained comments satisfy the present arm without the surface being reachable.

**Reproduction:**
```bash
echo '{"present":[],"absent":[]}' > config/bundle-markers.json
node scripts/web-bundle-reachability.mjs    # "ok", exit 0 — vacuous pass
echo '{"present":[{"surface":"x","marker":"e"}],"absent":[]}' > config/bundle-markers.json
node scripts/web-bundle-reachability.mjs    # fails on any bundle containing "e"
```

**Confidence:** CERTAIN (true by construction of `String.includes` over concatenation).

**Replacement:** marker grammar + cross-check at load, embedded as literals in each surface's entry file:
```js
const M = /^SG-MARKER-[a-z0-9_]+-[a-z0-9]{8}$/;
const all = [...ledger.present ?? [], ...ledger.absent ?? []];
if (all.length === 0) { console.error('[bundle-reachability] empty ledger — refusing vacuous pass'); process.exit(2); }
for (const e of all) if (!M.test(e.marker)) throw new Error(`bad marker (must match ${M}): ${e.marker}`);
for (const a of ledger.absent ?? []) for (const p of ledger.present ?? [])
  if (p.marker.includes(a.marker) || a.marker.includes(p.marker))
    throw new Error(`markers overlap: ${a.marker} / ${p.marker}`);
```
Enforceability answer for the absent arm: as shipped it is a speed bump — the failure message literally instructs the reader how to silence it. The only concrete hardening is ownership: `config/bundle-markers.json` in CODEOWNERS requiring owner review on ledger edits, with CI running the script as a separate required step.

---

### 6. The terms gate fails closed only against *falsy*; truthy garbage passes, builders can silently omit the field, and the enforcement point may be transition-only

**File:** `apps/api/src/officialConnectors.ts` (`termsUrl?: string`; blocker line).

**Symptom:** (a) `!provider.termsUrl` passes `" "`, `"TBD"`, `"n/a"` — exactly the strings a bulk import of 107 feeds with no terms URL is likely to produce. Given §3 admits those probes carry no terms URL, this is the import path that matters. (b) `termsUrl?: string` is optional, so any builder that forgets it compiles; the §1 claim "both runtime provider builders now carry termsUrl" has no builder diff behind it. (c) The blocker lives in the status/readiness computation. If the poll loop gates on `ownerEnabled` alone rather than blockers, an outlet enabled while terms existed, whose registry row later loses the URL, keeps ingesting — the gate blocks the *transition*, not the *operation*. (d) Calling this a "licence gate" over-claims: it verifies a non-empty string, not a licence.

**Reproduction:**
```bash
# (a) truthy garbage
psql "$DATABASE_URL" -c "update <source_registry> set terms_url=' ' where <one test outlet>"
curl -s "$API/connectors/<that-outlet>/status" | grep terms_not_recorded || echo "BYPASS: whitespace accepted"

# (c) transition-only?
# test: enable outlet with terms → null the terms_url in the registry → run one poll tick
# → assert provider client was NOT called. A call means the gate is cosmetic post-enable.

# (d) direct-store writers bypass both this gate and finding 3's guard entirely:
grep -rnE "official_connector_state|INSERT INTO official" scripts/ migrations/ tools/ 2>/dev/null
```

**Confidence:** (a) SPECULATIVE on import hygiene, CERTAIN on the code condition (`!provider.termsUrl` is falsy-only). (b) CERTAIN that the diff shows only the optional type and no builder. (c) SPECULATIVE. (d) SPECULATIVE.

**Replacement:**
```ts
const termsUrl = provider?.termsUrl?.trim() ?? '';
if (provider && isNewsRssOutletKey(connectorKey) && !/^https?:\/\/.+\..+/.test(termsUrl)) {
  blockers.push('terms_not_recorded');
}
```
and make omission a type error instead of a silent fail-closed:
```ts
type NewsOutletProviderConfig = ProviderConfig & { family: 'news_rss'; termsUrl: string };
```

---

### 7. The fallback arm is a full `listStates()` scan per *unknown* key — read amplification on the attack path

**File:** `apps/api/src/officialConnectors.ts` (`(await input.store.listStates()).some(...)`).

**Symptom:** The e6bca37 short-circuit protects registry-known batches, correct — but every key the registry does not know, i.e. precisely the hostile/spam case, pays a scan of the entire state table, once per request. The guard converts unknown-key spam into O(N·requests) reads, and N grows monotonically (rows are never deleted).

**Reproduction:** with ~150 state rows, loop `setOwnerEnabled('news_rss:probe-'+i, false)` 200× and time it; compare against a point-read variant.

**Confidence:** CERTAIN as to the code; the impact rating is modest.

**Replacement:** `status()` already reads state for one key — use that primitive:
```ts
const known = Boolean(await getProvider(connectorKey))
  || Boolean(await input.store.getState(connectorKey));
```
(if no point read exists on the store interface, add `getState(connectorKey)` with an index on `connector_key`; do not keep the scan as the fallback.)

---

### 8. Minor script defects

**File:** `scripts/web-bundle-reachability.mjs`.

- Direct-run guard `import.meta.url === \`file://${process.argv[1]}\`` is wrong on Windows (`file:///C:/…` vs `C:\…`) and for relative `argv[1]`; the `.endsWith` fallback then fires on any same-named path. CERTAIN (syntax). Replacement:
  ```js
  const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  if (isMain) await main();
  ```
- Only `.js` collected; `.mjs`/`.cjs` chunks are silently uninspected. CERTAIN. Replacement: `entry.endsWith('.js') || entry.endsWith('.mjs')`.
- A missing/invalid `ledger` entry (no `marker` field) renders as `"undefined"` in failures and is otherwise unvalidated. CERTAIN. Covered by finding 5's load-time validation.

---

### 9. Deferred debt asserted as handled

The §1 phrasing "no delete path in the system" is past tense; there is still no delete path, and the second arm makes every state row load-bearing, so any leak via findings 1 or 3 is permanent by design. Not a defect in the mechanism — but the review record should not read as closed. Concrete addition when wanted: `DELETE /connectors/:key/state` restricted to keys where `getProvider(key)` is undefined and the caller confirms the key string, i.e. registry-absent orphans only.

## §2 claims the diff does not support

1. **"Bundle control mutation-tested: declaring the console present makes `npm run build` exit 1."** The diff contains no `package.json`/CI wiring that runs the script during build, and no `config/bundle-markers.json` at all. Nothing shown connects this script to `npm run build`. Either the wiring lives outside the diff (then this diff is not the record of `ca99643`) or the claim is false.
2. **"api 522 pass (was 516 + 1 red)" and "scripts 143".** 517 → 522 is +5 tests; the diff adds zero test files. The script's own header names `scripts/web-bundle-reachability.test.mjs` as its verification — that file is not in the diff. If these tests exist, they are unshown; if they don't, both counts and the header's Verification line are fiction. Probe: `ls scripts/web-bundle-reachability.test.mjs; git log --stat -1 ca49041 e6bca37`.
3. **"Ghost 404 both directions, no phantom rows written."** Supported only for the exact key shape probed. Findings 1 and 3 give key shapes and sibling writers where the guard does not hold; the blanket "no phantom rows" is untested against all of them.
4. **"Live Postgres 4/4 … 39/39 carry one today."** A snapshot of today's registry. It says nothing about the 107 queued feeds (no terms URL in probe output) and nothing about import-time behaviour — which is where finding 6(a)/(d) lives. Not false; scoped beyond its evidence.
5. **"Terms-less disable 200."** Consistent with the design intent, but the mechanism (disable ignoring the blockers array) is in the elided body of `setOwnerEnabled` — asserted, not shown.
