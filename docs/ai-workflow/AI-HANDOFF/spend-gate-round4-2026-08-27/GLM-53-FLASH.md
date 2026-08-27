# Hostile review — round 4: does it come back clean? — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND4-PACKET-2026-08-27.md
**Tokens:** 21126 in / 29006 out (reasoning: 26441) | total 50132
**Wall:** 613.2s

---

VERDICT: **REVISE**

Two deterministic, fail-open bypasses survive scrutiny. Both are reachable by honest agents with single-line commands, both reproduce by inspection against the code as written, and both are the same class this PR's own history calls a blocker. Everything else below is real but smaller.

## BLOCKERS

**1. `paid-seats.mjs` — `NON_EXECUTING` is line-global, so a flag the script doesn't implement ungates the whole command. Severity: Blocker.**
`invokesPaidSeat` and `allScriptNamesFrom` test `NON_EXECUTING` against the entire command string, with no position constraint relative to the runner and the script name. `node --check` means "don't execute" only when it sits *between* runner and file. It doesn't:
```
node scripts/consult-fable.mjs --document x --check     → exit 0
node --version && node scripts/consult-fable.mjs --document x  → exit 0
```
Fable ignores unknown flags and bills in full — this file's own commentary establishes exactly that for `--dry-run` and `--max-tokens`, and names the class: "honoring a flag the target ignores is how a gate lies." The carve-out reintroduced it one branch over, and the second repro is an *honest* compound, not an adversarial one. The round-2/3 bypass fixes (masking, `DRY_RUN_AWARE`, the deleted `--model` branch) are all undone by two appended characters. Fix: only treat `--check`/`--version` as non-executing when the invocation match places them between the runner and the script path — per invocation, never per line.

**2. `paid-seats.mjs` — `maskQuotedData` erases real quoted invocations before `PAID_INVOCATION` runs. Severity: Blocker.**
The rule "a quoted span survives only if it starts with an interpreter" hides every quoted invocation that begins with anything else:
```
bash -c "cd /srv/app && node scripts/consult-fable.mjs --document x"  → exit 0
node "scripts/consult-fable.mjs" --document x                          → exit 0
sh -c "exec node scripts/consult-fable.mjs --document x"               → exit 0
```
Note the regression: round 2's opaque-quoted-span alternation in `PAID_INVOCATION` matched the first of these on raw text — I traced it, `[^|;&]` plus the quoted-span alternative matches across `cd /srv/app && `. The mask now blanks that span before the regex fires, so the alternation is dead code for exactly the shapes it was built for. Prefixes like `cd`, `exec`, `timeout 60`, `nohup` are ordinary in agent-written compound commands, and quoting a path is legal shell. The gate never sees these calls: no cap, no reservation, no ledger row until the script books its own spend post-hoc.

## FINDINGS

**3. `spend-ledger.mjs` / `spend-guard-gate.mjs` — the reserve happens *after* the allow decision, so F1 is mitigated, not closed. Severity: High.**
`checkSpend` reads ledger+reservations, returns allow, and *then* the gate calls `reserveSpend`. N concurrent callers that all read state before any reserve lands all admit — the same TOCTOU one level up that the append-only design correctly identified elsewhere. Your own barrier test measuring 12/20 detection is the signature of exactly this window. The header table says F1 is "FIXED"; the honest statement is "narrowed and probabilistic." Fix: reserve optimistically *before* checking (the hold includes the caller's own worst case), release on refusal. That converts the race into a brief over-count — the safe direction.

**4. `spend-ledger.mjs` — `readReservations` fold lets a release settle the wrong hold. Severity: High.**
Releases are keyed only on `model|topic` and the two-pass fold consumes them against *any* unsettled reserve, including reserves appended after the release. So any `recordSpend` without a live matching reserve mints a coupon for the next 10 minutes: (a) Sean runs a consult by hand outside the harness — no hook, but the shim still records → orphan release; (b) a call longer than `RESERVATION_TTL_MS` — its reserve ages out, and the release `recordSpend` appends at completion eats the *next* same-model+topic reserve. Concrete: a Fable call runs 11 minutes (its worst case makes this plausible), a parallel gated kimi call on the same document fires at minute 11 — its hold is silently cancelled and the day cap under-counts it. That is F1 reopening deterministically for long calls. Fix: the release carries the reserve's identity (nonce returned to the caller, threaded through `recordSpend`), or fold strictly in append order and ignore orphan releases. Holds cannot double-count — `recordSpend` releases before appending the real row — and leakage is TTL-bounded; the wrong-settle is the real defect.

**5. `spend-guard-gate.mjs` — a panel in a compound line prices its fan-out at $0. Severity: Medium.**
```
node scripts/consult-openrouter-panel.mjs --seats fable,sol --document x && node scripts/consult-kimi.mjs --document y
```
`allScriptNamesFrom` returns both names; `priceOf(panel)` is −1 (no `SCRIPT_MODEL` entry), so `scriptName` resolves to kimi, `isPanel` is false, and the sum branch evaluates `oneCallUsd(panel)` = **0**. Worst case priced: ~$0.31; real exposure: ~$1.68. The panel's special-case pricing only exists on the path where it is the *worst or only* chargeable name — which its −1 price makes impossible in any compound. Fix: if a panel name appears in `allNames`, add `panelUsd` to the sum. Related, same function: `SEAT_WORST_USD`'s `$0.35 ??` default silently under-prices any future expensive seat, and no coverage test ties that map to the panel's actual roster — the hand-curated-list drift pattern again, one table over.

**6. `spend-guard-gate.mjs` — the `--model` raise is dropped in the sum branch. Severity: Low.**
`modelKey` can be raised by the override logic, but when `chargeable.length > 1` the sum uses `oneCallUsd`, which reads `SCRIPT_MODEL` defaults only. In precisely the multi-call lines B4 was about, a raise the gate just computed is discarded. Direction is under-count.

**7. `spend-coverage.test.mjs` — what still escapes after recursion and `process.env.`. Severity: Medium (drift-catcher, not a runtime control — but the contract claims completeness).**
- Idioms: `const { OPENROUTER_API_KEY } = process.env`, `process.env['OPENROUTER_API_KEY']`, `const env = process.env`, `Bun.env`, dotenv/config imports — none contain the `process.env.<MARKER>` literal, so a new paid script written in the most common modern style sails through every test green, with no failure prompting an allowlist decision. The recorded delegation gap covers *spawning*; this one covers *reading*, and it is not recorded anywhere.
- Walker: `.mjs`-only (a `.js`/`.cjs` helper reading a key is invisible), rooted at `scripts/` only, dot-directories skipped, `depth > 6` cap, symlinked directories not followed.
- `FREE_ALLOWLIST`/`KNOWN_UNGATED` match by basename first, so a *nested* `consult-gemini.mjs` inherits the top-level exemption and the ghost test stays green.

**8. `paid-seats.mjs` — the honest-break direction of `maskQuotedData`. Severity: Low.**
A quoted data argument that begins with the literal word `node` and names a seat survives the mask and matches: `--remit "node scripts/consult-fable.mjs keeps timing out"` is prose, but it is now priced as an invocation and blocked. F5 is partially resurrected for interpreter-first data spans. Rare, but it's the false-positive direction this workstream keeps paying for.

**9. `spend-ledger.mjs` — unbounded files, parsed on the hot path. Severity: Low (performance), grows monotonically.**
`reservations.jsonl` and `ledger.jsonl` are never compacted or rotated. Every gate decision parses the whole ledger and reads+parses reservations **twice** (`spentToday` and `spentOnTopic` each call `readReservations`). Every allowed call appends two reservation rows forever. After months this is per-Bash-call latency creep on the hottest hook in the harness. Fold-and-rewrite live rows when the count crosses a threshold; rotate the ledger the same way.

**10. `spend-ledger.mjs` — token redemption still consults the JSON before the atomic claim. Severity: Low–Medium.**
Redemption requires `!tokens[key].used` — a read-modify-write of the whole store via `writeFileSync`, no lock — and only then calls `claimToken`. Two concurrent redemptions of *different* keys can lose a `used: true` in the full-object write. A lost flag plus a claim older than `CLAIM_ORPHAN_MS` means `claimToken` reclaims and the same token redeems a second time. The claim file alone is single-winner; making it the sole authority (keep `used` for audit only) closes it.

**11. The fifth vacuous test: `test('the credential grep actually discriminates')`.**
It pins the instrument's *discrimination* (some paid, not all) and nothing pins its *completeness*. Delete `OPENAI_API_KEY` from `CREDENTIAL_MARKERS` — plausibly, to silence the next new guard file that trips the grep — and all eight tests stay green while every OpenAI-only seat exits the contract. Combined with finding 7's idiom escape, the test passes under both rot modes of the thing it validates. The freeze discipline applied to `KNOWN_UNGATED`'s key set is never applied to `CREDENTIAL_MARKERS`' contents.

## MISSED

- Writer-side topic parity: nothing shown proves each shim derives its topic with `topicFromPath` over the *same* flag spelling (`--document=x` included) the gate reads. A mismatch orphans releases (feeds finding 4) and splits the per-topic cap.
- Compound lines with two different `--document` values: the gate reserves both calls' holds under the *first* topic; the second topic's in-flight spend is invisible to `spentOnTopic`.
- Whether the consult shims record at all post-call — the entire settle path (and finding 4's fix) depends on it.
- `tokens.json` is also unbounded and unpinned by any test.
- The claim in the round-3 table that F1 is "FIXED" versus the test suite's own 12/20 — nobody reconciled those two statements, and they contradict.

## ONE THING

Stop deciding from lossy transforms: test `PAID_INVOCATION` against **both** the raw and the masked command and treat a hit in either as an invocation, and scope `NON_EXECUTING` to flags sitting between the runner and the script name *within a single invocation match*. That single restructuring closes both blockers, keeps the mask doing what it is good at (flag reading, `--dry-run` scanning), and makes the quoted-span alternation in `PAID_INVOCATION` live code again instead of dead weight.
