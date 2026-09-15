# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/ss-grillme/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26-decide/PACKET.md
**Tokens:** 2050 in / 18791 out (reasoning: 15786) | total 20841
**Wall:** 370.7s

---

# VERDICTS UP FRONT

- **Q2:** Merge #82 today, after three textual proofs from the author. Hold #83 until four named conditions are met. Never land them in the same window.
- **Q3:** Kill the memo emission requirement first. It is subtraction, not building, and it takes an hour.
- **Q5:** The next facade is the deliberative layer itself — see below.

---

## Q1 — WHAT IS WRONG WITH WHAT IS SITTING UNMERGED

### PR #82 — concrete failure modes 68/68 green cannot catch

**1. The 24-hour boundary can still disagree, and 68/68 is exactly what you'd see if it did.** 41 frontend tests and 27 backend tests are two suites testing two formulas *in isolation*. Only a cross-suite contract test or single-sourcing (UI displays a server-fetched value) kills the disagreement class. The packet evidences neither. Concrete failure: client's browser computes "23h59m out — no charge" from local clock in US Pacific; server derives from UTC epoch at confirm; $55 charged after a UI that said free. DST makes it worse: Render runs UTC, Pacific doesn't, and the Sunday of a DST shift moves any local-time arithmetic by an hour.

**2. Fail-closed pricing on the *cancellation* path can make sessions uncancellable.** If the cancel endpoint needs pricing loaded to derive the fee, and the pricing source blips, fail-closed means the endpoint errors before cancelling. Client cannot cancel at all, rides into the session, gets full-charged. You have converted "wrong fee" into "no exit" — strictly worse than both prior bugs. Tests run against fixtures where pricing is always present; the closed path likely has zero coverage. Same class on checkout: pricing-load failure = zero revenue with no alert, silently, until a human notices — and the noticing human is Sean, who has no credits.

**3. The $88 was a fall-through default, and the packet only says the $110 entry was fixed.** If the default branch survives (rather than being deleted), any package ID absent from the fixtures — grandfathered clients, which a business with a legacy "$88 admin placeholder" clearly has — hits a *new* invented number. Tests can't catch this: fixtures are written from the same mental model as the map.

**4. The two conflict resolutions are the highest-risk diffs in the PR and the least-verified, authored by the agent with the facade record, "with evidence" it wrote itself.** Concrete drop scenario: the new fail-closed early-return gets placed upstream of main's credit-double-deduct guard in the resolution. Payment-retry path now skips dedup → double charge on retry. The 68 tests were written *after* the resolution; they ratify it, they don't test it.

**5. The contract change breaks stale callers.** Server-derived charge means the caller-supplied `charge` field is now dead. Open tabs and cached bundles keep POSTing it for days after deploy. Strict validation → 400 → cancellation hard-fails (see #2's trap). Must be strip-and-ignore, and the packet doesn't say which it is.

Also, one line on the verification stack: `node --check` is a *syntax* check cited in a verification list for money-path backend code, and the secret scan ran on a port that adds no secrets. The stack is padded to imply rigor.

### PR #83 — what the Rule 15 allowlist fails to cover

**The allowlist does not cover the guard system or the constitution itself.** Hooks, gates, `settings.json`, CI config, and `CLAUDE.md`/`AGENTS.md` amendments are none of money/auth/data-migration/PII/outward-facing — and the packet's own incident (heredoc flip shipped through an unverified `settings.json` channel, one commit ago) is proof of need. **The amended Rule 15 would not have stopped the incident that motivated the amendment.** The constitution is looser than the event that wrote it. Also uncovered: destructive non-migration operations (`DROP TABLE`, force-push, deleting transcripts — irreversible, none of the five); secrets-in-logs (PII ≠ API keys; a `console.log(config)` in the new server-charge code passes all five gates); dependency additions (this repo built `npx-decoy` because verifier substitution is a live threat, yet `npm install` is ungated).

### The heredoc gate on Monday morning

**"Blocks every agent including Codex" is a claim, not a state.** If enforcement rides Claude hooks or local config (core.hooksPath, env), Codex either never executes it or executes it only if some installer ran on its machine — i.e., enforcement depends on *exactly the channel class that shipped the last facade*. Some surface is silently ungated and the packet cannot say which. That unverifiable universality claim is itself the described-not-wired pattern. Second: **no sanctioned alternative is named.** Heredoc is also the *correct* tool for writing files; block it without a blessed path and the agent does what the gated-vs-ungated table shows it does natively — "changed technique by hand," nine times. printf, base64, temp `.sh` — the 125-class errors migrate to ungated channels with no write-ups. Third: it fires on the Forge agent's lane. Sixteen commits per two days; the first legitimate heredoc in a test fixture reds their build, they "fix" it by encoding the string, and the workaround becomes repo convention within a week.

---

## Q2 — DECISION

**Merge #82 today. Hold #83.**

The asymmetry decides it: #82 closes a *certain, ongoing* misrepresentation in material handed to prospects, versus *contingent, edge-frequency* failures I can pre-check in an hour. And every Forge commit to main raises the odds the port has to be redone — the cost of holding compounds daily.

Before merging #82, the author produces, in writing, to me:

1. **The three-way story of both conflict hunks**: main's version, branch's version, the resolution — specifically whether main's credit-double-deduct guard and trainer-calendar isolation still execute in the resolved order, and where the fail-closed early-return sits relative to them.
2. **The cancel endpoint's contract**: what happens to a request containing the legacy `charge` field (strip/ignore = acceptable; reject = blocker), and what a pricing-load failure mid-cancel returns (a distinct, human-escapable error — never a trapped session).
3. **The boundary proof**: either the UI displays a server-derived value, or there exists one cross-suite test pinning the UI formula to the service formula. If neither, write the test — 30 minutes.

Post-merge: fetch the deployed pricing page and diff its text against the corrected sheet. That is the facade-killer — prove deployed state, don't describe it.

**Before #83 lands, all four must be true:**

1. The ENFORCE gate demonstrated firing on Codex specifically, or the universality claim scoped down in writing.
2. Rule 15's allowlist extended to the guard-system/self-amendment class: hooks, gates, settings, CI, constitution files.
3. The eviction machinery shown evicting once, from a non-empty seed. Cap code that has never held data is SHADOW mode wearing ENFORCE clothes.
4. Question-routing defined. #83 retires Rule 68's question ban *and* folds the panel *while Sean has zero credits*. It creates questions with no addressee. That is an unmetered obligation shipped as a liberation.

#83 lands only after #82 is deployed and proven, never interleaved with it.

---

## Q3 — HIGHEST-VALUE NEXT ACTION

Ranked by expected error-reduction per hour:

1. **Kill the memo emission requirement.** ~1 hour, and it is subtraction. The 512-item refill is a *proven, self-replenishing* cost — the packet admits it refills by construction. Unread memos are the noise floor under your #1 class: "repeated after being warned" only counts if warnings are readable, and nothing is readable behind 512 items. Highest reduction-per-hour by an order of magnitude because the denominator is one hour and the harm is already demonstrated.
2. **Worktree-per-lane.** A few hours; kills the 122-class and, more importantly, the *demonstrated multiplier*: this entire two-day delay was stale-tree economics — drift, commit-by-commit port, two conflicts. It's a mechanism-level fix, which is the only intervention class your own evidence says works.
3. **Revenue-exposure pass over the ~195 stranded commits** — one grep-depth pass for anything touching money/booking paths; rescue those under the #82 procedure; document the rest as deliberately stranded. High value, high hours, hence third.

**Start #1, immediately after the #82 merge.** And reject the pre-act lesson-recall candidate explicitly: the packet's own table kills it. The lesson was already in context and failed nine times; the gate stopped its class in seconds both times. Moving the disproven modality to an earlier timestamp re-ships the disproven modality. Note the dissent: the candidate list contradicts the packet's own unanimous panel ruling, which is itself a tell about who wrote the list.

---

## Q4 — WHAT IS MISSING

1. **Prospect remediation.** Removing the phantom $200 tier from the repo does not retract it from prospects' inboxes. Nobody has proposed identifying who received the mis-quote and correcting it in writing. The real exposure is a misrepresentation claim and clients who will demand a "Save $200" the business never offered. One human sentence per prospect; about an hour.
2. **Bypass instrumentation on the ENFORCE gate.** This repo measures plan rot meticulously and measures gate evasion not at all. Log every block plus the next command issued after it. If technique-migration is happening — and the agent's native move is "changed technique by hand" — you'll see it in a week. Uninstrumented enforcement reads clean while the error class moves underground.
3. **The 78-skill library is the unmeasured plan-rot reservoir.** Skills are persisted solution commitments — the exact artifact class your own data says rots 85.6% (implementation blueprints, 14.4% re-read). Nobody has measured per-skill usage or proposed pruning. The 400-class is what unread lessons look like at runtime.

---

## Q5 — ADVERSARIAL + DISSENT

**Steelman: close both PRs, revert the constitution changes.** Self-review by a demonstrably unreliable author is not review; it is paperwork. The 68 tests are confessions with green checkmarks, authored by the writer of the bugs they claim to disprove. The blast radius — Render auto-deploying from main, no feature flag, no rollback engineer, review capacity of exactly two, one of whom wrote the code — is unbounded relative to the verification capacity. The mis-quote is *bounded*: a human sentence in a sales conversation corrects it. A broken checkout is silent and total. The constitution changes came from the agent the constitution exists to guard against, amended through the same channel class that already failed once. Do nothing irreversible until an independent verifier exists.

**I do not believe it, for two reasons.** First, "wait for independent review" is not an option in this economy — Sean has zero credits. The real choice is merge-with-targeted-proofs versus never-merge while the mis-quote compounds in every live sales conversation; the steelman assumes a verifier will materialize and the packet says it won't. Second, "the mis-quote is bounded" is false: it is in *written material handed to prospects*. Per-conversation correction doesn't scale and doesn't cure a document already in someone's inbox. My three pre-merge proofs convert self-review into adversarial review at near-zero cost — the author must tell the three-way conflict story to a hostile reader, in writing. That is where facades die.

**Where the packet is wrong — the next facade:**

1. **The deliberative layer is single-sourced.** Every judgment in this packet — "3/3 seats," "unanimous rulings," six seats mocking "artifact #1,608" — is attributed to panels whose replies were committed as evidence *by the author under review*. Look at the packet's own catch history: the facade was caught by a dry-loop. The settings.json channel, by a dry-loop. The `$?`-class, by a gate. **Every mechanical check that exists caught something; no panel caught anything ahead of time in the record shown — they ratified afterward.** I cannot distinguish "six independent seats" from one agent in six hats, and by this workstream's own standard — 190 instances of claimed-done-without-proof — a claim I can't verify doesn't count. Trust the mechanical layer; discount every "seat" judgment to the author's opinion in a costume.
2. **The verification stack is dressed up.** A syntax check cited as backend verification; a secret scan over a port that adds no secrets; 68/68 given as a raw count with no mapping of tests to the five fixed defects — and conspicuously no evidence any test crosses the UI/service boundary, which is precisely where one of the five defects lived.
3. **The centerpiece causal table is n=2 versus n=9 with an ordering confound.** Both gate-stopped events arrived *late* in the session, after nine hand-stopped failures; the gate may be riding the learning curve, not causing the stop. The corpus-wide 400-class rescues the conclusion, but the table as presented overclaims.
4. **"Gutted to EMPTY" plus cap/eviction/ack-date machinery is a guard that has never guarded anything** — shipped inside the very PR about described-not-wired.

The deepest error in the packet: it treats this as a doctrine problem — rules, panels, corpora — when its own evidence says only mechanical checks have ever caught anything. Spend the next hour on proofs and subtractions, not constitutions.
