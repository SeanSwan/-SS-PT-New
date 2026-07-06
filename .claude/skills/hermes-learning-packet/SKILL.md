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
   - **Allowlist = Fable-tier or above** (`claude-fable-5`, or a future model Sean explicitly designates as at/near Fable's level).
   - If `originating_model` is Opus 4.8, Codex, Gemini, or anything below Fable → **do NOT write to the learning corpus.** Either stop, or write to the quarantine path (`docs/ai-workflow/hermes-learning-packets/_quarantine/`) clearly labeled as non-ingested. Never let sub-Fable output enter Hermes's learning corpus.
   - When in doubt about tier, ask Sean one question: "What model authored this — is it Fable-tier?" Bias to quarantine.
2. **Decide it's worth a packet.** Not every close deserves one. A packet is warranted when the work contains a *transferable lesson* Hermes should carry forward — a decision + its rationale, a pattern, a corrected root cause, a new capability, a risk. Skip pure status/mechanics.
3. **Draft the packet (privacy-safe).** Structured, compact, IDs/roles only. No client names, medical/immigration/PII, secrets, keys, tokens, DB URLs. Reuse the existing two-layer sanitizer discipline from `scripts/continuity-append.mjs`: Layer 1 = `scripts/scan-secrets.sh --stdin` (hard-fail on any hit — see rule 44/59); Layer 2 = scrub path shapes / username / host+IP via `scripts/continuity-config.json` (+ gitignored `.local.json`). Honor rule 8 (zero PII to LLMs) — the packet is committed and will be read by Hermes.
4. **Write it durably (compounding, not trimmed).** Packets live at `docs/ai-workflow/hermes-learning-packets/<YYYY-MM-DD>-<kebab-topic>.md` (session date, never a date function). This is **tracked and durable on purpose** — unlike the 30 KB-trimmed continuity closeout log (`.ai-workflow/continuity/rolling-last-done.md`), the learning corpus must *accumulate* so Hermes evolves. (If/when the Karpathy Wiki corpus on the Pi is unblocked — currently BLOCKED on SSD/powered-hub hardware — promote packets there.)
5. **Deliver over the proven transport (don't invent a new one).** The Pi Hermes daemon already SSH/cat-reads repo files at session start and prepends them to Hermes's system prompt (`docs/ai-workflow/AI-HANDOFF/HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`, smoke-tested PASS 2026-04-22). Ingest = **extend that daemon's read list** to include the learning-packet store (or add one manifest file Hermes reads the same way). Update that handoff doc — it is the only spec/rollback surface, since `run_agent.py` is not in git. Delivery is **pull + session-cached**: a fresh packet reaches Hermes at its next session start.
6. **Trigger semantics = manual by default.** Mirror the continuity precedent ("log this and close") — human-triggered emission is the safe default and matches Sean's pattern. Auto-emit-after-Fable is opt-in and, if wanted, rides the existing `prompt-watcher` UserPromptSubmit hook model (`.claude/settings.json`) — do not build a new automation surface without Sean's yes.

## Output — the learning packet

Write to `docs/ai-workflow/hermes-learning-packets/<YYYY-MM-DD>-<kebab-topic>.md`:

```
---
originating_model: claude-fable-5        # MUST be Fable-tier — the source gate
tier_gate: PASS | QUARANTINE
date: <session date>
topic: <one line>
surfaces: [<file/area IDs, no PII>]
---

## What was decided/built (Fable-tier lesson)
## Why (the rationale Hermes should carry forward)
## Reusable pattern / rule Hermes should apply next time
## Risks / guardrails
## Provenance & privacy: originating_model, sanitizer PASS, IDs-only confirmed
```

Then tell Sean in chat: packet written (path), tier-gate result, and whether the Pi daemon read-list needs the one-time extension for a new store.

## Integration
- **Reuses, does not reinvent:** `scripts/continuity-append.mjs` plumbing (surface gate, two-layer sanitizer, atomic write) — propose a sibling emitter `scripts/hermes-learning-append.mjs` rather than new plumbing; register its command in `.claude/settings.json` `permissions.ask`.
- **Distinct from the continuity bridge:** continuity = ephemeral session closeouts that age out (30 KB trim); this = durable compounding Fable-tier learning corpus.
- **Distinct from `hermes-village.mjs`:** that REVIEWS Hermes-ecosystem docs; it is NOT the delivery pipeline (it may optionally validate a packet pre-ingest).
- **Wired into BOTH operating files:** CLAUDE.md Rule 68 + AGENTS.md mirror + the skills table (a skill isn't done until Claude AND Codex see it).
- Honors rule 8 (zero PII), rule 16 (Village stays Sean-gated), rule 44/59 (write/read-time secret scanning), rule 34 (no destructive cleanup without approval).

## Non-goals
- Does **not** ingest sub-Fable output — the source gate is fail-closed; Opus/Codex/Gemini output goes to quarantine, never the corpus.
- Does **not** call Claude/Codex APIs — Sean has subscriptions, not keys; provenance is stamped, not API-verified.
- Does **not** invent a new Hermes transport — it extends the proven Pi SSH/cat read path.
- Does **not** auto-emit by default — manual "feed Hermes" trigger unless Sean opts into auto.
- Does **not** touch the Pi without Sean (Hermes Pi work is currently SSD-power BLOCKED, per MEMORY.md).
