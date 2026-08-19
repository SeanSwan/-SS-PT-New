# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/7276bca9-e25d-45a1-9a59-d00ece2a94ce/scratchpad/slice2-hostile-review-brief.md
**Seed:** (none)
**Tokens:** 1839 in / 2952 out | **Cost:** ~$0.0498 | **Wall:** 103.1s | **finish_reason:** stop

---

# Hostile Review — Round 2 Findings

Ranked by severity, then cheapness to check.

---

## F1 — CRITICAL: The 42k variance is unexplained, which means the effect claim itself is unfalsifiable garbage

**Claim attacked:** "Prompt tokens went 87,608 → 41,407" and even the agent's own cautious restatement "the mean dropped."

**Why wrong/unproven:** The five runs are 58,251 / 87,608 / 41,407 / 62,481 / 20,645. Compute the mean of the two pre-fix runs: 72,930. Mean of the three post-fix runs: 41,578. Looks like a drop. Now look again: **run 1 (58,251) is pre-fix and lower than post-fix run 4 (62,481)**. The pre/post partition does not separate the data. A two-sample t-test on n=2 vs n=3 with this variance has no power whatsoever; "the mean dropped" is numerology on five points. Worse, the 46,201-token drop being 11× the explained text cut is not a curiosity to "decline to attribute" — it is positive evidence that **the dominant term in prompt size is something the agent never measured or controlled**. Until that term is identified, the remediation cannot be credited, and *nothing else in this document that uses token counts is trustworthy either*, because the counter's inputs are unknown.

**The variance itself:** A 42k swing seconds apart with byte-similar output artifacts rules out the facts payload (measured small and stable) and rules out response length. The candidates ranked by prior probability:

1. **Session/conversation history replay.** Most likely by far. A scheduled job in agent mode that reuses a session or accumulates history would produce exactly this: a random-walk token count uncorrelated with the day's facts, monotone-ish growth within a session then a reset (20,645 looks like a session reset). This also explains the head-truncation canary loss — history is typically prepended or the system+history block pushes the canary off the front.
2. **Provider-side caching altering reported `prompt_tokens`** — plausible if the server reports uncached tokens some runs and not others, but would usually quantize the counts, not produce a smooth spread.
3. **Pre-call hook injection** — the agent dismissed it because the cap is ~7.5k tokens, but that only rules it out as a *sole* cause; it could stack with history. Dismissal was too fast.
4. **Unreliable usage counter** — unfalsifiable until checked, and cheap to check, so check it.

**Cheapest measurement that settles it:** Log, per run, the **actual request body byte length** (or hash + length) at the transport layer, alongside the reported `prompt_tokens`, for five consecutive runs. If byte length swings with token count, the payload genuinely varies → diff two payloads (the captures already exist; read them in a sandbox — "known-unredacted" is a reason to handle carefully, not a reason to fly blind) and the culprit is visible directly. If byte length is stable while token counts swing, the counter or caching layer is lying and every token figure in both rounds is void. This is one logging line. There is no excuse for it not being done before writing this document.

---

## F2 — HIGH: The 1.72 chars/token ratio proves the comparison is broken, not that the runtime is broken

**Claim attacked:** "The runtime underestimates token cost by ~2.3×."

**Why wrong/unproven:** The agent itself supplied the refutation and then carried the claim forward anyway. 1.72 chars/token for English-plus-JSON is not "unusually dense," it is near-impossible — JSON schema text tokenizes *worse* than prose per character (punctuation, quotes, key names are token-heavy), so schema-heavy input should sit around 2.5–3.5 chars/token, and 51% of this payload is schema. A measured 1.72 means the numerator and denominator do not describe the same thing. The most likely reconciliations: (a) `prompt_tokens` includes chat-template/tool-call overhead the char dump omits — but that would push the ratio the *other* direction (fewer chars per reported token is what overhead produces — consistent, actually), or (b) the char count and token count come from **different runs in a system now known (F1) to vary by 42k tokens run-to-run**. Given F1, (b) alone voids the ratio. Deriving a correction factor from two unpaired measurements in a system with demonstrated 4× run-to-run variance, then propagating it ("6% is really 14%") into a budget claim, is manufacturing precision. The underlying suspicion (CHARS_PER_TOKEN=4 is optimistic for this payload mix) is probably *directionally* right, but "2.3×" is a fabricated significant figure.

**Cheapest measurement:** Tokenize the *already-captured* 100,410-char request payload with the model's actual tokenizer (the server has one; most expose `/tokenize` or it's in the model files). One call, same-run, same-payload. If it returns ~58k, the ratio is real; if ~30k, the cross-run comparison was garbage and the claim must be retracted, not softened.

---

## F3 — HIGH: The decomposition compares a failed run's char dump against a different day's token counts and draws a percentage conclusion from it

**Claim attacked:** "Tool schemas are 51%, the largest component — bigger than system and facts combined."

**Why wrong/unproven:** Three stacked problems, each independently disqualifying:

1. **Failed run.** A run that died at `done_reason: length` with an empty response may have a *different request construction* than a successful run — retries, truncated history, fallback assembly. The agent has zero evidence the failed run's payload is representative and explicitly chose it because it was available. Availability sampling.
2. **Cross-day comparison.** Given F1's demonstrated variance, pairing Monday's char dump with Wednesday's token count is not analysis.
3. **Units.** "51% of characters" does not imply 51% of tokens, and for schema JSON it *understates* the token share — which means the conclusion ("schemas dominate") may survive, but the stated number is wrong and the agent stated it without flagging the unit mismatch. Sloppy even where directionally correct.

Note also: this is the **third** consecutive growth-vector claim. Blaming skills, then facts, then schemas, each time with confidence, each time overturned. The pattern is the defect: the agent keeps naming the largest thing it can see in whatever measurement it most recently took. That is not root-cause analysis; it is anchoring on the last histogram.

**Cheapest measurement:** The F2 tokenization of the captured payload, done per-component (schemas / system / user separately — they're already delimited in the dump). Same payload, real tokenizer, three numbers. Settles units and share in one step; cross-run validity still requires a captured payload from a *successful* run, which the runtime evidently already writes.

---

## F4 — HIGH: "15 most recent" silently inverts the priority semantics of the briefing against an oldest-first injection

**Claim attacked:** The truncation is "closer to spec."

**Why wrong/unproven:** The briefing asks for items "that need Sean or a reviewer, **newest first**." But the injection elsewhere in the system is **oldest-first**, and the overflow behavior truncates the **front**. Composition: the facts script now shows the model the 15 *newest* pending items; the hook injects oldest-first; when the ceiling is hit, the front (oldest-injected material) is dropped first. The remediation did not just drop ~285 filenames — it created a system where the *visible* queue window is newest-biased and the *invisible under pressure* material is oldest-biased, and no measurement establishes which regime any given run is in (F1: one post-fix run still at 95% of ceiling, i.e., still truncating). "Closer to spec" is asserted against the instruction text, not measured against output quality. Was the briefing's "items that need a reviewer" section compared before/after? No. The number 15 is unjustified — not derived from the ceiling, not from typical backlog size, not from the topic-list length the spec implies. It is a round number, and the document's own framing ("grows linearly with a structural backlog") guarantees the omitted tail grows without bound, so the information loss is *unbounded by design*.

**Cheapest measurement:** Two runs, diff the "needs Sean/reviewer" section against ground truth from the queue store (filenames + mtimes are right there). One run at current backlog, one synthetic run with a stale high-priority item older than the 15-item window. If the stale item vanishes from the briefing, the bias is confirmed in output, not just in construction.

---

## F5 — MEDIUM: "No CLI flag" is a stopping point chosen, not a constraint found

**Claim attacked:** The tool-reduction fix is blocked; hand-editing declined.

**Why wrong/unproven:** The agent enumerated a field (`enabled_toolsets`) with no writer and stopped. It did not report checking: profile-scoped toolsets, config-level defaults, the runtime's own **no-agent/script-only mode** (which exists and is arguably the *correct* mode for a job whose agent does nothing but prose — the facts come from a shell script and the "actions" are one shell call and one emit). Skipping the mode question is the worst omission: if script-only mode can gather facts and pass them to a single completion call, the entire tool-schema 51% load, the agent loop, and possibly the session-history variance (F1) all disappear at once. As for the JSON store: refusing to hand-edit is defensible *if* the store is concurrently written by the runtime (clobbering risk) — but the agent did not state that reason, check for a lock/write protocol, or check whether edits survive a restart. "Declined" without a stated hazard is caution theater. The right answer was: verify store-write semantics (cheap: edit a scratch job, restart, observe), then either edit or document why not.

**Cheapest measurement:** Read the runtime's docs/source for script-only mode and job-store write behavior. Under an hour. Then a dry-run job in script-only mode against the same facts script.

---

## F6 — MEDIUM: The escalation line is drawn by effort, not by risk

**Claim attacked:** The "deliberately NOT done" list reflects sound judgment.

**Why wrong/unproven:** Inconsistent in both directions. It declined to hand-edit a JSON file (reversible, testable, local blast radius) but *did* rewrite the facts script's output contract — a change that silently alters what the briefing can say about 285+ queue items, in production, daily, with no output-quality check (F4). That is the higher-blast-radius change and it was shipped. Meanwhile `num_ctx` was escalated as "the owner's hardware decision" — correct instinct, but the KV-cache argument was asserted, not measured (what is the actual KV footprint at 131k vs 65k on this hardware? one config change and one `nvidia-smi`/memory reading). The line drawn is "things I'm confident doing" not "things ranked by reversibility × blast radius," and the confidence is miscalibrated: the one change it made is the one whose information-loss consequences it never measured.

**Cheapest measurement:** Not a measurement — a one-paragraph risk statement per change (reversibility, blast radius, detection-if-wrong) before the next round. The absence of one for the facts-script change is the finding.

---

## F7 — LOW: "Exit code 0 preserved, syntax clean" is not validation of the remediation

**Claim attacked:** "Measured result: 19,670 → 2,814 bytes, exit code 0 preserved."

**Why wrong:** Byte count and exit code verify the script *runs*, not that the briefing still *informs*. No before/after output comparison, no consumer sign-off, no check that "one-phrase topics" is still answerable from 15 items when the backlog is 300. Cheap to fix (F4's diff), but it was not done.

---

## Sections that survive

- Refusing to call the ceiling "fixed" — correct, and the one epistemically sound move in the document.
- Probing the truncation direction with a canary — sound method, survives.

---

## Single most likely failure in the next 30 days

The unexplained token variance is **session/history replay**, and it grows. Backlog grows structurally (proven), history accumulates per session (hypothesized, unrefuted, cheapest un-run test in the document), and the remediation only shrank one component that was never the dominant term. A post-fix run already hit 95% of ceiling. Within 30 days the prompt crosses 65,536 again, the front truncates, the canary-class material (system instructions, briefing spec) drops first, the job returns HTTP 200 with an empty or spec-violating briefing, and — because the agent spent this round declaring victory on a mean computed from five uncontrolled points — no alarm exists for it, since the only monitoring distinction anyone established is "success" reported by a layer that reports success while emitting nothing. The fix that would have prevented it (script-only mode, F5) was available, named in the review prompt, and not investigated.
