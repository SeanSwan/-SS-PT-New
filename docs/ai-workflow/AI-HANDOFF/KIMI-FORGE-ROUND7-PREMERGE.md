# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** ./SWAN-FORGE-ROUND7-PACKET.md
**Seed:** (none)
**Tokens:** 1249 in / 4475 out | **Cost:** ~$0.0709 | **Wall:** 179.3s | **finish_reason:** stop

---

# PRE-MERGE HOSTILE REVIEW — `claude/forge-variantrun-20260812` @ `ea80d040c`

**Scope note up front, because precision matters more than persona:** this diff contains zero frontend components, so Crystalline Swan tokens, styled-components, Victory, 44px targets, WCAG 4.5:1, and the 320→3840 breakpoint matrix have **nothing to attach to** — except one artifact: `contactSheet`, which emits HTML. I review that under the design rules. Everything else gets the same hostility applied to CLI/library code. I will not fabricate design violations to look thorough; inventing findings is your workstream's failure mode, not mine.

---

## VERDICT: **DON'T SHIP AS-IS — shippable with 3 small changes, all under an hour of work**

Your "zero blast radius" claim survives my attack (see §A), but three things in this diff are either irreversible-capable or self-describing falsely, and on a repo where **merge = deploy + migrations**, "the code is inert" is not a defense for shipping a liar or a footgun. The fixes are cheap. Do them.

---

## A. ATTACKING "ZERO BLAST RADIUS"

Your reasoning is *mostly* sound, but "nothing imports it" covers only the module graph. Four non-import coupling paths exist on a merge-deploys-to-Render repo:

1. **Test execution in the build pipeline.** 179/179 Forge tests — *where do they run?* If Render's build command or a CI step runs the full suite, then `transportRetry`'s **real 1s/4s sleeps** are now in your deploy path. Worse: if any test exercises retry against a live or recorded provider with real timers, a provider bad day turns your *deploy* into a 15-seconds-slower coin flip. **Verify: are the sleeps injected/mocked in tests?** If not, that's a FIX-BEFORE-MERGE by itself.
2. **`scripts/` discovery.** Does anything glob-execute `scripts/` (a `postinstall`, a Render cron, a `package.json` script wildcard, a migration runner that scans directories)? You verified *imports*. Did you verify *invocation*? One `npm run` glob and `forge-prune.mjs` is in the deploy path.
3. **Migrations run on merge.** You add no migration — confirmed — but the *other agent's* video-pipeline migration deploys with your merge. If that migration fails on Render, your branch is the one that "broke prod." Get a green deploy of `main` *before* merging, or you're volunteering to own someone else's incident.
4. **Committed fixtures with a real OpenAI request id.** Not a credential, but it's a real account identifier in a permanent git history on a repo that auto-deploys. Low severity, permanent lifetime.

**Verdict on the claim:** blast radius is *near*-zero for request-path runtime, non-zero for build-time and operator-invoked paths. Downgrade your confidence language accordingly — which, conveniently, is finding L-1 below.

---

## B. RANKED FINDINGS

### BLOCKER — none.
Nothing here can corrupt the running app or the database on deploy. That is genuine, and you should take the win.

### FIX-BEFORE-MERGE (3 items — the minimum shippable set)

**FBM-1. Kill-list defaults ON with unmeasured aesthetic effect.** Ruling in §C. **Default it OFF.**

**FBM-2. `forge-prune.mjs --apply` has no blast-radius guard.** "Dry-run by default" and "exercised in a throwaway root" are not controls; they're vibes. The only destructive code in the diff ships with no proof it can't escape its sandbox. Required before merge:
- Hard-coded **root allowlist**: resolve the target dir, assert it is inside `.ai-workflow/forge-runs/`, refuse otherwise. Not a flag — a code path that cannot be argued with.
- A test that **attempts to prune a lineage parent and asserts the file survives**. "Lineage parents protected" is currently a claim, not a fact.
- `--apply` should require an interactive confirmation or a second `--i-understand-this-deletes-files` flag when not in a TTY, refuse otherwise.

**FBM-3. The export-binding smoke test lies about its coverage.** You *know* `markWinner` slipped past it because the throw happens before the missing call. A guard with a known hole is worse than no guard — it converts future failures into *confident* future failures. Fix: the smoke test must **invoke each export with minimally valid arguments** (or statically resolve every call site via the AST), not merely import the barrel. If you won't fix it now, rename it `smoke-imports-only.test.mjs` and delete any comment claiming it catches binding gaps. Honest weak test > dishonest strong one.

### FIX-AFTER

**FA-1. `transportRetry` retry policy is naive.** Retries 5xx twice with fixed 1s/4s sleeps: no jitter (thundering herd on provider recovery), no total elapsed budget, no `Retry-After` header honoring, and — verify this — it must **never retry 4xx**. A 400 with a committed fixture proves you've *seen* a 400; if the retry logic can't distinguish, you'll pay for retries on permanent failures. Also: "still charges for successes" — add a per-bracket cost ceiling that aborts the bracket rather than the wallet.

**FA-2. `contactSheet` — 8 MB inline base64 HTML, no size guard, and it's the only design-surface artifact.** Three violations:
- **Performance/size:** cap total inlined bytes (suggest 2 MB); beyond that, write PNGs to disk beside the HTML and `<img src>` them. A contact sheet that won't open in a browser tab is not a contact sheet.
- **Design tokens:** if the emitted HTML contains hardcoded hex colors, that's a token violation the moment any SwanStudios eyeballs it. Emit the Crystalline Swan dark-first palette from a single `const THEME = { bg: '#0A0E1A', surface: '#12182B', text: '#E8ECF4', accent: '#6FD3E0' }` (use your real tokens — the point is *one source*, string-interpolated into the template).
- **A11y:** option buttons in the sheet must be ≥44px touch targets, text on dark bg must hit 4.5:1, and any winner-highlight animation must be wrapped in `@media (prefers-reduced-motion: no-preference)`. It's an internal tool, but internal tools are where a11y habits are built or buried.

**FA-3. Retention "policy" that has never run is a cron job that doesn't exist.** `.ai-workflow/forge-runs/` accumulates unencrypted prompts + PNGs forever. Either wire retention into `forge-prune` (age-based, same root allowlist) or delete the policy doc until it's real. See L-3.

**FA-4. Provenance-test regex dodge.** `TOLERANCE|RADIUS|THRESHOLD|LIMIT` misses `MAX_RETRIES = 2`, `SLEEP_MS = 1000`, `SHEET_OPTIONS = 4`. Add an ESLint `no-magic-numbers` rule scoped to `shared/` with an allowlist for 0/1/-1, or extend the provenance pattern to `RETRY|SLEEP|MAX_|MIN_|_MS|_COUNT`. Right now the guard guards the numbers you already caught — survivorship bias as a test suite.

**FA-5. Real OpenAI request id in committed fixture.** Scrub to `req_redacted` and add a fixture-lint that rejects `/req_[A-Za-z0-9]{10,}/` in committed JSON. ACCEPT-able for this merge; the id is low-value. But git is forever, so do it before the next capture batch.

### ACCEPT

- **+7% cost for the kill-list** — measured, bounded, and moot once it defaults OFF.
- **Ledger on disk unencrypted** — local operator tool, gitignored, threat model is "laptop stolen," and prompts aren't credentials. Note it in the README; move on.

---

## C. RULING ON §2.1 — KILL-LIST: **DEFAULT OFF AT MERGE**

Reasoning, in order of weight:

1. **Asymmetry of error cost.** If it defaults ON and degrades output, every run from merge until Sean's ruling is contaminated *and* the blind pairs themselves become suspect (which runs had it on?). If it defaults OFF and it was actually good, you lose nothing — the measured deltas were +7% cost, no acceptance/palette change. The expensive error is ON-and-bad; the cheap error is OFF-and-good. Take the cheap error.
2. **Nothing imports it.** The default only acquires meaning when a consumer exists. Sean's blind-pair ruling can land *before or with* the consumer. There is no operational reason the default must be decided today — so decide it in the safe direction.
3. **Your own workstream history.** Every confident-but-unmeasured aesthetic claim in this project has eventually needed retraction. "Unmeasured" + "on by default" is the exact shape of your recurring failure.

**Builder-exact correction:**

```js
// shared/forge-config.mjs
// Kill-list prompt injection. DEFAULT OFF pending Sean's blind-pair ruling
// (tracked: <link to pairs>). Do not flip without a measured acceptance delta.
export const KILL_LIST_ENABLED = process.env.FORGE_KILL_LIST === '1';
```

Env-var opt-in, not a boolean someone flips in a drive-by edit, and a comment that names the *gate condition* for changing it. A default with a named gate is a decision; a bare `true` is an accident.

---

## D. LIES IN THE DIFF (§c — the part you asked for and will like least)

I can't read the code from here, so these are the lies your *own document* confesses to, plus the verification each demands. A comment that lies outlives its author — your words, and correct.

- **L-1: "Zero blast radius."** Your §1 states it as fact; §A above shows it's *near*-zero with four unverified coupling paths. If that phrase or anything like it appears in a README, commit message, or code comment, rewrite it: *"No backend route or React component imports these modules; build-time and operator-invoked coupling not yet audited."* Precision or deletion.
- **L-2: The smoke test's implied contract.** Whatever it's named — `exports.test`, `bindings.smoke.test` — it claims "exports resolve" and you have a *proven counterexample in hand* (`markWinner`). This is the worst lie in the diff because it's a **guard that lies about guarding**. FBM-3.
- **L-3: "Retention policy."** A policy that has never executed is a *document*, not a policy. If any comment or doc says runs "are retained for N days," the true statement is "runs accumulate forever; a pruning script exists and has never run in production." Fix the words or wire the cron.
- **L-4: "Lineage parents protected."** Protected by what — a code path with a test that tries to delete a parent and fails, or by your recollection of the logic? If the latter, the sentence is a lie-in-waiting. FBM-2's test makes it true.
- **L-5: "Thresholds guarded by provenance test."** Guarded for constants whose names match one regex. `MAX_RETRIES` and `SLEEP_MS` walk straight past it. The claim overstates coverage by exactly the magic numbers most likely to be eye-tuned. FA-4.
- **L-6 (suspected, verify): `transportRetry` error messages.** Check every throw/log line against behavior: does anything say "retrying" on the final attempt, "provider error" on a 400 (which is a *client* error), or "timed out" when it was a 5xx? Retry code is where error messages go to lie, because the message is written for the happy path of the retry loop and read on the sad one.

---

## E. SINGLE HIGHEST-IMPACT IMPROVEMENT

**Fix the smoke test (FBM-3).** Not the prune guard — that's the highest *severity*, but it's one script, run by hand, with a dry-run default. The smoke test is the **meta-failure**: it is the guard whose known hole let `markWinner` through, and it will keep certifying broken code with a green checkmark for as long as it exists. Every other finding in this review was catchable by a guard that tells the truth. Repair the immune system, not the symptom.

Builder-exact:

```js
// backend/tests/forge-exports.smoke.test.mjs
import * as barrel from '../../shared/forge/index.mjs';

for (const [name, fn] of Object.entries(barrel)) {
  test(`export ${name} is callable end-to-end with valid minimal args`, async () => {
    expect(typeof fn).toBe('function');
    // MINIMAL_VALID_ARGS: hand-maintained per export; a missing entry fails the suite.
    await expect(fn(...MINIMAL_VALID_ARGS[name])).resolves.not.toThrow();
  });
}
```

The `MINIMAL_VALID_ARGS` map is the point: `markWinner` would have received a *valid* argument, reached the undefined call, and died in CI instead of in production. Yes, maintaining the map is toil. That toil is the price of the claim the test's name makes.

---

## F. MERGE CHECKLIST (in order)

1. Flip kill-list default OFF via env gate (§C). ~5 min.
2. Root allowlist + lineage-parent survival test + TTY confirmation on `forge-prune --apply` (FBM-2). ~20 min.
3. Smoke test invokes exports with valid args, or is honestly renamed (FBM-3 / §E). ~20 min.
4. Confirm Forge tests mock retry sleeps; confirm nothing globs `scripts/`; confirm `main` deploys green *before* your merge (§A). ~10 min of reading, zero code.
5. Merge. Then file FA-1…FA-5 as the next batch, with the 300-line `wc -l` CI gate added so "four line-cap breaches in one batch" becomes a build error instead of a confession.

**What I would stop:** nothing about the *architecture* — an inert, tested, $0.13 library is a fine thing to land. I would stop the *merge* until the three FBM items land, because two of them are irreversible-capable and one of them makes your entire test suite a more confident liar. On a repo where merging is shipping, the bar isn't "is the code good" — it's "does anything in this diff make a claim it can't keep." Right now, three things do.
