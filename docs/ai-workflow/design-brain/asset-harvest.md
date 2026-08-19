# Asset Harvest — the repo is the first plate

- **Date:** 2026-08-19 · **Author:** Claude Opus 5 · **Status:** CANONICAL (gate)
- **Standing:** subordinate to `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `design.md`. This introduces **no visual rules** — it is a process gate that runs *before* any design work, so the visual rules are applied to the real product instead of an imagined one.

---

## 1. The law

**Before any Swan design run — concept, skeleton, artboard, redesign, or polish — harvest the real product first. A design that could have been produced without opening the repo is disqualified.**

The `design` skill states this as its own step zero: *"Match the existing app pixel-perfectly — by default, without being asked… the user should NEVER have to say 'recreate our UI first'."* This file makes that enforceable for Swan, names the specific things to harvest, and records what it cost when it was skipped.

## 2. Why this exists — the 2026-08-19 front-page run

Eight front-page directions were produced, gated through six mechanical checks, dry-looped to CLEAN×2, rendered, and published. Every gate passed. The run was still wrong, in four ways that a single `ls` of `frontend/public/images/` would have prevented:

| What shipped in the mockups | What the shipped product actually has |
|---|---|
| A generic `<div>S</div>` monogram | `Logo.png` — a **low-poly crystalline swan**: triangulated facets, ice-white head → Ice Wing cyan body → Wing Purple wing tips, on a Midnight Sapphire disc |
| Four abstract gradient SVG "plates" invented as placeholders | **Ten finished parallax backgrounds** (16.6 MiB total) already in `frontend/public/images/parallax/` — cosmic swan-in-flight art, per section |
| Flat sections, zero parallax | Parallax implemented in **10 HomePage components** (`HeroSection`, `ArsenalSection`, `GolfSection`, `TestimonialsSection`, `HomeStyles`, `HeroOptics`, …) and **42 files across `frontend/src`** |
| Invented headline and CTAs | The real page copy, which Sean had already approved |

The copy failure was caught by Sean and fixed into a law (`copy-pack.json`, copy-is-material). The asset failure is the same class and gets the same treatment. **The gates could not catch any of it**, because every gate compared the artboards to each other or to their own declared fields. Nothing loaded the product. That is the same lesson the 2026-08-19 learning packet recorded — *validate against the contract, not the artifact* — with the contract here being the shipped app itself.

**The tell:** if a design run would have produced identical output against an empty repository, it never harvested.

## 3. The harvest — run before the first concept

Produce an **Asset Manifest** and put it in the run's artifacts. Six rows, each with a real path or an explicit `NONE FOUND (searched: <globs>)`:

1. **Brand marks** — logo files, favicons, wordmarks, app icons. Record the path, the pixel size, and the *geometric language* (see §4).
2. **Existing imagery** — hero backgrounds, section art, textures, plates, poster frames. Search `public/`, `assets/`, `static/`, and any R2/CDN reference in code.
3. **Motion already shipped** — grep the target surface for `parallax`, `scroll`, `transform`, `keyframes`, `IntersectionObserver`. A mockup that is *less* capable than the live page is a regression, not a redesign (§5).
4. **Video/media** — real files with real measurements (fps, duration, byte size, loop-seam behavior). Never specify a naive loop against unmeasured footage.
5. **Copy** — the approved words, verbatim, into the run's copy pack (copy-is-material law).
6. **Tokens** — the palette actually in use on that surface, resolved to values, from the theme/token source rather than memory.

**Validate every absence claim.** A `find` that returns nothing is not proof a file is missing — the glob is as likely to be wrong as the repo. During the run that produced this file, a `find -iname "swan-bg*"` "proved" the hero background was missing; the real file was `hero-swan-bg.png`, present at 1,771,771 bytes (1.69 MiB). List the containing directory before writing `NONE FOUND`. (See `feedback_validate_probe_before_absence_claim`.)

## 4. The brand mark is the design system

A logo is not a thing to place in a corner — it carries the geometric language every other element should speak. Read it, name its language, and extend that language rather than inventing a parallel one.

For Swan the mark is **low-poly / faceted**: flat triangular facets, each independently shaded, producing a crystalline gem read. That is the source of the theme's own name — *Enchanted Apex: Crystalline Swan* — and its palette maps directly onto the token set (Frost White head, Ice Wing body, Wing Purple wing tips, Midnight Sapphire field).

**So faceting is available as a page-wide language**: parallax layers as faceted planes, section dividers as facet seams, reveals that resolve from coarse facets to fine, silhouettes built from the same triangulation. A Swan surface that uses the crystalline mark but renders everything else in smooth gradients is speaking two languages at once.

**Open question for Sean, not for an agent to settle:** the shipped parallax art reads cyan-and-violet on near-black, which sits closer to the **retired** Galaxy-Swan palette (`#0a0a1a` / `#00FFFF` / `#7851A9`) than to Crystalline Swan. The retirement governs *tokens in code*; these are finished art assets on the live page. Whether to regrade the art toward Ice Wing / Wing Purple or to widen the palette for rendered imagery is Sean's call. Do not silently "fix" the assets to satisfy the token rule, and do not cite them as license to reintroduce retired tokens in code.

## 5. The regression check

Before presenting, compare the design against the surface it replaces on capability, not just looks:

- Does it keep the motion the live page already has (parallax, scroll-drive, reveals)?
- Does it keep the real brand mark, real imagery, real copy?
- Does it keep every section that carries product truth?

**A mockup that is prettier but does less is a downgrade wearing a redesign.** If a capability is deliberately dropped, say so in the artboard caption with the reason — an unexplained absence reads as an oversight, and usually is one.

## 6. Gate

A design run may not present to Sean until:

- [ ] Asset Manifest exists, all six rows filled, absences validated by directory listing
- [ ] Real brand mark is used, or its absence is deliberate and captioned
- [ ] Real imagery is used where it exists; invented placeholders are visibly tagged as placeholders
- [ ] Motion parity with the live surface is met, or each gap is captioned with its reason
- [ ] Copy comes from the copy pack; new lines carry the approval tag
- [ ] Regression check (§5) run and recorded

Placeholders remain legitimate — for something the product genuinely lacks. They are never a substitute for something it already has.

## 7. Related

- `qa-gates.md` — responsive/a11y/visual gates that run *after* this one
- `anti-patterns.md` — the banned list
- `adapters/claude-code.md` — the Claude Code harvest procedure (it can view images directly)
- `adapters/builders.md` — the shared build contract
