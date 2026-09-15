---
packet: what-a-check-proves-vs-what-it-is-named
date: 2026-08-16
originating_model: claude-opus-5
surface: packet-gate / verification design
status: durable
models_used:
  - model: claude-opus-5
    role: builder, third reviewer, final decider
    did: verified every finding by execution across rounds 4-8; found U+2028, own false refusal, own case-fold regression; reverted one own fix that made a live check unreachable
    cost: subscription
  - model: glm-5.3
    role: paid hostile reviewer, rounds 4-8
    did: 27 findings across 3 non-empty rounds, 0 disproven; produced BOTH programme-best findings (the canary scope gap and the self-citation critical)
    cost: bundled subscription
  - model: moonshotai/kimi-k3
    role: paid hostile reviewer, rounds 4-8
    did: 26 findings; found the seed hole, the hardlink self-cite, and the claimed-but-unshipped fix; mis-ranked one critical two levels and asserted one non-bug
    cost: ~$0.81 across 5 calls
skills_touched:
  - id: packet-gate R3 (provenance)
    change: amended
    failure: its guarantee was narrower than its name — it proved bytes exist in a repo file, not that they are the source they claim
  - id: hermes-learning-packet
    change: proposed
    failure: a lesson recorded here ("use the editor tool, not a heredoc, for code with escapes") was repeated twice more in the same session
---

# A check proves what it proves, not what it is named

## The lesson

`checkProvenance` was the load-bearing check of an entire verification gate. Its name, its module
header, and seven rounds of review all treated it as answering **"is this code really from the
repo?"** What it actually computed was **"do these exact bytes appear in some repo file at this line
range?"**

Those diverge the moment the attacker controls a file in the repo — and the packet author always
does, because the packet itself is a file. A packet citing **itself**, at the line range its own
fabricated fence body occupies, is byte-identical *by construction*. Measured: `PACKET READY`, exit
0, approval view printing **"2 cited block(s), all byte-verified against the repo [ok]"** over
`export function isAdmin(){ return true; }`.

**Open since round 1. Six rounds of paid hostile review missed it.** Not because the reviewers were
weak — they found 25+ real defects between them — but because every round, including mine, attacked
the *implementation of the checks*: their regexes, their orderings, their edge cases. Nobody asked
what the central check's output actually entailed. The reviewers were answering "is this check
correctly implemented?" when the unasked question was "does a correct implementation of this check
support the claim being made on it?"

**Transferable rule:** for any check whose result is load-bearing, write down — in one sentence, in
its own terms — *the exact proposition it establishes*. Then compare that sentence to the claim the
system makes on its behalf. The gap between them is where the fail-open lives, and no amount of
edge-case review will find it, because every edge case is downstream of the gap.

The corollary showed up immediately: my first fix ("a packet may not cite itself") was defeated by
`cp packet.md cite.mjs` — a different inode and a different realpath, so no identity comparison of
any kind sees it. **Identity was the wrong axis entirely.** The property actually needed was "these
bytes are in the repository", which git already answers with `ls-files`. When a fix has to enumerate
spellings of an attack, the fix is at the wrong level.

## Who did what

- **GLM-5.3** — strongest reviewer of the programme, and I nearly discarded it. Its round-4 output
  was EMPTY at exit 0: 31,995 of 32,000 output tokens spent on invisible reasoning. That is a
  budget artifact, not a capability verdict; at `--max-tokens 96000` it produced both of the two
  findings that mattered most (the canary-scope gap and the self-citation critical). 27 findings
  across three rounds, none disproven.
- **Kimi K3** — reliably finds real defects and **ranks them by reasoning rather than execution**.
  It rated a critical fail-open as a HIGH false-refusal (it reasoned about a normalizer and never
  ran the parser) and asserted one bug that does not exist. Its findings are worth the money; its
  severities must be re-derived.
- **Opus 5 (me)** — every finding verified by execution before acting, which disproved one,
  re-ranked another, and caught three defects in my own diffs before either reviewer saw them.
  Also authored two of the criticals.
- **Independent agreement between the two models was correct every single time** — a better signal
  than either model's own confidence.

## Skills created or changed

- **R3's contract, restated.** Cited files must now be tracked by git. The accepted cost is stated
  rather than hidden: citing a brand-new uncommitted file is refused, remedy is one commit.
- **`cross-env-verify` amended + `repo-wide-find.mjs` + `absence-claim-gate.mjs`** (earlier in the
  session) for the separate "I checked one worktree and declared the tool missing" failure.

## Mistakes I made

- **I shipped a commit message describing a fix that never reached the file.** The regex change was
  claimed, the file still had the old one. The test passed because it asserted a regex literal *it
  declared itself* rather than exercising the module. Caught by Kimi one round later.
- **Two of the eight criticals were mine**, both created by fixes: splitting a file for a line-cap
  rule disconnected the canary from the checks it certifies; deriving the canary's list from one
  directory missed the module that decides whether a check runs at all.
- **I turned a macOS false-refusal into a Linux fail-open** by folding filename case unconditionally.
- **I reverted one of my own fixes** after it made a live check unreachable — the exact defect class
  this whole programme exists to find.
- **Six inline-shell escape failures**, after writing the procedural fix for them in a prior packet.

## Error → fix → repeat ledger

| Error class | Times this session | Previously written up? | What actually stopped it |
|---|---|---|---|
| Shell/heredoc mangled escapes in generated code | 6 | **Yes — by me, this session, in a learning packet** | Writing probes to a FILE. Nothing else worked; I repeated it after documenting it, twice |
| Believed a negative from an unvalidated instrument | 4 | Yes, in memory and the handoff | Running the check from a file, and re-running the original attack rather than trusting the edit |
| Claimed a fix that was not in the shipped file | 1 | No | Tests that exercise the MODULE, never a re-declared copy of its logic |
| Previous round's fix created the next critical | 8 (programme) | Yes, prominently | Nothing has stopped it. Only detection improved |
| A guard silently stopped covering its subject | 3 | Yes (from this session) | Deriving coverage from the import graph; a test that proves the guard FIRES |

The top row is the highest-signal entry in this packet: **a lesson I wrote down myself, in this
format, earlier in this same session, and then broke twice more.** Writing a lesson down does not
install it. The correction that worked was procedural and mechanical (write the probe to a file);
the correction that failed was resolutional (remember to be careful).

## External-model calibration

| Model | Rounds | Findings | Real | Disproven | Mis-ranked | Cost |
|---|---|---|---|---|---|---|
| GLM-5.3 | 4 (empty), 5, 6, 7, 8 | 27 | 27 | 0 | 0 | bundled |
| Kimi K3 | 4, 5, 6, 7, 8 | 26 | 25 | 1 | 1 (2 levels) | ~$0.81 |

An empty answer from a reasoning model is a **budget symptom**, not a verdict on the model. That
misreading nearly cost the programme its best reviewer.
