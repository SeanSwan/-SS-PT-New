# GLM Consult

**Model:** glm-5.3
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-t2-r3-packet.md
**Tokens:** 5802 in / 29011 out (reasoning: 26336) | total 34813
**Wall:** 549.8s

---

# GLM 5.3 — Swan Forge T2, Round 3 (final)

Verbatim-in-packet worked. I traced every claim against the rendered code, not the closes table. Two things up front the table says that the code doesn't quite say, then scoring, then the attack.

**Packet discipline note:** only codemod-glowbutton.mjs came with line numbers (36–110). drift-lint.mjs, tag-legacy-hex.mjs, and audit-hex-tags.mjs are verbatim but unnumbered, and the claimed "comment-stripped scan" for R6 happens in a caller that is *not* in the packet — the no-phantom-flag probe therefore verifies behavior I cannot see. Citations below are file + function + code anchor; I'm not manufacturing line numbers the packet didn't give me.

## Round-2 blockers, scored

**GLM#1 / N2 — R6 saw one call shape: FIXED.** Verified in `scanStyledBindings`: default-import seeding captures arbitrary local names (my `import FB … styled(FB)` probe now seeds), renamed named imports seed, the no-import fallback preserves fixtures, transitive closure iterates `const|let|var X = styled(name)` to fixpoint (5-pass cap is fine), `.attrs/.withConfig` chains match (I checked the backtracking: `.attrs({onClick: e => f(a)})` re-extends the lazy match to the real closing paren), and object-styles is flagged unconditionally — correct fail-closed. The fix is real. It is also incomplete; see B2.

**GLM#2 / N1 — lexer had no `${…}`/regex state: FIXED.** Both of my exact inputs pass by trace: `/` after `=` and after `(` enter regex state; the backtick inside is consumed as regex content; the later JSX line lexes `normal` and takes `{/* */}`. The stack handles `css\`…\`` inside `${…}` correctly (inner backtick pops to the brace/interp context, not to `normal`), `\` escapes are honored in template/quote/regex states, unterminated quote/block-comment returns a refusing state rather than a guess, and a line inside an interpolation returns `normal` — code, not CSS. I score this FIXED *as filed* (the states exist and the scoped probes pass), with a new defect in the heuristic that governs regex entry — B1. If Ox reads B1 as making this NOT-FIXED, that's a defensible read of scope; mine is that the blocker was "no state exists," and I file new defects under new IDs rather than re-litigating old ones. That discipline is what got us out of round 1.

## The attack

**B1 — lexer, regex-vs-division at keyword positions.** The trigger set is `^$|[([{,;:=!&|?+\-*%~^<>]` — punctuation only. `return /['"]/.test(s)` has `prev='n'`: the regex is lexed as code, the `'` opens a quote state that runs to the next stray quote, and everything between is scrambled. Worse, `return /\`/.test(x)` pushes a *phantom template*; the next real styled template's **opening** backtick closes it, and that template's CSS body is then lexed as `normal` — a marker line inside real CSS takes `//` and is emitted into the stylesheet. That is the original N1 damage, re-entered through a position neither of my round-2 probes tested (`=` and `(` were the tested prevs). `case /re/:`, `typeof`, `void` same. The tagger usually fails closed on the scramble (refuse on `quote`/`string`), but the auditor silently skips those states — so B1 is also an auditor blind spot. Fix: track the last word token; `/` after `return|case|typeof|void|delete|in|of|new|do|else|yield|await` is a regex.

**B2 — R6 still has two silent-pass shapes.**
- *B2a, template-body truncation:* `const end = text.indexOf('\`', bodyStart)` is not template-aware. A backtick inside the body — `content: "\`"` (survives any comment-stripper), or `/* don't \` touch */` if the off-stage stripping is absent — ends the audit early. `margin: 0 /* …\`… */; width: 300px;` audits only `margin`, returns `null`, R6 reports clean. You already wrote the correct terminator-finder; it's called `lexStateAt`. Use it.
- *B2b, attrs inside the parens:* `styled(FB.attrs({ type: 'submit' }))\`width: 300px\`` fails `styled\(\s*FB\s*\)` at the `.` — never audited. Same for `const W = FB.attrs({}); styled(W)\`…\`` (W is never seeded; seeding only follows `styled(name)`). Round 2 fixed `.attrs` *after* styled; this is the symmetric *inside* position, and hand-written wrappers are your stated threat model.

**B3 — `flex-basis: 320px` walks through the manifest.** The GLM§3 fix put the length-basis check on `^flex$` only; `flex-basis` is in `LAYOUT_ALLOWED` unconditionally. The longhand is the *same* main-axis sizing the shorthand check exists to block — `flex: 0 0 320px` is blocked, `flex-basis: 320px` migrates. I checked the manifest⇄regex agreement by hand (26 props, matching, anchored so alternation order is safe) — that part is sound; this is a value seam one property over. Apply the length-basis test to `flex-basis`; note `var(--len)` in either remains un-blockable statically (residual, disclose it).

**B4 — R7 guards the wrong file list.** `RETENTION_GUARDED` holds `buttons/GlowButton.tsx` only. The packet itself documents `ui/GlowButton.ts` as the shim that 2 T-tier surfaces import; a revert restores those imports. Deleting the shim during the SWA-213 window — it's exactly the kind of file a cleanup PR removes, a one-line re-export that looks dead — breaks the drilled rollback while R7 stays green. That is N4's failure mode, one path over. Add the shim.

**B5 — the auditor's DAMAGE predicate can miss real damage.** The two template branches are correct (I traced both; the planted-`//` proof is valid for CSS). The JSX branch is not wide enough: it requires a close-tag or `/>` **on the marker line** and the line ending `>`/`}`. `<div>Hello {name} // swan-guard-allow-hex` — or the `/* */` form — is text that renders in the UI, and no branch fires. The 66 tags were placed by taggers you don't trust; the auditor cannot assume they sit on statement-shaped lines. The redesign also over-corrected: the 8 earlier findings were noise in the signal channel, and the right fix was to split channels (DAMAGE vs. form-disagreement-as-INFO for one human read of 66 lines), not to shrink coverage. As shipped, "66 / 0 damage" under-covers and the close on N1b is conditional. Also non-blocking but real: only the first marker per line is audited (`indexOf`), `(unrecognised)` inside a template is swallowed as prose when it's emitted CSS junk, and the auditor inherits every lexer mis-lex, including B1.

Verified-good, for the record: the `--sw-btn-*` allowance holds even against my own N3a instinct — custom properties only act where consumed, and the published namespace is by definition the `--sw-btn-` names, so unlike `--sw-accent` there's no inheritance path into skin the wrapper doesn't already own. `min-width: 0` (exact-zero, `0px` accepted) is right; `min-width: auto` over-blocks safely. `return (<div>x</div>)` correctly refuses rather than emitting a post-paren `{/* */}` (which would be a syntax error). Nested-block and interpolation checks in `styledWrapperBlocker` fire before declaration parsing, fail-closed.

## Shippable given the authenticated-receipt gap?

Plainly: **not this build — and not because of the receipt.** B1–B5 are all small (none is architectural; B2a's fix already exists in another file in this same packet), but until they close, the evidence chain "0 blocking-class, 66/0 damage" is not strong enough to lean on *in place of* the missing receipt — the rules are the compensation for the unverified cascade, and they currently have silent-pass holes on exactly rule 84. After B1–B5 land and re-run: **yes, shippable with the gap disclosed** — rollback drilled both directions, R7 (with B4 fixed) keeps it executable, SWA-213 dated and enumerated. The receipt gap alone would not make me REJECT; see dissent.

## DISSENT (mandatory)

1. **Against "All six closed":** false as stated. N4/R7 is not closed (B4 — the guarded set is incomplete), and N1b is closed only for the CSS damage classes, not the JSX-text class (B5). Four of six, plus my two scored on verbatim traces.
2. **Against the auditor redesign narrative:** "fixed the auditor to report DAMAGE, not a different-but-valid choice" is the wrong lesson from the 8 false positives. Those were a classification error (valid forms labeled mismatches), not a coverage problem. Damage-only trades observable noise for silent under-detection — in a one-time audit of untrusted output, the worse error by an order of magnitude.
3. **Against anyone reading the drilled rollback as receipt-equivalence** (I expect this pressure at final): the drill proves the code path reverts and 367 tests go green. It proves nothing about the real-browser cascade, auth-gated branches, or overflow at data widths on payment modals. A revert that compiles and still renders wrong at 02:00 during an incident is not a rollback, it's a second incident. SWA-213 must gate deletion of the legacy tree *and* any second authenticated surface migrating on the same unverified cascade assumptions — not just the retention ticket.

## Verdict: **REVISE**

Blocking only:

- **B1** — tag-legacy-hex.mjs, `lexStateAt()`, the `/`-dispatch line in the `normal` block (~line 15 as rendered): add keyword positions (`return`, `case`, `typeof`, …) to the regex-start predicate.
- **B2a** — drift-lint.mjs, `scanStyledBindings()`, `const end = text.indexOf('\`', bodyStart)` (excerpt line ~31): find the template terminator with escape/interp-aware scanning (`lexStateAt`), not first-backtick.
- **B2b** — drift-lint.mjs, `scanStyledBindings()`, the seeding regex and the audit regex (excerpt lines ~21, ~26): match `styled(FB.attrs(…)/.withConfig(…))` and seed `X = FB.attrs(…)` aliases.
- **B3** — codemod-glowbutton.mjs, `styledWrapperBlocker()`, the flex length-basis check (~lines 81–84 of the 36–110 rendering): extend the length-basis block to `flex-basis`.
- **B4** — drift-lint.mjs, `RETENTION_GUARDED`: add `components/ui/GlowButton.ts` (the shim) alongside the `.tsx`.
- **B5** — audit-hex-tags.mjs, the damage-predicate block (~lines 60–72 as rendered): widen JSX-children damage past the closesJsx line-shape (flag non-`{/* */}` forms in `.tsx` normal-state lines that don't end a statement), and emit form-disagreements as INFO rather than swallowing.

Number the files in the next packet; I shouldn't have to count excerpt lines to cite them.
