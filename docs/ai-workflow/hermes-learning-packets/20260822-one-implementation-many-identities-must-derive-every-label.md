---
name: one-implementation-many-identities-must-derive-every-label
date: 2026-08-22
originating_model: claude-opus-5
tier_basis: "Opus 5 is Fable-tier by Sean's explicit designation 2026-08-10 (OPUS 5 IS FABLE TIER)"
decision: "A shared implementation fanned across N identities must derive every user-visible label from the identity in use — never from the one it was written for."
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer (5 rounds)
    did: "wired the Ox Alpha seat, built the Gemini 3.1 Pro adapter and the premium gate, found and fixed the shared-transport attribution defect plus 4 further defects across the dry-loop"
    cost: subscription
  - model: stealth/ox-alpha
    role: panel seat under evaluation
    did: "reviewed a planted-defect probe; found ~9/10 including the hardest chain; missed prototype-chain pollution"
    cost: "$0.00 (free preview window)"
  - model: glm-5.3
    role: correlation control
    did: "same probe; found the one defect Ox missed"
    cost: "$0.00 (Z.ai subscription)"
skills_touched:
  - id: hermes-learning-packet
    change: amended
    failure: "no rule existed for unattributable/stealth sources, so an anonymous model could have been stamped as originating_model and permanently poisoned an append-only corpus"
  - id: SWA-196
    change: created
    failure: "substantial panel-roster work had no board issue"
---

# One implementation, many identities — derive every label, or the corpus learns a lie

## What was decided/built (Fable-tier lesson)

`consult-grok.mjs` is a deliberately shared transport: Grok 4.6, DeepSeek V4 Pro,
DeepSeek V4 Flash and Ox Alpha all ride it via `SWAN_GROK_MODEL`, so there is one
streaming/idle-watchdog/truncation implementation to keep correct. That sharing is
good design. What it lacked was the obligation that comes with it.

Four user-visible strings were hard-coded to "Grok 4.6": the report H1, the
OpenRouter `X-Title`, and — worst — the default remit, which opened with
**"You are Grok 4.6"**. Three of four seats therefore filed their reviews under a
fourth seat's name, and three models were handed a false identity inside their own
prompt.

**The generalisable rule: any code path that fans ONE implementation across N
identities must derive every user-visible label from the identity in use.** The
moment a shared module names a specific one of its consumers in a string, that
string is a latent lie for every other consumer.

**Why this is not cosmetic.** Per-model calibration — learning which seat is worth
paying for on which task class — is the entire mechanism by which the routing table
gets learned empirically instead of asserted. It is arithmetically impossible when
three seats file under one name. A misattributed review is *worse* than a missing
one: a missing review is a visible gap, while a misattributed one silently credits
the wrong model and the corpus confidently learns something false.

## Who did what

- **Opus 5 (me)** built everything and ran the five hostile rounds. I also produced
  every defect listed below — the attribution bug was pre-existing, but all four
  dry-loop findings were in code I had written minutes earlier.
- **Ox Alpha** was the subject AND a participant. On a planted-defect probe it found
  ~9/10, including the hardest chain (a cold-cache refund computing `undefined + n`
  as `NaN`, after which the `NaN < amount` guard is permanently false and the balance
  check never fires again). Its CONFIDENCE section correctly enumerated what it could
  not verify without the model file — a discipline several paid seats skip.
- **GLM 5.3** found the one thing Ox missed: prototype-chain pollution via a
  `constructor` key passing an `!== undefined` check. That single divergence is the
  evidence that they are distinct models, and it came free.

## Skills created or changed

`.claude/skills/hermes-learning-packet/SKILL.md` gained a rule for **unattributable
/ stealth sources**. Sean wanted Hermes learning from Ox Alpha. Ox is a cloaked
listing — no lab has claimed it — so it can never be `originating_model`: there is
nobody to designate and `tier_basis` would have to read "unknown". Stealth listings
can also swap weights mid-preview, which would retroactively poison every lesson
stamped with them, and **the corpus is append-only, so that is not recoverable.**

The rule routes such findings through `## External-model calibration` instead,
recorded by a Fable-tier author who verified them, as "claimed X, verified
TRUE/FALSE by <who> via <evidence>". This is strictly MORE useful than raw stealth
output: it teaches what the seat is worth, which is what actually improves routing.
Sean's ask was that Hermes learn how to make better decisions — a verified
claim-plus-verdict is that; unverified volume is not.

## Mistakes I made

- **I doubted a true premise instead of spending one search on it.** Sean said a new
  free model called "Ox Alpha" was beating Fable. I pattern-matched to the
  "Paybolt"-was-a-mishearing-of-"Fable" incident and opened by challenging the name.
  It was real. One search settled it in seconds and I ran that search only *after*
  being pushed back on. Cost a full turn.
- **I never checked whether the work was already done.** The `ox` seat was ALREADY in
  the working tree, added earlier that same day. A thirty-second `git status` would
  have shown it half-finished. The STALE-CHECK memory exists for exactly this.
- **I asserted a rumour as a reason.** I argued "it's probably GLM, so it's a
  duplicate seat" without tagging it `[HYPOTHESIS]`. Sean supplied a competing
  fingerprint (MiniMax) and the objection collapsed. A rumour with two live
  candidates is not evidence.
- **I nearly reported two false absences.** A `-f` test said MISSING for a Hermes
  config file that exists (Git Bash rewrote the absolute path before it reached WSL),
  and a `git cat-file` sweep said the panel scripts were absent from `origin/main`.
  The first was wrong; the second was right — and the ONLY reason I knew which was
  which is that I ran a control probe against a known-present file before believing
  either.
- **My own test probe produced a false positive** in round 4 (a grep matching the
  price-availability line rather than a running seat). I caught it because the number
  was surprising, not because I had validated the probe first.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Backslash/em-dash mangled in transit through a heredoc, silently failing an assert mid-script and leaving one file written and the next un-written | **5** | **YES — the procedural fix went into an inbox memo after occurrence 2, then it happened three more times** | Abandoning the channel entirely: writing file content with a dedicated write tool instead of piping literals through bash, and splicing by **line index** rather than string-matching mangled bytes |
| Believing a negative result without validating the instrument | 2 | Yes (memory: validate the probe before an absence claim, six prior instances) | Running a known-present control through the SAME probe before trusting any absence |
| Forming a conclusion before running the cheap probe that settles it | 3 (premise doubt, stale-check, rumour-as-reason) | Partially | Not yet solved procedurally. This is the session's real theme. |

**The repeat that matters: five occurrences of the heredoc-escape bug, with a
write-up sitting in the inbox after the second.** That proves the write-up was not a
fix. Documenting an error and then repeating it three more times is evidence the
correction was *resolutional* ("be careful with escapes") rather than *procedural*
("stop using that channel for literal content"). Only the second kind survives
contact. The fix that finally worked was not trying harder — it was changing tools.

## External-model calibration

- **`stealth/ox-alpha`** — $0, ~155-184s per review. Two substantive runs. Found ~9/10
  planted defects including the hardest; enumerated its own verification limits
  honestly. Capability is real and Fable-competitive on this task class. **Provenance
  is unknown and cannot be made known**, so: usable as a finder, never as a source of
  record. Free window closes ~2026-08-27.
- **`glm-5.3`** — $0 (subscription). 139-150s. Comparable depth; found the one defect
  Ox missed. Burns ~80% of output budget on reasoning tokens.
- **Correlation finding:** Ox and GLM overlap on ~9 of 10 findings. **Their agreement
  is not two independent votes — treat as ~1.2 reviewers.** Panels must not count
  correlated seats as confirmation. Scope limit: this measures behavioural
  correlation, NOT weight identity; it cannot settle MiniMax-vs-Zhipu and never could.

## Provenance & privacy

`originating_model: claude-opus-5` (Fable-tier, Sean's designation 2026-08-10).
Ox Alpha contributed findings but is NOT the originating model and never can be.
IDs and roles only; no PII. Secret scan run on every file in the batch, 0 hits.
The probe used for the correlation test was synthetic code written for the purpose —
no real SwanStudios source was sent to the undisclosed provider.
