# Hostile review — round 5: the matcher is gone. What is left? — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND5-PACKET-2026-08-27.md
**Tokens:** 49389 in / 39932 out (reasoning: 36958) | total 89321
**Wall:** 698.2s

---

Concession first, so it isn't quietly dropped: you were right about the 12/20 read. That number was the barrier harness's detection rate against the *old* code and the file said so two lines down; our "residual live window" inference was wrong. B4 stood on its own and the reserve-then-check fix is correct. That is the only round-4 premise I retract.

**VERDICT: REVISE**

**BLOCKERS**

1. **The spent-marker is keyed to the breach, not the token — every later approval for the same model+topic+cost is born spent.** `spend-ledger.mjs` `checkSpend` redemption branch (~L470) + `usedMarkerPath`. Repro: redeem T1; re-run the same breaching call (fresh ask, no token) → mints T2 and overwrites `tokens[key]`; present T2 → `!isSpent(key)` fails on T1's marker → falls through to `replayedSpent` (`tokens[key].token === T2 && isSpent(key)` is TRUE for a token never spent) → "already spent" + mint T3, forever. The two-ask protocol works exactly once per key, then permanently bricks Sean's approvals; deleting the claim doesn't help, only deleting `used-<key>.json`, which nothing tells anyone — and which would also resurrect nothing since T1 is gone. No test ever redeems a second-cycle token. This is the concrete answer to your own attack #3.

2. **Backtick substitution and `$( )` inside double quotes are data to the parser, code to bash.** `shell-parse.mjs` `parseCommands` (~L60–95): backtick is an ordinary character; quoted spans are opaque; `$` stays live inside double quotes. Both exit 0, both spend: `echo "$(node scripts/consult-fable.mjs --document plan.md)"` and `` echo `node scripts/consult-fable.mjs --document plan.md` ``.

3. **Execution carriers whose argv[0] isn't a runner are invisible, and the wrapper list fails open.** `TRANSPARENT`/`stripPrefixes` (~L45, ~L100). Each of these ALLOWs while bash executes the consult: `nice node scripts/consult-fable.mjs --document plan.md`; `sudo -E node …`; `env -u X node …` (env's own flag breaks the strip loop); `echo scripts/consult-fable.mjs | xargs node --document plan.md`; `yarn node …`; `watch -n60 node …` (re-bills every minute). The 39-shape verification died with the regex and nothing replaced it.

4. **A runner flag VALUE ending in .mjs shadows the real script.** `invokedScripts` (~L165–180) takes the first `.mjs` token as the script and breaks. Repro: `node -r scripts/lib/paid-seats.mjs scripts/consult-fable.mjs --document plan.md` → parsed as an invocation of paid-seats.mjs (not a seat) → exit 0, while node requires the lib and runs the consult in full.

5. **Every seat flag is read from the FIRST invocation's argv.** Gate `flagValue`→`seatArgsFrom` (~L215; `raiseDelta` ~L410). Repro A: `node scripts/consult-kimi.mjs --document a && node scripts/consult-openrouter-panel.mjs --seats fable,sol --document b --confirm-spend` → kimi 0.32 + default-roster 0.46 (the panel's `--seats` is in the *second* invocation's argv, never read) = $0.78 < $1.00 → ALLOW; real exposure ≈ $1.98. Repro B: `--model claude-fable-5` or `--max-tokens 64000` on any non-first seat is dropped entirely; additionally `envMatch || flagValue` precedence lets a cheap `SWAN_SOL_MODEL=deepseek-v4-flash` mask an expensive `--model` raise on the same line.

6. **Quoted argv[0] direct execution is exempt.** The `!argv[0].quoted` guard (~L188): `"./scripts/consult-fable.mjs" --document plan.md` → ALLOW; bash executes it. One quote away from your own passing R4 test.

**FINDINGS**

1. **Med — empty/unparseable `--seats` prices a confirmed fan-out at $0.** Gate ~L315: `--seats ""` → `[''].filter(Boolean)` → `[]` → `panelUsd = 0` → `--confirm-spend` ALLOW. If the panel falls back to its default roster on empty (one probe to confirm), this is a free fan-out; either way empty ≠ none, and `DEFAULT_SEATS` is another unpinned mirror of the panel's internals.
2. **Med — `readsCredential` still misses honest idioms** (`paid-seats.mjs` ~L100–125): `process?.env?.OPENROUTER_API_KEY` and `const { env } = process; env.MARKER` both read false. A new seat in that style passes the coverage contract green — the exact quiet drift the widening existed to catch.
3. **Med — `SEAT_WORST_USD` is a third price table, already drifting low** (gate ~L300): grok 0.11 vs 0.148 derived from PRICES [2,6] @26k/16k; fable 1.05 vs your own canonical 1.06. The sol defect at small scale, in a table whose comment claims a pin that (per the appendix) covers sol only.
4. **Med (cry-wolf, both directions) — per-seat carve-outs and `--seats` are keyed to `scriptName`/first invocation, unreachable in compounds** (gate ~L225–240): `panel --dry-run --seats fable,sol && kimi` → 1.66+0.32 = $1.98 → BLOCK with a token demanded for a line whose real cost is $0.32; and `kimi && kimi && kimi && panel` (no `--confirm-spend`, so the panel refuses itself) → 0.95+0.46 = $1.41 → BLOCK on phantom spend. Same "special case unreachable from the branch that needs it" shape as the round-4 panel bug, refusal direction.
5. **Med — non-first seats' topic caps are never consulted.** Gate ~L440–490: `--document` comes from the first invocation; the whole summed worst case is charged to topic A and holds placed under it. Repro: seed topic `plan` to $2.90; `node scripts/consult-kimi.mjs --document fresh.md && node scripts/consult-sol.mjs --document plan.md` → 0.93 < $1.00, topic `fresh` clean → ALLOW; sol's real $0.61 lands on `plan` → $3.51 > $3.00 cap. Bounded by the per-call sum (<$1.00/line) and the day cap, and the ledger rows self-heal future single calls — but the per-topic cap, your primary control, is voidable for any seat that isn't first. Siblings' later `recordSpend` releases arrive as orphans and are discarded; holds linger to TTL under the wrong topic.
6. **Med-Low — the parser's give-up paths fail open** (`shell-parse.mjs`): depth > 4 → `[]` (~L139), so five nested `sh -c` is ALLOW; `bash --posix -c '…'` (~L149) — `/^-[a-z]*c[a-z]*$/` doesn't match `--posix`, the payload is never recursed into, ALLOW.
7. **Low — override key match is substring-first-hit** (gate ~L250): `Object.keys(PRICES).find(k => v.includes(k))` — declaration order decides between `gpt-5.6-sol-pro` and `gpt-5.6-sol` (benign today only because the rows now agree); any future key that is a substring of another mis-prices silently.
8. **Low — position-blind regexes survive in the gate** (~L245, ~L370, ~L455): `SWAN_*MODEL`, `SWAN_*MAX_TOKENS`, `SWAN_SPEND_APPROVE` still scan raw command text, so `--document "SWAN_SOL_MODEL=claude-fable-5"` re-prices from DATA. Raise-only today — but it's the exact class the parser was written to end, left running on three lines.
9. **Low — ghost row cemented** (gate ~L110): `SCRIPT_MODEL['consult-grok.mjs']` — your own history says the file doesn't exist on main. The ghosts were purged from the matcher, not the tables, and the R4 tests now use the ghost as a fixture.
10. **Low — `markSpent` swallows its own failure** (ledger ~L390): claim won + marker write throws (caught, silent) + 60s → orphan reclaim redeems the same approval again. Narrow, but it is the one path where "spent" isn't durable, and the catch makes it invisible.
11. **Low — ghost test matches basenames** (`spend-coverage.test.mjs` ~L250): a path-keyed entry whose file was deleted passes if any same-basename file exists anywhere in the walk.
12. **Low — the parity table is 3 rows wearing "every gated seat"** (`spend-settle.test.mjs`, PAIRS): fable/sol/kimi of ~17 SCRIPT_MODEL keys, nothing pins PAIRS ⊇ SCRIPT_MODEL, so the next seat reintroduces the never-settling hold silently. Your own fix's blind spot, one file over.
13. **Info — the topic cap is all-time and name-colliding**: `plan.md` → `plan` pools every unrelated workstream that reuses the name. Possibly intended ("the whole thing"); it is unwritten, and it will cry wolf someday.
14. **The eighth vacuous test, named as asked:** `'SWA-218: command substitution is gated'` (`spend-guard-gate.test.mjs` ~L90). It asserts the one of bash's three substitution spellings the parser happens to handle; backticks and double-quoted `$()` sail through while it stays green. Signature intact: the fixture encodes the assumption (substitution has one syntax) the bug violates. Runner-up, same signature: `'R4: direct shebang execution is gated'` covers only the unquoted argv[0] that blocker 6 turns into a bypass.

**MISSED**

- **Ground truth.** Nothing checks the parser against bash itself. `bash -n` (or execution in a sandbox) adjudicates any candidate line for free; the 39-shape list was deleted with the regex, not replaced. Five of six blockers are one-line bash probes.
- **Quote semantics.** The AST records `quoted` but not *which* quote — double and single are conflated, so `$`/backtick liveness inside double quotes is unrepresentable and therefore untestable. Blocker 2 could not be caught by any test written against this model.
- **A fail-open inventory.** Every "cannot model this" path (depth cap, unknown head, backticks, flag-value ending in .mjs) maps to ALLOW. Nobody listed them; a parser whose ignorance spends money needed that list on day one.
- **A second approval cycle.** 113+ tests prove single-use exactly once and never re-approve the same breach — which is why blocker 1 is invisible to the entire suite. Any permanent state (markers, claims) needs a re-issue test.
- **Flags on the second invocation.** Every compound fixture puts flags on the first or the same seat; blocker 5's shape appears nowhere in the suite.
- **The parser's own lists.** RUNNERS/TRANSPARENT/SHELLS/NON_EXECUTING/DEFAULT_SEATS/SEAT_WORST_USD/PAIRS are seven hand-curated tables with zero pins between them. The roster lesson stopped at seat names.
- **Your own corpus.** The hook logs and transcripts contain every real command shape this system has ever judged. Mining them beats inventing shapes; none of my blockers would survive a week of that corpus run through the gate.

**ONE THING**

**Invert the parser's default: stop enumerating what executes; enumerate what is proven inert.** Have `invokedScripts` return an `unproven` bit for anything it cannot fully model — a backtick anywhere, `$(` inside a double-quoted token, an argv[0] that is a known execution carrier (nice/sudo/env-with-flags/xargs/yarn/watch/ssh) with a runner or seat-shaped token later in argv, depth overflow, a runner whose pre-script argv contains another `.mjs` — and make the gate hold (or price at worst case) when it is set. Mentions stay green through a short known-inert head list (echo, cat, grep, git, ls); that list can only ever cost a retry, while today's known-*dangerous* list (TRANSPARENT) is the one that keeps costing money. Blockers 2 through 6 all die the day "I don't understand this line" stops meaning "spend freely" — and blocker 1 dies with a marker keyed to the token rather than the breach, which is a two-line change you have already written the test for and never run.
