# SwanStudios — Living World Site Generator (MASTER PROMPT v1)
**Authored 2026-07-17 by Claude, incorporating Kimi K3's three-review spec (rounds 1–3) + Sean's rulings (optics-not-creatures adopted, rainbows-as-light). Grounded on production main `96ac6bd3d`. Status: DRAFT — pending one Kimi hostile-review pass before use.**

> **HOW TO USE:** This document is the machine that designs the worlds — you don't design a world, you run this. Copy §0 + §1 + §4 + §5 + §6 ALWAYS, plus EXACTLY ONE of §2 (marketing sites) or §3 (in-app atmosphere), into your builder AI. Never paste both §2 and §3 — that is the one thing that breaks it. Paste the Series Ledger (§4) back on every run so the series has memory.

---

## §0 — MODE ROUTER (read first, obey the output guard)

**The FIRST line of your instruction to the builder MUST be exactly one of:**
- `MODE: WORLD-AS-SITE` → a self-contained cinematic PUBLIC marketing page (code). Use §1 + §2 + §4 + §5 + §6.
- `MODE: WORLD-AS-TOKENS` → an in-app atmosphere definition (data, no code). Use §1 + §3 + §4 + §5 + §6.

**OUTPUT GUARD:** Emit ONLY the declared mode's artifact. The other mode's schema must never appear in your output. If you find yourself writing code in TOKENS mode, or a JSON WorldScript in SITE mode, you have failed — stop and restart in the correct mode. The two modes share brand law (§1) and nothing else.

**Batch directive:** If the request names MULTIPLE worlds, run the §4 declare-first phase, then build in parallel — and never ask permission mid-run. If it names ONE world, build exactly one; do not spawn extras.

**Prompt version:** `swan-world-gen-v1`. Record this in every Series Ledger row you write.

---

## §1 — SHARED BRAND LAW (applies to BOTH modes — this is non-negotiable)

**The world: "Enchanted Apex: Crystalline Swan."** Dark-first. A frozen-enchanted-forest fused with a deep-ocean-luxury vault. Midnight-sapphire and obsidian surfaces, ice-cyan and wing-purple glow, gilded-gold as the rare luxury accent. It must feel like a *place you could live inside*, cut from crystal and deep water — never a template, never an "AI app."

**Palette tokens (use tokens-with-fallback, NEVER raw hex):**
- Surfaces: `var(--world-bg, #030712)`, `var(--world-panel, #0A0A0F)`
- Ice-cyan glow: `var(--ice-wing, #60C0F0)` · Wing-purple glow: `var(--wing-purple, #8B5CF6)` · Primary: `var(--accent-primary, #002060)`
- Luxury gold: `var(--world-accent, #C6A84B)` — see the 5% law below
- Text: `var(--world-text, #E0ECF4)`, muted `var(--world-muted, #94a3b8)`
- **BANNED FOREVER — the retired Galaxy-Swan palette:** `#0a0a1a`, `#00FFFF`, `#7851A9`. Match **case-insensitively and by computed value** — including 3-digit shorthand (`#0ff` ≡ `#00FFFF`) and `rgb()` / `oklch()` equivalents. If any value resolves to these, reject the world on sight.

**Typography:** Plus Jakarta Sans (headings/UI), Fira Code (data/numerals). **Cormorant Garamond Italic is DISPLAY-ONLY** — ≥32px, ≤7-word lines, never body copy (thin italic on dark sapphire at 16px is a contrast/readability kill). Set a type scale + spacing ramp; numerals are tabular figures set large — great numeral typesetting is the cheapest luxury signal there is.

### THE CRYSTALLINE TASTE BIBLE (taste as exclusion, ratio, and pairing — NOT a noun list)

**The Enchantment Ratio (the core law):** realism is the SUBSTRATE; each world adds **exactly ONE impossible phenomenon** as its signature. Nature rendered straight = a beautiful documentary = brand-generic. Realism + one impossible thing = Enchanted Apex. One. Not two. Never a pile.

**OPTICS, NOT CREATURES (Sean's ruling — load-bearing).** Render the natural world as **light, depth, refraction, caustics, particulate, and atmosphere — never as literal creature silhouettes.** A recognizable dolphin/whale/bird drifting behind content reads as clip-art and cheapens the whole system. Sean's subjects translate to light, and get *better* for it:
- **Whales / whale-song** → deep-ocean caustics + slow expanding light-rings (sonar rendered as light; the impossible thing = light moving at the speed of sound).
- **Rainbows (KEEP AS LIGHT — Sean explicit)** → a physically-motivated **dispersion caustic**: true spectral order red-outside → violet-inside, ~40–42° arc, radial luminance falloff, supernumerary softness, alpha-blended. NEVER a hard-edged conic-gradient stripe arc (that's the pride-flag-in-the-hero failure).
- **The SWAN** → the one figurative mark that belongs to the brand lives in the **Crystallize** moment (below), not the background.
- Forests/glaciers/nebulas/oceans/flowers/gems → gradients, facet refraction, fog bands, light-shafts, star/comet fields, chromatic sparkle. Optics.

**DO:** one impossible phenomenon per world · depth from layered translucency + one backdrop layer + a consistent top-left key light · glow reserved for the primary action and the Crystallize, nowhere else · references over adjectives (anchor each world to 2–3 concrete refs, e.g. Sugimoto seascapes, Zaha Hadid ice interiors, Planet Earth II color grades).

**GOLD ALLOWLIST (replaces "≤5%, measured" — a % nobody can verify is a % nobody obeys).** Gold (`--world-accent` / `#C6A84B`) may appear ONLY on: the PR numeral + its delta · hairline filigree ≤1px · the focus ring · at most ONE badge per scene. Nowhere else — no gold fills, gradients, backgrounds, or body text. (Optional verifier: a ~10-line debug pass that buckets painted pixels by computed color and flags gold beyond the allowlist.)

**DON'T (reject on sight — this is the kitsch line):** literal animals/creatures as scenery · stacking phenomena in one scene (glacier + rainbow + nebula + comet in one hero) · iridescent unicorn gradients · lens flare · star-bokeh soup · glass-on-glass · gold gradients or gold body text · hard-striped rainbows · uniform glow used as the only depth cue · anything that reads "AI fantasy wallpaper."

### THE CRYSTALLIZE (the signature moment — identical spec across every world)
When a real action completes (a workout logs, a plan saves), the message does NOT print text — it **transforms into a faceted crystalline record artifact** with the big number front and center. State machine: `pending → forming → formed → resting`. Facet geometry: crystalline polygon (SVG/CSS clip-path, no bitmap). Motion: FLIP transform+opacity only, ~400ms, one pass, then still. Numerals: tabular, large. On a personal record: a one-time gilded-gold facet-bloom + the delta ("+10 lb PR"). **Reduced-motion: instant facet-swap, no morph.** The swan appears here as a faceted swan crystallizing — once, above content, reduced-safe. Specced ONCE, reused everywhere — that's what makes it an ownable signature instead of 25 different effects.

### CTA / CONVERSION DOCTRINE (a story that ends in a footer is a failure)
**Dual-Button Glow:** primary = blue background → wing-purple glow (`--wing-purple`); secondary = purple background → ice-cyan glow (`--ice-wing`). **Per-world contrast (required, correct metric):** label vs button fill ≥ **4.5:1** (text ratio); button boundary vs the actual adjacent scene ≥ **3:1** (WCAG 1.4.11 non-text); a glow may count at its 50%-alpha contour. If 3:1 is unreachable by glow intensity on that scene, add a **1px solid ice/wing border** — never change hue. Every world names the ONE offer it sells and its handoff point (booking / store / signup); the scroll-story's final act hands to that CTA. 44px+ targets. Deep links carry the offer context (trainer preselected / SKU / UTM grammar) — no gorgeous dead ends.

### COPY VOICE (premium is 50% words)
Headlines are specific and human, never "Unleash Your Potential" template filler. Banned lexicon (hard lint in Pass 2): say **"stretching" / "flexibility,"** never yoga/meditation; **"26+ years / NASM-protocol,"** never "NASM-certified"; charts are **Victory** only. Zero real client PII anywhere (IDs/roles only). The premium signal is the founder's real expertise, rendered with restraint.

---

## §2 — MODE: WORLD-AS-SITE (cinematic public marketing page — CODE)

**You are building one self-contained, alive, scroll-narrative marketing page** (home / about / store class). Get out of your own way — your taste is the point — but stay inside §1 law and the gates below.

**Stack:** output is a **single self-contained HTML file, vanilla ES modules** (scene-per-file allowed as ES-module imports). The "one styled-components exception" and "Victory-only charts" from §1 apply ONLY when the scene set is authored inside the React app; a standalone marketing file uses no framework.

**Site token contract (enumerate — never reuse the in-app `--world-*` names):** `--site-bg:#030712 · --site-panel:#0A0A0F · --site-primary:#002060 · --site-ice:#60C0F0 · --site-wing:#8B5CF6 · --site-gold:#C6A84B · --site-text:#E0ECF4 · --site-muted:#94a3b8 · --site-focus:var(--site-gold)`. Dual-Button Glow uses `--site-wing` (primary glow) / `--site-ice` (secondary glow). The in-app `--world-*` / `--ice-wing` / `--wing-purple` names must never appear in site code.

**Alive on code alone (no video-gen today).** Seedance is unavailable now, so make it live with CSS/SVG/canvas/WebGL, scroll-linked animation, and parallax. Leave a **Seedance video slot** for later: a fixed-aspect container with a poster fallback, autoplay policy (muted + playsinline + IntersectionObserver-gated), and `reduced-motion = poster`. A dead div that breaks layout when filled is a failure.

**Story grammar (top→bottom narrative):** an act structure (arrival → immersion → the one impossible phenomenon → proof/offer → handoff), a scene-count band of 4–7 scenes, each scene in its own file (`scene-per-file`, ≤300 lines/file). **Scroll progress is the narrative clock.**

**Reactivity — and it MUST work on touch (the phone decides if "cinematic" is a category win):** scroll progress + scroll-velocity response + tap-ripple + orientation-gated parallax. Pointer-proximity is desktop-only enrichment, never the sole channel. Coarse-pointer gets a real reactive story, not a screensaver.

**Motion system:** named easings, a duration scale (150–250ms micro, 350–500ms scene), a stagger law, **≤3 simultaneous motion layers**. Transform/opacity only; ban animated `filter`/`backdrop-filter` (fake bloom with pre-baked radial gradients). **Native scroll only — no scroll-jacking: Space/PgDn/arrow keys KEEP their native scroll behavior; scene navigation is via skip-links, landmarks, and focus order ONLY — never intercept scroll keys to snap scenes** (that is hijacking and breaks assistive tech). One `<h1>`.

**Performance budget (the gym-floor phone is real — exact numbers, not "a cap"):** scene units in `svh/dvh` (never bare `100vh`); **DPR ≤2 (≤1.5 low-tier); particles ≤150 (≤40 low-tier); sustain ≥30fps or auto-degrade a layer; ≤3 simultaneous motion layers.** Volumetric clouds are the single most expensive technique — budget by tier or omit on low tier. Asset pipeline: AVIF + `srcset` + lazy, so a cinematic page is not an 8MB download. **Dark-first bootstrap:** one tiny static inline `<style>` obsidian token block in `<head>` (the ONE allowed inline-style exception) so the page never white-flashes before the dark arrives — first paint IS the brand.

**A11y (enforced, not "honored"):** contrast ≥4.5 (text); 44px targets; focus-visible = a real border UNDER every glow + a gold facet focus ring (named token); no nested interactives (no `<button>` in `<a>`, no block-in-`<p>` — cheap models emit these constantly); **reduced-motion = a designed static storyboard** (all scenes pre-revealed, Crystallize swaps instantly), not `animation: none`. **Forced-colors mechanism (not an empty media query):** glows off; facet/decorative borders → `CanvasText`; the Crystallize facet keeps `forced-color-adjust: none` on the facet only.

**Output:** a self-contained page (or scene-per-file set) + a **share-card**: emit `og.svg`, but the `<meta property="og:image">` must point to a rasterized **`/og/<world-id>.png` (~1200×630 PNG/JPEG)** — include an explicit build-pipeline step that rasterizes the SVG to that PNG (SVG OG images unfurl broken everywhere; without the rasterize step the link preview ships broken or hot-linked). Deployment topology: state where it lives (route/subdomain) so the handoff grammar resolves.

---

## §3 — MODE: WORLD-AS-TOKENS (in-app atmosphere — DATA, no code)

**You are producing a valid WorldScript (JSON), NOT code.** This feeds the runtime `<WorldAtmosphere>` layer; it can never carry code, selectors, or URLs.

**Hard boundary:** token VALUES pass the existing allowlist — no `url()`, `;`, `{}`, backslash, angle-brackets. **Value typing:** COLOR values are oklch strings only (no hex); radius/spacing take `px`/`rem` strings; `--world-title-font` is one of the three brand stacks (Plus Jakarta Sans / Cormorant Garamond Italic / Fira Code). Fail-closed to Crystalline (below) on any invalid field. Deep-freeze on load. `promotion.status: "approved"` to be selectable.

**Palette in oklch (the §1 hexes converted — use these, not hex):** `--world-bg: oklch(0.13 0.02 260)` · `--world-panel: oklch(0.14 0.01 280)` · `--world-accent(gold): oklch(0.73 0.11 88)` · `--world-text: oklch(0.93 0.02 235)` · `--world-muted: oklch(0.68 0.03 250)` · `--world-action: oklch(0.30 0.13 265)` (primary CTA fill). (ice-cyan `oklch(0.76 0.11 235)` and wing-purple `oklch(0.62 0.20 292)` are app constants — see below, not world-fillable.)

**App-owned constants — never world-fillable:** `--ice-wing`, `--wing-purple`, `--accent-primary` are owned by the app shell (a world cannot set them). `--world-action` IS the world's primary-CTA fill. The focus ring is chrome-owned, not a world token. Dual-Button Glow in-app therefore composes the app's fixed `--ice-wing`/`--wing-purple` with the world's `--world-action` — the world never redefines the glow hues.

**Canonical WorldScript — this IS the fail-closed Crystalline default (copy its shape; any invalid field falls back to THIS):**
```json
{
  "id": "crystalline-swan",
  "version": "1.0.0",
  "engine": ">=1.0",
  "seed": 7,
  "promotion": { "status": "approved" },
  "tokens": {
    "--world-bg": "oklch(0.13 0.02 260)", "--world-panel": "oklch(0.14 0.01 280)",
    "--world-accent": "oklch(0.73 0.11 88)", "--world-text": "oklch(0.93 0.02 235)",
    "--world-muted": "oklch(0.68 0.03 250)", "--world-action": "oklch(0.30 0.13 265)",
    "--world-radius": "12px", "--world-panel-radius": "16px",
    "--world-title-font": "'Plus Jakarta Sans', sans-serif", "--world-letter-spacing": "0.16px"
  },
  "atmosphere": [
    { "type": "base-gradient", "params": { "from": "oklch(0.13 0.02 260)", "to": "oklch(0.10 0.02 275)" }, "reduced": "static" },
    { "type": "facet", "params": { "opacity": 0.08, "scale": 1.0 }, "reduced": "static" },
    { "type": "edge-glow", "params": { "color": "oklch(0.76 0.11 235)", "intensity": 0.06 }, "reduced": "static" }
  ],
  "a11y": { "pairs": [["--world-text", "--world-bg"], ["--world-text", "--world-panel"]] }
}
```
Layer fields: `type` (from the closed set below), `params` (scalar keys only — never geometry/path data), `reduced: "static" | "off"`, optional per-layer `"engine"` (e.g. `">=2.0"`). Two distinct failure rules: **(a) unknown layer `type`** (not in the closed set) → skip THAT layer, keep the rest, log to the qa receipt; **(b) world-level `engine` newer than the runtime** → fail closed to this canonical default entirely; **(c) a layer's own `engine` newer than the runtime** → skip that one layer, keep the rest, log. Any bad token value → this default.

**The `--world-*` vocabulary you fill (11 generic, enumerated — do not invent names):** `--world-bg · --world-panel · --world-accent · --world-text · --world-muted · --world-action · --world-shadow · --world-radius · --world-panel-radius · --world-title-font · --world-letter-spacing`. (The workout-shaped `--world-row-columns/-row-radius/-dial-radius` are for dashboard surfaces, not new marketing worlds.) **Scoping:** these attach at the lens/world root, NEVER `:root` — a token world must not repaint app chrome (that violates the two-speed law).

**Atmosphere primitives (closed set — optics only, per §1; you may NOT invent a primitive):** `base-gradient · grain · facet · edge-glow · vignette · tint · particulate · caustics · light-shafts · aurora-ribbon · star-field · fog-band · chromatic-facet · ring-pulse · bloom`. Each layer: typed, scalar-parameterized (no geometry/path data — a creature is unauthorable by construction), with a `reduced: "static" | "off"` fallback. Add a `seed` integer (deterministic "place" — same on return).

**Two-speed / anti-distraction (mechanized, exact numbers):** atmosphere lives BEHIND content, never under tables/charts. Per-layer luminance delta vs base **ΔL ≤ 0.05** (OKLCH lightness); ambient drift period **≥ 20s**; particulate **≤ 10px/s**; opacity oscillation **Δ ≤ 0.03** (sub-perceptual); **`--world-text` over the worst-case composite** (atmosphere at its max-luminance point behind the min-approved panel alpha) must still hit **≥ 4.5:1**. `prefers-reduced-motion` / `data-motion-mode` is a HARD VETO (one-time triggers collapse to opacity-only ≤150ms, no transform). Precedence: `chrome < palette < lens < world < motion-veto`. (Detailed renderer contract lives in the World-Engine blueprint; your job is a conformant WorldScript, not the renderer.)

**`signaturePhenomenon`:** optional field; required by promotion policy for flagship worlds only (scarcity keeps a signature premium).

---

## §4 — THE SERIES LEDGER (paste this back on EVERY run — this is the series' memory)

Batch runs execute a **DECLARE-FIRST phase**: every world in the batch locks its row BEFORE any building starts (this kills the parallel-race that would otherwise spawn three nebula worlds). A row duplicating an existing **phenomenon** is rejected and re-declared. **Motion-signature repeats:** no two *non-default* worlds share one; the default world (Crystalline Swan) is exempt and uses minimal parallax. **First run (no ledger pasted back):** initialize with the header row only and say so explicitly — NEVER invent prior worlds or founder verdicts (fake memory is worse than none). Founder verdicts append as one-line notes so taste compounds run-over-run.

```
WORLD REGISTRY  (persist across runs — paste back into each invocation)
| world-id | ONE phenomenon | palette ratio | motion signature | type mood | refs | offer → handoff | prompt-v | founder verdict |
|----------|----------------|---------------|------------------|-----------|------|-----------------|----------|-----------------|
```
- **motion signature** ∈ {parallax-led · shader-led · particle-led · typographic-led} — no two worlds repeat it.
- **founder verdict** example: `KEEP: facet timing · KILL: bokeh density` — appended, never overwritten.

---

## §5 — THE THREE ITERATION PASSES (rubric-scoped — a pass against nothing is theater)
1. **Pass 1 — Structure & Story:** act structure present, scene-count in band, one impossible phenomenon (not zero, not two), offer + handoff wired.
2. **Pass 2 — Craft:** spacing rhythm, contrast pairs, motion discipline, the Taste Bible (gold %, kill-list, rainbow physics), the **copy-voice + banned-lexicon lint**.
3. **Pass 3 — Proof:** device matrix 320→3840 (coarse-pointer parallax gating, ultrawide gutters), reduced-motion storyboard, and the full a11y/safety gate re-validated (contrast, 44px, focus-visible, forced-colors, no nested interactives; TOKENS-mode: allowlist + fail-closed + composite-contrast).

---

## §6 — KILL-CHECK (run this as the LAST thing before you output — recency is where weak models obey)
Before emitting, confirm ALL, or fix and re-check:
- [ ] Correct MODE only; the other mode's schema is absent from output.
- [ ] Retired Galaxy-Swan palette absent — checked case-insensitively + by computed value (incl. `#0ff` shorthand, `rgb()`, `oklch()`).
- [ ] EXACTLY ONE impossible phenomenon. No literal creatures. Rainbow (if any) is real dispersion physics, not stripes.
- [ ] Gold only on the allowlist (PR numeral+delta, ≤1px filigree, focus ring, ≤1 badge/scene) — nowhere else.
- [ ] Every CTA: label vs fill ≥4.5:1, boundary vs scene ≥3:1 (1px border if unreachable); Dual-Button Glow hues correct.
- [ ] Banned lexicon absent (no yoga/meditation; "NASM-protocol" not "NASM-certified"). Victory-only charts. Zero PII.
- [ ] Reduced-motion is a designed static form (incl. one-time triggers → opacity-only ≤150ms), not disabled motion.
- [ ] Ledger row written (`prompt-v: swan-world-gen-v1`); phenomenon unique; motion-signature unique among non-default worlds.

---

## §7 — FIRST-WORLD MENU (5 concepts to generate first — each names its ONE impossible phenomenon, optics-only)
1. **Glacier Cathedral** — descend through cut-ice naves. *Impossible phenomenon:* light refracting through the glacier into impossible interior spectra (dispersion caustic). Motion: parallax-led. Mood: sacred, vast, cold-luxury.
2. **Deep-Ocean Whale-Song Vault** — the brand's baseline made a place. *Impossible phenomenon:* sonar rendered as expanding light-rings (light at the speed of sound) + caustics. Motion: shader-led. Mood: profound, still, luminous-dark. (Differentiate hard from default — this sits ON the substrate.)
3. **Nebula–Comet Observatory** — a crystalline vault open to deep space. *Impossible phenomenon:* a comet whose tail crystallizes into faceted light as it passes. Motion: particle-led. Mood: awe, cosmic, patient.
4. **Aurora Rainforest Dawn** — canopy mist and first light. *Impossible phenomenon:* a physically-correct dispersion rainbow forming in the mist as you scroll into dawn (Sean's kept-as-light rainbow). Motion: typographic-led (light writes the headline). Mood: alive, warm-cool, hopeful.
5. **Crystalline Swan (the default, shipped AS a world)** — even the default is designed. *Impossible phenomenon:* the faceted swan that crystallizes on action (the Crystallize as the world's soul). Motion: parallax-led, minimal. Mood: signature, calm, unmistakable.

Each degrades to zero-video today (all code/optics) and gains a Seedance video slot later.

---
*Draft v1. Next step: one Kimi K3 hostile-review pass on THIS prompt (feed it as the document under review); patch to dry; then it is runnable.*
