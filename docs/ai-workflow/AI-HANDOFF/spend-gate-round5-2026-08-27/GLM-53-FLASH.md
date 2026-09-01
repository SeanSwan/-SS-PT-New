# Hostile review — round 5: the matcher is gone. What is left? — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/SPEND-GATE-ROUND5-PACKET-2026-08-27.md
**Tokens:** 49360 in / 32000 out (reasoning: 30805) | total 81360
**Wall:** 637.1s

---

Before the verdict: you were right about the 12/20 and I was not. The file states two lines below the number that it is the harness's detection rate against the old code, and 20/20 against current. I read the figure past its own context and built a finding on it; B4 was independently real and the reserve-then-check fix is the right shape. The settle-key split and the Sol 2× are both finds I should have made — I had `SCRIPT_MODEL` and `recordSpend` in the same review packet across two rounds and never ran one against the other. Recorded because you asked.

I reproduced every claim below by token-tracing the parser, not by re-arguing round 4. What I checked and stood down, so you know the scrutiny was real: the append-before-read serialization is sound (two gates both allowing with combined exposure forces `append A < read A < append B < read B < append A`, a cycle — the deterministic window is closed); the orphan-release fold, nonce release, and reclaim single-winner all hold; exemption scoping, the marker freeze, and the gate-vs-providers price parity are real controls now.

```
VERDICT:   REVISE

BLOCKERS:  2

  B1. shell-parse.mjs, parseCommands() — backslash escaping outside quotes is not
      modeled; one character mints a free call.
      Repro:   node scripts/consult\-fable.mjs --document plan.md
      This executes the real script on POSIX (`\-` outside quotes is a literal `-`)
      and exits 0. Trace: the parser's ONLY backslash rule is `\\`+newline (line
      continuation); every other backslash falls through to `token += ch`, so the
      token is `scripts/consult\-fable.mjs`. It ends in `.mjs`, is pushed, and
      SEAT_NAME cannot match `consult\-fable.mjs` — `\` is outside `[a-z0-9-]` —
      so the seat is filtered, `invokesPaidSeat` is empty, and the first guard
      allows. This contradicts the header, which claims quoting as modeled, and
      the mechanism is half-built: `\<newline>` IS handled. The fix is one branch:
      unquoted `\` + any char → append the next char, skip both. Sibling, same
      family: the direct-exec branch requires `!argv[0].quoted`, so a quoted
      `"./scripts/consult-fable.mjs"` as argv[0] — legal, executes — is skipped.

  B2. shell-parse.mjs, invokedScripts() runner loop — a flag VALUE ending in
      .js/.mjs terminates the script scan and hides the real script.
      Repro:   node --require ./prelude.js scripts/consult-fable.mjs --document plan.md
      → exit 0, Fable bills. `./prelude.js` is the first token ending in `.js`,
      gets pushed as THE script, and the loop breaks. `isSeatPath('prelude.js')`
      is false (SEAT_NAME demands `.mjs`), so the line has zero seats. The real
      script is consumed as prelude's argv and never examined. Same shape for
      `--import ./setup.mjs` and `--experimental-loader ./hook.mjs` — documented
      Node idioms an honest agent copy-pastes. Your in-loop comment rejects
      enumerating node's value-taking flags (correct) and concludes the heuristic
      is the best available (incorrect). You do not need the enumeration: a
      candidate script PRECEDED BY a flag token that is not in NON_EXECUTING_FLAGS
      is a value — skip it and keep scanning. `--require` → value; the next `.mjs`
      is the script; `--check` → the carve-out still lands.

FINDINGS:  6

  F1. HIGH — spend-guard shell-parse.mjs NON_EXECUTING_FLAGS: `node -c` false-blocks.
      The set is {--check, -c-check, --version, -v}. `-c-check` is dead — no shell
      produces that token — and `-c`, node's actual shorthand for `--check`, is
      missing. `node -c scripts/consult-fable.mjs` prices at $1.06 and exits 2.
      The gate refused your own `node --check` mid-repair and you recorded that
      cry-wolf as worse than the hole; same workflow, one keystroke over. The
      dead entry sitting next to the missing real one looks like the fix colliding
      with its own encoding.

  F2. MEDIUM — holds that can never settle, two shapes (spend-guard-gate.mjs holdSpec).
      (a) The panel reserves under `modelKey || 'panel'`. No writer records
      'panel' — the fan-out's children record per-seat provider ids, whose
      releases match no hold and are discarded. The 'panel' hold survives the
      full TTL carrying the whole fan-out, so a second `--confirm-spend` panel
      within ten minutes inherits ~$1.97 of phantom on top of the real rows.
      This is the exact class your round-5 header declares dead — "no hold has
      ever settled any hold" — one seat over. Unless the panel's writer records
      the literal string 'panel', which nothing in the packet suggests.
      (b) Compounds hold every script under ONE per-line topic, computed from the
