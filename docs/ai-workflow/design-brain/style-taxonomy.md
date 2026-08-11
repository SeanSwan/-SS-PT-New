# Style Taxonomy — the Image Forge's two-axis style vocabulary

- **Date:** 2026-08-11 · **Author:** Opus 5 · **Status:** CANONICAL (captured data) + DRAFT (Swan mapping)
- **Source:** `midlibrary.io/art-styles`, captured 2026-08-11 via rendered DOM. `[VERIFIED]` — counts are the site's own filter counts, read from the live page. WebFetch could not read this page (client-side rendered); Playwright could.
- **Why this exists:** Sean's ask — "all the choices that Midjourney has, I want those to be the options." This file is that option set, in a form the Image Forge can select from.

---

## The structural finding

Midlibrary is **not a flat list of styles.** It is a **two-axis matrix**, and that is the whole reason it works as a creative tool:

- **AXIS 1 — SOURCE**: *who or what made it.* 15 categories. Answers "whose hand is this?"
- **AXIS 2 — QUALITY**: *what it feels like.* 51 cross-cutting facets. Answers "what should it do to the viewer?"

Any style sits at an intersection. You navigate by **quality** when you know the feeling you want, and by **source** when you know the hand you want. Every entry ships a copy-ready prompt fragment.

**This is the architecture the Swan Image Forge must adopt.** The current generator has neither axis — it has one hardcoded 3-line string. Selecting on two axes is what turns "make a hero background" into a directed brief.

---

## AXIS 1 — SOURCE categories (15) · ~5,525 styles total

| Category | Count | Slug | Swan use |
|---|---:|---|---|
| Painters | 1,546 | `/categories/painters` | Substrates, atmosphere, color relationships |
| Illustrators | 919 | `/categories/illustrators` | Iconography, editorial spot art |
| Photographers | 686 | `/categories/photographers` | **Primary for Swan** — realism-as-substrate (LAW 1) |
| Techniques | 393 | `/categories/techniques` | Material/process language — surfaces, print, craft |
| Genres | 312 | `/categories/genres-art-movements` | Art movements — era anchoring |
| Various | 309 | `/categories/various-artists` | Cross-discipline, conceptual |
| Titles | 301 | `/categories/titles` | Named works/franchises |
| Sculptors | 236 | `/categories/sculpture-installation` | Form, mass, dimensional language → 3D/WebGL |
| General | 175 | `/categories/general-modifiers` | GenMods — light, color, texture, composition |
| Designers | 165 | `/categories/designers` | Graphic/industrial systems |
| Fashion Designers | 135 | `/categories/fashion-designers` | Couture — the reference class product design ignores |
| Filmmakers | 118 | — | **Cinematic grammar** — directly feeds C13 scroll-journey |
| Architects | 107 | — | Space, structure, light — feeds parallax depth + 3D |
| Street Artists | 60 | — | Scale, boldness, texture |
| Printmakers | 43 | — | Tileable/repeatable → Super-Tiling backgrounds |

---

## AXIS 2 — QUALITY facets (51) · the "options for the eyes"

Counts = how many styles carry that quality. High counts are broad levers; low counts are precision instruments.

**Tonal / mood**
`Vivid 2303` · `Detailed 2067` · `Moody 1483` · `Subdued 1329` · `Dark 652` · `Dreamy 476` · `Expressive 465` · `Epic 194` · `Cute 177` · `Madness 155` · `Funny 98`

**Subject / content**
`Portraits 1646` · `Characters 911` · `Landscapes 989` · `Scenes 974` · `Urban 742` · `Floral 610` · `Animals 472` · `Still Life 115` · `Letters 62` · `Religious 48` · `Erotic 54` · `LGBTQ+ 38`

**Mark-making / technique** ← *the precision layer most people never touch*
`Fine lines 715` · `Broad brushstrokes 497` · `Painterly 393` · `Fine brushtrokes 151` · `Bold lines 81` · `Drawing 74`

**Form / structure** ← *the layer that matters most for abstract backgrounds*
`Geometric 550` · `Patterns 423` · `Abstract 483` · `Minimalist 131`

**Rendering register**
`Illustrative 506` · `Classical 478` · `Realistic 405` · `Surreal 683` · `Comics 158` · `Documentary 120`

**Color / light**
`BW 662` · `Pastel 197` · `Psychedelic 100` · `Bold 92` · `Light 59`

**Era / genre**
`Fantasy 258` · `Sci-fi 192` · `Cinematic 182` · `Motion 197` · `Retro 147` · `Baroque 91` · `Ethnic 274`

---

## Swan mapping — which facets are ON-LAW and which are BANNED

The taxonomy is a vocabulary, **not a license.** Router LAWS 1–4 still govern every selection.

### Preferred for Swan (serve LAW 1 "realism as substrate")
`Subdued` · `Moody` · `Dark` · `Fine lines` · `Geometric` · `Patterns` · `Abstract` · `Minimalist` · `BW` · `Cinematic` · `Realistic` · `Detailed`

Source categories: **Photographers** (substrate), **Architects** (depth/structure), **Printmakers** (tileability), **Filmmakers** (scroll-journey grammar), **Sculptors** (3D form).

### Requires justification
`Vivid` · `Epic` · `Surreal` · `Dreamy` — each can tip a surface from "one impossible phenomenon" into AI-slop. Allowed only when the facet **is** the one phenomenon.

### BANNED outright (LAW 3 kill-list / LAW 4 optics-not-creatures)
- `Psychedelic` — this is the iridescent-unicorn-gradient failure mode by another name.
- `Animals` / `Characters` as *rendered subject* — LAW 4 forbids literal creature form. Permitted only as a **dark occluder** in a light field (the shipped About-page pattern), never a drawn silhouette.
- `Fantasy` when it reads as "AI fantasy wallpaper" — the named kill-list item.
- `Cute` · `Funny` · `Madness` — off-brand for a luxury training instrument.

---

## How the Forge selects (the two-axis pick)

```
1. Pick the JOB          → what this image does on the page
2. Pick 1-3 QUALITY facets → the feeling (Axis 2). Check against the ban list above.
3. Pick 1 SOURCE category  → whose hand (Axis 1)
4. Name the artist + THEIR MEDIUM  → personification formula:
      "[Artist]'s [their actual medium] depicting [subject]"
      NOT "[subject] by [Artist]" — the weak form.
5. Fill remaining slots     → optics, light, palette, material, abstraction, negative, output
```

Cross-reference: the 12-slot prompt architecture and the full craft vocabulary (lenses, film stocks, lighting, `--chaos` semantics, SREF weighting, Super-Tiling) live in the Image Forge spec. This file supplies **slots 4 and 5** — style anchor and composition register.

---

## Honest limits

- Counts and category names are `[VERIFIED]` from the live page on 2026-08-11. They will drift as the library grows.
- Individual style *names* are NOT captured here — ~5,525 entries is a corpus, not a doc. The Forge should query by axis and only pull specific names when a direction is chosen.
- Midlibrary is a **Midjourney** library. Style-name transfer to another image provider is `[HYPOTHESIS]` — artist/movement names generally transfer; MJ-specific parameters (`--sref`, `--tile`, `--chaos`, `--stylize`) do NOT and must be re-expressed as provider-native controls or as Swan Style Tokens.
- Nothing here overrides the router. On conflict: router LAWS > this vocabulary.
