# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md
**Tokens:** 3928 in / 17694 out (reasoning: 13947) | total 21622
**Wall:** 246.9s

---

# HOSTILE REVIEW — Swan Component Forge v0.2 (RATIFIED)
**Reviewer:** GLM 5.3, SwanStudios panel · **Scope:** technical architecture, Jarvis contract portability, sequencing, absence analysis · **Basis:** plan v0.2 + §8 ratification log + §9 advisory + §10 post-ratification inputs

The governance skeleton here is better than 90% of catalog plans I've killed. That is exactly why the defects below are dangerous: they are structural, they are ratified, and several are scheduled to pass through one-way doors at the cheapest-to-fix moment being already spent.

---

## PART 1 — Architecture

**A1. §1 contradicts itself on focus order.** Layer 1: headless core owns "keyboard/a11y, focus management." Layer 2: "variants can change focus order." Both cannot be true. If a variant changes focus order, focus behavior is variant-owned — i.e., per-site — and every a11y test in the core must be parameterized per variant, at which point "written once, never forked" (§1.1) is false for precisely the layer whose job was preventing forks. The panel needs a ruling: focus order is either core-invariant (enforced) or it isn't.

**A2. The "tokens cannot change DOM structure or focus order" invariant is unenforceable at the CSS layer.** A theme pack is arbitrary CSS values. `flex-direction: row-reverse`, grid placement, `order`, and `direction` reorder visual sequence with zero DOM change — producing WCAG 2.4.3/1.3.2 violations where perceived order diverges from DOM order. The drift-linter (§4) scans hex codes and `var()` fallbacks; nothing scans layout-reordering properties. Two packs can ship identical DOM and different tabbing *experience*, undetected by the matrix.

**A3. The variant layer has no admission governance.** Rule-of-two (§2) gates *components*. Nothing gates *variants*. "Nav (variant: top/side)" is day one; nothing stops `nav-top-swanguard-v3` next quarter. The variant layer is the new fork vector, enjoying catalog legitimacy. Rule-of-two and kill criteria (§4) must be extended to variants or the three-layer split is a laundering scheme.

**A4. The component-override tier hollows out the semantic lock.** §1 locks ~40–60 semantic names, additive-only — then permits per-component overrides. Two failure modes: (a) the contrast audit "on resolved token pairs" now must run over the (pack × override) cross-product, and the resolution order (pack → override → fallback) is unspecified, so the audit gate has no defined algorithm; (b) 40–60 names will not survive multiple future sites (§ context), and the pressure escapes into the unaudited override tier, which becomes the real, untracked semantic schema.

**A5. D2's failure surface is named nowhere.** "SS-PT wraps them without friction" (§1) is an assertion, not a design. Concrete gaps: (i) no class-namespacing decision — shipped "plain CSS files" (§8 D2) will collide with consumer selectors; (ii) no sanctioned override protocol — consumers needing one padding change will fight the cascade with `!important`, which the drift-linter cannot see, which is how forks start; (iii) SSR ordering between bundled CSS files and styled-components' injected styles is build-order-dependent — a FOUC class of bugs; (iv) styled-components' ThemeProvider cannot read CSS custom properties; the pack→vars→SC-theme bridge is per-app glue with no owner.

**A6. The chart adapter violates the plan's own R3.** §3 forbids speculative generalization; §6 Phase 2 defines a charting "adapter interface" with exactly one implementation (Victory). Either the interface is Victory-shaped and consumer #2 suffers, or it's speculative. And the token skin cannot reach canvas-rendered pixels — the adapter must therefore *constrain* implementations to CSS-var-visible rendering. Unstated.

**A7. The test gate has no determinism strategy.** §5.3 screenshot-diffs the full component × pack matrix — including a scroll-bound *video* hero (D6), animated Skeletons, and Toasts. Video frame timing and animation frames are nondeterministic under screenshot diffing. No clock control, animation pausing, or poster-substitution is specified; no browser-engine coverage (Chromium-only infra is the default failure). A flaky gate gets allowlisted to death by the same developers D4 then polices.

---

## PART 2 — Jarvis contract portability (§3 vs §10.1)

**B1. A planned consumer is not a consumer.** §3's own text: "portability is unproven until a second backend implements the contract." §10.1 then upgrades the claim to N=2 because SwanGuard is "definitely the plan." You cannot cite §3's honesty in v0.2 and §10.1's optimism in the same ratified artifact. Worse, the fallacy is already contagious: **D6 passed Hero through rule-of-two using SwanGuard's front page — a site that does not exist.** §2 requires a consumer that "demonstrably needs" the component. If unbuilt sites satisfy rule-of-two, the gate is dead; every future component will claim SwanGuard as consumer #2.

**B2. Receipt semantics assume near-instant resolution.** Fitness: intent → durable side effect → receipt, seconds. News curation: crawl, source-vetting, digest generation — minutes to hours. The minimum surface (§3) has no job-status lifecycle. SwanGuard will bolt polling onto an instant-receipt model, and "receipts as sole success oracle" (F1) degrades into a mixed model.

**B3. Target lifecycle is fitness-shaped.** SS-PT targets (programs, sessions) are stable and editable; news targets expire — retractions, link rot, corpus churn per crawl. The contract has 409 TARGET_MISMATCH re-anchor (F12) and nothing for *target gone* or *target moved beyond re-anchoring*. Re-anchor UX designed for stable targets will thrash on a corpus that mutates hourly.

**B4. Offline replay is wrong for time-sensitive intents.** F4 + Idempotency-Key is correct for "log my set" replayed after a reconnect. It is a bug for "generate my digest now" replayed six hours later — idempotent replay of a time-scoped intent returns stale content as if it were a success. The contract has no intent TTL. §6 Phase 3's fixture suite tests replay-after-failed and replay-after-version-bump but not *replay-after-irrelevant*.

**B5. Proposal transactions (F6) don't scale across domains.** Fitness: few consequential actions, human review, correct. News: thousands of ranking micro-decisions per session. Either every digest becomes a proposal (unusable) or SwanGuard skips proposals — in which case the "same contract" is actually a profile with optional features. The contract has no MUST/OPTIONAL conformance profiles. Without them, "same contract" is a slogan.

**B6. Capability manifest has no versioning or shape negotiation.** SwanGuard needs policy-*scoped* capabilities (per-source rights, jurisdictional limits), not a flat verb list — and the undefined case kills you in production: server adds a capability, old client receives a receipt it cannot render. What's the manifest version field, the unknown-capability default?

**B7. The event schema is the actual contract, and it's unspecified.** "ONE streaming transport" (§3, D5) answers transport, not payload. Coaching prose + structured proposals vs. digests + citations + source-confidence are different event vocabularies. And note the hole in the minimum surface: it enumerates every endpoint *except the stream itself* — no stream endpoint definition, no intent↔stream correlation mechanism, no ordering guarantee between streamed tokens and receipt finalization. Additionally, the non-functional surface is entirely absent: auth scheme, rate limits, error taxonomy, heartbeats, buffering requirements (`Cache-Control`, proxy ceilings). Prism-class conformance mocks do not emulate proxy buffering — CI goes green while production stalls behind a buffering CDN. This is the single most likely "verified ✓, broken in prod" path in the whole plan.

**B8. §9.2's derivation rule locks in the asymmetry.** The contract is transcribed solely from SS-PT's shipped shapes — correct anti-mock reasoning, wrong generality procedure. The SwanGuard-domain red-team (jobs, expiring targets, intent TTL, profiles) must happen *before* contract v1 semver locks, or every divergence becomes v2 churn — and since contract semver ≠ component semver with generated types (§3), every bump regenerates types across all consumers and invalidates the conformance matrix.

**B9. Phase 4 changes four variables in one event.** New theme pole + cross-repo pinned dependency + N=2 contract + new capability domain, integrated simultaneously. When it breaks, attribution is archeology. Slice it.

---

## PART 3 — Sequencing

**C1. Phase 0's GlowButton input is self-contradicting.** §6 Phase 0 audits origin/main only; §10.2 says the two candidate variants live "in the stale wip tree" while asserting the canonical original is on main. Built-new-then-reverted history plus dual tracked variants means classification is ambiguous until someone verifies which main artifact is the revert target. Get this wrong and the taste anchor is wrong from component #1. Also: the original GlowButton is styled-components; "rebuilt on zero-runtime tokens" (§10.2) needs an acceptance proof — pixel-diff the original against the Forge Button under `crystalline-swan`, with the Dual-Button Glow and reduced-motion discipline as named assertions. And the harvest table must capture load-bearing bugs (behavior consumers depend on), or strangler PRs will "fix" behavior users noticed.

**C2. Phase 1 does not "prove the whole pipeline" (§6).** It proves the gallery, the linter, and the skeleton. The single highest-probability technical failure in this plan — D2 interop with a styled-components host (A5) — is untouched until an *unscheduled* strangler PR (§4 names "one component per PR" as a mechanism, not a milestone). The ratified sequence discovers its biggest risk at maximum sunk cost. This is the panel's strongest single objection.

**C3. Drift-linter ships before its governance.** The linter lands in Phase 1; the exception mechanism and CLAUDE.md rule land "at Phase 1 close" (D4). In between, the linter flags the entire legacy app with no exception channel. The predictable organizational reflex is a blanket allowlist, and the linter is dead on arrival.

**C4. Governance arrives before supply.** From Phase 1 close, all new UI must come from Forge or file an exception — but Nav/Auth/Dashboard arrive Phase 2, Jarvis Phase 3+, SwanGuard-fitness Phase 4, and SwanGuard's *own* site build has no scheduled relationship to Phase 4 at all. If SwanGuard starts building UI before the catalog is ready, every screen is an exception, and the rule trains the org to treat exceptions as normal. There is no exception ledger, so nobody will even notice.

**C5. Dual-existence enforcement is unowned and spoofable.** "No dual existence > one sprint" (§4): the 20% sprint cap governs *catalog* work; consumer-side strangler adoption is uncapped and unowned — no name schedules SS-PT's delete-PRs. And the duplicate-filename lint is defeated trivially: `<ForgeButton>` beside legacy `GlowButton` sails past it forever.

**C6. D3's pinned-dependency regime has no delivery mechanism.** SwanGuard pins a SHA inside SS-PT's repo. There is no publish/tag/changelog process described for a subpackage of an app repo (app release tags and package tags will collide unless namespaced), so deprecation windows (§1) are measured in Forge releases SwanGuard never receives. The window passes silently; the eventual pin bump is a surprise breaking change. Also CI blast radius: Forge token changes run SS-PT's full suite, and SS-PT release blockers block Forge fixes SwanGuard needs. "Atomic with the biggest consumer" is the benefit and the failure mode.

**C7. Document defect: §9 dispositions are unrecorded.** §9 states Sean "accepts/rejects each" advisory item; §8 records only the three amendments; §10 adds inputs, not dispositions. Is pack #2 in Phase 1 (§9.1)? Is router enforcement (§9.3) in scope? The build "may begin at Phase 0" (§8) with five advisory items in superposition. If §9.1 was silently rejected, Phase 1 locks the semantic tier against one dark aesthetic — the exact v0.1 error class this revision claims to have fixed.

---

## PART 4 — Absence analysis (top 5 missing, ranked)

1. **Contract non-functional surface** (auth schemes, rate limits/backoff, error taxonomy, SSE operational requirements: heartbeats, no-store/buffering headers, proxy ceilings, reconnect policy). §3's minimum surface is purely functional; this decides whether SwanGuard's infrastructure can speak the contract at all.
2. **Release/delivery pipeline + consumer-version telemetry.** Publish mechanics from inside SS-PT (D3), namespaced tags, changelog, deprecation notices that *reach pinned consumers*, and adoption tracking — without which kill criteria ("zero consumers for two release cycles," §4) are literally unmeasurable.
3. **Exception ledger + contribution path.** D4 creates exceptions with no lifecycle (owner, expiry, review) and consumers have no cheaper path than excepting. In every mature platform, the exception list *is* the shadow catalog; make contributing a variant cheaper than filing an exception, or the ledger becomes one.
4. **i18n/RTL foundation before semantic lock.** Logical properties (`padding-inline` not `padding-left`), string externalization in headless cores, locale-aware formatting in receipts UI. This is a one-way door adjacent to the Phase 1 token lock; "future client sites" makes non-English plausible, and retrofit after lock is a schema break.
5. **Test-integrity program.** Determinism controls for the visual gate (clock, animation pause, video poster substitution), WebKit/Firefox coverage, and a manual assistive-technology audit cadence — automated scans catch a minority of a11y defects, and a flaky or single-engine gate corrodes D4's authority.

---

## VERDICT: **REVISE**

Not REJECT: the decision framework (hard gates, derived contract, rule-of-two, kill criteria, test-matrix-as-gate) is sound and the defects are amendable. Not APPROVE: the ratified state contains live contradictions (A1, B1/D6, C1, C7) and schedules two one-way doors — token-schema lock and contract v1 lock — before the evidence that should precede them.

### Required changes, ranked

1. **Insert a Phase 1.5 wiring gate:** first Forge component live in a real SS-PT production surface, plus the sanctioned consumer-override protocol and class-namespacing decision — before any Phase 2 spend. Proves D2 while it is still cheap to reverse. (Closes A5, C2.)
2. **Harden the contract before v1 locks:** run the SwanGuard-domain red-team against the derived spec (job lifecycle, expiring targets, intent TTL, MUST/OPTIONAL profiles, manifest versioning), define the stream endpoint + correlation + event schema, and add the full non-functional surface. Downgrade §10.1 from "portability upgrade" to "second planned conformance profile." (Closes B1–B8.)
3. **Resolve the §1 focus-order contradiction:** declare focus order core-invariant, assert it per-variant in the gallery matrix, extend rule-of-two and kill criteria to variants, and add CSS-reordering-property detection to the drift-linter. Retroactively re-adjudicate D6's rule-of-two claim against §2's "demonstrably" standard. (Closes A1–A3, B1.)
4. **Close the governance document defects now:** record §9 dispositions in the ratified artifact; define the release mechanism (namespaced tags, changelog, publish from D3 topology), the deprecation-reach channel to pinned consumers, adoption telemetry for kill-criteria measurement, and the exception ledger with owner and expiry. Ship drift-linter and exception mechanism simultaneously. (Closes C3, C6, C7; enables Part 4 #2–3.)
5. **Fund test-gate integrity and de-risk Phase 0:** determinism controls + multi-engine matrix with named flake ownership; add manual AT audit cadence; verify the canonical original GlowButton on origin/main *before* Rule 27 classification, and make pixel-diff-parity with the original (glow + reduced-motion discipline intact) the Forge Button's acceptance test; capture load-bearing bugs in the harvest table. (Closes A7, C1; enables Part 4 #5.)

The plan earns its build. It has not yet earned its locks.

— GLM 5.3, for the panel
