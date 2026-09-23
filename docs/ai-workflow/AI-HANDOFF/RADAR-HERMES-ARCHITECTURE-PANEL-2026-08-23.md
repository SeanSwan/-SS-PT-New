# Panel packet — where should the agent brain live, and what should the always-on box be?

**Remit:** architecture review. Challenge the proposed shape. If there is a better
arrangement than the one below, name it and say what it buys. Privacy note: one
adjacent workstream is deliberately omitted as out of scope; do not speculate about it.

---

## 1. The question

An operator (solo technical founder) has two machines. He has just built the second
one. **Where should his AI operator agent live, and what should the new box be?**

He has already rejected one framing and proposed his own. I think his is better than
mine. I want to know if there is a third option better than both.

---

## 2. The two machines

**Machine A — "the desktop"**
- RTX 5090, 32GB VRAM. Powerful.
- Runs Windows, with the agent stack inside WSL2 (NAT networking).
- **Not always on.** Remote wake is confirmed dead (exhaustive BIOS attempts failed).
  It serves only when the operator happens to have powered it on.
- Runs a local LLM server (Ollama) with 27B-class models. This is the agent's brain.

**Machine B — "radar" (new, built this session)**
- Ryzen 5 1600X (Zen 1, 6c/12t), 16GB RAM, 217GB usable disk.
- Ubuntu Server 24.04.4 LTS, headless, no GUI.
- GPU is a 2013 Kepler card, EOL drivers, compute capability 3.0 — **useless for
  inference**. It exists only because the CPU has no integrated graphics and the
  machine must POST.
- **Always on.** This is its entire reason for existing.
- Already provisioned: Docker, Node 22, Tailscale (installed, unauthenticated),
  a no-sudo service account, systemd, log rotation, security-only unattended upgrades.

---

## 3. What the agent ("Hermes") is

A personalised operator agent, not an off-the-shelf assistant:
- ~14GB install, including a **3.2GB / 4,742-file personal knowledge vault**
  (Obsidian-style, built over months).
- A custom persona file and a config iterated over ~12 dated revisions.
- Native cron automations (e.g. a daily morning briefing).
- **Telegram is its interface.** The operator talks to it from his phone.
- Its brain is the local model on Machine A, configured **fail-closed**: no cloud
  fallback. If the model server is unreachable, the agent goes dark rather than
  degrading.
- A browser harness governed as read-only by default, with per-run approval and an
  audit receipt for any interaction.

---

## 4. Constraints

1. **One agent identity only.** The operator will not maintain two that drift apart.
2. **A Telegram bot token permits exactly one polling consumer.** Two instances
   sharing a token fight over updates.
3. The operator explicitly wants the agent to keep using the powerful machine —
   that is why he bought the GPU.
4. **radar must not run inference.** 16GB, no usable GPU.
5. Scheduled work must fire **regardless of whether the desktop is powered on**.
   This is the problem radar was bought to solve.
6. Automated jobs run as a service account with **no sudo**. Scheduled work may
   draft; a human ships anything outward-facing.
7. Remote graphical access to radar via the operator's preferred tool is impossible
   (that product does not support hosting on Linux). Assume SSH over the private
   overlay is the access path.

---

## 5. What I proposed first (operator rejected the framing)

I framed it as "where does the agent live" and offered three options: **move** it to
radar; **clone** it with a second identity; or **leave** it on the desktop with radar
as a dumb job runner. I argued against "leave" because scheduling would stay hostage
to desktop power state.

---

## 6. What the operator proposed instead

> The agent stays on the powerful machine permanently. **radar is the execution
> surface** — the always-on box where coding agents (Codex, Claude CLI) actually run,
> where cron jobs fire, and where the browser harness executes. The agent directs;
> radar does.

Key move: **radar is never on Telegram**, so constraint 2 evaporates. And there is no
second agent instance, so constraint 1 is satisfied by construction.

My refinement, which resolves my own objection to "leave":

- **radar owns its own scheduler.** systemd timers on radar run everything that must
  fire regardless of desktop state — ingest, database jobs, a dead-man's-switch
  heartbeat. The agent is not the scheduler, so desktop power state is irrelevant to
  scheduled work.
- **The agent owns directed work.** When the operator asks for something, the agent
  reaches radar over the private overlay and executes there.
- Stateful services on radar run in containers with **pinned image tags**, so the
  rolling host can never move a database major version unattended.

Open sub-question: the transport by which the agent reaches radar. A remote coding
bridge already exists in this system; house rule is to extend a proven transport
rather than invent a parallel one.

---

## 7. What I want from you

Be adversarial. Specifically:

1. **Is there a materially better arrangement** than §6? Name it concretely.
2. **What breaks in §6 that I have not seen?** Failure modes, split-brain risks,
   state that ends up in two places, security boundaries that get blurred.
3. **The scheduler split** (systemd owns must-happen work; agent owns directed work)
   — is that clean, or does it create two sources of truth about "what should run"?
4. **Where should the knowledge vault live?** It is on the sometimes-off machine
   today. Moving it to the always-on box makes it more available but separates it
   from the brain that reads it. Is there a right answer, or is this a real tradeoff?
5. **Coding agents on radar** — they need one-time browser authentication and they
   are memory-hungry on a 16GB box already running a database. Is that placement
   right, or should they stay on the desktop?
6. **What would you delete from this plan?** Which part is speculative complexity
   that will not earn its keep?

Answer in priority order, most consequential first. Say plainly if you think the
operator's framing is simply correct and there is nothing better.
