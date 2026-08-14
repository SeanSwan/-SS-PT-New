---
title: MASTER HANDOFF — Forge shipped, and the Swan Brain taste-curation upgrade Sean wants next
originating_model: claude-opus-5
date: 2026-08-13
decision: Forge is done and live; next work is Mobbin taste-curation, and it needs an AI Village panel before any code
status: open
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# MASTER HANDOFF

**You are picking up a long session. This document replaces reading it.**

Three parts: **(1)** what shipped and is live, **(2)** the ONE decision Sean owes, **(3)** the
next build — a Swan Brain upgrade Sean specified, which must go through an AI Village panel
before anyone writes code.

**Standing rule adopted this session, applies to you too:** every claim carries its command
and output, or is tagged `[UNVERIFIED]`. And before repeating any blocker below, re-run its
check — `main` moves constantly and another agent may have fixed it. See
`.claude/skills/stale-check/SKILL.md`.

---

# PART 1 — WHAT SHIPPED (live, no action needed)

## 1.1 Where this session started

Sean asked to upgrade the "Swan Brain" into a world-class design + image-generation system —
comparable to "$100,000 websites" — with a genius-level image-prompt brain, deep-read of
Midjourney/midlibrary style taxonomy, and **fixing shallow Mobbin usage** (he pays ~$45/mo and
felt the AI looked at 5–10 references when he wanted 50+). Plus Swan Visualizer, motion
graphics, Three.js/parallax, and integrating his flat-rate Codex subscription to cut spend.

## 1.2 What actually got built: the Swan Forge

A **CLI + library for generating Swan-lawful imagery**. Merged to `main`, deployed, **inert** —
no migration, no route, no model, no frontend component, and nothing on a request path imports
it.

```
node scripts/forge.mjs bracket "a frozen lake at dawn" --confirm-spend   # 3 options, ~$0.013
node scripts/forge.mjs pick <id> --winner                                # record the choice
node scripts/forge.mjs refine <id> "warmer, lower sun" --confirm-spend
node scripts/forge.mjs review <runId>                                    # contact sheet + rubric
node scripts/forge.mjs review-answer <id> --usable yes --onBrand swan
node scripts/forge.mjs list | store | prune
```

| | |
|---|---|
| Tests | **178 pass / 0 fail** (`node --test`, 16 files) |
| Shared modules | 18 (was 21 — five deleted at closeout) |
| Ledger | 19 rows, 0 corrupt, $0.0669 recorded |
| Whole-workstream spend | ~$0.21 images + ~$0.38 reviews = **~$0.59** |
| Deep detail | `docs/ai-workflow/AI-HANDOFF/SWAN-FORGE-HANDOFF-2026-08-13.md` |

## 1.3 Capability truths — probed with real money. DO NOT re-litigate.

| capability | verdict | evidence |
|---|---|---|
| aspect ratio | **works** | 1536×864 = 16:9 exactly, every generation |
| seed | **DEAD** | same prompt + same seed → different bytes (3 arms + control) |
| image-to-image | **DEAD** | blue input `#002882` → yellow output `#fbde5e`, identical to no-input control `#fcd158` |
| negative-prompt param | dead twice over | gated on a 'claimed' capability AND absent from the request body |

**Two capabilities are ACCEPTED, BILLED MORE, and INERT.** Neither HTTP 200 nor a higher
charge is evidence a feature works — only an *influence* test with a control arm is.

Other measured facts: cost field is `usage.cost` (**not** `total_cost`); **no `id`** on the
images response, so uncaptured cost is unrecoverable; real price **$0.0037–$0.0061/image**;
endpoint is `/api/v1/images` (`chat/completions` is ~50× dearer, 7× slower, cannot honour
aspect ratio).

## 1.4 Also shipped this session

- **`.claude/skills/stale-check/SKILL.md`** — built from a real failure: I reported a dead
  blocker in **four consecutive closeouts** because another agent fixed it and I never
  re-checked. Rule: a carried claim ships a `CHECK` command and an `AS-OF`, and you run it
  before repeating it.
- **`docs/ai-workflow/design-brain/style-taxonomy.md`** — 15 source categories × 51 quality
  facets, captured live from midlibrary (WebFetch failed; JS-rendered, needed Playwright).
- **`docs/ai-workflow/design-brain/field-techniques.md`** — 6 harvested transcripts including
  the C13 scroll-journey and 30→60fps frame-interpolation technique.
- **Nine Kimi K3 hostile-review rounds**, `docs/ai-workflow/AI-HANDOFF/KIMI-FORGE-ROUND[3-9]-*.md`.

---

# PART 2 — THE ONE DECISION SEAN OWES

**The kill-list A/B.** A clause is appended to every prompt telling the model to avoid
iridescent gradients, glassmorphism, fantasy wallpaper and literal creature forms. **It ships
OFF.**

- Measured: acceptance 3/3 both arms, palette identical, clause costs **~7% more per image**.
- Unmeasured: whether it improves or degrades output. Caption models can fixate on nouns they
  are told to avoid.
- **Blind sheet:** `.ai-workflow/forge-runs/ab-blind.html` — six images tagged A–F. The decoder
  is a **separate file** (`ab-blind-key.json`); do not open before answering.
- **If Sean sees no difference → delete the clause** from `swanPromptCompiler.mjs` and its gate
  in `forgeConfig.mjs`. If he prefers the clause arm → `FORGE_KILL_LIST=1`, with his ruling
  recorded as the reason.

**Blinding honesty:** markup carries no arm labels and mtimes are uniform. Byte sizes are
distinct and the originals remain in `ab-avoid/` under revealing names — decodable by anyone
comparing directories. Acceptable because the reader wants the honest answer; the guard is
against unconscious expectation, not an adversary.

---

# PART 3 — THE NEXT BUILD: SWAN BRAIN TASTE CURATION

## 3.1 Sean's problem, in his words

> *"I'm using the Mobbin MCP so I can look at different sites and get ideas. But I'm not really
> looking at it. The AI is just picking ten or twenty and automatically using them. It's not as
> deep, and it's not really coming from a design creation for me if I'm not putting as much
> input into it. It's more of an automatic AI type situation."*

**This is a taste-ownership problem, not a tooling problem.** The design comes out AI-flavoured
because the human never saw the reference set.

## 3.2 What Sean asked for

1. **Ask first: quick version or in-depth version.** Not automatic.
2. **In-depth:** pull ALL relevant designs, **~50 at a time**, Sean browses the batch.
3. He picks the ones he likes and **says what he likes about each one specifically**.
4. The system **takes notes on those specifics**.
5. Next 50. Repeat until he has found everything he likes.
6. Then create, using his picks **plus the existing Swan Brain protocol**.

## 3.3 THE CONSTRAINT THAT EXPLAINS THE CURRENT BEHAVIOUR — verified, not assumed

`mcp__mobbin__search_screens` / `search_sections`: **`limit` caps at 30**.
`mcp__mobbin__search_flows`: **`limit` caps at 10**. Images return **INLINE into the model's
context**.

So: **50 at a time requires ≥2 calls, and 50 inline images would consume an enormous share of
the session's context.** The AI settles for 10–20 because of *context economics*, not
laziness. Any design that pipes 50 images through the model's context will fail the same way.

**Therefore the architecture must get images OUT of model context and IN FRONT OF SEAN'S EYES
directly — and only his PICKS come back in.**

This is exactly the pattern already built and shipped for generated images: `contactSheet.mjs`
writes a local HTML gallery Sean opens in a browser, and `review-answer` records his verdict
into a ledger. **The reference-curation loop is the same loop pointed upstream at references
instead of outputs.** Reuse it; do not invent a second one.

## 3.4 Recommended architecture (input to the panel, not a decision)

```
Sean: "hero for the homepage"
   │
   ├─ MODE GATE ──► quick    : ~10 refs, agent picks, current behaviour, one call
   │                in-depth : the loop below
   │
   ├─ HARVEST  N calls × ≤30, dedup via exclude_screen_ids (max 100), paginate
   │            → images written to a LOCAL gallery, NOT into model context
   │
   ├─ BROWSE   Sean opens one HTML page, 50 per batch, keyboard-navigable
   │            keeps / discards / stars, and types WHY on the keepers
   │
   ├─ CAPTURE  each verdict → an append-only taste ledger (the variantRun pattern):
   │            { refId, mobbinUrl, verdict, whyText, tags, batchId, createdAt }
   │            ONLY the picks + reasons re-enter model context
   │
   ├─ DISTIL   after each batch: what do the keepers share? Proposed, never assumed —
   │            Sean confirms or corrects, and the correction is the valuable part
   │
   └─ CREATE   the confirmed taste profile feeds swan-design-router + the Forge compiler,
                and every generated concept cites which references shaped it
```

## 3.5 What I recommend ADDING that Sean did not name

1. **Rejections are data.** "I hate this" is as informative as "I love this", and cheaper to
   give. Capture discards with a one-word reason. A taste model built only on positives cannot
   tell you what to avoid.
2. **The profile must COMPOUND across sessions.** Batch 5 should know what batch 1 learned, and
   next month's session should start from everything so far. Durable ledger, not a chat scroll.
3. **Make the profile FALSIFIABLE.** After ~50 verdicts, show 10 unseen references and have the
   system predict which Sean keeps. Measure the hit rate. A taste profile that is never tested
   is a document, and this codebase has learned what those are worth. **This is the feature
   that turns it from a note-taker into a brain.**
4. **Provenance on output.** Every generated concept should be able to answer "which references
   shaped this, and which of Sean's stated reasons drove it". Without it the loop is
   unauditable and taste drift is invisible.
5. **Least clicks, per Sean's standing mandate.** Keyboard-only browsing (`J`/`K` navigate,
   `F` keep, `X` discard, `1-5` rate, type-to-annotate). 50 references must be reviewable in a
   couple of minutes, or it will be used once.
6. **Batch by QUERY ANGLE, not just count.** Fifty results from one query are fifty variations
   of one idea. Better: five angles × ten each (layout, motion, typography, colour, density) —
   more informative per minute of Sean's attention.
7. **Cite every reference as a `mobbin_url` link** — the MCP requires it, and it lets Sean open
   the real thing when a thumbnail is not enough.
8. **Reconcile with the existing taste-ceiling doctrine.** CLAUDE.md rule 40 already says the
   highest Swan tier is the *cinematic scroll-journey*, ABOVE conventional app-UI reference,
   and that Mobbin is the lane for conventional working surfaces. **The curation loop must not
   quietly demote Swan's ceiling to "best of Mobbin".** Keep the C13/Extreme-Macro ideation
   gate for awe surfaces; use curated references for working surfaces.

## 3.6 Open questions the panel must settle

- **Where does browsing happen?** Local HTML file (works today, zero infra) vs an in-app admin
  surface (discoverable, but a whole build). Recommend local file first.
- **What exactly is captured as "why"?** Free text is easy to give and hard to use; a fixed
  taxonomy is usable and feels like a form. Probably both: one tap + optional sentence.
- **How does taste enter generation?** Injected into the compiler's slots? A retrieval step?
  A router pre-brief? This is the load-bearing question and it is unanswered.
- **How does the profile stay current** when Sean's taste changes? Decay, or explicit versions?
- **How many references before the profile is worth trusting?** State a number and test it.
- **Does this belong to the Forge, the design router, or a new module?**

## 3.7 MANDATORY: run the AI Village panel BEFORE writing code

Sean's explicit instruction: run the Village panel on this idea to produce **blueprint,
wireframes, flowchart, complete logic**, plus gap analysis for context he may be missing.

- **Rule 16: AI Village requires Sean's explicit per-run permission and is spend-gated. ASK
  FIRST.** ~$0.33/run.
- Per the Tier-3 rule, a Village run **always chains into a free triangle pass** (Claude +
  Codex + Gemini) whose synthesis is the FINAL verdict. Village → triangle → final.
- The panel should be given: this document, `SWAN-FORGE-HANDOFF-2026-08-13.md`, the verified
  MCP constraints in §3.3, the recommendations in §3.5, and the open questions in §3.6.
- **Ask it to attack §3.4** — that architecture is my proposal, not a decision.

## 3.8 Then, and only then

Build slice by slice, with hostile review per slice and a dry loop to CLEAN×2 before shipping.
The failure habits in `SWAN-FORGE-HANDOFF-2026-08-13.md` §5 are the ones that produced every
bug in the last workstream; read them before starting.

---

# PART 4 — RECOMMENDATIONS

**R1 — Do the A/B ruling first.** It is two minutes and it closes the last open Forge item.

**R2 — Run the Village panel on Part 3 before any code.** Sean asked for it, and the load-
bearing question (how taste enters generation) is genuinely unsolved.

**R3 — Use the Forge for real work before improving it.** It has one user and roughly zero
real sessions. Ten actual bracket runs will name the next slice better than another review
round. The homepage-hero work that started this thread is the natural first use.

**R4 — Adopt evidence-bearing closeouts repo-wide.** Highest-value change from nine review
rounds; costs nothing; only removes the ability to be vague.

**R5 — Start collecting rubric answers immediately.** After ~10 reviews the ledger can answer
whether the law filter correlates with what Sean actually picks. Only collectable one honest
human answer at a time, so start early.

---

# PART 5 — STATE OF EVERYTHING ELSE

**Sean-gated, unchanged:** branch protection on `main` + merge PR #36; Linear re-auth (grant
dead — **re-verified this session**, `invalid_grant`, no Linear tools exposed); MiniMax
licensing fields; the `--font-heading` conflict (`'Sora'` in code vs Plus Jakarta Sans in
doctrine).

**RETIRED — do not carry forward:** "`scripts/lane.mjs` is missing from `main`". It was true
when first observed; another agent merged it. `node scripts/lane.mjs digest` runs clean.

**Hermes:** memos for this session are in `.ai-workflow/hermes-inbox/pending/` —
wrong-endpoint root cause, tag-serializer safety finding, VariantRun provenance, seed/i2i
verdicts, the bracket, the fix-after batch, the post-deploy audit, the closeout deletions, and
the stale-check skill. One durable learning packet:
`docs/ai-workflow/hermes-learning-packets/20260812-controls-versus-habits-and-guards-that-lie.md`.

**Other agents:** the Create-surface UI belongs to another Claude (their Slice 5). A read
contract for it was built and then deleted as premature — `git show
fce253be2^:shared/forgeReadApi.mjs` restores it **when a consumer exists**.
