# PANEL BRIEF — Swan Brain taste curation + design ideation loop

**Produce: blueprint, wireframes (desktop + mobile), flowchart, complete logic, gap analysis.
Attack the proposed architecture in §4 — it is a proposal, not a decision.**

---

## 1. THE PROBLEM, IN SEAN'S WORDS

> *"I'm using the Mobbin MCP so I can look at different sites and get ideas. But I'm not really
> looking at it. The AI is just picking ten or twenty and automatically using them. It's not as
> deep, and it's not really coming from a design creation for me if I'm not putting as much
> input into it. It's more of an automatic AI type situation."*

And, added after:

> *"I want to be able to get grilled on my design and what I'm expecting, so I can have long
> deep conversations with the AI and better understand what I'm trying to build. And give me
> options based off what I'm talking about — 'it sounds like you want to build this… well, what
> about something like this?' Back and forth, helping me brainstorm before building."*

**Two asks, one goal: Sean wants the design to be HIS, not the AI's.** One is about
*references* (he never sees them). One is about *intent* (he wants to be interrogated and
counter-proposed to, not just extracted from).

## 2. WHAT SEAN SPECIFIED

1. **Ask first: quick or in-depth.** Never automatic.
2. In-depth: pull all relevant designs, **~50 at a time**.
3. He browses, picks what he likes, and **says what specifically he likes about each**.
4. System **takes notes on those specifics**.
5. Next 50. Repeat until he has seen everything relevant.
6. Then create from his picks **plus the existing Swan Brain protocol**.
7. Throughout: **long back-and-forth**, with the AI proposing alternatives he did not think of.

## 3. HARD CONSTRAINTS — verified from the live MCP tool schemas, not assumed

- `mcp__mobbin__search_screens`: `limit` **max 30**, `exclude_screen_ids` max 100, modes
  `deep`/`standard`, platform `ios|web` required.
- `mcp__mobbin__search_sections`: `limit` **max 30**, `page` paginates.
- `mcp__mobbin__search_flows`: `limit` **max 10**, `page` max 20.
- **Images return INLINE INTO MODEL CONTEXT.** Each result carries a `mobbin_url` which the
  tool contract requires be cited as a markdown link.

**Consequence, and the crux of the whole design:** 50 references per batch requires ≥2 calls
AND would consume an enormous share of a session's context. **The current shallow behaviour is
context economics, not laziness.** Any architecture that pipes 50 images through model context
fails identically.

## 4. PROPOSED ARCHITECTURE — ATTACK THIS

```
Sean: "hero for the homepage"
   │
   ├─ MODE GATE ──► quick    : ~10 refs, agent picks (today's behaviour)
   │                in-depth : the loop below
   │
   ├─ GRILL     existing `grill-me` skill extracts intent, ONE question at a time,
   │            each carrying a recommended answer. GAP: it extracts more than it
   │            counter-proposes. Sean wants continuous "what about X instead?"
   │
   ├─ HARVEST   N calls x <=30, dedup via exclude_screen_ids, batched BY QUERY ANGLE
   │            (layout / motion / typography / colour / density) rather than raw count
   │            → images written to a LOCAL GALLERY FILE, never into model context
   │
   ├─ BROWSE    Sean opens ONE html page per batch. Keyboard-only:
   │            J/K navigate, F keep, X discard, 1-5 rate, type-to-annotate
   │
   ├─ CAPTURE   append-only taste ledger (reuse the shipped variantRun pattern):
   │            { refId, mobbinUrl, verdict, whyText, tags, batchId, angle, createdAt }
   │            ONLY picks + reasons re-enter model context
   │
   ├─ DISTIL    after each batch: what do the keepers share? PROPOSED, never assumed.
   │            Sean confirms or corrects — the correction is the valuable signal
   │
   └─ CREATE    confirmed profile feeds swan-design-router + the Forge compiler;
                every concept cites which references shaped it
```

**Precedent that already exists and works:** the Swan Forge (shipped, live) does exactly this
loop for *generated* images — `contactSheet.mjs` writes a local HTML gallery Sean opens in a
browser, `forge review-answer` records his verdict into an append-only ledger. Reference
curation is the same loop pointed upstream. **Reuse it; do not invent a second one.**

## 5. ENHANCEMENTS I RECOMMEND — validate, extend, or kill each

1. **Rejections are data.** "I hate this" is cheap to give and equally informative. A profile
   built only on positives cannot say what to avoid.
2. **The profile must COMPOUND across sessions.** Durable ledger, not chat scroll.
3. **MAKE IT FALSIFIABLE.** After ~50 verdicts, show 10 unseen references, predict which Sean
   keeps, measure the hit rate. **This is what turns a note-taker into a brain.** A taste
   profile never tested is a document.
4. **Provenance on output** — every concept names the references and stated reasons behind it.
5. **Least clicks** (Sean's standing mandate) — 50 references reviewable in ~2 minutes or it
   gets used once.
6. **Batch by query angle**, not raw count.
7. **Counter-proposal loop**: the AI should routinely say "you said X — have you considered Y?"
   and record which alternatives Sean rejects and why. Rejected alternatives are taste data.
8. **Protect the ceiling.** CLAUDE.md rule 40: the top Swan tier is the *cinematic
   scroll-journey*, ABOVE conventional app-UI reference; Mobbin is the lane for conventional
   working surfaces. The curation loop must not quietly demote Swan's ceiling to "best of
   Mobbin."

## 6. OPEN QUESTIONS THE PANEL MUST SETTLE

- **How does curated taste actually ENTER generation?** Compiler slots? Retrieval? A router
  pre-brief? **This is load-bearing and unanswered.**
- Where does browsing happen — local HTML file (works today, zero infra) or an in-app admin
  surface (discoverable, but a build)?
- What exactly is captured as "why"? Free text is easy to give, hard to use. Fixed taxonomy is
  usable but feels like a form. Both?
- How does the profile stay current as Sean's taste changes — decay, or explicit versions?
- How many verdicts before the profile is trustworthy? State a number and test it.
- Does this belong to the Forge, the design router, or a new module?
- **How does the grill/counter-proposal loop avoid becoming an interrogation Sean abandons?**
  What is the exit condition?

## 7. DELIVERABLES

Blueprint · wireframes desktop + mobile · flowchart · per-field data/API contract · numbered
independently-shippable slices, each executable with zero further questions · gap analysis
naming context Sean may be missing.

**Swan constraints that bind any UI in this design:** styled-components only (no MUI),
Crystalline Swan dark-first tokens with `var(--token, #fallback)`, 44px minimum touch targets,
WCAG 4.5:1, responsive 320/375/414/768/1024/1440/1920/2560/3840, `prefers-reduced-motion`
respected, ≤300 lines per file, Victory for any charts.
