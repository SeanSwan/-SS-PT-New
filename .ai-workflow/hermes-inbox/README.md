# Hermes Inbox — "Hermes, look here."

> **What this is:** the low-friction, any-agent → Hermes working channel. When any AI does
> something outside of Hermes itself — Claude or Codex in a terminal, Qwen locally, a one-off
> script run — it drops a short memo *here*. Hermes reads the memos at its next session start,
> absorbs what it needs into memory, then the inbox is cleared so it stays fresh for the next batch.
>
> **Created:** 2026-07-06 by Sean's directive. **Owner:** any agent writes; Hermes drains.

---

## Why this exists (and why it is NOT a duplicate)

Everyone driving an AI gets the same base model. What makes *Hermes* Sean's operator is the
context it accumulates. A lot of real work happens **outside** Hermes — in a VS Code terminal
(Claude/Codex) or in the local Qwen model. Without a channel, that context never reaches Hermes,
and Sean would have to hand-carry it by re-typing. This is that channel.

There are three Hermes-facing memory lanes. They do **different** jobs — do not collapse them:

| Lane | Trigger | Lifecycle | Job |
|---|---|---|---|
| **Continuity bridge** (`.ai-workflow/continuity/rolling-last-done.md`) | Sean says *"log this and close"* | ages out (30 KB trim) | cross-session closeout log for the next *terminal* session |
| **Hermes learning-packet** (Rule 68, `docs/ai-workflow/hermes-learning-packets/`) | **Fable-tier output only** | durable, **compounds forever** | permanent lessons Hermes keeps |
| **Hermes Inbox** (this dir) | **any agent, any time** | **ephemeral — drained & cleared** | the daily "here's what I did" working memo |

Rule of thumb: a *permanent lesson worth keeping forever* → learning-packet (Fable-tier gate).
A *transient "here's the state of things right now" note* → **this inbox**. When unsure, use the inbox;
Hermes can promote anything worth keeping into durable memory on its side.

---

## How to WRITE an entry (any agent)

**One file per memo.** Never append to a shared file — concurrent agents (Claude X/Y/Z + Codex)
would clobber each other. Each memo is its own file, so a backlog is just N files sitting in `pending/`.

1. Copy `ENTRY-TEMPLATE.md` (in this dir) into `pending/` with this name:
   ```
   pending/<UTC-YYYYMMDDThhmmssZ>-<surface>-<kebab-slug>.md
   ```
   - `<surface>` ∈ `vs-claude` | `vs-codex` | `tg-claude` | `tg-codex` | `local-qwen`
   - example: `pending/20260706T231500Z-vs-claude-gallery-print-slice-shipped.md`
   - the timestamp must be an **explicit UTC value** you stamp — do not rely on a clock helper.
2. Fill the template. Keep it **short** — a memo, not an essay. Bullets over paragraphs.
3. **Privacy is mandatory (this dir is committed and read by an LLM — Rules 8 / 44 / 59):**
   IDs and roles only. No client names, no medical/immigration/PII, no secrets, keys, tokens,
   DB URLs, or absolute user paths. Run the same secret scan the continuity bridge uses before
   committing: `bash scripts/scan-secrets.sh <file>` — hard-fail on any hit.
4. The entry reaches Hermes when it is **committed + pushed** (Hermes reads tracked repo files —
   see "How Hermes reads" below). In normal terminal work the memo rides the same commit as your
   slice, so this is free. A session that doesn't commit leaves the memo as an uncommitted local
   file; it flushes on the next commit.

**When to write one:** at the close of any substantial terminal task/slice/phase, when you learn
something Hermes should know (a decision + why, a new surface, a live-state fact, a risk, a
blocker Sean owns). Skip pure mechanics (a typo fix needs no memo).

## How Hermes READS + DRAINS

1. **Read** every `pending/*.md` (ignore dotfiles and `ENTRY-TEMPLATE.md`) at session start via
   the daemon read-path (`docs/ai-workflow/AI-HANDOFF/HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md` —
   extend that read-list to include `.ai-workflow/hermes-inbox/pending/`).
2. **Absorb** what matters into Hermes's own memory. Promote anything worth keeping *permanently*
   into durable Hermes memory / the learning corpus — the inbox itself is not the long-term store.
3. **Clear (archive, never hard-delete — Rule 34):** move consumed memos to `consumed/<YYYY-MM>/`.
   This keeps `pending/` empty (fresh for the next batch, exactly as intended) **without destroying
   the record** — a future audit can still read what Hermes was told and when.
   - Hermes now runs on the desktop 5090 and SHARES this filesystem (Pi RETIRED — doc 170 §A), but
     the safe division of labor stays: **Hermes records a high-water mark**
     (last-consumed UTC timestamp) in its own memory and reports *"consumed through <ts>"*; the
     physical archive move is done in-repo by a terminal agent or a small prune step
     (mirror `scripts/coordination-prune.mjs`). Hermes stays a repo READER by doctrine — a third repo-writer needs Rule 67 lane claims, not habits.
4. **Report** back in Sean's channel: what was absorbed, and the high-water mark.

---

## Directory layout

```
.ai-workflow/hermes-inbox/
├── README.md            ← this file (the protocol; "Hermes, look here")
├── ENTRY-TEMPLATE.md    ← copy this to make a memo
├── pending/             ← unread memos (Hermes drains these). one file per memo.
│   └── .gitkeep
└── consumed/            ← archived after Hermes reads them (Rule 34: archive, not delete)
    └── .gitkeep
```

## Guarantees (why this actually fires, not "maybe")

The write side is enforced at four levels so it isn't left to chance:
1. **CLAUDE.md Rule 69 + AGENTS.md mirror** — always in every agent's boot context; the standing
   instruction to drop a memo at substantial task/session close.
2. **`hermes-inbox` skill** (`.claude/skills/hermes-inbox/`) — the exact how (write + drain).
3. **Folded into `closeout-evidence-lock` (Rule 41)** — which already auto-routes at the end of
   every substantial task, so the flush recurs without a new trigger.
4. **`SessionStart` hook** (`scripts/hooks/hermes-inbox-reminder.mjs`, wired in
   `.claude/settings.json`) — harness-executed, so this is the deterministic layer. It injects a
   once-per-session reminder + the pending count. SessionStart (once/session) is chosen over a
   `Stop` hook (every turn) deliberately — a per-turn reminder would be token-noise.

## Guardrails
- **Privacy (Rules 8 / 44 / 59):** committed + LLM-read → IDs/roles only, secret-scan every entry.
- **Archive, never hard-delete (Rule 34):** consumed memos move to `consumed/`, are not destroyed.
- **Drain wiring status (2026-07-07):** Hermes shares this filesystem now (desktop 5090; Pi retired) —
  the drain is one session-start hook away (FABLE-HERMES-WORKFLOW-UPGRADE/170 §E step 8 wires it);
  the write side + this convention work today.
- **No new transport invented:** reuses the proven daemon repo-read path (same as learning-packets).
