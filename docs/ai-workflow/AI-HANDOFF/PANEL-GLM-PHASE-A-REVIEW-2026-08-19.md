# GLM Consult

**Model:** glm-5.3
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/7276bca9-e25d-45a1-9a59-d00ece2a94ce/scratchpad/phase-a-hostile-review-brief.md
**Tokens:** 2698 in / 19903 out (reasoning: 17275) | total 22601
**Wall:** 328.7s

---

Findings ranked by severity, then by cost to check. Section tags show what's under attack. One pattern indictment up front, because it is itself a defect: **all three reversals in §4 convert an actionable defect into a documented non-action, and each reversal *discovered* a new defect and left it in place** — an instruction to use a tool that doesn't exist (4a), months of newest-item starvation (4b), an armed fallback to a banned vendor (4c). Overturning "do X" does not oblige choosing "do nothing."

---

**1. CRITICAL — §5: "58,251 + 1,379 = 59,630 = 91.0% of the ceiling."**
Unproven because the aggregation semantics of `prompt_tokens` were never established. If the job is agentic (multiple LLM calls per run) and the usage row sums per-call prompts, the per-call peak could be a fraction of 58,251 and the headline collapses. Corroborating anomaly nobody reconciled: a 22,384-byte artifact from 1,379 completion tokens is ~16 bytes/token — 3–4× any English tokenizer — so either the artifact embeds non-generated content, or usage is summed across calls. Conversely, if 58,251 *is* one call, the identified capped components (system prompt ~32.4 KB ≈ 8k tokens; hook injection 29,510 chars ≈ 7.4k tokens) account for ~15.5k tokens; **~42,700 tokens — 73% of the prompt — are unattributed.** "The growth vector is the system prompt" and "queue growth is not the risk" are argued from an accounting that explains a quarter of the number.
*Check:* read the code path that writes the usage row (sum vs. last call), or rerun once with request logging and tokenize each section offline.

**2. CRITICAL — §3: "an uncommitted record is one disk failure from gone; a malformed one is not."**
The remedy — four local commits, explicitly nothing pushed — leaves the records exactly one disk failure from gone. `.git` is on the same volume as the working tree. Local commits protect against `rm` and bad checkouts, not against the disk failure the rationale invokes. The justification defeats itself as written.
*Check:* `git remote -v`, then push the branch — one command converts the false claim into a true one.

**3. CRITICAL — §2/§3 chain: the restored job's liveness now depends on an unverified parser.**
§3 committed 14 schema-invalid records into an ecosystem whose `pre_llm_call` hook parses records from disk on every LLM call. Nothing establishes the hook's exception behavior. If a malformed item throws inside `pre_llm_call` and the runtime doesn't isolate hook errors, one bad record re-kills the job §2 just revived — new root cause, confusing signature.
*Check:* read the hook for try/except; inject one deliberately malformed item on a scratch job.

**4. HIGH — §4a/§5: the cap defense uses a context window the same document says doesn't exist.**
§4a validates 31,457 as "6% of 131,072"; §5 reports the server actually runs `num_ctx 65,536`. Both cannot govern. Either the runtime budgets context against the *advertised* window while the server enforces half of it — a real bug that "leave it entirely" preserves — or §5's Modelfile claim is wrong. Note the reversal's own arithmetic flips under the real window: the original prescription's ~53k-token document is 40% of 131,072 but **81% of 65,536**. Right call, wrong numbers, per the document's own companion section.
*Check:* compare the runtime's `context_length` source against the server's `/api/show`; one of them is lying.

**5. HIGH — §4a: "conditional on working directory" is an indictment, not an exculpation.**
The behavior is non-deterministic: the same profile answers under the governance document in the repo and without it in home. More importantly, the one unattended consumer whose cwd matters — the §2 scheduled job — has an unstated working directory. If it's the repo (typical for an agent operating on the project), truncation fires on the only automated path, and the "no truncation at all" comfort was measured from the wrong directory. The reversal also *found* a live defect — a truncation marker instructing recovery via a tool the profile does not have — and resolved it by inaction. And its own conclusion ("this profile arguably should not be loading an engineering constitution") implies an action: detach the file. It prescribed prose instead.
*Check:* read the job record's `cwd` field / `readlink /proc/<scheduler-pid>/cwd`.

**6. HIGH — §4b: "the backlog resumed automatically" is true and insufficient.**
At 3 items per successful call, ~300 pending items require ~100 successful calls. The runtime produced 2 completions in the prior 25 days; at that rate the backlog clears in ~3.4 years, and even a healthy daily schedule takes ~100 days — during which oldest-first injection at a saturated budget (15.5k of the 30k shared with standing context) starves every *new* item behind 300 stale ones. The original prescription misdiagnosed the drain; the reversal replaced it with nothing that addresses the lag. Also "knowledge transfer permanently lost" is asserted, not shown: the archive is durable under the no-delete rule and replayable unless a retention job purges it — unverified in either direction. And the causal story ("backlog = dead job") entails zero LLM calls anywhere on this desktop for 25 days; a single archive mtime inside the window falsifies it and implies a second stagnation cause nobody looked for.
*Check:* `wc -c` across the pending dir (size distribution); `find <archive> -newermt` covering the 25 days; grep archive retention config.

**7. HIGH — §4c: the three controls are a snapshot, and one of them may not be a control.**
Job records demonstrably carry config overrides (§2 stored `provider`) — per-job toolset enablement is a fourth activation path, unchecked. Env-var scanning by *name shape* misses generically named credential variables. The auth store is mutable at runtime; "only two unrelated providers" is true today. The `banned_providers` denylist's enforcement at registration is unverified — if it's advisory, it's documentation, not a guard, and inertness rests entirely on two transient conditions. Finally, the reversal *found* a booby trap — deleting the config value silently falls back to a banned-vendor model — and left it armed. For a hard organizational ban, a dormant vendor string is exactly what a compliance grep flags, and "we verified it inert" is a snapshot, not a durable control.
*Check:* grep job/session records for the toolset name; enable the toolset on a scratch profile with dummy creds and see whether the denylist actually blocks registration.

**8. HIGH — §2: the locality and durability proofs are individually weak, and one path is untested.**
"Cloud ledger has no new row" — billing ledgers lag minutes-to-hours, and this one evidently doesn't record 400-rejected calls either, so its silence has two explanations. The cheapest direct evidence — the local server's own log line with matching token counts at the timestamp — was never consulted. The successful run's trigger provenance (scheduler tick vs. manually forced) is unstated; if forced, the scheduled path — daemon env, cwd, and Windows/WSL localhost forwarding at the scheduled hour, which sleep/resume routinely breaks — remains unexercised. The fix also changed provider *and* model in one command, so success cannot be attributed to the provider correction alone; and `:latest` is a mutable tag — one pull and the job silently changes weights, possibly its context ceiling with it.
*Check:* server log at the run timestamp; the executions row's trigger-source field; pin the model by digest.

**9. HIGH — §6: the stopping rule is refuted by its own data; the doctrine is n=5 and self-immolating.**
Findings landed in rounds 4, 5, 7; the longest clean stretch preceding a finding was three rounds (1–3). "Two consecutive clean" is below the loop's own observed inter-finding gap — applied from round 1, it would have halted at round 2 with zero findings. The doctrine ("prescriptions smuggle untested causal models") is generalized from five prescriptions, one author, one session — fully correlated errors, no estimable rate — and it applies with full force to the reversals themselves: 4b's "the backlog was the dead job" is a causal claim verified on n=1 resumed run. It was then written into a *permanent* knowledge record: the exact overreach the doctrine warns against, made durable.
*Check:* none needed for the arithmetic; annotate or strike the permanent record.

**10. MEDIUM — §5: "bounded by caps on every component" ignores the boundary and the coupling between fixes.**
Overflow semantics at `num_ctx` are unstated — hard error vs. silent head/tail truncation decides whether 91% is amber or red, and nobody determined which, or where the cut lands relative to task instructions. Headroom is 5,906 tokens; the obvious follow-up fix (restoring the 23,502-char standing file to full injection) consumes ~2,375 of them, taking the run to ~95%. The recommended remediations interact; the analysis composes none of them. Near-ceiling prefill on local hardware also means wall-time growth before any failure.
*Check:* one inflated-prompt test against the local server; observe error vs. truncation and what gets cut.

**11. MEDIUM — §4a: the 53k-token estimate is tokenizer-naive, and "matches exactly" doesn't.**
214 KB ÷ 4 chars/token imports the runtime's own heuristic; a 7B tokenizer can differ ±30% (≈40–70k tokens), straddling the line between "too big" and "absurd." And 131,072 × 4 × 0.06 = 31,457.**28**; it matches after flooring.
*Check:* tokenize the governance doc offline with the deployed model.

**12. MEDIUM — §3: a branch 2,125 commits behind protects against disk loss only, not against reconciliation.**
Nothing verifies the 23 files sit at paths trunk still uses; if the records layout moved, a future merge duplicates or mis-files them, and the 14 invalid files trip any schema gate at merge time. "Repair is a follow-up" is unowned and unscheduled — i.e., not a plan. Cheaper same-protection path: push the branch (#2) or `git bundle` to another volume.
*Check:* `git log --oneline <trunk> -- <records path> | head`.

**13. LOW — §2:** the durability argument covers only the provider field; registry/env caching in the long-running daemon is unaddressed — bounded in relevance only because the successful run presumably traversed the same daemon. One line, moving on.

---

**Single most likely 30-day problem:** the next scheduled runs operate 5,906 tokens under a ceiling whose dominant component (~73%, per finding #1) was never identified, with a known pending "fix" — un-truncating the standing context — that alone consumes ~40% of the remaining headroom, and whose only warning signals (the hook overflow warning, the truncation marker) reach a human only when a human looks, which on a job that ran unattended through 25 failed days is never. The expected failure is therefore not a crash but the quiet one this document's own §4a describes: silently truncated prompts producing reports that still log `status=completed`, for weeks, until someone rereads this review. Runner-up: one of the 14 committed invalid records reaches the `pre_llm_call` hook and kills the call outright (#3).
