# Hostile review — round 7: the sweep is a test now. What is left? — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND7-PACKET-2026-08-27.md
**Tokens:** 69806 in / 35662 out (reasoning: 33548) | total 105468
**Wall:** 839.1s

---

# Hostile review — round 7

```
VERDICT:   REVISE
BLOCKERS:  3
FINDINGS:  5
MISSED:    ...
ONE THING: ...
```

The corpus idea was right and the round-6 ledger is honest. But three free-money paths survive, and they share one root — which is good news, because one fix and three rows close them. Traces below are from the appendix code, per your rule.

## BLOCKERS

**B1 · `awk` is a wrong entry, not a missing one — the hatch you wrote doesn't fire.**
`scripts/lib/shell-parse.mjs`, `INERT_HEADS.awk` + the unknown-head branch in `invokedScripts`.

```
awk '{system("node scripts/consult-fable.mjs")}' file.txt
```

bash bills: awk's `system()` runs it under `sh -c`. The gate allows. Trace: `execPattern` matches `system`, so `headIsInert` returns false — but the block condition still requires an argv token that **ends in `.mjs`** or **is exactly a runner basename**. The awk program is one fused token `{system("node scripts/consult-fable.mjs")}`; it ends in `)}`, and its basename (after the last `/`) is `consult-fable.mjs")}`. Both tests fail. No opaque, nothing recorded, exit 0.

This is your own round-6 lesson applied to your own fix: the row claims to model the hatch, and behavior is **identical to having no row at all** — which is the proof it is decorative. `sed`'s `e` works only because the fused token happens to end at `.mjs`; awk's wraps it in `("...")`. The corpus has no awk row either direction, so nothing could notice.

**B2 · `git` is a bare-string inert entry with no hatch, and git shells out from the command line.**
`INERT_HEADS`: `git: 'version control'`.

```
git -c alias.x='!node scripts/consult-fable.mjs --document plan.md' x
```

bash bills: `!`-prefixed aliases run under `sh -c`, repo or not, self-contained on one line. The gate allows: `headIsInert('git')` → string row → true → the unknown-head check is skipped entirely. No token anywhere ends in `.mjs` in a position the check reads anyway. Same class as `find -exec` — a dangerous list written on the safe side, in the round after you wrote down why that's the worst kind. (Unverified same-class candidate, one line: GNU `sort --compress-program='node …'` — sort is also bare-inert. Check it when you do the fix.)

**B3 · `>(` is the `<` patch's mirror, and the mirror is transparent.**
`parseCommands`, the redirect branch: `if (ch === '>' || ch === '<')` sets `stdinFed` only for `<`.

```
node >(echo "import(process.cwd() + '/scripts/consult-fable.mjs')")
```

bash bills: node receives `/dev/fd/N` as its script argument and evaluates the fd's content. The gate allows, and this is the composition you asked me to find: `>` takes the redirect branch, the target-consumer hits `(` and breaks having consumed nothing, then `(` fires `endCommand` — so the runner is pushed as `[node]` alone: no positional, `stdinFed` false, no `runner-stdin`. The inner `echo "…"` is inert. `invokedScripts` returns `[]`. `node <(…)` blocks (fail-closed, correct); `>(…)` is the money direction and it's the one nobody types accidentally — which is exactly the asymmetry's tell.

## FINDINGS

**F1 · (medium) The env -S fix swallows the rest of the line.** `stripPrefixes`, the `env` branch: on `-S` it returns `{splitString}` immediately; nothing after the `-S` value is ever parsed. But `env -S` words are **prepended**, and remaining operands still execute: `env -S "" node scripts/consult-fable.mjs --document x` (and `env -S node scripts/consult-fable.mjs`) bill at exit 0. The fix assumed the shebang idiom's quoted form is the only form. Fix: recurse on the body *and* keep parsing the remaining argv, or opaque if any remain.

**F2 · (medium) The fused-string class is bigger than awk — and it's where your hatches go to die.** `emacs --eval '(shell-command "node scripts/consult-fable.mjs")'` flips non-inert via `execFlags`, then fails the same `)`-suffixed token test → allow. `perl -e 'system("node …")'` isn't listed at all and sees no runner token → allow. The round-6 fix audited `find`/`sed`/`vim`/`start` and stopped; every interpreter head inherits the gap, because the block condition reads token **boundaries** and these payloads live in token **interiors**.

**F3 · (medium) The settle-parity instrument was never pointed at `PANEL_SEAT_MODEL` — three of six priced panel keys exist in no table any test reads.** `spend-guard-gate.mjs` `PANEL_SEAT_MODEL` / `spend-settle.test.mjs` PARITY test. The parity derives gate keys from `SCRIPT_MODEL` only. `grok-4.6`, `deepseek-v4-pro`, `deepseek-v4-flash` appear in `PRICES` and in panel holds, but in **no `SCRIPT_MODEL` value** — and since the parity test is green, `providers.mjs` can't contain them either (it would fail the parity assertion if it did, normalizing to a key `SCRIPT_MODEL` lacks). So every default `panel --confirm-spend` run holds ~$0.35 under three keys nothing proves the writer emits — round-6 B4's "hold that cannot settle," one layer down, reachable only by the instrument you built to catch exactly this and then didn't run on this table.

**F4 · (low) Two BILLS rows are host-conditional, which the corpus cannot self-certify.** `spend-shapes.test.mjs`: `./${SEAT}` (row r4 shebang) needs the exec bit to be a true bill; `sed 'e …' file.txt` needs `file.txt` with input lines for `e` to fire. The gate over-blocks both regardless, so no money consequence — but you asked "is a row wrong," and the honest answer is: none wrong in the money direction, these two are wrong-in-fact on some hosts, and the recorded no-oracle gap is why the suite can't tell you so itself.

**F5 · (low) Tenth vacuous test: could not confirm one, and I tried.** Nearest misses, for the record: the single-use replay test in A8 asserts only the exit code, not the `/already spent/` reason (A7 pins the reason, so it's layering, not vacancy); the `--seats ","` mutation gap is covered; the corpus controls make a block-everything brick red via INERT. The signature may have finally stopped reproducing.

## MISSED

- The round-6 fix verified each hatch entry's hatch **exists**; it never verified the hatch **fires** — `headIsInert` returning false is only half a circuit, and the other half is the token-boundary test B1 defeats. "Per-head exec hatch, named" needs a row proving the named hatch blocks.
- Process substitution's output direction. `<` got a threat model; `>` got none, though node treats both fd spellings as script sources.
- `PANEL_SEAT_MODEL` as a third model-key table. You proved gate↔writer parity and then added a table outside the proof.

## What held, so you can stop churning it

I traced all 73 corpus rows (none wrong in the money direction — see F4), the reservation fold (append-order, orphan discard, nonce settle, per-token claims, generation reclaim, cycle-2 overwrite of the marker: all correct under inspection, and the `sort`-of edge I chased in `readReservations` misattributes *which* hold settles but always drains), the token key binding across concurrent mints (refusal direction only), the `&&`/pipe/redirect/backtick interactions in `parseCommands` for contradictions (the only one is B3's `>`/`<` asymmetry), and the loader-equals fix (holds). No retraction of my own prior findings this round; the INERT_HEADS direction refutation still stands and B1/B2 are it, twice more.

## ONE THING

**Make the unknown-head block read token interiors: for any non-runner head, if a token's *value* contains a runner name followed by a `.mjs`/`.js`/`.cjs` path anywhere inside it, emit `opaque`.** One rule closes B1, B2, and the F2 class (awk, git alias, emacs, perl) in the same motion; add `>(`-after-a-runner to the `stdinFed` rule as its companion half-turn. Then add four corpus rows — awk/system, git alias, `>(`, `env -S ""` — so the next rewrite has to beat the table, not the prose. The cry-wolf cost is awk one-liners and `git -c` lines that block once and get pinned; that is the side of the ledger you already decided you can afford.
