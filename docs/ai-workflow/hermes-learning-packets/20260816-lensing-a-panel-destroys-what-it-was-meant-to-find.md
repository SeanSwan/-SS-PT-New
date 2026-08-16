---
originating_model: claude-opus-5
tier: fable-tier
date: 2026-08-16
topic: Lensing a review panel destroys the findings it was convened to produce — and the tooling defaults silently reintroduce it
models_used:
  - model: claude-opus-5
    role: orchestrator, synthesiser, Final Decider (Fable absent)
    did: assembled the identical packet, overrode each script's lensed default, synthesised three full-spectrum replies, wrote Rule 82 into both constitution files on main, built the blueprint artifact
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: full-spectrum panellist (declared strongest — systems/architecture)
    did: found the core loop assigned to a device absent at the anchor moment, the undesigned final handoff that made the kill criteria unmeasurable, the input choice violating the project's own privacy lock, and the entirely-absent backup slice; produced the complete build blueprint and setup runbook
    cost: flat-rate Z.ai coding plan (~$0 marginal)
  - model: moonshotai/kimi-k3
    role: full-spectrum panellist (declared strongest — security/privacy)
    did: found Android Auto Backup exfiltrating the child DB with zero code written, unencrypted at-rest storage, the forgotten-passphrase failure, and the photos ban; produced the first properly-stated threat model in four rounds
    cost: $0.3114
  - model: tencent/hy3
    role: full-spectrum panellist (declared strongest — systems/architecture)
    did: found that default expiry remains a legal time bomb even with exemption flags present, and that the kill criterion should count uncorrected errors rather than caught ones
    cost: $0.0065
skills_touched:
  - id: Rule 82 (Full-Spectrum Panel)
    change: created
    failure: a six-model panel was run with per-model lenses; the model pointed away from architecture and security produced the best finding in both, proving the lens was filtering contribution before it was made
  - id: scripts/consult-kimi.mjs
    change: proposed
    failure: defaults to a narrow SwanStudios-branded remit; omitting --remit silently reintroduces the banned behaviour
  - id: scripts/consult-hy3-design.mjs
    change: proposed
    failure: defaults to "Give only UI/UX and interaction suggestions" — the exact lens Rule 82 forbids, applied by default
title: Lensing a panel destroys what it was convened to find
tier_basis: fable-tier
decision: Lensing a review panel destroys the findings it was convened to produce — and the tooling defaults silently reintroduce it
status: draft
privacy: IDs/roles only; no PII, no secrets, no absolute paths
migrated: 2026-08-16 — required keys back-filled mechanically (title<-H1; tier_basis<-tier; decision<-topic (re-keyed, not re-authored); status=draft (never reviewed against a contract); privacy<-scanned clean by validator patterns); originating_model untouched
---

# Lensing a panel destroys what it was convened to find

## The lesson

**Assigning each model a narrow role optimises for non-overlap between reviewers. That is the
wrong objective.** The objective is maximum depth per brain on every dimension. Diversity of
findings comes from model diversity, not from artificially narrowing each model's remit.

The evidence is unusually clean. In the lensed round, GLM 5.3 was assigned the *product* lens.
It nonetheless produced the best **architectural** catch of the session and its sharpest
**security** finding — while being explicitly pointed away from both. What it withheld because
of its assigned remit was unknown and unrecoverable without a full re-run.

The unlensed re-run then found **six defects the lensed round had not produced at all**,
including a critical exfiltration path (Android Auto Backup shipping the child database to
Google Drive with no code written and no user action) that four rounds of design had never named.

Cost of the re-run: **$0.32.** Cost of not running it: a product that ships a data-leak path
into a system holding developmental records about named two-year-olds.

## Who did what

**GLM 5.3** was the highest-value brain in the session and it was free. Declared
systems/architecture as its strongest angle, went deepest there, and still covered product,
interaction, visual, strategy, synthesis and final-decider judgement in full — which is exactly
the shape Rule 82 requires. It was the only model to produce a complete setup-day runbook, and
the only one to notice that a backup slice was absent from the entire twelve-slice roadmap while
the data that legally protects the user is exempt from expiry.

**Kimi K3** was worth many times its $0.31. It produced the single worst-severity finding of the
project. Its threat model was the first properly-stated one in four rounds — assets, adversaries,
and an egress surface ranked by actual leak probability rather than by design elegance. Its
framing line is worth keeping: *"the honest name for the whole system is not privacy boundary, it
is egress inventory — you cannot guard what you have not listed."*

**HY3 at $0.0065 found something both expensive models missed:** that defaulting observations to
expire remains a legal time bomb even with exemption flags present, because the note that protects
you is often the one nobody thought to mark. **Do not assume the cheap model is the redundant one.**

**Where they disagreed is where the value concentrated.** Three genuine forks emerged — the
response to a wrong-child error, the expiry default, and what "no sync" should actually lock. A
lensed panel would have produced one opinion per question and called it consensus.

## Skills created or changed

**Rule 82 — created**, live on `origin/main` at `8257e42b6`, added by hand to both `CLAUDE.md`
and `AGENTS.md` with byte-identical rule bodies. The mirror sync was deliberately not used; the
constitution guard independently confirmed 81→82, zero removed, zero renumbered, mirror parity in
sync.

The rule's operative shape is **roles are declared, not restrictive**: *"my assigned role is X;
from that angle I see… and here is everything else I see."* The role earns the deepest pass; it
never bounds the scope. A lane-bound reply is incomplete and gets re-run.

**The tooling amendment is the part that will actually prevent recurrence.** Writing the rule was
not enough, because the scripts default to the banned behaviour.

## Mistakes I made

- **I fired the first model before reading the consult scripts.** When preparing the other two
  calls I discovered `consult-hy3-design.mjs` defaults to *"Give only UI/UX and interaction
  suggestions"* and `consult-kimi.mjs` defaults to SwanStudios brand enforcement — both via
  `options.remit || defaultRemit`. Had I fired all three at once on habit, HY3 would have run
  under the exact narrow lens Rule 82 bans, **in the run convened to prove lensing is harmful.**
  The rule would have been established by a run that violated it, and I would not have known.
- **I under-budgeted output tokens** for a deliverable that explicitly requested four diagrams,
  seven wireframes, a slice table and a do-NOT list. GLM truncated mid-table and lost two entire
  sections, costing a second twelve-minute call. The budget should be sized from the deliverable
  list, never from habit.
- **I hardcoded `#fff` on a severity chip** whose background token flips to a light tint in dark
  mode — roughly 2:1 contrast. The classic "colour declared without reference to the token set
  behind it" bug, in a page I had just written theme tokens for.
- **I nearly shipped four Mermaid diagrams on reasoning rather than verification.** I had
  concluded they were valid. Only on the hostile pass did I write an actual structural checker.
  It passed — but "I reasoned it was correct" and "I verified it was correct" are different
  claims, and only one of them may accompany the word done.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Trusting a tool's default instead of reading it | 1 (caught before damage) | Rule 18 exists and says exactly this | Reading the script before the second call. **Rule 18 was in context and did not fire on the first call** — what fired was the accident of needing to check argument syntax. |
| Reasoning-as-verification on generated output | 1 (caught in self-review) | Yes — Rule 74 proof-before-done | Writing an actual checker. The habit that saved it was running the hostile pass at all, not the rule text. |
| Colour hardcoded outside the token set | 1 | Yes — standing artifact guidance | A deliberate grep for hex literals outside `:root` blocks. Eyeballing the CSS had already missed it once. |
| Output-budget under-sizing on a long deliverable | 1 | No — now in Rule 82 | Nothing stopped it; it cost a second call and was caught only by inspecting the tail. |

**The highest-signal row is the first.** Rule 18 (*inspect the installed version and a working
in-repo example before trusting an API*) was loaded, in context, and did not prevent the error —
because the rule is phrased around libraries and I was calling a first-party script, which did not
feel like the case the rule covers. **A rule that depends on the agent recognising its own
situation as an instance of the rule will eventually miss.** The correction that survives is the
procedural one now written into Rule 82: *always pass an explicit `--remit`* — a command-shaped
instruction that does not require correctly classifying the situation first.

## External-model calibration

| Model | Cost | Findings real | Findings disproven | Verdict |
|---|---|---|---|---|
| GLM 5.3 | $0.00 (flat) | All | None | Best architecture + blueprint brain available. Free. Use it first, and use it unlensed. |
| Kimi K3 | $0.3114 | All | None | Best security/threat-model brain. The Auto Backup catch alone justified four rounds of cost. |
| HY3 | $0.0065 | All | None | Do not treat as filler. Found a legal-risk defect both expensive models missed, for two-thirds of a cent. |

**Standing routing note:** a three-model full-spectrum run costs the same as a three-model lensed
run and returns strictly more. There is no efficiency argument for lensing — it was never cheaper,
only narrower.
