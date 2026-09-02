---
name: learning-drop
description: Teach Sean one valuable thing at every commit/closeout. Emits a single short "📚 Learn" snippet tied to the work just done, ranked by real market value (AI engineering first), grounded in Sean's actual stack. Self-refreshing curriculum. Use at every substantial task close, every commit, or when Sean says "teach me", "learning drop", "/learning-drop", or "refresh my curriculum".
---

# Learning Drop — Sean learns something every single commit

**Why this exists (Sean, 2026-09-01):** "Every single commit, every single thing we do,
I should be learning something that's valuable… based off of what the most popular
reputable sites are saying the trend is… so I can always be learning and staying on
track so I can always never be poor. My family is number one."

The job: never let a commit pass without leaving Sean measurably smarter in a
direction the market actually pays for.

## The learner (default profile — the baseline every snippet builds on)

Sean Swan. Full-stack JavaScript/React developer (Redwood Code Academy 2017 + MIT CS
online — trained, not "self-taught"). Works for himself by choice.

- **Core stack he knows:** React 18, JavaScript/TypeScript, styled-components,
  Node.js + Express, Sequelize + PostgreSQL, Vite, CSS Grid + Flexbox, Git,
  REST APIs, Render deploys.
- **Creative stack:** Premiere Pro, Photoshop, Luminar, CapCut/DaVinci, Seedance/
  ComfyUI video generation, Midjourney.
- **Domain:** 26+ years personal training (NASM-protocol); solo founder of a
  production fitness SaaS; runs a multi-agent AI dev operation daily.
- **Goal:** durable income — leverage, not employment. Family first.

Do NOT scrape LinkedIn (login-walled; private-context rule). This profile IS the
source of truth; when Sean's skills change, he says so and this section gets updated.

## Curriculum priority stack (refreshed 2026-09-01, from Jan-2026 industry knowledge)

Ranked by market value × fit to Sean's base. Higher = teach more often.

1. **AI engineering (the sector, specifically):** agentic systems — tool use, MCP
   servers, multi-agent orchestration, evals/verification, context engineering
   (what to put in a model's window and why), prompt design as an engineering
   discipline, guardrails + spend control, when RAG is and is NOT the answer.
   This is the highest-demand, highest-paid skill adjacent to what Sean already
   does every day with Claude/Codex/Hermes — he is living inside the lab.
2. **TypeScript depth:** discriminated unions, generics, typing real API
   boundaries — the #1 hiring filter on top of React.
3. **Modern React & web platform:** performance profiling, Suspense/lazy patterns,
   server-component awareness, accessibility — plus CSS he'll actually use.
4. **Data & backend:** PostgreSQL fluency, schema design + migrations (this repo's
   own recurring bug class is schema drift — turn every drift fix into a lesson),
   API security (OWASP top 10), auth patterns.
5. **Ops-lite:** CI, deploy health, monitoring, backups (the vault/bundle work is
   teachable material).
6. **Business leverage:** SaaS pricing, retention metrics, distribution, positioning
   — "never be poor" is an income-durability goal, so money lessons count as
   learning, same as code.

## How to emit a drop (every commit / substantial closeout)

ONE snippet, at the end of the closeout report. Format:

```
📚 Learn — <category tag, e.g. AI-eng / TypeScript / Postgres / Leverage>
<2–5 sentences: the concept, why the market values it, and how it showed up in
the work we JUST did — always anchor to today's real code/decision when possible.>
Try: <one ≤5-minute action: a thing to read (official docs preferred), a command
to run, or a question to ask me next session.>
```

Rules:
- **One per turn, max.** A firehose teaches nothing; the constraint is the feature.
- **Anchor to the actual work.** A snippet about the hook we just wrote beats a
  generic tip. If the work suggests nothing, pull from the highest-ranked category
  not used recently.
- **No fluff, no hype.** Concrete mechanism > buzzword. Assume a smart dev who
  simply hasn't met this concept yet.
- **Log it.** Append one line to `docs/ai-workflow/learning-drops-ledger.md`:
  `YYYY-MM-DD | category | one-line topic`. Check the ledger first — never repeat
  a topic within ~30 days.

## Self-refresh (the skill keeps ITSELF current)

Monthly, or whenever Sean says "refresh my curriculum":
1. WebSearch reputable sources ONLY — official releases (React, TS, Node, Anthropic/
   OpenAI eng blogs), Stack Overflow Developer Survey, State of JS/React, Pragmatic
   Engineer — for what's rising in demand for a full-stack JS dev + AI builder.
2. Rewrite the "Curriculum priority stack" section above with a new date stamp.
   Edits are confined to THIS file + the ledger; constitution files change only with
   Sean's explicit ask.
3. Tell Sean in one paragraph what moved and why.

## Boundaries
- This teaches SEAN (operator learning). It is separate from Swan Guide / "Teach Me"
  (the in-app client-facing feature) and from Hermes learning packets (agent
  learning). Don't cross the streams.
- Privacy: snippets and ledger are committed — no PII, no client data, no secrets.
