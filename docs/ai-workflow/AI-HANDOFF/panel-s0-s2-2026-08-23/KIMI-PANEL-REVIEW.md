# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-S0-S2-REVIEW-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 4225 in / 5889 out | **Cost:** ~$0.1010 | **Wall:** 55.2s | **finish_reason:** stop

---

# Findings, ranked

## F1 — Unknown-key 404 costs a full state-table scan per request — CERTAIN (mechanism), LIKELY (impact)

**File:** `apps/api/src/officialConnectors.ts` (`setOwnerEnabled`)
**Symptom:** The short-circuit only helps keys the registry *knows*. Every unknown `news_rss:*` key — i.e., every typo, every probe, every garbage string an operator or attacker pastes — falls to `(await input.store.listStates()).some(...)`, a full state-table read, before 404ing. The commit `e6bca37` claims to have removed exactly this read-amplification; it removed it for the happy path and kept it on the rejection path, where callers control the key and can repeat the request arbitrarily. N bogus disables = N full scans.
**Reproduction:** `for i in $(seq 1 200); do curl -X POST /official-connectors/news_rss:ghost$i/owner-enabled -d '{"enabled":false}'; done` and watch `listStates()` row counts in pg_stat_statements. Each 404 is preceded by a full scan.
**Replacement:**
```ts
const known = Boolean(await getProvider(connectorKey))
  || Boolean(await input.store.getState(connectorKey)); // single-row PK lookup
```
If `OfficialConnectorStore` lacks `getState`, add it; do not filter `listStates()` in JS.

## F2 — The "already holds state" arm is only as safe as every other state writer — SPECULATIVE

**File:** `apps/api/src/officialConnectors.ts`
**Symptom:** The second arm legitimises any key that has *any* state row. The diff does not show whether `status()`, `listOutletStatuses()`, or the ingestion/run path lazily upserts state (`getOrCreateState` is the common shape). If any read or run path mints a default row for an arbitrary `news_rss:*` key, the orphan factory is still open — one extra step: hit the key on the state-creating endpoint first, then `setOwnerEnabled(true)` passes the `known` check and the phantom is fully legitimized, enable included. Your own standing law "a read must not write" suggests this has bitten before.
**Reproduction:** `GET /official-connectors/news_rss:ghost/status` (or trigger a run for it), then `SELECT * FROM official_connector_state WHERE connector_key='news_rss:ghost'`; if a row exists, `setOwnerEnabled('news_rss:ghost', true, …)` with the activation phrase. If the row exists after a read, the fix is dead.
**Replacement if confirmed:** track orphan state explicitly — e.g. `state.registryBacked === false` — and 404 on enable for non-registry keys regardless of state; keep the state arm for disable only:
```ts
if (isNewsRssOutletKey(connectorKey)) {
  const inRegistry = Boolean(await getProvider(connectorKey));
  if (!inRegistry && enabled) throw new HttpError(404, 'outlet_unknown', 'Unknown news outlet');
  if (!inRegistry && !await input.store.getState(connectorKey)) throw new HttpError(404, 'outlet_unknown', 'Unknown news outlet');
}
```
This also closes the hole if state appears via a path you don't control, because enable never trusts state.

## F3 — `getProvider` may resolve the open namespace, making the 404 unreachable — SPECULATIVE

**File:** `apps/api/src/officialConnectors.ts`
**Symptom:** `definitionFor()` resolves ANY `news_rss:*` to the news family (stated in §3). If `getProvider` is built on the same open resolution — family default provider with per-key config overlaid — then `Boolean(await getProvider(connectorKey))` is true for every `news_rss:*` string and the entire orphan fix is a no-op. §2 claims a ghost 404 was probed over HTTP, which is evidence *against* this, but the diff does not show `getProvider`, and the probe result depends on registry contents at probe time. Verify by execution, don't trust the probe.
**Reproduction:** `setOwnerEnabled('news_rss:definitely-not-in-registry-' + Date.now(), false)` → must 404. Then inspect `getProvider`'s fallback for keys absent from the registry.

## F4 — Clock injection fixed one instance, not the class — CERTAIN

**Files:** `featureDispatchContext.ts`, `civicOfficialSources.ts`
**Symptom:** (a) `now` is optional at every layer with a wall-clock default, so the next route that needs time can call `new Date()` and nothing — no lint rule, no type error, no test — will notice. The doc comment says "MUST"; nothing enforces it. (b) The route now uses the injected clock for `listActiveItems`, but `input.service.status('federal_register')` on the very next line still evaluates quota windows / staleness on whatever clock the service has — the exact split-brain shape (fake clock in one layer, wall clock in another) that caused the original red, preserved inside the same request. (c) Only the civic route was threaded; every other time-filtering route keeps the wall clock.
**Reproduction for (b):** pin `now` to a date where the fixture's retention is valid but the service's internal clock (wall) says the quota window rolled — behaviour differs by which layer you pinned.
**Replacement:** make `now` required in `FeatureDispatchContext` and supply the default once, at `createApiApp`:
```ts
// createApiApp: context.now = input.now ?? (() => new Date());
// featureDispatchContext.ts: now: () => Date;  // not optional
```
and pass the same `now` into `createOfficialConnectorService` so route and service share one clock per request.

## F5 — The fixed test's rot-resistance is unverifiable from the diff — SPECULATIVE

**Symptom:** The diff threads the clock but does not show the repaired test. If the fixture still hard-codes absolute story timestamps and the injected clock is `() => new Date()` at test setup (or the fixture computes "now minus 719h" from wall time at module load), it rots identically — just later. The claim "0 red for the first time since 2026-08-13" is only durable if both the fixture timestamps and the injected clock are fixed constants.
**Reproduction:** run the civic test with `faketime -f 2027-01-01` (or stub `Date`) — if it goes red, the class survives.

## F6 — Bundle-marker control: three concrete defects — CERTAIN

**File:** `scripts/web-bundle-reachability.mjs`

**(a) False positives on the `absent` arm from preserved legal comments.** esbuild/terser strip comments *except* `/*! … */`, `@license`, and `@preserve` banners, which are copied into vendor chunks verbatim. Any vendor licence text containing your marker substring (e.g. a marker like `"OwnerConsole"` appearing in a license header or a sourcemap URL comment) trips UNDECLARED SHIP with the console genuinely absent.
**(b) False MISSING on the `present` arm from tree-shaking.** If the marker is an unused constant (`const MARKER = 'owner-console-v1'`), the minifier removes it; the surface ships and the build fails. Markers must be runtime-referenced (rendered string, route path, fetch URL) — the script neither checks nor documents this.
**(c) Chunk-boundary miss.** Files are read individually then joined with `'\n'`; a marker split across two emitted chunks matches nothing → false MISSING. Fail-safe direction, but it will page someone at 2 a.m. for a correct bundle.
**Replacements:**
```js
// (a) strip preserved comments before matching:
const text = contents.join('\n').replace(/\/\*!([\s\S]*?)\*\//g, '').replace(/\/\*\*@(license|preserve)([\s\S]*?)\*\//g, '');
// (c) also match per-file so a split marker is reported by name, not as a mystery:
const perFile = files.map((f, i) => ({ f, hit: contents[i].includes(entry.marker) }));
// (b) in evaluateMarkers, reject markers that can't survive minification — enforce a shape:
if (!/^[\w-]{12,}$/.test(entry.marker)) failures.push(`BAD MARKER: "${entry.marker}" must be a runtime-referenced identifier-shaped string ≥12 chars`);
```

## F7 — Empty/whitespace markers are vacuous — CERTAIN

**File:** `scripts/web-bundle-reachability.mjs` (`evaluateMarkers`)
**Symptom:** `''.includes('') === true` and `'anything'.includes('') === true`. A `present` entry with an empty or missing `marker` passes forever (surface can vanish silently — the exact failure this tool exists to catch); an `absent` entry with an empty marker fails every build. No schema validation of the ledger.
**Reproduction:** `{"present":[{"surface":"console","marker":""}]}` against an empty dist → exits 0.
**Replacement:** first loop in `evaluateMarkers`:
```js
for (const [kind, entries] of [['present', ledger.present ?? []], ['absent', ledger.absent ?? []]]) {
  for (const entry of entries) {
    if (typeof entry.marker !== 'string' || entry.marker.trim().length === 0)
      failures.push(`INVALID LEDGER: ${kind} entry for "${entry.surface ?? '?'}" has an empty marker`);
  }
}
```

## F8 — "Fails the build" is not in the diff — CERTAIN (as a claim gap)

**Symptom:** The diff adds the script and (per §1) the ledger, but no `package.json` / CI change wiring it into `npm run build`. A gate that runs only when someone remembers to run it is the same shape as the green `vite build` that carried no information. §2's "mutation-tested: … makes `npm run build` exit 1" implies wiring exists; the diff does not show it. Also: nothing checks dist freshness — if the script runs against a stale `dist/` (e.g. wired as `postbuild` but someone runs it standalone, or the build partially fails leaving old chunks), it certifies yesterday's bundle.
**Replacement:** wire as `"build": "vite build && node scripts/web-bundle-reachability.mjs"` (not `postbuild`, which is skippable with `--ignore-scripts`), and in `main()`:
```js
const newest = Math.max(...(await Promise.all(emitted.files.map(async f => (await stat(f)).mtimeMs))));
if (Date.now() - newest > 10 * 60 * 1000) { console.error('[bundle-reachability] dist is stale — refusing to certify'); process.exit(2); }
```

## F9 — `terms_not_recorded` enforcement surface is narrower than claimed — LIKELY

**File:** `apps/api/src/officialConnectors.ts`
**Symptom:** The blocker is added to the `blockers` array in what is visibly the status/readiness computation. The diff does not show (a) the enable path in `setOwnerEnabled` actually consulting this blocker list before writing, or (b) the ingestion/run path consulting it. If a run only checks `ownerEnabled && !suspended` — plausible, since blockers like `terms_not_recorded` are new — then an outlet enabled *before* this gate shipped (or enabled via the F2/F3 hole) ingests with no terms on record and the gate never fires. The gate as shown blocks the toggle, not the ingestion it exists to protect. Also note the grandfathering consequence: any outlet already `ownerEnabled` today keeps running with a blocker present; §2 says 39/39 carry terms so this is latent, not live — but the 107 queued feeds will arrive unable to be enabled until someone records terms, with no UI path shown for recording them.
**Reproduction:** enable a terms-less outlet via direct store write (simulating pre-gate state), trigger a run, check whether ingestion proceeds despite `terms_not_recorded` in `status().blockers`.
**Replacement if (b) confirmed:** in the run path, `if (status.blockers.includes('terms_not_recorded')) throw new HttpError(409, 'terms_not_recorded', …)` — or explicitly document that runs trust `ownerEnabled` and the gate is enable-time only, and downgrade the §1 claim accordingly.

## F10 — Minor: `catch {}` misreports every dist error — CERTAIN

**File:** `scripts/web-bundle-reachability.mjs` (`main`)
**Symptom:** `catch { … "run the web build first" }` swallows EACCES, ENOSPC-on-read, and malformed-directory errors and blames a missing build. Replacement: `catch (err) { console.error(\`[bundle-reachability] cannot inspect ${distDir}: ${err.message}\`); process.exit(2); }`.

---

# Section 2 claims the diff does not support

1. **"Bundle control mutation-tested: declaring the console present makes `npm run build` exit 1"** — the diff contains no build wiring (F8). The script's exit codes are visible; that `npm run build` invokes it is not.
2. **"Real HTTP route probed: terms-less enable 409 … ghost 404 both directions, no phantom rows written"** — the diff shows the 404 branch and the blocker, but not that the enable path returns 409 on `terms_not_recorded` (F9), and the ghost-404 claim holds only if `getProvider` has no family fallback (F3). These are runtime claims; the diff alone cannot carry them.
3. **"api 522 pass / 0 red"** and the Postgres 4/4 — inherently outside the diff; flagged only so Fable treats them as unverified until executed, not as established.
4. **"`e6bca37` short-circuited the orphan check so a batch does not scan the state table once per outlet"** — true only for registry-known keys; the unknown-key path still scans once per *request*, and that path is caller-reachable (F1). The claim as written overstates the fix.

**Highest priority to execute first:** F3 (is the 404 arm even reachable — one curl), then F2 (does any read/write path mint state for ghost keys — one curl + one SELECT), then F1 (scan-per-404 — the fix is a one-line replacement regardless of outcome).
