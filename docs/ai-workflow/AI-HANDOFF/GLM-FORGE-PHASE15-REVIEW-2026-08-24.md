# GLM Consult

**Model:** glm-5.3
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-phase15-packet.md
**Tokens:** 7697 in / 17097 out (reasoning: 13442) | total 24794
**Wall:** 307.4s

---

# GLM 5.3 — Wiring Gate Review, Phase 1.5 (`forge/phase-1` on `7521c5053`)

Frame: the architecture is right — self-scoped pack class, one-way generator, source-parsed parity, one-line-revert swap. The evidence is not. Two artifacts *inside this packet* (`motion: "0"` in the generated theme; `--sw-focus-shadow` absent from every shown token surface) suggest the wired CTA may ship visually and a11y-degraded, and the headline claim — "survives a real SC production surface" — is not proven by anything in the packet. Details by section.

---

## §1 The binding — token resolution under self-scoping

**What resolves, provably.** Every `--sw-*` the skin consumes that appears in `crystalline-swan.css` (visible via `forgeTheme.generated.ts` projection: colors, glows, borders, shadows 1/2, fonts, text-scale, motion) resolves on the button element itself, because `sw-pack-crystalline-swan` sits on the same node as `.sw-btn` (`ForgeButton.tsx`, className join). `::after` and the variant rules inherit from that node. Self-scoping is sound; no dependency on ancestors or app-entry for the semantic tier.

**What does NOT provably resolve — two live holes:**

1. **`--sw-focus-shadow`** — consumed at `css/button.css` `.sw-btn:focus-visible { box-shadow: var(--sw-focus-shadow); }` and again as the first layer of the `:focus-visible:hover` compound rule. It appears nowhere in the generated theme. That is *consistent with* it being a `var()`-composite (the generator filters those: `generate-sc-theme.mjs`, `if (value.includes('var(')) continue;`), but "consistent with" is not a receipt. If it's undefined on the button, the declaration is guaranteed-invalid at computed-value time → **no keyboard focus ring, and the entire focus-hover glow compound rule dies with it**. The parity test never touches this token.
2. **`--sw-ease`** — consumed in every `transition` in `.sw-btn`. Same status: absent from the projection, unverified. Undefined ⇒ every transition declaration invalid ⇒ no transitions at all. (Currently moot only because of §2's motion finding, which is itself a bug.)

**Primitives.** `--sw-p-target-min`, `--sw-p-space-*`, `--sw-p-radius-md`, durations, text sizes all resolve at `:root` from `primitive.css` — which the packet does not include. I cannot verify a single primitive value, including the one the 44px claim rests on (§2). Demand `primitive.css` in evidence or a computed-style receipt.

**Cascade vs the SC surface.** Styled-components injects at runtime, appended after all Vite build CSS — SC wins every tie on order. The invariant you're actually relying on is *specificity, not order*: `.sw-btn` (0,1,0) beats element-level resets (`button { background: none; }`, normalize-style globals) regardless of injection order. It loses to any SC rule ≥ (0,1,1) touching the button (e.g., a `.wrapper button` descendant selector in a `createGlobalStyle`). No such rule is shown, but no audit receipt rules it out either. One pass over the SC global sheet, cited, closes this. Longer term, `@layer` would convert this from an invariant-you-hope to an invariant-you-own.

**Minor binding defect:** `ForgeButton.tsx` cherry-picks five keys off `attrs` (`type`, `disabled`, `aria-disabled`, `aria-busy`, `data-variant`). When the core grows `aria-expanded`, `role`, anything — the binding silently drops it; there is no exhaustive-keys test. Spread the remainder or pin it with a type-level exhaustiveness check.

---

## §2 The swap — the 44px floor and the silent losses

**The 44px floor: conditionally guaranteed.** Old code forced it inline (`$style={{ minHeight: 44 }}`); new code relies on `css/button.css` `.sw-btn { min-block-size: var(--sw-p-target-min); }`. That is *stronger* than the old inline style (class-level, not per-call-site) **iff** `--sw-p-target-min ≥ 44px` in `primitive.css` — value not in packet, unverified. Box-sizing is safe both ways (content-box makes total height larger, never smaller; border-box pins it at 44). The inline `minWidth: 200` does override the skin's `min-inline-size` floor (inline origin beats author styles) — harmless here since 200 > 44, but note the asymmetry: the *inline* dimension floor is consumer-overridable, the block one is not. Nobody asserts either in a browser.

**The demonstrable silent loss — motion.** `forgeTheme.generated.ts` line `motion: "0"` means `crystalline-swan.css` ships `--sw-motion: 0`. With root untouched and the pack class as the only scope, that value stands in production on the wired CTA. Consequences, from the skin's own math: sheen `opacity: calc(1 * 0)` → **never renders**; hover `translateY(calc(-1px * 0))` → no lift; every transition duration × 0 → the glow box-shadow change is an instant snap. The button.css comment says motion-zeroing is for "reduced-motion/capture mode" — so either a capture-mode value leaked into the production pack, or the pack deliberately ships dead. Either way, the swap didn't just drop GlowButton niceties; it dropped *animation as a category*, and it's visible in this packet.

**The adjudicable-but-unadjudicated losses.** `animateOnRender`, `pulse`, `haptic`, `glowIntensity`, theme-context reads: GolfSection passes none of them, so runtime delta depends entirely on GlowButton's *defaults* — and GlowButton.tsx is not in the packet. I cannot rule out that `animateOnRender` defaulted on. Worse, since these props aren't in `ForgeButtonProps` and aren't destructured, any future swapped call site passing them flows through `...rest` onto the DOM node as junk attributes; TS flags it, but the binding should destructure-and-drop legacy props explicitly. Theme-context loss is doctrinally fine (pack = taste) but freezes that CTA against any SC theming — say so in the debt ledger, don't let it be silent.

---

## §3 The generator — single-source, drift, --check, allow-tags

**Single-source: yes, genuinely one-way.** Pack → TS, byte-exact `--check` (missing output file = drift = exit 2). Hand-edits to `forgeTheme.generated.ts` cannot survive a check run. The main residual risks are *adjacent* to the check:

- **Silent `var()` drops.** Composite tokens (`--sw-focus-shadow`, `--sw-ease`, any `color-mix` shadow) vanish from the JS projection with no trace. A pack edit converting `--sw-glow-a` to a composite silently deletes `glowA` from the theme — the only signal is a distant TS error in a future consumer, or nothing if unused. Emit composites in a separate raw-string export instead of dropping them; the drop also *caused* my §1 blind spot.
- **camelCase collisions.** `--sw-` + dash-case → camel has no uniqueness assert; two collapsing keys overwrite silently. One-line guard.
- **`--check` provenance.** The gates list shows it run manually in this environment ("generator --check OK"), and the header says "drift-checked in CI-class gates" — aspiration, not receipt. Wire it into the actual CI pipeline before Phase 2, or the single-source claim has no teeth.
- Cross-package write (`packages/swan-forge/scripts` → `frontend/src/styles`) is intentional and labeled; fine, just coupled to frontend's path.

**Allow-tags: acceptable pattern, currently a loophole.** The design idea is correct — the generator emits compliance, humans never tag. But the emitted comment is a *bearer token*: any dev can paste `// swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)` into any hand-written file and hex sails through, unless drift-lint restricts the tag to the generated path (and ideally byte-compares the file). The packet doesn't show that lint rule, and drift-lint ran report-only (63 R4 / 0 blocking, "first real run"). Verdict: pattern approved, enforcement unproven — must be path-pinned and in the blocking set before Phase 2.

---

## §4 The parity test — regex fragility and the honesty of the claim

**How the regex breaks** (`glowTheme`, ForgeButton.parity.test.tsx):

- `${variant}:\s*{([\s\S]*?)}` is non-greedy to the *first* `}` — any future nested block (`hover: { … }`) truncates the capture; mostly fails loud (field-not-found throw), which is the good failure.
- The dangerous direction: it matches the **first** `variant: {` anywhere in GlowButton.tsx — a second `primary:` in another table, a comment, or a type gives silent false-parity.
- `field:\s*"([^"]+)"` breaks on single quotes, template literals, numerics, or values refactored to constants. All fail loud.
- `packToken` takes the first `--sw-*: value;` occurrence; CSS last-wins, so a later override in the pack would let the test assert a superseded value.
- `__dirname` in an ESM test worked only because the vitest env shims it — fragile.

**What it does not prove — and this is the honesty question.** Vitest does not apply CSS by default; ForgeButton's three CSS imports are inert in jsdom, so even the token→rule linkage is unexercised. Nothing in the packet proves: that `.sw-btn` wins its cascade inside the real SC tree; that `--sw-p-target-min` = 44; that `--sw-focus-shadow`/`--sw-ease` resolve; that the sheen renders (it demonstrably *doesn't*, §2); that the mounted CTA on `/` looks like the GlowButton it replaced. Coverage is also narrower than the name: the "exact values" claim covers 4 gilded/primary/accent fields + 2 fills — **gilded and accent *text* colors, borders, radius, shadow, padding, sheen geometry are all unasserted**, and gilded text falls back to `--sw-text-primary`, not a parity-checked value.

**Honesty verdict:** the receipts are precisely worded (vitest 9/9, build OK, tsc-OOM disclosed — good), but the headline — "prove the component survives contact with a REAL styled-components production surface" — is an overclaim. What's proven: token-string equality for a subset, binding contract, build survival. What C2 asked for: survival in the rendered cascade. Those are different claims; only the first is discharged.

---

## §5 Push safety — file: dep, chunking, FOUC, rollback

- **`file:../packages/swan-forge` (frontend/package.json:77, in `dependencies` — correct).** The hazard: if Render's service root directory is `frontend/`, `../packages` doesn't exist in the build context → install fails at deploy time. Fail-closed at build, not runtime — but still a bricked pipeline on push night. Need a clean-checkout `npm ci` receipt on the deploy ref. Lockfile: every forge edit can invalidate the file: entry's integrity → `npm ci` fails until lockfile is regenerated; that's good drift protection only if the step is documented/scripted, otherwise it's a surprise trap. Also unverified: does `packages/swan-forge/package.json` have an `exports` map covering `/core/button`, `/tokens/*`, `/css/*`, and does it need a build step (file: deps don't reliably run `prepare`)? Build receipt implies it works locally; confirm on Render's installer.
- **CSS chunk placement — the P0.** "Forge CSS landed inside NewsletterSection chunk" is presence, not placement. If NewsletterSection lives in the same V4 lazy-route graph, the name is cosmetic and the CSS arrives with the route — fine. If NewsletterSection is its own dynamic import (or tier-gated — GolfSection takes `tier`), then GolfSection can render the CTA with **no `.sw-btn` rules loaded at all**: naked browser-default button on `/`, possibly persistently on tiers that drop the Newsletter. Verify in `dist/` which chunk-graph edge carries the `.sw-btn` CSS; if wrong, hoist the three `@swan/forge/*.css` imports to the app's global entry or pin with `manualChunks`. Add a build-time assertion (grep the route's CSS for `sw-btn`).
- **Order/FOUC.** Within a correct chunk, Vite loads CSS before chunk execution — no FOUC. Cross-stylesheet, SC runtime injection always lands after build CSS; see §1 (specificity is the contract). One more silent drift: `--sw-font-ui` = `"Sora"` — confirm the app actually loads Sora, else silent fallback stack.
- **Rollback.** Genuine: revert the GolfSection import/JSX (GolfSection.tsx:164–170) + two package.json/lockfile lines; ForgeButton and the generated theme stay inert. Small blast radius — but the drill is asserted, not demonstrated. One revert-deploy receipt.

---

## VERDICT: **REVISE**

The binding design, one-way generation, and swap mechanics are sound and reverting is cheap — this is not a REJECT. But the packet's central claim is unproven in-packet, and two in-packet artifacts show the live CTA is likely degraded (no animation at all; focus ring unverifiable). Do not advance to Phase 2 spend on this evidence.

**Ranked fixes:**

1. **[P0·infra]** Render install path: clean-checkout `npm ci` on the deploy ref proving `file:../packages/swan-forge` resolves (frontend/package.json:77); confirm `exports` map / no build step; document the lockfile-regen step for every forge change.
2. **[P0·build]** CSS chunk placement: prove the chunk carrying `.sw-btn` loads with the V4 route (not NewsletterSection's own dynamic edge); hoist or `manualChunks`-pin if not; add a dist grep assertion.
3. **[P1·visual]** `--sw-motion: 0` in crystalline-swan.css (evidence: `forgeTheme.generated.ts` `motion: "0"`) kills sheen, lift, and all transitions on the production CTA. Confirm intent; if capture-mode leakage, set 1 and regenerate.
4. **[P1·a11y]** Prove `--sw-focus-shadow` and `--sw-ease` resolve on the wired button (`css/button.css` `:focus-visible`, base transitions) — undefined ⇒ guaranteed-invalid ⇒ no keyboard ring and a dead focus-hover compound rule. One Playwright `getComputedStyle` check on `/`.
5. **[P1·honesty]** Add the missing C2 proof: one Playwright check on `/` asserting computed `min-height ≥ 44`, background `#1A1505`, focus-visible ring, class list; rename "taste-anchor parity (exact values)" → "token-subset parity" and add the unasserted fields (gilded/accent text, borders) or state the subset.
6. **[P2·test]** Harden the parity parser (AST via ts-morph, or anchor block boundaries + assert unique match); fix `packToken` first-match vs CSS last-wins; drop `__dirname` for `import.meta.url`.
7. **[P2·binding]** Spread remaining core attrs (or exhaustive-keys test) in `ForgeButton.tsx`; destructure-and-drop legacy props (`pulse`, `glowIntensity`, …) so they never leak through `...rest` to the DOM.
8. **[P2·generator]** Emit `var()`-composites in a separate raw export instead of silently dropping; assert camelCase uniqueness; drift-lint must path-pin `swan-guard-allow-hex` to the generated file (provenance, not bearer token); wire `--check` into actual CI.
9. **[R4·ledger]** Record accepted behavioral deltas for this CTA (animateOnRender/pulse/haptic/glowIntensity/SC-theme reads, GlowButton defaults attached) plus one rollback-deploy receipt.

Fixes 1–5 gate the push; 6–9 gate Phase 2.
