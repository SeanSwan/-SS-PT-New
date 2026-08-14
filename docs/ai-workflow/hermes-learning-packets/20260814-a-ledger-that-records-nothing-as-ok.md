---
title: A ledger that records "nothing" as ok
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: tencent/hy3 ×3 (final round confirmed W1+W3 closed, found one new real defect) + self, hostile rounds to dry
date: 2026-08-14
decision: Any spend ledger needs a category for "billed and worthless" — and when a reviewer fails, swap labs before blaming the input
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer
    did: found the empty-response defect live, built interpretCompletion, wrote every fix
    cost: subscription
  - model: moonshotai/kimi-k3
    role: hostile reviewer — FAILED twice
    did: round 17 usable (3 findings, 2 real as stated); round 18 returned empty, then finish_reason error
    cost: $0.197 total, of which $0.116 bought nothing
  - model: tencent/hy3
    role: hostile reviewer — carried three rounds
    did: found the hardcoded family regex, the missing exit code, a stale enumeration, and a fail-open inside my fix for its own prior finding
    cost: $0.014 total for three usable reviews
skills_touched:
  - name: rule-73 (proof-before-done)
    change: extended
    why: "the call succeeded" is not proof the call produced anything — assert on the payload, then on the record of the payload
  - name: hermes-learning-packet (this corpus)
    change: exercised — and its own limits demonstrated again
    why: the shell-escaping class was written into a durable packet earlier today and recurred twice more
  - name: fusion-router / model routing
    change: proposed amendment
    why: HY3 delivered 3 usable implementation reviews for $0.014 while Kimi delivered 1 for $0.197; the routing table should not assume the expensive reviewer is the better one
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## The lesson

I spent a session building a receipt system so every paid model call leaves an auditable record.
Then a call billed 4354 completion tokens, returned **no content at all**, and the system recorded:

    outcome: ok    cost: $0.0843    finishReason: null

The artifact was written. The console said `saved ->`. Nothing anywhere said the review had not
happened. The cause was one line:

    text: data.choices?.[0]?.message?.content || '(empty response)'

An empty completion was replaced with a *string that looks like an explanation* and returned as an
ordinary success. A reasoning model at high effort can spend its whole budget thinking and emit
nothing — and that outcome was indistinguishable, in the ledger, from a working review.

**The general form: a ledger whose success rows include worthless calls is worse than no ledger.**
It converts "I don't know what we spent this on" into a confident wrong answer. Any spend record
needs a third category — billed *and* worthless — because that is a real operational state, and it
is distinct from both a working call and a gate that refused before spending.

A second defect lived in the same seam: the receipt schema had **always** read `result.finishReason`
and the transport had **never** set it, so every receipt ever written recorded `null`. A column that
cannot be populated is a claim the record does not support. Fixing it paid off within minutes — the
next failure showed `finish_reason: error`, which is how I learned the model was *erroring*, not
thinking silently. **The diagnostic you never wired is the one you needed.**

## The second lesson: when the reviewer fails, swap labs before blaming the input

Kimi K3 failed twice on the same packet — empty, then error. The instinct is to assume the packet is
toxic and rewrite it. Instead I ran the **identical packet** through HY3. It returned a full review
in 130 seconds for six-tenths of a cent.

That one comparison settled it: the packet was fine, the model was not. Same input, two labs,
opposite outcomes — a cheap experiment that prevents an expensive rewrite of something that was
never broken.

## The third lesson: a default parameter is not a guard

Fixing a fail-open, I wrote `collapseHome(p, home = homedir())`. A reviewer caught that a default
parameter fires **only on `undefined`** — an explicit `null` or `''`, exactly what a caller produces
by forwarding an unset config value, sails straight past it. The redaction then silently did
nothing. Verified by probe: passing null printed a full home path with the OS username intact.

**A security control must not have an argument value that means "skip the control."** Falsy has to
resolve to the safe default, not to no-op. And note where this was found: inside my fix for that
reviewer's *previous* finding. The class survived its own correction, again.

## Who did what

- **HY3 (`tencent/hy3`) carried three rounds for $0.014 total** and was materially better than
  expected at implementation review. It refused to manufacture UI findings against Node tooling
  three times running; it traced one defect's evolution across four fix attempts
  (comment → array → regex → folder); and it found the fail-open inside my fix for its own earlier
  finding. **Promote it from design-only to a first-class implementation reviewer.**
- **Its proposed CODE was wrong twice while its DIRECTION was right both times** — a separator
  normalization that would have misreported Windows paths, and an import-everything test runner that
  would have claimed eleven unrelated suites. Take the finding; write the fix yourself.
- **Kimi K3 failed twice** on a packet HY3 handled fine, after being reliable for 17 rounds. Its
  record is still strong overall, but it is currently unreliable on this lane — and its failures
  were *invisible* until the empty-response fix made them legible.
- **One HY3 finding was wrong, and it was my fault:** I sent it `HEAD~1..HEAD`, excluding the very
  fix its highest-severity claim was about, so it read my prose description of the bug as current
  state. Reviewer evidence is only as good as the diff it is handed.

## Skills created or changed

- **Proof extended to the payload AND its record.** Assert what came back, then assert what the
  system wrote down about what came back. Both can lie independently.
- **Model routing questioned.** Three usable reviews for $0.014 versus one for $0.197 is not a
  rounding difference. Cost does not predict review quality, and the cheaper lab won decisively here.
- **Structural membership over enumeration.** The test family moved into its own folder, so "which
  files belong?" is answered by the filesystem. Three prior attempts (a comment, an array, a regex)
  each deleted one hand-written list and introduced another.

## Mistakes I made

- **Fifth shell-escaping corruption of the session**, producing an invalid hex escape. Written up
  twice already today, once in a durable packet, and it happened again anyway.
- **I sent a reviewer the wrong diff scope**, burning a round on an already-closed finding.
- **My fix for a fail-open contained a fail-open.** Caught by the reviewer, not by me.
- **Sixth instrument failure:** a dead-import detector reported nine false positives, including
  `test` and `diagnose` in passing suites. I nearly recorded a finding from it.
- **I set a 2-minute timeout on a call whose prior round took 318 seconds**, killed it, and cannot
  observe whether it billed — disclosed rather than assumed away.
- **My cost estimate was 3.7× high** on one call ($0.30 predicted, $0.08 actual).

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What finally stopped it |
|---|---|---|---|
| Shell-escaped fixtures corrupting silently | 5 | **Yes — twice, incl. a durable packet the same day** | Nothing yet. Only the editor + `String.raw`, applied without exception, has ever worked |
| Fail-open / instance-not-class | 6 | Yes, repeatedly | Probing the fixed function with the adversarial input before claiming closure |
| Instrument/probe lies | 6 | Yes — a standing memory | Probe reads from source, fails loudly, disbelieved when it reports the impossible |
| Prose standing in for a mechanism | 3 | Yes — packet the same day | Making membership structural (a folder), not described |
| Wrong evidence sent to a reviewer | 1 | No | Packet must carry evidence for every claim, including "already fixed" |

**The first row is the finding.** Five occurrences, two prior write-ups, one of them durable and
written hours earlier — and it still recurred twice more. This corpus now contains three separate
packets whose ledgers all say the same thing: **a lesson that is only written down does not stop the
behaviour.** Every class that actually stopped, stopped when a *procedure* changed — a different
tool, a forced file, a mandatory probe. Read these packets to extract procedure changes. Reading
them as reminders has now demonstrably failed five times in one day.

## External-model calibration

| Model | Rounds today | Usable | Cost | Cost per usable review |
|---|---|---|---|---|
| `tencent/hy3` | 3 | 3 | $0.014 | **$0.005** |
| `moonshotai/kimi-k3` | 3 | 1 | $0.197 | $0.197 |

- **HY3 strengths:** implementation and contract review, defect-evolution tracing, refusing
  out-of-remit findings. **Weakness:** its builder-exact code is often wrong in detail while right in
  direction — verify before applying.
- **Kimi strengths (historically):** catching claims the code does not support. **Current risk:**
  two silent failures in a row on this lane.
- **Infrastructure gap:** HY3 runs through an older standalone script that bypasses the receipt
  lane entirely, so its spend never reaches the ledger and its console prints an absolute path. The
  ledger only sees the providers routed through `context-gateway`.
