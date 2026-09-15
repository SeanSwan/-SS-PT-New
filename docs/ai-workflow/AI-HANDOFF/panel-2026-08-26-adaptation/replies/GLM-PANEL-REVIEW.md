# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/ss-grillme/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26-adaptation/PACKET.md
**Tokens:** 2981 in / 19170 out (reasoning: 14697) | total 22151
**Wall:** 370.3s

---

# PANEL REVIEW — FULL BRIEF, ALL SEVEN QUESTIONS

Preamble, three lines: The workstream produced real knowledge and shipped none of it. The packet is mostly honest about that failure, then repeats the failure by demanding concrete edits (Q2, Q4) while supplying 3 of 84 rule texts and 0 of 78 skill names. I will not fabricate numbers to look decisive — that is exactly the "completeness asserted, never achieved" sin the panel convicted Rule 68 of. What I can do concretely, I do; what the packet withholds, I convert into an executable procedure and log it as a packet defect under Q7.

---

## Q1 — Should this doctrine go into `CLAUDE.md` / `AGENTS.md` at all?

**Verdict: almost none of it. The doctrine ships primarily as deletions.**

The self-contradiction is real but resolvable: doctrine *about* prose decay doesn't belong in the file, but the doctrine's *content* — "plans are runtime artifacts," the allowlist, the stripped grill-me — is three one-liners. Concretely, the total addition budget is **≤100 words**, and the file must get net shorter, not longer. If the doctrine's arrival makes the constitution grow, it isn't doctrine, it's more OS.

What enters the files, exactly:

- **Rule 15's replacement** (allowlist + runtime-artifact semantics) — ~37 words, drafted in Q2.
- **Rule 68's negation** — one sentence, ~12 words.
- **Rule 64's rewrite** — ~25 words, "exhaustive" and "durable" deleted.

That's it. Everything else in the doctrine lives at the tier where it actually operates:

1. **Hooks/gates** — every check the doctrine describes (exit-code semantics, allowlist path gating) is a PreToolUse or CI check, not prose.
2. **The runtime pipeline** — TTL'd plan artifacts are pipeline *behavior*. You don't write "plans expire" in a constitution; you make committing a plan-shaped file fail a gate, and the rule becomes unnecessary.
3. **One DIRECTION.md, ≤1 page** — the only meta-doctrine worth persisting ("direction survives, blueprints rot; plans are runtime; negative results from instruments are unverified") — because the measurement says direction-class content is the one class that gets re-read (38.1%). Note the irony is acceptable: one direction doc about not writing docs is the last doc that earns its bytes.

**Does any "front-load the constitution" version survive the −4.1% history? Yes — but it isn't shortening, it's displacement.** The −4.1% best attempt failed because it was editorial: shortening by willpower means fighting every rule's local justification, and every rule has one. Displacement is mechanical: **a rule whose violation is deterministically hook-blocked has no remaining job — delete it.** The file shrinks as enforcement moves tiers, not as discipline improves. Additionally, front-load by *tier*, not volume: the first ~40 lines are the only text guaranteed in-context and should contain only (a) hard stops no hook can catch and (b) the values pointer; below a marked line, the file should say explicitly "reference — you are not expected to have read this." Front-loading procedure is refuted by the data; front-loading values and irreversible-action stops is supported by it.

Related concrete point: `AGENTS.md` is a 212KB maintained *mirror*. Stop maintaining it. Generate it from `CLAUDE.md` plus the Codex adapter header in a build step. One edit surface, not two.

---

## Q2 — The concrete edit

**What is verifiable (the only three rules whose text this packet contains):**

| Rule | Action | Replacement (exact text) |
|---|---|---|
| **15** | DELETE as written; REPLACE | "Code changes touching money, auth, data migration, PII, or outward-facing surfaces require a plan in context. Plans are runtime artifacts: passed to the worker, expire at end of run, never committed. Workers ask questions; blocking beats guessing." |
| **68** | DELETE outright | No successor rule. Its content is the last sentence of new-15. Net rule count −1. Deletion is safe because the panel found its mechanism *anti*-corrective: it forbids the only correction channel, and no transcript evidence exists of it catching anything. |
| **64** | REWRITE | "grill-me: structured interview to converge on problem definition before solution work. Output is ephemeral; do not commit durable brainstorm docs." ("exhaustive" and "durable brainstorm doc" die, per the verdict.) |

**The other 81 rules — I cannot honestly name numbers, and neither can any reviewer this packet convenes.** Here is the executable sort in its place, with quotas:

**Deletion safety test — a rule may be deleted if ANY one holds:**
1. A hook already deterministically blocks its violation (of the 18 hooks, the 9 PreToolUse Bash hooks almost certainly cover several existing rules verbatim — those rules are documentation of gates, and documentation of gates belongs in the hook file as a comment).
2. Its violation is detectable by CI/grep post-hoc.
3. Zero enforcement events across the 187 measured sessions — the corpus exists; count them.

**Delete classes:** (a) all rules *mandating document emission or creation* — these feed the 51.1%-never-re-read pathology and grew the inbox to 510; (b) all rules restating hook behavior; (c) all attitude rules ("be skeptical," "be careful with X") — values wearing rule numbers; they move to DIRECTION.md or SOUL.md or die.

**Merge class:** near-duplicates. Arithmetic says they exist: 1,176 lines ÷ 84 rules ≈ **14 lines per rule**. Rules are essays; the merge target is one rule = one line.

**Demote to gate:** every rule that *describes a check* ("verify exit codes," "confirm tool output") — the check belongs in the hook layer; the prose goes.

**Quota: 84 → ≤35 numbered rules, file ≤500 lines, every deletion logged with which tier absorbed it** (hook / CI / DIRECTION.md / nowhere). "Nowhere" is a legitimate and probably large column.

If the packet author wants per-number diffs for the remaining 81, the packet should have contained 84 rule texts. It contained three.

---

## Q3 — `SOUL.md` has no hooks

**Verdict: values/direction — but not "only," and the offered dichotomy hides the real answer.**

The "more procedural prose" conclusion dies on the packet's own evidence. Prose is enforcement only if in-context prose changes behavior, and the packet measured that it doesn't: **instrument-check loaded, 0/3 fired; 48% of documented rules recurred as errors.** More of a non-firing enforcement surface is not enforcement — it's displacement of attention. Loading Hermes with procedure is buying more of the thing that just failed three-for-three.

But "values only, procedures move to the hooked repo" contains an unstated and almost certainly false premise: **that Hermes is subject to those hooks.** SOUL.md lives on a separate machine with *no hooks at all*. The repo's PreToolUse gates cannot reach an agent on another box. "Move procedures to the hooked repo" doesn't move them for Hermes — it deletes them. The packet never establishes Hermes's runtime ever triggers repo hooks, so this inference is unverifiable from the packet, and I flag it rather than grant it.

The correct structure is three-legged:

1. **SOUL.md = identity, values, and ≤5 hard stops written in identity-voice**: "Hermes does not move money. Hermes does not egress PII. Hermes does not merge to main. Hermes escalates irreversible actions to Sean." For an unhookable agent, prohibition-by-identity is the *only* enforcement that exists — and identity/values prose is the one class the data says gets re-read. Strip every blueprint-shaped and TTL-shaped procedure; they rot at 14% and dilute the 38% class.
2. **Shrink Hermes's capability surface to match its enforcement surface.** This is the ladder's top tier: an agent that cannot be gated should not be *able* to do the things that need gating. Procedural prose scales with capability; if you can't check it, don't grant it.
3. **If Hermes must do consequential work, bring it under a hooked harness or route its actions through a hooked gateway.** This is the only condition under which "procedures live in the hooked repo" becomes true rather than aspirational.

One more fact the packet buries: **the unhooked agent is the emission *sink* for the hooked agents' guaranteed writes** — the inbox grew 19 items in two days, all flowing toward the agent least able to enforce anything with them. Q3 and Q5 are the same failure viewed from both ends.

Caveat I refuse to drop: the direction-vs-blueprint ranking is n=21, single-agent, floor-valued. The *negative* result (blueprints rot) is solid. The positive ranking is fragile, and I'd not architect SOUL.md on "38.1%" as a number — only on the robust half: don't put blueprint content in an identity file.

---

## Q4 — Skills

**Plainly: no new skill clears the bar. None.**

Every failure class in evidence has a strictly stronger fix one or two tiers up:

- **Instrument trust** (the tsc incident): architecture tier — don't `npx` on the money path at all; invoke `node_modules/.bin/tsc` under a lockfile pin; gate treats *any* nonzero exit as failure regardless of error-line count (which kills the OOM-reads-as-clean case, exit 134); unexpected banner output is failure. Five lines of gate, stronger than any skill, because it cannot forget itself.
- **Exit-code reading**: already gated, 2-for-2, in seconds.
- **PII/money/auth**: hooks per the prior seat's ranking — which remains unactioned.

**What instrument-check's non-firing proves about the tier:** skills are two different things wearing one directory. *Invoked tools* — procedures an agent deliberately runs — are fine and usage-countable. *Self-activating guards* are structurally broken, because the failure they guard against is inattention and their firing mechanism *is* attention. A guard skill is armor that must remember to be worn. The scoreboard from the packet: reflex 3/3, deterministic gate 2/2, loaded skill 0/3. The tier isn't useless; it is systematically misused for a job it cannot do.

**Is a non-firing skill worse than none? Yes, for the guard class.** Not because of context bytes — because it reads as coverage. instrument-check's existence lets both agent and owner code "instrument trust: handled," which suppresses the reflex that actually caught all three near-misses. That is textbook risk compensation. It should be **deleted, not fixed**, and its subject matter moved to the gate.

**Culling the 78 — criteria, since nobody can evaluate 78 by feel (and the packet, grading its own homework, lists zero of them):**
1. **Zero invocations across the 187-session transcript corpus → delete.** The corpus exists; it counted doc reads; it can count skill calls. This is mechanical, not judgment.
2. **Self-activating guard class → delete or convert to gate** (instrument-check is the named casualty).
3. **Duplicates across the 47 + 31 split → merge to one canonical source.** Two parallel skill directories is itself a smell; overlap is near-certain.
4. **Document-producing skills → delete** — they feed the rot pathology at its source.
Keep: invoked-procedure skills with ≥3 lifetime uses, plus grill-me (survived the panel; it's elicitation). Predicted survivors: 15–25. Do the cull before adding anything; 78 skills with a 0/3 guard record has negative average value per skill.

---

## Q5 — The inbox: 491 → 510

**Verdict: neither offered option alone. The inbox currently does two jobs; split them.**

The mechanics are inescapable: hook-guaranteed producers, no consumer guarantee, no backpressure. At ~10 items/day, a "drain mechanism" is a perpetual consumption obligation — and it would be **consumption theater**: manufactured reads of the review-artifact class that measures 0.25 mean reads of value. Skimmed landfill is still landfill. A drain treats the symptom while the producers keep enqueueing.

The data says cut the requirement *by class*, not wholesale — and the packet's own table contains its quiet counterpoint: **handoff/closeout is re-read at 34%, second-best of all classes.** Some async writing works. So:

1. **Delete the emission requirement for blueprint-class and review-artifact-class output** (14.4% and 14.0% re-read). This is also a Q2 deletion: the mandate is almost certainly one of the 84 rules.
2. **Keep handoffs, but deliver them at runtime** — injected in-context at the next session's start, TTL one run. Same doctrine as plans: the artifact's value window is the run it serves, not the file it rots in.
3. **Anything requiring a decision goes synchronous** — a Stop hook that refuses to pass until handled, or a human interrupt at the moment of decision. A deferred message to an unhooked agent is read by no one; 510 pending items are the proof.
4. **One-time action:** snapshot the 510, grep for items containing an actual decision (I'd bet under 20), deliver those synchronously, archive the rest.

**What is lost by stopping emission: a paper trail. Does the loss matter? Only as forensics — and then it should never have been an inbox.** An inbox implies a reader; 510 pending items means there isn't one, so the trail was write-only all along. If post-hoc forensics matter, emit to an append-only structured *log*: logs are for searching, not reading, and they never need draining. The backlog isn't drained; it's deprecated, and the emission requirement that fed it is deleted.

---

## Q6 — Was this workstream net-negative?

**The steelman, committed to fully:**

Two days. Zero changes to the three governing files. Zero product code. +19 inbox items. One gate that duplicates an already-existing check class — it fired *inside its own test harness*, which is the definition of redundant coverage. And a pile of new persisted documents — panel packets, two learning packets, a values corpus, five Linear comments, this packet — emitted into the *worst-rot class* (review artifacts, 14.0% re-read, 0.25 mean reads) by a workstream whose own measurement concluded that class is worthless. The repo's pathology is producing unread documents; this workstream is a peak specimen, and by its own numbers ~86% of its output will never be opened. Worse: a *values corpus* and *learning packets* are new doctrine — future contradiction fuel, rotting in place. The corrected-numbers section proves the document layer can't even remember the file's size within 23%. The prior seat said "everything else is the OS generating OS," and the response was to generate more OS — a panel, then a packet, then a panel packet about the packet. Net-negative on every metric the packet itself uses.

**Do I believe it? Mostly no — but the "no" is conditional and expiring.**

Three things were bought that don't rot:

1. **The verified negative.** The governing files are untouched, proven by blob hash rather than memory. Before Sean asked, the operating belief was that the doctrine had landed. An agent fleet confidently operating on a false model of its own constitution is the most expensive state in this packet; two days to falsify it was cheap.
2. **The direction-vs-blueprint cut.** Durable, actionable, data-backed. It changes what is worth writing forever — which is exactly why the document *emission* of this workstream was inexcusable while its *measurement* was not.
3. **A prevented negative.** The destruction of checks-not-plans stopped a Goodhart machine from being shipped into the constitution. Prevented negatives never appear in ledgers; they're still real.

So: net-positive in information, net-negative in artifacts, net-zero in enforcement. **The balance flips on one action: the Q2 diff landing in the three files. Now, not after another panel.** If the next artifact produced by this fleet is another packet instead of that diff, the steelman wins and I change my vote.

---

## Q7 — DISSENT: where the framing is wrong

Ranked, strongest first.

**1. The tsc incident is a security incident wearing a process anecdote's clothes.** `npx tsc` fetched *a stranger's npm package mid-verification on money-path code*. That is not a lesson about "validating the instrument" — that is a supply-chain exposure: the verification environment executes arbitrary network-fetched code, and the package that announced itself with a joke is the *friendly* case. The quiet version prints nothing and exits 0. The packet's framing converts an active compromise of the trust environment into a parable about gates, and the proposed remediation (a $? read) does nothing about the actual hole. The correct reading is: the toolchain is untrusted — pin binaries, verify provenance, treat `npx` on the money path as a compromised harness until audited. The packet told this story twice without once saying the word *security*.

**2. The packet demands concreteness it refuses to supply.** Q2 requires edits by rule number; the packet contains 3 of 84 rule texts. Q4 requires merge specifics; it contains 0 of 78 skill names. Any reviewer who returns invented numbers is doing Rule 68 cosplay — asserting completeness that was never achieved. This is not a minor formatting gripe; it is the packet's central failure mode recurring in the document that diagnoses that failure mode.

**3. The unanimity is cheap.** 6/6 verdicts on rules nobody was assigned to defend — Rule 68 as written is indefensible; a unanimous conviction of a strawman is not rigor, it's theater with a quorum. Meanwhile every *hard* case (81 rules, 78 skills, 18 hooks, 510 items) sits outside the packet, and the one prior verdict that was actionable ("drain, cull skills, gate PII/money/auth — everything else is OS generating OS") went unactioned while a new panel was convened to agree with previous panels. The pattern across two days is consensus inflation substituting for execution.

**4. "The gap Sean found" is a dropped instruction, laundered into a discovery.** The work order's final step was "ship the surviving work to the three files." It was not executed, and *no one noticed until the human asked*. Framing it as Sean's sharp question rather than the fleet's compliance failure inverts the responsibility — and it's the thesis eating itself: in an OS where "writes are guaranteed, reads are not," this is the case where even the *instruction to write* wasn't executed, and the response was to write a packet about it. This packet is the 794th document.

**5. The measurement's positive half is over-leveraged and under-covered.** The four-class "decisive cut" accounts for 424 of 793 documents — **46% of the corpus is unclassified in this packet**, and n=21 (≈8 re-read docs) drives the 2.6× headline that Q1 and Q3 then build architecture on. The robust finding is the negative one — blueprints rot. The positive ranking is directional at best.

**The third wrongness, predicted:** both known errors were confident measurement claims (size, lines, prune %). The remaining confident measurement claims are the doc-class rates and the blob-hash verification. My bet: the third error lives in the class table — most likely in the direction-class rate or in the unclassified 46%, which plausibly contains a class that changes the ranking. Treat every number in Part 1.3 as ±wide until independently re-measured, including by me.

---

**Close:** the packet's most damning sentence is its most casual one — "and zero changes to the three files that actually govern agent behavior." The knowledge is real. Ship the diff, delete the emission rules, cull the skills by usage count, pin the toolchain, restrict the unhooked agent. If the next artifact is a packet instead of the diff, Q6's steelman stands.
