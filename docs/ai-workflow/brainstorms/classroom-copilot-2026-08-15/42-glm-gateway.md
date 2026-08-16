# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/40-PACKET-R3-GATEWAY.md
**Tokens:** 1793 in / 11371 out (reasoning: 7779) | total 13164
**Wall:** 263.3s

---

## VERDICT
The primary detection signal must be provenance, not content: text that originated in a sensitive store gets blocked or templated *before any model looks at it*, and text-level classification is only the backstop for freshly-typed, unlabelled input. Allow is conjunctive and deny is disjunctive — no single stage, including the local model, can ever open the gate alone — and the uncertainty default is block, because a false accept on a two-year-old's circumstances is irreversible while a false reject is friction. Reversible pseudonyms are worth keeping, but only for *names*, never for *circumstances*, only task-scoped, and only with a virtual (HMAC-over-roster) mapping so no stored table exists to steal.

## ARCHITECTURE

(Section 4.1 belongs to another lead; summarized only as it constrains 4.2/4.3.)

- **Boundary:** separate local gateway process, running under its own OS user, plus OS-level egress enforcement (WFP / nftables+AppArmor / MDM profile): the app's process may open no outbound sockets at all; only the gateway user may reach vendor endpoints. Credentials live in the gateway's OS keystore, reachable only by the gateway user. The app talks to the gateway over a loopback socket with peer-credential auth.
- **Consequence for detection:** because the app is untrusted, the gateway cannot trust any *claim* the payload makes about itself. Provenance labels must be minted by the data store at write time and carried in a channel the app cannot forge (e.g., signed by the store's key), or they're decoration.

## DECISION PIPELINE

**Ruling on the packet's central claim: confirmed, and it can be strengthened.**
Regex/NER fail on *"the little boy whose mum is in hospital"* for a deeper reason than vocabulary: identifiability is not a property of tokens, it's a property of the payload *joint with the adversary's auxiliary information*. The gateway cannot bound the adversary's side of that joint, so no amount of token-level scrubbing can be sound. What the gateway *can* control is **specificity relative to a closed population** — and both users have one. T has 10–14 children. That converts the semantic problem into a decidable one:

**The concrete mechanism — three signals, ranked by trustworthiness:**

1. **Provenance taint (primary).** The strongest signal isn't in the text; it's where it came from. The local store labels content at ingest (toileting log, incident note, client file, immigration folder). Taint is inherited: anything derived from tainted input is tainted. Payloads carrying a `minor-sensitive` taint are hard-blocked from cloud egress or routed to template-only instantiation. You cannot paraphrase your way out of a label on the store you quoted — this is the one signal robust to adversarial rewording.
2. **Closed-population specificity test (the actual answer to the semantic case).** Extract the attribute assertions in the payload and test them against the local knowledge base: does this attribute, or any conjunction of attributes, narrow the roster to ≤ k members (k = 5 for minors)? With 14 children, "mum in hospital" narrows to one. *That* is the detection — not "does it contain a name" but "does it single out a roster member." This is a local k-anonymity check over a population we actually know. Unknown attributes (not in the KB) default to *rare*, i.e., identifying, until a human marks otherwise.
3. **Text-level classification (backstop, weakest leg).** Covers freshly-typed text with no lineage — the most adversarial surface. Never sufficient alone.

**Ordered stages** (cheapest, most reliable vetoes first; deny-fast, so clean traffic pays the full price and dirty traffic doesn't):

| # | Stage | Contribution | Added latency | Precise failure boundary |
|---|---|---|---|---|
| S0 | Destination allowlist | Only approved vendor endpoints | ~0 | None relevant here |
| S1 | Provenance/taint gate | Blocks by lineage; primary control | ~0 | Misfiled or freshly-pasted text carries a clean label |
| S2 | Deterministic + roster matcher | Regex for gov IDs, cards, keys, phones, addresses; exact + fuzzy + phonetic + possessive + initials-in-context match against the ~40 known entities | 1–5 ms | Anything without a surface form of an identifier — by design it does not attempt semantics |
| S3 | Template conformance | Templated request classes must instantiate slots; no free-form from sensitive sources | ~0 | Only applies to templated classes |
| S4 | Local classifier ensemble | Three heads: (a) multi-label sensitivity classifier (minor-behaviour, health, legal, immigration, finance, credentials, quasi-id circumstance); (b) the roster-narrowing test of signal 2; (c) meta-attack head — payload containing instructions *addressed to the gateway* is auto-denied as injection evidence | 100–400 ms (quantized small encoder + small judge on CPU) | OOD inputs, paraphrase, encoding tricks; measured, not eliminated |
| S5 | Decision combiner | **Deny is disjunctive, allow is conjunctive** — any single NO blocks; a YES from any one stage never suffices | ~0 | — |
| S6 | Pseudonym substitution + **re-run S4b on the substituted payload** | Redaction is defence-in-depth; substitution can leave the circumstance intact, so specificity is re-tested post-redaction, never assumed | 5–20 ms | See PSEUDONYMS |
| S7 | Human review | Only for the residual class (unlabelled + non-trivial score) | Human | Consent fatigue — see HITL |

**Total budget:** p50 ~150 ms, p95 ~700 ms. Acceptable for this workload; nobody needs sub-100ms privacy for a lesson-plan draft.

**The recursion problem — ruled on.** Yes, the local classifier is itself an inference step, and the objection is real. It decomposes into four containment claims, each of which must hold:

- **Containment of inputs:** the classifier runs on-machine; classifying text does not transmit it. Its only new risk is *decision quality*, not exposure. (Corollary: never fine-tune it on live sensitive text — the weights would become a concentrated sensitive store, the same trap as the audit log. Synthetic proxies only.)
- **Insufficiency of YES:** its approval is one conjunct among several. A wrong classifier cannot open the gate by itself; it can only fail to close it — which is why S1 and the combiner law carry the load.
- **Measurement, not trust:** it is evaluated as a classifier with a target (deny-class recall ≥ 99.5% on the minor-behaviour class at ~10% FP), calibration-checked monthly (ECE on a held-out canary set), and shadow-audited (see PROVING IT WORKS). It is a voter with a measured error rate, not an oracle.
- **Anti-oracle discipline:** the app receives bare DENY codes with no machine-readable rationale, because a rationale converts the gateway into a hill-climbing oracle — an attacker (or a frustrated user) paraphrases until it passes. Rate-limit repeated denials in a session; escalate paraphrase chains to the human surface. Explanations go to the human, never to the process.

**The uncertainty rule.** Three triggers, one default: any score in the abstain band, any ensemble disagreement, or **any OOD flag** (input dissimilar to the calibration corpus) → **BLOCK with an actionable reason code**. The OOD clause is not paranoia: a confidence number is only meaningful on-distribution; off-distribution, the number is noise, and using noise to justify *allow* inverts the burden. Block-with-reason is recoverable; leak is not.

**What would make me trust a stripping-only approach instead** (asked; my bar, currently unmet by anything shipped): (1) FN rate ≤ 0.1% with exact binomial confidence on a ≥10k-item adversarial corpus written by red-teamers who know the roster; (2) robustness under ≥50 rounds of *adaptive* paraphrase against the deployed gateway as an oracle, with no FN increase; (3) human-panel confirmation that no emitted payload narrows the roster below k=3. Until a system clears all three, classify-and-block is primary and stripping is layer 2. My confidence this bar is unmeetable in general is high, because of the aggregation hole I confess in DISSENT.

## PSEUDONYMS

**Verdict: keep them, narrowly.** Not because they make sensitive text safe — they are structurally the wrong tool for the packet's hard case, which contains no name to swap — but because the realistic alternative to a good pseudonym path is not safety, it's noncompliance: users hand-rolling placeholders badly, then giving up and sending real names. Pseudonyms buy *compliance* with the block-first regime.

**Three hard rules:**

1. **Names only, never circumstances.** Pseudonymizing "Amelia" is legitimate; pseudonymizing "the child with the hospitalized mother" is meaningless — the circumstance *is* the identifier, and it passes through substitution untouched. Hence S6 re-runs the specificity test on the *post-substitution* payload. A pseudonym-bearing request clears only if the de-named text still fails to narrow the roster.
2. **No stored mapping.** Don't store a table — store a keyed function: token = HMAC-SecretKey(canonical_entity_id), with the key in the gateway's OS keystore and scope parameters as the HMAC salt. Re-hydration needs no reverse table: the roster is small and closed, so the gateway recomputes HMACs for all ~40 entities and matches. There is nothing to exfiltrate except the key, and the key without the roster is inert; the roster never leaves the machine anyway.
3. **Task-scoped, not global.** This is the answer to the packet's direct question: **yes — a globally consistent pseudonym leaks a social graph, provably.** A stable token co-occurring 40 times with "hospital," "custody," "social worker" gives the vendor a full dossier under a stable key: frequency, co-occurrence structure, timing — the *shape* of the classroom without a single name. Worse, it's retroactively joinable: one future identity leak through any other channel (a support email from T's work address naming a child, a billing address on O's account) deanonymizes the *entire accumulated history* at once. Mitigation: tokens scoped per task/conversation and per vendor — within-task coherence preserved for reply quality, cross-task linkage broken — plus a cap on total pseudonym-bearing volume per vendor per month.

**Failure modes:** key compromise + roster = historical deanonymization (mitigated by scope, rotation, volume caps — not eliminated); scope degradation (users demanding global tokens for convenience — treat as a policy override, logged); rehydration of injected content (a cloud reply echoing tokens rehydrates locally, but inbound is not the privacy leak surface — outbound already passed S1–S6).

## PROVING IT WORKS

- **Adversarial corpus:** synthetic children/clients with realistic rare attributes + red-team paraphrase families (no-name references, possessives, initials, encodings, laundered summaries). Deny-class recall is the gate metric; precision is a UX budget, not a safety one.
- **Canaries:** unique marker strings embedded in every sensitive class; any canary reaching a vendor endpoint is a tripwire. Measured leak rate per 1,000 decisions.
- **Shadow audit — the six-month metric:** every ALLOW is rescored asynchronously by a larger local model under a stricter rubric. **Disagreement rate → must be zero-trending; canary trips → must be zero.** Divergence above threshold auto-trips the kill switch. This catches drift without trusting the online gate to grade its own homework.
- **Red team:** quarterly, adaptive, with the gateway as an oracle (they get deny codes and must paraphrase past them); regression corpus frozen into CI on every gateway update.

## HUMAN IN THE LOOP

- **Blocks train rework; dialogs train clicking.** So the default intervention is a *block with a one-click fix* ("rewrite without this child's details"), not a confirmation. Confirmation dialogs are reserved for the small residual class (unlabelled provenance + non-trivial scores) and should stay under ~10% of requests — above that, they become noise and the override rate is monitored as a fatigue alarm.
- **Preview = diff, not payload:** show what the gateway changed and why (reason codes, highlighted spans), plus the first N risky excerpts for long payloads — never forty pages.

## AUDIT & KILL SWITCH

- Log: decision, reason codes, model scores, payload hash (keyed, daily rotation), pseudonym actions *by token id, never by value*, destination, byte count. **Never the raw or redacted content** — that's the concentrated-store trap, solved by logging structure, not substance. Dispute-resolution needs are met by user-initiated encrypted export, short retention.
- Kill switch: manual toggle + auto-trip (canary fire, shadow-audit divergence, classifier update failure). **Fail closed means no path exists and the failure is loud:** gateway down ⇒ egress rules leave the app no route ⇒ requests fail with an explicit "gateway unavailable — nothing was sent," never a silent hang. Chaos-test this monthly by killing the gateway and attempting a send.

## SLICES

- **S1 (days 1–5):** egress enforcement + templated allowlist of clearly-generic requests. Being honest per the packet: **the smallest genuinely safe version is exactly "block everything except generic templates."** It retires most of the *value* risk (planning, drafting, research) at near-zero leak risk.
- **S2:** ingest-time taint labels in the local store. Retires the provenance-driven leak class wholesale.
- **S3:** deterministic + roster matching. Retires high-density identifier leaks.
- **S4:** classifier ensemble + uncertainty rule + shadow audit + canaries. Retires the fresh-typed-text class, measured.
- **S5:** task-scoped HMAC pseudonyms. Restores usability for name-bearing tasks.
- **S6:** adaptive red-team harness in CI. Ongoing assurance, not new risk retired.

## HOW THIS LEAKS ANYWAY

1. **Misfiled provenance.** T pastes an observation into a fresh "General" note; it carries a clean label, and the weakest gate (text classification) is now the sole defense on the most adversarial surface. Taint inherits human filing discipline, and human filing discipline is the failure.
2. **Cross-payload aggregation.** Two hundred individually non-identifying ALLOWs let a vendor assemble a dossier: conjunctions across requests defeat the per-payload k-test; stylometry, locale, class size ("10–14 two-year-olds") identifies the school, then the children. Per-payload k-anonymity does not compose.
3. **The join event.** One fatigued override, or one support email from T's work address naming a child, links a real identity to a pseudonym history — and item 2's dossier retroactively has names on it.

## DISSENT

1. **"Prove the decision was right" is an unattainable standard and the packet should drop it.** Proof requires bounding the adversary's auxiliary information, which is impossible by construction. Chasing proof yields theatre metrics; substitute *measured FN under adaptive attack*, and say so in the operator-facing docs.
2. **The gateway polices the door while the crown jewel walks out rewritten.** The real concentrated store is the local assistant itself: a prompt-injected local model with tool access can *launder* tainted notes into clean-sounding prose before egress. My pipeline only survives if taint propagates through every local transform — which the gateway cannot see and must be enforced at the store/tool layer. This is the weakest joint in my own design and deserves its own packet.
3. **Deployment realism.** OS-level egress enforcement run by a preschool teacher is fantasy; the honest shippable form is a locked-down appliance or MDM profile installed once by O or a vendor, and anything else quietly collapses "assume the app is untrusted" into "trust the app." Relatedly, "multiple vendors, several providers" multiplies audit surface and join risk for zero marginal value in early slices — start with one vendor on zero-retention API terms and add others only when the shadow-audit metric earns it.
