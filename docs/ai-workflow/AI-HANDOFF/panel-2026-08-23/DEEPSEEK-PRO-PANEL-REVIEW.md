# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-ARBITRATION-SANITIZED-2026-08-23.md
**Seed:** (none)
**Tokens:** 1875 in / 5748 out · **Cost:** ~$0.0048 · **Wall:** 146.4s · **finish:** stop

---

## VERDICT
REVISE — The document fails to resolve the core conflict (brain-dependent scheduled work has no execution guarantee) and overlooks a simpler, safer third architecture that avoids both positions’ major risks.

## BLOCKERS
1. **P0** – Brain-dependent scheduled work (daily briefing) cannot fire when Machine A is off, violating the constraint “scheduled work must fire regardless of whether Machine A is powered.” §3 Agreed finding 1 acknowledges this but no mitigation or requirement downgrade is proposed; the system as designed will silently miss deadlines.
2. **P1** – Position 1’s “invert residency” requires porting an unspecified “large stack” from a desktop subsystem to Linux with zero compatibility assessment. §4 Position 1 costs. Unknown Windows‑only dependencies or GUI tooling could block the migration indefinitely.
3. **P1** – Position 2’s optional mailbox is left optional; without it the agent’s interactive capability is dead when A is off, making the interface unreachable. §4 Position 2 costs. The document does not mandate it, leaving a critical availability gap.
4. **P2** – The no‑privilege service account on B cannot own systemd timers without root intervention (agreed in §3), yet the document never states how the scheduler will be owned or launched. The job ledger’s idempotency and replay mechanism across machines is also undefined.

## ATTACKS
- **Correctness**  
  - The one‑polling‑consumer rule is respected, but the mailbox (poller on B) acknowledging a message marks it delivered on the chat platform; if A is off, the message is lost unless the mailbox stores‑and‑forwards. No store‑and‑forward design is described.  
  - Race condition: when A powers on and polls the job ledger while a scheduled job fires, duplicate execution is likely without exactly‑once idempotency keys. No fencing or lock mechanism is mentioned.  
  - Stale state: the knowledge base on A may lag if updates are queued while A is off; acceptable but unstated, risking operator surprise.

- **Security**  
  - The mesh VPN is unconfigured; if the inference API on A lacks authentication (mTLS, API key), any node on the VPN can consume GPU resources.  
  - The no‑privilege service account on B runs the mailbox and job ledger; a compromise there allows arbitrary job enqueueing, which A will execute (CLI, browser automation). This is a remote code execution path with no sandboxing described.  
  - OAuth tokens obtained via SSH port forwarding end up on the always‑on headless B, increasing token theft risk. No token storage hardening is mentioned.

- **Data‑truth / schema drift**  
  - The job ledger schema is undefined; a mismatch between job types enqueued by B and expected by A causes silent failures. No versioning.  
  - The knowledge base format is unspecified; dual‑homing with a sync tool risks index corruption and split‑brain without conflict resolution.

## HIGHEST RISK
The unresolved brain‑dependent scheduled work availability: the operator expects the daily briefing on time, but it will be delayed until A powers on. The cheapest de‑risk is to **explicitly downgrade the requirement**—document that brain‑dependent jobs are queued and execute on next A power‑on, and implement a heartbeat from A to B so the chat interface shows “brain offline, briefing queued” instead of silence.

## CONFIDENCE
I could not verify from the document alone:
- The actual stack to be ported (languages, GUI dependencies) — a manifest would settle Position 1 feasibility.
- Whether the chat platform’s bot API allows acknowledging a message without consuming it — API docs on message lifecycle would confirm mailbox viability.
- The knowledge base size and write patterns — current storage metrics would quantify sync risk.
- The specific OAuth flows required by the browser harness — a list of target services and their headless‑browser support would clarify if B can host it.

I am uncertain whether the operator would accept delayed briefings; a direct confirmation would settle the highest risk.
