# GLM Consult

**Model:** glm-5.3
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-t2-packet.md
**Tokens:** 11058 in / 22368 out (reasoning: 18920) | total 33426
**Wall:** 366.0s

---

# T2 Review — hostile pass, all six axes

Genuine first: the refusal philosophy, the positive control that caught the reachability bug, mutation-proving the binding test, and retracting half your own slice are all better engineering than most PRs ship. Now the dissent, because this packet contains a contradiction that invalidates its headline claim.

---

## 1. The value-position rule — your own diff falsifies your own claim

The commit says: *"Both real instances are LAYOUT-only (margin-top: 1rem; flex: 1)"* and *"0 blocked."* The packet then attaches "the two value-position diffs (the whole new class, in full)," and the second one shows:

```
-export const LateCancelActionButton = styled(GlowButton)`
+export const LateCancelActionButton = styled(ForgeButton)`
-  background: linear-gradient(135deg, #ef4444, #dc2626);
```

In a unified diff those lines are contiguous — that gradient is the **first declaration inside the migrated wrapper**, and `color:` lines sit above the declaration in the same file. `background` and `color` are both in `SKIN_OWNED`. Under the rule this PR ships, this wrapper must be **SKIPPED, left on GlowButton, and counted as blocked/residual**. It was migrated instead, and its hexes were tagged *"untouched by the Forge strangler"* — which is false provenance: the strangler rewired this component onto a different skin. There is no reading where both the rule and this diff are true. Either the codemod ran before the rule existed and the rule was retrofitted around an already-shipped violation, or the evidence packet misrepresents main. Both are review-blocking.

**Why it matters concretely (specificity):** styled-components injects the wrapper's `.sc-*` rule at wrapper-construction time — after the skin sheet — so at equal specificity (0,1,0) the wrapper **beats** `.sw-btn` and `.sw-btn--*`, but **loses** to pack compound selectors like `.sw-pack-crystalline-swan .sw-btn` (0,2,0). The legacy `styled(GlowButton)` cascade was a different fight with a different loser. You have silently moved a catalog override onto a skin where it *partially* wins — the worst possible outcome, because it's visually subtle, it's on an authenticated surface, and per your own LIMITATION there is **no receipt** to catch it.

**On the boundary itself:** a deny-list is the wrong failure direction for a codemod. CSS has hundreds of properties; unknown ones must *skip*, not migrate. Invert to a layout-only allowlist (margin*, flex*, grid*, place/align/justify, order, gap, position, inset, z-index) and skip everything else. Concrete properties that slip through today:

- **`line-height`** — the headline answer. Its siblings `letter-spacing` and `text-transform` are listed; text metrics are unambiguously skin-owned. A wrapper with `line-height: 1` visibly reshapes every variant.
- **`width` / `min-width` / `max-width` / `inline-size`** — you listed `height`, `min-height`, `max-height`, `block-size`, `min-block-size` and forgot the entire horizontal axis, including the logical property you clearly knew about. `min-width: 0` over a skin `min-width` is a real override.
- **`outline`** — `outline: none` kills the focus ring without touching any listed property. On payment-modal footers.
- **`text-shadow` / `filter`** — the component is named *GlowButton*; glow restated as `text-shadow` or `filter: brightness()` sails through.
- **`background-size` / `background-position`** — repositions/rescales the skin's gradient with no denied property touched.

**On regex-on-body as mechanism:** two hard failures. (a) The lazy `` `([\s\S]*?)` `` terminates at the **first nested backtick**, so `` styled(GlowButton)`${css`…`}\n background: var(--danger);` `` truncates the body scan to `${css`, finds nothing skin-owned, and **migrates anyway** — the mis-parse and the migration compose into the exact silent override the rule exists to prevent. (b) Interpolated imported fragments (`${sharedButtonCss}`) are invisible to the regex entirely. Regex is acceptable for *detecting danger*; it is not acceptable for *certifying absence of danger*. If you keep it, any `${identifier}` in the body ⇒ skip.

## 2. `styled(ForgeButton)` at runtime

- **The test proves plumbing, not the thesis.** The mutation kill (delete className forwarding → `marginTop` reads `''`) is excellent — it proves the assertion reads the live path, not a static sheet. It does **not** prove "composes with the skin instead of overriding it": jsdom's cascade handling is notoriously not a browser's; it cannot adjudicate equal-specificity injection order or the pack-compound-selector loss described above. The thing the deny-list guards is exactly the thing this test cannot see. And the test renders a **synthetic twin** — the two *real* UMS wrappers are never imported by any test in this packet.
- **No forwardRef.** styled-components will pass a ref into the binding; a plain function component drops it with only a dev warning. `ApplyPaymentModal.footer` and `SessionDetailFooterActions` are precisely where autofocus-on-open and imperative `.focus()` live. If the GlowButton chain supported refs and the binding doesn't, this migration *regresses* ref behavior silently. Either grep-prove zero ref consumers among the 11 sites or add forwardRef — it's one line and has no cost.
- **Prop filtering:** styled injects more than `className` — including its `theme` prop and, with `.attrs`, arbitrary DOM intent. Your codemod's KNOWN set contains `theme` as a *Forge* prop (a variant string); a styled-components theme *object* colliding with that name is a `sw-btn--[object Object]` waiting for a ThemeProvider. The test has no negative assertions. Add: `expect(btn.className).not.toContain('[object')`, `expect(btn.getAttribute('theme')).toBeNull()`, and an attribute-whitelist check. Positive assertions only prove the happy path.

## 3. The two instruments — yes, both can still emit confident wrong verdicts

**reachability.mjs:** MISSING guards *input existence*, not *edge completeness*. The file exists (no MISSING), the graph is 3167 files (no refuse), and the verdict is confidently UNREACHABLE — if the subgraph is reached only via a vite `@/` alias (which `resolveImport`'s relative+extension walk cannot follow) or a dynamic `import()`/`React.lazy` route (spec extraction not shown to cover it). GolfSection is a positive control for **one import idiom**, not all of them. This tool drives Rule 77 quarantine; a lazy-routed page section reads as dead with full confidence. Demand: an alias table from vite config, dynamic-import extraction, and a lazy-route positive control before any quarantine proposal is allowed to cite this tool. Also: `resolve(p)` against cwd is tried **before** root — with two `scripts/` trees in this repo, an ambiguous relative path silently analyzes the wrong file. Explicit `<root>` should outrank ambient cwd.

**regen-backlog.mjs:** the third refusal is mis-designed. `if (/\| n\/a \|/.test(body) && !/\| (yes|NO) \|/.test(body))` only refuses when **zero** rows joined. Your own round-0 failure — a proven-dormant file tiered as a migration target — survives intact in partial form: 41 rows join, 1 row reads `n/a`, no refusal, the `n/a` row defaults to "migrate me," publishes. Refuse on **any** `| n/a |` row. `n/a` is never information; it's always a broken key.

**Is 'refuse' right everywhere?** For MISSING, zero-R4, and unjoined-rows: yes — "no data" must never render as a verdict. For the small-graph guard: acceptable but coarse. For **tag-legacy-hex.mjs: you didn't apply your own philosophy at all** — it *guesses* (line-end regex, backtick parity) where your other two instruments now *refuse*. That inconsistency is the tell.

## 4. tag-legacy-hex.mjs — the shipped bug class is still reachable

Three concrete wrong-form generators:

**(a) JSX text on a non-tag-terminated line → visible UI text** (the exact bug that already shipped):
```jsx
<td>
  Status colour #ef4444 retired
</td>
```
Line 2 ends with `retired` — matches neither `</Tag>` nor `/>` → `//` appended → **renders in the UI**, build passes.

**(b) Hex in an inline-style attribute where the line ends with an opening tag:**
```jsx
<div style={{ color: '#ef4444' }}>
```
Ends `}}>` — neither alternative matches → `//` → text child → visible.

**(c) Backtick parity poisoned above the line → `//` inside a CSS template:**
```js
const s = "a ` b";            // backtick in a double-quoted string — counted
export const B = styled(GlowButton)`
  color: #ef4444;             // parity now reads EVEN → "not in template"
`;
```
`//` lands **inside the CSS**, where it is not a comment; CSS error recovery skips to the next `;` and can eat the following declaration. Any odd number of backticks in quotes, regexes, or comments above the flagged line flips every subsequent verdict. `inTemplate` is byte-counting with no lexical context — the same class of instrument you just condemned in reachability.

Fix: only tag lines you can *positively* classify (real parse, or provably statement-terminal plain JS); **refuse** everything else. You built the refusal muscle this PR; use it here. (Nit: you strip `\r` on tagged lines only — mixed line endings on CRLF files; and `HERE` hand-rolls drive-letter handling where `fileURLToPath` — which the parity test uses! — is correct and handles spaces/percent-encoding.)

## 5. The retraction and the authenticated limitation

**Retraction: legitimate and correct.** Migrating dead code to hit a number would have been the dishonest move; leaving `swan-theme-utils.tsx` for Rule 77 is right. One caveat that is not a formality: "HeroSection is UNREACHABLE" is a verdict from the instrument whose blind spots I just enumerated. If the shop route is lazy-loaded, the retraction's factual basis is a false UNREACHABLE. Not touching the file is safe either way — but do not let a quarantine *action* proceed on this graph without a route-config cross-check.

**The limitation: honest disclosure, insufficient mitigation — and it stops being acceptable given §1.** "Belongs to whoever next has an authenticated session" is an unowned ticket. If B1 resolves by reverting the gradient wrapper to GlowButton (rule honored), the limitation is tolerable *with* a filed receipt ticket carrying an owner and an expiry, exactly like your accent waiver. If a skin-fighting wrapper ships, then the one change in this slice that a computed-style receipt exists to catch is the one change you couldn't verify. That combination does not merge.

## 6. What this slice does NOT prove about the 11 files

- No real-browser cascade behavior (wrapper-class vs pack-compound precedence — jsdom cannot represent it).
- The two **real** wrappers are rendered by zero tests; the parity test exercises a synthetic replica.
- No evidence the 344 tests *cover* the 11 files — 344/344 with zero edits is only strong if the suite touches these paths; no coverage delta is shown.
- No ref/autofocus-consumer proof; no `as`-polymorphism check; no focus-order/a11y pass on payment modals; no behavior at authenticated data scale.
- The evidence block contradicts itself: commit says `vite build 20.9s`, evidence says `61s`; evidence says `drift-lint 0` while the same block says 42 R4 rows. Stale numbers in the proof section invite the question of which other numbers are stale.

---

# VERDICT: REVISE

**Blocking:**

1. **Resolve the value-position contradiction.** The diff ships `styled(ForgeButton)` for `LateCancelActionButton` whose template opens with `background: linear-gradient(135deg, #ef4444, #dc2626)` (file per packet list: `frontend/src/.../SessionDetailFooterActions.tsx`, at the `styled(` declaration) — a direct violation of this PR's own `SKIN_OWNED` rule, contradicting "both layout-only / 0 blocked / 0 residual." Either revert the wrapper to GlowButton and re-run the codemod with the rule active, or withdraw the rule and the claim. Both cannot stand.
2. **Same file/lines: the `swan-guard-allow-hex` tags reading "untouched by the Forge strangler" are false provenance** on a component the strangler rewired; SWA-206 must not absorb an R2 fight this PR created. Re-tag or revert with item 1.
3. **`packages/swan-forge/scripts/tag-legacy-hex.mjs`, `isJsx` line and `inTemplate`:** still emits renderable UI text for inputs (a) and (b) in §4 and corrupts CSS for (c). Convert to refuse-on-ambiguity (positively classified contexts only) or parse.
4. **`packages/swan-forge/scripts/regen-backlog.mjs`, the `if (/\| n\/a \|/…)` line:** refuse on **any** `n/a` row; the partial-join case republishes your round-0 failure.
5. **`packages/swan-forge/scripts/codemod-glowbutton.mjs`, `SKIN_OWNED` (~L47) and the `styled\(\s*GlowButton\s*\)` replace block (~L231):** fix nested-backtick truncation (truncated body currently *migrates*), add `line-height`/`width`-family/`inline-size`/`outline`/`text-shadow`/`filter`/`background-size|position`, and replace the deny-list with a layout-only allowlist plus skip-on-`${identifier}` — this mechanism is being blessed for T3.
6. **Conditional on 1:** if any skin-touching wrapper remains shipped, block merge on an authenticated computed-style receipt with a named owner; if reverted, file the receipt follow-up ticket (owner + expiry) in this PR.

**Nits (separate):** negative DOM/className assertions in the parity test (`not.toContain('[object')`, `theme` attribute absent, attribute whitelist); hard-coded `sw-pack-crystalline-swan` in the test; reachability should try `<root>` before cwd; `fileURLToPath` instead of hand-rolled `HERE`; CRLF preservation in the tagger; reconcile 20.9s/61s and `drift-lint 0`/42-R4 in the evidence block; add a dynamic-import/alias positive control to reachability before it cites Rule 77.

The instrument work in this PR is the best part of it — which is exactly why the packet shipping a diff that violates its own new rule, a tagger that still guesses, and a join-refusal that only fires on total failure cannot pass as-is. Fix the six; I'll re-run hostile.
