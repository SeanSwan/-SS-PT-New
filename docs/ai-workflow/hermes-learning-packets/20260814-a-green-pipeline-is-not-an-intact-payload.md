---
title: A green pipeline is not an intact payload
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self, 3 hostile rounds (R1 and R2 each found a real defect; R3 dry)
date: 2026-08-14
decision: When a pipeline transforms a payload, assert on the payload at the far end — not on the pipeline's exit status
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + orchestrator + hostile reviewer
    did: recon of existing Codex/marketing capability, built the launcher, found and fixed both of its own defects
    cost: subscription
  - model: gpt-5.6-sol (via codex exec)
    role: execution target under test
    did: two smoke runs — one proving the write path, one proving the sandbox boundary blocks writes outside root
    cost: subscription
skills_touched:
  - name: rule-47 (supervised read-only launcher pattern)
    change: exercised
    why: the disclosure block is what let the untested safety claim be spotted before it shipped as reassurance
  - name: feedback_validate_probe_before_absence_claim
    change: exercised — and violated
    why: I repeated the exact false-absence class documented hours earlier; the write-up did not prevent the repeat
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## The lesson

I built a launcher that reads a markdown prompt template, substitutes per-run
tokens, and pipes the result to `codex exec`. Every check I ran was green:

- PowerShell parsed the script with 0 syntax errors
- the menu, prompts, disclosure block, and cancel path all flowed correctly
- every `{{TOKEN}}` substituted — `grep -c "{{"` returned 0
- the end-to-end dry run completed cleanly

The prompt was arriving at the model with **26 corrupted characters.**

PowerShell 5.1's `Get-Content` defaults to the system ANSI codepage. The template
was UTF-8. Every em-dash and curly quote in a carefully-written prompt was
silently mangled somewhere between the file and the model. Nothing in the
pipeline had any reason to complain — a mangled string is still a string, still
substitutes tokens, still pipes, still parses.

It was found by one command that had nothing to do with the pipeline:
`grep -c "â"` on the materialised prompt. 26. After the fix: 0, with all 24
em-dashes intact.

**The generalisation:** every check I ran tested whether the pipeline *ran*. None
tested whether what came out the far end was what went in. Those are different
claims, and the first one is much easier to satisfy — which is precisely why it
gets mistaken for the second.

## Who did what

- **Opus 5 (me)** — did the capability recon, built the console, and ran the
  hostile rounds. Also authored both defects it later found. The corrupted-payload
  bug was mine end to end: I chose UTF-8 for the template, chose the default
  `Get-Content`, and ran four green checks that were all incapable of seeing the
  problem.
- **gpt-5.6-sol via `codex exec`** — the execution target. Notably useful as a
  *test instrument*: asked to write outside its sandbox root and told not to work
  around a refusal, it returned `BLOCKED` and the runtime logged
  `patch rejected: writing outside of the project`. That turned a safety assertion
  into a safety measurement.

## Skills created or changed

No new skill. Two existing disciplines got exercised, one of them by being broken:

- **Rule 47's disclosure block** did real work here. Because the launcher has to
  *print* what it's about to do, I read the line "sandbox: cannot write to SS-PT"
  back as a reader — and noticed I had never tested it. A tool that narrates
  itself to the user makes its own unverified claims visible to its author.
- **`validate-probe-before-absence-claim`** was violated, hours after being
  written. See the ledger below.

## Mistakes I made

1. **Corrupted payload behind a green pipeline** — described above. Fix was
   mechanical (`-Encoding UTF8` on every read; ASCII-only in the `.ps1`'s own
   display strings, since the script source is read as ANSI too). The fix is not
   the lesson; the lesson is that four passing checks were structurally unable to
   detect it.
2. **A safety claim shipped into the UI before it was measured.** The disclosure
   block told the user Codex could not write into the SwanStudios repo. That was a
   belief about how `workspace-write` scopes, not a finding. It happened to be
   correct. Had it been wrong, it would have read to the user as *proof of safety*
   while being the opposite. An untested safety claim is worse than a missing one,
   because it terminates the reader's inquiry.
3. **Repeated a documented error class within hours.** Ran
   `ls <file> 2>&1 && echo ... && git log ...` where the `ls` was *expected* to
   fail. `&&` short-circuited; the `git log` never executed; I read the absence of
   output as "the file is not in git history." It was — commit `c41c47b0f`.

## Error → fix → repeat ledger

| Error class | Times this session | Previously written up? | What actually stopped it |
|---|---|---|---|
| Instrument failure read as a fact about the world (`&&` short-circuit → false absence) | 1 | **Yes** — packet `20260813-i-chose-the-search-scope...` + memory `validate-probe-before-absence-claim`, both same day | Re-running the query unchained. The prior write-up did **not** prevent it. |
| Payload corruption invisible to every pipeline-level check | 1 | No | A content assertion on the far-end artifact (`grep -c` for mojibake), not a status check |
| Safety property asserted rather than measured | 1 | Partially — same family as claim-to-evidence (rule 28) | An adversarial probe: instruct the tool to attempt the forbidden write and report the refusal |

The first row is the important one. That class was documented *today*, in a
durable packet, with a memory pointer — and I still did it. This is direct
evidence for something the corpus keeps rediscovering: **a lesson written as a
description does not change behaviour; only a lesson written as a procedure
does.** "Be careful about false absence" is a description. "When a command's
absence of output is the evidence, re-run it standalone before believing it" is a
procedure. Only the second one would have caught this.

The corresponding procedure for this packet's headline lesson:

> When a pipeline transforms a payload, write one assertion against the far-end
> artifact's **content** — not its existence, not the exit code, not the absence
> of errors. For text: character-class grep. For structured data: field
> round-trip. Do it before the dry-run is called clean.

## External-model calibration

No paid model consulted this task. Recording the absence deliberately: the hostile
review was three self-run rounds, and rounds 1 and 2 each surfaced a real defect
that would otherwise have shipped. Self-review found these; it does not follow
that self-review is sufficient in general — R3 running dry is weaker evidence
than an adversarial reviewer running dry, and this packet should not be cited as
proof that it is.
