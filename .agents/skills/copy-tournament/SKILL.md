---
name: copy-tournament
description: Adversarial copywriting tournament for SwanStudios conversion surfaces. Writes N distinct copy variants (different hook + structure each), then builds a panel of skeptical judges (CFO, distracted founder scrolling at midnight, a competitor, the ideal SwanStudios customer, a conversion copywriter) who score every variant and explain why, kills the losers, merges what worked into one winning version, and shows the scoreboard. Use for landing pages, hero copy, pricing-page language, ascension/upgrade CTAs, email, or any high-stakes copy where conversion matters. Routes the visual side through swan-design-router.
---

# Copy Tournament

**Role:** conversion-copy generator that beats one-shot copy by making variants compete. One LLM pass gives you one "okay" version. A tournament pits eight against five hostile judges and merges the winner — the output is dramatically better, and the scoreboard tells you *why* it won so the insight is reusable.

> "Write my landing page eight different ways — different hook, different structure each time. Then create five judges: a skeptical CFO, a distracted founder scrolling at midnight, a competitor, my ideal customer, and a conversion copywriter. Have every judge score every version and explain the scores. Kill the losers, merge what worked into a final version, and show me the scoreboard so I can see why it won."

## When to invoke

- Sean is writing or rewriting a **landing page, hero section, pricing/ascension page, upgrade CTA, onboarding copy, marketing email, or store card** — anything where conversion is the goal.
- Sean says **"copy tournament," "write this N ways and judge it," "make the copy convert,"** or `/copy-tournament`.
- Inside a `swan-design-router` build when a surface's copy is doing real persuasive work, not just labels.

Not for: microcopy/labels, error messages, or internal admin text where there's nothing to convert.

## Method

1. **Capture the brief first (read, don't guess — rule 18/49).** What's the surface, who's the audience (pull the real ICP: trainer-led B2B2C, golf/high-value clients as the lead segment, the free Move-Fitness tier — see rule 62 + the Best-in-Class strategy), what's the one action we want, what's the offer, what proof/credentials are real (Sean's 26+ years, NASM-protocol — never "NASM-certified," rule on credentials). Honest inputs are the whole game — bad inputs produce confident garbage.
2. **Write N variants (default 6–8), each genuinely different** — different hook, different structure, different emotional angle (fear-of-stagnation vs. aspiration vs. social proof vs. authority vs. simplicity). Not eight rewordings of one idea.
3. **Build the judge panel (default 5):**
   - **Skeptical CFO** — every claim is a cost or a liability until defended; flags anything that reads like an unsupported estimate.
   - **Distracted founder scrolling at midnight** — does it stop the scroll in 2 seconds, or get swiped past?
   - **The competitor** — what's overclaimed, what's generic, where's the opening they'd attack.
   - **The ideal SwanStudios customer** — the actual target (e.g. a wealthy golfer who wants to play longer, pain-free; a trainer deciding whether to move clients in). Does it speak to *their* job?
   - **The conversion copywriter** — clarity, specificity, one CTA, no jargon, does the structure earn the click.
4. **Every judge scores every variant (1–10) and explains the score** — the explanation is the value (e.g. *"$2,000/month is a claim the page must immediately defend or it reads like a Zillow estimate — 6"*).
5. **Kill the losers, merge the winners.** Take the highest-scoring hook, the structure that judges respected, the lines that landed, and synthesize **one** final version. Show the **scoreboard** (variant × judge matrix) so Sean sees why it won.
6. **Surface the one insight about the customer the brief didn't already know** — the tournament almost always exposes a real positioning truth. Name it.

This maps cleanly onto the `Workflow` tool's judge-panel pattern when run at scale (many variants × many judges in parallel), or can run inline for a single surface. For large runs, prefer Workflow with a generate→judge→synthesize pipeline.

## Output

Write to **`docs/ai-workflow/brainstorms/copy-tournament-<surface>-<YYYY-MM-DD>.md`** (session date; never a date function) and summarize in chat:
- The brief (audience, offer, one action, real proof).
- The N variants (full text).
- The scoreboard (variant × judge, with scores + one-line rationale per cell).
- **The winning merged copy**, ready to drop in.
- The one customer insight the tournament exposed.

## Integration
- **Visual side routes through `swan-design-router`** — copy-tournament writes the words; the router owns the Crystalline Swan layout, hierarchy, Dual-Button Glow CTA, and anti-template discipline that the copy lives inside. They run together for a landing-page build.
- Honors rule 9 (no yoga/meditation language — "stretching"/"flexibility"), the credentials rule (26+ years / NASM-protocol, never NASM-certified), and rule 8 (no PII in committed docs).
- If a tournament reveals the *product positioning itself* is the problem (not just the words), hand off to `chromie` to pressure-test the offer.

## Non-goals
- Does not design the page (that's `swan-design-router`) — it produces the copy + the reasoning.
- Does not invent proof or credentials — only real, Sean-verified claims (overclaiming is exactly what the CFO + competitor judges exist to kill).
- Does not ship — the winning copy is a deliverable Sean approves before it lands in a surface (closeout-evidence-lock applies to the build that follows).
