# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-t2-r4-packet.md
**Seed:** (none)
**Tokens:** 5509 in / 4172 out · **Cost:** ~$0.0000 · **Wall:** 103.4s · **finish:** stop

---

# Swan Forge T2 — ROUND 4 VERIFICATION (ox-alpha)

Verification only, as instructed. I scored against the lines provided, not the prose. One narrow scope item met my own bar (silent AND reachable); everything else stays frozen.

## Blocker scores

**Ox1 — balanced-paren chain scanning: FIXED**
Lines 116–126 (`skipParens`): depth counter, quote/escape awareness, correct return-past-close semantics. Lines 129–137 (`skipChain`): loops on `/^\s*\.\s*\w+\s*\(/`, feeds each open paren to `skipParens`, bails cleanly on `-1`. Lines 182–188 wire it correctly: `skipParens` from the `styled(` open, `skipChain` past `.attrs((p)=>({…}))`, whitespace skip, then the object-styles/backtick fork. The reported defect — `.attrs((p)=>({…}))` leaving the wrapper unscanned — is closed. Probed shapes confirmed by the fixture evidence (5 flagged / 2 clean).

**Ox2 — chained/derived seeding + cross-file: FIXED (in-file) / ACCEPTED-AS-LIMIT (cross-file)**
Seeding: lines 169–177. The closure regex at 172 (`styled\(\s*${name}\s*\)`) matches the *prefix* of `styled(FB).attrs({…})`, so chained seeds enter `bound`; line 174 catches derived wrappers (`const U = FB.attrs({…})`) with no `styled()` at all. Transitive closure iterates to fixpoint, capped at 5 passes. Cross-file: lines 147–151 state the per-file scope **in the source**, name the missing capability (module graph), and declare the honest contract — standing law within a file, tripwire across files. That is a limit disclosed where the next maintainer will actually read it. Accepted.

**Ox3/GLM B3 — flex-basis longhand: FIXED**
Line 91: `/^(flex|flex-basis)$/i` with a length-unit test covering px/rem/em/%/ch/vw/vh/vmin/vmax/pt/cm/mm/in. Shorthand and longhand hit the same door now. `flex-basis: 0` passes (consistent with the `min-width: 0` carve-out at 96–98); `auto`/`content` pass; `calc(100% - …)` is caught via the `%` match. Both independent findings closed by one predicate — correct shape.

**Ox4 — comment-stripped call site: FIXED**
Verified: line 227 builds `lines` from `stripComments(text)`, line 236 feeds `lines.join('\n')` into `scanStyledBindings`. The claim was true; the packet was simply missing the call site. Closed.

## Scope decision — one narrow reopen

I said I would not invent a fifth round of rules, and I'm not. But my own criterion is *silent AND reachable*, and one thing clears it:

**The fail-open `continue`s contradict the toolkit's own written law.** Lines 153–154: *"cannot verify" must never render as "fine."* Yet:
- Line 185: `if (closeParen < 0) continue;`
- Line 192: `if (end < 0) continue;`

If `skipParens` fails to balance — e.g. `.attrs((p)=>({ a: \`)\` }))`, a template containing a paren inside the args — the wrapper exits **silently**, unscanned, no finding, no INFO. Same for an unterminated template body. This is reachable by exactly the actor R6 exists for (a hand-written wrapper, negligent or otherwise), and it is fully silent. By the document's own invariant, an unparseable chain must emit a finding ("cannot audit — human decision"), not vanish. This is a two-line patch: replace both `continue`s with a pushed finding. It is not a new rule; it is enforcing the rule already printed at line 154.

Everything else stays frozen. The 5-pass closure cap and the `skipParens`-inside-template-string conservatism are noted, not reopened — both fail toward evasion-by-pathology, not toward the common case.

## Governance: ship now, or wait for the receipt?

**Ship T2 now. Do not wait for SWA-213 to ship — wait for it to *finish*.**

The receipt answers a question no static tool can: do the 11 UMS files *render* correctly. Static checks, typecheck parity, and 8107/8109 prove the code is disciplined, not that pixels are right. But the release risk asymmetry has been resolved: rollback is drilled in both directions, and R7 (lines 208–214) now guards both revert targets through SWA-213, so the escape hatch stays executable for exactly the surfaces that reach GlowButton through the shim. Shipping under those guardrails with the receipt as the **hard gate on cutover completion** (and on any GlowButton deletion) is the correct posture. Holding the entire T2 slice hostage to a dated ticket would trade a bounded, reversible risk for schedule risk the toolkit can't lint.

## Dissent (mandatory)

My dissent is the fail-open pair above, and I want it on the record plainly: **this toolkit's central ethical claim — "cannot verify must never render as fine" — is violated by its own control flow in two places.** Every other fix this round converts silence into signal; lines 185 and 192 are the last two places where the tool shrugs. A reviewer who approves those while praising the invariant elsewhere is rubber-stamping. I am not willing to do that, and I note for the record that had this surfaced in R3 rather than R4, it would have been a fifth blocker, not a footnote.

Second, smaller dissent: the pre-existing flake in `canonical-surface-names.test.ts` is correctly out of slice, but "10 files carry retired names" is a standing tripwire adjacent to this migration. Filed is fine; forgotten is not.

## Verdict

Apply the two-line fail-loud patch, re-run the consumer suite, and T2 ships under the guardrails with SWA-213 gating completion. No further rules rounds.

**REVISE**
