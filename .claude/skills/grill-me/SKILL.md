---
name: grill-me
description: Standalone intent- and VALUES-extraction gate. Domain-independent — it is not a design skill and is not owned by swan-design-router. Phase 1 relentlessly interviews Sean one question at a time, descending a seven-tier values ladder, to pull his vision, taste, priorities, refusals and durable values into a brainstorm doc BEFORE planning or building. Anything that would still be true a year from now is promoted to the standing Swan Values Corpus so it never has to be asked again. Phase 2 steps back and synthesizes against the parent, its children and the app-as-a-whole. Use for ANY subject Sean is bringing into reality — frontend, backend, schema, API, business logic, pricing, copy, content and recording, the Swanverse game, Hermes scope, marketing, ops, brand. Extracts values, never implementation blueprints. Run it often.
---

# Grill Me

**Role:** intent-extraction gate. The model is the same for everybody — what makes SwanStudios outputs sound like *Sean* is the context: his taste, his voice, his decisions. This skill exists to get that context out of his head and into the operating system before any plan or code is written.

> "The toughest part about building good skills and a good operating system is getting everything from your brain into your system... A skill can just be a prompt you don't want to have to say every single time."

Rule 78 environment preflight is the front door before any write. After the checkout is verified or isolated, this is the intent front door for clear net-new building and planning; foggy multi-session work reaches it through the current Wayfinder `GRILL-HITL` ticket. It runs before recursive planning, `swan-orchestrator`, and `swan-design-router`.

## grill-me is its own thing (domain-independent)

Grill-me is **not a design skill** and is **not owned by `swan-design-router`.** The design
router is one downstream consumer among many. Grill-me runs before and above every build
lane, on any subject matter Sean is bringing into reality:

frontend · backend · data model & schema · API contracts · business logic · pricing &
money-path · client-facing copy · admin/trainer workflow · content & recording · the
Swanverse game & lore · Hermes/operator scope · marketing · ops & automation · brand.

If Sean is deciding something and the answer lives in his head, grill-me is in scope —
whether or not a single pixel is involved.

## What grill-me is FOR: values, not disciplines

Uncle Bob Martin's cut, adopted 2026-08-25: **impose human VALUES on agents, not human
DISCIPLINE.**

- A **value** is what "good" means to Sean — what he cares about, what he refuses, what he
  finds beautiful, who he is protecting, which side of a tradeoff he takes every time.
  Values transfer to an agent cleanly and stay true for years.
- A **discipline** is a procedure built around a human limitation — report shapes, ceremony
  ordering, step-by-step method. Agents do not share the limitation, so the discipline
  transfers badly and decays into a guideline. Measured in this repo: **48% of documented
  rules recurred as errors anyway.**

**Grill-me extracts values. It does not produce implementation blueprints.**

That distinction is what lets this skill survive the anti-spec-driven finding. A large,
persisted, authoritative plan is the waterfall trap — it is wrong the moment the build
contradicts it, and it rots into misleading context. A captured value is the opposite:
small, durable, and *more* useful over time. When a grill drifts into "and then the
function should call X" — stop. That is the build's job, not the interview's.

The test for every answer captured: **would this still be true in a year, on a different
feature?** If yes it is a value — promote it to the corpus. If no it is a detail of this
slice — leave it in the brainstorm doc and let it expire with the slice.

## Two phases: Extract, then Synthesize & Advise

Grill-me is not just a stenographer. It runs in two phases:

1. **Phase 1 — Extract (the grill).** Relentlessly interview Sean to capture what the app/feature/component **is**, what it's **supposed to do**, and the vision/taste/decisions behind it. (The classic grill-me, below.)
2. **Phase 2 — Synthesize & Advise.** Once the picture is clear, *step back and look at the whole.* Take everything captured and proactively make suggestions: what features are still needed, what's missing, where the experience can be reduced to fewer clicks, and how the piece fits the **parent component / children components / app-as-a-whole** architecture and Sean's broader vision. Phase 2 is where grill-me earns its keep — it doesn't just record Sean's plan, it pressure-tests and improves it against what it sees.

Suggestions can also surface *inline* during Phase 1 (every question already carries a recommended answer). Phase 2 is the dedicated whole-system pass at the end.

## When to invoke (auto-route)

Invoke after Rule 78 environment preflight at the start of a bounded task that is:
- A **net-new component, page, dashboard surface, or feature** where Sean's preferences aren't already captured
- A **redesign** of an existing surface
- A **new system, integration, or product direction** (Swan Coach lane, gamification, nutrition, social, Hermes scope, etc.)
- A **planning session** where the goal is fuzzy ("I want to build X" with the details still in Sean's head)
- A request that **explicitly** says "grill me", "interview me", "ask me questions about", or "/grill-me"
- Any moment Claude/Codex notices it is **about to guess** at Sean's taste, hierarchy, scope, or business logic instead of knowing it
- **Visual taste specifically** — a hero direction, an image style, a film look, "what do I like" — switch into **Visual-taste mode** (below): three unled questions, then pictures, then the compiler's three tier-labelled directions

Do NOT invoke for:
- Trivial bug fixes, typo fixes, comment-only edits, formatting passes
- Tasks where the brainstorm doc already exists and is current (read it instead, then offer a re-grill only if there are new gaps)
- Pure exploration/read-only research with no plan to build

**Bias toward running it.** Sean's standing instruction (2026-08-25): grill *more*
often, not less — "whenever it feels like it should be asking questions for anything." The
cost of a grill is a few minutes of his time; the cost of a guess is a build in the wrong
direction plus the rework. When in doubt, ask one question rather than assume. A grill that
captures even one durable value has already paid for itself.

If a brainstorm doc already covers the surface, **read it first**. Only re-grill the gaps or the new information Sean brings.

## Environment and fog preflight

Before creating or appending a brainstorm, complete Rule 78 environment preflight and run `worktree-isolation` when required. Then decide whether this is one product decision or a genuinely foggy multi-session project. If the broader effort has several unresolved dependency branches, route through `wayfinder` first and open one `GRILL-HITL` ticket for the current blocking decision. Keep the full map on disk; do not make Sean answer the entire tree in one sitting.

When a choice is material, present only the next blocking decision:

1. Offer two or three mutually exclusive options.
2. Put the recommended option first.
3. State the tradeoff in one sentence.
4. Wait only when the choice changes product direction, security, billing, data behavior, production, or an irreversible action.
5. Record the answer at its canonical source and link a short gist from the Wayfinder map if one exists.

If the answer is discoverable from the repo, discover it instead of asking.

## The core method (Matt PCO's original, preserved)

> Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one by one. For each question, provide your recommended answer. Ask questions one at a time. If a question can be answered by exploring the codebase, explore the codebase instead of asking.

Five non-negotiables from the original:
1. **Relentless.** Don't stop at the first reasonable answer. Keep going until there are no gaps or holes left in the knowledge.
2. **One question at a time.** Never dump a list of 10 questions. Ask one, get the answer, then ask the next based on it.
3. **Walk the design tree depth-first, resolving dependencies.** Each answer opens or closes branches. Follow the dependency order — don't ask about button color before knowing whether the surface exists.
4. **Always recommend an answer.** Every question carries Claude's recommended answer + a one-line reason, so Sean can confirm fast or correct. Never ask a bare open question with no default.
5. **Explore the codebase instead of asking when you can.** If the answer is discoverable from the repo (existing pattern, current route, model fields, installed lib version), go find it — don't make Sean answer what the code already says. This also honors rule 49 (no manual code inspection by Sean) and rule 18 (existing-pattern-first).

### The values ladder (go deeper, tier by tier)

Sean's ask: *be more intricate, ask as many questions as it can.* A grill that stops at
"what should it do" has taken only the shallowest tier. Walk down until the answers stop
changing:

1. **Function** — what is it, what does it do, who uses it? *(the shallow tier; most grills
   wrongly stop here)*
2. **Intent** — what is it FOR? What does success look like a month after it ships?
3. **Priority** — when two goods conflict here, which one wins? *(values begin at this tier;
   make him actually choose)*
4. **Refusal** — what would make you kill this? What must it never do, even if it works?
5. **Taste** — offer two *acceptable* answers and ask which is **better**, and why. The why
   is the value; the choice alone is not.
6. **Precedent** — is this the same call you made on <other surface>? If not, what makes
   this one different? *(catches inconsistency and surfaces the real underlying rule)*
7. **Transfer** — "should this apply everywhere from now on?" A yes promotes it to the
   values corpus and it never has to be asked again.

Tiers 3–7 are what the extra questions buy. **Tier 7 is the compounding step:** every yes
permanently removes a future question, which is how the interview gets cheaper over time
instead of more expensive.

### Start at the vision tier, then descend

The top of the design tree is always **purpose**, not pixels. Before any "how should this look / behave" question, establish:
- **What is this?** What is the app / feature / component actually *for*?
- **What is it supposed to do?** The job it does for the user, trainer, or admin — the next-best-action it drives (ties to rule 62 Best-in-Class strategy and the Product Core Loop).
- **Where does it sit?** Is this the **parent** (the page/app-as-a-whole) or a **child** of a larger surface? What are its sibling and child components?

Only after the purpose and placement are clear do you descend into hierarchy, layout, data, states, and motion. Resolving the vision tier first is what lets Phase 2 give suggestions that fit the whole instead of optimizing an isolated box.

### Holistic awareness (feeds Phase 2)

While grilling, build a real picture of the **whole**, not just the one component, by exploring the repo (rule 49 — find it, don't ask Sean to read code):
- **Parent component** — the surface this lives inside (the page, dashboard, or app shell). What does it already do? What does it own vs. delegate?
- **Children components** — what this piece will contain or compose. Where do they get data, and do they duplicate facts the parent already shows (rule: no duplicated facts across cards)?
- **App-as-a-whole** — how this fits the Product Core Loop (log → save → chart → next action → share) and the four dashboards (user/trainer/admin). Pull from `CLAUDE.md`, the relevant reference doc, and the Best-in-Class strategy.
- **Existing context + vision** — read any brainstorm doc, reference doc, or handoff that already covers this area so Phase 2 suggestions build on the established vision instead of contradicting it.

This is the context that makes Phase 2's suggestions credible: grill-me can only recommend "fewer clicks here" or "this feature is missing" if it understands the parent, the children, and the loop they serve.

### Optional: the top-builder lens (and when to hand off to Chromie)

Sean can ask grill-me to interview him **through the lens of the world's top application builders** — "grill me like Zuckerberg" / "interview me like a top founder." When that lens is on, keep grill-me's job (extract Sean's vision/taste) but sharpen the questioning: hunt harder for the assumption he hasn't examined, and push back on vague answers instead of accepting the first reasonable one ("that's half an answer — give me the specific scene"). Default panel if Sean doesn't name names: Zuckerberg / Gates / Altman (swappable).

Know the boundary, though — this lens is still **extraction**, not strategy pressure-testing:
- If the question is *"what does Sean want / what is this / how should it feel,"* that's grill-me (with or without the lens).
- If the question becomes *"will this actually win — PMF, moat, monetization, what kills it,"* that's **`chromie`**, the dedicated CEO pressure-test (founder panel, hostile pushback, spec + 3 ways it fails + absence-first gap ranking). Hand off: finish capturing the vision here, then say *"the vision's captured — want me to run Chromie to pressure-test whether it wins before we plan?"*

Order stays: Rule 78 environment preflight -> Wayfinder only for multi-session material fog -> grill-me (intent) -> chromie (strategy, if the bet is unproven) -> swan-orchestrator -> swan-design-router (if UI) -> build -> closeout.

### Visual-taste mode (when the unresolved question is what Sean's eye wants)

A **mode of grill-me**, not a new skill and not a new pipeline edge. Full protocol: `docs/ai-workflow/design-brain/taste-discovery-grill.md` — load it when this mode fires. The short form:

1. **Three verbal questions, one at a time, none led.** Q0 *"pick 2–4 things you've shipped or kept and would ship again — what must a new direction share with them?"* · Q1 *"web, still image, or film — and where does it live (hero / module / film title / substrate)?"* · Q3 *"what must this never be, in your own words?"* No "Recommended: <Swan's self-portrait>" openers; a recommendation may follow his answer and is then logged as shown. Q2/Q4/Q5/Q6 from the GPT review are retired — they were brand recitation.
2. **Then pictures.** Say: *"I have enough context to stop guessing with words. Open `http://127.0.0.1:7331/probe` and judge two or three grids — up to three closest and three miss per grid, nothing forced; lock one reason, then the label shows. Tell me when you're done."* Wait. Do not narrate, do not poll images.
3. **Then read the compiler, present three directions.** `curl -s http://127.0.0.1:7331/api/profile` → present counts (reasons, subjects, provenance) as numbers, then the three `directions` each prefixed with its tier in caps — `[EVIDENCE]` (his picks, event ids cited, sample prompt = the picture he chose) or `[PRIOR]` ("from themes.md — not yet backed by your picks") — then the *proposed* avoids, then ONE question: which direction to build from, or more grids. Hand the chosen direction to `swan-design-router` (web), the Forge / Prompt Studio (still), or the cinematic skill (film), and record it + its `evidenceEventIds` in the brainstorm doc.

**Hard limits (panel law):** agents read IDs and tallies, never image bytes; never open `taste/events/*.jsonl`; never write `themes.md` / `rejected.md` / `loved-srefs.md` / `kept.md` — the probe page is the only writer and Sean is the only author. Present a `prior` as a prior. Done floor: ≥8 non-neutral judgements across ≥2 grids; there is no "model confidence" to stop on.

### How to ask in Claude Code
- Use the **`AskUserQuestion` tool** when the question has discrete, mutually-exclusive options (it gives Sean tap-to-answer chips and renders option previews for UI/layout choices — use the `preview` field for ASCII mockups or code snippets when comparing concrete artifacts).
- Use **plain chat, one question per message** when the question is open-ended ("walk me through how you think about X"). Still lead with your recommended answer.
- Batch is forbidden. The discipline is one decision resolved before the next is raised.

## Checkpointing (Nate Herk's addition — MANDATORY)

The danger in a long grill (they can run an hour+) is the context window filling and Claude misremembering early answers. So **every answer is checkpointed to disk immediately.**

- Brainstorm docs live in **`docs/ai-workflow/brainstorms/`** (NOT repo root — honors rule 35 root-minimalism; this is the one deviation from the original skill, which used project root).
- After environment preflight returns a safe workspace, create the doc: `docs/ai-workflow/brainstorms/<kebab-topic>-<YYYY-MM-DD>.md`. The current date is provided in session context; use it and never create the file before preflight.
- **After every single Q&A exchange, append to the doc.** Do not wait until the end. The doc is the source of truth, not the chat scrollback.

### The values corpus (durable, front-loaded, compounding)

Brainstorm docs are per-topic and dated; they expire. **Values must not.**

Anything that clears tier 7 ("yes — apply this everywhere") is promoted to
`docs/ai-workflow/references/SWAN-VALUES-CORPUS.md` — a short standing document agents read
as *direction*, not as a rule list. It is the layer that has to survive lost-in-the-middle,
so it stays tight: one line per value, grouped, no ceremony.

Format: `- **<value>** — <one line>. *(<date>, from <topic>)*`

Promotion rules:
- **Only tier-7 answers.** A slice detail never enters the corpus.
- **Merge, do not append blindly** — if a new value sharpens an existing line, rewrite that line.
- **A contradiction is escalated, never overwritten.** If a new value conflicts with an
  existing one, surface it to Sean and let him arbitrate; usually it means the older line
  was over-general.
- **Never add a discipline** — a procedure, report shape, or ceremony. Those belong in a
  deterministic gate, or nowhere.
- The corpus is capped by usefulness, not by size: if a line is never acted on, it was a
  preference, not a value. Cut it.

### Brainstorm doc structure

```markdown
# Brainstorm: <Topic>

**Date:** <YYYY-MM-DD>  ·  **Status:** in-progress | complete  ·  **For:** <surface / skill / feature this feeds>

## Summary
<2-4 sentence plain-English statement of what we're building and why, updated as it sharpens.>

## Key Decisions
- <decision> — <one-line reason / Sean's rationale>
- ...

## Q&A Log
### Q1: <question>
- **Recommended:** <Claude's recommended answer + reason>
- **Sean's answer:** <verbatim-ish capture of what Sean decided>
- **Implication:** <what branch this opened/closed>

### Q2: ...

## Key Highlights
- <the load-bearing insights worth remembering across sessions>

## Architecture Notes (parent / children / whole)
- **Parent surface:** <the page/dashboard/app shell this lives in — file:line if known>
- **Children / composed parts:** <sub-components, where each gets its data>
- **Fit with the Product Core Loop / dashboards:** <how this serves log→save→chart→next-action→share>

## Suggestions & Enhancements (Phase 2 — grill-me's recommendations)
- <feature that's needed but not yet in Sean's plan + why it strengthens the loop/strategy>
- <gap or risk grill-me sees in the current plan>

## Minimal-Click Opportunities
- <specific place the experience can be reduced to fewer taps/clicks, with the before→after click count>

## Open Flags
- [ ] <thing Sean doesn't know off-hand / needs to get from a stakeholder / needs to look up>
- [ ] <unresolved dependency to revisit>
```

The **Open Flags** section is important: when Sean can't answer something off-hand ("I'd have to ask the operator who runs that" / "I need to check the real numbers"), don't block — flag it, keep going, and tell him to bring the info back later to update the doc.

## Phase 2 — Synthesize & Advise (MANDATORY before closeout)

Once Phase 1 has captured the vision and the design tree is resolved, **stop recording and start advising.** Step back to the whole-system view and produce, in the brainstorm doc + in chat:

1. **What's needed but not yet planned.** Given the stated purpose and how it fits the app-as-a-whole, name the features/states/flows that are missing from Sean's plan. Tie each to *why* — the Product Core Loop, the next-best-action, the Best-in-Class strategy gate (rule 62), or a known dashboard priority. Don't invent scope for its own sake (rule: surgical) — surface what genuinely strengthens coaching, adherence, progress proof, community, revenue, or trust.
2. **Minimal-click enhancements.** For every flow discussed, ask "can this be fewer taps?" Sean's standing mandate is least-clicks / least-time / easiest-to-use. Call out concrete before→after click reductions (e.g. "log a set: 4 taps → 2 taps via inline quick-add").
3. **Parent / children / whole observations.** Based on what you saw of the parent component and its children, flag: duplicated facts across cards, a child that should be promoted to the parent (or demoted), a missing shared state, or a place where the app-as-a-whole would feel more coherent. This is the "sees the parent component to the children components as a whole" lens Sean asked for.
4. **Recommendations that may tune the plan, the build, or the skills themselves.** If the synthesis reveals the build plan should change, say so. If it reveals a reusable pattern worth folding into a reference doc or another skill — including this one — propose it (apply only on Sean's yes, per closeout).

Phase 2 output is **advisory** — Sean accepts, modifies, or rejects each suggestion. Capture his verdicts back into the doc so the next session knows what was adopted vs. declined.

## Stopping condition

Stop when **the design tree has no unresolved branches, no open holes that block planning, and Phase 2 synthesis has been delivered and reacted to** — i.e., you and Sean share the same mental model *and* he has seen grill-me's suggestions. This might be 5 questions or 30. It is Sean's call when it's "good enough." Before declaring done, ask explicitly: *"I think we have shared understanding on X, Y, Z, and here are my Phase 2 suggestions. Anything you want to grill further, or any suggestion you want to adopt, before I write this up?"*

## Closeout — propagate the knowledge (MANDATORY)

When the grill ends, do the thing Nate's version does at the end:
1. Set the doc `Status: complete`.
2. **Scan for related skills and docs that this new knowledge should improve** — e.g. a CLAUDE.md reference doc, an existing skill, a design system note, a strategy doc. Name them with file paths.
3. **Promote every tier-7 answer to `SWAN-VALUES-CORPUS.md`** (merge, don't append blindly;
   escalate contradictions to Sean). This is the step that makes grilling compound.
4. **Offer to update them** ("I notice this nuance isn't in `<file>` — want me to fold it in?"). Apply only with Sean's yes.
5. Hand off to the next gate: if this feeds a build, the next step is `swan-orchestrator` → recursive plan (rule 15) → `swan-design-router` (if UI). State the next slice (rule 60).

## Re-grilling

Brainstorm docs are durable. Later, Sean can say "grill me again on <topic>, here's what's new" — read the existing doc, grill only the deltas, append new Q&A, and re-run the closeout propagation.

## Integration with the SwanStudios operating system

- **Order:** Rule 78 environment preflight -> Wayfinder only for multi-session material fog -> grill-me -> swan-orchestrator -> swan-design-router (if UI) -> build -> closeout-evidence-lock.
- **Standalone, not a design sub-skill.** `swan-design-router` is a *downstream consumer* of
  grill-me, not its parent. Grill-me is invoked for backend, schema, pricing, copy, content,
  game/lore, ops and brand work exactly as readily as for UI. Rule 40 routes *design* through
  the router; it does not route *intent* — intent is always grill-me's.
- **Feeds the Direction layer.** The values corpus is the short, front-loaded context agents
  read first. Everything enforceable belongs in a gate; everything narrative belongs in the
  learning corpus; what grill-me produces is the third thing — direction and taste.
- **Feeds rule 15:** recursive planning is only as good as the intent behind it. Grill-me is the intent layer that makes the plan match Sean's head.
- **Honors rule 49:** answer from the codebase, not by asking Sean to read code; build a launcher if a structural question comes up mid-grill.
- **Honors rule 62:** for product/UX/roadmap topics, the grill questions should pull on the Best-in-Class strategy gate (next-best-action, first-party record, activation loops, monetization, privacy).
- **Zero PII (rule 8):** brainstorm docs are committed to the repo. Do not write real client names, medical/immigration/PII, or secrets into them — use IDs/roles.

## Non-goals
- Does not write production code.
- Does not *make* decisions for Sean — Phase 1 extracts his, Phase 2 *suggests*; Sean accepts/modifies/rejects every suggestion.
- Does not invent scope for its own sake — Phase 2 suggestions must strengthen coaching, adherence, progress proof, community, revenue, or trust (rule 62), or be cut.
- Does not replace recursive planning — it precedes and informs it.
- **Does not produce an implementation blueprint.** Large persisted authoritative plans are
  the waterfall trap (Bob Martin, adopted 2026-08-25). Grill-me's product is values and
  intent; the *how* is decided at build time against the real code.
- Does not promote a slice detail into the values corpus — tier-7 transfer only.
- Does not auto-update other skills/docs/plans without Sean's explicit yes.
