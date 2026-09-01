# Hostile review — round 7: the sweep is a test now. What is left? — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND7-PACKET-2026-08-27.md
**Tokens:** 69806 in / 39678 out (reasoning: 36994) | total 109484
**Wall:** 1341.0s

---

VERDICT: REVISE

Both blockers are compositions of shapes your own corpus already contains as separate rows. I traced each through `parseCommands`/`invokedScripts` twice by hand; reproduce before fixing, per your rule. Line numbers omitted — the appendix is unnumbered; cited by symbol.

```
VERDICT:   REVISE
BLOCKERS:  2
FINDINGS:  6
MISSED:    4 below
ONE THING: cross the corpus with itself — see end
```

---

## BLOCKERS

### B1. `if` / `while` / `until` / `elif` conditions execute, and the parser discards them
`shell-parse.mjs`, `invokedScripts`, the `KEYWORD_HEADERS` skip: `if (KEYWORD_HEADERS.has(head) || KEYWORD_ENDS.has(head)) continue;`

The comment above it — *"A loop or conditional HEADER runs nothing"* — is a false claim about the world, and it is load-bearing. `for f in a.mjs b.mjs` names files; `if <cmd>`, `while <cmd>`, `until <cmd>`, `elif <cmd>` **run `<cmd>`**. These four are conditions, not headers.

Trace `while node scripts/consult-fable.mjs --document plan.md; do sleep 60; done`:
- Segment 1: `[while, node, scripts/consult-fable.mjs, --document, plan.md]`. `stripPrefixes` doesn't touch it (`while` is not in `KEYWORD_PREFIXES`, not an assignment, not `TRANSPARENT`). `head = 'while'` → `KEYWORD_HEADERS.has('while')` → **`continue`**. Nothing recorded.
- Segment 2: `[do, sleep, 60]` → inert. Segment 3: `done` → skipped.
- `invokesPaidSeat` → false → **exit 0**, while bash runs the seat as the loop condition — repeatedly.

Same at exit 0, no adversarial spelling required:

```
if node scripts/consult-fable.mjs --document plan.md; then echo ok; fi
while node scripts/consult-fable.mjs --document plan.md; do sleep 60; done
if true; then :; elif node scripts/consult-fable.mjs --document x; then echo; fi
```

This is a patch contradicting the doctrine: `KEYWORD_HEADERS` was added to fix the `for`-loop cry-wolf, and it swallowed the one keyword family whose "header" **is** a command. It is also the honest shape — `if node seat; then …` is how an agent batches naturally. Fix direction: for `if`/`elif`/`while`/`until`, strip the keyword and treat the remainder as a command (recurse into the rest of the segment); leave `for`/`case`/`select`/`function` alone. Add corpus rows for all four. Your pinned INERT rows (`while read l; …`, `if [ -f x ]; …`) survive this fix — their conditions are genuinely inert.

### B2. The unknown-head evidence test cannot see a shell, a quoted command body, or an open hatch
`shell-parse.mjs`, the final branch: evidence is only a **standalone `RUNNERS` basename** or a token **ending** in `.mjs/.js/.cjs`. Three independent failures stack on this:

**(a) A `SHELLS` token in wrapper position is invisible** — the test checks `RUNNERS.has(...)`, and `sh`/`bash` are not in `RUNNERS`. Both of these are exit 0:

```
xargs sh -c 'node scripts/consult-fable.mjs --document plan.md'
sudo bash -c "node scripts/consult-fable.mjs --document plan.md"
```

The quoted body is one token ending in `plan.md` — not script-shaped; `sh`/`bash` are not `RUNNERS`; nothing qualifies; ALLOW. Note your own corpus has `xargs node <seat>` and `sudo node <seat>` as r5 BILLS rows — the composition of those two pinned shapes evades, and the corpus is a list of points, not the product.

**(b) An open exec hatch is not itself an execution.** `headIsInert` returning false only matters if some *other* token independently qualifies:

```
vim -c '!node scripts/consult-fable.mjs; true' -c qa f
```

`-c` is in vim's `execFlags`, so vim is correctly "not inert" — but the payload token ends in `true`, so the evidence test finds nothing. ALLOW, while vim shells out to node. The round-6 fix checked that hatches are *named*; it did not check what happens when the hatch payload isn't token-shaped.

**(c) `git: 'version control'` is a wrong INERT_HEADS entry** — `find` again, exactly the disease you refuted my direction argument over. `git -c core.editor='node scripts/consult-fable.mjs --document x' commit` and `git difftool --extcmd="node scripts/consult-fable.mjs" f` execute the seat; the row is a bare string, so `headIsInert` returns true and the branch is never entered. **And note: fixing (c) alone does not block the git repro** — the payload still isn't a qualifying token. The fix has to be (a)+(b): a visible `SHELLS` token in wrapper position, or an *open hatch on a listed head*, is itself an unattributable execution.

Cry-wolf constraints your fix must respect (all currently green, most pinned): `git grep "node scripts/consult-fable.mjs" docs`, `which node`, `echo node <seat>`, `git -c color.ui=always status`, `vim -c 'set nu' f`, and — not currently listed, add it inert — `man bash`. Narrow hatches exist: git's are `core.editor=`/`core.pager=`/`core.hooksPath=`, `--extcmd`, and the `filter-branch` filters; vim's exec form is a `!`-bearing `-c` payload.

---

## FINDINGS

1. **MEDIUM — corpus row is wrong about the world: `r5 unrecognised head + seat` (`node-foo`).** `node-foo` exists nowhere; bash prints "command not found" and bills nothing. The row is a *policy* block (correct, keep asserting exit 2), but BILLS is defined as "bash would run a paid seat," and by that definition — the one you just used to overturn the `nodejs` test — this row is false. When the shell-oracle harness you recorded as a gap gets built, this row will disagree with the oracle and someone will resolve it in the wrong direction. Third category (`POLICY`), or a row comment. Same one-word treatment for `start`/`cmd /c`/`.MJS` as host-scoped.

2. **MEDIUM — panel holds in a compound line carry the line's first topic, not the panel's.** `panelHolds()` uses the line-level `topic`; the round-6 F5 fix made non-panel seats use `topicOfSeat(n)` and left the panel one field over — the same half-fix class as flash's F2 inside the same function. `kimi --document a.md && panel --seats fable --document b.md --confirm-spend` → the `claude-fable-5` hold lands under topic `a`; the writer records under `b`; the release is discarded as an orphan; the fan-out sits as ghost spend for the full TTL. The R6 test passes because its fixture is a sole panel, where line topic == panel topic — the fixture again matches the safe case.

3. **LOW — a `--model` raise in a compound line reserves under the default key.** The compound `holdSpec` uses `SCRIPT_MODEL[n]`; the call actually runs the raised model, which the writer records. Orphan hold, ghost spend for TTL. The single-seat path already uses the raised `modelKey` — same asymmetry as finding 2, one branch over.

4. **LOW — tenth vacuous test: "a free-seat name in a redirect target cannot launder a paid call".** The fixture is `> out-consult-gemini.mjs.log` — the `.log` suffix means the token can never be script-shaped even if redirect handling were deleted entirely, so the laundering mechanism is unreachable through this fixture under any regression. The only failure it can still see is "FABLE stops blocking," which thirty rows already cover. Fixture that discriminates: `node > consult-gemini.mjs scripts/consult-fable.mjs` — under a redirect regression `>consult-gemini.mjs` is script-shaped, wins the positional slot, gemini allowlists the line; today the target is dropped and the seat blocks.

5. **LOW — `node --input-type=module scripts/consult-fable.mjs` blocks as `runner-eval` opaque instead of pricing as Fable.** `--input-type` is in `EVAL_FLAGS`, the body contains a `.mjs` path, so the eval branch fires before the positional scan. Legal form, wrong refusal reason — the accepted one-false-block cost, but it's an over-block of a documented node form.

6. **LOW — the non-first-topic refusal mints no token.** A topic-cap breach on the line's *first* topic goes through the two-ask protocol; the same breach on a second topic exits 2 with no token and no second ask. Either mint (the price is known) or the message should say the only approval path is splitting the line.

---

## MISSED

1. **You tested points, not the product.** Both blockers are crosses of existing corpus rows (`xargs` × `bash -c`, `sudo` × `bash -c`, `for`-fix × `if`). The corpus as built cannot find a composition, by construction.
2. **The `KEYWORD_HEADERS` comment is a false world-claim on the money path** — the `model: 'panel'` class, surviving because no test reads it. Your ledger says four false comments; this is a fifth candidate, and this one *licensed* the code beneath it.
3. **The corpus asserts exit codes only.** Several BILLS rows can silently flip from priced-block to opaque-block and stay green — you already know verdict-only assertions hide mechanism swaps (the nesting test), but the corpus doesn't carry reason assertions.
4. **Nothing re-attacked the hatch payloads after naming the hatches.** Round 6 verified hatches exist as flags; it never asked what the payload looks like *as a token*.

**Retractions: none.** Round-6 items I re-verified as claimed fixed: backticks including inside double quotes, `env -S` quoted body, both stdin spellings, equals-form loaders, panel per-seat holds (sole-panel path), `topicOfSeat` fallback removal, `sed e` / `find -exec` / `vim -c` / `start`. And B2(c) is my round-6 direction argument vindicated a second time: an inert row assumed true is a money bug wearing fail-closed clothes.

---

## ONE THING

**Cross the corpus with itself.** Add a generated test: `WRAPPERS × BODIES`, where `BODIES` is your 49 existing bill shapes and `WRAPPERS` is a list — `''`, `sudo `, `xargs `, `if `, `while `, `bash -c "…"` (quoted), `sh -c '…'` (quoted), `git -c core.editor=…`, `nohup `, `command `, `time ` — asserting block for the exec-capable wrappers and allow for the inert heads crossed with runner *mentions*. Every wrapper in that list is already a row or a named constant somewhere in the system; the generator is ~20 lines over the `gate()` harness you already have, batched it stays near your 3s budget. Both blockers above would have been rows the day the corpus shipped, the cry-wolf constraints get pinned for free, and the next round's bypass has to be a shape the product space doesn't cover — which is a much smaller space than the one I just took both blockers from.
