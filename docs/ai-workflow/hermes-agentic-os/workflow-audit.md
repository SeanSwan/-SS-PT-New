# Workflow Audit (Level 1)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — repeated work becomes governed skills here, or nowhere
- **Companions:** `./skills-to-automations.md` (Level 2 — what a promoted skill earns next) · `./deterministic-vs-agentic-boundary.md` (owner classification) · `../references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` §4 (the owner ladder) · `./command-effect-registry.md` (where a promoted skill is eventually registered)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 1. What Level 1 is

The system automates nothing it has not first *watched Sean do*. Level 1 is the disciplined act of finding real repeated work — not imagined work, not "wouldn't it be nice" work — and classifying it before a single line of skill exists. Two failure modes get killed at this level: automating a workflow Sean doesn't actually run (shelfware), and automating one he runs differently every time (a slot machine wearing a script's clothes). The audit output is a candidate table (§4); the exit gate is the promotion rule (§5).

## 2. Classification schema

Every workflow surfaced by the audit gets one row, all six fields mandatory. A row missing a field is an anecdote, not a candidate.

| Field | Meaning |
|---|---|
| `owner` | Who executes when promoted, per the registry §4 ladder: Deterministic Script → one AI call with a fixed contract → agent → Human. Deterministic-first; picking an agent requires justification (`./deterministic-vs-agentic-boundary.md`) |
| `tier` | T0–T4 per the bridge ladder, assigned by *worst step in the chain* (chains inherit their max; ambiguity rounds up) |
| `frequency` | Honest count: daily / weekly / monthly / per-event. "Sometimes" means the audit isn't done yet |
| `trigger` | What starts it today — clock, event (session end, lead arrival, deploy push), or Sean remembering. "Sean remembering" is the trigger most worth replacing |
| `output` | The artifact or effect the workflow ends with — a report, a draft, a filed note, a sent message |
| `evidence-source` | Where the truth the workflow consumes lives: SwanStudios API (Postgres via the one write/read path), receipt stream, vault lane, Render status, PLAUD intake. A workflow whose evidence source is "Sean's memory" gets flagged, not automated |

## 3. Interview prompts

Hermes (or Fable, in a grill-me-style session) asks these **one at a time**, follows up on every vague answer, and writes each answer straight into a candidate row. The prompts are deliberately concrete — taps and messages, not feelings about productivity.

1. "Walk me through what you did after your last training session ended — every tap and message, in order, until you put the phone down."
2. "What did you check this morning before your first client — which screens, in what order, and what were you actually looking for on each?"
3. "Name the last thing you forgot to do that a client noticed. What would have reminded you in time?"
4. "A new lead came in last week. What happened in the first hour — and how often does the honest answer become 'nothing'?"
5. "What number do you look up more than once a week that takes more than one click to reach?"
6. "Take your last PLAUD recording: step by step, what happened between end-of-session and a filed note — and where did it stall?"
7. "Which message do you keep retyping with small changes? Show me the last three versions."
8. "After you push a deploy, what do you check to know it went well — and how long after pushing do you actually remember to check?"
9. "At the end of the month, what do you assemble by hand to know how the business is doing, and from which sources?"
10. "Which client would you have contacted sooner this month if something had nudged you — and what data would the nudge have needed?"
11. "What did you avoid doing this week because it was tedious, not because it was hard?"
12. "If Hermes vanished tomorrow, which routine would you miss first — and which currently-discussed automation would you honestly never notice missing?"

Prompt 12 is the shelfware detector; anything Sean wouldn't miss gets classified and then *parked*, not built.

## 4. Seeded candidate table

Demo-content seed from the workflows already visible in the operator world. Rows are candidates, not registrations — nothing here runs until it clears §5 and lands in `./command-effect-registry.md`.

| Workflow | Owner | Tier | Frequency | Trigger | Output | Evidence-source |
|---|---|---|---|---|---|---|
| Morning briefing | Hermes (agent) | T1 | Daily | Clock 06:00 / on demand | DRAFT briefing doc in runs/ lane | Receipt digest, queue, health sweep, stale-client report |
| Stale-client sweep | Deterministic Script | T0 | Weekly | Clock / before briefing | Client-ID list, no-session-in-N-days | SwanStudios API (IDs only, rule 8) |
| Deploy-health watch | Deterministic Script | T0 | Per deploy push | Event: deploy detected | Green/amber/red status line | Render status + API health endpoints |
| PLAUD review nudge | Deterministic Script | T0 | Daily | Clock, if unreviewed transcripts exist | Count + pointer to pending review surface | PLAUD intake queue (product side) |
| Lead triage | One AI call (fixed contract) | T1 | Per lead | Event: lead capture webhook | Classified lead + draft response (DRAFT) | Lead record via SwanStudios API |
| Session-note filing | One AI call (fixed contract) | T2 (chain max — the draft step is T1, the approved write T2) | Per session | Event: transcript ready (post-redaction) | Structured note draft awaiting trainer approval | Redacted transcript, local |
| Content idea capture | Hermes | T2 | Per thought | Sean message ("idea: …") | `memory-note` entry, later filed to vault | Sean's own words |
| Package/credit status check | Deterministic Script | T0 | On demand / weekly | Sean asks / clock | Remaining-sessions table per client ID | SwanStudios API |
| Receipt digest | Deterministic Script | T0 | Daily | Clock 06:00 | Digest per `./audit-receipts.md` §5 | Receipt JSONL stream |
| Weekly business snapshot | Script gather + one AI call summarize | T1 | Weekly | Clock, Sunday | DRAFT snapshot: sessions, revenue signals, leads, stale count | SwanStudios API + receipt stream |

## 5. The promotion rule

A workflow becomes a skill **only** when all five hold:

1. **~5 boringly-predictable manual runs.** Sean (or the agent under Sean's eye) has executed it manually about five times and the runs stopped producing surprises. A workflow still generating "oh, except when…" discoveries is still being audited.
2. **Judgment points marked.** Every step is labeled *automate* (mechanical), *gate* (needs a human yes at this point), or *exclude* (stays manual forever). Unlabeled steps block promotion.
3. **Tier assigned** per the bridge ladder, by the worst step, ambiguity rounded up.
4. **Receipt format and kill switch named** — the specific evidence its receipts will carry (`./audit-receipts.md` §2) and the specific `SWITCH_*` name (`./kill-switches.md` §6: switch ships in the same change).
5. **Sean's yes to the SPECIFIC skill** — its name, owner, tier, trigger, output, and gates as written. A general "sure, automate that stuff" is the blanket approval `./approval-gates.md` §7 bans, applied to promotion.

Promotion produces a T1 proposal row for `./command-effect-registry.md`; what the new skill earns *next* — a button, a schedule — is Level 2's decision (`./skills-to-automations.md`), never this level's.
