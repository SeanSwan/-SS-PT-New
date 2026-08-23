# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-S0-S2-REVIEW-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 4566 in / 17972 out · **Cost:** ~$0.1168 · **Wall:** 352.7s · **finish:** stop

---

**1. Ranked findings**

**F1 — `scripts/web-bundle-reachability.mjs` — absent arm is not a gate**
Symptom: a surface can ship while the script exits 0.
Reproduction (all CERTAIN, run against `evaluateMarkers` / `main` as exported):
1. Empty ledger: `evaluateMarkers({ ledger: {}, bundleText: 'function OwnerConsole(){}' })` → `[]`. `main` then prints ok and exits 0 (`declared === 0`).
2. Delete the absent entry from `config/bundle-markers.json`. Same: the `for (const entry of ledger.absent ?? [])` loop does not run. The comment says “do not delete the entry”; nothing enforces it.
3. Keep the entry, change `marker` to a string that does not appear (`"___NEVER___"`). Surface is in the JS; `includes` is false; absent arm silent.
4. `catch { ... process.exit(2) }` around `readEmittedJs`: any walk/read failure (permission, dist is a file, readdir throw) is reported as “no build output at … — run the web build first.” Wrong diagnosis, exit 2, no stack.

Substring (CERTAIN): `bundleText.includes(entry.marker)` on the concatenation of every `*.js` file. `"App"` matches `AppBar`, `wrapApp`, a comment, a vendor identifier. `"OwnerConsole"` in a comment or an unused string in a vendor chunk trips `UNDECLARED SHIP`. A marker that is a component/function name is renamed by minify → `present` false-fails, `absent` false-passes (the actual ship path this script exists to catch).

What the diff does not contain, so the §2 mutation-test claim cannot be checked here: `config/bundle-markers.json`, `scripts/web-bundle-reachability.test.mjs`, any `package.json` hook from `vite build` / `npm run build` to this script. If it is not on that path, declaring the console present cannot make `npm run build` exit 1.

Confidence: CERTAIN for 1–4 and the `includes` semantics. LIKELY that minify-renamed identifiers defeat `absent` if that is what they used as markers (markers not in the diff). SPECULATIVE: vendor collision, unicode-escaped literals.

**F2 — `apps/api/src/officialConnectors.ts` `setOwnerEnabled` — second arm is enable+disable legitimacy, not “switch-off-able”**
Symptom: any `news_rss:*` key that already has a state row passes the new 404, including `enabled === true`. The comment says the arm exists so orphans stay switch-off-able. The code does not implement that.

```ts
const known = Boolean(await getProvider(connectorKey))
  || (await input.store.listStates()).some((state) => state.connectorKey === connectorKey);
if (!known) throw new HttpError(404, 'outlet_unknown', 'Unknown news outlet');
```

Reproduction (CERTAIN that the 404 is skipped; run this before arguing exploitability):
1. Insert one row: `connectorKey = 'news_rss:not-in-registry.example'` (ownerEnabled false, no registry row).
2. `setOwnerEnabled('news_rss:not-in-registry.example', false, …)` — does not throw `outlet_unknown`.
3. `setOwnerEnabled('news_rss:not-in-registry.example', true, user, definition.activationPhrase)` — same; the new check has already passed. Whatever 409 you get after that is `status()` / confirmation, not this gate.

Does this re-open the original factory (DISABLE of a never-seen key inserts a row)? Not by itself. The create path is closed only if `getProvider` is a non-writing registry lookup that is falsy for unknown outlets. That function is not in the diff. The probe claim (“ghost 404, no phantom rows”) is the only evidence; it is not in this diff.

Can another writer legitimise a key? Yes, by construction: this predicate is `state row ⇒ real outlet` for both directions. Any other `store` write for a `news_rss:*` string (run/upsert, suspend, seed, import of the 107, a future get-or-create) makes that string switchable and listable via the registry ∪ state union. The fix closed one writer. The arm makes every other writer an orphan factory. Whether such a writer exists today is not in the diff.

Confidence: CERTAIN the arm does not distinguish direction. CERTAIN the predicate is “has state.” SPECULATIVE that another writer exists in this HEAD. Do not treat “enable of a state-only ghost succeeds” as CERTAIN — later readiness may 409 `provider_not_configured`. Treat “enable of a state-only ghost is not 404’d here” as CERTAIN.

**F3 — `apps/api/src/officialConnectors.ts` status blockers — S2 is a flag, not a gate in this diff**
Symptom: `terms_not_recorded` is only this line:

```ts
if (provider && isNewsRssOutletKey(connectorKey) && !provider.termsUrl) blockers.push('terms_not_recorded');
```

No 409, no run abort, no change to any provider builder appears in the diff. `ProviderConfig.termsUrl` is optional, so TypeScript does not force builders to set it.

Reproduction:
1. Read the hunk. Confirm there is no `throw new HttpError(409, 'terms_not_recorded', …)` and no builder assignment `termsUrl: …`.
2. Build a provider with `termsUrl` omitted or `''` and call the function that owns this `blockers` array. Flag is present.
3. Build a provider with `termsUrl: '   '` (whitespace). `!provider.termsUrl` is false. No flag. (LIKELY only if the registry can store that; the check itself is CERTAIN.)
4. Call the civic active predicate still in this diff (`configured && contractReady && ownerEnabled && !suspended` in `civicOfficialSources.ts`). It does not read `blockers` or `termsUrl`. A terms-less key that is already enabled stays “active” on that path.

Fail-closed everywhere? Not shown. Fail-closed on a code path that builds a provider without `termsUrl`? Only if every consumer of readiness reads this array. The one consumer in the diff does not. Already-enabled outlets (the live one) are not newly stopped by this hunk. DISABLE is unchanged, as claimed.

If a builder forgets to copy the registry field, every `news_rss:*` key gets the flag. That is fail-closed for whatever actually consults `blockers`, and it will also 409-brick re-enable of the live outlet if enable consults `blockers`. The diff cannot tell you which.

Confidence: CERTAIN the diff only pushes a string. CERTAIN civic `active` ignores it. LIKELY enable 409s only if pre-existing code already 409s on `status().blockers` (claimed probe; not in the diff). Do not ship a finding that says “enable does not 409” until that call is executed.

**F4 — `apps/api/src/featureDispatchContext.ts` + `civicOfficialSources.ts` — one instance of the clock bug, class intact**
Symptom: `now` is optional on the context and defaulted again at the route:

```ts
const items = active ? await loadStories(input.store, input.now ?? (() => new Date())) : [];
```

Reproduction (CERTAIN):
1. Construct `OfficialConnectorService` with a pinned clock (the old test setup).
2. Call `handleCivicOfficialSourcesRoute({ … })` without `now`, or through any dispatcher that does not copy `now` onto the context.
3. `loadStories` uses wall clock. Fixture items with absolute timestamps drop out when `wall > itemTime + retentionHours` (the 2026-08-13 failure mode).

The class is “layer A has a fake clock, layer B calls `new Date()`.” This commit adds a second optional clock next to the connector clock and updates one route. Two clocks can still diverge. No other route in the diff was changed. There is no required `now` on the context, no default at `createApiApp` only, and `createApiApp` / `dispatchRequest` / `dispatchFeatureRoute` are not in the diff at all — the claimed thread is not here.

Will *this* test rot the same way? The test is not in the diff. If it now passes `now` into the handler, this test will not rot. If it only moved fixture dates and still omits `now`, it will rot one retention window after those dates. Do not mark “the test will rot” CERTAIN. Mark “any caller that omits `now` still uses the wall clock” CERTAIN.

Confidence: CERTAIN class not removed; CERTAIN default is still wall clock at the leaf; CERTAIN the three dispatch files are absent from the diff. SPECULATIVE that the unseen test still uses absolute dates without `now`.

**F5 — `apps/api/src/officialConnectors.ts` — `getProvider` is an unshown load-bearing assumption**
Symptom: the orphan check is `Boolean(await getProvider(connectorKey))` *before* `listStates`. If `getProvider` is get-or-create, or returns a family-level object for any `news_rss:*` (because `definitionFor` already does that), then `known` is always true and `d45e0e7 (a)` is a no-op — DISABLE of a ghost writes a row again.

Reproduction: call `getProvider('news_rss:ghost.invalid')` on this HEAD.
- Falsy, no write → check holds. The HTTP probe claim says this is what they saw.
- Truthy or a write → hole is open; `setOwnerEnabled(..., false)` mints the phantom.

Confidence: SPECULATIVE as a live bug (probe contradicts it). CERTAIN as a coupling the diff does not close: the new 404 is only as correct as `getProvider`. Execute `getProvider` on a ghost before treating S0 as done. Also execute whether `getProvider` writes (standing law: a read must not write).

---

**2. Concrete replacements**

`setOwnerEnabled` news-key check — replace the `known` block with direction-split, registry first:

```ts
if (isNewsRssOutletKey(connectorKey)) {
  const inRegistry = Boolean(await getProvider(connectorKey));
  if (!inRegistry) {
    if (enabled) {
      throw new HttpError(404, 'outlet_unknown', 'Unknown news outlet');
    }
    const hasState = (await input.store.listStates()).some(
      (state) => state.connectorKey === connectorKey,
    );
    if (!hasState) {
      throw new HttpError(404, 'outlet_unknown', 'Unknown news outlet');
    }
  }
}
```

S2 — do not leave this as a status decoration. In the same function that already builds `blockers`, keep the push, and in `setOwnerEnabled` after `const current = await status(connectorKey)` (enable branch only) the 409 must be visible next to this commit, not assumed:

```ts
if (enabled && current.blockers.includes('terms_not_recorded')) {
  throw new HttpError(409, 'terms_not_recorded', 'Outlet terms URL is not recorded');
}
```

Whitespace:

```ts
if (provider && isNewsRssOutletKey(connectorKey) && !provider.termsUrl?.trim()) {
  blockers.push('terms_not_recorded');
}
```

`ProviderConfig.termsUrl` cannot stay optional if builders are required to carry it. The two builders (not in this diff) must assign `termsUrl` from the registry row; if the full commit does not contain those assignments, this gate 409s every news outlet or no-ops, depending on whether enable/run read `blockers`. Execute both builders. If run/tick decides liveness with anything like the civic predicate, add `&& !status.blockers.includes('terms_not_recorded')` there or the legal comment is false.

Clock — required on the context, default once at app construction, never at the route:

```ts
// FeatureDispatchContext
now: () => Date;

// createApiApp (not in this diff; this is the missing line)
now: input.now ?? (() => new Date()),
```

```ts
// civicOfficialSources.ts — no `?? (() => new Date())`
const items = active ? await loadStories(input.store, input.now) : [];
```

`dispatchRequest` / `dispatchFeatureRoute` must pass `now: ctx.now` through. A test that pins only the connector clock and not `context.now` must fail. That failure is the regression test; a test that never ran against the broken split is a decoration.

Bundle script — replace `includes` on a blob, refuse an empty/broken ledger, stop lying in `catch`:

```js
export function evaluateMarkers({ ledger, bundleText }) {
  if (!Array.isArray(ledger.present) || !Array.isArray(ledger.absent)) {
    return ['INVALID LEDGER: present and absent must both be arrays'];
  }
  if (ledger.present.length + ledger.absent.length === 0) {
    return ['INVALID LEDGER: empty ledger is not a gate'];
  }
  const failures = [];
  const seen = new Set();
  for (const entry of [...ledger.present, ...ledger.absent]) {
    if (typeof entry?.marker !== 'string' || entry.marker.length < 16) {
      failures.push(`INVALID MARKER on ${entry?.surface ?? '?'}: need a dedicated ≥16 char string literal that minify cannot rename`);
      continue;
    }
    if (seen.has(entry.marker)) failures.push(`DUPLICATE MARKER: "${entry.marker}"`);
    seen.add(entry.marker);
  }
  // keep the present/absent includes loops after that
  return failures;
}
```

```js
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      console.error(`[bundle-reachability] no build output at ${distDir} — run the web build first.`);
      process.exit(2);
    }
    throw err;
  }
```

Markers themselves must be dedicated string literals in the surface module (`"__SWANGUARD_SURFACE_OWNER_CONSOLE__"`), not component names. Wire `node scripts/web-bundle-reachability.mjs` as a step that `npm run build` actually runs; that hook is not in this diff.

---

**3. Section 2 claims this diff does not support**

- **api 522/0, web 402, domain 242, database 90, scripts 143, type-check 0.** No test output, no test files, no CI log in the diff.
- **Live Postgres 4/4 and “39/39 carry a terms URL.”** No assertion, no SQL, no registry dump.
- **“Real HTTP route probed: terms-less enable 409, terms-less disable 200, ghost 404 both directions, no phantom rows written.”** No route test, no harness, no probe script. The enable 409 in particular is not implemented in the hunk that claims to cause it.
- **“Bundle control mutation-tested: declaring the console present makes `npm run build` exit 1; restored, exit 0.”** No `bundle-markers.json`, no package.json script, no test file. The JS module alone cannot support that sentence.
- From §1, not §2, but same rule: **“Both runtime provider builders now carry `termsUrl` from the registry.”** Not in the diff. Only the optional field and the `blockers.push`.
- **“Threaded an optional clock `createApiApp → dispatchRequest → dispatchFeatureRoute → route`.”** Only the context field and `handleCivicOfficialSourcesRoute` are in the diff. The three named layers are not.
