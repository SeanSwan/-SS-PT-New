# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/7276bca9-e25d-45a1-9a59-d00ece2a94ce/scratchpad/phase-a-hostile-review-brief.md
**Seed:** (none)
**Tokens:** 2749 in / 4153 out | **Cost:** ~$0.0705 | **Wall:** 27.2s | **finish_reason:** stop

---

# Hostile Review: Hermes "Phase A" Execution

## CRITICAL

### C1. §4a — "Recommend leaving it" is a decision to ship a silently-truncated governance document, and the reversal's own evidence proves the hazard is live
**Claim attacked:** the truncation is harmless because it only fires when cwd is the repo, and the profile "should not be loading an engineering constitution."

**Why wrong:**
1. The reversal's own point 4 destroys its conclusion. The runtime inserts a recovery marker telling the agent to read the rest of the file — but the profile has zero tools. So in the repo-cwd case the agent receives (a) 19% of a governance document, (b) an instruction to recover the remainder, (c) no capability to do so. That is not "no truncation at all"; it is a **deterministically corrupted instruction stream** in exactly the working directory where engineering work happens. The reversal measured the benign case (home dir) and generalized from it.
2. "It only truncates when cwd is the repo" is not exculpatory — it is an aggravating factor. Behavior that changes based on invocation directory is non-deterministic from the user's perspective. The agent will follow the governance doc in some sessions and a truncated ghost of it in others, with no signal distinguishing them. The original prescription at least identified a real defect; the reversal reclassifies a consistency bug as a non-event.
3. The "deliberately minimal zero-tool assistant" framing is post-hoc rationalization. Nothing in the document establishes the profile was *designed* to exclude the governance doc — only that it currently does. The reversal infers intent from configuration and then uses the inferred intent to justify the configuration. Circular.
4. The arithmetic is right but the conclusion drawn from it is a false binary. Yes, 214 KB → ~53K tokens → 40% of a 131K window is absurd for a 7B local model. But "raise the cap to fit the whole document" was never the only alternative to "leave it." The actual options include: fixing the recovery-marker/tool mismatch (enable a file-read tool, or suppress the marker when tools=0), splitting the governance doc, or making the cap cwd-independent. The reversal refutes the strawman version of the prescription and declares victory.

**Cheapest check:** run the profile from the repo cwd, capture the full system prompt, and grep for the recovery marker; confirm tools list is empty. Then check whether the marker text is conditional on tool availability in source. One command each. If the marker fires unconditionally, C1 is confirmed as a live defect the reversal chose to preserve.

---

### C2. §2 — The proof set does not establish that the *scheduled* run will succeed, and the "durability argument" is asserted, not tested
**Claim attacked:** the fix is proven durable because "job records are re-read from disk on every scheduler tick, so the daemon holds no cached copy."

**Why unproven:**
1. The successful run's provenance is never established. Was it triggered by the scheduler at its cron time, or manually forced (`cron run <id>` or equivalent)? Every piece of evidence — DB row, usage log, artifact, hook side effect — proves *an* execution succeeded. None of it proves the *scheduler's next tick* will pick up the edited job. If the run was manual, the entire proof set is consistent with "manual runs work, scheduled runs still fail."
2. The durability argument is a source-code claim presented as an observation. "Re-read from disk on every tick" — was this verified by reading the scheduler code in this session, or carried over from the audit? Long-running daemons are exactly where stale-cache bugs live, and the claim that the daemon "holds no cached copy" is precisely the kind of thing that is true of one code path (job execution) and false of another (job *scheduling* — the next-fire-time computation may have been computed at daemon start from the old record).
3. "Cloud ledger has no new row" is not sound evidence of locality. It is sound only if the ledger is written synchronously, on the same failure paths, with no batching/delay, and only for that aggregator. A 13-day-old newest row is equally consistent with "ledger writes are batched weekly" or "this provider's spend is logged elsewhere." The positive evidence (local `/api/tags` verification, 47s wall time consistent with local inference) is better; the ledger argument should have been dropped, not listed.
4. Nothing in the proof covers *delivery*. `last_delivery_error=None` is asserted for this run, but the original failure mode was pre-generation; the delivery path has now been exercised exactly once, and 22 KB artifacts are exactly the size class where delivery channels (chat message limits, email gateways) start failing. One success is not a delivery-path proof.

**Cheapest check:** `SELECT trigger_source / triggered_by FROM executions WHERE id = <new row>` — if the schema records it, one query settles manual-vs-scheduled. Otherwise: wait for tomorrow's cron time, or set a test job on a 2-minute schedule with the same provider config and observe. For the ledger claim: read the ledger-write code path and check for batching. For delivery: check the artifact's delivery channel's size limit against 22,384 bytes.

---

## HIGH

### H1. §4c — The three-control verification has at least two unchecked activation paths, and "inert" is a point-in-time claim being treated as a property
**Claim attacked:** the banned-vendor tool cannot activate because toolset disabled + no credentials + denylist.

**Why unproven:**
1. The registration condition is stated as "credentials exist AND toolset enabled." That is the *registration* path. Unchecked: (a) does any code path instantiate the tool directly, bypassing the registry — e.g., a fallback chain, a health-check probe, a "list available models" call at startup? Vendor SDKs are notorious for ambient credential pickup (env vars, `~/.vendor/credentials`, instance metadata). "0 of 35 env var names are vendor-shaped" checks the *runtime's* env, not the SDK's default credential chain, and not files on disk outside the auth store. (b) Is the hardcoded default (the *other* banned-vendor model) itself ever invoked when the configured value is absent? The reversal argues removal is pointless because the fallback is also banned — but never checks whether the fallback path is *more* reachable than the configured path. It may have identified that the scrub is useless while missing that the fallback is live.
2. "Verified inert" describes today. The config value persists; a future credential addition (someone debugging, a leaked env var in a shell profile) flips one of two AND conditions. The defense-in-depth argument the reversal dismisses is precisely the argument for removing a dormant loaded gun. "The scrub achieves nothing" is only true if the fallback is equally banned — but the *correct* action was then "remove the value AND pin the fallback / denylist the vendor at the provider-resolution layer," not "change nothing." The reversal replaced a useless action with no action when a useful action was available.
3. The denylist observation (2 of 3 matches are the guard) is the one genuinely good catch here — but it cuts against the reversal's framing, not for it: it shows the config *does* encode an organizational ban at the provider layer, which means a denylist entry for the vendor would make the dormant value unreachable regardless of credentials. That stronger fix was apparently not applied.

**Cheapest check:** `grep -rn "<vendor>" --include="*.py" src/` for direct instantiation outside the registry; check the SDK's credential-chain docs for ambient pickup; test: set a dummy credential env var, start the runtime, observe whether the tool registers despite the toolset being disabled. Ten minutes.

---

### H2. §5 — "Queue growth is not the risk" depends on item-size assumptions the document itself contradicts
**Claim attacked:** worst-case additional injection is ~490 chars because the hook is already at its 30,000-char cap.

**Why wrong:**
1. The 29,510 figure is one sample from one call. The per-item cap is 8,000 chars; the backlog is ~300 items of unknown size distribution. The claim "always at cap" holds only if pending items are consistently large. If the next batch of items are small (say 500 chars each), injection is 14,000 + n×500, well under cap — fine. But the risk direction is the opposite: the standing-context file is *already* 23,502 chars against a 14,000 cap and is being truncated. If the standing file grows (it is append-only per §3's description of the knowledge system), the injected total stays capped but the *prompt* doesn't shrink — the cap protects the queue component, not the total. The arithmetic conflates "injection is capped" with "prompt is bounded."
2. The prompt is NOT bounded by caps on every component. The system prompt — identified in the same section as the actual growth vector, driven by 128 capability modules — has no stated cap. So "91% is fine because everything is capped" is contradicted by the section's own finding two paragraphs later. The reversal of emphasis (queue safe, system prompt dangerous) is directionally plausible but the safety argument for the queue is overstated and the danger argument for the system prompt is unquantified: what is the system prompt's growth rate per enabled module? No measurement given.
3. The real failure mode question — hard error vs. silent truncation — is raised by the prompt and *not answered by the document*. This is the single most important unknown in §5: if the runtime silently truncates the prompt tail at 65,536 tokens, and the tail is where the injected queue items and task instructions live, then the system degrades by silently dropping exactly the content the queue mechanism exists to deliver — the same failure class as §4a and the standing-context truncation, i.e., a *systemic* silent-truncation problem the execution keeps documenting and declining to fix. If it hard-errors, the job goes back to failing, and §2's fix has a shelf life.
4. Also: 91% leaves ~5,900 tokens of headroom, but completion tokens count against num_ctx too. A run needing a longer completion (the artifact was 22 KB — 1,379 completion tokens seems *short* for 381 lines; check whether output was truncated) has less than 6% margin.

**Cheapest check:** find the runtime's behavior when prompt_tokens + max_completion > num_ctx — read the code or send a probe request with a deliberately oversized prompt to the local server and observe (Ollama silently truncates from the left by default in many configurations — which would drop the *system prompt*, the worst possible outcome). One probe request settles it.

---

### H3. §6 — The stopping rule is refuted by the document's own data, and the doctrine is an n=5 overreach
**Claim attacked:** "two consecutive clean rounds" is a sound stopping rule; prescriptions inherit findings' confidence without their verification.

**Why wrong:**
1. Findings arrived in rounds 4, 5, and 7 — after three clean rounds. The empirical arrival process shows findings appearing after *three* consecutive clean rounds. Stopping after two clean rounds is a rule the agent's own run history would have violated had it been applied earlier: applied naively, the loop stops after round 3 (rounds 1–3 clean... actually rounds 1-3 clean means stop at round 3), and rounds 4, 5, 7's findings — which include the §5 context-ceiling finding, arguably the most consequential one — are never found. The stopping rule is calibrated to nothing and contradicted by the only dataset available.
2. The doctrine quote is a reasonable heuristic being enshrined as a law from a sample of five prescriptions, of which three were overturned — and the three overturns are themselves prescriptions ("don't raise the limit," "don't drain," "don't scrub") that, per the doctrine, smuggle in their own untested causal models. The doctrine, applied to itself, indicts this execution: the reversals are prescriptions with inherited confidence and (per C1, H1) incomplete verification. The document does not notice this reflexivity.
3. "A finding is cheap to verify" is asserted in a document whose §2 findings include unverified claims (scheduler re-read behavior, ledger semantics). The clean dichotomy does not survive contact with the document's own contents.

**Cheapest check:** none needed — the refutation is internal to the document. The fix is free: change the stopping rule to "N clean rounds where N exceeds the longest observed clean streak before a finding" (i.e., ≥4), and downgrade the doctrine from knowledge record to hypothesis.

---

## MEDIUM

### M1. §3 — Committing 14 schema-invalid records to a branch 2,125 commits behind trunk trades a small risk for a structural one, and a cheaper path existed
**Claim attacked:** "protection precedes cleanup" justifies committing broken records to a stale branch.

**Why weak:**
1. The branch being 2,125 commits behind is not a cosmetic detail. Append-only knowledge records on an orphaned-lineage branch face a real reconciliation hazard: if the branch is ever abandoned, rebased badly, or bulk-merged with conflicts, the records' survival depends on a future human doing archaeology. The execution created a second, subtler single-point-of-failure to fix the first.
2. The cheaper path is obvious and unmentioned: commit to a *new branch cut from trunk* (or trunk directly, if these are data files with no code coupling). Same disk-loss protection, zero reconciliation debt. The choice of the existing stale branch looks like convenience ("we were already on it") rationalized as principle.
3. Committing 14/23 files that fail the project's own validator has a second-order cost: any CI or tooling that runs the validator on the branch now fails, training future operators to ignore validator output — the broken-windows effect. "Repair is a follow-up" is a promise with no tracked ticket, no owner, and no deadline mentioned. Uncommitted records are one disk failure from gone; unscheduled follow-ups are one context-switch from never.
4. That said, the core priority (durability before cleanliness) is defensible — the defect is in execution (branch choice, no tracked follow-up), not the ordering.

**Cheapest check:** `git log --oneline trunk..HEAD | wc -l` and `git merge-base HEAD trunk`; then `git branch new-data-fix trunk && git cherry-pick <4 commits>` — the remediation is cheaper than the debate.

---

### M2. §4b — "Silently lost" is overstated, but the reversal's conclusion survives; the overstatement matters because it sets a precedent for archive semantics
**Claim attacked:** manual drain would cause knowledge transfer to be "silently lost... permanently."

**Why overstated:**
1. "Permanently" is false on the document's own facts: files survive on disk, the project bans hard deletion, and the archive is a directory — replayable by moving items back to pending. The manual drain is *reversible* and *suboptimal*, not destructive. The reversal reaches the right conclusion (don't drain — the hook is the correct drain and the backlog was a symptom of the dead job) but inflates the cost of the alternative, which is exactly the "smuggled causal model" behavior §6's doctrine warns about.
2. The overstatement has a real consequence: if "archive = out of the injection path forever" is now doctrine, nobody will build the replay path, and any *future* accidental archive movement becomes actually permanent. The exaggeration is self-fulfilling.
3. The causal claim (backlog = absence of LLM calls, not broken drain) is supported by only 3 items archived at one timestamp. One data point. If the hook archives 3 items per call and the queue grows by more than 3 items per inter-call interval, the backlog grows even with a healthy job — and §5's own numbers (29,510/30,000 cap hit after 3 items) show the drain rate is cap-limited, not backlog-limited. The steady-state drain rate vs. arrival rate is never computed. The backlog may be structural after all.

**Cheapest check:** count items in pending now vs. after N scheduled runs; compute arrival rate from file mtimes over the 25-day outage window. If arrival rate × inter-run interval > ~3, the backlog is permanent and the reversal's "it resumed automatically" is true but irrelevant.

---

## LOW

### L1. §2 — 47-second wall time and 1,379 completion tokens vs. a 22,384-byte artifact deserve a consistency check
22,384 bytes ≈ 5,000–6,000 tokens of English; 1,379 completion tokens ≈ 5,500–5,700 bytes. Either the artifact includes content not from this completion (template, appended context), or the token count is wrong, or the artifact was truncated/assembled oddly. Probably benign (report template + generated body), but "the output is real" is a load-bearing claim and the numbers don't obviously reconcile. **Check:** diff artifact structure against the report template; verify completion_tokens against the artifact's generated section.

### L2. §4a — The 6% figure is verified against one model's reported context length
`131072 × 4 × 0.06 = 31457` matching exactly is good evidence for *this* model. But §5 establishes the runtime's model reports 131,072 while the Modelfile pins num_ctx to 65,536 — meaning the context-file budget is computed against a window **twice the actual one**. The 6% budget is "behaving as designed" against a number the deployment overrides. So the cap is ~31K chars against a *real* ceiling where that budget is 12%, not 6% — and the reversal's "deliberate design" framing inherits a number the deployment already lies about. The reversal never connects §4a's 131,072 to §5's 65,536 despite both being in the same document. **Check:** already present in the document; the defect is the failure to cross-reference.

---

## Single most likely way this work causes a problem in the next 30 days

**The scheduled job silently degrades as the system prompt grows past the num_ctx ceiling, and nobody notices because the failure mode is truncation, not error.** The execution fixed the loud failure (HTTP 400) and documented — three separate times — that this system fails silently by truncation (governance doc, standing-context file, and the unprobed prompt-overflow behavior at 65,536 tokens), then declined to fix any of them and set no monitoring on the 91% utilization. The job is one capability-module addition or one standing-context append away from either dropping its instructions or dropping its injected queue items, the overflow warning only surfaces when a human reads the output of a job whose entire point is to run unattended, and the proof that "the fix worked" will continue to look green (status=completed, artifact produced) while the content rots. Second place: the 23 records on the 2,125-commits-behind branch are orphaned in a reconciliation and the "follow-up" repair never happens.
