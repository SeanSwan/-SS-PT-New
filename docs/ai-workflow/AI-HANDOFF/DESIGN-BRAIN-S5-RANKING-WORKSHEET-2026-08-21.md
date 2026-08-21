# Design Brain S5 — Exemplar Ranking Worksheet (the one human step)

- **decision:** Sean's ranked win/fail/borderline verdicts become the exemplar vault, replacing doctrine adjectives as the system's definition of "good"
- **status:** open — awaiting Sean
- **supersedes:** none
- **Board:** SWA-185 · **Blueprint:** `panel-2026-08-20-design-brain/DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md` §S5

---

## Why this exists (30 seconds)

Every previous attempt to steer this system used words — "cinematic", "crystalline", "premium". A
generator resolves those into **glow and blur**, which is the slop we are trying to kill. The adjective
IS the failure pathway, so the loop now bans doctrine adjectives from generator prompts outright
(`bakeoff.mjs → DOCTRINE_ADJECTIVES`, test V11).

That leaves a hole: if "good" cannot be a word, it has to be **a picture**. This worksheet fills it.
Your verdicts become the positive bar the loop steers toward and the anchor set the S6 critic is
calibrated against.

**Until you rank, `awe_photo` surfaces fail loudly rather than invent a hero.** That is designed
behaviour, not a bug — verified by tests V6/V6b. Nothing is blocked meanwhile; `type_data` surfaces
(the storefront lane) run normally.

## What I need from you

**15–30 verdicts.** Not essays — a verdict and, where you can, one clause of *why*. The "why" is the
part that transfers; "win" alone tells the system nothing it can act on.

Reply in chat in this syntax, one per line:

```
<id> win|fail|borderline — <one clause on the signature moment, or what makes it fail>
```

Example:

```
N01 win — the numbers carry it; no card ever appears
B04 fail — the glow is doing the work instead of the composition
L02 borderline — right structure, the plate is generic stock
```

I convert those into vault sidecars (`vault/exemplars/swan/<verdict>/<id>.json`) and re-run the
validator. **Nothing is consumed until it carries `ranked_by: sean`** — a system-ranked exemplar is
the loop grading its own homework, which is how a taste loop learns to like its own slop
(`consumable()`, test V5).

## Candidates already in the repo

Rank any subset. **Skipping an item is a valid answer** — a thin vault of real verdicts beats a full
one of guesses.

### Group N — real SwanStudios pages (highest value: these are *pages*, which is what §S5 asks for)

`docs/nasm-calculator-research/` — 14 captures, desktop 1280 and mobile 375:

| id | file |
|---|---|
| N01 | `01-calorie-desktop-1280.png` |
| N02 | `02-1rm-desktop-1280.png` |
| N03 | `03-bodyfat-desktop-1280.png` |
| N04 | `04-bmi-desktop-1280.png` |
| N05 | `01-calorie-mobile-375.png` |
| N06 | `02-1rm-mobile-375.png` |
| N07 | `03-bodyfat-mobile-375.png` |
| N08 | `04-bmi-mobile-375.png` |

Also: `AI-Village-Documentation/Photo/mysite.png` (**N09**), `.../sidebar.png` (**N10**).

### Group L — this loop's own current output (the honest baseline)

`scripts/design-brain/loop/runs/<run-id>/screenshots/` — fold shots at 375 and 1440 from the
storefront and homepage briefs. **These are deliberately plain** — S5 materials and the S8 production
compiler are the beauty layers, and the handoff forbids prettying the render compiler ad hoc.

Rank these as **the current floor**, so the system can measure its own distance from your bar:

| id | file |
|---|---|
| L01 | latest storefront run · `1440-fold.png` |
| L02 | latest storefront run · `375-fold.png` |
| L03 | latest homepage-awe run · `1440-fold.png` |
| L04 | latest homepage-awe run · `375-fold.png` |

(`npm run brain:loop` and `npm run brain:loop:awe` regenerate these; the newest run dir is the one to open.)

### Group B — brand plates (plates, not pages — rank for *plate* quality)

`frontend/src/assets/`:

| id | file | | id | file |
|---|---|---|---|---|
| B01 | `crystal-swan.png` | | B07 | `abstract2.png` |
| B02 | `blue-swan.png` | | B08 | `swan-paint1.png` |
| B03 | `sap-swan.png` | | B09 | `swan-paint-3.png` |
| B04 | `abstract-swan.png` | | B10 | `swan-paint-4.png` |
| B05 | `abstract-swan2.png` | | B11 | `marble-texture.png` |
| B06 | `abstract-1.png` | | B12 | `canvas.png` |

### Group X — anything you bring

Paste a URL, drop a screenshot, or name a site. **A `fail` from outside SwanStudios is as useful as a
`win`** — the vault's `fail` lane is what the S6 critic gets calibrated against, and a known-bad
anchor is scarcer than a known-good one.

Licensing: exemplars are stored `first-party` or `licensed` only. `source: scraped` is refused by the
validator (test V3), so for an external page I record **your verdict and the signature-moment note**
and reference the source — I do not commit someone else's image into the repo.

## What happens after you reply

1. I write the sidecars and run `npm run brain:vault` (expects: defect-free, `consumable > 0`).
2. I flip `allow_fixture_exemplars` to `false` in `briefs/homepage-awe.json` — the fixture placeholders
   stop being consumable and the loop starts steering from your actual taste.
3. The four `source: fixture` placeholders stay only as validator test fixtures.
4. **ASPIRATIONAL(S5b)** — the blind-sort acceptance ("blind humans sort plates by anchor family ≥80%",
   blueprint §S5) becomes runnable at that point. It is **not implemented and not claimed** today,
   because it needs real anchors; faking it would certify a bar nothing has cleared.

## What this worksheet does NOT do

- It does **not** need the paid image bake-off. That harness is built and tested
  (`bakeoff.mjs`, tests V10–V14) but **refuses to spend without your explicit yes** and prints a
  worst-case estimate first (~$0.11 for 3 models × 10 briefs at the current measured unit cost).
  Ranking what already exists costs nothing and is the higher-value first move.
- It does **not** block any other slice. S6–S10 build against the vault's *schema*, which is done.
