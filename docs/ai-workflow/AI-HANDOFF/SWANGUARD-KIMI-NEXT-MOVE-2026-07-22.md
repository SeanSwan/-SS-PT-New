# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** <HOME>\AppData\Local\Temp\claude\<SCRATCH-KEY>\fe778a8f-f18a-42e8-9876-fedbce2ec1d7\scratchpad\swanguard-next-move-kimi.md
**Seed:** (none)
**Tokens:** 1477 in / 1952 out · **Cost:** ~$0.0337 · **Wall:** 79.6s

---

**VERDICT: Do NOT build anything new until you've merged the shell and deployed a demo-mode staging URL this week — then build exactly one feature: the Daily Brief with Next-Best-Action, running on real Postgres with one real data source, because "deployed demo" gets you legitimacy in days while "real daily brief" gets you a daily habit.**

---

## 1. Sequencing to production — the critical path

The order everyone instinctively wants (perfect the backend, then deploy) is wrong. The correct critical path is **two parallel tracks that converge once**:

**Track A — Ship the shell (days, not weeks):**
1. **Codex re-review of the shell branch** — including the 9 entangled auth/DB/security commits (P0-A). Do NOT try to surgically separate them; the shell is built on them, separation is churn, and they'll be reviewed anyway. Review them *as a bundle*.
2. **Fix only P0/P1 findings.** Defer everything else to a backlog issue.
3. **Merge to main.** Main must become the deployed branch. A 24-commit/288-file branch that never merges is your single biggest existential risk.
4. **Deploy the frontend to Render/Vercel in demo mode.** `VITE_SWANGUARD_API_MODE=demo` is a feature here, not a shame — it means you can have a live URL, clickable by Sean and anyone he shows, with zero backend dependency.

**Track B — Stand up the backend (starts same day, parallel):**
1. Provision Postgres (Render managed PG or Neon — cheapest credible option).
2. Run migrations + smokes against it. This is where the 9 commits get their *real* test — not in review, but in execution.
3. Deploy `apps/api` with real auth. One seeded owner account. No multi-user yet.
4. Flip the frontend env var to `live` in a **staging** environment only. Keep demo as the fallback mode.

**Convergence gate:**
5. **Live authed QA pass** — replay the 4 hostile-review journeys (kill switch, lockdown, revoke, ⌘K to owning control) against the real backend. This is the only test that matters for "working production."
6. Flip production to live mode. Demo mode remains a toggle for demos/sales.

**Critical path summary:** Codex re-review → merge main → deploy demo frontend (Sean's first "it's real" moment) → backend/DB/auth live → live authed QA → live mode in prod. Track B is the long pole; start it the same day the re-review starts, not after.

## 2. The single highest-value thing to build next

**The Daily Brief with a Next-Best-Action (NBA) card — real, generated nightly, delivered to Today.**

Here's the logic: the trust spine (kill switches, approvals, receipts) is *reactive* infrastructure — you touch it when something's wrong. Nobody opens a reactive app every morning. The brief is the only *proactive* surface — it's the reason to open SwanGuard at 7am, and it's the surface where trust gets *demonstrated* rather than just stored.

The slice, concretely:

- **One generation job** (nightly cron on apps/api) that assembles the brief from *one real data source* to start — civic/readiness data is the right pick (it's the stated intel pillar, doesn't require family-member consent plumbing, and fails gracefully).
- **Brief = 3–5 items, each with a "so what" and one recommended action.** Not a data dump — the NBA is the differentiator. "School board meeting Thursday includes agenda item X → here's a 60-second summary → [Add to calendar] [Read source]."
- **Every item carries a receipt** — source, timestamp, why it was surfaced. This is where the trust engine and the brief fuse: the brief isn't just content, it's *auditable* content, which is SwanGuard's entire thesis versus any news app.
- **One-tap actions that write through the real mutation path** (the write-then-reload honesty you already built). First real end-to-end loop: data in → brief → action → receipt → visible tomorrow.

Build nothing else until one real human opens this three mornings in a row. That's your activation metric.

## 3. Backend reality check — gating or not?

**Both are true, in sequence — and that's why the two-track answer matters.**

- The backend is **NOT** gating for "deployed and clickable." Demo mode already proves the entire shell, and a live demo URL unblocks Sean's psychology ("it's real"), stakeholder demos, and visual/UX QA by real humans. That can happen within days of merge.
- The backend **IS** gating for "working production" in the only sense that matters: authed, persistent, real-data. There is no demo-mode path to a family trusting this app. Demo mode is a bridge, not a destination — cap it at 2–3 weeks of being the only deployed thing, or it becomes a comfortable graveyard.

So: **demo-mode-first deploy, backend-live fast-follow, with an explicit date gate.** If the backend isn't live within ~3 weeks of the demo deploy, treat that as a P0 project emergency, not a backlog item.

## 4. What to explicitly NOT build yet

- **The iceboxed modules (Creator/Marketplace/Impact).** They were iceboxed correctly. They stay iceboxed until the daily-brief loop has real usage. Do not even style their "More" disclosure states.
- **More than one data connector.** The temptation will be "civic + influence + comments all at once." One source, proven end-to-end, receipted. The second connector is cheap *only because* the first one built the pipeline.
- **Operator/Hermes bridge and operator grants.** This is multi-actor trust machinery. v1 has exactly one actor: the owner. Multi-user auth, grant flows, and approval queues are a v1.5 problem and will 3x your auth/security surface area for zero morning-habit value.
- **New themes, palette features, or any shell polish.** The shell is done and verified. Every hour there is an hour stolen from the brief loop. Freeze the shell except for P0/P1 review fixes.
- **Mobile-native anything, notifications/email digests.** Even "email me the brief" — seductive, but it's a second delivery surface with its own infra. In-app brief first; email digest is the *first* thing you add after the habit is proven, because it's the retention lever.

## 5. Three biggest risks, ranked, with guardrails

**Risk 1 — The merge/review quagmire: the 9 entangled commits turn into a multi-week security review spiral and the branch never lands.**
The shell is hostage to commits nobody fully owns. *Guardrail:* timebox the Codex re-review to a fixed window (one week), define P0/P1 exit criteria in writing *before* the review lands, and merge with P2s filed as issues. If review stalls past the timebox, escalate to a human security pass on just the auth/migration diffs — do not let perfect be the enemy of merged. A merged branch with tracked debt beats a pristine orphan.

**Risk 2 — Demo-mode comfort: "deployed" gets declared victory and the real backend/data path never gets finished, so the app never crosses from impressive shell to trusted tool.**
This is the quiet killer — the demo is *good enough to show off*, which drains urgency. *Guardrail:* the date gate from Q3 — a public "live-mode flip" date set at merge time, tracked as a milestone, with the daily-brief build directly on the critical path to it. Also: seed real data into the brief pipeline even before auth is perfect, so the flip is a config change, not a project.

**Risk 3 — Scope seduction post-deploy: the first thing users/Sean ask for after seeing the shell will be the shiny stuff (iceboxed modules, more themes, more connectors), and the brief loop never gets its uninterrupted build window.**
*Guardrail:* a written v1 charter — one sentence: *"One owner opens the daily brief every morning and acts on it."* Every request gets tested against it. Ship the brief loop with one connector behind a feature flag, prove the 3-mornings-in-a-row metric, *then* earn the right to un-icebox anything. The 4-round hostile review discipline you applied to the shell — apply it to scope, because scope is the defect class that kills v1s.

---

**Bottom line for Sean:** merge the shell within a week, deploy demo-mode same-day-after-merge for the "it's real" win, and put all build energy into the real-data Daily Brief + Next-Best-Action with receipts. That's the move from "great branch" to "app a family opens every morning" — and everything else is a distraction until three consecutive mornings prove it.
