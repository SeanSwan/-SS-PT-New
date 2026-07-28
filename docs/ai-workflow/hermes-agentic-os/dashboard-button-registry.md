# Dashboard Button Registry

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — expands registry §11 (`../references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`) into full button contracts
- **Companions:** `./dashboard-command-center-spec.md` (interaction rules a button inherits) · `./command-effect-registry.md` (a button is a skin over a registered command — no registered command, no button) · `./approval-gates.md` (confirm/arm flows) · `./kill-switches.md` (disabled conditions)

---

## 1. Button law

A button is the **least-authority skin** over exactly one registered command. Buttons never batch, never chain tiers, never carry parameters the command's `inputs` schema doesn't declare. Pressing a button and typing the same command in Telegram must be indistinguishable to the broker and to the receipt stream. Every button: visible tier badge at rest, 44px minimum, disabled-with-reason rather than hidden (spec §4).

## 2. Button contract fields

`label` · `tier badge` · `backing command` (registry row) · `confirm behavior` (none / modal / two-step) · `disabled when` · `receipt produced`.

## 3. Button specs

| Label | Tier | Backing command | Confirm | Disabled when | Receipt |
|---|---|---|---|---|---|
| **System health sweep** | T0 | `health-sweep` | None — runs on press | `SWITCH_HEALTH_SWEEP` off · sweep already running | T0 receipt, endpoint list + codes |
| **Generate morning briefing** | T1 | `morning-briefing` | None — output lands as DRAFT doc | `SWITCH_MORNING_BRIEFING` off | T1 receipt, briefing path |
| **Run repo hygiene scan** | T0 | *(proposed — pending a registered command row; today this runs via the Claude Code/vscode lane, not the broker)* | None | no registry row yet → button ships disabled | T0 receipt, inventory doc path |
| **Draft client follow-up** (per stale-client row) | T1 | `draft-client-followup` | None — draft only, sending is a separate queued T3 | client-id missing · `SWITCH_MASTER` off | T1 receipt, proposal id |
| **Approve queued proposal** (per queue card) | T2 → executes the *entry's* tier | `queue-approve` | Modal restating action/tier/target verbatim; **T4 entries additionally require the arm step** (`./approval-gates.md` §5) | entry expired/revoked · dependent switch off | T2 approval receipt + the executed command's own receipt |
| **Deny queued proposal** | T2 | `queue-deny` | Modal with required reason field | entry already resolved | T2 receipt, transition record |
| **Send Discord alert (templated)** | T3 | `discord-alert` | Modal: rendered template preview + channel, exact text shown before yes | `SWITCH_DISCORD_BROKER` off · daily rate limit reached · template-id not in approved set | T3 receipt, Discord message id |
| **Pause all automations (MASTER)** | T2 flip | `switch-flip SWITCH_MASTER off` | Single confirm — deliberately lighter than T3: stopping must always be easier than starting | Never disabled. Always rendered, always reachable | T2 receipt, switch state diff + auto-revoked approvals list |
| **Resume all automations** | T2 flip | `switch-flip SWITCH_MASTER on` | Modal listing what resumes | Master already on | T2 receipt, state diff |
| **Start supervised browser QA** | T0 + human login | `qa-session-start` | Modal restating target + the supervision contract (Sean authenticates, harness observes — bridge §6) | `SWITCH_BROWSER_HARNESS` off | Harness receipt: URLs, actions, side effects |
| **View receipts digest** | T0 | `receipt-digest` | None | never (read path) | T0 receipt (digest render) |
| **Kill / resume \<automation\>** (per switch row) | T2 flip | `switch-flip <name>` | Kill: none. Resume: confirm modal | switch file unreadable → whole panel shows fail-closed banner | T2 receipt per flip |

## 4. First ship (registry §14 Q3 — proposed, confirm in `./open-questions.md` Q5)

Three buttons, in this order, before anything else earns pixels:

1. **System health sweep (T0)** — proves button→broker→receipt end to end with zero risk.
2. **Generate morning briefing (T1)** — proves artifact-producing commands and the runs/ lane render.
3. **Approve queued proposal (T2)** — proves the approval loop; the queue can be seeded with synthetic entries before any real T3 producer exists.

Everything else in §3 ships only after these three have a week of clean receipts.

## 5. Never a button (mirrors registry §12 manual-only)

These have no backing command (or a FORBIDDEN row) and must never acquire one via UI convenience:

- Credential/secret rotation; anything touching `.env`/keys (T4)
- Production deploy approval; `git push` to main outside standing authorizations (T4)
- Direct DB mutation, migrations, data deletion (T4) — `direct-sql` is a FORBIDDEN registry row precisely so this stays refused, not unbuilt
- Payments, refunds, pricing changes (T4)
- Client-visible messaging campaigns (per-send queue approval only; a "send to all stale clients" button is the banned blanket approval wearing a costume)
- CLAUDE.md/AGENTS.md rule changes
- Paid AI Village runs (rule 16 — the Village panel is read-only forever)
- Raw shell / free-text command execution of any kind (bridge boundary 5)

A future proposal to button any of these goes to Sean as a written T1 proposal with a threat analysis — never as a PR that happens to include the button.
