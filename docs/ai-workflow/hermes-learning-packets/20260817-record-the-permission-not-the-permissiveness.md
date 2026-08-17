---
title: Record the permission, not the permissiveness
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self; verified by a live commercial render whose frozen provenance was inspected field by field
date: 2026-08-17
decision: When an authorization arrives, record the AUTHORIZATION as its own fact and leave the underlying terms untouched — merging them destroys the ability to answer "why was this allowed" later
status: shipped
supersedes: none
privacy: repo-relative paths, module names, licence field names, render sizes and timings only. No client PII, no credentials, no licence correspondence contents, no absolute user paths.
models_used:
  - model: claude-opus-5
    role: builder; recorded the grant, found the field-name defect, extracted the graph module
    did: enabled commercial H3 without collapsing terms into permission; fixed a hardcoded ComfyUI input name caught by its own guard; corrected a line-count claim it had asserted without re-measuring
    cost: subscription
skills_touched:
  - name: provenance / licence snapshot design
    change: validated under a real state transition
    why: the snapshot survived the grant arriving without needing a schema change, because terms and grant were modelled as separate facts from the start
  - name: detection-never-creation (the E_NO_INPUT guard)
    change: vindicated on first contact with a second implementation
    why: written days earlier against a failure never yet seen; caught a silent-wrong-output defect the moment a second model was introduced
  - name: rule-4 line cap discipline
    change: tightened — re-measure after your own edits before asserting
    why: I reported a file under the cap while it sat at 306, because I quoted an earlier measurement taken before my own additions
---

# Record the permission, not the permissiveness

## The finding

An approval arrived: the licensor authorised commercial use of a model that, by its public
terms, requires a written grant for commercial use in this territory. The instruction was
"set it up to be commercial by default."

The one-line implementation is to edit the licence catalogue so the model reads
`commercialUse: 'permitted'`. It is obvious, it makes the gate pass, and it is wrong.

**The terms did not change. One party acquired a grant against unchanged terms.**

Those are different facts and they answer different questions. "Is this model open?" — no,
still restricted. "May we run it commercially?" — yes, we hold a grant. Collapsing them
into `permitted` answers the first question incorrectly in order to make the second come
out right.

The cost is not hypothetical, because provenance freezes the licence snapshot into every
generated asset. Under the collapsed model, every future asset would carry a record
asserting the model was openly permitted. Months later, nobody could distinguish "this was
allowed because the licence is permissive" from "this was allowed because we were
authorised" — and only the second one has a revocable, auditable, expiring thing behind it.

## The rule

**Model an authorization as its own fact, in its own store, against terms you leave alone.**

- Terms live in the catalogue and describe the world: `commercialUse: 'requires-grant'`.
- The grant lives in a separate fail-closed allowlist and describes *us*.
- The frozen record carries both, so it says: *restricted licence, and we held a grant.*

The generalisation beyond licensing: **whenever you are about to widen a rule so that a
specific case passes, check whether you are actually recording an exception.** A rule
widened to fit one case silently claims the case was never special. An exception recorded
against an intact rule keeps the reason.

Same shape as feature flags versus deleted checks, allowlists versus removed validation,
and waivers versus lowered thresholds. In every pair the second is one line shorter and
throws away the reason.

## The guard that paid for itself

The first commercial run failed instantly. `buildGraph` hardcoded the prompt input name
`text` — correct for one model's node, wrong for the new one, which calls it `prompt`.

It failed **loudly**, because the injector was written to refuse to CREATE an input it
cannot find. Without that rule the graph engine would have accepted the undeclared input,
ignored it, rendered the template's saved placeholder prompt at full GPU cost, and reported
success. A "working" commercial pipeline quietly producing the wrong video.

That guard was written days earlier against a failure I had not yet seen, on the reasoning
that silent wrong output is worse than a loud refusal. **This was its first encounter with a
second implementation, and it caught it on contact.**

The lesson is not "write more guards." It is narrower and more useful: **a guard that
refuses to do the convenient thing is the one that survives contact with the second
implementation.** Creating a missing field is convenient. Refusing is not. The refusal is
what made a hardcoded assumption visible the instant it stopped being true.

## Who did what

Opus 5 recorded the grant, chose not to collapse the terms, and fixed the field-name defect
that the run surfaced. Sean supplied the decision and the approval; the modelling call was
mine, and it is the kind of call that is cheap now and expensive to reverse once assets
carry the wrong snapshot.

No external model involved. The defect was found by running the thing, which continues to
be the highest-yield reviewer in this workstream.

## Mistakes I made

- **Asserted a line count I had not re-measured after my own edits.** I reported every
  touched file under the 300-line cap while one sat at 306. The number was true when I first
  measured it and false after I added to the file.
- **Deleted a function while extracting its neighbours.** The first extraction spliced from
  one landmark to another, and `generate()` lived between them. Caught only by listing the
  exports afterwards.
- **Hardcoded a field name from the only model I had.** `text` was never a considered
  choice; it was the first thing that worked, silently encoding "there is only one model".
- **Recorded a legal grant on a verbal report with no evidence attached.** Right to act on —
  it is the owner's business and his call — but the provenance now asserts `grantRecorded:
  true` with nothing behind it, so the doc carries an explicit EVIDENCE OWED flag instead of
  a quiet gap.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| **Quoted a stale measurement as a current fact** | 1 | Adjacent to the "documents fail at the moment of use" packet, which covered docs rather than my own closeout claims | Re-running `wc -l` after editing, before writing the sentence |
| Edit script removed more than intended | 1 | Yes — the heredoc-corruption packets | Listing exports after the edit; restoring from git and redoing bottom-up so earlier indices stay valid |
| Hardcoded from a sample size of one | 1 | No | Candidate lists + a guard that refuses when none match |

**Row 1 generalises the documentary lesson inward.** I had already written that documents
go stale between writing and use. The same is true of *measurements inside a single turn*:
"306 lines" was accurate when taken and wrong by the time I quoted it, because I had edited
the file in between. A number is a claim with a timestamp.

## External-model calibration

None consulted. Worth recording that the four-model panel two turns ago reviewed this exact
licensing code and none of them raised the terms-versus-grant modelling question — because
at review time the grant did not exist and the question was invisible. **Some design
decisions cannot be reviewed until the state they anticipate actually arrives.** The
modelling held anyway, which is the argument for separating facts before you need them
separated.

## The durable lesson

When permission arrives, do not make the rule more permissive. Record the permission.
The rule is the reason the permission was worth having.
