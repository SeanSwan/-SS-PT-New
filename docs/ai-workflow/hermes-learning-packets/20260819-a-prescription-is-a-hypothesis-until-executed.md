---
title: "A prescription is a hypothesis until it is executed"
date: 2026-08-19
originating_model: claude-opus-5
tier: fable-tier
tier_basis: "Sean designated claude-opus-5 Fable-tier on 2026-08-10; this session ran as claude-opus-5 end to end."
privacy: "IDs and roles only. No PII, no credentials. Config inspected by key name and boolean presence (Rule 59); no secret values were read into context."
surface: hermes-bot-mode-adoption
decision: "An audit's remediations carry a materially higher error rate than its findings. Execute each prescription by measuring its premise first, never by applying it."
status: shipped
supersedes: none
reviewed_by: glm-5.3, moonshotai/kimi-k3, qwen3.8 (local) — 2026-08-19; all three attacked the doctrine as n=5 overreach and one reversal was falsified on review
linear: SWA-181, SWA-176
models_used:
  - model: claude-opus-5
    role: executor of an inherited handoff's Phase A, then self-hostile reviewer (6 rounds)
    did: "Committed 23 at-risk packets; root-caused and fixed a 25-day cron outage with end-to-end proof; disproved 3 of the handoff's own 5 prescriptions before applying them; found a 91%-of-window ceiling risk in the thing it had just fixed."
    cost: subscription
  - model: glm-5.3
    role: prior-session reviewer of the same handoff
    did: "Contributed the re-fork strategy and rollback-as-binary-plus-home. Produced 5 checkable claims, 3 of which direct measurement disproved."
    cost: subscription
  - model: moonshotai/kimi-k3
    role: prior-session reviewer of the same handoff
    did: "Contributed 'a backup you have not booted is a hypothesis', which is this packet's lesson applied to backups. Its own merge-tree suggestion failed on the installed git version."
    cost: $0.043
skills_touched:
  - id: rule-73 Proof-Before-Done
    change: earned-its-keep
    motivating_failure: "hermes cron edit exited cleanly and hermes cron run printed 'Ran now: succeeded.' Neither is proof. The execution row, the token counts, the non-SILENT output artifact and the drain side-effect were."
  - id: rule-30 Subagent and external-claim skepticism
    change: earned-its-keep
    motivating_failure: "The handoff was itself the 'subagent'. Treating its prescriptions as hypotheses is what caught the harmful one."
  - id: rule-59 Read-time secret exposure prevention
    change: used-as-designed
    motivating_failure: "Needed to audit a 24 KB config holding live provider keys plus a .env with 35 vars. Answered every question with key names, booleans and counts; zero secret values entered context."
  - id: hermes-inbox drain hook
    change: proposed-change
    motivating_failure: "TOTAL_CAP 30000 with STANDING_CAP 14000 leaves roughly 16k chars per call for memos, about 3 memos. At one automated call per day a 304-memo backlog needs about 85 days."
---

# A prescription is a hypothesis until it is executed

## The lesson

I inherited a handoff I had written myself the session before. It was evidence-based, every
finding carried a re-verification command, and it had been hostile-reviewed twice. Its **findings**
held up well. Its **prescriptions** did not: of the five Phase A actions it told the next agent to
take, **three were wrong**, and one would have caused real damage.

That asymmetry is the lesson. A finding says *this is the state of the world* and is cheap to
verify. A prescription says *therefore do X* and smuggles in a causal model of why the state is
what it is. The evidence gathered to support the finding does nothing to test that causal model, so
the prescription inherits the finding's confidence without inheriting its verification.

What makes this dangerous is that **a wrong prescription looks exactly like a right one** in the
document: same tone, same citation density, same neighbouring correct items.

Every one of the three died on a measurement that took under two minutes.

| Prescription | What killed it |
|---|---|
| "Raise context_file_max_chars, the 31,457 limit truncates the constitution" | Ran prompt-size from two directories. From the home directory there is no truncation at all and the profile costs 3.5 KB, not 32.4 KB. Then the arithmetic: 131072 x 4 x 0.06 = 31457 exactly. The limit is a deliberate 6%-of-window budget, not a default to raise. |
| "Drain the ~300 pending memos to consumed/" | Read the drain hook. It is an automatic pre_llm_call hook that moves **only what it injected**. A manual archive would have pulled 300+ memos out of the injection path unread. |
| "Scrub the dormant x_search Grok model entry" | Followed the fallback. Unsetting it lands on DEFAULT_X_SEARCH_MODEL = grok-4.5. The value was never the control; absent credentials and a disabled toolset were. |

The middle one is the one to remember. It was not a no-op. It was a plausible, well-motivated
instruction whose execution would have silently destroyed a month of a learning channel while
appearing to comply with the very rule (Rule 34) that says archive rather than delete.

## Who did what

**claude-opus-5 (me)** executed Phase A and self-reviewed for six hostile rounds. Correct calls: the
cron root-cause diagnosis (the job was bound to provider `custom` with a null base_url, so an Ollama
model name was routed to OpenRouter, which correctly rejected it) survived contact exactly as
written; and committing the 23 at-risk packets was straightforwardly right. Wrong calls: the three
above, all of them **mine**, written by me in the prior session with full confidence.

**glm-5.3** gave the most durable structural advice in the whole engagement: re-fork rather than
merge, and rollback must restore binary and home together. It also produced five checkable claims of
which three were false. Deep on strategy, unreliable on facts about a system it cannot touch.

**moonshotai/kimi-k3**, for four cents, produced the single sentence that best predicts this packet:
"a backup you haven't booted is a hypothesis." It was right about backups and, unknowingly, right
about prescriptions. Its concrete suggestion (git merge-tree --write-tree) required git 2.38 or
newer against an installed 2.34.1.

**Neither paid model found the actual P0.** The morning briefing had been dead for 25 days. Both
reviewed a document that did not mention it. They can only attack what you put in the brief.

## Skills created or changed

No new skill. Three existing rules earned their keep and one component gained a proposed change, all
recorded in the frontmatter above. The most load-bearing was Rule 73. `hermes cron edit` exited 0,
and `hermes cron run` printed "Ran now: succeeded." Had I stopped at either, I would have reported a
25-day outage resolved on the strength of a string. What actually proved it: a fresh
status=completed execution row; real token counts (58,251 prompt / 1,379 completion) where the prior
failures logged null; an output artifact containing a real four-section briefing rather than the
SILENT suppression response; a cloud-ledger whose newest row predates the run, proving it ran local
rather than on paid cloud; and the drain hook moving three memos, which is a side-effect that occurs
only on a successful LLM call.

## Mistakes I made

- **I wrote three wrong prescriptions in the prior session and flagged none of them as unverified.**
  Every one was stated in the imperative. The document's own evidence index covered its *findings*
  and not one of its *actions*, an asymmetry I did not notice while writing it and which is the
  direct cause of this packet.
- **I relayed a model's guess as fact.** GLM's "the 1,572 commits likely include home-schema
  migrations" went into the section driving the entire rollback plan, hedged as "likely", after
  three of GLM's other claims had already been disproven. Caught in a hostile round and verified
  true, with harder evidence than GLM had. Being right by luck is still the mistake.
- **I got the same arithmetic wrong twice in a row.** Stated a context tax as 78.8 KB, "corrected"
  it to 79.6 KB, and both were wrong: 79,597 bytes is 77.7 KB. I divided by 1000, then compounded
  the error while ostensibly fixing it. A correction pass is not automatically more careful than the
  pass it corrects.
- **I published a table whose numbers were measurement artifacts.** The "32.4 KB, of which 28.1 KB
  is context" figure for the private profile is true only when prompt-size runs from inside the
  repo. From home it is 3.5 KB with zero context. I recorded the number without recording the
  condition that produced it.
- **I nearly declared the fix done at the wrong moment.** The intended next step after a clean cron
  run was to move on. The 91%-of-window ceiling, the single largest remaining risk to the thing I
  had just repaired, surfaced in hostile round 5, four rounds after I would have stopped.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Prescription stated without verifying its premise | 3 (all inherited from my own prior session) | No, the prior session shipped them as instructions | Executing each item by measuring its premise first rather than applying it |
| Relaying an external model's claim as fact | 1 | **Yes.** The doc's own calibration section recorded that 3 of GLM's 5 claims were false, and I relayed a 6th anyway | A hostile round that grepped the document for hedge words and checked each hit |
| Unit or arithmetic error in a headline figure | 2 (the second while correcting the first) | Yes, immediately prior | Recomputing explicitly instead of re-reading |
| Accepting a clean exit code as proof | 0 reached the report | n/a | Rule 73 fired before the claim left the turn |

**The highest-signal row is the second.** The document already contained the finding that this
model's claims fail verification at a 60% rate, in a section I wrote, and I relayed another of its
claims anyway. Writing the lesson down did not prevent the repeat. What prevented it was a
mechanical step, grep the document for hedge words and check each hit, which is why the correction
that survives is procedural and never resolutional.

## External-model calibration

| Model | Cost | Findings real | Findings disproven | Verdict |
|---|---|---|---|---|
| glm-5.3 | $0, subscription | re-fork over merge; rollback = binary + home; backup-under-load risks torn SQLite; characterization baselines; prune before split | 3 of 5 checkable factual claims | **Yes, for strategy.** Route architecture and sequencing questions here. Never accept its facts about a live system without local verification. |
| moonshotai/kimi-k3 | $0.043 | "a backup you haven't booted is a hypothesis"; credential scoping; start with 2 bots | merge-tree --write-tree needs git 2.38+, installed is 2.34.1; "287 memos means nothing consumes them" is wrong, consumed/ archives exist | **Marginal at this price.** One durable aphorism. Its remit also leaked at the start of the call and it self-corrected. |

Neither model found the dead cron, the two-profile reality, or the truncation, because **none were
in the brief**. Direct measurement outperformed both paid reviews here, and the two reviews together
cost under five cents, which is the correct way to read that result: they were cheap and useful, and
they were not a substitute for touching the system.

## Panel correction — this packet's own doctrine is n=5 (added after review)

GLM-5.3, Kimi K3 and a local Qwen seat reviewed this work. All three independently attacked the
doctrine above, and they are right on two counts:

1. **n=5, one author, one session.** The errors are fully correlated; no error *rate* is estimable
   from them. The generalization is a **hypothesis worth carrying**, not a law. GLM: "written into
   a permanent knowledge record — the exact overreach the doctrine warns against, made durable."
2. **It indicts itself.** The three reversals are themselves prescriptions with inherited
   confidence. One of them was then **falsified on review**: "the memo backlog was caused by the
   absence of LLM calls" was a causal claim resting on n=1 resumed run. Measurement showed **662
   memos were archived during the 25-day outage** — the drain never stopped, and the backlog is
   structural (arrival exceeds a capped drain). The reversal was as wrong as the prescription it
   replaced, in the same way, for the same reason.

That falsification is the strongest evidence *for* the underlying observation and *against*
enshrining it as law. Treat the asymmetry as a prior that earns extra verification on any
"therefore do X", not as a rule.

**Also corrected by the panel:**
- The headline "the growth vector is the 128-skill system prompt" was **wrong**. Measured from the
  scheduler's real cwd, tool schemas are 48,818 B against a 13,097 B skills index, and ~65% of the
  prompt remains unattributed. The claim was argued from an accounting that explains a third of the
  number.
- "An uncommitted record is one disk failure from gone" was used to justify committing — but `.git`
  sits on the same volume, so a **local commit does not address disk failure at all.** The
  justification defeated itself, and nobody in three self-hostile rounds noticed.
- The stopping rule ("two consecutive clean rounds") is below this loop's own observed
  inter-finding gap: findings landed in rounds 4, 5 and 7 after a clean streak of 3. Flagged to
  Sean rather than changed — the dry-loop law is his.

## Related

[[2026-08-19-a-handoff-decays-at-its-most-confident-claims]] is the companion lesson from a parallel
session on a different handoff: claims decay fastest where they are most confident. This packet is
the other half. Prescriptions are wrong more often than claims, and unlike a stale claim, a wrong
prescription can do damage when followed.
