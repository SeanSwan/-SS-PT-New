# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-20T00:00:00Z
- **Slice:** CI guards were wired to NOTHING — fixed (`37e4fcbac`); 3 hostile reviewers in flight

## What I did / learned
- **Self-review gap, worth remembering as a failure CLASS:** the Swan Lens "entropy firewall"
  (`scripts/ci/check-degalaxy.mjs`, `check-token-discipline.mjs`) and the gate-parity contract shipped as
  `package.json` scripts referenced by **no GitHub workflow, no git hook, and not the Render build**. They only
  ran if a human typed `npm run lint:swan-lens`. Three hostile-review passes never caught it because every
  reviewer was scoped to whether the code was CORRECT, never whether it was CONNECTED.
  **Lesson: "is this guard actually invoked by something automated?" is a distinct review question from "is this
  guard correct." Ask it explicitly for every quality gate, test, and hook we ship.**
- **Fixed:** `.github/workflows/swan-lens-guards.yml` — runs on push/PR touching `frontend/src`, `scripts/ci`,
  or `package.json`. Enforces (1) retired Galaxy-Swan palette block, (2) no bare hex outside a `*.tokens.ts`
  bridge, (3) the Gate Rule contract test. The two scanners are dependency-free so they run BEFORE any npm
  install and cannot be broken by a dependency issue; only the vitest contract needs frontend deps.
- Verified before commit: YAML parses (7 steps), `frontend/package-lock.json` exists so `npm ci` is valid,
  workflow Node 22 matches the local runtime, and all three commands pass locally today.

## State right now
- Local commits ahead of deployed code. **Render deploys are FAILING (their infra, not ours)** — see the prior
  memo: two different lanes failed identically in ~60s with Render's "internal system error, our team has been
  notified"; our frontend builds clean locally in 21s; production is UP (HTTP 200) on the last good deploy.
  Net effect: everything recent is on `main` but NOT live. All flags still dark, so no user impact.
- Three hostile reviewers running (results not yet in): (a) Wave-1 foundation/scanners hunting FALSE NEGATIVES,
  (b) post-pass-3 edits incl. the contact-form prefill which touches the LIVE lead path, (c) absence-first
  vision-gap analysis ranked by money at risk.

## Sean owes / blockers
- Render: retry the deploy once their incident clears; nothing recent is live until then.
- Render MCP is NOT configured (only playwright/linear/mobbin + 4 unauthenticated claude.ai connectors). Adding
  it needs HIS API key, and it must NOT go in the repo `.mcp.json` (that file is TRACKED IN GIT). Note the grant
  scope before authorizing: Render's MCP can trigger deploys, **update ALL env vars for a service**, and query
  the production DB.
- Still unanswered: whether I take over Lane-A activation (the emitter side, other lane's territory) — it
  remains the blocker on realizing any value from the 7 dark surfaces.
