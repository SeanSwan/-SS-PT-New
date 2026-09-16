# PANEL PACKET — 2,514 MINED ERRORS → GATES, BY UNCLE BOB'S LADDER

## READ THIS FIRST

**You CANNOT read files.** No repo access, no tools. Everything needed is here. If something
is unverifiable from this packet, say so rather than inventing it.

**Answer the COMPLETE brief — every question.** Do not narrow to a specialty.

**Dissent is the highest-value output.** This packet was written by the agent whose own
errors make up part of the data. Attack it.

**Specificity is the whole ask.** "Add a gate for X" is useless without *what it inspects,
at what moment, and what it does when it fires.* If you cannot make a proposal concrete,
say the class is not gateable and explain why — that is a real answer.

---

## PART 1 — THE DATA (newly mined; never analysed before)

SwanStudios is a production SaaS where one human (Sean) directs AI agents. Every substantial
agent session is hook-required to write a memo containing a **"Mistakes I made"** section —
the agent's own self-reported errors. **1,208 such memos exist. Nobody had ever mined them.**

Just mined: **644 memos carry the section, containing 2,514 individual mistake bullets.**

### Error classes by frequency (a bullet may count in more than one)

| n | % | class |
|---|---|---|
| **400** | **15.9%** | **repeated an error after being warned** |
| 190 | 7.6% | claimed done without proof |
| 125 | 5.0% | shell quoting / heredoc / escaping |
| 122 | 4.9% | stale / wrong branch or tree |
| 117 | 4.7% | scope creep / did not do the ask |
| 105 | 4.2% | assumed instead of checking |
| 88 | 3.5% | secret / privacy exposure |
| 87 | 3.5% | instrument trusted without control |
| 79 | 3.1% | wasted or nearly wasted paid call |
| 61 | 2.4% | schema / field drift |
| 38 | 1.5% | exit-status / pipeline masking |
| 35 | 1.4% | narrow read → broad claim |
| 33 | 1.3% | dedupe / normalisation failure |
| 28 | 1.1% | destroyed or nearly destroyed work |
| 27 | 1.1% | wrong severity / bad prioritisation |
| 23 | 0.9% | silent no-op edit (replace matched nothing) |
| 14 | 0.6% | facade shipped (described, not wired) |
| 12 | 0.5% | missed sanitisation / over-shared |
| 10 | 0.4% | wrong tool or runner |
| 8 | 0.3% | test that could not fail |

**53.1% remain unbucketed.** Stated rather than hidden: the taxonomy is keyword-based and
coarse. Treat every number as a **floor**. A first taxonomy left 67.9% unbucketed and was
rewritten; this is the second attempt.

### The headline

**"Repeated an error after being warned" is #1 by more than 2×.** This is Bob Martin's
*"models treat rules as guidelines"* claim measured in one repo, at scale, from the agents'
own confessions. Representative verbatim bullets:

- *"I committed the exact error the review had just warned me about."*
- *"Committed the exact failure pattern I had named an hour earlier."*
- *"Same reviewer lesson missed a third time."*
- *"This is the same class as the two facades I criticised in this very session."*

### Specific recurring mechanisms visible in the raw text

These recur verbatim across different sessions and agents. Each is a candidate for
elimination or a gate:

1. **Scripted string-replace silently no-ops.** *"Scripted python string-replaces failed
   roughly one in three times this session."* The edit reports success, changes nothing, and
   the agent ships the unchanged file believing it changed.
2. **Line-number-based file splitting cuts through a construct.** *"A line-based file split
   cut through the middle of an interface, producing two broken files."* Appears twice, from
   different sessions.
3. **Shipped a described fix, not a wired one — and told Sean it worked.** *"I reported
   'expired = fails' … the feature did not work."*
4. **Shipped a CLI command never once executed.** *"`comment` was broken on arrival."*
5. **Pushed before running the verification loop.** *"The broken `comment` sat on `main`
   until the next push."*

---

## PART 2 — WHAT ALREADY EXISTS (do not propose what is built)

**22 wired hooks.** Proposing a duplicate is worse than proposing nothing, because it reads
as coverage.

- **PreToolUse (10):** privacy-boundary, push-blast-radius, spend-guard, irreversible-git,
  secret-read, egress-privacy, **heredoc-escape**, **exit-status** (`$?` after a pipeline),
  **npx-decoy** (verifier substitution), secret-read
- **Stop (8):** privacy-boundary, hermes-closeout, **dry-loop**, linear-sync, dual-tier,
  backup-after-work, **lesson-recall**, context-watch
- **SessionStart (3):** hermes-inbox-reminder, lane-session-start, **drift-check**
- **UserPromptSubmit (1):** prompt-watcher

Note there is **already a `lesson-recall-gate`** — and "repeated an error after being warned"
is still the #1 class at 400 occurrences. **Either it does not work, fires too late, or the
class is not addressable this way.** That contradiction is a first-class question below.

### The governing ladder (Lauren's, endorsed by Bob; this repo's stated law)

1. **Eliminate the class architecturally** — make the mistake impossible.
2. If you cannot, **make a check catch it** (CI / hook / lint / test).
3. Only then, **hesitantly**, add a rule or skill.
4. Last resort, a human in the loop.

**Skills and rules are the safety net, not the reach-for tool.** A prior panel ruled
unanimously that **no new skill** clears this bar (78 already exist).

### Files under discussion

| file | state |
|---|---|
| `CLAUDE.md` | 212,236 B · 1,176 lines · **84 rules** · loaded EVERY session (~41k tokens) |
| `AGENTS.md` | near-identical mirror (Codex adapter header differs), auto-synced |
| `SOUL.md` | Hermes's identity file, on a **separate machine (WSL)**, **NO hooks** — prose is its entire enforcement surface |

Measured previously in this repo: **direction/values docs are re-read 38.1% of the time;
implementation blueprints 14.4%; 51.1% of all persisted docs are never re-read.** Best-ever
rulebook prune: **−4.1%.**

---

# THE QUESTIONS — answer ALL

## Q1 — The 400. Why does warning fail, and what actually stops it?

"Repeated an error after being warned" is #1 at 15.9%, and a `lesson-recall-gate` **already
exists**. Explain the contradiction, then give the fix. Specifically:
- Is this one class or several wearing one label? If several, split it.
- **What is the mechanism** by which a documented lesson fails to change behavior?
- Design the intervention. If a Stop-time gate is structurally too late, say what fires
  *before* the act, and on what signal.

## Q2 — Ladder-sort the top 10 classes. Be concrete.

For each of the top 10: **eliminate / gate / rule / human**. For every "gate" you assign,
specify **(a) hook point, (b) exact signal inspected, (c) block-or-warn, (d) the one-line
fix the agent is told to make.** A gate whose fix is expensive gets switched off — cheap
compliance is a design requirement, not a nicety.

## Q3 — The five specific mechanisms in Part 1 §"recurring mechanisms"

Silent no-op replace · line-based splitting · facade-shipped · unexecuted CLI · push-before-verify.

For each: is it **architecturally eliminable** (tier 1)? For instance — is "silent no-op
replace" eliminated by *requiring an exactly-once match assertion with whole-run abort*,
making the failure impossible rather than detected? Say which of the five die at tier 1 and
which only get caught at tier 2.

## Q4 — CLAUDE.md / AGENTS.md: the concrete upgrade

84 rules, 212KB, loaded every session, never successfully shortened (−4.1% best).
- Which rules does the mined data say should be **deleted** because a hook now enforces them?
  (The displacement principle: *a rule whose violation is deterministically hook-blocked has
  no remaining job.*) **Name rule numbers where you can, or state the criterion precisely.**
- What is **missing** that the data says should exist — a rule or gate covering a real,
  frequent class currently ungoverned?
- Is there a structural change to the FILE (ordering, tiering, splitting) that the
  lost-in-the-middle problem demands?

## Q5 — SOUL.md: an agent with no hooks

Hermes has no enforcement surface but prose, and prose is exactly what the 400 number
convicts. A prior seat argued *"'no hooks' is a property of a machine, not of the universe"*
— Hermes runs on WSL, and WSL can run hooks; failing that, gate its **output where it lands
in the hooked repo**, treating it as untrusted input.
- Is that right? What concretely should `SOUL.md` contain, and what should it stop containing?
- Does the 38.1%-vs-14.4% read-rate split (direction survives, procedure rots) change what
  belongs in an identity file?

## Q6 — What is MISSING that Sean has not thought to ask for?

He explicitly asked for this. Given the mined data, the ladder, and the three files: what
context, rule, gate, or structural change is absent that would materially reduce error rate?
**Rank by expected error-reduction per unit of effort.** Do not pad the list.

## Q7 — ADVERSARIAL + DISSENT (mandatory)

- **Steelman that mining these memos is itself worthless** — self-reported errors from
  agents, keyword-bucketed by a biased party, 53% unclassified. Then say whether you believe it.
- **Where is this packet's framing wrong?** Name at least one thing. The author has been
  wrong repeatedly in this workstream about work he was confident in.
