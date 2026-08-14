# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-LEARNING-CORPUS-V2-DESIGN-BRIEF-2026-08-13.md
**Seed:** (none)
**Tokens:** 1987 in / 5226 out | **Cost:** ~$0.0844 | **Wall:** 62.2s | **finish_reason:** stop

---

# Hostile review: Hermes learning corpus v2

## Part 1 — The §1 measurement does not support its headline claim

"**Nothing consumes the corpus as knowledge**" is the ninth instance of the session's signature failure: a narrow check promoted to a general finding. Here's what the check actually established versus what was claimed:

**What `rg 'hermes-learning-packets?'` proves:** no *script in the searched tree* references the corpus path except four Stop hooks, and those hooks only validate existence plus one heading.

**What it does not prove:**

1. **Agent reads are invisible to `rg`.** The primary consumer of a markdown corpus in an agent system is the agent itself, reading files at runtime because a skill doc or Rule 68 told it to. That leaves zero trace in the repository. "Hermes has never read it" is unverifiable from a static search — you'd need session transcripts or read instrumentation. The honest claim is: *no deterministic consumer exists; any consumption is ad-hoc, unindexed, and unverifiable.* That's still a real gap, but it's a different gap with a different fix (a read-side trigger, not necessarily a daemon).
2. **The Pi claim is uncheckable by the author's own admission.** "The Pi daemon read-list extension was never made" — the Pi is SSD-power BLOCKED. You cannot inspect it. Asserting a negative about a system you cannot reach is exactly the pattern you've been caught on eight times. Downgrade to "unverified; presumed absent."
3. **The search scope is unreported.** Case sensitivity, whether it covered worktrees/branches/other repos, and what the 20 non-executable hits were — none stated. If any of those 20 are docs that *instruct* agents to read packets, the corpus has a consumer pathway the headline denies.
4. **"8 shapes" is doing heavy lifting without a definition.** Distinct key-sets? Key order? If three of the eight differ by one optional field, the drift story is real but less dramatic. Show the shapes, not just the count.

**What survives the attack:** the field-presence table (that's a direct count, well-formed), the non-existence of `hermes-learning-append.mjs` (trivially verifiable), and the validation-vs-ingestion distinction for the four hooks (code shown, correct). The thesis "consumption, generation, and conformance are the gaps" survives — but "a write-only pile Hermes has never read" does not, and building E on the unproven version risks building daemon infrastructure for a problem that's actually a missing read trigger.

---

## Part 2 — §3 under fire

**Over-built:**
- **F is theater at current data volume.** A routing table computed from `models_used` — present in **1/18** packets — is a dashboard over one data point. Building the generator now means building it against a schema whose semantics haven't been exercised. Capture the fields now; compute nothing yet.
- **C's STALE-via-SHA12 detection** mirrors Rule 72 correctly, but at 18 files the drift it detects is detectable by eye. Justified only because it's cheap if generated; don't gold-plate it.
- **B's `supersedes`-target-exists check** validates a field present in 5/18 packets. Fine as a warning; wrong as a gate.

**Missing (this is also the answer to Q5, ranked there):** no read-side surfacing trigger, no lifecycle semantics, no outcome/verification field, no repo-history secret scan, no dedup/distillation layer.

**What an actual enterprise knowledge system has that this doesn't:** an ownership and review contract (who vouches for this packet's accuracy, when was it last confirmed), lifecycle states with expiration, and — most importantly — a **surfacing SLA**: a defined moment when the system is obligated to consult the knowledge. This design has a write trigger (Rule 68) and no read trigger. Enterprise knowledge systems fail by going unread, not by being malformed. This design is on track to fail exactly that way, with better-formed packets.

---

## Part 3 — The six questions, in order

**1. Is "no consumer" the real gap? Where's the crossover?**

Half real. The *deterministic* consumer gap is proven; the *no consumption at all* claim is not (Part 1). On crossover: you're conflating three infrastructures with three different crossovers.

- **Generation/validation: crossover already passed.** 8 shapes in 18 hand-written documents is the empirical proof. Drift cost is being paid today.
- **Indexing for lookup: not yet.** 156 KB is rg-able in seconds and readable end-to-end in twenty minutes. Crossover arrives at roughly 75–150 packets or ~1 MB — when an agent won't reliably read the directory and starts missing relevant packets. At the current rate (~3.6 packets/week), that's 4–8 months out.
- **Indexing for cross-packet questions** (recurrence, routing): crossover is whenever you want those answers, but you can't want them yet — the fields don't exist (1/18).

The correct move at 18 packets: build conformance now, build the INDEX generator now only because it's nearly free once packets are conformant, and **instrument reads** (log every agent read of a packet) so the next crossover conversation has data instead of another unverifiable claim.

**2. Does an emitter kill drift or relocate it?**

It relocates drift from N authors' memories into one versioned generator — which is strictly better, *provided the validator is the contract and the emitter is merely one producer of it*. The failure mode you name (silently wrong shape at scale) is real only if the emitter is trusted. It must not be. Requirements: (a) the validator must pass packets the emitter didn't produce — migration D depends on this; (b) the emitter stamps its own version into each packet so shape regressions trace to a generator version; (c) the schema lives in a versioned data file, not hardcoded, so "the contract" is inspectable and diffable. With those, drift relocation is a win. Without them, you've built a drift cannon.

**3. Is committed markdown the wrong substrate?**

No — and the two constraints you cite (Rule 72, Rule 68) aren't the reason it's right; they're incidental. Git gives you versioning, audit (blame), review (PR), and backup for free, which covers most of the enterprise checklist at this scale. What git *cannot* do is per-field access control — but the corpus is single-trust-tier by design (IDs/roles only), so that's not a live requirement.

The actual substrate problem is the one you half-buried: **the repo was public until April and holds credential-remediation history.** The leak surface is git *history*, not the working tree, and B's privacy scan only covers new packets. Prescription: one-time full-history scan (gitleaks/trufflehog over all refs), remediate or rewrite, then keep git and revisit substrate only past ~1,000 packets or if a second trust tier appears.

**4. What stops the routing table being a model grading itself?**

Nothing, as designed — and a self-graded routing table is worse than none because it manufactures authority. The only version worth building has three properties: (a) it records **verifiable outcomes only** — findings later confirmed or disproven by tests, CI, or a different model, never self-assessed quality; (b) the confirmation/disproof field is populated by a *subsequent* session that exercised the claim, never by the originating session; (c) `reviewed_by` (currently 3/18) becomes mandatory for a packet's data to enter the table. That makes it a ledger of tested claims, not self-esteem. Don't build it now: with 1/18 packets carrying `models_used` and zero carrying verified outcomes, there is nothing to compute. Build the *capture* (via A/B), build the *table* when ≥20 packets have verified outcome fields.

**5. What's missing, ranked by value left on the table:**

1. **Read-side surfacing trigger.** No defined moment when Hermes must consult the corpus. Without it, A–E produce a pristine, conformant, indexed pile that is still never read — the exact failure §1 alleges, rebuilt at higher quality. This is the largest gap and it's not in the proposal at all.
2. **Lifecycle semantics.** `status` exists (6/18) with no state machine: draft → reviewed → current → superseded → archived, with `reviewed_by` required to advance. Enterprise knowledge without review is a rumor mill with frontmatter.
3. **Outcome/verification field.** "Did this lesson hold when reused?" — the prerequisite for an honest F and the difference between session logs and knowledge.
4. **Repo-history secret scan.** One-time, cheap, catastrophic if skipped (Q3).
5. **Distillation layer.** Packets are session logs; enterprises need canonical lessons. A generated `LESSONS.md` that dedups across packets — this is what the recurrence report (F) wants to be, and it's useful at far lower data volume.
6. **Retention/compaction policy.** Cheapest to define now, painful to retrofit.

**6. If Sean builds only ONE thing: B, the validator.**

Not A. The emitter is one producer; the validator is the contract. Concretely: B wired into the existing Stop-hook family means **shape #9 never lands**, regardless of whether the packet was hand-written, emitted, or migrated. A without B can silently mass-produce a wrong shape (your own Q2 failure mode). B without A still lets humans write conformant packets. B is also the prerequisite for everything else: D's migration target is defined by B's schema (run B against the 18 today and the failure list *is* the migration spec), C's parser depends on conformant input, and F's fields only become trustworthy when B refuses packets that lack them.

What B must do: validate required frontmatter keys against a **versioned schema file** (data, not code); match required literal headings exactly (including the unnumbered `## Mistakes I made` that bit you today); enforce the tier allowlist; run the privacy scan; check `supersedes` targets as a *warning*; exit non-zero under `--check` inside the Stop hook; and emit **machine-readable error lists** so the agent can self-repair within the turn rather than just being blocked.

---

## Part 4 — All findings, ranked by decision impact

1. **§1's "nothing consumes" is unproven for agent reads and unverifiable for the Pi.** Highest impact because E's design depends on which version is true: daemon ingestion vs. read-side trigger. Instrument reads before building either.
2. **Build B before A.** Reverses the implied ordering of the proposal; everything downstream (D, C, F) depends on the contract existing first.
3. **The missing read-side surfacing trigger.** The real enterprise gap; without it the entire v2 is a better-organized write-only pile.
4. **Defer F.** Self-grading data with 1/18 field coverage; build capture now, computation at ≥20 verified packets.
5. **Repo-history secret scan** (public until April). One-time, cheap, high-severity.
6. **Lifecycle + mandatory `reviewed_by`.** Turns logs into reviewed knowledge; prerequisite for trusting anything derived.
7. **Substrate: keep git.** Correct call at this scale; revisit at ~1,000 packets or a second trust tier.
8. **C's INDEX: build it, but as a byproduct of B-conformant packets, not as the headline deliverable.** Lookup crossover is months away; its near-term value is conformance reporting, not search.

The thesis survives hostile review in narrowed form: the gaps are conformance, generation, and *verifiable* consumption — in that order, and B is the first brick.
