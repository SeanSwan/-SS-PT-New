# QA Pipeline — Three-Layer Review & Verification

> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: planning a change that touches production code, configuring CI, choosing whether a change needs Codex cross-review, or evaluating whether to escalate to AI Village.

> **Disambiguation note.** This document defines the three-layer review/verification pipeline (deterministic tooling, AI cross-review, Village escalation); for workflow execution paths (Fast / Standard / Deploy), see `WORKFLOW-PATHS.md`.

---

## North star

The point of this pipeline is **catch errors at the cheapest layer**. Tier A is free per commit. Tier B is per-PR token cost. Tier C is ~$0.33/run paid. Order matters: a fix Tier A would have caught is wasted Tier B work, and a fix Tier B would have caught is wasted Tier C work.

**Anti-iteration rule:** every layer's job is to surface what the cheaper layer missed, not to re-run the cheaper layer's work.

---

## The three layers

| Layer | What it is | Cost | When it runs |
|---|---|---|---|
| **Tier A — Deterministic Tooling** | Static analysis, type checks, lint, secret scan, dependency audit, unit + E2E tests, CI gates | Free | Every commit, every PR — automatic |
| **Tier B — AI Cross-Review** | Claude implements ↔ Codex reviews (or vice-versa); rule 46 Codex Final Gate | Tokens per PR | Every non-trivial PR |
| **Tier C — AI Village (15-Brain)** | 11–13 parallel analysts + 2–3 specialty debates; permission-per-run | ~$0.33/run paid | Episodic, only on the reserved-trigger list below |

---

## Tier A — Deterministic Tooling (always-on)

### Tools (target state)

| # | Tool | Coverage | Status today |
|---|---|---|---|
| 1 | **Semgrep** + OWASP Top 10 / React / Node / TypeScript rulesets | Static security + correctness patterns | ❌ not installed |
| 2 | **`npm audit` + Dependabot** (`.github/dependabot.yml`) | Dependency CVEs + automated update PRs | ⚠️ `npm audit` implicit; no Dependabot config |
| 3 | **Secret scanning** (GitGuardian or trufflehog in CI) | Token / key / secret leaks | ⚠️ local pre-commit only; no CI side |
| 4 | **`tsc --noEmit`** with `strict: true` | Type correctness | ✅ `frontend/tsconfig.json:19` |
| 5 | **ESLint** + `eslint-plugin-security` + `eslint-plugin-react-hooks` | Code-pattern correctness + security lint | ⚠️ react-hooks present; security plugin missing |
| 6 | **Vitest / Jest** unit tests | Auth, payments, RLS, business logic | ✅ `frontend/package.json:106` + `backend/package.json:171` |
| 7 | **Playwright** E2E | Real-flow user journeys | ⚠️ used via MCP at session level; no in-repo `playwright.config.ts` |
| 8 | **GitHub Actions** PR-blocking CI matrix | Gates merges on the above | ⚠️ 2 workflows exist; no PR-blocking matrix |

Installation order, when wired (per the Tier 1 Tooling Gap Report this pipeline doc derives from):
1. `eslint-plugin-security` (lowest blast radius; ESLINT-SETUP.md is the existing DIY guide)
2. `.github/dependabot.yml`
3. PR-blocking CI matrix (`ci.yml`)
4. Semgrep CI step
5. trufflehog CI step
6. Playwright in-repo suite (cart-add / login / admin-viewAs smoke)

Tier A tooling installation is a **separate work slice**. Do not bundle it with this doc's introduction.

### Tier A discipline

- Tier A is **always-on**. A change that bypasses Tier A (e.g. `--no-verify` to skip pre-commit) is a CLAUDE.md rule violation unless Sean explicitly authorizes.
- Tier A finding = **fix in the same change**. Don't push and "fix in the next PR."
- Tier A flake (intermittent test failure) = **fix the test or the underlying flake**. Don't retry until green and ship.

---

## Tier B — AI Cross-Review (per PR)

### Contract

- One LLM (typically Claude) implements; the other (typically Codex) reviews. Rule 46 — Codex's APPROVE is the commit gate.
- Reviewer **must NOT** duplicate Tier A. If Tier A would have caught it (typo, type error, known CVE, basic input validation Semgrep rule, formatting), reviewer ignores it.
- Reviewer focus areas:
  - **Logic bugs** the type system can't see (off-by-one, wrong loop bound, wrong branch).
  - **Architectural drift** — pattern violations, abstraction leaks, layer crossing, dead surface introduction (e.g. orphaned components per Phase 18.C.1B.1R).
  - **Modularity** — file-size, function size, single-responsibility violations.
  - **Production-readiness** — error handling, empty states, race conditions, retry/idempotency, observability.
  - **Subtle security** — IDOR (path-param target ≠ authenticated user), business-logic auth bypass (correct middleware, wrong scoping), missing tenant scoping, TOCTOU windows (read-decide-write races; see Stripe webhook P0-L). These are categorically NOT Semgrep-catchable.
  - **Test coverage gaps** — does the new test actually exercise the new code path, or does it just run a happy path?

### Reviewer output tags

Every Tier-B finding carries exactly one tag:

| Tag | Meaning | Action |
|---|---|---|
| `[BLOCKING]` | Implementer must fix before merge. Identified bug, security gap, or contract violation. | Block merge until resolved. |
| `[RECOMMEND]` | Reviewer's preferred fix; reasonable alternatives exist. Implementer may push back with rationale. | Discuss; may merge with rationale. |
| `[NIT]` | Style / phrasing / non-functional preference. Reviewer is making a note, not a request. | Implementer may ignore. |
| `[ESCALATE TO VILLAGE]` | Reviewer is uncertain; the change touches a Tier-C trigger surface. | Sean decides Village run. |
| `[LGTM]` | No findings. Reviewed, nothing wrong. | Merge. |

`[LGTM]` is a valid output. Inventing findings to look thorough is a Reviewer Discipline violation (see `REVIEWER-DISCIPLINE.md` Rule 2).

### Implementer-reviewer asymmetry

- Implementer presents file:line evidence for the change. Reviewer cross-checks against repo state.
- Reviewer is allowed (and expected) to disagree. Implementer is allowed (and expected) to push back when reviewer's finding is wrong, with file:line proof.
- The doctrine in `REVIEWER-DISCIPLINE.md` applies to BOTH sides — review prose carries confidence tags too.

---

## Tier C — AI Village (episodic, reserved)

### Reserved triggers (the ONLY changes that justify Village run)

A change qualifies for Tier-C escalation if and only if at least one of these binary conditions is true. Each row is answerable yes/no via repo grep or `git diff --name-only` against the PR base — no interpretation needed.

**Trigger 1 — Auth or authz code path.** PR diff modifies any file matching:
  - `backend/middleware/auth*.mjs` (e.g. `authMiddleware.mjs`)
  - `backend/middleware/viewAsGuard.mjs`
  - `backend/middleware/requireTier.mjs`
  - `backend/middleware/requireSubscription.mjs`
  - `backend/controllers/authController.mjs`
  - `backend/routes/authRoutes.mjs`

  OR PR diff adds, removes, or modifies a call site of `protect`, `authorize(`, `authorizeResourceAccess(`, `requireTier(`, `requireAnyRole(`, or `adminOnly` / `trainerOnly` / `trainerOrAdminOnly` middleware. (Re-importing without changing call sites does not trigger.)

**Trigger 2 — Stripe payment or webhook code path.** PR diff modifies any of:
  - `backend/webhooks/stripeWebhook.mjs`
  - `backend/services/SessionGrantService.mjs`
  - `backend/routes/cartRoutes.mjs`
  - `backend/routes/v2PaymentRoutes.mjs`
  - `backend/routes/sessionPackageRoutes.mjs`

  OR PR diff adds/modifies any reference to `stripe.checkout.sessions.create`, `stripe.webhooks.constructEvent`, `stripe.refunds.`, `stripe.subscriptions.`, or `stripe.paymentIntents.`.

**Trigger 3 — Multi-tenant data scoping change.** PR diff adds or modifies a file under `backend/migrations/` OR `backend/seeders/` AND the change introduces, removes, or alters a column or foreign-key reference matching `userId`, `clientId`, `trainerId`, `tenantId`, OR creates/drops/alters a Postgres row-level-security policy (CREATE POLICY / ALTER POLICY / DROP POLICY). Pure index changes that do not touch scoping columns do not trigger.

**Trigger 4 — Sean-declared pre-launch hardening.** Sean explicitly invokes one of the following literal phrases (case-insensitive, must appear in the slice declaration or commit-prep message): `"pre-launch hardening pass"`, `"app-store readiness review"`, `"play-store readiness review"`, `"public-launch readiness review"`, `"Tier-C hardening"`. No other phrases qualify; if Sean says something close-but-not-listed, treat as Tier B and ask for confirmation that Tier-C was intended.

**Trigger 5 — Minor's-data code path.** PR diff adds or modifies any code reading or writing the User fields `dateOfBirth`, `age`, `parentEmail`, `guardianName`, `parentConsent`, OR PR diff modifies any file under `backend/middleware/age*.mjs`, `backend/middleware/coppa*.mjs`, or `backend/services/coppa*.mjs`, OR PR diff introduces a new check on `< 13`, `< 18`, or `< 16` against a user's age/birth-date field.

**Trigger 6 — Cross-service architectural change.** PR diff modifies code (not docs, not test fixtures) in 3 or more of these top-level dirs simultaneously: `backend/`, `frontend/`, `scripts/`, `gateway/` (Hermes-Pi when in scope), `.github/workflows/`. Pure documentation PRs (only `docs/`, `*.md`) do not trigger; pure test-fixture PRs (only `*test*` or `__tests__/`) do not trigger.

Anything outside this list = **Tier A + Tier B only.** The doctrine is to keep Village rare, paid, and reserved.

### Permission gate

Tier-C invocation requires **Sean's explicit per-run permission** (CLAUDE.md rule 16). A trigger above does NOT mean "auto-run Village." Trigger means "Sean SHOULD consider Village; surface the qualifying evidence and ask."

Cost framing: ~$0.33/run for the paid orchestrator (`scripts/validation-orchestrator.mjs`); $0/run for the free fork (`scripts/validation-orchestrator-free.mjs`) when its model swaps are acceptable for the surface under review.

### Tier-C output

Village output is informational; it does NOT replace Tier-B Codex Final Gate. Codex still APPROVES the commit. Village findings either get folded into the Tier-B review or surface as a separate fix slice.

---

## Anti-patterns (failure modes to avoid)

- **Tier inflation** — running Tier C for a typo fix. Burns $0.33 to find what `tsc` would catch for free.
- **Tier deflation** — shipping a Stripe webhook change with Tier A only. The webhook race lives outside `tsc`'s reach.
- **Layer duplication** — Tier B reviewer flagging Tier A items as `[BLOCKING]`. Wastes the cross-review budget on what CI would catch in 30 seconds.
- **False escalation** — `[ESCALATE TO VILLAGE]` on changes outside the trigger list. Use `[BLOCKING]` or `[RECOMMEND]` and resolve at Tier B.
- **Manufactured findings** — Tier B reviewer inventing issues to appear thorough. See `REVIEWER-DISCIPLINE.md` Rule 2.
- **Sycophantic LGTM** — Tier B reviewer rubber-stamping without a real cross-check. `[LGTM]` is valid only when an actual review happened.

---

## Cross-orchestrator note (D-B deferred)

This pipeline currently assumes CLAUDE.md is the directives root. Codex orchestrator reads CLAUDE.md as-is. The longer-term intent is **D-B architecture** — a shared `AGENTS.md` base file containing orchestrator-agnostic doctrine, with thin `CLAUDE.md` and `CODEX.md` mirrors that delegate to AGENTS.md for portable rules and override for orchestrator-specific items.

**Status:** D-B is a **deferred separate slice.** Do NOT mirror this doc, REVIEWER-DISCIPLINE.md, or any of the rules they encode into AGENTS.md / CODEX.md until that slice is opened. Until then, Codex relies on this doc via CLAUDE.md's index entry.

When D-B opens:
- This doc moves to or is symlinked from a shared base (TBD).
- Tier-B language ("one LLM implements, the other reviews") is generalized.
- Co-orchestrator labels in CLAUDE.md ("Claude Opus 4.6 = CEO") are extracted to a Claude-specific override file; AGENTS.md describes the role abstractly.

Until D-B lands, treat this doc as Claude-rooted with the understanding that the doctrine is orchestrator-agnostic in intent.

---

## Routing tree (which tier does my change need?)

```
Is the change in the Tier-C trigger list?
├── YES → Tier A + Tier B + Tier C (with Sean's per-run permission)
└── NO
    └── Is it a non-trivial production change? (>10 lines, new logic, new file)
        ├── YES → Tier A + Tier B (Codex Final Gate per rule 46)
        └── NO (typo, comment, formatting, test fixture rename)
            └── Tier A only (CI gates pass = ship)
```

Edge case: if a change starts as "non-trivial" and grows to touch a trigger surface mid-implementation, **promote to Tier C at that boundary**. Don't merge a Stripe-webhook-touching change because it started as "just a typo."

---

## How this maps to existing CLAUDE.md doctrine

| Rule / doctrine | Layer it encodes |
|---|---|
| Rule 15 — Recursive planning | Pre-Tier-A: planning is the cheapest layer. |
| Rule 16 — AI Village permission per-run | Tier C cost gate. |
| Rule 17 — Dual-pass discipline | Tier B, both implementer-side and reviewer-side. |
| Rule 19 — No speculative success language | Tier A + Tier B. |
| Rule 30 — Subagent skepticism | Tier B reviewer-side; subagent output is `[HYPOTHESIS]` until evidence. |
| Rule 42 — Pre-push backend audit | Tier A — runs locally before push. |
| Rule 44 — Secret scan covers writes | Tier A. |
| Rule 46 — Codex Final Gate | Tier B contract. |
| Rules 50–52 | Encode this doc + REVIEWER-DISCIPLINE.md as MANDATORY top-line. |

---

## Maintenance

This doc owns:
- The Tier-A tool list and current state.
- The Tier-B output tag taxonomy.
- The Tier-C reserved-trigger list.

If a tool installation changes, update the Tier-A table here AND the orphan-resolution / `ESLINT-SETUP.md` reference. If a new Tier-C trigger emerges (e.g. a new compliance regime), update the reserved list here AND `AI-VILLAGE-SYSTEM.md`. Both files should always agree on the trigger list.

---

## Changelog

- **2026-04-26** — Initial draft. Captures three-layer pipeline, Tier-A tooling state, Tier-B output tags, Tier-C trigger list, anti-patterns, D-B deferral note, routing tree, mapping to existing rules. Landed alongside CLAUDE.md rules 50–52.
