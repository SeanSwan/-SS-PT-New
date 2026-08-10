# Command Effect Registry (Runtime)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — runtime twin of `../references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`
- **Companions:** bridge §4 (`../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`) defines the T0–T4 ladder — this file never restates it · `./approval-gates.md` (how T3/T4 approvals work) · `./audit-receipts.md` (receipt format) · `./kill-switches.md` (switch inventory) · `./channels-and-brokers.md` (channel auth)

---

## 1. The one rule

**An unregistered command is BLOCKED — not T0, not "probably harmless," BLOCKED.** The reference registry maps *who may do which job*; this file maps *which exact commands exist at runtime*. Hermes, the headless runner (`./headless-runner-spec.md`), the Telegram broker, and every command-center button execute registered commands only. If a command name does not resolve to a row here, the broker refuses, logs the refusal as a T0 receipt, and — if the request came from Sean — offers to draft a registration proposal (T1). Nothing else happens.

Registration is a **doc change, not a runtime event**. An agent may write a proposed row (T1); the row is live only after Sean (or Fable acting within its arbitration role, for T0/T1 rows only) merges it. Tier assignments follow the bridge's rounding rule: ambiguity rounds up, chains inherit their max.

## 2. Row schema

Every command row carries all ten fields. A row missing any field is invalid and treated as unregistered.

| Field | Meaning |
|---|---|
| `name` | Unique kebab-case identifier; the only string brokers accept |
| `description` | One line, imperative, honest about side effects |
| `owner` | Registry §3 operator owner accountable for the command's behavior |
| `tier` | T0–T4 per bridge §4; assigned here, never inferred at runtime |
| `channels` | Which lanes may invoke it (command-center, telegram, runner, vscode) |
| `approval` | `none-logged` (T0/T1) · `allowlist` (T2 standing, named in §7 of the bridge) · `queue` (T3) · `queue+arm` (T4 two-step, see `./approval-gates.md` §5) |
| `inputs` | Named parameters + validation (types, enums, max lengths); free-text params are declared `untrusted` and never interpolated into shell/SQL — there is no shell/SQL to interpolate into |
| `receipt` | What the receipt's `outcome` and `evidence pointer` must contain (see `./audit-receipts.md` §2) |
| `kill-switch` | Named switch from `./kill-switches.md` checked before every execution |
| `verification` | How anyone proves the command did what it claims (log line, API response id, file diff, screenshot) |

## 3. Seed rows

Placeholder/demo content — targets and thresholds are illustrative until Sean confirms them (see `./open-questions.md`).

### T0 — read-only (logged, no gate)

| name | description | owner | channels | inputs | receipt evidence | kill-switch |
|---|---|---|---|---|---|---|
| `health-sweep` | Ping SwanStudios API health endpoints + Render deploy status; report green/amber/red | Deterministic Script | command-center, telegram, runner | none | endpoint list + HTTP codes | `SWITCH_HEALTH_SWEEP` |
| `queue-list` | List open approval-queue entries with tier + expiry | Hermes | command-center, telegram | `filter: open\|expiring\|all` | queue snapshot hash | `SWITCH_MASTER` |
| `receipt-digest` | Render the daily receipt digest (see `./audit-receipts.md` §5) | Deterministic Script | command-center, runner | `date` | digest file path | `SWITCH_RECEIPT_DIGEST` |
| `fable-context-compression-estimate` | Estimate whether safe local files are cheaper as semantically compressed or image-rendered Fable context; does not render images or call a model | Deterministic Script | vscode, command-center, runner | `paths (allowlisted repo/vault files), tier: high\|standard` | estimate report path or JSON hash | `SWITCH_MASTER` |
| `wiki-search` | Search the Obsidian/Karpathy vault, return note titles + snippets | Hermes | command-center, telegram | `query (untrusted, ≤200 chars)` | result count + note paths | `SWITCH_MASTER` |
| `stale-client-report` | Read-only report: clients with no logged session in N days (IDs only, per rule 8) | Deterministic Script | command-center, runner | `days: int 7–90` | client-ID list pointer | `SWITCH_STALE_CLIENT` |
| `switch-status` | Read every kill switch's current state | Deterministic Script | command-center, telegram | none | switch table | none (must work when everything else is off) |
| `verify-chain` | Verify the tamper-evident hash chain of a day's receipt + queue streams and report any break (E2 spine) | Deterministic Script | command-center, runner | `date` | per-stream ok/break + line counts | none (integrity check must run during incidents) |
| `verify-until-dry` | Run the canonical Code Perfectionist gates against the current repo change set; report the evidence-bound verdict without dispatching or importing a paid model review | Deterministic Script | command-center, telegram, vscode | none (fixed repo root + committed verification contract) | verifier receipt path + HEAD + source/scope hashes + verdict | `SWITCH_MASTER` |
| `hermes-doctor` | Self-diagnosis: lanes + index law, switches readable, chain integrity, clock regression, schedule, receipt roundtrip; the health-panel + runner-preflight data source (E4) | Deterministic Script | command-center, runner | `date` | per-check ok/fault + exit code (0 healthy/1 degraded/2 fault) | none (health check must run during incidents) |
| `brain-view` | Render the GRAPHICAL command center: the ARMS/Four-C second-brain graph (applications, routines, memory, skills) around the Hermes core, live-lit from local stores, with thought-stream + vitals HUD + ranked next-best-action. HTML/SVG + an HTML label overlay + VIEW-ONLY inlined client JS (zoom/pan/focus/keyboard; the only buttons are zoom/reset view controls). Zero network, zero action/command surface, no broker path - the page grants nothing (F-2/SB-2; redesign v2 Slice 1-2) | Deterministic Script | command-center, runner | `date` | rendered page path | none (read-only render; same doctrine as status-page) |
| `status-page` | Render the read-only command-center v0: one static HTML page (switch posture, open queue, anchor level, today's receipts, briefing pointer) from local stores — slice-3 v0, zero buttons, no broker path | Deterministic Script | command-center, runner | `date` | rendered page path | none (read-only render; a status view must work during incidents — the page grants nothing, unplug-to-stop by design) |
| `qa-session-start` | Open a supervised Browser Harness QA session (Sean authenticates; harness observes — read-only; ANY interaction beyond navigate/scroll/read/capture needs per-run human approval, bridge §6) | Browser Harness + Human | command-center | `target-url (allowlisted domains)` | QA receipt doc path | `SWITCH_BROWSER_HARNESS` |

### T1 — draft/propose (logged, output labeled DRAFT)

| name | description | owner | channels | inputs | receipt evidence | kill-switch |
|---|---|---|---|---|---|---|
| `morning-briefing` | Generate the daily operator briefing (health, receipts digest, queue, stale clients, calendar placeholder) as a DRAFT doc | Hermes | command-center, telegram, runner | none | briefing file path | `SWITCH_MORNING_BRIEFING` |
| `draft-client-followup` | Draft (never send) a follow-up message for one stale client ID via the Swan Coach proposal path | Hermes | command-center | `client-id` | draft proposal id | `SWITCH_MASTER` |
| `propose-command` | Draft a new registry row for an unregistered command Sean requested | Hermes | telegram, command-center | `sketch (untrusted)` | proposal doc path | `SWITCH_MASTER` |

### T2 — bounded internal writes (allowlist, audit-logged)

| name | description | owner | channels | inputs | receipt evidence | kill-switch |
|---|---|---|---|---|---|---|
| `memory-note` | Append a note to Hermes working memory (never product data) | Hermes | telegram, command-center | `text (untrusted, ≤2000 chars)` | note id | `SWITCH_MASTER` |
| `queue-approve` | Move a queue entry to approved — **the approval itself; Sean-only channels** (see `./approval-gates.md` §3) | Human/Sean via Hermes | command-center, telegram (exact-match phrase) | `queue-id, phrase` | queue transition record | `SWITCH_MASTER` |
| `queue-deny` | Deny/expire a queue entry with reason | Human/Sean via Hermes | command-center, telegram | `queue-id, reason` | queue transition record | `SWITCH_MASTER` |
| `switch-flip` | Flip a named kill switch (pause/resume an automation) | Human/Sean via Hermes | command-center, telegram (exact-match phrase) | `switch-name, direction` | switch state diff | none (see above) |

**PROPOSED T2 rows (2026-07-04, slice 1 — pending Sean per §4; implemented fail-closed in `scripts/hermes/`, receipted as proposed-row acts until merged):**

| name | description | owner | channels | inputs | receipt evidence | kill-switch |
|---|---|---|---|---|---|---|
| `receipt-prune` | Compress runs/-lane files older than the 90-day hot window into runs/archive (gzip, verified roundtrip, moved never deleted — open-questions Q4 DECIDED) | Deterministic Script | command-center, runner | `older-than-days: int (default 90), dry-run: bool` | archive file path + count | `SWITCH_MASTER` |
| `vault-init` | One-time/idempotent vault runs/-lane scaffolding (index.md law) + switches-file seed if absent (all on) | Deterministic Script | command-center | none | vault + switches paths | `SWITCH_MASTER` (bootstrap: receipt writing itself is switchless by design) |

### T3 — external-visible (queue approval + receipt)

| name | description | owner | channels | inputs | receipt evidence | kill-switch |
|---|---|---|---|---|---|---|
| `discord-alert` | Post one templated alert to the ops Discord channel (template ids TBD — `./open-questions.md` Q2) | Hermes (Discord broker) | runner, command-center | `template-id (enum), fill-values (validated per template)` | Discord message id | `SWITCH_DISCORD_BROKER` |

### T4 — human-executed intents (queue + cross-channel arm; the broker NEVER executes these)

| name | description | owner | channels | inputs | receipt evidence | kill-switch |
|---|---|---|---|---|---|---|
| `manual-maintenance` | Reserved intent-class row: records queue + arm authorization for a Sean-run maintenance act (seeder run, migration, credential rotation). The broker queues, arms (cross-channel, `./approval-gates.md` §5), and receipts — execution is Sean at the keyboard, never a command | Human/Sean | command-center, telegram (arm on the OTHER channel) | `act description + exact command text recorded + rollback pointer (required to arm)` | outcome + rollback pointer filed against the armed entry id | `SWITCH_MASTER` |

### DENIED rows — registered as forbidden so the refusal is explicit, not accidental

| name | status | why the row exists |
|---|---|---|
| `raw-shell` | **FORBIDDEN — never registrable** | Bridge boundary 5. The row exists so a request for shell gets a documented refusal receipt, not a "command not found" that tempts someone to add it |
| `direct-sql` | **FORBIDDEN — never registrable** | Bridge boundary 7. All writes travel through SwanStudios APIs; a T4 maintenance exception is a Sean-run manual act recorded through the `manual-maintenance` intent row above — never an executable command |
| `env-read` | **FORBIDDEN — never registrable** | Rule 59 read-time secret exposure. No command may return env/secret values through any channel |
| `mass-client-message` | **FORBIDDEN pending explicit design** | Registry §12 manual-only; per-send approval until trust earned. Blanket messaging is exactly the failure mode approval gates exist to prevent |
| `unreviewed-model-proxy` | **FORBIDDEN pending provenance review** | A base-URL/request proxy can see prompts, tool schemas, history, API keys, and outputs. It may be proposed only after the source/sandbox/network gates in `../references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` pass |

## 4. Change control

`verify-until-dry` is intentionally manual-only: it has no `runner` channel,
accepts no caller-selected contract, base, receipt, or approval, and cannot
dispatch Kimi. If its canonical audit requires Kimi K3, it returns
`BLOCKED_AUTHORIZATION`; Sean must separately approve the exact packet-bound
one-call CLI operation. No Hermes retry is permitted.

- Adding/editing a row = T1 proposal → Sean applies (T0/T1 rows: Fable may apply, logged). Tier can only move **up** without Sean; moving a tier down is always Sean's call.
- Every row edit gets a receipt referencing the diff.
- Quarterly (or on `skill-harvest` findings), Fable audits rows against actual receipts: commands with zero runs in 90 days get flagged per registry §13; commands whose receipts show scope creep beyond their `inputs` schema are **suspended** (treated as unregistered) until re-reviewed.
