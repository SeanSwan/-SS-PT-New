# Hostile review — round 5: the matcher is gone. What is left? — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND5-PACKET-2026-08-27.md
**Tokens:** 49360 in / 32000 out (reasoning: 30667) | total 81360
**Wall:** 613.4s

---

```
VERDICT:   REVISE
BLOCKERS:  4 (numbered below)
FINDINGS:  7, including the eighth vacuous test you asked for — it is in your
           round-5 code, not a leftover
MISSED:    3 items
ONE THING: per-invocation pricing — finish the parser migration inside the gate
```

Concession first, since you asked for it: **I was wrong about "12/20 under a barrier."** The file says two lines below the number that it was measured against the old read-modify-write code, and that the current code is 20/20 green. I read the measurement and not its caption. B4 was independently real and the reserve-then-check fix is sound as far as it goes. I also accept the gateway correction — I confirmed the regex didn't match and never checked whether the file was executable. Matching is not exploitable; you ran the check I should have.

The parser was the right call and the settle-parity discovery was real work. What follows is nonetheless a REVISE, because three of your five surfaces have live defects, and one of them — the worst — was created by the round-4 fix for flash-10.

## BLOCKERS

**B1 — `shell-parse.mjs`, `invokedScripts`, the script-scan loop: a redirect token before the script hijacks the script slot.**
`>` and `<` are ordinary characters to `parseCommands`, so `node >out.mjs scripts/consult-fable.mjs --document plan.md` tokenizes as `[node, >out.mjs, scripts/consult-fable.mjs, …]`. The runner branch takes the **first** token ending in `.mjs` as the script — that is `>out.mjs` — and breaks. `isSeatPath('>out.mjs')` is false, `invokesPaidSeat` returns false, **exit 0**, and bash runs Fable with stdout captured to `out.mjs`. `2>err.mjs` in prefix position works too (`2>err.mjs node …` lands in the direct-exec branch, same miss). The comment defends extension-matching as "intrinsic" — it is intrinsic to *scripts*, not to *tokens that merely end in the extension*, and a redirect target is shell structure the parser's own charter (quoting, splitting, argument order) claims to cover. This is also a regression: the old negated-boundary regex matched this line. Redirection is not expansion; either treat `>`, `>>`, `<`, `2>` as non-token separators or strip them in `stripPrefixes`.

**B2 — `paid-seats.mjs`, `seatArgsFrom` + every gate consumer: only the FIRST seat's argv is ever read.**
`seatArgsFrom` returns the first seat invocation's args, and the gate reads `--model`, `--seats`, `--confirm-spend`, `--dry-run`, and `--document` (topic) from it alone. Any flag on a non-first invocation is invisible:
- `node scripts/consult-gemini.mjs --document p && node scripts/consult-openrouter-panel.mjs --seats fable --document x --confirm-spend` → `scriptName` is the panel, the confirm-spend check reads *gemini's* argv, finds nothing, and the "no live call" short-circuit fires → **ALLOW on a live, confirmed Fable fan-out**.
- `node scripts/consult-grok.mjs --document b && node scripts/consult-kimi.mjs --document a --model claude-fable-5` → the raise is on the second seat, `flagValue` never sees it → estimate $0.42, real exposure ~$1.37, **ALLOW**. This is flash round-4 finding 6 surviving its own fix — the fix read the override from the first seat's argv, and your R4 test happens to place the raise first.
- Same root poisons `--seats` pricing (panel second → priced at DEFAULT_SEATS) and topic attribution (see F3).

The round-4 "one hold per invocation" fix moved *holds* per-invocation but left every *flag* line-global-first. Half a migration.

**B3 — `spend-ledger.mjs`, `usedMarkerPath`/`isSpent` + the redemption precondition: the spent-marker is per-KEY, so the second approval cycle for the same breach is bricked forever.**
Trace it: Fable on `plan.md` always breaches per-call, always mints under the same key `claude-fable-5|plan|1.06`. First cycle: token T1 minted, redeemed, `used-<key>.json` written — nothing ever deletes it. Second cycle, next day, clean caps: T2 is minted (`tokens[key] = {token: T2, used: false}`), Sean approves it, the agent presents it — and the redemption branch requires `!isSpent(key)`, which is false because the *key's* marker exists. It falls through to `replayedSpent`, which tells the operator "that approval token was already spent — this is a NEW ask, and it needs a new token" and mints T3. Which is also DOA. **Every subsequent approval for the same model+topic+cost loops forever** until someone hand-deletes a marker file the error message never mentions. Your own message text proves intent ("needs a new token") that the mechanism makes impossible. And note the shape: this brick was *created* by the flash-10 fix. The series "five of six bypasses were my own fixes" now has a sixth entry, one round later. Fix is small: store the spent **token** in the marker and compare it to the presented/current token, not bare existence.

**B4 — `shell-parse.mjs`, `stripPrefixes`: transparent wrappers' own flags end the strip and orphan the command.**
`stdbuf -oL node scripts/consult-fable.mjs --document plan.md` skips `stdbuf`, then breaks on `-oL` (not an assignment, not a wrapper, not `timeout`), leaving argv[0] = `-
