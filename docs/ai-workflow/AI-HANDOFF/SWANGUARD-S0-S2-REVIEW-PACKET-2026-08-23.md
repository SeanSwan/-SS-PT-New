# Hostile review — S0 process repairs + S2 licence gate (SwanGuard)

**For:** Grok 4.6 · GLM 5.3 · Kimi K3. **Final seat:** Fable 5 (runs every finding before acting).
**Repo:** SwanGuard-Newsroom `merge/newsroom-mainline-v3`, HEAD `ca49041`. **Date:** 2026-08-23.

This reviews SHIPPED code, not a proposal. Attack it. Find defects, unsafe assumptions, and claims
the evidence does not support. Be specific: file, symptom, reproduction. No praise.

---

## 1. What these commits claim

| Commit | Claim |
|---|---|
| `d45e0e7` (a) | Closed an **orphan factory**. `setOwnerEnabled` put every readiness check inside `if (enabled)`, so DISABLE on any `news_rss:*` string fell through to the store and minted a permanent state row. `listOutletStatuses()` unions registry ∪ state keys, so the phantom then appeared in the operator list forever with no delete path. Now both directions 404 `outlet_unknown` unless the registry knows the outlet **or** it already holds state (that second arm exists so pre-existing orphans stay switch-off-able). |
| `d45e0e7` (b) | Fixed a test carried nine days as "pre-existing red". Root cause: the civic route called `new Date()` while the connector used an injected clock, so the fixture's 720h retention window expired 2026-08-13 in real time. Threaded an optional clock `createApiApp → dispatchRequest → dispatchFeatureRoute → route`, defaulting to the wall clock. |
| `ca99643` | New build control. `config/bundle-markers.json` declares per surface whether it ships; `scripts/web-bundle-reachability.mjs` fails the build if a declared-present marker is missing **or** a declared-absent marker appears. Built because two slices of owner-console work were reported as shipped while `App.tsx` was imported only by a test harness. |
| `e6bca37` | Short-circuited the orphan check so a batch does not scan the state table once per outlet. |
| `ca49041` | **S2 licence gate.** A per-outlet key whose provider has no `termsUrl` gets a `terms_not_recorded` blocker, so enable 409s. DISABLE deliberately unaffected. Both runtime provider builders now carry `termsUrl` from the registry. |

## 2. Evidence currently claimed

- api **522 pass / 0 red** (was 516 + 1 red) · web 402 · domain 242 · database 90 · scripts 143 · type-check 0 errors.
- Live Postgres 4/4, including a registry-wide assertion that no live outlet lacks terms (39/39 carry one today).
- Real HTTP route probed: terms-less enable 409, terms-less disable 200, ghost 404 both directions, no phantom rows written.
- Bundle control mutation-tested: declaring the console present makes `npm run build` exit 1; restored, exit 0.

## 3. Context needed to judge it

- `OfficialConnectorKey = 'cpsc_recalls' | 'nws_alerts' | 'federal_register' | 'news_rss' | news_rss:${string}` (template literal).
- `definitionFor()` resolves ANY `news_rss:*` to the news-family definition — that open namespace is why the orphan existed at all.
- Contract approvals are **family-scoped**: two rows cover the whole news lane. 107 more feeds are queued for import and their probe output carries no terms URL.
- 0 of 39 outlets have `terms_acknowledged_at`. Gating on acknowledgement rather than URL presence was deliberately NOT done — it would block all 39 including the one live outlet — and is flagged as an owner decision.
- The owner console is NOT in the production bundle: `App.tsx` is imported only by `src/testAppHarness.ts`. Shipping it is an open owner decision.
- Standing laws: absent is not erase · born disabled · only a live run proves the answer · a regression test never run against the broken code is a decoration · a read must not write.

## 4. Attack these specifically

1. **The orphan fix's "or it already holds state" arm.** Does it re-open the hole? Can a caller create state another way and then use that state to legitimise the key?
2. **`terms_not_recorded` is computed from `provider.termsUrl`, populated by the runtime.** What happens on a code path that builds a provider without it? Is fail-closed right, and is it fail-closed *everywhere*?
3. **The clock injection.** `now` is optional and defaults to the wall clock at the route. Is there still a path where a fake clock is pinned in one layer and not another — did this remove the class or one instance?
4. **The bundle-marker control.** Substring matching over concatenated JS. False positives from comments, sourcemaps, vendor chunks? What defeats it? Is the `absent` arm enforceable, or will it just be edited away?
5. **"0 red for the first time since 2026-08-13".** Is the now-fixed test pinned to a date that will rot the same way?
6. **Anything else in the diff that is wrong, fragile, or over-claimed.**

## 5. The diff

```diff
diff --git a/apps/api/src/civicOfficialSources.ts b/apps/api/src/civicOfficialSources.ts
index 905c2f6..0879965 100644
--- a/apps/api/src/civicOfficialSources.ts
+++ b/apps/api/src/civicOfficialSources.ts
@@ -23,11 +23,13 @@ export async function handleCivicOfficialSourcesRoute(input: {
   requestId: string;
   service: OfficialConnectorService;
   store: OfficialConnectorStore;
+  /** Injected clock; defaults to the wall clock. See FeatureDispatchContext.now. */
+  now?: () => Date;
 }): Promise<Response> {
   if (input.request.method !== 'GET') throw new HttpError(405, 'method_not_allowed', 'Method not allowed');
   const status = await input.service.status('federal_register');
   const active = status.configured && status.contractReady && status.ownerEnabled && !status.suspended;
-  const items = active ? await loadStories(input.store) : [];
+  const items = active ? await loadStories(input.store, input.now ?? (() => new Date())) : [];
   return jsonResponse({
     items,
     legalNotice: FEDERAL_REGISTER_LEGAL_NOTICE,
@@ -36,8 +38,8 @@ export async function handleCivicOfficialSourcesRoute(input: {
   }, 200, input.requestId);
 }
 
-async function loadStories(store: OfficialConnectorStore): Promise<CivicNewsStoryInput[]> {
-  const records = await store.listActiveItems('federal_register', new Date().toISOString());
+async function loadStories(store: OfficialConnectorStore, now: () => Date): Promise<CivicNewsStoryInput[]> {
+  const records = await store.listActiveItems('federal_register', now().toISOString());
   const stories: CivicNewsStoryInput[] = [];
   for (const record of records) {
     const item = allowlistFederalRegisterDocument(record.payload);
diff --git a/apps/api/src/featureDispatchContext.ts b/apps/api/src/featureDispatchContext.ts
index 08829ba..cf6e79f 100644
--- a/apps/api/src/featureDispatchContext.ts
+++ b/apps/api/src/featureDispatchContext.ts
@@ -15,5 +15,13 @@ export interface FeatureDispatchContext {
   request: Request;
   requestId: string;
   commentIntelTransaction?: CommentIntelTransactionScope;
+  /**
+   * Injected clock. Routes that filter by time (retention windows, staleness) MUST use this rather
+   * than calling `new Date()` themselves, or they cannot be tested deterministically: the civic
+   * official-sources test pinned a fake clock in the connector service while the route read the
+   * wall clock, so it passed only while real time happened to fall inside the fixture's retention
+   * window — and went silently red on 2026-08-13 when it did not.
+   */
+  now?: () => Date;
   url: URL;
 }
diff --git a/apps/api/src/officialConnectors.ts b/apps/api/src/officialConnectors.ts
index d2ad4be..c5b007c 100644
--- a/apps/api/src/officialConnectors.ts
+++ b/apps/api/src/officialConnectors.ts
@@ -16,6 +16,13 @@ type ProviderConfig = {
   client: OfficialConnectorProviderClient;
   dailyQuota: number;
   retentionHours: number;
+  /**
+   * S2 licence gate. The URL of the outlet's terms, carried from the source registry. Absent or
+   * empty means nobody has recorded where this publisher's terms live — and ingestion runs under a
+   * headline-snippet link-out posture that only holds if someone did. Only meaningful for
+   * per-outlet news keys; the literal families are governed by their contract alone.
+   */
+  termsUrl?: string;
 };
 
 type ConnectorDefinition = {
@@ -224,6 +231,15 @@ export function createOfficialConnectorService(input: {
     const blockers: string[] = [];
     if (!provider) blockers.push('provider_not_configured');
     if (!contractReady) blockers.push('contract_not_ready');
+    /*
+     * The contract gates are signed per FAMILY, so without this every future outlet inherits a
+     * signature made before that feed was ever probed — four review seats independently called
+     * that the highest-stakes open item, because it is legal exposure rather than UX. A per-outlet
+     * terms URL is the narrowest thing that makes the family attestation mean something for a
+     * specific publisher. Checked only when a provider exists: otherwise provider_not_configured
+     * already says the real problem.
+     */
+    if (provider && isNewsRssOutletKey(connectorKey) && !provider.termsUrl) blockers.push('terms_not_recorded');
     if (!state.ownerEnabled) blockers.push('owner_not_enabled');
     if (suspended) blockers.push('suspended');
     if (provider && quotaRemaining === 0) blockers.push('quota_exhausted');
@@ -310,6 +326,26 @@ export function createOfficialConnectorService(input: {
     async setOwnerEnabled(connectorKey, enabled, userId, confirmation) {
       const definition = definitionFor(connectorKey);
       if (!definition) throw new HttpError(404, 'connector_unknown', 'Unknown connector');
+      /*
+       * S0: the orphan factory. `definitionFor` resolves ANY `news_rss:*` string to the news family,
+       * so an unknown outlet got past the check above and — on the DISABLE path, where every
+       * readiness check below sits inside `if (enabled)` — fell straight through to the store and
+       * minted a permanent state row. `listOutletStatuses()` unions registry ∪ state keys, so that
+       * phantom then appeared in the operator's list forever, with no delete path in the system.
+       *
+       * An outlet "exists" if the registry knows it OR it already holds state. The second arm is
+       * not a loophole: orphans that already exist must stay switch-off-able, or this fix strands
+       * them enabled. Literal family keys are not outlets and are unaffected.
+       */
+      if (isNewsRssOutletKey(connectorKey)) {
+        // Short-circuited deliberately: the registry answers for every real outlet, so the common
+        // case costs the registry read `status()` needs anyway. Only a key the registry does not
+        // know reaches `listStates()` — otherwise a 146-outlet batch would pay a full state-table
+        // scan per outlet, which is the same read-amplification this slice removed elsewhere.
+        const known = Boolean(await getProvider(connectorKey))
+          || (await input.store.listStates()).some((state) => state.connectorKey === connectorKey);
+        if (!known) throw new HttpError(404, 'outlet_unknown', 'Unknown news outlet');
+      }
       const current = await status(connectorKey);
       if (enabled) {
         if (confirmation !== definition.activationPhrase) {
diff --git a/scripts/web-bundle-reachability.mjs b/scripts/web-bundle-reachability.mjs
new file mode 100644
index 0000000..be3fc67
--- /dev/null
+++ b/scripts/web-bundle-reachability.mjs
@@ -0,0 +1,101 @@
+/**
+ * BLUEPRINT
+ * Purpose: Fail the web build when a product surface silently enters or leaves the production
+ *   bundle. Turns "did this ship?" from an assumption into a declared, reviewed fact.
+ * Data: config/bundle-markers.json plus the emitted JavaScript in apps/web/dist.
+ * States: pass with a receipt; fail listing every marker that moved without being declared.
+ * Actions: read-only inspection of build artifacts. Writes nothing.
+ * Safety: no network, no secrets, no mutation. Exits non-zero on drift.
+ * Verification: scripts/web-bundle-reachability.test.mjs.
+ *
+ * Why it exists: B1a and B1b were built, tested, type-checked and reported as shipped while
+ * `apps/web/src/App.tsx` was imported by exactly one file — `src/testAppHarness.ts`. The test tree
+ * and the production tree were different trees and nothing compared them, so a green `vite build`
+ * carried no information about whether a change reached a user. A build that cannot tell you what
+ * it contains is not a gate.
+ */
+import { readFile, readdir, stat } from 'node:fs/promises';
+import { dirname, join, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const HERE = dirname(fileURLToPath(import.meta.url));
+const REPO_ROOT = resolve(HERE, '..');
+
+/** Every emitted .js file in the dist tree, concatenated. Chunks split; markers must not be missed. */
+export async function readEmittedJs(distDir) {
+  const files = [];
+  const walk = async (dir) => {
+    for (const entry of await readdir(dir)) {
+      const full = join(dir, entry);
+      if ((await stat(full)).isDirectory()) await walk(full);
+      else if (entry.endsWith('.js')) files.push(full);
+    }
+  };
+  await walk(distDir);
+  const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')));
+  return { files, text: contents.join('\n') };
+}
+
+/**
+ * Pure evaluation so the rule is testable without a build.
+ * Returns a list of human-readable failures; empty means the bundle matches what was declared.
+ */
+export function evaluateMarkers({ ledger, bundleText }) {
+  const failures = [];
+
+  for (const entry of ledger.present ?? []) {
+    if (!bundleText.includes(entry.marker)) {
+      failures.push(
+        `MISSING: "${entry.marker}" (${entry.surface}) is declared present but is not in the bundle. ` +
+        `Either the surface stopped shipping, or the marker string changed. If it left deliberately, ` +
+        `move it to "absent" with a reason — do not delete the entry.`
+      );
+    }
+  }
+
+  for (const entry of ledger.absent ?? []) {
+    if (bundleText.includes(entry.marker)) {
+      failures.push(
+        `UNDECLARED SHIP: "${entry.marker}" (${entry.surface}) is in the bundle but declared absent. ` +
+        `A surface reached users without anyone recording it. If that was intended (${entry.moves_to_present_in ?? 'unknown slice'}), ` +
+        `move it to "present".`
+      );
+    }
+  }
+
+  return failures;
+}
+
+async function main() {
+  const ledgerPath = join(REPO_ROOT, 'config', 'bundle-markers.json');
+  const distDir = join(REPO_ROOT, 'apps', 'web', 'dist');
+  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
+
+  let emitted;
+  try {
+    emitted = await readEmittedJs(distDir);
+  } catch {
+    console.error(`[bundle-reachability] no build output at ${distDir} — run the web build first.`);
+    process.exit(2);
+  }
+
+  const failures = evaluateMarkers({ ledger, bundleText: emitted.text });
+  const declared = (ledger.present?.length ?? 0) + (ledger.absent?.length ?? 0);
+
+  if (failures.length > 0) {
+    console.error('\n[bundle-reachability] the bundle does not match what was declared:\n');
+    for (const failure of failures) console.error(`  ✗ ${failure}\n`);
+    console.error(`Ledger: config/bundle-markers.json · ${emitted.files.length} JS file(s) inspected.`);
+    process.exit(1);
+  }
+
+  console.log(
+    `[bundle-reachability] ok — ${declared} marker(s) declared, ` +
+    `${ledger.present?.length ?? 0} present and ${ledger.absent?.length ?? 0} absent as recorded ` +
+    `(${emitted.files.length} JS file(s)).`
+  );
+}
+
+if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('web-bundle-reachability.mjs')) {
+  await main();
+}
```

## 6. Deliver

1. Ranked findings: file, symptom, reproduction. Mark each CERTAIN / LIKELY / SPECULATIVE — every one gets run before it is acted on, and a wrong mechanism costs more than a missed finding.
2. For anything you would change, the concrete replacement — not "consider using".
3. If a claim in section 2 is not supported by the diff, name it and say why.
