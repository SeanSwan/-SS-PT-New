# PANEL PACKET — THE DETERMINISTIC TURN

## READ THIS FIRST — operating conditions for your review

**You CANNOT read files. You have no repository access, no tools, and no ability to
fetch anything. Everything you need is in this packet.** Do not plan to inspect code, do
not ask for a file, and do not spend reasoning budget on retrieval you cannot perform. If
a claim here is unverifiable from the packet alone, say so explicitly and reason from what
is given.

**Answer the COMPLETE brief across every angle.** Do not narrow to your specialty, do not
narrow to design, and do not assume another seat covers an angle you were also asked
about. Every seat answers everything.

**Dissent is mandatory and is the highest-value thing you can produce.** This packet was
written by the agent that did the work; it has a stake in its own framing being right.
Attack it. A reply that agrees with everything is a reply that was not worth its cost.

**Context:** SwanStudios is a production personal-training SaaS (React 18 + TypeScript +
styled-components; Node/Express/Sequelize/PostgreSQL). Its AI operating system is a
~164KB constitution of 84 numbered rules, ~105 skill directories, a Hermes learning
corpus, and a set of deterministic git/shell hooks. One human owner (Sean) directs a
fleet of agents. Two industry transcripts have just challenged core parts of this design.

---

## PART 2 — THE NEW CONTEXT (two transcripts, distilled)

### 2.1 Theo Browne — against memory systems

1. **Code is ground truth.** A memory system is a second thing to maintain and a
   split-brain risk. Comments and stale plan files are not merely dead — they are
   *actively harmful*, steering humans and agents wrong.
2. **His audit of Claude Code auto-memory** (the empirical core): one project had 45
   memory files; **26 had never once been read**; write:read ratio **3:1** (80 sessions
   wrote, 19 read). Contents were expired point-in-time state — PR numbers, "the GitHub
   CLI was out of date," shipped feature specs. Verdict: fleet-wide off.
3. **Bash is all you need.** Cursor invented the retrieval-graph approach and abandoned
   it. The industry's own strongest signal that dynamic context systems lost to "give
   the agent tools and let it look."
4. **Lauren's value ladder — adopt this verbatim as our prioritization law:**
   1. **Categorically eliminate** the failure class through architecture / data structures.
   2. If you cannot, **make CI / lint / tests catch it.**
   3. Only if both fail, **hesitantly** add a rule or skill.
   4. Last resort, a human in the loop.
   > **Skills and rules are the safety net, not the reach-for tool.**
5. **Agent files should carry direction, not rule-lists.** What the product *is*, what
   makes it special, a glossary, taste. Success = the agent surprises you by extending
   your intent correctly, not by obeying numbered clauses.
6. **His proof case:** he cared about payload size, so he built a CI bandwidth check with
   a ceiling. Result: *agents now fix regressions before they ever report to him.*

### 2.2 Uncle Bob Martin — the agentic gauntlet

1. **Lost-in-the-middle.** As context builds, the beginning and end hold priority; the
   middle is effectively gone. *"Anything you say at the very beginning is going to get
   shoved into the middle if it's long."* Therefore: **trim the initial prompt to its
   absolute minimum**, and put enforcement in deterministic tools, which never fall out
   of context.
2. **Rules are Pirates-of-the-Caribbean guidelines.** Models soften them. (= our 48%.)
3. **Loop the agent against a deterministic tool until the tool says OK.** You trade
   productivity for quality; the trade is worth it while you stay ahead of human speed.
4. **The gauntlet:** specifier → coder → cleaner → hardener → QA. Each agent born,
   does one task, dies — so the next starts with a clean context. Focused tasks keep
   context small, which lets a few more rules survive at the top.
5. **The tools he considers newly practical because agents are fast and never bored:**
   - **CRAP score** (coverage × cyclomatic complexity). Human threshold ~4; **agent
     threshold ~6, possibly 8** — agents tolerate more complexity than humans.
   - **Mutation testing.** Flip operators, expect the suite to fail; **a surviving mutant
     must be killed.** Impractical for humans (overnight runs), trivial for agents.
   - **A dependency-rule spec file the agents cannot violate**, plus a checker that
     forces inversion / interface insertion / module splits when they do.
   - An **architecture viewer** (clickable module/dependency diagram) so a human can
     audit structure without reading code.
6. **Impose human VALUES on agents, not human DISCIPLINE.** TDD is a *discipline* built
   around human short-term-memory limits; agents have enormous accurate short-term
   memory, so red-green-refactor line-by-line is the wrong shape for them. Values —
   privacy, quality bars, taste — absolutely do transfer. **Thresholds may need to change.**
7. **Spec-driven development is the waterfall trap returning.** He tried it; *"it's
   always a disaster."* Plans are gorgeous and then fall apart because the human didn't
   think of everything. His answer: **the agile shape — small slice, feedback,
   reorganize.** His specs are **ephemeral and not persisted.**
8. **"Don't download my tools — point your agents at them and have them build one for you."**
9. **The asymmetry to remember:** agents read everything we write; humans read almost
   nothing agents write.
10. **His end-state goal:** get to where he doesn't read the code at all — he audits
    *scores* and spot-checks, because the agents are fast with code and he is slow with it.

---

## PART 3 — THE COLLISION (honest, with our own measured numbers)

### 3.1 What these transcripts VALIDATE about our work

- **Every gate we shipped is Lauren's layer 2 / Bob's deterministic tool.** The heredoc
  gate, exit-status gate, constitution guard, rulebook trailer check, drift probes, fires
  analyzer — all mechanical, all outside the context window, none forgettable. This is
  precisely the tier both men endorse, and it is the strongest part of the session.
- **Our 48%-recurrence measurement is Bob's "guidelines" claim, proven in our own repo.**
  We did not need his authority; we had the data first. Keep this framing.
- **Shipping the heredoc gate in SHADOW mode** matches Theo's CI-ceiling pattern: measure
  real traffic before enforcing, so the enforcement is calibrated rather than asserted.
- **Emitting `## Mistakes I made` and the error→fix→repeat ledger** is the raw material a
  ladder-climb needs: you cannot eliminate a class you have not counted.

### 3.2 What they CHALLENGE — and the numbers we measured today

Run for this handoff, current as of 2026-08-25:

| Artifact | Count | Size | Signal |
|---|---|---|---|
| `CLAUDE.md` **after** the 6% prune | 988 lines | **164,499 bytes** | Bob's lost-in-the-middle applies at full force. The middle of an 84-rule file is not being read. |
| Rules in the constitution | **84** | — | Drift-check reports the file *claims* 66. **A rulebook that cannot count itself is a rulebook nobody finishes reading.** |
| Skill directories (`.claude` + `.agents`) | **37 + 68 = 105** | — | Lauren says skills are the fallback tier. 105 of them is not a fallback posture. |
| Hermes learning packets | 138 | 1.26 MB | Growing, durable, committed. |
| Inbox memos **pending** | **491** | — | **207 older than 7 days**; oldest 2026-08-12. |
| Inbox memos consumed | 696 | — | Draining happens, but is far behind writing. |
| `AI-HANDOFF/` markdown | **1,607 files** | **15.0 MB** | **308 untouched >30 days** — Theo's "stale plan files rot into actively harmful context," at scale. |

**The honest read of our own audit — better than Theo's in one way, worse in another:**

- **Better:** unlike his 26-never-read files, our corpus *is* consulted. Across 180
  session transcripts: 123 opened a learning packet, 72 ran the corpus grep surface.
  *(Caveat, stated because the panel will catch it otherwise: a flat path-grep cannot
  perfectly separate reads from writes. The read side is real but the exact ratio is
  `[LIKELY]`, not `[VERIFIED]`.)*
- **Worse, and unambiguous:** **491 pending memos with 207 over a week old.** The Stop
  hook guarantees the *write*; nothing guarantees the *drain*. That is Theo's failure
  mode in its purest form — a write-only channel that reads as diligence.

**The five specific challenges to answer:**

1. **The 84-rule constitution violates lost-in-the-middle.** Our prune removed 6%. Bob's
   standard is "absolute minimum." A 6% trim on a 164KB file is a rounding error.
2. **Ceremony hooks vs correctness hooks.** Our Stop hooks (memo / Linear / dual-tier /
   dry-loop) are deterministic — but they enforce *paperwork completeness*, not *code
   correctness*. Bob's tools make the code better. Ours make the report complete. That is
   a real distinction and we should own which is which.
3. **Rules 15 / 64 / 68 are spec-driven development** — recursive planning, grill-me
   extraction, and "Fable writes a plan so complete a worker-bot executes it verbatim."
   Bob tried exactly this and calls it the waterfall trap. **This is the sharpest
   doctrinal conflict in the repo and it must be resolved, not smoothed over.**
4. **We have none of Bob's highest-value tools.** No CRAP score. No mutation testing. No
   dependency-rule checker. No architecture viewer. These are layer-2 instruments that
   would retire prose rules wholesale.
5. **Value vs discipline is unaudited.** Some of our 84 rules encode *values* (zero PII,
   dark-first, no MUI, care-first, trainer-indispensability). Others impose *human
   discipline* (report shapes, ceremony ordering, phrasing bans). Bob says the first
   transfers and the second does not.

---

## PART 4 — THE PROPOSED WORK (ranked by the Lauren ladder)

Nothing below is built. This is the work order the panel is being asked to attack.

### Slice A — The Rule-to-Ladder Ledger *(highest value; unblocks everything else)*
For each of the 84 rules, classify into exactly one bucket, with evidence:
- **L1 — architecturally eliminable** (the mistake becomes impossible; retire the rule)
- **L2 — gate-able** (does a gate exist? if not, build it; then retire the prose)
- **L3 — genuinely prose-only** (a *value*, not a discipline; keep, compressed)
- **L4 — dead** (superseded, obsolete, or ceremony; retire)

Output: one table, one commit per bucket-migration. **The success metric is rules
retired-into-gates, not rules written.**

### Slice B — Restructure `CLAUDE.md` for lost-in-the-middle
Target shape: a **short, front-loaded** identity + direction + taste + glossary layer
(Theo's model), with everything enforceable living in gates and everything narrative
living in the corpus. Ambition is not a 6% trim; it is a different *shape*. The
constitution guard's declared-trim bounds (50% per rule / 25% per set / 11,500 chars)
now govern how fast this can legitimately happen — by design, so it lands in reviewed
increments rather than one clobber.

### Slice C — Build the three missing deterministic tools *(Bob's, adapted — not downloaded)*
1. **CRAP scoring** for our stack, agent threshold calibrated (start 6, measure, tune).
2. **Mutation testing** on the money-path and data-truth modules first.
3. **Dependency-rule spec + checker** — the module boundaries agents cannot violate.
Each ships with its own fire-log so we learn its false-positive rate before enforcing,
exactly as the heredoc gate is doing now.

### Slice D — Corpus drain + expiry discipline
- Drain the **491 pending memos** (207 stale) and make drain-lag a *drift-check probe*,
  so the backlog can never again grow silently.
- Give every handoff/plan doc an **`expires_if:`** front-matter field (this doc has one)
  and add a probe that flags expired-but-unmarked docs. **308 stale files** is the
  measured problem this solves.
- Decide, explicitly: does the learning corpus earn its keep at 138 packets / 1.26 MB?
  Measure per-packet reads before growing it further.

### Slice E — Values vs discipline audit of `SOUL.md`
Hermes has **no hooks** — prose is its *entire* enforcement surface, so lost-in-the-middle
hits hardest there. The 10 reflexes we just added are 62 lines appended after four
"Mandatory … gate" sections. Questions for the panel: is that already past the priority
zone? Should the reflexes move to the **top**? Are any of the 10 a *discipline* rather
than a *value*?

### Slice F — Resolve the spec-driven conflict (Sean-gated, do not decide unilaterally)
Rules 15/64/68 vs Bob's "spec-maxing is the waterfall trap." Possible resolutions:
plan-depth proportional to reversibility; keep grill-me for *taste extraction* (which is
value-transfer, and Bob would endorse) while dropping *implementation pre-planning*;
or keep as-is with evidence. **This changes how Sean works. He decides.**

---


---

# THE ORIGINAL SEAT BRIEF

### 5.3 The brief to hand the seats

Give every seat: Part 2 (both transcripts distilled), Part 3 (the collision + our measured
numbers), and Part 4 (the proposed slices). Ask each for:
- Which of the five challenges in §3.2 are **real**, and which are cargo-cult adoption of
  an outside opinion that does not fit this repo?
- Rank the six slices by value-per-effort. **What is missing from the list entirely?**
- For Slice A: propose the classification *criteria*, not just the buckets.
- **Adversarial:** what does the ladder cost us? Where would eliminating a prose rule
  actually *lose* something a gate cannot capture?
- **DISSENT (mandatory):** where is this handoff's own framing wrong?

**Additionally — Sean's explicit instruction 2026-08-25, ask every seat this directly:**

1. **The spec-driven conflict is now a FIRST-CLASS panel question, not a parked one
   (supersedes Slice F's "surface, do not decide").** Sean wants the seats' reasoning on
   the record before he arbitrates. Ask each: our Rules 15 / 64 / 68 mandate planning
   before code, an exhaustive pre-build interview, and "a plan so complete a worker-bot
   executes it verbatim with ZERO further questions." Bob Martin tried exactly this and
   calls it the waterfall trap returning; his specs are ephemeral and unpersisted.
   **Which of our three rules genuinely fall to that critique, and which survive it and
   why?** Give a verdict with reasoning — Sean arbitrates, but he wants the argument.
2. **The proposed resolution, attack it.** The working answer is: *keep the interview,
   kill the blueprint, keep the checks* — i.e. (a) grill-me survives because it extracts
   **values**, which Bob says transfer to agents, rather than implementation steps;
   (b) Rule 15 becomes **plan-depth proportional to reversibility**; (c) Rule 68 inverts
   so the expensive model's output is **the acceptance check, not the plan** — because a
   check is deterministic, lives outside the context window, and fails loudly instead of
   rotting silently. Where does this resolution break?
3. **grill-me as a standing values organ.** It has been made domain-independent (not owned
   by the design router), given a seven-tier values ladder, and given a durable output —
   `docs/ai-workflow/references/SWAN-VALUES-CORPUS.md`, promoted to only by tier-7
   "applies everywhere" answers. Ask each seat: **is a values corpus the right Direction
   layer, or does it become the 492nd write-only artifact this repo already struggles to
   drain?** What makes a values doc get *read* rather than merely written? What is the
   right cap, and what is the eviction rule?
4. **Values vs disciplines, applied to our own rulebook.** Bob: values transfer to agents,
   disciplines do not. Ask each seat to name which of our rule *classes* are values
   (keep, compress, front-load) and which are disciplines (retire into gates, or delete).

---


---

# THE QUESTIONS — answer ALL of these

## Q1 — Which of the five challenges in §3.2 are REAL?

For each of the five, rule: **real defect** / **cargo-cult adoption of an outside opinion
that does not fit this repo** / **partially real, with this specific caveat**. Give your
reasoning, not just a verdict. An outside expert's opinion is not automatically correct
for a context they have never seen.

## Q2 — Rank the six slices (A–F) by value-per-effort. What is MISSING from the list?

The missing item matters more than the ranking. What would you add that nobody proposed?

## Q3 — Slice A classification criteria

Propose the *criteria* for sorting 84 rules into L1 (architecturally eliminable) /
L2 (gate-able) / L3 (genuinely prose-only value) / L4 (dead). Not the buckets — the
decision procedure that a different agent could apply to rule #57 and get the same answer
this agent would.

## Q4 — ADVERSARIAL: what does the ladder COST us?

Where would retiring a prose rule into a gate actually *lose* something a gate cannot
capture? Name a specific rule class where prose is genuinely superior to mechanism.

## Q5 — THE SPEC-DRIVEN CONFLICT (Sean's explicit instruction — first-class question)

Three of our rules mandate planning before code:
- **Rule 15:** recursive planning before ANY implementation — "NO code without a plan."
- **Rule 64:** `grill-me` — an exhaustive pre-build interview, one question at a time,
  checkpointed to a durable brainstorm doc.
- **Rule 68:** "Fable writes a plan so complete a worker-bot executes it verbatim with
  **ZERO further questions**." Plans are persisted in-repo.

Bob Martin tried exactly this and calls it *"always a disaster"* — the waterfall trap
returning. His specs are **ephemeral and not persisted**; his shape is agile: small
slice, feedback, reorganize.

**Which of these three genuinely fall to that critique, and which survive — and why?**
Verdict plus reasoning on each of the three, separately. Sean arbitrates the final call,
but he wants the argument on the record.

## Q6 — ATTACK the proposed resolution

The working answer is **"keep the interview, kill the blueprint, keep the checks"**:

- **(a)** `grill-me` survives *because it extracts VALUES, not implementation steps.*
  Bob's own cut is "impose human VALUES on agents, not human DISCIPLINE" — values transfer
  to an agent and stay true for years; disciplines are built around human limitations
  agents do not share, and decay into guidelines (measured: 48% recurrence in this repo).
- **(b)** Rule 15 becomes **plan-depth proportional to reversibility.** A reversible UI
  slice gets a paragraph; a migration, billing or auth change gets the full treatment.
- **(c)** Rule 68 **inverts**: the expensive model's output becomes **the acceptance check,
  not the plan.** Rationale — a check is deterministic so it cannot be softened; it lives
  outside the context window so it cannot be lost-in-the-middle; it fails loudly instead
  of rotting silently; and a worker-bot pointed at a failing check with freedom over the
  *how* will out-perform one following steps written by someone who could not see the code.

**Where does this break?** Attack each of (a), (b), (c). Is the values/disciplines
distinction actually crisp enough to sort real rules by, or does it collapse under
examination? Is (c) too clever — are there whole classes of work where an acceptance check
cannot be written in advance, making the "plan" genuinely irreplaceable?

## Q7 — Is a VALUES CORPUS the right Direction layer, or the next write-only artifact?

`grill-me` has just been made domain-independent (explicitly not owned by the design
router), given a seven-tier ladder (function → intent → priority → refusal → taste →
precedent → transfer), and given a durable output: `SWAN-VALUES-CORPUS.md`, a short
standing document promoted to ONLY by tier-7 "should this apply everywhere?" answers.

The stated theory: tier 7 compounds — every yes permanently removes a future question.

**But this repo has 491 pending inbox memos (207 over a week old) and 1,607 handoff docs
(308 untouched in 30 days).** It is demonstrably good at *writing* durable artifacts and
bad at *draining* them.

- Is a values corpus genuinely different in kind, or is it artifact #1,608?
- **What structurally makes a document get READ rather than merely written?** Be concrete.
- What is the right size cap, and what is the eviction rule?
- Is seeding it from *observed* values (rather than values Sean confirmed at tier 7) a
  reasonable bootstrap or a corruption of the corpus at birth?

## Q8 — VALUES vs DISCIPLINES, applied to our actual rulebook

Bob: values transfer to agents; disciplines do not. Sort our rule *classes*:

- Which are **values** → keep, compress, front-load (examples in the repo: zero PII to
  LLMs, care-first, trainer-indispensability, least-clicks, dark-first, no-yoga language,
  credential phrasing)?
- Which are **disciplines** → retire into gates, or delete (examples: mandated report
  shapes, closeout ceremony ordering, forbidden-phrase lists, dual-tier summary format,
  memo/packet emission requirements)?

Where is the line genuinely ambiguous, and what do you do with those?

## Q9 — DISSENT (mandatory)

**Where is this packet's own framing wrong?** What has the author assumed that a
disinterested reader would not grant? Name at least one thing.
