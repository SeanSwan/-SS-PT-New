# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-HERMES-ARCHITECTURE-PANEL-2026-08-23.md
**Tokens (Ollama):** 1975 in / 1609 out | **Wall:** 28.6s | **done_reason:** stop

---
## VERDICT
REJECT — The proposed architecture creates a critical split-brain failure mode where the "brain" (Machine A) and the "body" (Machine B) are decoupled, violating the "fail-closed" constraint by allowing state divergence and orphaned execution during the high-probability event of Machine A being offline.

## BLOCKERS
1. **P0: Orphaned Execution & State Divergence (Split-Brain)**
   - **Scenario:** Machine A (Desktop) is powered off (normal state). A systemd timer on Machine B (Radar) fires a scheduled job (e.g., "daily briefing" or "ingest"). The job executes on Radar. If this job involves any state mutation (DB writes, file updates to the vault, or sending a Telegram message), it succeeds. Later, Machine A powers on. The Agent (Hermes) starts, reads its local config/state, which is now stale relative to the actions taken by Radar. Because the Agent is the "identity," it does not know Radar acted. Conversely, if the Agent was mid-conversation when A powered off, any pending "directed work" sent to Radar may complete without the Agent's final approval/audit receipt, violating the "human ships" constraint if the bridge is not strictly transactional.
   - **Evidence:** §6 states "radar owns its own scheduler... The agent is not the scheduler." §3 states "fail-closed: no cloud fallback... agent goes dark." This is contradictory: if Radar acts independently, the system is *not* fail-closed; it is *fail-open* to unattended execution. The "identity" constraint (§4.1) is violated because two entities (Agent on A, Scheduler on B) are mutating the same world without a single source of truth for *intent*.

2. **P1: Knowledge Vault Accessibility & Consistency**
   - **Scenario:** The 3.2GB vault is on Machine A. Radar needs to read it for scheduled jobs (e.g., "summarize recent notes"). If Machine A is off, Radar cannot access the vault (unless synced, which is not specified). If synced, there is no specified sync mechanism, leading to stale data on Radar. If not synced, Radar's scheduled jobs are blind to the operator's recent knowledge, producing low-quality or hallucinated outputs that contradict the "personalized" requirement.
   - **Evidence:** §4.4 says "radar must not run inference," but it *does* run coding agents and cron jobs. §3 lists the vault as part of the agent's install on Machine A. No sync protocol (rsync, git, etc.) is defined.

3. **P1: Telegram Token Conflict & Identity Ambiguity**
   - **Scenario:** The Agent (on A) uses the Telegram token for interactive chat. Radar's scheduled jobs (e.g., "daily briefing") need to send a message. If Radar sends the message directly, it bypasses the Agent's persona/audit layer. If Radar sends it *via* the Agent, it requires Machine A to be on, defeating the "always-on" purpose of Radar for scheduling. If Radar uses a *separate* bot token, it violates the "one agent identity" constraint (§4.1) because the operator sees two different bot IDs or inconsistent personas.
   - **Evidence:** §4.2 "Telegram bot token permits exactly one polling consumer." §6 "radar is never on Telegram." This implies Radar does *not* send Telegram messages directly. So who sends the "daily morning briefing" (§3) if Machine A is off? If Radar does, it violates §4.1. If it doesn't, the feature is broken when A is off.

## ATTACKS
- **Correctness:** The "fail-closed" design is fundamentally incompatible with "always-on scheduling" if the scheduler (Radar) and the brain (A) are separate. A true fail-closed system would *not* execute scheduled jobs if the brain is unavailable. The current design executes jobs (Radar) without the brain (A), which is fail-open. This is a logical contradiction in the requirements.
- **Security:** The "remote coding bridge" (§6) is an undefined attack surface. If Radar executes code based on instructions from A, and A is compromised or misconfigured, Radar becomes a remote code execution (RCE) vector on the always-on box. The "no-sudo" constraint (§4.6) mitigates this but does not eliminate the risk of data exfiltration or resource exhaustion (DoS) via the coding agents on Radar. The "browser harness" on Radar (§6) is a high-risk component: headless browsers are prone to memory leaks and can be used for SSRF if not strictly sandboxed.
- **Data-truth / schema drift:** The knowledge vault is a "3.2GB / 4,742-file" directory (§3). If this is synced to Radar, file-level consistency is hard to guarantee (partial writes, race conditions). If it is not synced, Radar's context is incomplete. There is no defined schema for how Radar accesses the vault (API? file system? git?).

## HIGHEST RISK
The highest risk is **silent state divergence** between the Agent (A) and the Scheduler/Executor (B). The operator believes they have one agent, but they have two independent systems that can act in the world without coordinating. This will lead to confusing, inconsistent behavior, lost audit trails, and potential security breaches (unauthorized actions by Radar).

**Cheapest de-risk:** **Move the Agent (Hermes) to Radar.**
- **Why:** Radar is always on. It has 16GB RAM, which is sufficient for a 27B model *if* quantized (e.g., Q4_K_M, ~15GB) or if a smaller model (7B/13B) is used for the agent's "brain" while heavy inference remains on A. However, the constraint says "radar must not run inference" (§4.4). This constraint is **bad**. It is a performance optimization, not a security or correctness requirement.
- **Alternative De-risk (if §4.4 is non-negotiable):** **Make Radar a pure proxy.** Radar does *not* run cron jobs that mutate state. Radar only runs a lightweight "scheduler" that *wakes* Machine A via Wake-on-LAN (if possible) or waits for A to come online. If A is off, Radar sends a Telegram message: "I am ready to execute [job], but the brain is offline. Please power on Machine A." This preserves fail-closed behavior. The "always-on" benefit is then limited to *monitoring* and *alerting*, not *executing*. This is a much safer, simpler design.

## CONFIDENCE
I cannot verify the performance of the "remote coding bridge" or the specific memory footprint of the coding agents on Radar. I also cannot verify if Wake-on-LAN is truly impossible (the document says "remote wake is confirmed dead," but this might be specific to the current BIOS/network setup, not a hard limit). I am confident that the split-brain risk is real and severe. I am less confident about the "better arrangement" because the constraints (especially §4.4 "no inference on Radar") are restrictive and may be based on performance assumptions that are not fully justified. If the operator is willing to relax §4.4, moving the agent to Radar is the clear winner. If not, the "pure proxy" model is the only safe option.
