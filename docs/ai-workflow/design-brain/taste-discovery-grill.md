# Taste Discovery Grill — the protocol grill-me runs when the unresolved question is *visual taste*

- **Date:** 2026-08-25 · **Author:** Claude Fable 5 (Final Decider) · **Status:** CANONICAL within Design Brain scope (v1)
- **Authority:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `design.md` > this file. This protocol discovers what Sean *likes*; it never loosens brand law. A discovered preference that brand law forbids on a Swan surface is recorded as taste and still refused as design.
- **Origin:** ChatGPT Pro deep-research review (2026-08-25) → six-seat hostile panel → `FABLE-SYNTHESIS.md` (`docs/ai-workflow/AI-HANDOFF/panel-gpt-pro-design-brain-review-2026-08-25/`). The panel's verdict shapes every rule below.
- **Runtime it drives:** the **Swan Taste Brain** (private repo `swan-taste-brain`, outside SS-PT): the probe page `http://127.0.0.1:7331/probe`, the event log `taste/events/*.jsonl` (TasteEvent v1), and `GET /api/profile` (the tally compiler). Server must be running.

---

## 1. What this is, in one paragraph

A **mode of grill-me**, not a new skill and not a new top-level edge in the pipeline. When grill-me finds that the thing it cannot resolve in words is *what Sean's eye wants* — a hero direction, an image style, a film look — it stops asking and hands him **pictures**. Words are a prior; pictures are evidence. The grill's only verbal job is to set the context the pictures will be judged in, without leading the witness.

## 2. The three laws (from the panel — do not relax them)

1. **Do not lead the witness.** No question opens with "Recommended: <Swan's self-portrait>". A recommendation may be offered *after* Sean answers, and if it was shown it is logged as `defaultShown: true`. The system exists to find styles he has no words for; handing him the words first defeats it.
2. **Agents read IDs, never images, and write nothing to taste.** The probe page is the only writer of `taste/events`. grill-me reads `/api/profile` (IDs, codes, tallies, tiers) and **never** requests image bytes, never opens the JSONL, never edits `themes.md` / `rejected.md` / `loved-srefs.md` / `kept.md`. Proposed avoids are *proposed*; Sean copies them himself.
3. **Tier is truth.** Every direction the mode presents carries the compiler's `tier`: `evidence` (≥2 of Sean's own "closest" picks behind it, event ids cited) or `prior` (from `themes.md`). Present the word. Never paraphrase a prior as a finding.

## 3. The sequence (verbal part is THREE questions, then pictures)

Ask one at a time. Checkpoint each answer to the brainstorm doc as usual. Use `AskUserQuestion` where options are discrete.

**Q0 — Kept-artifact triage** (zero cost, highest-truth evidence class: shipped > kept > pairwise)
> "Pick two to four things you've already shipped or kept and would ship again — a page, a hero, a picture, a clip. What must a new direction share with them?"
Write: the artifact IDs/paths and his "must share" sentence → brainstorm doc *Key Decisions*. Do not convert the sentence into taste weights.

**Q1 — Medium + surface class**
> "Is today about a web surface, a still image, or film — and where does it live: hero, module/card, film title, substrate/background, other?"
Write: `medium`, `surfaceClass` → these are passed to the probe session as context (they ride on every event). Optional recommendation *after* the answer: web first when a shipped surface is the target.

**Q3 — Refusals, unled**
> "Before we look at anything: what must this never be? Name it in your own words."
Do **not** list Swan's standing refusals as prompts. If he names nothing, accept "nothing yet" and move on. Write: his words verbatim → brainstorm doc *Open Flags* (they become `rejected.md` candidates only when he says so).

**The switch — say it in these words:**
> "I have enough context to stop guessing with words. Open `http://127.0.0.1:7331/probe` and judge two or three grids. Mark up to three *closest* and up to three *miss* per grid — nothing is forced. Pick one reason, lock it, then the label shows. Tell me when you're done."

(Q2 emotional target · Q4 realism boundary · Q5 light/value · Q6 scale/camera from the GPT review are **retired as verbal questions** — each was brand recitation that pre-loads the store. Their content is what the pictures measure.)

## 4. What the mode does while Sean is at the probe

Nothing. It waits on his "done". It does not poll images, does not open the event files, does not narrate. If it needs proof a grid was recorded it may call `GET /api/profile` and read `grids` (a count).

## 5. After "done": read the profile, present three directions

```
curl -s http://127.0.0.1:7331/api/profile
```
Read: `grids`, `judgements`, `reasons`, `srefs`, `subjects`, `provenance`, `directions[3]`, `proposedAvoids`.

Present, in this shape, plain-English first:
1. **What the grids say** — top reasons with counts ("realism 5 closest / 3 miss"), top subjects, provenance split. Numbers, not adjectives.
2. **Three directions** — each line starts with its tier in caps: `[EVIDENCE]` or `[PRIOR]`. For evidence directions show the codes/theme words and the sample prompt (it is the picture he chose). For prior directions say "from themes.md — not yet backed by your picks; N more closest picks of <kind> would flip it."
3. **Proposed avoids** — list them, say they are proposals, do not act on them.
4. **One question:** "Which direction do we build from — or do you want more grids first?" (Recommended answer allowed here, after the data is on the table.)

Then hand off: web → `swan-design-router` with the chosen direction's codes/theme words as the brief's style anchors; still image → the Forge / Prompt Studio with the sample prompt; film → the cinematic skill with the direction as the look reference. The brainstorm doc records which direction was chosen and its `evidenceEventIds`.

## 6. Done criterion (Grok's, adopted)

The mode may present directions once **≥8 non-neutral judgements with reasons exist across ≥2 grids** (the compiler's evidence floor is 2 closest per direction). It never stops on "model confidence" — there is no model. If fewer exist, say so and send him back to the probe.

## 7. Compounding (how the pool follows him)

- After ~5 grids, run `node prompter/fetch-photos.mjs` in the taste brain: it lifts subjects from his *closest* picks into new search queries (Unsplash + Pexels), so the next grids are drawn from words he chose, not only the standing theme list.
- Re-run `node prompter/compile-taste.mjs` any time; `taste-profile.json` is machine-owned and regenerated.
- The exploit trap (rating two codes and seeing only those forever) is structurally avoided: the probe is coverage-stratified across articles/theme words/Webb categories and never reads the profile when choosing what to show.

## 8. What breaks this protocol (refuse these)

- A grill that opens Q1 with "Recommended: quiet awe, low-key light…" — leading.
- An agent that reads `taste/events/*.jsonl` directly or asks for image bytes — write-path/licence breach.
- Presenting a `prior` direction without the word — cold-start laundering.
- Writing to any `taste/*.md` "to save Sean a step" — the store only holds his judgement.
- Forcing three misses per grid — unselected is not rejected.
- Running the probe with the server bound to anything but `127.0.0.1` — Midlibrary images are copyrighted references shown to Sean on loopback only.

## 9. Pointers

- Panel synthesis + corrected TasteEvent v1: `docs/ai-workflow/AI-HANDOFF/panel-gpt-pro-design-brain-review-2026-08-25/FABLE-SYNTHESIS.md`
- Transcript corpus the brain learned from: `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-TRANSCRIPT-CORPUS-AND-GPT-PRO-AUDIT-PROMPT-2026-08-24.md`
- Taste brain runtime README (private repo): `swan-taste-brain/prompter/README.md` — probe, collections, compiler
- Skill that invokes this: `.claude/skills/grill-me/SKILL.md` § "Visual-taste mode"
