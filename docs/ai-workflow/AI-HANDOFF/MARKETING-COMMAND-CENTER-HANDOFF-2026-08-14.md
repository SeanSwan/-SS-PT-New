---
decision: Marketing Command Center — slice 1 (readiness card) and slice 2 (fuzzy-variable harness) re-authored clean onto current origin/main. The owed external review's commissioned class was run locally with executed probes and CLOSED. External spend now optional, and should target Sol, not Kimi.
status: open
supersedes: none
---

# Marketing Command Center — Session Handoff (2026-08-14)

**Author:** claude-opus-5 · **Branch:** `claude/marketing-readiness-s2l-clean-2026-08-14`
(5 commits, **UNPUSHED**, worktree `c:/tmp/swan-mkt-s2l`, based on current `origin/main`)

---

## ⚠ CORRECTIONS TO THE PREVIOUS HANDOFF — read before acting on any older copy

The previous revision of this file told the next agent to do three things. **Two of them
were wrong and one would have spent money.** Corrected here with executed evidence.

**1. `consult-kimi.mjs` has NO preflight mode. There is no `--confirm-spend` flag.**
The old instruction — "preflight first with no `--confirm-spend`, then re-run with it" —
does not describe this script. `runConsultInner` calls `assertSpend()` and then
`callProvider()` on the very next line; there is no gap to approve in. Verified:
`grep -rn "confirm-spend" scripts/context-gateway/src/ scripts/consult-kimi.mjs` → no
matches. Following that instruction literally would have billed a second call while
believing it was a dry run. **The only real brake is `SWAN_CONTEXT_MAX_USD`, which is
fail-closed when unset** (`NO_CAP` refusal before any network call). It is currently unset.
A true preflight is registry math — see §5.

**2. The timeout was almost certainly configuration, not packet size.**
The old note blamed the 16k-char packet against a 60k ceiling. But `origin/main` now carries
a **successful** Kimi run (`KIMI-SOCIAL-PUBLISH-HOSTILE-REVIEW.md`, commit `c9f11c301`):
`effort=high`, 8,681 in / 11,545 out, **126s, $0.1992, finish_reason=stop**. High effort is
not the problem. The failed call's distinguishing feature was `--max-tokens 60000` — and
`consult.mjs` defaults `--effort` to `high`, which the wrapper's own header warns will
"burn the whole token budget on reasoning and emit an empty final message." A 60k budget
is 60k of permitted reasoning. **Mirror the settings that demonstrably worked: default
16k max-tokens, packet ~7-9k tokens.**

**3. Kimi is the WRONG reviewer for this module, by the repo's own encoded policy.**
`providers.mjs` pins Kimi to `ceiling: 'design'` ("Moonshot, Chinese provider — design-scoped
per house policy; packets containing auth/billing/payments/PII/security evidence are
REFUSED"). `fuzzyVariableService` is a privacy/PII egress validator. Commissioning Kimi to
hostile-review it is against that policy. Use **`sol`** (`openai/gpt-5.6-sol`,
`ceiling: 'standard'`, role: *"High-reasoning hostile gate (correctness/security/data-truth)"*)
or `fable`. Both are standard-ceiling and policy-clean for this scope.

**4. Still true and still correct:** do NOT use `run-newsroom-top-ai-panel.ps1` — its remits
are hardcoded for a different project with no `-Remit` override.

---

## 1. The owed review's commissioned class is now CLOSED — locally, with proof

The paid review was commissioned to find the **unicode / homoglyph / zero-width / RTL /
punycode validator-bypass class**. It was billed and returned nothing. That class has now
been probed, found wide open, fixed, and re-probed. Executed, not argued.

**Before (probe against the real `validateClause`): 21 of 21 crafted inputs ACCEPTED.**
**End-to-end through `resolveFuzzyVariables` (real sanitizer, real generator): 8 of 9
payloads reached prospect-facing output.**

Root cause is one line of JavaScript semantics: every `FORBIDDEN_SHAPE` was an ASCII
character class, and `\w`/`\d` are ASCII-only without the `u` flag. The guards were
structurally blind:

| payload | guard defeated |
|---|---|
| `＄1200` fullwidth dollar | money guard sees no `$` |
| `40％` fullwidth percent | claim guard sees no `%` |
| `ｈｔｔｐｓ://evil` fullwidth scheme | URL guard sees no `http` |
| `ｏｗｎｅｒ＠…` fullwidth email | email guard sees no `@` |
| `٠١٢٣٤٥٦٧٨٩` Arabic-Indic digits | phone guard sees no digits |
| `€1200` any non-USD symbol | `\$` is one currency of many |
| `owner@examplе.com` Cyrillic `е` | `\w` cannot match U+0435 |

Plus two that defeat the *structure* rather than a shape, because `\s` does not include
U+200B: **40 words joined by zero-width spaces counted as ONE word**, passing a ten-word
ceiling at 269 characters; and a **U+202E RTL override reverses the display of the
human-written sentence** it was interpolated into, with no forbidden shape present at all.

**The fix** (commit `93c487aad`): NFKC normalize first and return the normalized string —
which is what makes the eight existing ASCII guards load-bearing rather than decorative —
plus outright rejection of invisible/bidi controls, single-token mixed script, non-ASCII
digits, bare domains, and any currency symbol via `\p{Sc}`.

**After: 0 of 21 accepted. End-to-end 1 of 9, and that one renders `"i found you on
evil-example"`** — the default generator splits on the ASCII dot, so no domain survives.
That case is asserted explicitly rather than papered over.

Tests **65/65** (33 pre-existing, **none rewritten**; 32 added). 239 lines, under the cap.

**Ordering note worth keeping:** the three new backstops run *after* the shape loop. Placed
first, they silently reclassified `dana@example.com` from `forbidden_shape` to `bare_domain`
— same rejection, but reason codes are the only forensic signal this module logs, and three
existing tests pin them.

## 2. A real gap in the sensitivity ceiling itself

`enforceCeiling` screens **evidence PATHS, not content**. Measured:

```
passes  <- backend/services/marketing/fuzzyVariableService.mjs   (a PII egress validator)
passes  <- backend/services/ai/clientTextSanitizer.mjs           (prompt-injection defense)
REFUSED <- backend/services/marketing/privacy-notes.md           (a file merely NAMED privacy)
```

So the T10 ceiling would not have blocked the original Kimi call. It looks like a guardrail
against sending PII-handling code to a design-ceiling provider; it is actually a filename
filter. Worth a slice — but it is a Sean-gated change by the module's own comment
("widening the ceiling is a Sean-gated code change"), and narrowing it is the same call.

## 3. Branch state — re-authored clean

| Item | State |
|---|---|
| Branch | `claude/marketing-readiness-s2l-clean-2026-08-14`, 5 commits, **unpushed** |
| Base | current `origin/main` (`c9f11c301`) — the 49-commit drift is gone |
| PII in history | **RESOLVED.** Verified: the real address appeared in 5 commits of the old branch and never appears in this one. Nothing was ever pushed from either. |
| Old branch | `claude/marketing-readiness-s2l-2026-08-14` left in place as the archive. Delete when Sean is satisfied. No history was rewritten. |
| Speed-to-lead | Code live on main; **dark** pending Sean's Render flag |
| Fuzzy vars | Harness + confusable hardening. **Still not wired.** Next slice. |

Zero file overlap between the 13 touched files and main's 49 new commits, so this was a
clean re-author, not a merge.

## 4. What shipped

1. `3de31f4b1` — speed-to-lead readiness card. Dark-by-default reports `ready`, never an
   alarm; escalates only when the operator believes it works and it does not.
2. `13bbd4db8` — fuzzy-variable harness. Injectable generator, deterministic default that
   can only return a substring of what the prospect wrote, output validated as hostile
   input, every failure path returns null.
3. `93c487aad` — the confusable/invisible/bidi hardening above.
4. `dd6a400bf` — two durable Hermes learning packets.

## 5. If Sean still wants external spend — the real preflight

Registry math only, no network (`estimateCost` + `enforceCeiling`, importing nothing from
`transport.mjs`). Packet = fixed module + full test suite, **26,745 bytes ≈ 6.7k tokens**:

| provider | model | ceiling | max-tok | est USD | ceiling |
|---|---|---|---|---|---|
| **sol** | `openai/gpt-5.6-sol` | standard | 16000 | **$0.5246** | PASS |
| fable | `anthropic/claude-fable-5` | standard | 16000 | $0.8891 | PASS |
| kimi | `moonshotai/kimi-k3` | design | 16000 | $0.2667 | PASS *(but policy-barred, §⚠3)* |

The estimate assumes the full `maxTokens` is emitted — an exact ceiling, not a forecast.
The comparable real run cost $0.20 against a $0.27-shaped estimate.

`SWAN_CONTEXT_MAX_USD` is **unset**, so nothing can spend until Sean sets it.

**Recommended remit if it runs:** *"the ASCII-only class has been closed; find what the
FIXED validator still misses"* — a fresh adversarial pass on the new guards, not a repeat
of the class already proven closed.

## 6. Where this is going

1. **Arm speed-to-lead** — Sean's Render flag on `ss-pt-new`:
   `SPEED_TO_LEAD_REPLY_ENABLED=true`. Not the database. Rollback = same switch to `false`.
2. **Wire fuzzy vars into the send path** — `renderInstantReplyEmail` gains an optional
   clause slot; `speedToLeadService` resolves it and falls back to static copy on null.
   **No longer blocked** — the class that gated it is closed.
3. **Signals engine** — extend readiness from "is it configured?" to "is it drifting?"
   (lead-flow collapse, CPL spike, conversion shift). Read-only, zero send risk.
4. **Error observability** — marketing workers log to `logger` and nothing surfaces. Sean
   already owns the channel (Hermes/Telegram); the workers just don't write to it.
5. **In-app agent console** — registered skills only (no free-form execution from a browser
   admin panel), serving Codex as well as Claude, with the two able to review each other.
6. *(new, optional)* **Narrow the sensitivity ceiling** from filename to content — §2.

**Explicitly NOT to build:** cold-outreach lead scraping. Wrong motion for a trainer-led
B2B2C product regardless of what the course teaches.

## 7. Environment gotchas that cost time

- Worktrees have no `node_modules`. Junction them from the main tree via a `.bat`
  (`mklink /J`) — Git Bash mangles the path escaping inline.
- A borrowed `node_modules` **invalidates baseline claims**: it lacked `three` and
  `@zxing/browser` though `origin/main`'s `package.json` declares both, producing 3 phantom
  tsc errors. Report scope, not "tsc clean".
- `--reporter basic` is not valid in vitest 4.
- In Git Bash, **`/tmp` is `%TEMP%`, not `c:/tmp`** — and with `MSYS_NO_PATHCONV=1` set, a
  `/tmp/...` argument passed to git (a Windows binary) will not resolve at all.
- The main tree is on a wip branch **~1900 commits behind main**. Audit against
  `origin/main`, never that tree.

## 8. Verification evidence (current session)

- `fuzzyVariableService.test.mjs` → **65/65** (was 32; +32 added, 1 of my own new rows
  corrected mid-development because it asserted a behavior the path does not have)
- `speedToLeadReadiness.test.mjs` + `marketingReadinessService.test.mjs` + fuzzy → **105/105**
- Adversarial probes re-run after the fix: **0/21** validator bypasses, **1/9** end-to-end
  (documented benign)
- `node --check` clean; pre-commit secret scan CLEAN on all 5 commits
- Not run this session: frontend suite, `tsc --noEmit`, full backend suite. Slice-scoped
  only — **not a baseline-clean claim** (rule 56).
