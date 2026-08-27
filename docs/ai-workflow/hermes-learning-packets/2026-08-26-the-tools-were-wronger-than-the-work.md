---
date: 2026-08-26
originating_model: claude-opus-5
surface: swan-forge / T2 authenticated migration + the verification toolkit
decision: In a migration slice, the verification tooling is a larger defect surface than the migration — and a tool's defects are found by running it, never by reading it.
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder, final decider, own hostile rounds
    did: migrated 11 files, built five instruments, adjudicated ~40 panel findings (disproved 8 against code), found the four bypasses of its own lint rule, found that the rollback command had decayed
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile reviewer, 4 rounds
    did: forced standing enforcement, owned/dated follow-ups, a drilled rollback, retention of the revert target; final round found two lines where the toolkit violated its own printed invariant
    cost: ~$0 (pooled)
  - model: glm-5.3
    role: hostile reviewer, 4 rounds
    did: found the lexer inputs that defeat a parser (regex-literal poisoning, nested templates), the flex-basis seam, the partial-join refusal gap; APPROVE at round 4
    cost: ~$0 (pooled)
skills_touched:
  - id: drift-lint R6 (new)
    change: created
    failure: a boundary enforced only inside a one-shot migration script decays the moment a human hand-writes the same thing
  - id: drift-lint R7 (new)
    change: created
    failure: a drilled rollback is worthless if the revert target can be deleted while the verification ticket is still open
  - id: audit-hex-tags.mjs (new)
    change: created
    failure: rewriting a tool fixes future output and does nothing about what it already wrote
  - id: regen-backlog.mjs (new)
    change: created
    failure: a documented "regenerate, never hand-edit" command that fails silently produces an empty authority nobody notices
---

## The lesson

Eleven files moved from one button to another. That migration was correct on the first attempt and
never regressed: the same 344 tests passed before and after, and not one assertion was edited.

Everything else broke.

The reachability checker reported a **live, production-verified file as dead** — and it drives
quarantine proposals, so believing it would have archived working code. The backlog regeneration
command was broken three ways on Windows and **failed silently**, so the documented "regenerate,
never hand-edit" instruction would have emptied the very artifact it maintains. My replacement for
it emitted absolute paths, broke its own join, and tiered a proven-dead file as a migration target.
The hex tagger appended a comment form that, in JSX children, **is not a comment — it is text that
renders in the UI** while the build passes. The lint rule I wrote to be a "standing law" recognised
one syntax out of five. The boundary check blocked sizing through `flex` and allowed it through
`flex-basis`. And the rollback command — drilled, proven, written into a ticket — had **quietly
stopped working** by the end of the slice, because later commits touched the same files.

Six instruments, every one wrong, in a slice whose actual code change was trivially correct.

**None of them were found by reading the code. Every one was found by running the tool and looking
at what came back** — a positive control that failed, a generated file that read wrong, a dry-run
whose numbers did not reconcile, a rollback re-drilled at the end instead of trusted from the
middle. Reading finds what you thought you wrote. Running finds what you wrote.

## The corollaries that generalise

**A deny-list is the wrong shape for a safety boundary.** I first listed the properties a wrapper
must not set. A probe of my own rule walked straight through it with `outline` (which kills the
focus ring), `filter` (which recolours the button), `text-shadow`, `width`, `line-height`, and any
interpolation at all. CSS grows every year; that list cannot be closed. Inverted to an allow-list
of layout placement only, it fails closed — a false block costs one human decision, a false allow
ships an invisible defect to a screen nobody photographs.

**A rule that lives in one tool is a comment, not a law.** The migration tool refusing to *create*
a bad wrapper does nothing about the developer who hand-writes one next week. The same boundary now
runs in the linter too, from the *same function*, so the gate and the law cannot drift apart.

**"Cannot verify" must never render as "fine" — and I violated that two lines under where I wrote
it.** Two `continue`s let an unparseable wrapper vanish: unscanned, unreported, indistinguishable
from clean. A reviewer caught it. Silence is the failure mode that survives review, because it
looks exactly like success.

**A drilled rollback decays.** Proving a revert works in the middle of a slice says nothing about
whether it works at the end. Mine broke because later commits touched the same files, and I would
have discovered that during an incident — the worst possible moment. Re-drill at the close.

## Who did what

**Opus 5 (me)** wrote the migration and every one of the broken tools. I also found the defects the
reviewers could not: the four bypasses of my own lint rule (by probing it before they could), the
re-export shim that made the import guard block two real surfaces (by running the tool across all
52 sites instead of the 11 in the slice), the false-drift check that would have failed CI on every
Windows machine, the ledger loading its own commented-out example as a live exception, and the
decayed rollback. **Every one came from a vantage, not an insight.**

I was also the source of the round's worst artifact: a review packet that rendered a diff by
filtering to changed lines, stripping the context between them. Both reviewers independently
concluded the new rule was violated on its first use. It was not — a migrated wrapper and an
untouched neighbour's gradient merely looked adjacent. **Two independent reviewers reaching the
same wrong conclusion is evidence about the packet, not about them.**

**Ox Alpha** governs. It demanded the deferred surface be ledgered rather than explained, refused
to credit a test whose diff was withheld, insisted an unowned follow-up is not an owner, required
the rollback be drilled rather than asserted, and then required the revert target be retained so
the drill stays true. Its final round took exactly one narrow reopen — the two silent `continue`s —
and it was right.

**GLM 5.3** breaks parsers. It produced the exact inputs that defeat a lexer: a regex literal
containing a backtick that poisons template state for the rest of a file; a nested template that a
flat toggle mis-tracks; the `flex-basis` longhand left open beside a closed shorthand. It also
verified my tightened invariant test against the historical bug to prove it would have caught it.

## Skills created or changed

- **drift-lint R6** — the standing half of the rule-84 boundary, sharing one function with the
  migration gate so the two cannot drift. Born from Ox's observation that codemod-only enforcement
  decays on contact with humans.
- **drift-lint R7** — retains the legacy component *and its re-export shim* until the verification
  ticket closes, because a rollback whose target can be deleted is not a rollback.
- **audit-hex-tags.mjs** — re-checks every tag a previous version of the tagger placed. Rewriting a
  tool says nothing about its past output; 66 tags audited, 0 real damage, and it provably catches
  a planted one.
- **regen-backlog.mjs** — replaced a silently-broken shell one-liner with one process, argv arrays,
  and explicit refusals (zero rows, any unresolvable path, any unjoined row).

## Mistakes I made

- Built a review packet that manufactured a false blocker, and both reviewers hit it.
- Wrote a commit message asserting a merge carried no rulebook change, having verified file overlap
  rather than merge contents. A guard caught it.
- Shipped a tagger that emits UI-visible text, then looked.
- Read five failures out of my own instruments as failures of the code.
- Wrote a keyword-lexer fix that failed its own probe because the following space cleared the state.
- Fought the shell over escaped characters six times, including while writing this packet.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What finally stopped it |
|---|---|---|---|
| Trusting my own instrument's negative result | 5 (grep without a space, over-strict typecheck config, an auditor whose 8 "findings" were valid comments, a probe fixture missing a paren, a malformed keyword probe) | **Yes — this has a rule, a memory entry, and a prior packet, and it still recurred five times** | Only one thing worked: treating every negative result as a claim about the instrument until a second vantage agreed. It cannot be fixed by intention — the check has to live inside the probe. |
| Asserting something a check did not support | 2 (the filtered-diff packet; the merge commit message) | No | A guard caught the second. The general form: name the question the check actually answered before writing the sentence. |
| Shell mangling escaped characters in generated content | 6 | No | Abandoning the shell for content with escapes. The repo already gates this; I kept hitting it from the other side. |
| Path/relativity assumption unverified | 3 (shim target relative to importer; regen emitting absolute paths; reachability resolving against cwd) | No | "Relative to *what?*" is a question with a cheap, printable answer. |
| A fix containing the bug it fixed | 2 (the shim resolver; the keyword lexer) | No | Writing the probe before trusting the fix — both were caught within a minute because the probe existed first. |

The first row is the one that matters, and it is the same row as the last packet. It has a rule, a
memory, and a written-up lesson, and it recurred five times in one session anyway. **Documentation
is not a fix for it.** The only correction that held was mechanical: a probe that reports absence
must try the second vantage itself before it is allowed to say "missing" — which is exactly what I
built into the reachability tool this slice, and exactly why that tool is now the one instrument I
trust.

## External-model calibration

| Model | Rounds | Findings real | Disproven | Best at | Cost |
|---|---|---|---|---|---|
| Ox Alpha | 4 | 12/12 | 1 (the headline, caused by my packet) | governance: enforcement, ownership, rollback integrity, retention | pooled |
| GLM 5.3 | 4 | 13/17 | 4 (all repo-configuration claims, round 1) | mechanism: the exact input that defeats a parser | pooled |

Run both for tool correctness — across four rounds their findings barely overlapped, and each
caught blocking defects the other missed in the same round. Neither found the bypasses of my own
lint rule; a probe did. Do not act on either model's claims about repo configuration without
checking the config first.
