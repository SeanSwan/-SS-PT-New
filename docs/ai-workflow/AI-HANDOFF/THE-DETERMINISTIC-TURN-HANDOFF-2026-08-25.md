---
title: "The Deterministic Turn — full session handoff + hostile-review work order"
date: 2026-08-25
author: Fable 5 (claude-fable-5)
status: open
decision: "Re-found the agent operating system on deterministic tools; demote prose rules and memory-shaped artifacts to the fallback tier they belong in."
supersedes: none
expires_if: "the six-seat panel returns and its fixes ship — then mark superseded and point at the successor"
---

# THE DETERMINISTIC TURN

**What this is:** the complete carry-forward for a session that (a) mined two months of
agent reports for recurring failures and converted the worst into mechanical gates, and
(b) then received two industry transcripts — Theo Browne on memory systems, and Uncle
Bob Martin on agentic engineering — that independently argue the same thesis from the
outside and challenge parts of what we built.

**Who reads this:** the next agent, cold, with no access to the originating chat.
Everything needed is here. Read it end to end before touching anything.

**The one-sentence thesis you are inheriting:**
> Prose rules degrade; deterministic tools do not. Every duty an agent must remember is
> a duty that will eventually be dropped. The work is to move as much of our operating
> system as possible *down* the ladder — from "a rule the model must recall" to "a check
> that cannot be forgotten" to, best of all, "a shape where the mistake is impossible."

---

## PART 1 — WHERE WE CAME FROM (the session narrative)

### 1.1 The originating ask

Sean, angry and specific: *"I was just trying to figure out what were the main issues my
AIs were always having over the past month… so that we could create skills or whatever is
needed via the agents.md and the Claude.md as well as the soul.md for Hermes… I want the
cleanest agent so that when I'm coding, it just happens naturally… least errors, least
bugs, least mess ups. I'm seeing Opus 5 all day make mistakes, and give me bugs. For every
bug it fixes, it adds one… I don't want no more bugs… I am not taking three steps forward
and two steps back every time I code."*

### 1.2 What the corpus mining found

Source: 1,291 agent reports across ~2 months (Hermes learning corpus + inbox memos +
handoff docs). Output doc: `docs/ai-workflow/AI-HANDOFF/AI-WEAKEST-LINKS-REVIEW-2026-08-25.md`.

**Twelve failure families. The headline numbers, which are the empirical backbone of
everything below:**

| Family | Volume | Recurrence AFTER being written up |
|---|---|---|
| Narrow-read → broad-claim | — | **88%** |
| Shell / escaping | 123 bullets, 19 ledger rows | **63%** |
| Instrument-trust (green ≠ working) | — | **68%** |
| `$?` after a pipeline | 44 hits | the single most-recurring *mechanism* |
| **All families, aggregate** | — | **48% recurred after documentation** |

Two derived facts that shaped every decision since:

1. **266 near-misses were caught by hooks that already existed.** Gates work.
2. **48% of documented errors recurred anyway.** Prose does not hold.

> This is, independently, Uncle Bob's "the models treat rules as *guidelines*" —
> measured, in our own repo, before we ever saw his interview.

### 1.3 What shipped in response (all merged to `main`)

| PR | SHA | What |
|---|---|---|
| #72 | `732843e39` | The weakest-links gates: heredoc-escape gate (**shadow-by-default**), rulebook-review-guard + `.githooks/commit-msg`, spend-ledger hardening, drift-check probe 10 (dead CI), `sweep.mjs`, `instrument-check` skill |
| #76 | `4f08630e7` | SOUL-panel fold + `gates-fire-report.mjs` (the shadow-period instrument) + drift probe 11 (rulebook bypass) + hook-classify canonical-idiom resolver |
| #77 | `d4c5ca0b6` | Learning packet: mandatory Mistakes section + error→fix→repeat ledger |
| #78 | `cc2659deb` | R3 fold: shared trailer test, ancestry-anchored probe, loud fail-open |
| #79 | `92e16d0ac` | R4 fold: organic readiness floor, prose-proof trailer, basename parity |
| #80 | `4f628cdeb` | **The narrative-cut prune** (13 rules, −6.04%) + constitution-guard depth/breadth bounds |

**Hermes side (WSL, `~/hermes2/.hermes/` — launcher-proven live tree):**
- `SOUL.md` 49 → 111 lines: `## Mandatory verification reflexes`, **10 reflexes**.
- `protocols/seat-calibration-2026-08.md` created (dated facts evicted from identity).
- Two-tree split-brain untangled: refs repointed, orphan `~/.hermes/` stamped with
  `README-STALE-TREE.md` + first-line pointers in its own SOUL/PROTOCOL-INDEX. Nothing deleted.

### 1.4 How it was reviewed (and why that matters to you)

Every slice ran an adversarial dry-loop with free + paid seats until two consecutive
clean rounds. **Total: 12 review rounds across two loops.**

- **Gate loop (heredoc):** 3 rounds, never dry — terminated deliberately by shipping in
  SHADOW mode. Rationale: bash quoting is a bottomless input class; a parser will never
  be provably complete, so ship it observing, gather real fire data, enforce later.
- **Prune loop:** 6 rounds to CLEAN×2 (r5 91/91/89, r6 92/92/90 unanimous zero-findings).

**The pattern that repeated five times and is the most transferable lesson of the session:**

> **The fold is the next round's primary attack surface, and the axis you did not name is
> where it breaks.** Depth bounded → breadth unbounded. Breadth bounded → numerator
> gameable by growth. Numerator clipped → denominator dilutable. Denominator capped →
> **the cap itself set on the wrong side of my own arithmetic.** The loop only ran dry
> when the fix finally had no unnamed axis left.

Two seats caught that last one *independently, from arithmetic alone* — they read the
comment that said "the attack is ~13,230" and checked it against the constant set to
15,000. The author had written the number down and never done the comparison.

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

## PART 5 — THE PANEL (the next agent's first action)

**Sean's explicit instruction:** hostile review by **Ox Alpha, Grok 4.6, HY3, Kimi K3,
GLM 5.3, and DeepSeek V4** — *then* do the fixes and upgrades to `CLAUDE.md`,
`AGENTS.md`, and `SOUL.md` with all this context in mind. Authorized; Rule 16's spend
gate is satisfied by that instruction, but **disclose worst-case spend before running.**

### 5.1 Seats — all six verified reachable on 2026-08-25

| Seat | Command | Cost |
|---|---|---|
| GLM 5.3 | `node scripts/consult-glm.mjs --document <pkt> --out <o> --remit "<full-spectrum>"` | free (`ZAI_API_KEY`) |
| Ox Alpha | `SWAN_GROK_MODEL=stealth/ox-alpha node scripts/consult-grok.mjs …` | free (429-prone; retry w/ 60–90s backoff) |
| Grok 4.6 | `node scripts/consult-grok.mjs …` | ~$0.20–0.30 |
| DeepSeek V4 Pro | `SWAN_GROK_MODEL=deepseek/deepseek-v4-pro node scripts/consult-grok.mjs …` | paid, verify price first |
| Kimi K3 | `node scripts/consult-kimi.mjs … --cap-usd 3 --confirm-spend` | ~$0.03–0.05 |
| HY3 | `node scripts/consult-hy3-design.mjs …` | paid |

### 5.2 Non-negotiable protocol (learned the hard way this session)

1. **Rule 82 full-spectrum.** Every seat answers the COMPLETE brief across all angles.
   **`consult-kimi.mjs` and `consult-hy3-design.mjs` default to NARROW, SwanStudios-branded
   remits — you MUST pass an explicit `--remit` or you silently reintroduce lensing.**
2. **The packet must say "You CANNOT read files."** Grok once burned 10.7k reasoning
   tokens planning to read files it cannot reach and returned one sentence.
3. **Seat identity is proven, not assumed.** Check the `**Served:**` header on every
   paid reply. Pre-2026-08-24 "Ox" rows in this repo were actually Grok (fixed seat bug).
4. **The egress gate will block a packet containing env-var dumps or paths that look like
   secrets.** It correctly blocked one this session before it reached a stealth seat.
   Redact and re-run; never bypass.
5. **Dry-loop to CLEAN×2.** Fold findings, re-run, and remember: *your fold is the next
   round's attack surface.* Give each round a vantage not yet tried.
6. **Exit codes:** `75` = transient (429/5xx) → back off and retry. Do not read a
   `consult` exit status through a pipe (the exit-status gate will block you anyway).

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

## PART 6 — TRAPS AND LESSONS FROM THIS SESSION

Read these; they are the cheapest thing in this document.

1. **`cmd | tail && git push`** — the pipe ate a blocked commit's exit code and pushed an
   empty branch. This is corpus mechanism #1, committed live *while pruning the rulebook
   that documents it.* Use `${PIPESTATUS[0]}`, `set -o pipefail`, or run the command bare.
2. **Hand-retyping prose for exact-match edits fails on invisible bytes** (curly quotes,
   em dashes). 7 of 15 edits missed. Switch to anchored-regex surgery **with an
   exactly-once match assertion per pattern, and abort the whole run if any pattern misses.**
3. **A test appended after a hand-rolled runner's `process.exit` is dead code that reads
   as green.** Know the runner before adding to it.
4. **A two-branch guard where every test exercises one branch is a one-branch guard with
   decorations.** Construct the test so *only* the untested branch can produce the pass.
5. **When a constant guards against a computed threat, assert the relation.** Writing
   "the attack is ~13,230" and then setting the cap to 15,000 is a defect two seats found
   from arithmetic alone.
6. **Validate the instrument before believing a negative.** Git-Bash converts
   `/mnt/c/...` paths when passed as an argument (use `wsl.exe bash -lc "…"`); `MSYS_NO_PATHCONV=1`
   for `<rev>:<path>`; a missing output file with exit 0 means the real status was eaten.
7. **Never unstage another agent's files while `index.lock` is live.** Stale 0-byte locks
   with no git process can be cleared; a 90-second-old lock with two live git processes cannot.
8. **`git commit --only` on an untracked file fails** — `git add` first, then `--only`
   still isolates. And `--only` rebuilds mode bits from the working tree, silently
   dropping a `chmod +x` on a hook.

---

## PART 7 — STANDING SEAN-OWED (carry forward, remind every session)

- 🚨 **Rotate the Render API key** — exposed 2026-08-12, only Sean can revoke at Render.
- 🔴 **GitHub Actions billing** — every CI run in this repo's history is `startup_failure`
  (account-level, `github.com/settings/billing`). **Consequence for this work: every gate
  we ship is client-side only.** Server-side enforcement is unavailable until this clears.
- 📧 **DMARC record** in Namecheap (SWA-13) — gates nurture-arming + booking emails.
- 🌲 **Hermes orphan tree** `~/.hermes/` — untangled and stamped, nothing deleted.
  Removing it is Sean's call under the no-blind-cleanup law.

---

## PART 8 — DEFINITION OF DONE FOR THE NEXT AGENT

1. Read this document end to end. Do not re-derive its facts.
2. Build the panel packet from Parts 2–4. Disclose worst-case spend. Run all six seats.
3. Fold findings to **CLEAN×2**, with a fresh vantage each round.
4. Ship the surviving work to `CLAUDE.md` / `AGENTS.md` / `SOUL.md` **as gates wherever a
   gate is possible** — the success metric is *prose retired into mechanism*, not prose added.
5. Mark this document `status: superseded` and point it at its successor when done.
   **A handoff that outlives its own truth becomes the stale-plan-file problem it warns about.**

**Tracking:** SWA-196.
