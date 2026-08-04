---
name: hermes-inbox
description: The low-friction, any-agent → Hermes working channel. When any AI does substantial work OUTSIDE Hermes — Claude or Codex in a terminal, local Qwen, a one-off script — it drops a short privacy-safe memo into .ai-workflow/hermes-inbox/pending/ so Hermes absorbs it at its next session start, then the inbox is cleared to stay fresh. Distinct from the Fable-tier-only learning-packet (permanent lessons) and the continuity bridge (Sean-triggered closeout log). Use at the close of a substantial terminal task/slice/phase, when you learn something Hermes should know, or when Sean says "tell Hermes," "leave Hermes a note," "update the Hermes inbox," or /hermes-inbox. Also carries the Hermes-side drain procedure.
---

# Hermes Inbox

**Role:** get context from wherever the work actually happened (a terminal, a local model, a
script) into Hermes — without Sean re-typing it. Any agent writes a short memo; Hermes reads and
clears them. This is the *daily working memo* lane, deliberately lower-friction than the two gated
lanes so real context stops falling on the floor.

> Sean 2026-07-06: "Write a file that's gonna always be looked at by Hermes… Hermes will read
> everything on it, learn what it needs to learn about the day of the project, take it in memory,
> and then delete the information so… codex, and all the other AIs, even Qwen, will write
> information here specifically for the case that it wasn't done inside of Hermes."

Full protocol lives at `.ai-workflow/hermes-inbox/README.md`. This skill is the *how* for both sides.

## When to invoke

- **Write side (default):** at the close of a substantial terminal task/slice/phase, or any time you
  learn something Hermes should carry (a decision + why, a new/changed surface, a live-state fact, a
  risk, a Sean-owned blocker). Also on: *"tell Hermes," "leave Hermes a note," "update the Hermes
  inbox," "log this for Hermes,"* or `/hermes-inbox`.
- **Drain side:** when acting AS Hermes at session start, or when Sean says *"drain the inbox,"
  "what did the terminals leave me," "catch Hermes up."*
- **Do NOT invoke** for trivial mechanics (typo/format/one-line fix) — no memo needed. For a
  *permanent* Fable-tier lesson, use `hermes-learning-packet` instead (or in addition).

## Method — WRITE a memo

1. **Decide it's worth a memo.** Transferable fact, not pure status. If Hermes would say or do
   something differently for knowing this, write it. Otherwise skip.
2. **Copy the template.** `.ai-workflow/hermes-inbox/ENTRY-TEMPLATE.md` → `pending/` named
   `<UTC-YYYYMMDDThhmmssZ>-<surface>-<kebab-slug>.md`. **One file per memo** (never append to a
   shared file — concurrent agents would clobber). `<surface>` ∈ `vs-claude` | `vs-codex` |
   `tg-claude` | `tg-codex` | `local-qwen`. Stamp an explicit UTC timestamp (no clock helper).
3. **Fill it short.** Bullets: what you did/learned · why it matters to Hermes · state right now ·
   Sean owes/blockers. A memo, not an essay.
3b. **MISTAKES SECTION — MANDATORY, NOT OPTIONAL (Sean 2026-08-04).** Every memo for substantial
   work carries a `## Mistakes I made` section. Sean's words: *"give a report to Hermes, especially
   about the mistakes that you made so I can learn from them… this should be automatic."*
   - List **your own errors**, each with: what you did wrong → how it was caught → the rule that
     prevents the repeat. Include errors you caught yourself and corrected mid-task — a mistake
     that never reached Sean is still the most useful kind of training data.
   - Include **wrong claims you made and walked back**, tools that reported false success, wrong
     severity calls, and anything a reviewer (human or model) had to correct.
   - If a **paid/external model** (Kimi, HY3, Village, Fable) was consulted, add a
     **calibration line**: how many of its findings were real vs dead on verification. This is how
     Hermes learns what a given model is worth on a given task class.
   - Honest empty is allowed but rare: `## Mistakes I made — none surfaced this task` and only
     when a hostile pass actually ran dry. Never omit the heading; an absent section reads as
     "nothing went wrong," which is almost never true.
   - **Do not soften.** "Recorded the lesson" is not the same as "applied it" — if you repeated a
     mistake you had already written up, say exactly that. That repeat is the highest-signal entry
     a memo can contain.
4. **Privacy gate (Rules 8 / 44 / 59 — this dir is committed + LLM-read):** IDs/roles only. No client
   names, medical/immigration/PII, secrets, keys, tokens, DB URLs, or absolute user paths. Run
   `bash scripts/scan-secrets.sh <file>` and **hard-fail on any hit** (reuse the continuity
   sanitizer discipline).
5. **Delivery.** The memo reaches Hermes when committed + pushed (Hermes reads tracked repo files).
   In normal terminal work it rides your slice commit — free. Don't force an extra push just for a
   memo; it flushes on the next commit.
6. **Report** one line in chat: memo written (path), and that it flushes to Hermes on next
   commit/push.

## Method — DRAIN (acting as Hermes)

1. **Read** every `pending/*.md` (skip dotfiles + `ENTRY-TEMPLATE.md`) via the daemon read-path
   (`docs/ai-workflow/AI-HANDOFF/HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md` — extend that read-list
   to include `.ai-workflow/hermes-inbox/pending/`).
2. **Absorb** into Hermes memory; promote anything worth keeping *forever* into durable Hermes
   memory / the learning corpus (the inbox is not the long-term store).
3. **Clear = archive, never hard-delete (Rule 34):** consumed memos move to `consumed/<YYYY-MM>/`.
   Because the Pi runs read-only (Rule 47) and is SSD-power blocked (`MEMORY.md`), Hermes records a
   **high-water mark** (last-consumed UTC) in its own memory and reports *"consumed through <ts>"*;
   the physical archive move is done in-repo by a terminal agent / a prune step (mirror
   `scripts/coordination-prune.mjs`). Hermes does not git-write from the Pi.
4. **Report** in Sean's channel: what was absorbed + the high-water mark.

## Guarantee it fires (Sean's #1 ask: "this can't be a maybe")

Convention alone (a rule + a skill) is *strong* but not a *hard* guarantee — an agent could forget.
Layered so it doesn't:
1. **CLAUDE.md Rule 69 + AGENTS.md mirror** — standing boot-context instruction (every agent, every
   session).
2. **This skill** — the exact procedure.
3. **Folded into `closeout-evidence-lock` (Rule 41)** — auto-routes at every substantial task close,
   so the flush recurs mechanically.
4. **True guarantee (recommended, opt-in):** a `Stop`/`SessionEnd` hook in `.claude/settings.json`.
   Hooks are **harness-executed**, so this is the only deterministic "always fires." Tiny token cost
   (like `prompt-watcher`). Requires Sean's yes — it changes shared session config.

## Integration
- **Reuses, does not reinvent:** the continuity sanitizer (`scripts/scan-secrets.sh` +
  path/PII scrubs). If a scripted emitter is wanted later, propose a sibling
  `scripts/hermes-inbox-append.mjs` mirroring `scripts/continuity-append.mjs`; register its command
  in `.claude/settings.json` `permissions.ask`.
- **Distinct from `hermes-learning-packet`:** that = Fable-tier-only, durable, compounding lessons.
  This = any-agent, ephemeral, drained daily memos. A memo may be *promoted* to a learning-packet if
  it turns out to be a permanent Fable-tier lesson.
- **Distinct from the continuity bridge:** that = Sean-triggered ("log this and close") closeout for
  the next terminal session. This = agent-initiated context for Hermes, consumed and cleared.
- **Wired into BOTH operating files:** CLAUDE.md Rule 69 + AGENTS.md mirror + the skills table (a
  skill isn't done until Claude AND Codex see it).
- Honors Rule 8 (zero PII), Rule 34 (archive not delete), Rule 44/59 (write/read-time secret scan),
  Rule 47 (Pi read-only).

## Non-goals
- Does **not** hard-delete memos — archive to `consumed/` (Rule 34).
- Does **not** touch the Pi without Sean (Hermes Pi work is SSD-power BLOCKED per `MEMORY.md`); the
  drain/report loop wires up when that clears — the write side works today.
- Does **not** invent a new Hermes transport — extends the proven daemon repo-read path.
- Does **not** replace the learning-packet or continuity bridge — it's the third, lower-friction lane.
- Does **not** carry PII/secrets — committed + LLM-read, so IDs/roles only.
