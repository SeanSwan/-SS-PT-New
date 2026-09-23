# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-phase15-packet.md
**Seed:** (none)
**Tokens:** 7806 in / 5007 out · **Cost:** ~$0.0000 · **Wall:** 192.4s · **finish:** stop

---

# Swan Forge Phase 1.5 — WIRING GATE REVIEW (Ox Alpha)

## Verdict: **REVISE**

The binding is competent, the parity-test discipline (parse-from-source, never hand-copy) is genuinely good, and the surface choice is correct. But the packet's two headline claims — "pack is single source of truth" and "pixel-parity" — are both overstated, one deploy blocker is undisclosed, and there is an unresolved focus-ring risk sitting inside the very file that brags about protecting it. None of this requires redesign. All of it requires honesty and three concrete proofs before Phase 2 spend.

---

## (1) Self-scoped pack class vs. styled-components host

**What holds up.** Putting `sw-pack-crystalline-swan` on the button itself (ForgeButton.tsx:66) is the right call: pack custom properties resolve on the element where they're declared, pseudo-elements inherit them, and the skin's `--_bg`/`--_text` indirection (button.css:12–19) resolves correctly inside that scope. Any `--sw-*` value UniversalThemeContext or SS-PT globals plant at `:root` loses to the element-scoped declaration — closer scope always wins, cascade order irrelevant. Removal really is near-one-line.

**What breaks or is undisclosed:**

- **primitive.css is a global injection wearing a local costume.** ForgeButton.tsx:26 imports `@swan/forge/tokens/primitive.css` unconditionally. Whatever `:root`-level `--sw-p-*` tokens that file declares are now in the host app's global namespace. The header's claim "NO global data attribute, NO app-entry edits" (ForgeButton.tsx:11–13) is technically true and practically misleading — you've traded a data-attribute for a `:root` pollution vector. Disclose it, and confirm no `--sw-p-*` name collides with anything SS-PT already emits at `:root`.
- **Runtime-injected styled-components win ties.** styled-components injects `<style>` tags at the *end* of `<head>` at runtime; Vite's static CSS arrives earlier. Any SS-PT global rule with specificity ≥ `.sw-btn` (a compound class, an `.parent button` descendant rule — GlassCard or GolfSummaryCard descendant styling is exactly where this hides) will override the skin regardless of your cascade math. The packet contains **zero evidence anyone inspected computed styles on the wired CTA inside the real GolfSection tree**. The vitest suite renders ForgeButton naked in jsdom — jsdom doesn't even apply CSS. Your most dangerous failure mode is untested by construction.
- **`--sw-focus-shadow` is an unverified load-bearing token.** button.css:96 sets `box-shadow: var(--sw-focus-shadow)` with no fallback. The generated theme (forgeTheme.generated.ts) exposes `focusRing` but **no `focusShadow`** — so I cannot confirm the pack defines it. If it doesn't resolve under the self-scoped pack, that expression is invalid-at-computed-value-time → `box-shadow: none` → **keyboard focus indicator silently vanishes**, in the same file whose comments brag "hover glow must never erase the focus ring" (button.css:94–95). Prove it or put a fallback on it. This alone justifies REVISE.

## (2) Dropped minHeight and GlowButton extras

- **minHeight:44 — acceptable, contingent.** The skin carries `min-block-size: var(--sw-p-target-min)` (button.css:22), so the inline floor is redundant *if* `--sw-p-target-min` resolves to 44px. Nothing in the packet states the primitive's value. One assertion in the parity test (`packToken('--sw-p-target-min') === '44px'` or read from primitive.css) closes this. Until then it's an assumed invariant, not a proven one.
- **Silent regressions on a lead-gen CTA:** `animateOnRender`/`pulse` — GlowButton's attention-drawing entrance behavior is gone and **nothing in the commit message or packet lists it as an intentional delta**. On a conversion CTA that's a marketing-behavior change shipped as a "mechanical swap." Either restore, or write the delta down and get Sean's sign-off. `haptic` — mobile vibration feedback silently removed; minor, but disclose. `glowIntensity` — worse than lost: ForgeButton spreads `...rest` (ForgeButton.tsx:63) straight onto the `<button>`, so any future consumer passing `glowIntensity` gets a React unknown-prop warning and a junk DOM attribute. Stop spreading blind; strip known-GlowButton props explicitly.
- **theme-context non-response:** correct per my A5(iv) ruling — pack is the source, runtime theming of Forge components is out of contract. Not a regression; it's the design. Keep it.

## (3) The one-way generator — the single-source claim is currently fiction

This is the packet's biggest integrity problem.

- **Nothing consumes `forgeTheme.generated.ts`.** Read the entire diff: GolfSection imports ForgeButton (CSS path), nothing imports the generated module. Meanwhile UniversalThemeContext still exists and GlowButton still reads it. So today there are **two live sources** (pack for Forge, UTC for GlowButton) and one **dead artifact**. "THE PACK IS THE SINGLE SOURCE OF TRUTH" (generate-sc-theme.mjs:4–5) describes an end-state, not this state. The generator is a decorative artifact until a real SC consumer imports `forgeTheme`. Either wire one consumer in this phase or re-label the claim honestly: "generator proven, adoption pending."
- **`--check` gates nothing.** No CI workflow, no package.json script, no pre-commit hook references it anywhere in the packet. "drift-checked in CI-class gates" (forgeTheme.generated.ts:3) is a claim about infrastructure that isn't shown to exist. An unwired `--check` is a comment, not a gate. Wire it into CI on paths touching `tokens/packs/**` and the generated file, today.
- **Allow-tags: acceptable mechanism, open loophole.** Emitting `// swan-guard-allow-hex` from the generator is right — humans shouldn't hand-tag generated output. But if drift-lint matches the tag *string*, any developer can hand-write hex and paste the tag. Unless the guard verifies provenance (path allowlist for generated files, or verifying the file regenerates byte-identical), the tag is a self-service exemption stamp. Enforce by path, not by tag.

## (4) "Pixel-parity" — rejected as stated

The parity test (ForgeButton.parity.test.tsx:14–56) parses GlowButton **source** and compares token strings. That is **value parity**, full stop. What it cannot see:

- Layout metrics: padding, border-radius, font-weight/size, gap — `.sw-btn` defaults (button.css:21–35) are asserted nowhere against GlowButton's rendered geometry.
- Glow rendering: GlowButton's original glow implementation vs. `color-mix(in oklab …)` blends (button.css:41–46) — same input hexes, potentially different rendered output.
- The sheen sweep is a reimplementation, not a copy.
- Text colors for gilded/accent/success/danger are **never asserted** — only fills and glows (parity.test.tsx:29–49). Gilded's text token exists in button.css:76 with a fallback chain; if GlowButton's gilded text differed from `--sw-text-primary`, this test is green while the CTA renders wrong.

Calling this "pixel-parity" in an acceptance claim is exactly the kind of overclaim this gate exists to catch. Rename it value parity, add the missing text-color assertions, and add one Playwright computed-style (or screenshot) check against the wired `/contact` CTA before calling the surface proven.

## (5) Deploy safety

- **Lockfile: undisclosed, therefore blocking.** Adding `"@swan/forge": "file:../packages/swan-forge"` (frontend/package.json:76) invalidates the existing lockfile. The diff shows no lockfile change. If it wasn't regenerated and committed, Render's frozen-install build fails — or worse, resolves stale metadata. Confirm and show it.
- **`file:` resolution on Render:** verify `@swan/forge`'s package.json `exports`/`main` resolve to files that exist in a clean checkout (raw CSS + compiled-or-compilable core TS). If core/button ships TS, Vite must transpile it from the linked package — confirm that works in the Render build, not just locally.
- **CSS chunk placement:** ForgeButton's CSS imports ride the lazy HomePage.V4 chunk (main-routes.tsx:59–62) — correct scoping, no FOUC beyond normal lazy-chunk behavior. Fine.
- **Rollback honesty:** "one-line revert" is two files (GolfSection.tsx + package.json/lockfile). Trivial, but say it accurately.
- **tsc OOM:** disclosed, pre-existing, binding-scoped tsc green — accepted with the standing requirement that full-project tsc debt is tracked, not forgotten.

---

## Ranked fixes (blocking → advisory)

1. **Prove the focus ring resolves** under the self-scoped pack: assert `--sw-focus-shadow` (and `--sw-p-target-min: 44px`) exist in the emitted CSS graph — parity test or dist-CSS grep. (button.css:96, :22)
2. **Wire or demote the generator:** commit lockfile, add `--check` to CI on pack/generated paths, and either consume `forgeTheme` somewhere real this phase or re-label "single source of truth" as target-state. (generate-sc-theme.mjs, forgeTheme.generated.ts)
3. **Kill the "pixel-parity" claim:** rename to value parity; add gilded/accent/success/danger **text-color** assertions and one rendered computed-style check on the wired GolfSection CTA inside the real component tree.
4. **Document the behavioral delta:** animateOnRender/pulse/haptic listed as intentional losses with owner sign-off; stop blind-spreading `rest` onto the DOM. (ForgeButton.tsx:63)
5. **Enforce allow-tag provenance by path** in drift-lint, not by tag-string match. (generate-sc-theme.mjs:44–47)
6. Disclose primitive.css `:root` scope alongside the "no global edits" claim. (ForgeButton.tsx:26)

The engineering underneath is sound. Fix the claims to match the evidence, close the focus-ring question, and this clears the gate. As submitted, it doesn't.
