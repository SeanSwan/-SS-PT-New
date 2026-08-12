# Consult reply — Kimi K3 (moonshotai/kimi-k3) — 2026-08-12T07:40:54.447Z

> tokens: prompt=10092 completion=5154 | finish_reason: stop | max_tokens: 60000

# Hostile Review — QA harness slices 0+1

## 1. VERDICT

**SEND-BACK.** The slice's headline claim — "an expired suppression fails the build" — is false as committed. The expiry mechanism is wired to a console printout, not to any assertion.

---

## 2. Correctness bugs, most severe first

### BUG-1 (fatal): The suppression registry gates nothing. `worklist.blocking` is never asserted.
In `production-dashboard-crawl.mission.spec.ts`, `buildWorklist()` is called, `formatWorklist()` is `console.log`'d, and then the actual gates are:

```ts
expect(overTruncationBudget(...)).toEqual([]);
expect(compactIssues(state, routes)).toEqual(NO_ISSUES);
```

`worklist.blocking` — which is where `expired-suppression` (critical) findings land via `suppressionFindings()` — is computed and thrown away. An expired suppression therefore produces a red line in stdout and a JSON field, and **the test still goes green**. The entire incentive fix ("on that date the build FAILS until someone consciously renews") is documentation, not code. One line fixes it:

```ts
expect(worklist.blocking, formatWorklist(worklist.blocking)).toEqual([]);
```

Without it, slices 0+1 ship a *description* of an incentive fix.

### BUG-2 (fatal): `compactIssues` — the real assertion — never consults `QA_SUPPRESSIONS`. The old permanent allowlist is still the gate.
`compactIssues()` filters console noise via `allowedConsoleNoise()`, which hardcodes, with no expiry, no reason, no owner:

```ts
if (/preloaded using link preload/i.test(message)) return true;
if (/Service Worker: PWA functionality temporarily disabled/i.test(message)) return true;
```

These are **verbatim the two entries in `qaSuppressions.ts`** — the entries whose header says "silencing is permanent, unattributed and free" is the thing being abolished. So today there are two parallel suppression systems: the new expiring registry (which affects only a log line, per BUG-1) and the old permanent regexes (which actually decide green/red). When `unused-link-preload` expires on 2026-11-10, the build will not fail — `allowedConsoleNoise` keeps swallowing the warning forever. The slice migrated the *paperwork* and left the *mechanism*. Fix: `compactIssues` must take the surviving-findings list (or the compiled, in-date suppressions) as input, and `allowedConsoleNoise` must shrink to genuinely harness-owned exhaust only.

### BUG-3 (fatal): `mission-report.mjs` exits 0 with blocking findings present.
The script correctly refuses to write a report when there is *no evidence*. But when there is evidence full of defects:

```js
const blocking = findings.filter((finding) => finding.severity !== 'low');
...
process.stdout.write(`... ${blocking.length} blocking finding(s)\n`);
// falls off main → exit 0
```

The header promises "a QA report that cannot find evidence must not look like a clean bill of health" — but a report *with* 14 critical findings also exits success. Any CI step gating on this script's exit code passes on a broken site. `process.exit(blocking.length ? 2 : 0)` (and arguably non-zero when any `summary.complete === false`).

### BUG-4: `blocked-write` findings are silently dropped from the worklist.
`FindingCategory` includes `'blocked-write'` with severity `'low'`, but `toRawIssues()` never emits it — the `tail` array covers `consoleErrors/pageErrors/requestFailures/readFailures` only, and no per-route drain touches `state.blockedWrites`. Meanwhile `compactIssues` *does* assert `blockedWrites` against `NO_ISSUES`. Result: the ranked worklist can print `(no findings)` seconds before `expect(compactIssues(...))` fails on blocked writes — the worklist and the gate disagree, which is precisely the "two sources of truth" smell this refactor was meant to kill. Either emit them or delete the category.

### BUG-5: `allowedConsoleNoise`'s 400/405 correlation is run-global, so one benign event whitelists an entire class of defect.
```ts
if (/...status of 400/i.test(message)) {
  return state.requestFailures.some(isSocketPollingUrl) || ...
}
if (/...status of 405/i.test(message)) {
  return state.blockedWrites.length > 0;
}
```
The Socket.IO poll failure happens during teardown — so by late in the crawl, `some(isSocketPollingUrl)` is permanently true, and **every** subsequent "Failed to load resource: 400" console error, from any endpoint, for any reason, is whitelisted. Same for 405 once a single write has been blocked. A real regression (e.g. a genuinely broken POST returning 400) hides behind the harness's own exhaust. The correlation must be per-message (match the URL in the console error against the socket.io/blocked-write entries), not existential over global state.

### BUG-6: `applySuppressions` marks only the *first* matching suppression active; overlapping entries are falsely reported stale.
```ts
const hit = usable.find(({ regex }) => regex.test(finding.message));
```
If suppression A and B both match a finding, only A's id enters `matched`; B lands in `audit.stale` with "the defect may be fixed; delete it." An operator following the tool's own advice deletes B — which was load-bearing the day A is removed or narrows its pattern. Stale-detection must test each suppression against *all* findings independently, not via first-hit attribution.

### BUG-7: Duplicate suppression `id`s are not detected.
`matched` is a `Set` keyed by `id`; the audit's invalid-checks cover reason/expiry/pattern but never uniqueness. Two entries sharing an id: the second is invisible in `active`/`stale` attribution. Low severity, but it's the registry's only identity key and it's unenforced.

---

## 3. Where the design still reports green having tested nothing

Ranked:

1. **BUG-1/BUG-2 combined** — the expiring registry cannot fail the build and the permanent regexes cannot expire. Every claim in the `qaSuppressions.ts` header is currently aspirational.
2. **`mission-report.mjs` staleness** — `loadReports` takes newest-per-role with **no freshness window**. A crawl run once in August produces a report in December that reads "Source: 4 crawl result file(s)" and renders coverage as fact. Add an mtime cutoff (e.g. refuse or banner-warn if newest report > 24h old relative to generation time). As written, the "no evidence ≠ clean" principle is enforced only for *zero* evidence, not *old* evidence.
3. **`flushCrawlReport` swallows write failures into `return null` with no logging.** If the output dir is unwritable (permissions, disk full), every per-route flush silently no-ops, and a later crash leaves *no* evidence — recreating the exact Slice-0 failure mode, quieter. Log to stderr in the catch; "never throw" is right, "never tell anyone" is not.
4. **`testInfo.outputPath` filename is per-test so parallel roles don't collide — good — but nothing verifies `routeResults.length` against `allRoutes` inside the worklist path.** `compactIssues` computes `unreachedRoutes`, which saves you, but only because it's asserted. The worklist itself (BUG-1) isn't. One gate carrying the whole "partial run ≠ green" guarantee is thin.
5. `attachCrawlReport` can throw (serialization, attachment size limits) and sits *before* the assertions — an attach failure fails the test with an attachment error, masking the real findings underneath. Wrap it like the flush.

---

## 4. Attacking the suppression expiry mechanism

How to silence a defect permanently without it looking like you did:

1. **Broadest-pattern attack.** `pattern: '.'` matches every finding message, is "active" every run, and shows in the report as one innocuous `active '.'` line among many. Nothing constrains pattern specificity. Mitigation: require a minimum pattern length / reject patterns matching >N distinct fingerprints, and include each suppression's *match count* in the audit so a blanket entry is visibly fat.
2. **The renew-forever attack.** Expiry fails the build → engineer bumps `expires` by 90 days → green. Nothing requires the `reason` to change, links to a ticket, or ratchets (each renewal shorter than the last). As committed, renewal is exactly as free as the old allowlist append, just with a quarterly cron cadence. This is a process hole the code could at least narrow: require `reason` to differ on renewal, or require an `owner` field (currently optional — an unattributed suppression is the thing the header claims to abolish, and it's still legal).
3. **The stale-laundering attack (BUG-6 inverse).** Narrow your pattern so it matches nothing → tool says "stale, delete it" → delete it. If the defect was merely intermittent (production-only, load-dependent), you've used the tool's own hygiene prompt to erase the record that it existed.
4. **The invalid-suppression asymmetry.** A malformed pattern becomes a critical `expired-suppression` finding — good — but only in the worklist, which per BUG-1 gates nothing. So today even *invalid* suppressions don't fail the build.
5. **`today` injection is fine, but the *caller* passes `new Date().toISOString().slice(0,10)`** — so "deterministic in tests" is honored; just note the boundary semantics: `expires < today` means the suppression is still valid **on** its expiry date. Header says "Past this date the suppression FAILS" — consistent, but make sure reviewers read it that way; "expires 2026-11-10" intuitively means dead on the 10th.

---

## 5. Breaks in CI but not locally

1. **mtime-based newest-first in `findReports`/`loadReports`.** CI checks out fresh, but `--results` pointed at a cached/artifact-restored directory gets mtimes from the *restore*, not the run — "newest per role" can pick a stale role file restored seconds later than a fresh one. Prefer parsing the run timestamp or picking by directory recency, not file mtime.
2. **`statSync` inside the sort comparator** will throw `ENOENT` if anything (a parallel Playwright worker still flushing, a cleanup step) deletes a file between `readdirSync` and sort. Locally rare; in CI with concurrent workers and artifact sweeps, real. Guard it.
3. **UTC clock rollover:** `today` is captured once per test — fine — but `flushCrawlReport`'s *default* parameter reads the clock again per call. The spec always passes `today`, so this is latent, but any future caller omitting it gets a report whose expiry evaluation can straddle midnight UTC between routes. Delete the default; force the caller to pass it.
4. **`SEVERITY_RANK` (qaFindings.ts) and `SEVERITY_ORDER` (mission-report.mjs) are two hand-synced copies.** The .mjs one can't import the TS one by design — so generate the JSON worklist with ranks baked in, or tolerate the drift knowingly. First person to add a severity updates one file.
5. Playwright cleans `outputDir` at run start, which is the only thing saving `mission-report` from cross-run contamination locally; if CI ever sets `--output` to a persistent cache dir, stale-role merging (point 2 in §3) activates immediately.

---

## What I'd require to flip to SHIP

1. Assert `worklist.blocking` (BUG-1).
2. Route `compactIssues` gating through the surviving-findings path and strip the duplicated hardcoded noise regexes down to harness exhaust only (BUG-2, BUG-5).
3. Non-zero exit from `mission-report.mjs` on blocking findings (BUG-3).
4. Emit or delete `blocked-write` in `toRawIssues` (BUG-4).
5. Stderr log in `flushCrawlReport`'s catch.

The architecture is right — category-derived severity, fingerprint dedupe, injected clock, crash-durable flush are all sound. But right now the enforceable gate is the *old* system and the new system is a beautifully formatted advisory. Wire the incentive into the assertion or the slice hasn't landed.
