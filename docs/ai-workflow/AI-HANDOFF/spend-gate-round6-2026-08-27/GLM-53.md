# Hostile review — round 6: it fails closed now. Does that hold? — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND6-PACKET-2026-08-27.md
**Tokens:** 66146 in / 40175 out (reasoning: 37304) | total 106321
**Wall:** 708.0s

---

**VERDICT: REVISE**

Three live bypasses and one fix that did not land. All four traced through the appendix code, each with a repro line real bash executes. The architecture is right; the holes are concentrated in exactly the new code this round introduced — the INERT list, the eval/stdin handling, and one comment claiming a fix the ternary below it does not perform.

---

**BLOCKERS:**

1. **`find -exec` runs a paid seat at exit 0 — INERT_HEADS contains heads that *can* execute, and the inert branch suppresses the unknown-head check even when a runner and the seat are visible in argv.**
 `shell-parse.mjs`, `INERT_HEADS` (contains `find`, `sed`, `vim`/`nvim`, `start`) and the final branch `if (!INERT_HEADS.has(head) && argv.some(...))`.
 Repro: `find . -maxdepth 0 -exec node scripts/consult-fable.mjs --document plan.md \;` — trace: `\;` is consumed as an escaped token, argv = `[find, ., -maxdepth, 0, -exec, node, scripts/consult-fable.mjs, --document, plan.md, ;]`, head = `find` ∈ INERT_HEADS, so the unknown-head branch is skipped *even though `node` and the seat sit right there in argv*. Nothing recorded → `invokesPaidSeat` false → exit 0. Real bash executes node with the seat and bills $1.06. This is `xargs` from round 5 wearing a costume, and it fails *open*.
 The family, same root: GNU `sed 'e node scripts/consult-fable.mjs'` (the `e` command shells out; the token ends in `.mjs` but `sed` is inert → suppressed), `vim -c '!node scripts/consult-fable.mjs' -c qa f`, Windows `start node scripts/consult-fable.mjs`.
 **This is the attack on the direction claim you asked for, and it lands.** The argument — "a missing entry costs one false block" — is true only for *omissions*. It silently assumes every entry is *true*. A **wrong** entry fails in the money direction while wearing fail-closed clothes. `TRANSPARENT`'s disease was `cmd /c`; `INERT_HEADS`'s is `find -exec`, in the same round that documented the analogy. And note the fix cannot be "any visible runner blocks": the suite pins `which node`, `echo node scripts/consult-fable.mjs`, and `git grep "node scripts/consult-fable.mjs"` as ALLOW, correctly. The discriminating rule has to be per-head exec-capability (`-exec`/`-execdir`, `sed e`, editor `-c`, launcher heads) — which is an argument that this list needs the reason-per-entry discipline `FREE_ALLOWLIST` got in round 3, not just a row deletion.

2. **Backtick command substitution is fused into tokens and runs free — a regression against the regex this parser replaced.**
 `shell-parse.mjs`, `parseCommands`: the backtick is an ordinary character. `` echo `node scripts/consult-fable.mjs --document plan.md` `` tokenises as `[echo, \`node, scripts/consult-fable.mjs\`]` — the trailing backtick defeats the `\.(mjs|js|cjs)$` test, `\`node` defeats `RUNNERS`, and `echo` is inert, so the unknown-head branch is suppressed twice over. Exit 0. Real bash executes the substitution and bills.
 The round-3 sweep's 39 shapes included "command substitution"; the suite pins only the `$()` spelling, which works today by *accident of the paren split*. If the sweep's entry meant backticks, this is the `cmd /c` story repeated verbatim — a verified shape, living in prose, silently lost in a rewrite.

3. **A runner whose program arrives by stdin is invisible — the parser consumes the redirect target and throws the signal away, and the eval branch `continue`s past a positional seat.**
 Repro: `node --input-type=module < scripts/consult-fable.mjs --document plan.md` — the `<` handler eats `scripts/consult-fable.mjs` as a redirect target, argv = `[node, --input-type=module, --document, plan.md]`; `--input-type` ∈ EVAL_FLAGS, the body names no `.mjs`, so `continue`. Nothing recorded, exit 0. Node evaluates redirected/piped stdin as a program; with `--input-type=module` the ESM seat runs and bills. Same shape: `cat scripts/consult-fable.mjs | node --input-type=module --document plan.md`.
 This is the same tier as the round-5 `node -e "import('./…')"` blocker — no more exotic, and the doctrine in this packet claims totality ("Every 'I cannot model this line' path … now blocks"). The parser *has* the information (it just consumed the redirect target; it just split at the pipe) and discards it. A runner with no positional, no loader value, and no eval body naming a script is precisely "an execution shape the parser cannot attribute."

4. **Round-5 flash F3 is not fixed, and a comment in the gate asserts it is.**
 `spend-guard-gate.mjs`, `holdSpec`: the comment says "A panel reserves under the seat ids its fan-out will actually record, not the literal string `panel`" — and the very next line is `model: PANEL_SCRIPTS.has(n) ? 'panel' : (SCRIPT_MODEL[n] || n)`. The single-panel path is the same: `modelKey || 'panel'`. Every panel hold — both paths — is reserved under the literal string your own comment says nothing ever records. The writer's per-seat releases normalise to `claude-fable-5` etc., never match, are discarded as orphans, and the full fan-out sits as ghost spend for the 10-minute TTL — double-counting every confirmed panel run and refusing honest follow-on work on that topic. Your table row says FIXED; the code wins, per your own rule.
 This is the ninth instance, and it is the worst kind: not a fixture encoding an assumption, but a **comment asserting a control that is not there** — the exact thing you confessed twice this workstream, now on the money path, in the round after the confession. No test could catch it, because no test reads reservation rows for a panel line and the settle-parity PAIRS derive from `providers.mjs`, which cannot contain `panel`.

---

**FINDINGS:**

1. **HIGH — `env -S` with a quoted body** (`shell-parse.mjs`, `stripPrefixes`). `env -S "node scripts/consult-fable.mjs --document x"` — `-S` is skipped as env's flag, the quoted string becomes argv[0] (one token containing spaces), there are no k>0 tokens, so the unknown-head branch can't fire. GNU `env -S` splits that string and execs. The *unquoted* form was one of your reproduced round-5 blockers; the quoted costume defeats the fix.
2. **HIGH (verify before churning) — loader flags in equals form** (`shell-parse.mjs`, `isLoaderValue: LOADER_FLAGS.has(prev.value)`). `node --require=./prelude.js scripts/consult-fable.mjs --document x`: the equals-token ends in `.js`, isn't in LOADER_FLAGS (no `=` split), so it *takes the positional slot* and the real seat is skipped as an argument → exit 0. Exploitable iff the runner accepts the `=` spelling — node's option parser does for value-taking options; confirm on your target node, and note `-r=` into the bargain.
3. **MEDIUM — the eval branch swallows a positional seat** (`shell-parse.mjs`, the `evalIdx` `continue`). `node scripts/consult-fable.mjs --document x -e '1'` records nothing at all. Whether node prioritises the script or the eval is a runner question; your doctrine says a shape you can't attribute is opaque, and `node -e "1" seat.mjs` is nobody's ordinary work — the narrowing costs zero cry-wolf.
4. **MEDIUM — your 5.3 F10 question, answered: take the fix, it's one line.** Scenario: `claimToken`'s `wx` write succeeds, `markSpent`'s write fails (its `catch` is silent). Marker absent, claim ages past 60s, replay arrives: `!isSpent` passes, EEXIST path runs, `claimedTokenFor` → null, the aged claim is reclaimed → **allow**. The token is re-redeemable hourly for as long as the marker stays unwritable. The reclaim branch's own comment says "the caller only reaches here when tokens.json still says `used: false`" — but nothing checks `used`; `isSpent` is the only guard and it is exactly what failed. Fix: refuse the reclaim when `tokens[key]?.used` (the crashed-holder path always has `used:false`, since the flag is written *after* `markSpent` — no legitimate recovery is lost), and make `markSpent`'s catch loud.
5. **MEDIUM — `topicOfSeat`'s `|| docArg` fallback** (`spend-guard-gate.mjs`). A seat with no `--document` inherits the *line's first* topic; the writer records `untitled` (topicFromPath's default) for a doc-less call. Hold under `a`, release under `untitled`, orphan, TTL ghost — the same half-fix class as flash F2, one field over.
6. **LOW — `bash file.sh`, `sh < file`, `curl … | sh` yield nothing, no opaque.** Defensible under the declared charter (file contents are out of reach), but the header's fail-closed claim is stated as total. Either emit an opaque for a shell with no `-c` and no readable body, or add these to the charter's named gaps so the doctrine stops overclaiming — the same overclaim you walked back on O_EXCL.
7. **MEDIUM, platform-conditional — case sensitivity.** `SEAT_NAME`, the extension regexes, and the `-c` cluster regex `/^-[a-z]*c[a-z]*$/` are lowercase-only. On a case-insensitive filesystem (macOS, default NTFS), `node scripts/consult-fable.MJS` resolves to the real file, isn't script-shaped to the parser, isn't a seat to `SEAT_NAME`, and runs unpriced — the one-character evasion class of your `consult\-fable.mjs` fix, wearing caps. Cheap to close with an `i` flag on the matchers; worthless on ext4, so weigh your actual hosts.

---

**MISSED:**

- **The shape sweep is still prose.** Your packet's own words: `cmd /c` "regressed silently, because the sweep lived in prose rather than a test" — and the sweep is *still* prose. Backticks and `env -S`-quoted prove the class regressed again in the same round that documented the lesson.
- **The 39 regex-era shapes were never ported as a corpus.** A rewrite that can lose old coverage owes a proof of parser ≥ regex across the old corpus. Backticks show it is not.
- **INERT_HEADS shipped without the roster discipline.** No reason column, no freeze test, no per-entry justification — the exact controls FREE_ALLOWLIST got when hand-curated lists were the diagnosed disease in round 3. The new hand-curated list is unaudited by construction, and blocker 1 is what that costs.
- **Nothing reads reservation rows for a panel line**, and the settle-parity derivation structurally cannot cover `panel`. The F3 "fix" therefore had nothing that could fail — the ninth vacuity, wearing a comment instead of a fixture.
- On your two open rows: F13 (all-time, name-colliding topic cap) — agree it can stay recorded-not-written, with the caveat that the topic cap is your *primary* control and the collision half is the piece that erodes it; unbounded files — fine as its own slice, monotonic is the right call.

---

**ONE THING:**

**Turn the shape sweep into a test — one executable table of "real bash line → does it execute a seat," asserted end-to-end through the real gate, containing every shape any round has ever found.** All four blockers this round are lines that table would have held: `find -exec` and `env -S`-quoted (new shapes), backticks (a shape the old instrument caught and the rewrite dropped), stdin-eval (the eval-mode blocker's sibling). It is mechanical, it cannot rot into prose, every future fix adds a row instead of a paragraph, and it is the change your own packet says you already learned once — in the section explaining why `cmd /c` came back.

Nothing to retract from my side this round; the round-5 findings I checked all reproduced as you said, and the two concessions recorded (12/20, gateway executability) were correct to make.
