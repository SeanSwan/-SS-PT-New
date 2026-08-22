---
name: hermes-learning-packet
description: Turns substantial, high-tier work — ESPECIALLY Fable-authored plans/output — into a privacy-safe learning packet that Hermes ingests so it evolves without Sean re-typing. Gates the SOURCE to Fable-tier-only (Fable, or a future model at/near Fable's level — never Opus 4.8 or below) via a stamped provenance tag, sanitizes to IDs/roles + secret-scan, writes a durable compounding packet, and delivers it over the already-proven Pi → Telegram continuity transport. Use at the close of any substantial workstream, phase, or Fable synthesis, or when Sean says "feed Hermes," "Hermes packet," "let Hermes learn from this," or `/hermes-learning-packet`.
---

# Hermes Learning Packet

**Role:** the loop that lets Hermes level up from the best work the operating system produces — automatically, so Sean doesn't have to hand-carry knowledge to the Pi. Everyone using an AI gets the same base model; what makes Hermes *Sean's* operator is the accumulated context it's fed. Sean's rule: Hermes should learn **only from Fable-tier intelligence** — Fable, or a new model that comes out at/near Fable's level — **never** from Opus 4.8 or anything below it. This skill is the gate + emitter that enforces that and delivers the packet.

> Sean 2026-07-05: "We need to give Hermes a summary at the end of everything that is worth giving a Hermes summary report so Hermes can learn from this and be able to upgrade itself and evolve without me necessarily having to type it in all the time… I really want my Hermes to learn from Fable and Fable only to be on that level."

## When to invoke

- **After Fable produces a plan or synthesis** (the primary trigger — this is the Fable-tier output Sean most wants captured).
- At the **close of a substantial workstream, phase, or slice set** whose lessons are worth compounding (architecture decisions, a hard bug's real root cause, a reusable pattern, a security posture change).
- When Sean says **"feed Hermes," "Hermes packet," "Hermes summary," "let Hermes learn from this,"** or `/hermes-learning-packet`.
- **Do NOT invoke** for trivial edits, or for Opus-4.8-or-below output that has no Fable-tier provenance (that fails the source gate — see Method step 1).

## Method

1. **Source-tier gate FIRST (fail-closed).** Establish the packet's `originating_model` — the model whose intelligence the packet captures. Because Sean has **subscriptions, not API keys** for Claude/Codex, the tier cannot be verified by an API call; it is an **agent/human-stamped provenance tag** that must be trusted and recorded honestly.
   - **Allowlist = Fable-tier or above** (`claude-fable-5`, or a future model Sean explicitly designates as at/near Fable's level). **`claude-opus-5` AND `moonshotai/kimi-k3` ARE Fable-tier learning sources — Sean's explicit designation 2026-08-10 ("OPUS 5 IS FABLE TIER"; "opus5 will be learned from as well as kimi 3"). Both go to the corpus, NOT quarantine. A Kimi review's findings/rulings are corpus-eligible; stamp `originating_model: moonshotai/kimi-k3` and keep its verdict distinguishable from the builder's own conclusions.**
   - If `originating_model` is Opus 4.8, Codex, Gemini, or anything below Fable → **do NOT write to the learning corpus.** Either stop, or write to the quarantine path (`docs/ai-workflow/hermes-learning-packets/_quarantine/`) clearly labeled as non-ingested. Never let sub-Fable output enter Hermes's learning corpus.
   - When in doubt about tier, ask Sean one question: "What model authored this — is it Fable-tier?" Bias to quarantine.
2. **Decide it's worth a packet.** Not every close deserves one. A packet is warranted when the work contains a *transferable lesson* Hermes should carry forward — a decision + its rationale, a pattern, a corrected root cause, a new capability, a risk. Skip pure status/mechanics.
3. **Draft the packet (privacy-safe).** Structured, compact, IDs/roles only. No client names, medical/immigration/PII, secrets, keys, tokens, DB URLs. Reuse the existing two-layer sanitizer discipline from `scripts/continuity-append.mjs`: Layer 1 = `scripts/scan-secrets.sh --stdin` (hard-fail on any hit — see rule 44/59); Layer 2 = scrub path shapes / username / host+IP via `scripts/continuity-config.json` (+ gitignored `.local.json`). Honor rule 8 (zero PII to LLMs) — the packet is committed and will be read by Hermes.
4. **Write it durably (compounding, not trimmed).** Packets live at `docs/ai-workflow/hermes-learning-packets/<YYYY-MM-DD>-<kebab-topic>.md` (session date, never a date function). This is **tracked and durable on purpose** — unlike the 30 KB-trimmed continuity closeout log (`.ai-workflow/continuity/rolling-last-done.md`), the learning corpus must *accumulate* so Hermes evolves. (If/when the Karpathy Wiki corpus on the Pi is unblocked — currently BLOCKED on SSD/powered-hub hardware — promote packets there.)
5. **Deliver over the proven transport (don't invent a new one).** The Pi Hermes daemon already SSH/cat-reads repo files at session start and prepends them to Hermes's system prompt (`docs/ai-workflow/AI-HANDOFF/HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`, smoke-tested PASS 2026-04-22). Ingest = **extend that daemon's read list** to include the learning-packet store (or add one manifest file Hermes reads the same way). Update that handoff doc — it is the only spec/rollback surface, since `run_agent.py` is not in git. Delivery is **pull + session-cached**: a fresh packet reaches Hermes at its next session start.
6. **Trigger semantics = AUTOMATIC (amended 2026-08-13 by Sean).** Sean: *"It's not manual. It needs to be automatic. We automatically go ahead and let Hermes know."* Emit at the close of any substantial workstream that produced a permanent transferable lesson — **unprompted, no "feed Hermes" required.** Sean now runs high-tier models only, so in practice the tier gate passes on nearly every session; that makes emission the norm, not the exception. The gate itself is unchanged and still fail-closed for sub-Fable authors. Do not build a new automation surface without Sean's yes — this changes WHEN the skill fires, not what plumbing it uses.

## Output — the learning packet

Write to `docs/ai-workflow/hermes-learning-packets/<YYYY-MM-DD>-<kebab-topic>.md`:

> **The schema is the contract; this template is only a convenience copy of it.** When they
> disagree, `_schema.json` wins and this block is the bug. That is not hypothetical: between
> 2026-08-13 and 2026-08-16 this template omitted `title:` entirely, offered `topic:` (not a schema
> key) and listed `status: open` (not a legal value) — and **every packet written from it failed
> validation**, 12 of them after the schema had already shipped. Do not trust this block; **run the
> validator** (below) before you finish.

```
---
title: <the lesson as a claim, not a subject — this is what the read side surfaces>
originating_model: claude-opus-5          # MUST be Fable-tier — the source gate
tier_gate: PASS | QUARANTINE              # the gate RESULT (not schema-required)
tier_basis: <why this model is Fable-tier — Sean's designation + date>   # REQUIRED
date: <session date>
decision: <the one-line rule this packet establishes>
status: draft | reviewed | current | shipped | superseded | archived
                                          # `reviewed` and `current` REQUIRE reviewed_by below.
                                          # `open` is NOT legal — it was in this template for
                                          # three days and produced invalid packets.
reviewed_by: <who/what reviewed it, or omit — omitting only warns>
supersedes: <path or none>
models_used:                              # WHO DID WHAT — required (Sean 2026-08-13)
  - model: claude-opus-5
    role: builder | orchestrator | reviewer | executor | judge
    did: <one line — the actual work, not the job title>
    cost: <$ or "subscription">
  - model: moonshotai/kimi-k3
    role: reviewer
    did: <one line>
    cost: $0.23
skills_touched:                           # SKILLS WE MAKE — required (Sean 2026-08-13)
  - name: <skill or rule id>
    change: created | amended | retired | proposed
    why: <one line>
surfaces: [<file/area IDs, no PII>]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)
## Why (the rationale Hermes should carry forward)
## Reusable pattern / rule Hermes should apply next time
## Who did what
## Skills created or changed
## Mistakes I made
## Error → fix → repeat ledger
## External-model calibration
## Risks / guardrails
## Provenance & privacy: originating_model, sanitizer PASS, IDs-only confirmed
```

### Validate before you finish — not optional

```bash
node scripts/hermes-learning-validate.mjs --file <your-packet.md> --check   # exit 2 = malformed
```

The closeout gate runs this on any packet you emit and **blocks the turn** if it fails, so a
malformed packet costs you a round trip either way. `--json` gives machine-readable errors you can
self-repair from inside the same turn.

**Never guess `originating_model` to make the validator pass.** It is the fail-closed Rule 68 tier
gate; a wrong provenance tag admits sub-Fable output into the corpus permanently, which is far worse
than a packet that fails validation loudly. If a field is genuinely unrecoverable, write `unknown`.

**The four content sections Sean added 2026-08-13** — *"put what models did what… and the skills
we're making… and all the errors that the models are making, what they're doing, and how they're
making errors and fixing them and making errors and fixing them":*

- **`## Who did what`** — per-model attribution in prose, beyond the frontmatter list. Which model
  proposed, which built, which caught the defect, which was wrong. Hermes cannot learn *which model to
  trust for which task class* from an unattributed lesson. Name the model that was WRONG as readily as
  the one that was right.
- **`## Skills created or changed`** — every skill, rule, hook, or template this work added or
  amended, and the failure that motivated it. The tooling we build is itself a lesson; a skill created
  without recording what it was created *against* becomes cargo-cult within a month.
- **`## Mistakes I made`** — MANDATORY heading, matched **literally** by
  `scripts/hooks/hermes-closeout-gate.mjs`. Do NOT number it (`## 6. Mistakes I made` does not
  match and the gate will block). One line each: what I got wrong → how it was caught → the
  **procedural** rule that prevents the repeat. Include errors caught and fixed mid-task, tools that
  reported false success, wrong severity calls, and claims walked back. Honest-empty
  (`## Mistakes I made — none surfaced this task`) only after a hostile pass genuinely ran dry.
- **`## Error → fix → repeat ledger`** — the recurrence loop, which is the highest-signal thing in
  the packet. For each error class: how many times it recurred **in this session**, whether it had
  already been written up before recurring, and what finally stopped it. **If you repeated a mistake
  you had already documented, say so in those words.** A lesson that was written down and then
  repeated proves the write-up was not a fix — the correction that survives is procedural ("run this
  command before committing"), never resolutional ("be more careful").
- **`## External-model calibration`** — for every paid/external model consulted: findings real vs
  disproven on verification, cost, and what task class it is actually worth paying for. This is how
  Hermes learns the routing table empirically instead of by assertion.
  - **Free seats count too.** "External" means *not the author*, not *expensive*. A $0 seat that
    burns a review slot and returns nothing is a routing fact Hermes needs as much as a costly one.
  - **UNATTRIBUTABLE / STEALTH SOURCES (added 2026-08-22 — `stealth/ox-alpha` is the first).**
    A cloaked model has no resolvable identity, so it can NEVER be `originating_model` — there is
    no lab to designate and `tier_basis` would have to read "unknown." Stealth listings can also
    swap weights mid-preview, which would retroactively poison every lesson stamped with them,
    with no way to tell which. **The corpus is append-only and compounds; that risk is not
    recoverable.** So: a stealth model's findings reach Hermes **only through this calibration
    section**, recorded by a Fable-tier author who VERIFIED them, with the finding and the verdict
    kept separate — `ox-alpha claimed X → verified TRUE/FALSE by <who> via <evidence>`.
    That is strictly MORE useful to Hermes than raw stealth output: it teaches what the seat is
    worth, which is the thing that improves routing decisions. Sean's standing ask is that Hermes
    learn "what they did, how they did it, what they fixed" — a verified claim-plus-verdict is
    exactly that; an unverified one is just volume.
  - **Promotion path (Rule 69):** a stealth finding that proves a permanent lesson is promoted the
    normal way — a Fable-tier author verifies it, writes it up in their OWN packet, and credits the
    source in-body ("surfaced by ox-alpha, confirmed by <evidence>"). The lesson enters the corpus
    on the VERIFIER's provenance, never the stealth model's. Nothing is lost; only the stamp changes.

Then tell Sean in chat: packet written (path), tier-gate result, and whether the Pi daemon read-list needs the one-time extension for a new store.

## Integration
- **Reuses, does not reinvent:** `scripts/continuity-append.mjs` plumbing (surface gate, two-layer sanitizer, atomic write) — propose a sibling emitter `scripts/hermes-learning-append.mjs` rather than new plumbing; register its command in `.claude/settings.json` `permissions.ask`.
- **Distinct from the continuity bridge:** continuity = ephemeral session closeouts that age out (30 KB trim); this = durable compounding Fable-tier learning corpus.
- **Distinct from `hermes-village.mjs`:** that REVIEWS Hermes-ecosystem docs; it is NOT the delivery pipeline (it may optionally validate a packet pre-ingest).
- **Wired into BOTH operating files:** CLAUDE.md Rule 68 + AGENTS.md mirror + the skills table (a skill isn't done until Claude AND Codex see it).
- Honors rule 8 (zero PII), rule 16 (Village stays Sean-gated), rule 44/59 (write/read-time secret scanning), rule 34 (no destructive cleanup without approval).

## Non-goals
- Does **not** ingest sub-Fable output — the source gate is fail-closed; Opus **4.8**/Codex/Gemini/Qwen output goes to quarantine, never the corpus. (**`claude-opus-5` and `moonshotai/kimi-k3` are Fable-tier and DO write the corpus** — Sean's designation 2026-08-10, see the allowlist above. This line previously said "Opus" unqualified and contradicted it.)
- Does **not** call Claude/Codex APIs — Sean has subscriptions, not keys; provenance is stamped, not API-verified.
- Does **not** invent a new Hermes transport — it extends the proven Pi SSH/cat read path.
- ~~Does not auto-emit by default~~ **RETIRED 2026-08-13.** Emission IS automatic for Fable-tier authors at substantial close. The old manual default is why a session with a seven-times-repeated error class produced four ephemeral memos and zero durable packets — every closeout passed while the corpus stayed empty.
- Does **not** touch the Pi without Sean (Hermes Pi work is currently SSD-power BLOCKED, per MEMORY.md).
