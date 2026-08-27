# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/7276bca9-e25d-45a1-9a59-d00ece2a94ce/scratchpad/phase-a-hostile-review-brief.md
**Tokens (Ollama):** 2832 in / 2025 out | **Wall:** 33.0s | **done_reason:** stop

---
Here is the hostile review of the "Phase A" execution.

### 1. The "Local Execution" Proof is Circular and Incomplete
**Severity:** Critical
**Claim Attacked:** §2: "cloud-spend ledger's newest row predates the run by 13 days, therefore the run was local."
**Why it is wrong/unproven:** Absence of evidence is not evidence of absence. The cloud provider may have failed to log the request due to a network timeout, a billing service outage, or a rate-limit rejection that occurred *before* the ledger write. More critically, the agent claims the model is local because the cloud rejected the model ID. However, if the `base_url` was `None`, the runtime fell back to the *default* provider. If the default provider is a proxy that *does* accept the model ID (or if the error message was misleading), the request could have hit the cloud. The "47 seconds wall time" is consistent with a small local model, but also with a fast cloud inference endpoint. The only definitive proof is the network traffic or the specific HTTP response headers from the endpoint that actually served the request.
**Cheapest check:** `grep -i "provider" /var/log/runtime/audit.log | tail -5` to see the actual resolved endpoint URL for that specific timestamp, or `tcpdump` capture of the next scheduled run to confirm the destination IP is `127.0.0.1` or the local LAN IP, not a public IP.

### 2. The "Reversal" on Context Limits is a Non-Sequence Error
**Severity:** High
**Claim Attacked:** §4a: "Recommend leaving it entirely, because from the home directory there is no truncation at all."
**Why it is wrong/unproven:** This is a classic environment-dependent bug. The agent measured the system prompt size from `$HOME` and found it small. It measured from the repo and found it large. It concluded the limit is fine because "it works from home." This is dangerous because the *scheduler* (the thing that runs the job) likely executes in a specific working directory (often the repo root or a service directory). If the scheduler runs in the repo, the truncation *is* happening. The agent’s conclusion that "this profile appears to be a deliberately minimal zero-tool assistant" is a guess, not a fact. If the governance doc is truncated, the agent is operating on incomplete instructions. The "6% budget" is a heuristic, not a law. A 7B model with 131k context is rare; if this is a quantized local model, the effective context might be much lower, making 6% a massive chunk.
**Cheapest check:** `cd /path/to/repo && python -c "import runtime; print(runtime.get_system_prompt_size())` vs `cd ~ && python -c "import runtime; print(runtime.get_system_prompt_size())`. Then check the `cwd` of the cron job definition.

### 3. Committing Broken Data to a Stale Branch is a Data Loss Vector
**Severity:** High
**Claim Attacked:** §3: "Committing to a working branch that is 2,125 commits behind the trunk... are therefore safe from disk loss but are not on trunk."
**Why it is wrong/unproven:** "Safe from disk loss" is a lie if the branch is not protected. If the working branch is deleted, or if a `git rebase`/`merge` conflict resolution goes wrong, those 23 files are gone. More importantly, committing *invalid* data (14/23 fail schema) into the repository poisons the codebase. Any automated tool that reads these files will crash or behave unpredictably. The "protection precedes cleanup" argument is rationalized negligence. You have created a state where the data exists but is unusable, and it is isolated from the main development flow.
**Cheapest check:** `git log --oneline -n 5` on the branch to see if it has been pushed to a remote. If not, it is one `git branch -D` away from oblivion. Run the schema validator on the committed files to confirm they are indeed broken.

### 4. The "Inert Vendor" Reversal Ignores Supply Chain Risk
**Severity:** Medium
**Claim Attacked:** §4c: "Verified inert, no change needed... the toolset is not in the enabled list."
**Why it is wrong/unproven:** "Inert" today does not mean "inert" tomorrow. If a dependency update introduces a bug that enables the tool by default, or if a configuration file is merged from a fork that *does* enable it, the banned vendor is suddenly active. The agent verified the *current* state, not the *resilience* of the state. For a hard organizational ban, the standard is "cannot be enabled," not "is not currently enabled." The presence of the config value is a tripwire. Removing it eliminates the tripwire.
**Cheapest check:** `grep -r "vendor_name" . --include="*.py" --include="*.json" --include="*.yaml"` to find all references. Check if any code path has a `try/except` that silently enables the tool on error.

### 5. The 91% Context Usage is a Time Bomb, Not a Feature
**Severity:** Critical
**Claim Attacked:** §5: "Worst-case additional injection is therefore ~490 chars... Concluded the growth vector is instead the system prompt."
**Why it is wrong/unproven:** This arithmetic is fragile. The agent assumes the queue items are static. If the queue items grow (which they will, as the backlog was 300 items), the injection cap of 30,000 chars will be hit. But the *system prompt* is also dynamic. If the 128 capability modules change, or if the "standing context" file grows (it's already 40% over its cap), the total prompt size will exceed the 65,536 limit. When it does, the model will either:
1.  Hard error (job fails).
2.  Silently truncate the *tail* of the prompt.
If the tail is truncated, the *instructions* (which are often at the end) are lost. The agent is operating on a knife's edge. 91% usage with 9% headroom is not "safe"; it is "one bad day away from failure."
**Cheapest check:** Simulate a worst-case prompt: `max_system_prompt + max_queue_injection + max_user_input`. If this sum > 65,536, the job is broken.

### 6. The "Two Clean Rounds" Stopping Rule is Statistically Unsound
**Severity:** Medium
**Claim Attacked:** §6: "Findings arrived in rounds 4, 5 and 7... is 'two consecutive clean rounds' a sound stopping rule?"
**Why it is wrong/unproven:** No. The agent found defects in rounds 4, 5, and 7. It stopped after two clean rounds (presumably rounds 8 and 9). This is a "gambler's fallacy" of quality assurance. Just because the last two rounds were clean does not mean the next one will be. The agent is using a heuristic (2 clean rounds) to declare victory, which is a common failure mode in AI self-correction loops. The loop should continue until a *defined* coverage metric is met, not until it "feels" clean.
**Cheapest check:** Re-run the audit loop for 3 more rounds. If any new defect is found, the stopping rule was flawed.

### 7. The "Prescription vs. Finding" Doctrine is Overgeneralized
**Severity:** Low
**Claim Attacked:** §6: "A prescription states 'therefore do X' and smuggles in an untested causal model..."
**Why it is wrong/unproven:** This is a philosophical overreach. Prescriptions are often *more* verifiable than findings because they are actionable. A finding says "the disk is full." A prescription says "delete the logs." The prescription is easy to test. The finding is easy to verify. The agent is conflating "complexity" with "error rate." This doctrine, if enshrined, will lead to agents ignoring valid prescriptions because they are "untested causal models," which is a dangerous bias.
**Cheapest check:** N/A (Philosophical).

---

### The Single Most Likely Way This Work Causes a Problem in the Next 30 Days

**The scheduled job will fail silently or produce garbage output because the prompt size will exceed the 65,536 token limit.**

The agent fixed the *provider* issue but ignored the *capacity* issue. The job is running at 91% capacity. The queue is growing (300 items). The system prompt is dynamic. Within 30 days, a single large queue item or a slight increase in system prompt size will push the total over the limit. The model will either reject the request (job fails, no alert if not monitored) or, worse, truncate the tail of the prompt, causing the agent to ignore critical instructions (e.g., "do not delete data," "use local model only"). The agent has created a fragile system that *works* today but is structurally unsound.
