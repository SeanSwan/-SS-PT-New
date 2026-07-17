# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-LIVING-ENVIRONMENT-REVIEW-PACKET-2026-07-17.md
**Seed:** (none)
**Tokens:** 2913 in / 9340 out · **Cost:** ~$0.1488 · **Wall:** 312.2s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW: Living-Environment System (Lens × Theme × World)

---

## (a) VERDICT

**SHIP-WITH-CHANGES.** The fusion seam is correct — `worldId` in `AppearanceProfile`, committed as one unit through the existing Appearance Studio, compiled through RecipeV2 into the `--world-*` namespace via `SurfaceLensGate`. That's the right architecture and I won't relitigate it. But as specced, a "world" is **14 CSS variables = a recolor, not a place**, and the whole feature dies if users try world #2, mutter "it's just a different color," and never open the Studio again.

---

## (b) DESIGN WEAKNESSES — most severe first

**1. Worlds have no depth primitive. Flat, depthless, template-feel — the exact disease Crystalline Swan exists to cure.**
`--world-{accent, bg, panel, radius, shadow, text…}` recolors and re-radii the same flat admin surfaces. `webb-deep-field` and `chrome-sovereign` will be indistinguishable in a blind screenshot test except for hue. The doc's own M4 "page-as-place" tier has **zero runtime primitive behind it** — Aurora is admitted to be "a CSS atmosphere LAYER, not a full 'world'." You are shipping 18 skins and calling them environments. This is the generic/template feel failure at the architecture level, and no amount of token tuning fixes it.

**2. The preview is a panel, and environments can't be evaluated in a panel.**
`AppearanceStudioPreview.tsx` previews inside the dialog. That's test-driving a car in the showroom. The current loop — open dialog → click tab → click swatch → read tiny preview → Apply → hope → revert if wrong — is 5+ clicks of blind commitment, sitting exactly on Sean's #1 priority (flow). Hovering a world must **ephemerally stage it behind the dialog** on the user's real dashboard; Apply must be optimistic with an atmosphere-only crossfade. Geometry (radius/spacing/row-columns) must **snap, never animate** — animating layout vars mid-apply is jank you can feel.

**3. Contrast is validated per-recipe, but worlds are a multiplicative matrix.**
18 worlds × N palettes × M lenses is a combinatorial contrast space. Validate-time gates on a single recipe against a single palette will ship illegible pairings — highest risk on `--world-muted` on `--world-panel`, and on **Victory chart ink** (39 surfaces consume these vars; series colors on a world-tinted panel will dip under 4.5:1 in dark worlds). You need a **build-time contrast receipt matrix** across the approved compatibility graph, in CI, extending the existing `qa-report.json` pattern — not a runtime prayer.

**4. No decoration budget, no zoning law.**
Trainer/admin dashboards are operator consoles. The doc says "avoid decoration that hurts the operator console" and then specifies no mechanism. Atmosphere must be **zoned**: behind content, at page edges, in chrome — never under tables, charts, or dense cards. This needs to be a structural constraint (fixed layer stack), not a guideline. Also: `data-density` compaction + world row-columns must clamp to 1 column at 320px.

**5. Boot restore will flash.** Persisted `style-lens-os:appearance-profile` + `swanstudios-theme` applied after first paint = a flash of default Crystalline snapping into the user's world (FOUE). A "living environment" that wakes up in the wrong world every morning feels broken. Needs a pre-paint inline boot script setting `data-*` + background before React mounts. The doc's flow section never mentions boot. That's an absence.

**6. The `url()` ban silently kills texture.** RecipeV2's allowlist (correctly) bans `url()` — which means grain, noise, and facet textures **cannot come from world data at all**. If nobody notices this, worlds ship flat by construction. Textures must be **runtime-built-in layer primitives** parameterized only by allowlisted scalars (opacity, scale, duration). This is a schema-design forcing function, not a bug — but the packet doesn't surface it.

**7. Per-route world switching is an anti-feature.** An app that changes place as you navigate stops feeling like one place. For an operator console, spatial consistency *is* the brand. Do **state-reactive atmosphere** (the Aurora pattern, generalized) instead. I'm flagging this because Q3 invites it and the right answer is "don't."

---

## (c) IMPLEMENTATION-FIDELITY ATTACKS

- **styled-components correctness:** every `--world-*` consumption must be **CSS-time** `var(--world-accent, #fallback)` inside the template literal — never `${p => p.theme.worldAccent}`, which freezes at mount and breaks live world switching across all 39 gated surfaces. Add a stylelint rule: `var(--world-*)` / `var(--lens2-*)` without a Crystalline fallback = build error. One missing fallback on one surface = unstyled UI on world switch.
- **Dual-Button Glow survives worlds?** World accent overrides can silently violate blue-bg→purple-glow / purple-bg→cyan-glow. This needs a validate-time check in the world script, mapping button-variant pairs per world.
- **Focus rings:** a world that recolors focus indicators can render keyboard focus invisible (ring vs. world panel bg < 3:1). Pin `focus-visible` rings to a Crystalline-safe token worlds cannot touch.
- **Switcher a11y:** worlds = `role="radiogroup"`, roving tabindex, arrow-key traversal; **no Preview-button-inside-selectable-card** (nested interactives — make the card the radio, actions siblings); all targets ≥44px **including under `data-density` compaction**; on <768px the Studio becomes a bottom sheet, not a squished dialog with overflowing tabs.
- **Motion:** `data-motion-mode` + `prefers-reduced-motion` are **hard vetoes** over any world motion request (precedence, not negotiation). Apply-crossfade gated. Every atmosphere layer requires a `reduced: "static" | "off"` fallback — non-optional field.
- **Responsive:** 2560/3840 will band on radial gradients and seam on tiled noise — cover-sized, transform-scaled layers only, no fixed-px dimensions. 320px: row-columns clamps to 1, dial-radius/letter-spacing need min/max clamps.
- **Atmosphere DOM:** all layers `aria-hidden` + `pointer-events:none` (extend the `ConsoleAtmosphere` contract); any state conveyed by hue gets a redundant non-color cue (WCAG 1.4.1).
- **Persistence envelope:** 8192 chars cannot hold a full world script with atmosphere + bindings. **Persist `{worldId, version}` only**; resolve from registry at runtime. And close the known gap on day one: `worldId` must be registry-cross-checked (fail closed to Crystalline) — don't repeat the `paletteThemeId` non-empty-string mistake.
- **File budget:** schema / validateWorldScript / compileWorld / `<WorldAtmosphere>` = four files, each <300 lines. `ConsoleAtmosphere.tsx` is the pattern to clone.

---

## (d) THE ONE HIGHEST-IMPACT CHANGE

**Build the World Atmosphere Layer Contract: a single `<WorldAtmosphere>` mounted once at the app shell — a fixed, namespaced z-stack of typed, declarative, CSS-only layer primitives driven by `html[data-world]` — so every world gets a signature depth moment and no world can ever touch a content surface.**

The stack: `base-gradient → grain/facet texture → edge-glow/vignette → state-tint`. Layers are typed primitives (`gradient`, `grain`, `facet`, `edge-glow`, `tint`) rendered by the runtime — which is how you get texture **despite** the `url()` ban — parameterized only by allowlisted tokens compiled to `--atmo-*`. Transform/opacity only; `reduced` fallback per layer; `aria-hidden`; pointer-events none. This is `ConsoleAtmosphere` generalized from one lens to the world axis. It converts "18 recolors" into "18 places" in a 100ms screenshot, it's the missing M4 primitive, and it zones decoration **out of the operator console by construction** — atmosphere lives behind and around content, never in it. Ship Crystalline Swan itself with a crystalline facet/sheen layer so even the default world has a designed signature.

The script it consumes (the safe JSON input format RecipeV2 validation extends to):

```json
{
  "id": "webb-deep-field", "version": 3, "engine": ">=2.0", "family": "cosmos",
  "compat": { "palettes": ["crystalline-swan"], "lenses": ["*"] },
  "recipe": { "/* RecipeV2 six slots → --world-* vars, existing allowlist regex */": null },
  "atmosphere": [
    { "type": "base-gradient", "tokens": { "--atmo-base-a": "oklch(...)", "--atmo-base-b": "oklch(...)" } },
    { "type": "grain", "opacity": 0.05, "scale": 1.4 },
    { "type": "edge-glow", "tokens": { "--atmo-glow": "oklch(...)" },
      "motion": { "kind": "drift", "ms": 24000, "reduced": "static" } }
  ],
  "bindings": [
    { "source": "voice-state", "attr": "data-voice-state",
      "map": { "listening": { "--atmo-tint": "oklch(...)" } },
      "transition": "opacity 300ms" }
  ],
  "surfaces": { "workout-planner": { "--world-panel": "oklch(...)" } },
  "motionBudget": { "maxAnimatedLayers": 2 },
  "a11y": { "minContrast": 4.5, "pairs": [["--world-text", "--world-panel"]] }
}
```

**Precedence (conflict-proof by namespace):** Crystalline chrome < palette (`data-theme`) < lens (`data-style-lens`) < world — which may write **`--world-*` and `--atmo-*` only, never `--lens2-*` or palette vars** < `data-motion-mode`/reduced-motion (hard veto). Unknown id/type/source → fail closed to Crystalline, reusing the existing regex + registry + `promotion.status==='approved'` gates. Worlds compile *down to* RecipeV2, so all 39 `SurfaceLensGate` surfaces keep working untouched.

**Resulting flow (Sean's #1):** 1) Boot: inline pre-paint script sets `data-*` from persisted `{worldId, version}` — zero flash. 2) Studio → World tab: radiogroup of live miniature cards. 3) Hover/arrow = ephemeral live-stage apply behind the scrim; Esc reverts in 150ms. 4) Apply commits palette+lens+motion+worldId as ONE `AppearanceProfile`; atmosphere crossfades 250ms, geometry snaps. 5) Persist id+version only. 6) Cross-tab: storage event → revalidate → atmosphere-only fade. 7) State-react: app sets `data-voice-state`/`data-daypart`/`data-streak` on `<html>`; CSS bindings do the rest. 8) Gallery→registry: factory emits script + contrast receipt + thumbnail; approval promotes; runtime reads registry only.

---

## (e) WHAT A DESIGN-SAVVY COMPETITOR OUT-BUILDS HERE

- **Switcher speed.** Raycast/Linear-tier: ⌘K → "world" → arrow-key live preview → Enter. If ours is click→dialog→tab→click→Apply, we've lost the interaction before aesthetics are even judged.
- **Live miniatures of YOUR data.** Arc Spaces / gaming launchers render the user's actual dashboard in each environment as the picker. Flat color swatches will look 2019.
- **Ambient state-reactivity shipped day one.** Whoop/Apple-tier: time-of-day worlds, a restrained accent bloom on streak milestones (atmosphere layer only, reduced-motion → static tint). Static worlds will feel dead by comparison. Highest-value targets: trainer console coaching presence (done — Aurora), client dashboard progress-proof moments, admin system-health tint (genuinely useful glanceable status).
- **Shader-grade atmospheres.** Their answer is WebGL; our answer is typed CSS primitives + `color-mix` + built-in grain/facet — 90% of the feel at 5% of the cost, and it survives our own allowlist.
- **Published contrast receipts as trust marketing.** The CI matrix isn't just QA; it's a brand artifact.

**House-rule sweep:** no Galaxy-Swan hex in the packet — but the ~20 gitignored gallery worlds were generated offline and almost certainly carry retired-palette DNA; re-tokenize to Crystalline fallbacks at import or I reject on sight. Vet the 18 world names for house voice — strength/performance language, "recovery" not "zen," zero yoga/meditation vocabulary. Any switcher copy referencing Sean: "26+ years / NASM-protocol," never "NASM-certified."

---

## BUILD ORDER — 3 slices

1. **`worldId` seam + World tab** (S/M): selecting a world re-themes all 39 gated surfaces; unknown `worldId` fails closed to Crystalline with zero visual change.
2. **`<WorldAtmosphere>` + two ported worlds** (M): `webb-deep-field` vs `chrome-sovereign` distinguishable in a 100ms static screenshot; `prefers-reduced-motion` renders static layers; axe clean.
3. **Live-stage preview + boot script + CI contrast matrix** (M): hover previews without committing; first paint at 320px with a stored world is already world-correct (no flash); receipt matrix green across every approved world×palette×lens triple or the build fails.
