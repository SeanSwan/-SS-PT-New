# GLM Consult

**Model:** glm-5.3
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-t2-r2-packet.md
**Tokens:** 8445 in / 24670 out (reasoning: 21975) | total 33115
**Wall:** 389.2s

---

# GLM 5.3 — Swan Forge T2, Round 2

## 1. Adjudicating the disproof of my #1/#2 — ACCEPTED

I said round 1's top blocker was that `LateCancelActionButton` migrated carrying `background: linear-gradient(...)`. The context diff shows I was wrong: the wrapper's body is `flex: 1;` and it closes two lines later; the gradient lives in `LateCancelContinueButton = styled.button`, a sibling the strangler never rewired. The `-U6` hunk puts the separating lines back that `grep -E '^[+-]'` deleted, the per-export map (26 exports, exactly one `styled(ForgeButton)`) is a count I can re-run myself, and the tag's "untouched by the Forge strangler" provenance is accurate for that literal.

Plainly: **I accept the disproof and retract #1 and #2.** Two caveats, one against me, one against the packet:

- Against me: I certified a violation I could not actually see. Both reviewers missing it is *explained* by the stripped diff, not *excused* — I should have demanded context before blocking. Panel rule I'll hold myself to from here: a violation cite without ±6 context lines is inadmissible.
- Against the packet: "MECHANICAL disproof" oversells R6-clean. R6 executes the *same boundary function under review* — if the boundary is wrong, R6 is wrong in the same direction. The disproof stands on the context diff and the export count; R6 is corroboration, not independent evidence. I accept on the former.

## 2. Scoring blockers 3–6

| Item | Score | Evidence |
|---|---|---|
| GLM-3 tagger guesses renderable text | **FIXED** (new hole filed in §5) | `commentFormFor`: JSX-text and opening-tag lines now fall through to `return null` (the two `closesJsx` guards require a positively closing tag *and* a `[}>]` line-end); string-parity case lexed correctly. Both my round-1 inputs refuse. |
| GLM-4 regen silently republishes 41-of-42 | **FIXED\*** | Claimed refusal on any `n/a` row; diffstat `regen-backlog.mjs +7`; `backlog --check` idempotent, 42 rows. \*Code not in packet. Verification note: the refusal must fire **before any write**, or a mid-list abort leaves a partially republished backlog — the round-1 failure mode, half-executed. |
| GLM-5 forwardRef/binding regression | **NOT A DEFECT — withdrawn** | Only ref among the 11 files is an `<input>`; legacy GlowButton never had forwardRef. There is no behavior to regress; deferral is correct. |
| GLM-6 no authenticated receipt | **NOT-FIXED** | The receipt still does not exist — the packet says so itself under "Still true." SWA-213 (assigned, due 2026-09-08, unproven list enumerated) plus the drilled revert converts this from *unacknowledged* to *managed*. Managed is not fixed. |

## 3. Attacking the allow-list

**Restyling property still allowed:** the `flex` shorthand is admitted by name (`flex: 1;` migrates), so **`flex: 0 0 320px` migrates** — flex-basis *is* the button's main-axis size, while the fixture explicitly blocks `width: 300px;` (`codemod.test.mjs:238–241`). The boundary checks property *names*, not effects; size sneaks through one door after being locked out of the other. Either constrain the shorthand's values or record that basis is parent-layout by doctrine. Non-blocking (it's internal inconsistency, not a regression), but it must be a recorded decision.

**Layout properties wrongly blocked:** `min-width: 0` — the near-mandatory flex-overflow fix, and overflow-at-width is literally on SWA-213's unproven list — plus `position`/`inset` for genuinely positioned wrappers. These route to human decision, which is the designed fail-closed path, so: acceptable friction, but `min-width: 0` (exact value) belongs on the list or every real flex row generates a manual touch. `gap` blocked is *correct* — it styles the button's own children.

**Process defect:** the packet never includes the allow-list body. The diff hunk ends mid-docstring ("`filter: hue-rotate` (recolours the entire button),"). I verified 17 probed shapes and 17 fixtures; "fail-closed" beyond that is an unread claim. The function must be quoted verbatim in the T2 record before round 3.

## 4. Attacking drift-lint R6 — the standing law has four one-line escapes

The matcher is `/styled\(\s*ForgeButton\s*\)\s*`([\s\S]*?`)/g` (`drift-lint.mjs`, new lines ~94–104). It sees exactly one call shape:

```js
// 1. .attrs — template not adjacent to ')': no match
const A = styled(ForgeButton).attrs({ type: 'submit' })`background: red;`;
// 2. .withConfig — same shape break
const B = styled(ForgeButton).withConfig({ displayName: 'B' })`outline: none;`;
// 3. re-extension — only the inner literal matches; outer restyle rides one hop past the law
const C0 = styled(ForgeButton)`flex: 1;`;
const C  = styled(C0)`background: red;`;
// 4. alias — literal-name regex blind
import { ForgeButton as FB } from '…'; const D = styled(FB)`filter: hue-rotate(90deg);`;
```

All four predict **0 R6 findings** — the regex cannot match any of them, and none trigger R2 (no `.sw-` selector, no `!important`). `.attrs` is *idiomatic* styled-components; this law decays on contact with the first developer who uses it. The commit message's claim — "this is the half that survives the merge" — is false as shipped. Round 1 held (Ox B3) that codemod-only enforcement decays; the replacement tripwire must at minimum survive `.attrs`, and its scope must be honestly labeled if it won't. **BLOCKING.**

(One non-issue to close out: R6 scans raw `text`, not comment-stripped — a commented-out example will flag. That's the fail-closed direction; noise, not a hole. The `[\s\S]*?` under-capture at an inner backtick still retains the `${` opener, so interpolation remains blocked — consistent with the commit's truncation analysis.)

## 5. Attacking the tagger lexer — an input it MISCLASSIFIES, not refuses

`lexStateAt` has no regex-literal state and treats `${…}` interpolation as opaque template text. The template state is the only one that never resyncs at newline. Therefore:

```js
const FENCE = /^`{3}/m;          // markdown fence probe — legal, common regex
…
<p>Pay by #ef4444 card</p>        // G4-flagged line, later in the file
```

Trace: `/` followed by `^` forms no comment → normal; `` ` `` → **template**; `{3}/m;` contains no closing backtick; template persists across every following newline. The flagged line's `lineStart` state is `'template'`, so `commentFormFor` returns the bare `/* … */` form — appended after `</p>` in JSX children position, where `/* … */` is **text**, and ships visible junk into the UI. That is a misclassification — precisely the sin the rewrite exists to make impossible, on an input (`/^```/ `, `str.replace(/`/g, …)`) any markdown-adjacent frontend file contains. The tool's contract is "REFUSES any context it cannot positively classify"; it cannot know what it cannot lex, and it currently cannot lex regex literals or interpolation bodies.

Fix that matches the tool's own philosophy: apply refuse-on-ambiguity to the lexer's frontier — any `/` in normal state that does not form a comment, or any `${` while in template state, makes the *file* unprovably classified → refuse, exit 1. One afternoon, honest. **BLOCKING.**

## 6. Regen refusals

Semantics right ("`n/a` is never information"). Attacks remaining are the ones I can't see: write-ordering (validate-all-before-write), and whether refusal fires in dry-run. Non-blocking, verification note stands.

## 7. Rollback drill and SWA-213

The drill is real evidence: revert of c23795f6b *and* e73da8982 → 367 tests green on the pre-Forge state → restored clean. Reversibility is now demonstrated, not asserted; zero test edits is itself an asset. SWA-213 does **not** discharge the receipt gap — it enumerates and dates it (cascade specificity, auth-gated branches, overflow, focus order). For a strangler stage with the legacy path retained and a drilled revert, I accept deferral as managed risk, not blocking. But see dissent.

## 8. DISSENT (mandatory)

1. Against the packet's labels: "MECHANICAL disproof" (R6 is the boundary auditing itself — circular) and **"Authenticated receipt: SWA-213"** — a dated ticket is a receipt that verification is *owed*, not that it *happened*; the packet's own "Still true, still disclosed" contradicts the label two paragraphs later. This is the same evidence-inflation class the corrections section just apologized for (20.9s/61s, 0/42). §20 must record it as "deferred verification," not "receipt."
2. Against the tagger's stated contract: "refuses rather than guesses" is overclaimed until §5 is fixed — it still guesses wherever a regex literal lives.
3. Against myself: my round-1 #1/#2 were born from certifying a context-stripped diff. I dissent from my own round-1 method and propose the admissibility rule above.
4. Anticipated: if Ox approves on the strength of R6's *existence*, I dissent in advance — a standing law that `.attrs` evades is not standing law; round 1's B3 logic applies to its fix verbatim.

## Verdict

Real work landed here: the allow-list inversion is right, one boundary function feeding both gate and lint is the right architecture, the disproof of my top two is accepted, and the corrections section is candid. Two cheap, contract-breaking defects remain, both in the round's headline deliverables.

**REVISE**

Blocking only:

1. `packages/swan-forge/scripts/drift-lint.mjs` — R6 block, new lines ~94–104 (anchor: the `text.matchAll(/styled\(\s*ForgeButton\s*\)\s*`/)` line, ~99): single-call-shape matcher; `.attrs`, `.withConfig`, one-level `styled()` re-extension, and import aliases all evade the standing law. Extend the matcher and resolve derived/aliased identifiers, or relabel R6's recorded claim from "standing law" to "exact-shape tripwire."
2. `packages/swan-forge/scripts/tag-legacy-hex.mjs` — `lexStateAt`, template branch (~45): no regex-literal or `${…}`-interpolation handling; a `/^`{3}/`-style regex poisons template parity file-wide and a later JSX line is misclassified `'template'`, receiving bare `/* … */` that renders as UI text. Make the lexer refuse on its own ambiguity (non-comment `/` in normal state, or any `${` in template state → refuse file, exit 1).

Non-blocking for the record: flex-basis-via-shorthand seam (`codemod-glowbutton.mjs`, allow-list), `min-width: 0` addition, publish the allow-list body verbatim in §20, regen write-ordering verification, rename SWA-213's line in the record.
