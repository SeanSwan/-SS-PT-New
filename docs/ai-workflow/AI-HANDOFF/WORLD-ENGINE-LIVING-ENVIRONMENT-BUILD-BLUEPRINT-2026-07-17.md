# BUILD BLUEPRINT — SwanStudios Living-Environment System (Kimi K3 vision → exact build spec)

**Author of the vision:** Kimi K3 (`moonshotai/kimi-k3`, review at `AI-Village-Documentation/gemini-consults/kimi-living-environment-2026-07-17.md`).
**Forged into a build package by:** Fable 5. **Builder:** Kimi ("keyme") / any senior builder — build EXACTLY this, make no design decisions the spec leaves open without flagging.
**Grounded on:** real `origin/main @ 96ac6bd3d` (fused `AppearanceProfile`, `--world-*` 14 vars × 39 surfaces, Appearance Studio, RecipeV2 safe layer, `SurfaceLensGate`, `ConsoleAtmosphere`). Input packet: `KIMI-LIVING-ENVIRONMENT-REVIEW-PACKET-2026-07-17.md`.

## 0. The thesis (do not lose this)
A "world" must be a **place, not a recolor.** 14 `--world-*` vars alone make `webb-deep-field` and `chrome-sovereign` indistinguishable except hue. The missing primitive is a **reusable, typed, CSS-only, fail-closed atmosphere layer stack** (`<WorldAtmosphere>`) — `ConsoleAtmosphere` generalized from one lens to the world axis. That single contract converts "18 skins" into "18 environments," delivers the docs-only M4 "page-as-place" tier at runtime, and **zones decoration out of the operator console by construction** (atmosphere lives behind/around content, never in it).

## 1. Architecture (how it composes)

```mermaid
flowchart TD
    User["User in Appearance Studio → World tab"] -->|"select worldId"| AP["AppearanceProfile\n{ paletteThemeId, styleLensId, motionMode, worldId }\n(worldId = NEW field)"]
    AP -->|"one Apply, committed as a unit"| Prov["StyleLensProvider + UniversalThemeProvider\n(existing reconciliation)"]
    Prov --> Attrs["html data-* attributes\ndata-theme · data-style-lens · data-motion-mode · data-world (NEW)"]

    subgraph Registry["World Registry (fail-closed, deep-frozen)"]
      WS["WorldScript (JSON, code-free)\nvalidateWorldScript → allowlist regex + registry cross-check\npromotion.status === 'approved'"]
    end
    AP -->|"resolve worldId"| Registry
    Registry -->|"unknown/invalid → Crystalline default"| Attrs

    WS -->|"recipe slots"| RV2["compileRecipe (existing RecipeV2)\n→ --world-* (14 vars) + --lens2-*"]
    WS -->|"atmosphere[] typed layers"| CW["compileWorld (NEW)\n→ --atmo-* scalars only"]

    RV2 -->|"14 --world-* vars"| Surfaces["39 production surfaces\nvia SurfaceLensGate / makeLensFrame\n(untouched — worlds compile DOWN to RecipeV2)"]
    CW --> WA["&lt;WorldAtmosphere&gt; (NEW, mounted once at app shell)\nfixed namespaced z-stack:\nbase-gradient → grain/facet → edge-glow/vignette → state-tint\naria-hidden · pointer-events:none · transform/opacity only"]

    State["App sets state attrs on html:\ndata-voice-state · data-daypart · data-streak"] -->|"CSS bindings (declarative)"| WA

    classDef new fill:#003080,stroke:#60C0F0,color:#E0ECF4;
    class AP,CW,WA,WS new;
```

**Precedence (namespace-isolated, conflict-proof):**
`Crystalline chrome  <  palette (data-theme)  <  lens (data-style-lens)  <  world  <  motion veto`
- A world may write **`--world-*` and `--atmo-*` ONLY** — never `--lens2-*`, never palette vars, never `--lens-*`.
- `data-motion-mode` + `prefers-reduced-motion` are a **HARD VETO** over any world motion (precedence, not negotiation).
- Worlds compile **down to** RecipeV2, so all 39 `SurfaceLensGate` surfaces keep working with zero changes.

## 2. The end-to-end FLOW (Sean's #1 priority)

```mermaid
flowchart LR
    Boot["1. BOOT: inline pre-paint script\nreads persisted {worldId, version}\nsets data-* + base bg BEFORE React\n(zero FOUE flash)"] --> Idle
    Idle["app running in the committed world"] --> Open["2. open Appearance Studio → World tab\nradiogroup of live miniature cards"]
    Open --> Hover["3. HOVER / arrow-key:\nephemeral live-stage apply on the REAL dashboard\nbehind the scrim (not in the panel)\nEsc reverts in 150ms"]
    Hover --> Apply["4. APPLY: commit palette+lens+motion+worldId\nas ONE AppearanceProfile\natmosphere crossfades 250ms · geometry SNAPS (never animates)"]
    Apply --> Persist["5. PERSIST {worldId, version} ONLY\n(not the full script — 8192 envelope)"]
    Persist --> Cross["6. CROSS-TAB: storage event → revalidate → atmosphere-only fade"]
    Cross --> React["7. STATE-REACT: app sets data-voice-state / data-daypart / data-streak\nCSS bindings tint atmosphere — no JS per surface"]
    React --> Idle

    Factory["8. GALLERY→REGISTRY bridge:\nworld-factory emits WorldScript + contrast receipt + thumbnail\n→ approval promotes → runtime reads registry only"] -.-> Open
```

## 3. The safe JSON WorldScript schema (the runtime input format — code-free by construction)

```jsonc
{
  "id": "webb-deep-field",           // string; registry-cross-checked, fail closed to Crystalline
  "version": 3,                      // integer; persisted with id
  "engine": ">=2.0",                 // semver range the runtime supports
  "family": "cosmos",               // world family (worlds.md 5 families)
  "compat": { "palettes": ["crystalline-swan"], "lenses": ["*"] },
  "recipe": { /* existing RecipeV2 six slots → --world-* ; existing allowlist regex applies */ },
  "atmosphere": [                    // typed layer primitives — rendered by runtime, NOT markup
    { "type": "base-gradient", "tokens": { "--atmo-base-a": "oklch(...)", "--atmo-base-b": "oklch(...)" } },
    { "type": "grain",   "opacity": 0.05, "scale": 1.4 },              // texture DESPITE url() ban
    { "type": "facet",   "opacity": 0.08, "scale": 1.0 },
    { "type": "edge-glow","tokens": { "--atmo-glow": "oklch(...)" },
      "motion": { "kind": "drift", "ms": 24000, "reduced": "static" } } // reduced REQUIRED, non-optional
  ],
  "bindings": [                      // state-reactive, declarative only
    { "source": "voice-state", "attr": "data-voice-state",
      "map": { "listening": { "--atmo-tint": "oklch(...)" } }, "transition": "opacity 300ms" }
  ],
  "surfaces": { "workout-planner": { "--world-panel": "oklch(...)" } }, // per-surface --world-* overrides
  "motionBudget": { "maxAnimatedLayers": 2 },
  "a11y": { "minContrast": 4.5, "pairs": [["--world-text","--world-panel"], ["--world-muted","--world-panel"]] }
}
```
**Allowed layer `type`s (typed primitives, closed set):** `base-gradient | grain | facet | edge-glow | vignette | tint`. Unknown type/source/id → fail closed to Crystalline.
**Validation (`validateWorldScript`, extends RecipeV2's regex):** token values pass the existing allowlist (no `url()`, `;`, `{}`, `\`, `<>`); `atmosphere[]` types ∈ closed set; every motion layer has a `reduced` fallback; `a11y.pairs` non-empty; `id`/`version` present; `compat` references known palettes/lenses. Deep-freeze on load. `promotion.status === 'approved'` to be selectable.

## 4. `<WorldAtmosphere>` contract (the one highest-impact build — clone `ConsoleAtmosphere.tsx`)
- Mounted **once** at the app shell, `position:fixed` full-viewport, `z-index` below all content, `aria-hidden`, `pointer-events:none`.
- Fixed layer stack in order: `base-gradient → grain/facet texture → edge-glow/vignette → state-tint`. Each is a typed primitive rendered by the runtime and driven by `--atmo-*` compiled from the script — **this is how texture exists despite the `url()` ban** (grain/facet are built-in SVG/canvas/gradient primitives parameterized by allowlisted scalars only).
- Transform/opacity only (GPU-safe). Per-layer `reduced: "static" | "off"`. Cover-sized transform-scaled layers (no fixed px → no banding at 2560/3840, no seams on tiled noise).
- Fail-closed: renders nothing distinctive unless `html[data-world='<approved id>']`. Every other state renders byte-identically (the ConsoleAtmosphere guarantee).
- **Ship Crystalline Swan itself as a world** with a crystalline facet/sheen layer, so even the default has a designed signature.

## 5. BUILD GATES (Kimi's implementation-fidelity attacks — each is a hard requirement + its test)
1. **CSS-time vars only.** Every `--world-*`/`--atmo-*`/`--lens2-*` consumption is `var(--x, <crystalline-fallback>)` inside the template literal — never `${p => p.theme.x}` (freezes at mount, breaks live switch across 39 surfaces). **Add a stylelint rule: a `var(--world-*/--lens2-*/--atmo-*)` without a Crystalline fallback = build error.**
2. **Boot script, no FOUE.** Inline pre-paint script sets `data-*` + base bg before React mounts. Test: first paint at 320px with a stored world is already world-correct.
3. **CI contrast RECEIPT MATRIX.** Build-time contrast across every approved `world × palette × lens` triple (extend `qa-report.json`), incl. Victory chart series ink on world-tinted panels. Build fails on any pair <4.5:1. Not a runtime prayer.
4. **Zoned decoration.** Atmosphere is a fixed layer stack behind/around content — structurally impossible under tables/charts/dense cards. `data-density` compaction + world `row-columns` clamp to 1 column at 320px.
5. **Dual-Button Glow survives worlds** — validate-time check mapping button-variant pairs per world (blue-bg→purple-glow / purple-bg→cyan-glow must hold).
6. **Focus rings pinned** to a Crystalline-safe token worlds cannot touch (ring vs world panel bg ≥ 3:1 always).
7. **Switcher a11y:** `role="radiogroup"`, roving tabindex, arrow traversal; the CARD is the radio, actions are SIBLINGS (no nested interactives); all targets ≥44px including under `data-density`; <768px = bottom sheet, not a squished dialog.
8. **Motion veto** is precedence, not negotiation; Apply-crossfade gated by reduced-motion.
9. **Persist `{worldId, version}` only** (8192 envelope can't hold a full script); resolve from registry at runtime. **`worldId` registry-cross-checked day one** (don't repeat the `paletteThemeId` non-empty-string gap).
10. **State-by-hue gets a redundant non-color cue** (WCAG 1.4.1). All atmosphere layers `aria-hidden` + `pointer-events:none`.
11. **File budget:** `worldScriptSchema` / `validateWorldScript` / `compileWorld` / `<WorldAtmosphere>` = 4 files, each <300 lines.
12. **Re-tokenize gallery imports:** the ~20 offline gallery worlds likely carry retired Galaxy-Swan DNA — re-tokenize to Crystalline fallbacks at import or reject. House voice on world names (strength/performance; "recovery" not "zen"; no yoga/meditation). Sean copy: "26+ years / NASM-protocol," never "NASM-certified."

## 6. ANTI-FEATURES (Kimi says build the opposite)
- **NOT per-route world switching** — an app that changes place as you navigate stops feeling like one place; spatial consistency IS the brand for an operator console. Do **state-reactive atmosphere** (the Aurora pattern generalized) instead.
- **NOT flat color-swatch previews** — render live miniatures of the user's actual dashboard in each world (Arc Spaces / launcher-tier), or it looks 2019.

## 7. BUILD ORDER — 3 slices, each with its acceptance test
1. **`worldId` seam + World tab** (S/M): add `worldId` to `AppearanceProfile` + registry + a World tab in the Appearance Studio. **Accept:** selecting a world re-themes all 39 gated surfaces; unknown `worldId` fails closed to Crystalline with zero visual change.
2. **`<WorldAtmosphere>` + two ported worlds** (M): the layer contract + port `webb-deep-field` and `chrome-sovereign` from the gallery to WorldScripts. **Accept:** the two are distinguishable in a 100ms static screenshot; `prefers-reduced-motion` renders static layers; axe clean.
3. **Live-stage preview + boot script + CI contrast matrix** (M). **Accept:** hover previews without committing; first paint at 320px with a stored world has no flash; receipt matrix green across every approved world×palette×lens triple or the build fails.

## 8. Competitive bar to clear (why this matters)
⌘K → "world" → arrow-key live preview → Enter (Raycast/Linear speed); live data miniatures (Arc Spaces); ambient state-reactivity day one (Whoop/Apple — time-of-day worlds, restrained streak-milestone accent bloom, admin system-health glance-tint); typed-CSS atmospheres (90% of shader feel at 5% cost, survives the allowlist); published contrast receipts as a trust/brand artifact.
