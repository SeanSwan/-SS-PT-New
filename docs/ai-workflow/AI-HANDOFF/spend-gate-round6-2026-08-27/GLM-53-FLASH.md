# Hostile review — round 6: it fails closed now. Does that hold? — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND6-PACKET-2026-08-27.md
**Tokens:** 66146 in / 34317 out (reasoning: 31238) | total 100463
**Wall:** 698.5s

---

VERDICT: **REVISE**

Nothing to retract from round 5 — every thread I fired then held, and the convergence record is honest. But this round's headline claim ("every cannot-model path now maps to BLOCK", "every blocker FIXED") is falsified by the appendix four times, twice in the money-out direction. All four repros are one-liners; all four cite your own code against your own claims. The churn concern is heard — none of the fixes below touch a working guard's decision logic; three are additive.

---

## BLOCKERS

**B1 · `--flag=./file.mjs` in equals form swallows the seat — free live paid call.**
`shell-parse.mjs`, runner loop, the `isLoaderValue` check (`const isLoaderValue = Boolean(prev && LOADER_FLAGS.has(prev.value))`, ≈L300).

```
node --import=./scripts/lib/spend-ledger.mjs scripts/consult-fable.mjs --document plan.md   -> exit 0, bash bills Fable
```

Trace: the token `--import=./scripts/lib/spend-ledger.mjs` ends in `.mjs`, so it is script-shaped. `prev` is `node`, so `isLoaderValue` is false → it wins the positional slot and is recorded as THE script. The real seat on the next index hits `if (!isLoaderValue && positionalFound) continue` and is never recorded. Nothing paid, nothing `unknown` → `invokesPaidSeat` returns false → the gate ALLOWs at the first guard, before any cap logic. Node executes both files. This is flash's round-5 B2 (`node --require ./prelude.js <seat>`) surviving its own fix through one spelling: the fix answered the loader question for *space-separated* values only; `LOADER_FLAGS.has(prev.value)` compares the WHOLE glued token, and the glued token is itself script-shaped, so it poisons the positional rule in the same motion. Fix, additive: when a token matches `^(--require|-r|--import|--loader|--experimental-loader)=`, record the value part as a loader-executed file and let it compete for neither the positional slot nor the seat slot; and use `prev.value.split('=')[0]` in the `isLoaderValue` check.

**B2 · flash F3 is not fixed — the panel hold is still keyed `'panel'`, and the comment at the fix site claims the opposite.**
`spend-guard-gate.mjs`, `holdSpec`, the compound ternary (≈L575): `model: PANEL_SCRIPTS.has(n) ? 'panel' : (SCRIPT_MODEL[n] || n)` — and the single-seat branch `model: modelKey || 'panel'` (modelKey is `''` for a panel: `SCRIPT_MODEL` has no panel entry, and a standalone panel line carries no override).

The comment directly above that ternary says: *"A panel reserves under the seat ids its fan-out will actually record, not the literal string 'panel' — nothing ever writes that."* The code writes the literal string `'panel'` in **both** branches. The fan-out records per-seat provider ids (your own settle-parity work documents this), so `readReservations` never matches a release to a `'panel'` hold. Every confirmed panel run holds its whole `panelUsd` — up to ~$1.68 — against its topic for the full 10-minute TTL, stacking across runs until honest panel work is refused on ghost spend. This is the exact reserve-string/record-string defect you proved for Fable, re-inked for the panel, and the table says FIXED. Worse in kind: it is the "comment asserting a control that is not there" class you yourself flagged as worse than none — at the very lines of the claimed fix. The derived parity test is structurally blind to it: `PROVIDERS` has no `'panel'` row, so "every provider record normalises to a gate key" is true while the panel hold matches nothing. Fix, matching the comment's own claim: expand a panel's hold into per-seat rows — `namedSeats.map(s => FREE_PANEL_SEATS.has(s) ? skip : {model: PANEL_SEAT_MODEL[s], usd: seatWorstUsd(s), topic})` — and write the settle test the fix implies (hold a panel, run per-seat `recordSpend` rows, assert the hold drains).

**B3 · Backtick substitution under an inert head — the cannot-model path that still maps to ALLOW.**
`shell-parse.mjs`, INERT-head skip (≈L180) composing with the unknown-head check (≈L345).

```
echo `node scripts/consult-fable.mjs --document plan.md`   -> exit 0, bash runs node inside the substitution
```

Two failures compose. First, backticks are ordinary characters: tokens fuse, and the trailing backtick even defeats the script-shaped regex (`…fable.mjs\`` fails `/\.(mjs|js|cjs)$/`). Second — the load-bearing half — the line's head is `echo`, INERT, so the command is skipped *before* the unknown-head opaque check can fire. The inert shortcut assumes "inert head ⇒ nothing on this line executes"; substitution breaks exactly that assumption, and backticks substitute inside double quotes too, which the parser reads as literal. Meanwhile your own suite pins `echo $(node …)` as BLOCK — so the substitution contract exists, and it currently holds only by accident of `(` splitting commands, not by parsing. That is the attributable-but-wrong shape surface 1 asks for: attributed to `echo`, executes anyway. Fix, one line, fail-closed direction: if any argv token contains a backtick and any token is runner- or script-shaped, emit `opaque('command-substitution')`; refine if ordinary lines cry wolf. And put a comment on the `$(...)` test saying it blocks via command-splitting, because it reads as modelling and isn't.

**B4 · `INERT_HEADS` contains executors: `find -exec`, Windows `start` — the dangerous list, written as the safe list.**
`shell-parse.mjs`, `INERT_HEADS` (≈L70).

```
find scripts -name 'consult-fable.mjs' -exec node {} \;   -> exit 0, bash executes node on the seat
start node scripts/consult-fable.mjs --document x         -> exit 0 (cmd.exe launches node in a new window)
```

`find` is not inert — `-exec`/`-execdir` are arbitrary executors in ordinary vocabulary. `start` is `cmd /c`'s job done by another name, and your suite already models `cmd /c` as opaque on this same platform question. Tertiary members of the same class: `awk 'BEGIN{system("…")}'`, GNU `sed`'s `e` flag. This one attacks the headline claim at its root: "a missing entry here costs one false block; a missing entry in a known-dangerous list costs money and nobody finds out." The direction is sound **only if every present entry is genuinely inert** — `find` and `start` are the dangerous list, written on the wrong side, and they cost money silently. The INERT list is also now the only curated list in this workstream with no per-entry reason and no coverage test — which is the exact shape that has rotted twice before (`cmd /c` after round 4, `consult-grok.mjs` in SCRIPT_MODEL after its own purge). Audit the four executor-capable entries and give the list FREE_ALLOWLIST-style justifications plus a test, or the round-4 lesson has recurred verbatim.

---

## FINDINGS

1. **MED · `markSpent` swallow + orphan reclaim = an endlessly re-redeemable token.** `spend-ledger.mjs`, `markSpent`/`claimToken`. You asked for my read on 5.3 F10. It is not as narrow as "narrow". Realistic trigger: an earlier cycle leaves `used-<key>.json` read-only or root-owned; every later `writeFileSync` to it fails EACCES forever while every other write works. Then for each future token on that key: redemption returns allow=true with **no marker**; re-presenting the same token ≥60s later reads as "aged claim, no marker → crashed holder" → generational reclaim → allow again. One Sean approval, redeemable indefinitely, one free call per 60 seconds, and each cycle writes a fresh `genN` so it never exhausts. The swallow converts a write failure into a coupon because the reclaim interprets "marker missing" as "crash". The fix that preserves the design is three lines: after `markSpent`, read the marker back and **refuse the redemption** if it did not land — a refused call with a live claim is precisely the recoverable state your refusal text already documents. So: yes, now it is worth the complexity — the interaction with the reclaim is what changed the calculus.

2. **MED · Ninth vacuous test, by your own signature: `R5: cycle 1 token is still dead after cycle 2 exists`.** `spend-settle.test.mjs`. The fixture never exercises the spent-mechanism it names. Cycle 2's mint *overwrites* `tokens[key]`, so the replay of `c1.token` fails because the store no longer contains it — forgetfulness, not spentness. Disable the spent-tracking entirely (`isSpent` → `return false`, marker writes no-op'd) and this test stays green: the assertion is satisfied by token-store replacement alone. Signature unchanged from your eight: the fixture encodes the assumption (a key-per-token store) that makes it pass for the wrong reason. Fix: re-present `c1.token` **without** an intervening mint (impossible via the public API today — which is itself the finding: the store API cannot express "is this specific token spent"), or assert on the marker file directly.

3. **LOW · Re-mint overwrites the store entry of a spent token, so the "already spent" reason is unreachable for superseded tokens.** `checkSpend` first-ask branch. Behaviour is correct (refused, new token correct), but every superseded token now gets the generic "first ask refused", and the audit record of what was issued and spent lives only in PENDING notes, claims and markers. The A6 test name ("must stay spent") asserts a mechanism the code no longer implements — see finding 2. Cheap fix: key the store per token, like the claims already are.

4. **LOW · The per-call breach text mislabels a summed line as a "single call".** `checkSpend`. Four batched sol calls: worst case $1.24 → breach text "single call $1.24 > cap $1.00". There is no single call over the cap — the block is the intended N-calls-are-not-one rule (your B4 test) wearing the wrong label, and Sean is being asked to approve a proposition that is false. Key the wording on how many chargeable invocations produced the number.

5. **LOW · `parseCommands` strips backslashes inside double quotes more aggressively than bash.** POSIX keeps `\` inside `"…"` before anything not in ``$ ` " \`` newline; the parser strips unconditionally. Divergences currently point only in the cry-wolf direction (parser sees a *more* script-shaped token than bash executes), so no repro blocks the verdict — but the comment two lines above claims POSIX quoting semantics. Cover it with a shell-oracle test rather than another case-by-case patch; see MISSED 4.

---

## MISSED

1. **A settle test for the panel hold.** Would have caught B2. The parity test derives from `PROVIDERS`, which cannot contain the fan-out's aggregate key — the derived test inherited the blind spot of the thing it polices, the same way the round-4 settle test inherited the shared-constant assumption.
2. **Topic parity on the writer side.** Model strings got a derived parity test; topics did not. `topicOfSeat` guesses `--document`/`--out` off argv; nothing verifies the shims' `recordSpend` topics normalise to the same slug. A mismatch ghosts holds exactly like the model mismatch did — the defect class is keyed on *both* strings.
3. **INERT_HEADS shipped with no reasons and no coverage test** — B4 is the round-4 lesson ("the sweep lived in prose") recurring for the new list, the same session that lesson was being cited as learned.
4. **No differential test against bash itself.** Every parse expectation is hand-written. The round-6 nesting lesson — "walk it, don't guess" — generalises: run the parser's accepted/refused shape list against real bash in CI and diff. B1 and B3 are both shapes a shell-oracle run would have flagged, and neither is exotic.
5. **Equals-form coverage asymmetry.** `--flag=value` is tested thoroughly for the gate's *readers* (max-tokens, document, model) and never for the parser's *loader* flags. One spelling gap; one blocker.

On the two NOT-FIXED rows where you asked: **5.3 F10** — see finding 1; the reclaim interaction means yes, fix it now, three lines. **5.3 F13** — deferring is right (all-time, name-colliding topic keys err cry-wolf, which is the direction you're allowed to be wrong in), but "intended-but-unwritten" is the genre you yourself called worse than none; give it a one-line KNOWN-GAP comment like the delegation gap so the next reader doesn't re-derive it as a bug.

---

## ONE THING

**Fix B1: treat a `LOADER_FLAG` in equals form as a loader.** Split `^(--require|-r|--import|--loader|--experimental-loader)=` on the `=` before both the `isLoaderValue` check and the script-shaped positional rule. It is the only live free-money path this round, the fix is purely additive to the attempt-three logic, and it does not churn the boolean-flag guard that finally works — the positional rule and the loader rule stay exactly as they are; the equals spelling just stops being invisible to both.
