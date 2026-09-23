# Arbitration: two reviewers proposed opposite residency fixes. Which is right?

**Remit:** decide between two concrete architectures, or propose a third that beats both.
Generic infrastructure question. No credentials, identities, or personal data appear here
and none are needed to answer it.

---

## 1. Setup

Two machines, one operator agent.

**Machine A — workstation.** High-end GPU (32GB VRAM), runs a local 27B-class LLM
server. **Intermittently powered.** Remote wake is confirmed non-functional. The agent
stack runs inside a NAT'd Linux subsystem on a desktop OS.

**Machine B — "worker".** 6-core/12-thread CPU, 16GB RAM (upgrade to 32GB planned),
217GB disk, headless Linux server, **always on**. Its GPU is a decade-old card with EOL
drivers and compute capability below the CUDA floor — **it cannot run inference**.
Already provisioned: containers, Node, a private mesh VPN client (not yet joined), a
no-privilege service account, systemd, log rotation.

**The agent.** A personalised operator agent: custom persona, a large personal knowledge
base used for retrieval, native scheduled automations (including a daily generated
briefing), and a browser automation harness. Its interface is a chat platform whose bot
API permits **exactly one polling consumer per token**. Its model backend is configured
**fail-closed**: no cloud fallback — if the local model server is unreachable, the agent
produces nothing rather than degrading.

## 2. Constraints

1. One agent identity only. The operator will not maintain two that drift.
2. One polling consumer per bot token. Two pollers fight over updates.
3. The operator wants inference to keep using the GPU machine — that is why it exists.
4. Machine B must not run inference.
5. Scheduled work must fire regardless of whether Machine A is powered.
6. Automated jobs run as a no-privilege service account; automation may draft, a human
   ships anything outward-facing.
7. Remote graphical access to Machine B is unavailable; SSH only.

## 3. Agreed findings (three reviewers converged)

- **Brain-dependent scheduled work has no legal home.** The daily generated briefing
  needs the model. Machine B cannot run it; Machine A is often off. The availability
  problem the worker was bought to solve survives the design.
- **Fail-closed *inference* was the requirement; fail-closed *interface* is an unstated
  extra.** With the single poller on the intermittent machine, the operator's messages
  get no acknowledgement at all when it is off. An "acknowledged, queued, brain
  offline" reply is not a cloud fallback and violates nothing.
- **A durable job ledger is required** — single source of truth for what should run,
  with idempotency keys and replay when the model backend returns. Without it, timers
  fire into a black hole and partial failures duplicate on retry.
- **A no-privilege account cannot own systemd units** (system units need root to modify;
  user units need lingering enabled once by root). The scheduler ownership model must be
  stated explicitly.
- **Sending is not polling.** The one-consumer rule bans a second poller, not a second
  sender — so the worker can emit receipts without a second identity.

## 4. The disagreement to arbitrate

**Position 1 — invert residency.** Move the agent *runtime* to Machine B: chat polling,
persona, orchestration, job queue. Machine A becomes a pure inference appliance behind
the mesh VPN. The GPU still does all thinking; only the shell moves.
*Claimed benefits:* interface always reachable; fail-closed becomes observable rather
than silent; knowledge base, scheduler, agent state, and queue get one home.
*Claimed costs:* porting a large stack from the desktop subsystem to Linux; solving
inbound connectivity into a NAT'd subsystem.

**Position 2 — delete the control plane.** Keep the agent, its tools, the coding CLIs,
and the browser harness on Machine A (which has RAM and a GUI). Machine B becomes an
*independent worker*: a job ledger is the only source of truth, systemd merely ticks
"anything due?", and Machine A may *enqueue* allowlisted job types when it is powered.
No remote shell, no live exec control plane. Optionally move only the chat *poller* to
Machine B as a mailbox that acknowledges and queues but never generates.
*Claimed benefits:* smallest blast radius; no unattended remote-execution surface; keeps
memory-hungry and GUI-dependent components on the machine that can host them.
*Claimed costs:* the agent's interactive capability still dies with Machine A unless the
optional mailbox is adopted.

## 5. Contested sub-question

The operator wants the coding CLIs and browser harness on Machine B specifically, so
agent work runs on the always-on box. One reviewer argues that is wrong: Machine B is
headless (one-time OAuth device-login has no browser to complete in), and 16GB shared
with a database plus a headless browser plus Node runtimes invites the OOM killer to
take down the database. The counter-argument is that OAuth can be completed via SSH port
forwarding, headless browsers need no display server, and RAM is going to 32GB.

## 6. What to answer, most consequential first

1. **Position 1 or Position 2 — or a third that beats both?** Commit to one. Say what
   the deciding factor is, not a survey.
2. **Is the optional "poller-as-mailbox" move (acknowledge and queue, never generate) a
   free win, or does it smuggle in a second identity / split-brain by the back door?**
3. **Where do the coding CLIs and browser harness belong**, given §5's dispute?
4. **Where should the retrieval knowledge base live**, given the reader is on the
   intermittent machine and the scheduler is on the always-on one? Is dual-homing with a
   sync tool acceptable, or is one canonical copy mandatory?
5. **What in this plan is speculative complexity that will not earn its keep?** Name
   what to delete.

Be decisive and adversarial. If you think both positions are wrong, say so and say why.
