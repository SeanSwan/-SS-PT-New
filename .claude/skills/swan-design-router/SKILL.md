---
name: swan-design-router
description: >-
  The SwanStudios design brain and taste law. Load for ANY SwanStudios UI or
  front-end work — pages, components, dashboards, marketing surfaces, themes,
  motion, charts, generated assets, redesigns, or visual audits — and before
  writing any styled-component, choosing a color, or approving a pixel.
  Encodes the Enchantment Ratio, the gold allowlist, optics-not-creatures,
  the Crystallize signature moment, two-speed motion law, Dual-Button Glow
  protocol, world/lens token contract, build-exact / full-stack-real /
  reversible discipline, the responsive matrix, and the kill-list. This skill
  is the law; the reference docs are the library.
---

# SWAN DESIGN BRAIN

You are not decorating software. You are building a crystalline training
universe that happens to ship as a web app. Every surface either proves that
or betrays it.

**North star:** realism as substrate, exactly one impossible phenomenon per
surface, zero decoration without meaning. If a screen could pass for a
template screenshot, it fails.

> Adopted 2026-07-19 (Sean-confirmed) from KIMI-DESIGN-SKILL-REDO, hardened with
> 6 refinements proven across 7 shipped design-overhaul surfaces (lens, Dashboards,
> Store, Home, About, Video, Contact) + their cross-cutting review. Prior router
> version preserved at `SKILL.md.pre-redo`; its ideation gate + pattern library
> survive as the Appendix below.

---

## LAW 1 — The Enchantment Ratio

Every surface = **believable substrate + exactly ONE impossible phenomenon.**

- Substrate: physics-honest light, plausible depth, real material behavior.
  Nothing glows, floats, or drifts without cause.
- The ONE impossible phenomenon must be **load-bearing** — it encodes state
  or meaning (a PR, an executed action, a living world). Never confetti.
- Zero impossible phenomena → engineer-built. Reject.
- Two or more → AI slop. Reject.
- Taste is **exclusion, ratio, and pairing** — what you refuse, in what
  proportion, beside what. It is never a noun list of "premium" adjectives.

## LAW 2 — Gold is an allowlist, not a palette member

Gold renders ONLY as: (1) a PR numeral + its delta, (2) a filigree line ≤ 1px,
(3) a focus ring, (4) one badge per scene, maximum. Gold anywhere else is a
defect — not "used sparingly," **nowhere else.** Scarcity is the whole
mechanism: every unearned gold pixel devalues the PR bloom. (Shipped proof: gold
appeared only as the Store pedestal light + the Contact crystallize seam.)

## LAW 3 — Kill-list (reject on sight)

Iridescent unicorn gradients (incl. purple→cyan diagonal washes) · lens flare ·
star-bokeh soup / causeless particle fields · glass-on-glass (frosted on frosted) ·
"AI fantasy wallpaper" energy · literal creature silhouettes (LAW 4) · generic
dark-mode glassmorphism-plus-gradient (the #1 failure mode) · glow on everything
(glow is allocated, LAW 7). If you reach for one of these, stop — that is defaults
wearing a costume.

## LAW 4 — Optics, not creatures

Nature enters as **light behavior only**: refraction, caustics, dispersion,
interference, sonar rings. Never literal animal form.
- The system has no arbitrary-geometry primitive; a creature silhouette is
  therefore unauthorable. Do not add one.
- Rainbow = real dispersion physics (red outside, violet inside, ~40–42°
  antisolar). Never a striped arc.
- The swan lives in the Crystallize and nowhere else. Facets imply the bird; you
  never draw the bird. (Shipped proof: About's swan is a dark *occluder* in a
  caustic field — the swan is bent light, never a drawn silhouette.)

## LAW 5 — The Crystallize (the one ownable signature)

When a member **executes** (logs a set, finishes a workout, sets a PR), the action
condenses into a **faceted crystalline record artifact.** Spec once, reuse
everywhere:
- **States:** `pending → forming → formed → resting`
- **Motion:** FLIP/transform + opacity only, ~400ms
- **Numerals:** `font-variant-numeric: tabular-nums`, always
- **PR:** gold bloom on numeral + delta (allowlist slot 1)
- **Reduced motion:** instant swap, no transition
- Never invent a second celebration (no confetti, no badge rain). Everything
  records through the Crystallize. Consume the shipped `useCrystallizeTransition`
  / `CrystallizeOverlay` (no children) — do NOT re-time or re-implement it.
- **REFINEMENT 1 (reduced-motion is a JS concern, not just CSS):** framer-motion's
  JS-driven entrances are NOT stopped by the `@media (prefers-reduced-motion)`
  guard. Disable them in JS too — `initial={false}`, or seed state to the settled
  frame — so reduced-motion users get the designed static frame with no entrance.
  This was a load-bearing bug on every animated hero; the CSS guard alone is a lie.

## LAW 6 — Two-speed motion

| Surface class | Motion budget |
|---|---|
| PUBLIC (marketing, landing, scroll-story) | Cinematic, full enchantment budget |
| IN-APP (dashboards, tables, charts, tools) | Calm atmosphere. GPU-safe. Honors reduced-motion. **Never motion under data surfaces.** |

In-app distraction caps — mechanized, testable, not vibes: per-layer luminance
oscillation OKLCH ΔL ≤ 0.05 · drift cycle ≥ 20s · particulate ≤ 10px/s · opacity
oscillation Δ ≤ 0.03. A layer exceeding any cap is a bug. Canvas atmospheres pause
on IntersectionObserver offscreen AND `document.visibilitychange`, cap DPR ≤ 2,
never mount when inactive, and paint a low-res buffer upscaled (no per-pixel).

## LAW 7 — Dual-Button Glow protocol

Glow is **allocated per surface and re-validated every time** — never inherited.
Blue bg → wing-purple glow · purple bg → ice-cyan glow · label vs fill ≥ 4.5:1 ·
glow boundary vs scene ≥ 3:1 · boundary unreachable → add a 1px border, **never
change the hue.** Danger/destructive buttons: no glow, ever.

## LAW 8 — World/Lens token contract

Every surface binds to the Swan lens through tokens so the Appearance Studio can
switch palette + lens + world and re-skin everything with zero code change.
- Consume `--world-*` and `--lens-*`. Worlds are **data, not code** (a token map,
  not a branch in a component).
- **Fail-closed:** missing token → base Swan tokens. `var(--token, <crystalline
  fallback>)`; never a raw hex primary, never a Galaxy value in a fallback.
- **REFINEMENT 6 (consumer vs emitter boundary):** a design surface is a pure
  CONSUMER of `--world-*` — it READS them via a single `*.tokens.ts` bridge. It
  must NEVER emit/modify `--world-*` names, `SurfaceLensGate`, `makeLensFrame`, or
  `AppearanceProfile` — those belong to the World-Engine / Lane-A. (The 7-surface
  money-path audit confirmed the whole program is a pure consumer: 0 violations.)

## LAW 9 — Hard build rules (non-negotiable)

- **styled-components only.** No MUI, Tailwind, CSS modules, or inline `style={}`
  (the JSX `style=` ban hits framer too — route color via `theme`/`colorScale`
  props or CSS vars, never a `style={{}}` attribute).
- **Tokens-with-fallback; no raw hex** outside the ONE tokens/theme file per surface.
- **RETIRED Galaxy-Swan banned** (`#0a0a1a`, `#00FFFF`, `#7851A9`) — incl. inside
  `var()` fallbacks and disguised channel forms (`rgba(0,255,255,·)` etc.). Scan
  fallbacks, not just declarations.
- 300-line cap/file · 44px targets · WCAG AA · Victory-only charts · zero PII (IDs/roles).
- **REFINEMENT 2 (the proven reversibility scaffold — reuse it, don't reinvent):**
  a redesign ships as `<X>vNext` behind an `<X>Gate` = `React.lazy` + ErrorBoundary
  + an **rAF-retry** world-contract probe (poll a few frames for the `.<x>-shell`,
  then require `--world-accent` resolves + a `[data-style-lens-shell]` ancestor;
  **on retry exhaustion → fail closed to V-prev**). Its flag hook: runtime
  `/api/config/public-flags.<key>` present WINS (kill switch absolute — explicit
  `false` always closes; runtime-true is never beaten by the QA override);
  override/env only when runtime is absent; a non-200 or failed fetch → env (the
  override can NEVER bypass an unreachable kill switch). Add the flag key to
  `publicConfigRoutes.mjs`. Battle-tested across 6 gates + the cross-cutting review.

## LAW 10 — Content law

- "Stretching" / "flexibility" — never "yoga" / "meditation."
- "26+ years" / "NASM-protocol" / "NCEP-certified" — never the credential claim
  formed by joining `NASM` and `-certified`.
- **REFINEMENT 3:** assemble those fragments in the contract test and scan source including comments.
  Never write the joined form anywhere. Pre-commit secret-scans do not run vitest.

## LAW 11 — Anti-generic

The default failure is "engineer-built, not designed." Before code, write down:
(1) a **named visual direction** (one sentence), (2) **one signature moment**
(usually the Crystallize — else justify), (3) IA that narrates the **member's
journey**, not the component's capabilities. Nav labels, empty states, and section
order tell the story of a member getting stronger.

---

## Decision procedure — every UI task

**Step 0 — Classify:** NET-NEW / REDESIGN / AUDIT / ASSET.
**Step 0.5 — Forge-first (Rule 84):** does `@swan/forge` ship this class (see
`packages/swan-forge/README.md` inventory)? If yes → consume it via the binding in
`frontend/src/components/ui/forge/`; if it cannot serve the need → add the
`packages/swan-forge/EXCEPTIONS.md` row (owner + expiry) BEFORE building locally.
**Step 1 — Locate:** surface class (public vs in-app), route, data contract — real
API + model, or flag **NEW BACKEND**.
**Step 2 — Direction (Gate 0):** for NET-NEW pages + major redesigns, run the
**Ideation Gate** (Appendix) — 2-3 named concept directions, Sean steers. Small
polish skips it. If you cannot write the direction sentence + the ONE phenomenon +
the signature moment, do not build — ask.
**Step 3 — Bind:** world/lens tokens, palette slots, type scale, spacing. Confirm
zero kill-list material in the plan.
**Step 3.5 — Style Intelligence** (procedure + real taste-API contract:
`docs/ai-workflow/design-brain/style-intelligence.md`): runs when the task
composes a generative-media brief OR establishes a NEW visual direction not
inherited from a bound world/lens (a bind-inherited skip NAMES the bind's
identity in the receipt). Two-axis taxonomy pick with quoted mapping lines;
web anchors = facets + movement/era, never a named individual; taste ranks
lawful candidates under precedence law → bind → taxonomy → taste, floor ≥8
judgements/≥2 grids, fingerprint = `snapshot.sourceHash`. Emit the checkable
STYLE RECEIPT (sole input to Forge slot 4); re-run + supersede on direction
change. Taste evidence never overrides law.
**Step 4 — Blueprint:** BUILD-EXACT (below).
**Step 5 — Build, then pass Gates 1–3.**

### Task-type notes
- **REDESIGN:** name which LAW the current surface violates; ship as next-version
  component + flag (LAW 9 scaffold).
- **AUDIT:** findings cite laws, not taste: `[LAW n] violation — evidence — fix`.
  No "consider," no "maybe."
- **ASSET:** load `SWAN-ASSET-STORYBOARDING.md`; optics-not-creatures + two-speed
  bind generated media too. Step 3.5 is mandatory here — no Seedance/Forge brief
  ships without its STYLE RECEIPT.
- **Design generation via Kimi:** `consult-kimi.mjs --document <seed> --effort
  medium --max-tokens 26000` (REFINEMENT 5 — `--effort high` burns the budget on
  reasoning and returns EMPTY). RELATIVE paths only; serialize consults; a `*/`
  inside a JS block comment prematurely closes it.

## BUILD-EXACT blueprint format

A builder must make **zero decisions.** Specify: file paths + next-version names ·
styled-component names, props, token bindings with fallbacks · every state
(default/hover/focus/active/disabled/loading/empty/error/reduced-motion) · behavior
at each responsive row · copy verbatim (LAW 10) · exact API endpoint + model fields
(flag NEW BACKEND if absent) · feature flag name + kill path. If the builder can ask
a question, the blueprint is incomplete.

## FULL-STACK REAL & REVERSIBLE
No mocks/lorem/invented shapes — every datum traces to a named API + model. New
backend is additive only (new endpoints, nullable columns; no destructive
migrations, no renames). Next-version component + flag always; the old path
survives until the new one ships clean.

---

## Responsive matrix

| px | Role | Rules |
|---|---|---|
| 320 | Floor | Nothing breaks. No horizontal scroll. Minimums hold. |
| 375 / 414 | Primary phone | One column. 44px targets. Primary action in thumb reach. |
| 768 | Tablet | Two-column only where earned. Atmosphere reduced. |
| 1024 | Small desktop | Full nav. Data surfaces get air. |
| 1440 | Reference desktop | Design in-app surfaces here first. |
| 2560 | Wide | Content max-widths engage. No stretched soup. |
| 3840 | 4K | Type/atmosphere scale; max-widths hold; motion cost capped. |

Never changes at any width: contrast ratios, 44px targets, token discipline,
reduced-motion path (use `svh`/`dvh`, not `100vh`, for full-height mobile heroes).

---

## Gates

**Gate 0 — Direction (pre-code):** direction sentence? one impossible phenomenon?
signature moment? surface class? style anchor — from Step 3.5, or the Step-3
world/lens bind cited as the anchor? Missing any → stop.
**Gate 1 — Taste:** gold only in allowlist · kill-list scan zero hits · no creature
geometry · no raw hex / no Galaxy values (fallbacks scanned) · no glass-on-glass ·
where Step 3.5 ran: STYLE RECEIPT present, facets lawful, receipt still matches
the surviving direction.
**Gate 2 — Contrast & motion:** Dual-Button Glow revalidated on THIS surface ·
in-app layers within caps · reduced-motion path exists in JS (LAW 5 R1) · AA pass ·
one `<h1>` per page, decorative/duplicated text `aria-hidden`, `<main>` landmark
present, no nested interactives (one stretched link per card).
**Gate 3 — Ship:** builder made zero decisions · every datum → named API/model,
NEW BACKEND flagged · flag + next-version naming + additive backend · 300-line cap,
44px, zero PII, Victory-only · matrix spot-checked at 320/375/768/1440 · triangle
review (Codex hostile pass; **Gemini as design AUTHOR, not the gate** — REFINEMENT
4: reject any Gemini directive to delete the token bridge, remove the gate, or
hardcode `p.theme.colors.*` hex; CLAUDE.md Rule 46 + the shipped architecture win).

## World Engine fail-closed compatibility

- Deterministic selection uses the exact `world-roulette.v1` algorithm: normalize
  the UTF-8 seed to NFC, apply SHA-256 rejection sampling, and sort candidates by
  ASCII before recent-use, family-balance, and replay-receipt rules. Platform PRNG
  substitution is refused.
- Palette Law B is non-Swan: its output must never be branded or represented as a
  Swan product surface.
- Live M4 is refused on every product and Hermes operations surface.
- B0 semantic structure, navigation, and the primary action always survive every
  renderer failure; B1-B3 are progressive enhancement only.

---

## References — load on demand (this skill is the law; these are the library)

| Doc | Load when |
|---|---|
| `SWAN-CINEMATIC-DESIGN-SYSTEM.md` | Cinematic/public builds; deep palette + motion values |
| `SWAN-ASSET-STORYBOARDING.md` | Any generated/commissioned media |
| `docs/ai-workflow/design-brain/design.md` | The Crystalline Canon — **sole canonical copy** (the `design.html` mirror was retired 2026-08-16; no second file to reconcile). Still ADAPTS the two source-of-truth docs above — "sole" means one copy, not top of the precedence chain |
| `docs/ai-workflow/design-brain/style-intelligence.md` | Step 3.5 detail — the two-axis pick, real taste-API contract (`taste-snapshot/1` + `sourceHash`), evidence floor, receipt schema. Loads `style-taxonomy.md` + `taste-discovery-grill.md` + `forge-compiler-contract.md` from there |
| `design.md.pre-redo` / `SKILL.md.pre-redo` | Historical context only |

**Precedence on conflict:** this skill > reference docs > existing components >
library defaults. Old components are not precedent — most predate the law.

---

## Appendix — Ideation Gate + Pattern Library (preserved from the router)

**Ideation Gate (MANDATORY for net-new pages + major redesigns; skip for typo/
single-property/single-component-bug/explicitly-scoped-fix).** Before any
styled-components, produce 2-3 distinct concept directions in the thread; Sean
steers which becomes the implementation. Each concept:

```
=== CONCEPT DIRECTION [N] ===
NAME: [evocative — "Glacier Cathedral"]
WORLD ID: [stable id from worlds.md, or NONE for M0-M3 product work]
DIRECTION: [one sentence — mood, hierarchy, the ONE impossible phenomenon]
SIGNATURE MOMENT: [usually the Crystallize; else justify]
PALETTE LAW: [A Swan-native | B world-native non-Swan]
STYLE ANCHOR: [Step 3.5 pick — QUALITY facets + movement/era (taste codes may annotate, never replace); or the Step-3 world/lens bind cited as anchor]
KILL-LIST CHECK: [confirm zero LAW-3 material]
```

Mobbin MCP reference gate applies to net-new pages / major redesigns; see `docs/ai-workflow/design-brain/external-reference-mcp.md` and classify every call P/S/D/X; Inspect and legacy aliases are refused.
**P (Probe) is the only enabled mode and the default for a named surface.** There is no `I`/Inspect mode — it and every legacy letter are refused with `E_LEGACY_MODE_REFUSED` and are never privilege-mapped, so never name one in a plan, a receipt, or a sweep. S is ambiguous, capped, and disabled by default; D is Sean hand-edit only; X source-corpus intake is blocked absent exact clearance.
Mark [MOBBIN UNAVAILABLE] and proceed from Swan canon/accepted claims if absent; external references are research only and Swan source docs win.

**Pattern library:** the C1-C13 layout/interaction patterns live in
`SWAN-CINEMATIC-DESIGN-SYSTEM.md`; use them as the composition vocabulary. The
full pre-redo router (pre-task receipt template, C1-C13 detail, 2026 surface
standard) is preserved verbatim at `SKILL.md.pre-redo` for reference.

---

Hold the line: scarcity, physics, one miracle per screen.
