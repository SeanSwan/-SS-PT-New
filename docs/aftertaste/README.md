# Aftertaste — start here

Aftertaste is a voxel zombie-survival game: a SwanStudios take on Call of Duty Zombies where the
monsters are junk food, decay organisms, parasites, deep-ocean horrors and parasitic robots.

**Run it:**
```
npm run aftertaste
```
That opens `http://127.0.0.1:5299`: click the canvas to grab the mouse (Esc releases it), aim by
looking, WASD to move, hold the left button to fire.

**Run its test:**
```
npm --prefix packages/aftertaste test
```

## What is in this folder

| File | What it is for |
|---|---|
| `GLOSSARY.md` | Every game-dev word, in plain English. Look here first when a term is unfamiliar. |
| `LEARNING-PATH.md` | What to watch, tied to the slice you are on — not a reading list. |
| `CONCEPTS/` | One short page per big idea, written for someone new. |
| `DECISIONS.md` | Why the project is shaped the way it is (added as decisions land). |

## Why the game looks like nothing yet

On purpose. This is a **grey-box** — the game played with plain boxes, built to find out whether it
is *fun* before a single monster is modelled. If it is boring with boxes, it will be boring with
beautiful Frylings, and you will have spent months finding that out. Art comes after fun is proven.

The full reasoning is in `docs/ai-workflow/AI-HANDOFF/FABLE-MASTER-PLAN-AFTERTASTE-2026-09-01.md`.
