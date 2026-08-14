# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/review-packet.md
**Seed:** (none)
**Tokens:** 16758 in / 4808 out · **Cost:** ~$0.1224 · **Wall:** 57.9s

---

**1. Parsers — wrong-but-nonempty results**

HIGH | dashboardRouteManifest.ts:78 (`matchAll(/\bpath:\s*'([^']+)'/g)`) | A route entry added with double quotes or a template literal — `path: "/dashboard/admin/reports"` or `` path: `/dashboard/admin/reports` `` — is silently dropped while all single-quoted siblings still parse. Result is nonempty, the zero-route guard never trips, and the drift gate now checks N-1 routes while claiming full coverage. The uncrawledRoutes staleness test only catches this for the 7 already-acknowledged paths; a *new* route in the wrong quote style is invisible to every assertion.

HIGH | dashboardRouteManifest.ts:71 (`text.indexOf('routes: [', roleAt)`) | The search is unbounded past the role block. Refactor: rename the `admin` block's key to `adminRoutes: [` (or reorder so admin's array comes after trainer's). `routesAt` lands on the *trainer* array; admin's manifest becomes trainer's routes re-prefixed `/dashboard/admin/...`. Nonempty, no throw. (This one happens to fail loud at the drift assertion today only because the crawl list is hand-typed; if the crawl list is ever generated from the manifest, it goes silent.)

MEDIUM | dashboardRouteManifest.ts:118 (`/'([a-z-]+)'/g` on USER_DASHBOARD_TAB_IDS) | A new tab id containing uppercase or digits — `'aiTools'`, `'group2'` — matches nothing and is dropped. Nonempty result, no throw, and the user-role drift test (`app.filter(...not crawled)`) passes because the tab never entered `app`. The gate claims the user role is drift-checked; it isn't for that tab.

HIGH | modelRegistryAudit.mjs:96 (`readRegisteredModels` does NOT strip comments) | `stripComments` exists in this file but is only applied to call-site scanning. A comment inside the registry return block — `// TODO: register PaymentPlan, DisputeBatch next sprint` — contributes `PaymentPlan` and `DisputeBatch` to the registered set. `getModel('PaymentPlan')` call sites then pass the highest-severity assertion while the model is unregistered: the exact RenewalAlert failure, green. Set stays >50, no guard trips.

MEDIUM | modelRegistryAudit.mjs:88 (`lastIndexOf('return {')`) | Any later `return {` in associations.mjs (a helper appended below `setupAssociations`, a second return added during refactor) hijacks the parse. If that block plus the trailing file content yields >50 capitalized identifiers (realistic if the helper sits above the model list or references models), every drift assertion now runs against the wrong set with no throw.

MEDIUM | modelRegistryAudit.mjs:150 (`/getModel\(\s*['"].../`) | Call sites written `` getModel(`RenewalAlert`) `` (template literal) or `getModel(/* */ 'RenewalAlert')` are invisible. A refactor to template literals converts a guaranteed-throw call site into one the tripwire never enumerates; the assertion passes while production 500s.

MEDIUM | modelRegistryAudit.mjs:135 (`declaredModelName` returns first match per file) | A file defining two models (`sequelize.define('A')` and `sequelize.define('B')`) yields one entry. If B is unregistered and unacknowledged, the "every model file is registered or dormant" assertion passes — the enumeration under-counts by construction.

**2. RenewalAlert import-time**

No differential boot crash is constructible: `import sequelize from '../database.mjs'` at module scope is identical to the ~150 siblings, and associations.mjs already dynamic-imports those siblings in the same function, so boot order, circularity, and Render env-evaluation risk are unchanged by this conversion. No finding.

MEDIUM | RenewalAlert.mjs:90 (`timestamps: true`) vs the pre-existing migration | The migration was written for a model that never ran. If it created `renewal_alerts` without `createdAt`/`updatedAt` (or with a different status ENUM casing), the first insert/query throws column-missing — and the packet states no query has ever run. Trigger is conditional on migration content not shown; flagged because it is the single most likely runtime break and is entirely unverified.

**3. Assertions that pass with the defect present**

HIGH | route-manifest-drift.contract.mission.spec.ts:131 (timeout test) | `crawlTimeoutFor` returns `Number(process.env.SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS)` before any route-count math. If CI sets that env var (it is the documented override), every assertion in "the crawl timeout tracks the route count" passes while the function is a flat constant — the named defect (timeout decoupled from route count) is fully present.

MEDIUM | route-manifest-drift.contract.mission.spec.ts:47 (`toBeGreaterThan(10)`) | Passes with 11 wrong routes. Combined with finding 1 (double-quote drop), a manifest missing 50 real routes still satisfies the only size guard.

MEDIUM | modelRegistryDrift.test.mjs:36 (`registered.size > 50`) | Passes with 51 names of which 10 are comment-harvested (finding 1, modelRegistryAudit). The size guard proves non-emptiness, not correctness.

MEDIUM | modelRegistryDrift.test.mjs:44 ('throws loudly if the registry object moves') | Only exercises the missing-anchor path against the spec file itself. Every wrong-block failure mode (lastIndexOf hijack, comment seeding, early `};` close) passes this test while the parser returns garbage.

LOW | modelRegistryDrift.test.mjs:44 | `new URL(import.meta.url).pathname` on Windows yields `/C:/...`; readFileSync throws ENOENT, which does not match `/return \{|registry/i` — the test fails for environmental reasons, i.e. it is not portable, and a "fix" that loosens the regex would also loosen the guard.

**4. Beacon allowlist**

MEDIUM | production-live-readonly.mission.spec.ts:34 (`mentionsBenignBeacon(message) && /405|Request failed|ERR_BAD_RESPONSE|Response error/i`) | Substring match plus a generic transport regex. If `/api/telemetry/funnel` starts genuinely failing — 500, not 405 — the browser logs `POST /api/telemetry/funnel Request failed ... 500` and this gate suppresses a real product outage as beacon noise. The suppression was written for the harness's own 405; it also swallows the server's 500. The write-path allowlist is exact-match and clean; this console-path branch is the bypass.

LOW | benignBeacons.ts (registry itself) | No technical bypass: method+path exact match, beacons still blocked and 204-fulfilled. The only hole is process — a future entry added for an endpoint that does mutate — which is unenforceable statically. No trigger; noted only because you asked.
