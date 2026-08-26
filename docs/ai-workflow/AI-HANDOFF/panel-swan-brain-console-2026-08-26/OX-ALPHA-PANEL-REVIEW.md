# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-CONSOLE-BLUEPRINT-2026-08-26.md
**Seed:** (none)
**Tokens:** 5365 in / 4421 out · **Cost:** ~$0.0000 · **Wall:** 147.5s · **finish:** stop

---

# Ox Alpha — hostile review, SWA-186 adjacent (stealth seat, $0)

## VERDICT

**REVISE.** The skeleton is sound and the boundary discipline (§3.6) is genuinely good. But the document fails its own audit three ways: the gap table promises things the blueprint silently drops, the architecture presupposes the answer to its own open question #1, and the slice plan ships the highest-risk component first while sitting on a dead branch. This is a good blueprint wearing a gap analysis as a costume.

## BLOCKERS

**B1 — The gap table and the blueprint do not reconcile.** Row 7 (Insights: spend, usage, ROI) is verdict **GAP**. There is no Insights panel. Spend gets folded into Seats as a retrospective meter; usage and ROI have no home anywhere in §3.4 or §4. Row 9 (Dreaming cadence) is verdict **GAP** — "nothing is scheduled" — and no slice schedules anything. Rows 7 and 9 walk into §1 and do not walk out of §4. Either add them, or downgrade the verdicts to "deferred, here's why." A gap table that declares gaps the plan doesn't close is worse than no gap table, because it manufactures the feeling of completeness.

**B2 — Open question 1 is unresolved, but §3.3 is already drawn.** Seven tabs, one bar, mermaid diagram — all committed *before* the panel rules on "is a seventh surface the right answer?" You cannot simultaneously list the question as open for the panel and build the architecture on one answer. Rule first, draw second. (And see F1 — I think the drawn answer is wrong anyway.)

**B3 — Branch reality is listed as a risk and then ignored by the plan.** Every slice S1–S8 is implicitly scheduled on `wip/comms-notifications-2026-07-05`, 2,285 commits behind origin/main. S0 landing Rule 80 on main does not fix this — console code written here still merges into a wall. There needs to be a **slice negative-one: cut `console` from origin/main**, before S1. Otherwise S1–S8 is throwaway work with a merge-conflict tax due on delivery.

## FINDINGS

**F1 — The tab registry defeats the separate-console argument.** Your own extensibility mechanism is the refutation of your own architecture. If new panels are one manifest row in `tabs.json`, then the taste brain's Make · Judge · Directions · Kept are four manifest rows. The real boundary between the two brains is not two shells — it's **sources.json scoping**: the taste brain's gitignored copyrighted corpus vs. the Design Brain's repo doctrine is a *per-tab source permission*, not a reason to run two `node:http` servers, two test suites, and two loopback surfaces forever. Two shells means two things to keep secure, two things to keep tested, two places for the same bug. Either merge the taste brain into the registry with scoped sources, or defend separation on the grounds that actually matter (different write permissions, different threat model, different retention posture) — and delete the "two things to maintain" hand-wave, because you chose the option with two things to maintain.

**F2 — The Desk weakens the trust model, and the proposed mitigation doesn't touch the mechanism.** The 75 minutes were not waste; they were **friction doing load-bearing work**. Friction forced triage. `j/k/a/r/t/m` optimizes for throughput of judgement, and throughput of judgement has a name: rubber-stamping. "Receipts shown before buttons" fails because pressing `a` is faster than reading receipts — that's the entire point of keyboard-first. And the novelty gauge anchors every decision made under it. Mitigations that would actually work: (a) `accept` on any single-source or contradicted claim requires typing the claim ID, not one keystroke; (b) telemetry comparing the Desk's accept-rate against the markdown-era baseline, with a standing tripwire — if accept rate jumps materially, the Desk is a stamp machine and gets friction added back; (c) no novelty gauge on the decision card itself. Absent these, S2 doesn't remove a chore, it industrializes acquiescence.

**F3 — The slice order is wrong twice.** First: S2 before S3 means Sean adjudicates from cards with no doctrine surface behind him — checking "does this contradict canon?" requires searchable doctrine, which arrives one slice later. Second and stronger: **S4 (Seats) should precede S2.** The Ox-as-Grok misfire has already fired twice and cost real credibility — that is an *active, recurring* failure. The Desk chore is *passive, weekly*. Cheaper fix, hotter fire, ships first. Order: S0 → branch cut → S4 → S3 → S2 (gated on open question 3 being ruled, which it currently isn't) → everything else.

**F4 — What breaks first in production: the Desk's write path, week one.** The console writes letters into a batch file that remains hand-editable, then invokes `adjudicate.mjs`, with no lock and no schema contract between what `app-desk.js` emits and what the parser accepts. Failure modes, in order of arrival: (1) Sean has `BATCH-<date>.md` open in an editor, Desk writes, editor saves its stale buffer — a week of receipts clobbered; (2) generated formatting drifts by a trailing space or a reordered DECIDE line and `adjudicate.mjs` rejects the batch, silently, on a Friday. Fixes: exclusive claim-lock file around batch writes; a `--validate` mode on `adjudicate.mjs` that the console runs *before* writing; and a decision the doc dodges — once S2 lands, the batch file is console-owned. Supporting both writers forever guarantees the clobber.

## MISSED

**M1 — Pre-spend estimation.** Gap 4's own text is "cost per model shown **before** you spend." The Seats panel delivers a meter over `ledger.jsonl` — i.e., after. The Fable failure you cite (95% burned, nothing to show) is a *pre-flight* failure; a retrospective meter would not have prevented it. Missing: an estimate line on every Run button.

**M2 — Bundle import.** Gap 1 says "export/**import**." Ship exports. Nothing imports, nothing versions bundles, no round-trip test. An export format nothing can read back is a dead format with extra steps.

**M3 — "Magic scan" parity is claimed, then forbidden by your own rules.** §3.4 asserts the taste brain's judged-content indexing is the "real Swan analogue" — true for the taste corpus only. The Library panel spans vault, Mobbin, and repo assets, and is grep-only *by explicit rule* (§3.6, Rule 72). Grep does not find the burger with no burger metadata. The headline capability is asserted in one section and outlawed in another. Say plainly: magic scan has no Swan analogue outside the taste corpus, and getting one requires overturning a standing prohibition — which is a decision, not a footnote.

## ONE THING

**Reconcile the gap table with the blueprint.** Every GAP/PARTIAL row in §1 must map to a panel, a slice, or an explicit signed deferral with a reason. Right now rows 7 and 9 evaporate between the audit and the plan, and M1/M2/M3 are capabilities the doc claims it captured while quietly not capturing them. Consoles don't rot at the edges first — they rot in the space between what the analysis promised and what the build shipped. Close that space before a single line of S1 is written.

— Ox Alpha, stealth seat
