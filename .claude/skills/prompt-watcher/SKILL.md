---
name: prompt-watcher
description: Per-prompt intent amplifier. Classifies every prompt Sean submits as SIMPLE (instruction, question, correction, status) or VISION (an idea he's trying to bring into reality). Simple prompts pass straight through untouched — zero token waste. VISION prompts get analyzed against the project vision for gaps Sean may have missed and features that would strengthen the idea, then silently rewritten into a sharper, more detailed prompt — and the AI acts on that enhanced prompt automatically, no confirmation step. Sean only sees the enhanced prompt if he asks for it. Fires on every prompt via a UserPromptSubmit hook that injects a tiny classifier reminder; this full skill only loads when the prompt is VISION. Goal: every idea Sean gives lands as the best possible prompt, with the fewest clicks.
---

# Prompt Watcher

**Role:** make every prompt Sean presses enter on as good as it can be — without making him do extra work or burning tokens on prompts that don't need it.

> Sean: "I want every prompt I give to be the best that it could possibly be." But: "look at the CLAUDE.md and AGENTS.md files only if necessary because we are trying to save tokens — we're not trying to go token heavy."

## How it fires (hook + skill, token-economical)

A `UserPromptSubmit` hook injects ~2 lines on every prompt: *"Classify this prompt SIMPLE vs VISION. If SIMPLE, proceed normally — do NOT load prompt-watcher. If VISION, load `.claude/skills/prompt-watcher` and run it before acting."* That always-on cost is tiny. **This full skill only loads when the prompt is VISION** — so the heavy analysis never runs on a simple instruction.

## Beep-boop marker (Sean 2026-06-18 — visibility)

Sean couldn't tell when this skill was actually firing ("it burns in the background but I should get just a quick little beep boop so I know it happened"). So **every reply now opens with exactly ONE marker line**, then the normal answer:
- VISION (skill engaged + prompt silently enhanced): `🔊 beep boop — prompt-watcher: VISION`
- SIMPLE (skill not loaded): `🔉 prompt-watcher: SIMPLE`

One line only, never more — the enhancement itself stays silent (reveal the enhanced prompt only if Sean asks). The marker is observability, not a confirmation gate.

## Step 1 — Classify (do this first, every time)

Decide SIMPLE vs VISION from the prompt itself. Bias toward SIMPLE when unsure — a false VISION classification wastes Sean's time; a missed VISION just means a normal response, which is the status quo.

**SIMPLE → pass through untouched, respond normally. Do not enhance, do not announce.**
- A direct instruction on existing work ("commit this," "run the tests," "go," "next slice," "yes," "fix the typo on line 12").
- A question ("what does this function do?", "is the deploy live?").
- A correction or clarification ("no, I meant the trainer dashboard").
- A status/continuity nudge ("log this and close").
- Anything short and operational where the intent is already complete.

**VISION → run Step 2. These are ideas Sean is trying to bring into reality:**
- "I want to build / add / create \<thing\>…"
- "What if we \<new capability\>…", "I have an idea for…", "we should make a \<feature/page/system\>…"
- A described experience or outcome with the *how* still open ("I want users to be able to express themselves artistically on their profile").
- Anything where Sean is describing a destination and trusting the AI to help architect the path.

The tell: SIMPLE prompts have complete intent; VISION prompts have a goal with unfilled design/scope/feature space behind it.

## Step 2 — Analyze the VISION prompt (token-disciplined)

Vision is already in context from session start (CLAUDE.md + AGENTS.md load at boot). **Do NOT re-read them.** Only open a *specific* reference doc or code file if a concrete gap check genuinely needs it (e.g. the prompt touches monetization → glance at the Best-in-Class strategy gate; touches an existing surface → confirm the canonical file). Default to reasoning from what's already in context. Sean's standing rule: don't go token-heavy.

Run three lenses, briefly:
1. **Gaps Sean may have missed** — given the stated idea + the project vision (Product Core Loop, the four dashboards, rule 62 Best-in-Class strategy, the active theme/standards), what did the prompt leave unspecified that will *have* to be decided to build it well? (states, edge cases, data source, where it mounts, mobile, the next-best-action it serves.)
2. **Features that strengthen the idea** — what small additions go *with* Sean's idea and amplify it toward coaching / adherence / progress-proof / community / revenue / trust? Surgical only — no scope invented for its own sake (rule 3, rule 62).
3. **Sharper framing** — restate the idea as the prompt Sean *would* have written if he'd had all the context loaded: concrete, scoped, naming the surface/loop it serves and the least-clicks bar.

## Step 3 — Act on the enhanced prompt automatically (silent by default)

Sean's directive (2026-06-11): **don't show the enhanced prompt and don't wait for confirmation — just use it.** Take the rewritten, sharper version and start working on it immediately, the same way you'd act on any prompt. No "here's what I changed, approve?" round-trip — that's the click and the tokens he's cutting.

- **Retain the enhanced prompt for the turn** so it can be revealed on request. Keep it in working context (do NOT write a file every prompt — that's token waste). If Sean asks *"what prompt did you use,"* "show me the enhanced prompt," "what did you change," etc., print the enhanced prompt + the gaps filled + features added. Only on request.
- **Reveal-anyway exceptions (standing safety, not a confirmation gate):** if enhancing the prompt would commit a hard-to-reverse or outward-facing action Sean didn't clearly authorize (delete/overwrite data, push, send something external, spend money, touch auth/billing/PII), surface the interpretation first — that's the global "confirm irreversible actions" rule, which prompt-watcher does not override. Likewise if the prompt is genuinely ambiguous enough that two very different builds are equally likely, ask one quick disambiguating question rather than guess expensively. For ordinary build/feature ideas, proceed silently.

The bar: silent-and-fast for normal idea-prompts; surface only when acting blind would be unsafe or wasteful.

## Step 4 — Route big visions to the real gates (don't one-shot a product)

prompt-watcher is a lightweight per-prompt amplifier, **not** a replacement for the interview gates. Silently enhancing and one-shotting a whole product is exactly the failure rule 64 exists to prevent. So if the enhanced prompt reveals the idea is actually a **net-new component/page/feature/system or an unproven bet**, the correct *action* to start is the right gate (this isn't a confirmation step — invoking the gate IS acting on the prompt):
- **Substantial creation** (net-new feature/component/page/system/design, OR a meaningful upgrade/redesign) → run **`create-with-context`** (rule 76): GROUND in a real audit → ENHANCE → pull an EXPERT brain (Kimi K3 for design) as CONTEXT → **Claude AUTHORS** the synthesis → present blueprint + build with proof. The expert is context, never the author.
- Net-new surface / needs Sean's taste & vision captured → start **`grill-me`** (rule 64), which feeds `create-with-context`.
- Unproven bet / "will this win" / monetization / roadmap → **`grill-me` then `chromie`** (rule 65).
- Then the normal pipeline (`swan-orchestrator` → `swan-design-router` if UI → build → `closeout-evidence-lock`).

For genuinely small idea-prompts, silent enhance-and-build is enough and faster than spinning up a full grill. Use judgment: the bar for routing to a gate is "this is bigger than one prompt's worth of building." Routing to grill-me/chromie is not the same as the (removed) confirmation step — it's choosing the right tool to act with.

## Guardrails
- **Token discipline (Sean's explicit ask):** SIMPLE prompts cost nothing extra; VISION analysis reasons from in-context vision and only opens a specific doc when a real gap check needs it. Never bulk-reload CLAUDE.md/AGENTS.md. The silent-act design (no confirmation round-trip, no enhanced-prompt printout unless asked) is itself a token + click cut Sean chose 2026-06-11.
- **Act silently by default; reveal on request** (Step 3). The only pre-act surfacing is the standing irreversible/outward-action safety rule + genuine build-ambiguity — not a general confirmation gate.
- **Surgical (rule 3):** added features must genuinely serve the idea + the Swan strategy, or be cut. Don't pad — a silently-enhanced prompt that smuggles in scope Sean didn't want is worse than no enhancement.
- **Honors the existing gates** — prompt-watcher feeds grill-me/chromie/orchestrator, it doesn't bypass them.
- **Privacy (rule 8):** if a prompt contains PII, don't echo it into any committed artifact.

## Non-goals
- Not a replacement for grill-me/chromie — it's the front-door amplifier that routes to them when the idea is big.
- Does not fire its heavy analysis on simple prompts — that's the whole token-economy design.
- Does not silently rewrite-and-run — Sean confirms the enhanced prompt first.
- Does not invent scope — amplifications must strengthen coaching/adherence/progress/community/revenue/trust.
