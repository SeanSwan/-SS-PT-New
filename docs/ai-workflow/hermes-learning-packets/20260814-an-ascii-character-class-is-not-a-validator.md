---
title: An ASCII character class is not a validator
date: 2026-08-14
originating_model: claude-opus-5
tier: fable
surface: backend/services/marketing/fuzzyVariableService.mjs
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer (4 rounds)
    did: found the ASCII-only guard class with executed probes, fixed it, then
         attacked the fix and found three more holes; ran the loop to dry
    cost: $0 (subscription)
  - model: moonshotai/kimi-k3
    role: commissioned external reviewer for this exact class
    did: NOTHING — billed (model_calls=1) and returned zero output. Was also the
         wrong ceiling for the scope. Its remit was covered locally instead.
    cost: up to $0.95, lost
skills_touched:
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: a handoff recorded a class as "COMPLETELY UNTESTED" and told the next
             agent to buy a review. The class was probeable in twenty lines.
  - id: rule-51 (confidence tags)
    change: reinforced
    failure: my own probe agreed with the desired answer for the wrong reason
  - id: consult lane (scripts/context-gateway)
    change: proposed
    failure: no preflight mode exists, and enforceCeiling screens filenames not
             content — both documented in the handoff, neither fixed
---

# An ASCII character class is not a validator

## The lesson

`\w` and `\d` in JavaScript are ASCII-only without the `u` flag. A validator built
from them is not a validator of text; it is a validator of ASCII text, and it
will accept every non-ASCII spelling of the exact thing it exists to block.

A module whose entire purpose was preventing contact details, price claims and
markup from reaching a prospect's inbox accepted all of them:

| written as | guard defeated |
|---|---|
| `＄1200` | money guard sees no `$` |
| `40％` | claim guard sees no `%` |
| `ｈｔｔｐｓ://` | URL guard sees no `http` |
| `ｏｗｎｅｒ＠…` | email guard sees no `@` |
| `٠١٢٣٤٥٦٧٨٩` | phone guard sees no digits |
| `owner@examplе.com` | `\w` cannot match Cyrillic `е` |

**Measured: 21/21 crafted inputs accepted; 8/9 reached output end-to-end.**

The fix that matters is one line: **NFKC-normalize first, and return the string
you normalized.** That is what makes existing ASCII guards load-bearing instead
of decorative. It is canonicalization, not repair — total, deterministic,
idempotent, applied before every check — and returning the checked value closes
the validate-one-form/ship-another gap rather than opening a
negotiate-with-the-validator seam.

Two attacks defeat *structure* rather than shape and need separate rejection:
`\s` does not include U+200B, so forty words joined by zero-width spaces count as
ONE word and pass a ten-word ceiling at 269 characters; and U+202E reverses the
display of the human-written sentence around the clause with no forbidden shape
present at all.

## Who did what

**claude-opus-5 (me)** produced the finding, the fix, and three further rounds.
**Kimi K3 produced nothing** — it was commissioned for precisely this class, was
billed, and timed out empty. It was also the wrong model: `providers.mjs` pins it
to `ceiling: 'design'` because Moonshot is a Chinese provider and explicitly
refuses PII/security scope, which is what this module is. The routing was wrong
before the call was ever made.

Worth being exact about the failure, because the corrective differs: Kimi is not
unreliable. `origin/main` carries a successful Kimi run — nine findings, six real
and fixed, zero disproven, $0.20, 126s, at effort=high. The failed call's
distinguishing feature was `--max-tokens 60000`, i.e. sixty thousand tokens of
permitted reasoning, against a wrapper whose own header warns that a large budget
at high effort gets consumed by reasoning and emits an empty final message.

**The generalization: when a paid call returns nothing, suspect the invocation
before the vendor.**

## Skills created or changed

Nothing new was built. Two existing things were shown to be weaker than they read:

- **The consult lane has no preflight.** The handoff instructed the next agent to
  "preflight with no `--confirm-spend`". That flag does not exist; `assertSpend()`
  is followed immediately by `callProvider()`. An instruction describing a safety
  step that does not exist is worse than no instruction, because it is followed
  confidently. The only real brake is `SWAN_CONTEXT_MAX_USD`, fail-closed when
  unset. A true preflight is registry math — `estimateCost` + `enforceCeiling`,
  importing nothing from `transport.mjs`, which makes spending physically
  impossible rather than merely unintended.
- **`enforceCeiling` screens paths, not content.** Measured:
  `fuzzyVariableService.mjs` and `clientTextSanitizer.mjs` both PASS the design
  ceiling; a file merely *named* `privacy-notes.md` is REFUSED. The guardrail that
  looks like it prevents sending PII-handling code to a design-ceiling provider is
  a filename filter, and it would not have blocked the original call.

## Mistakes I made

- **I wrote literal invisible/control characters into source — twice.** Building
  the zero-width class, then again in the C0 control class four edits later. The
  second made git classify the file as binary. I fixed the first instance without
  adopting the rule, which is why there was a second.
- **A probe of mine passed for the wrong reason.** My zalgo sample happened to
  include U+0489, which lives in the Cyrillic block, so `mixed_script` caught it
  and the result read "rejected". Pure-Latin combining marks bypassed entirely. I
  came within one step of recording "zalgo is handled".
- **I asserted a behavior the path does not have** — expected null for a bare
  domain end-to-end, when the generator splits on the ASCII dot before the
  validator ever runs. I corrected the test, not the code.
- **I put new guards in front of existing ones**, silently reclassifying
  `dana@example.com` from `forbidden_shape` to `bare_domain` and breaking three
  pinned tests. Reason codes are the only forensic signal this module logs.

## Error → fix → repeat ledger

| error class | recurrences this session | written up before it recurred? | what actually stopped it |
|---|---|---|---|
| literal invisible/control chars in source | **2** | no — fixed instance 1 silently | building the class with `new RegExp` from escaped strings; the rule, not the instance |
| probe agrees for the wrong reason | 1 | n/a | a second sample constructed from a different block (pure Latin) |
| asserting behavior the path lacks | 1 | n/a | letting the failing test correct me instead of relaxing it |
| new guard ordered before old | 1 | n/a | backstops run last; existing reason codes are a contract |
| shell/path assumptions (heredoc escapes, `/tmp`=`%TEMP%`) | 2 | no | Write tool for escaped content; resolve `/tmp` before passing to a Windows binary |

The repeat is the entry that matters. The first invisible-character mistake was
fixed in place and never generalized, so it recurred within the same session in a
different regex. **The correction that survives is procedural — "build these
classes with `new RegExp`" — not resolutional ("be careful with unicode").**

## External-model calibration

| model | findings real | disproven | cost | verdict |
|---|---|---|---|---|
| kimi-k3 (this task) | 0 | 0 | up to $0.95, lost | wrong ceiling for the scope; misconfigured invocation |
| kimi-k3 (social publish, main) | 6 of 9 | **0** | $0.20 / 126s | earns its slot inside its ceiling |
| claude-opus-5 local probes | 24 across 4 rounds | 0 | $0 | reproducible; re-runnable by anyone |

The routing lesson: **an executed probe beats purchased prose whenever the
question is "does this input get through?"** — because a probe can be re-run by
the next agent and prose cannot. Buy a model's judgment for questions that need
judgment, not for questions a loop can answer.
