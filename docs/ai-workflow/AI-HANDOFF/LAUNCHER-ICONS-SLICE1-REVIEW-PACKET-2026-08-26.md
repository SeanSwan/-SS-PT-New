---
decision: "Hostile review of two things: the Swan launcher icon tooling that writes to the owner's Desktop, and the plan for slice 1 of the Taste Console (design tokens, profile spine, plate class)."
status: open
board: SWA-186
date: 2026-08-26
author: Opus 5 (VS Code terminal)
privacy: IDs and roles only. No PII, no keys.
---

# Hostile review packet — launcher icons + console slice 1

Two independent seats. Answer both parts. **Be hostile: your job is to find what breaks, what
was assumed, and what would embarrass us later — not to praise the design.** Then, separately,
name enhancements worth doing.

---

# PART A — the launcher icon tooling (shipped, running on the owner's machine)

## A1. Context

The owner has ~15 `.cmd` launchers on his Windows Desktop. A `.cmd` cannot carry an icon —
Windows draws the generic batch glyph and nothing inside the file overrides it. The icon must
live on a `.lnk` shortcut pointing at the `.cmd`. Two pre-existing launchers already followed
that pattern by hand; this generalises it.

Two files shipped:

**`swan_icon.py`** (Pillow only, no other runtime deps)
- `build` — draws a Swan mark procedurally: a tapered bezier-offset neck ribbon, a head circle,
  a short beak wedge, and a thin waterline ellipse, composited over a rounded-square "plate"
  (vertical navy gradient `#003080` → `#0A0A0F`, a soft sapphire bloom, an accent rim, a top sheen).
- `convert` — takes a PNG (e.g. ChatGPT-generated), pads non-square input to square, resizes to
  1024, writes the `.ico`.
- Both write sizes `16/20/24/32/40/48/64/96/128/256`. Small frames are produced by halving
  repeatedly with LANCZOS then a final resize, then `UnsharpMask(radius=0.7, percent=140–190,
  threshold=1)` for sizes ≤48.
- `--contact-sheet` renders all sizes on a grey ground for eyeballing the 16px result.
- `.ico` is written via Pillow: `frames[-1].save(out, format="ICO", sizes=[...], append_images=frames[:-1])`.

**`Set-SwanLauncher.ps1`** (Windows PowerShell, `WScript.Shell` COM)
- `-List` enumerates Desktop `.cmd` files and reports which already have a `.lnk` pointing at them.
  It builds the lookup by opening **every** Desktop `.lnk` and reading `TargetPath`.
- Build mode: resolves the `.cmd` (relative paths resolve against Desktop), generates or accepts
  an `.ico`, then sets on the shortcut: `TargetPath`, `WorkingDirectory` (parent of the `.cmd`),
  `IconLocation = "$Icon,0"`, `WindowStyle = 1`, `Description`.
- Writes the shortcut to `Desktop\<Name>.lnk` where `Name` defaults to the `.cmd` base name.
- Icon path defaults to `Desktop\Swan-Icons\<Name with non-alphanumerics stripped>.ico`.
- Finally runs `ie4uinit.exe -show` to invalidate the Windows icon cache.
- `$ErrorActionPreference = 'Stop'`.

## A2. Verified so far

Build mode; convert mode against a deliberately non-square 700×900 source; the missing-file
error path; `-List`; and reading the created shortcut back (target, working dir, icon all resolve
to files that exist; the `.ico` carries all ten sizes).

## A3. Attack it

Consider at minimum, and go beyond this list:

1. **The `.lnk` overwrite hazard.** `Name` defaults to the `.cmd` base name, so
   `Swan Guard.cmd` → `Swan Guard.lnk`. What if a `.lnk` of that name already exists pointing
   somewhere else entirely? What does `CreateShortcut` on an existing path do, and is the
   current behaviour safe? What should it do?
2. **Icon filename collision.** The icon name strips non-alphanumerics:
   `Swan Experiment 1 - Recurrence Clock` → `SwanExperiment1RecurrenceClock`. Construct two
   real launcher names that collide after stripping. Does the second silently overwrite the first?
3. **`ie4uinit.exe -show`.** Is this the right call on Windows 11? Does it have side effects the
   owner would not expect? Is there a case where it does nothing and the stale icon persists,
   and does the script's messaging mislead in that case?
4. **`IconLocation` with a comma in the path.** `IconLocation` is `"path,index"`. What happens if
   the icon path itself contains a comma? Can the owner's paths contain one?
5. **Pillow ICO writing.** Is `append_images` + `sizes=` the correct/reliable way to control which
   frames land in the file, or does Pillow re-derive frames from `sizes` and ignore the supplied
   images? **This matters:** if Pillow is resizing internally, all the per-size sharpening work is
   discarded and the icons are worse than claimed. Say how to prove it either way.
6. **Alpha and the plate.** The plate is a rounded rect with a hard alpha mask. At 16px, does an
   unantialiased mask edge produce a jagged corner? The mask is drawn at `size*4` then downscaled —
   verify that reasoning holds for the mask specifically, not just the colour layers.
7. **`-List` performance and safety.** It opens every `.lnk` on the Desktop via COM. What if one is
   broken, points at a dead network share, or is a malformed file? The `try/catch` swallows
   everything — is that right, and what does the owner lose?
8. **PowerShell version.** `WScript.Shell` COM, `$PSScriptRoot` vs `$MyInvocation`, `Start-Process
   -WindowStyle Hidden`. Any of these behave differently in PowerShell 7 vs Windows PowerShell 5.1?
   The script does not declare a `#requires`.
9. **Running launchers.** Is it safe to rewrite a `.lnk` while the `.cmd` it points at is executing?
10. **The 16px claim.** The whole design is justified by "the icon is judged at 16px." Is the
    sharpening actually helping at 16px, or is `percent=190` at that size producing halos?

## A4. The mark itself

The generated mark is explicitly a **placeholder**; real art will come from an image model.
Three earlier versions were discarded (an arc read as a hook; a full body + neck read as a seal;
a wide shape under a vertical stem read as a lamp base). Current version: a tapered neck ribbon
(half-widths 58 → 19 on a 1024 grid, ease 1.5), head circle r=34 at (650, 274), beak wedge
(672,256)→(760,292)→(670,306), waterline ellipse (228,848)→(788,872).

**Do not redesign it.** Do say if any of those numbers produce a defect that will show at small
sizes — e.g. the beak wedge being under 2px at 16px and vanishing, or the waterline merging with
the plate edge.

---

# PART B — Taste Console, slice 1 (planned, not yet built)

## B1. What slice 1 is

The Swan Taste Brain is a local, zero-build-step tool (plain HTML/CSS/vanilla JS served by a
Host-gated Node static server; **no React, no bundler, no runtime npm dependency**). It has four
tabs today (Make · Judge · Directions · Kept) and reads as a utility page. A panel-arbitrated
blueprint restructures it into a three-section console (Judge · Make · Gallery).

**Slice 1 is deliberately the smallest visible slice**: design tokens, a "profile spine", and a
`.plate` class applied to the existing image grids **without changing markup structure**.

```css
:root{
  --obsidian:#0A0A0F; --carbon:#141419; --graphite:#1A1A24;
  --sapphire:#002060; --royal:#003080; --ice:#60C0F0;
  --gold:#C6A84B; --frost:#E0ECF4; --violet:#8B5CF6;
  --glow-on-blue:var(--violet);
  --glow-on-purple:var(--ice);
}
[data-profile="owner"]   { --profile-accent:var(--gold);   --profile-glow:rgba(198,168,75,.55); }
[data-profile="partner"] { --profile-accent:var(--ice);    --profile-glow:rgba(96,192,240,.55); }
[data-profile="client"]  { --profile-accent:var(--violet); --profile-glow:rgba(139,92,246,.55); }

.spine{ position:fixed; inset:0 0 auto 0; height:3px; z-index:60;
        background:var(--profile-accent); box-shadow:0 0 12px var(--profile-glow); }
.spine__section{ position:absolute; top:0; height:3px; width:72px;
                 background:var(--frost); box-shadow:0 0 8px rgba(224,236,244,.5);
                 transition:transform 200ms ease; }

.plate{ position:relative; padding:8px; border-radius:10px;
  background:
    radial-gradient(120% 70% at 50% -12%, rgba(96,192,240,.07), transparent 55%),
    linear-gradient(180deg, var(--carbon), var(--obsidian));
  box-shadow: inset 0 1px 0 rgba(224,236,244,.06), 0 14px 34px -16px rgba(0,0,0,.85); }
.plate img{ display:block; width:100%; border-radius:6px; object-fit:cover; }
.plate::after{ content:""; position:absolute; inset:0; border-radius:10px;
  pointer-events:none; border:1px solid rgba(96,192,240,0);
  transition:border-color 160ms linear; }
.plate:hover::after{ border-color:rgba(96,192,240,.35); }
.plate[aria-pressed="true"]::after{ border-color:var(--ice);
  box-shadow:0 0 0 1px var(--ice), 0 0 18px rgba(96,192,240,.35); }
.plate figcaption{ margin-top:6px; letter-spacing:.04em;
  font:500 11px/1.5 "Fira Code",monospace; color:#8FA3B0; }

:focus-visible{ outline:2px solid var(--ice); outline-offset:2px; }
@media (prefers-reduced-motion: reduce){
  .spine__section, .plate::after { transition:none; }
}
```

## B2. Constraints that cannot be violated

1. No build step, no framework, no runtime dependency.
2. **The judging surface must not regress.** It owns: a 12-image grid; a rule that the *reason*
   for a pick is locked in **before** the image is revealed; never-show-twice; and Undo. Its CSS
   lives in a separate `probe.css` which slice 1 **must not edit**.
3. Files stay under ~300 lines; adding a surface means adding a file.
4. 44px minimum interactive targets; WCAG 4.5:1; `prefers-reduced-motion` respected.
5. Dark-first. Wing Purple `#8B5CF6` measured against the plate colours: Obsidian 4.66,
   Carbon 4.34, Graphite 4.07, Sapphire 3.61, Royal 2.86. **It is a glow/border colour only,
   never text.**
6. Three "profiles" share the tool: the owner, a partner (her own separate business memories),
   and a client mode used for sales role-play. **A memory generates only from its own evidence.**
   The spine's colour is what makes the active profile visible at all times.

## B3. Attack it

1. **`.plate` applied to the existing judge grid.** The grid is styled by `probe.css`, which slice 1
   may not touch. What are the concrete ways a new `.plate` class collides with existing rules —
   specificity, `box-sizing`, an existing `position`, an existing `::after`, stacking context from
   `box-shadow`/`transform`? Name the collisions you would check for first.
2. **`.plate:hover::after` on a touch device** — hover styles that stick after tap. Does this matter
   here? What is the fix that does not add JS?
3. **`aria-pressed` on the plate.** Is `aria-pressed` correct for "this image is my pick", or is it
   the wrong role/state? What should it be, given a picker where one of twelve is chosen?
4. **The spine is `position:fixed` at `z-index:60`.** What existing UI could it cover? What happens
   on a short viewport, and in print (the tool has a Print/PDF path)?
5. **Colour as the only carrier of profile identity.** The spine encodes profile by colour.
   Name every accessibility and safety failure mode of that, and the minimum fix.
6. **`--glow-on-blue`/`--glow-on-purple` are declared but nothing in slice 1 consumes them.**
   Is shipping unused tokens right or wrong here? Argue it.
7. **`transition:transform 200ms` on `.spine__section`** with reduced-motion handled — is the
   media query block sufficient, or are there other animated properties introduced here?
8. **The `#8FA3B0` caption colour** is hardcoded rather than tokenised, while everything else is a
   token. Is that a defect? It measures 7.56:1 on Obsidian, 4.63:1 on Royal.
9. What is **missing** from slice 1 that will force a rework in slice 2 or 3? Be specific.

---

# What each seat must return

Use these exact headings, in this order:

1. **Part A — defects.** Ranked most severe first. Each: what breaks, the concrete trigger, and
   the fix. Mark each `CONFIRMED` (you can point to the mechanism) or `SUSPECTED` (needs a probe,
   and say which probe).
2. **Part B — defects.** Same format.
3. **Enhancements worth doing.** Separate from defects. Ranked by value-per-effort. For each, say
   what it costs and what it buys. **Include anything the owner has not thought of** — this is
   explicitly wanted.
4. **What I would cut.** Anything in either part that is not worth its maintenance weight.
5. **What I checked and found sound.** Required. List what you examined and concluded needs no
   change, so the next reviewer does not re-tread it.
