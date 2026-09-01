# Hostile review — round 4: does it come back clean? — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND4-PACKET-2026-08-27.md
**Tokens:** 21116 in / 29988 out (reasoning: 27895) | total 51104
**Wall:** 746.2s

---

Spot-checks first, so you know what I did *not* re-litigate: the KNOWN_UNGATED freeze is a real asserted key set; the token is written to a file, not stderr; the `else if (hit && !defaultKey)` branch is gone and stays gone; `--max-tokens` and `--model` can only raise. Those fixes hold. What follows is what doesn't.

```
VERDICT:   REVISE
```

## BLOCKERS

**B1 — `NON_EXECUTING` is position-blind; one appended token stands the whole gate down.** `paid-seats.mjs`, `invokesPaidSeat`/`allScriptNamesFrom`.
The carve-out tests `--check|--version` **anywhere** in the command, not between the runner and its target. Both shapes fail open deterministically:

```
node scripts/consult-fable.mjs --document plan.md --version     # exit 0, no cap, no record
node --check scripts/lib/paid-seats.mjs && node scripts/consult-fable.mjs --document x   # exit 0
```

This is the third recurrence of the file's own documented class — "honoring a flag the target ignores" (`--dry-run`, `--max-tokens 500`) — reintroduced by the fix for the `node --check` cry-wolf. The shims ignore unknown flags and bill in full; your own comments say so. Fix: honor the flag only in the runner's flag position (between interpreter token and script path), or evaluate per-invocation rather than per-line.

**B2 — Per-invocation summing prices unpriced siblings at $0, and the unpriced-block only tests the winner.** `spend-guard-gate.mjs`, `priceOf`/`chargeable`/`oneCallUsd`.
`oneCallUsd` returns `0` for a name with no `SCRIPT_MODEL`/`PRICES` entry, and `priceOf` returns `-1` so an unpriced name can never win the max — meaning the `!price && !isPanel` block, which reads "an unknown seat now falls through to the unpriced BLOCK," is **false for every compound line**. Repro with files that exist on main today:

```
node scripts/consult-grok.mjs --document a && node scripts/consult-openrouter-panel.mjs --seats fable --confirm-spend
```

`chargeable = [grok, panel]`, winner = grok ($0.53, under every cap), panel contributes `oneCallUsd = 0` → ALLOW, reserve $0.53, and a $1.05+ fan-out rides free. Any *future* `consult-x.mjs` not yet in `SCRIPT_MODEL` rides at $0 beside any priced seat — the SWA-218 inversion is cosmetic exactly in the batching case the summing fix was built for. (Minor sibling defect: the refusal text names only the winner's model, so a blocked compound line is misdescribed.) Fix: block if **any** chargeable name has `priceOf === -1` (panel excepted), or sum unknowns at `CAPS.perCall`.

**B3 — `maskQuotedData`'s interpreter whitelist is prefix-blind, in both directions.** `paid-seats.mjs`, `maskQuotedData`.
A quoted span survives only if it *starts* with env-assignments/`env`/interpreter. It **hides** real invocations with any other command prefix:

```
sh -c "timeout 600 node scripts/consult-fable.mjs --document plan.md"   # exit 0, uncapped
bash -c 'cd scripts && node consult-fable.mjs --document x'             # exit 0, uncapped
sh -c "exec node scripts/consult-fable.mjs"                             # same; also env -i, nohup, nice
```

This is a regression introduced by the B2/F5 fix: the old opaque-quoted-middle form matched all of these. And it **breaks** an honest command, because a data span that merely *starts* with an interpreter survives as code:

```
grep -rn "node scripts/consult-fable.mjs" docs .ai-workflow
```

→ the gate engages, reserves ~$1.06 on topic `untitled`, and blocks the search outright once `untitled` approaches caps — cry-wolf on an audit command, per your own doctrine the most corrosive failure. Fix direction: treat a span as code when an interpreter follows a command separator (or one of `exec|timeout|nohup|env …`) *anywhere* in the span, and accept the residual false-positive on data quoting a full invocation, or match on runner-adjacent position rather than span-start.

**B4 — The reservation closes F1's window, not the race.** `spend-ledger.mjs` `checkSpend` + gate reserve order.
The sequence is read → decide → **then** append the hold. Nothing serializes the decision against the reserve, so concurrent gates can each pass on the same snapshot — F1 narrowed from call-duration to gate-duration, not eliminated. Your own instrument says so: **12/20 under a barrier is the measurement of the residual window.** A guard whose cap enforcement is run-dependent is exactly the "deterministic, or it is not a control" violation this file keeps quoting. Fix: reserve-then-check — append the hold, re-read totals including it, release on refusal. Atomic under the same O_APPEND line-atomicity the design already relies on; no locks needed.

## FINDINGS

1. **(Your question 5 — the fifth vacuous test) `spend-coverage.test.mjs`, "the credential grep actually discriminates."** Red-test it: change one seat's credential read to `process.env['OPENROUTER_API_KEY']` (or `const { OPENROUTER_API_KEY } = process.env`). `spendsMoney` goes false for every seat — and every test stays green: `paid` still contains `lib/preflight.mjs` and the two gateway libs (satisfying `paid.length > 0` and `< all`), all of which sit in `KNOWN_UNGATED`, so the CONTRACT passes too. The control's positive bound is satisfied forever by frozen library entries, so it **cannot detect the grep going blind on its actual subject** — the same instrument-blindness class as the walker control you fixed. Fix: pin a positive exemplar — `assert.ok(paid.some(f => f.endsWith('consult-fable.mjs')))`.
2. **Releases settle holds by model+topic count, not identity** (`readReservations` fold). A compound line reserves **one** hold under the winner's key while each script releases under its own: the first `recordSpend` settles the entire combined hold while siblings are still running (in-flight blind — the F1 shape, reopened by design for exactly the batching case), and each mismatched release becomes an orphan that silently settles **one future same-key hold within TTL**. The panel is the systematic case: reserves as `'panel'`, settles per-seat — every panel run mints orphans. Fix: correlation id on reserve/release.
3. **Coverage surface (your question 4):** the `process.env.` dot-convention misses bracket access, destructuring, and aliased env — one linter-driven refactor away from finding 1's blindness; the walker takes only `.mjs` under `scripts/` (depth ≤ 6), so `.cjs`/`.ts`/repo-root scripts escape. Delegation (F6) stays recorded and is *not* re-raised.
4. **Reservations file hygiene:** append-only with no compaction — every gate parses the whole file, unbounded. Also: at midnight a live hold drops out of today's totals while its settled row lands on today; `recordSpend` releases *before* appending the ledger row (a two-write window where the call counts nowhere), and a failed release write double-counts until TTL (safe direction, but spurious).
5. **`KNOWN_UNGATED` hosts three libraries that cannot bill** (`lib/preflight.mjs`, both gateway files). Semantically these are `FREE_ALLOWLIST` entries parked in the frozen-debt list — the baseline you're fighting to shrink is inflated by non-debt. The freeze assertion makes relocation a deliberate act anyway; do it.

## MISSED

- You never verified the consult scripts' `recordSpend` **model strings against `SCRIPT_MODEL` keys**. The release pairing assumes they match; finding 2 is the price when they don't. One test pins it: for each gated seat, the script records the key the gate reserves under.
- No lifecycle test that in-flight totals **drain to zero** after a settle — a leak test for the hold itself.
- The appendix omits `spend-guard-gate.test.mjs`: the 12/20 claim and the gate's own tests are unauditable from this review, and the harness's parallel-hook behavior — the assumption the entire reservation design rests on — is asserted nowhere.
- No test that a compound line **reserves per invocation**. It would have caught B2's $0 sibling at test time, the same way "expensive seats must block" caught the panel-ordering bug within a minute.

## ONE THING

**Reserve-then-check.** Append the hold *before* deciding, re-read, release on refusal — the release machinery already exists. It converts the last probabilistic control into a deterministic one, and adding a correlation id in the same change settles releases against the hold they belong to, closing finding 2 with it. Two of the four blockers are one-line fixes; this is the structural one.
