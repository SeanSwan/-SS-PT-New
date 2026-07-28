# Swan Element Intelligence and Recommendation Loop

- **Date:** 2026-07-19
- **Status:** CANONICAL protocol; recommendation outputs remain non-canonical
- **Purpose:** teach the Design Brain what Swan already has, what is missing or fragmented, and which external ideas deserve Sean's attention.

## 1. Outcome

The loop does not ask, "Did Mobbin show an attractive screen?" It asks:

> Compared with the current mounted Swan experience, does this inspected pattern improve a real workout-progress job enough to use now, trial, watch, or reject?

The system preserves concise decision rationale, evidence, confidence, and known limitations. It does not store private agent chain-of-thought, raw Mobbin content, or invented runtime claims.

## 2. Three-source truth model

| Evidence | Proves | Does not prove |
|---|---|---|
| Live crawler | Public HTTP behavior, crawlability, metadata, public page structure | Authenticated SPA contents or an element's absence |
| Rendered browser | What a user can actually see and operate at a route and viewport | Backend or unvisited role behavior |
| Refreshed source | Canonical mounts, feature flags, routes, shared components, dormant code | That a flag is enabled in production or a user can complete the flow |

Absence from one source becomes `unknown`, never automatically `missing`. `missing` requires the applicable evidence sources or an explicit limitation receipt.

## 3. Baseline statuses

- `mounted`: proven mounted in the canonical source route or rendered browser.
- `shared_capability`: usable elsewhere, but not proven in the target flow.
- `fragmented`: value exists, but the user must cross surfaces or a dark feature flag prevents a complete loop.
- `experimental`: design lab or prototype, not production capability.
- `unmounted`: source component exists without a verified production import or JSX mount.
- `doctrine_only`: preference or documented direction, not a shipped component.
- `missing`: applicable source and rendered checks found no equivalent.
- `unknown`: evidence is insufficient.

The executable snapshot is `scripts/ai-workflow/mobbin-learning/swan-element-baseline.json`. Refresh it from the real release ref, not a stale shared checkout.

## 4. Continuous governed loop

1. **Release truth:** fetch `origin/main` read-only; record SHA, checkout drift, and production evidence.
2. **Public crawl:** run a low-concurrency SquirrelScan quick or surface audit. Never publish by default.
3. **Canonical route map:** prove route definition, mounted JSX, feature flags, and relevant service/API seams.
4. **Rendered audit:** inspect target mobile and desktop routes when auth is available. Record viewport and role without PII.
5. **Baseline refresh:** classify each capability using the statuses above.
6. **Gap question:** choose one narrow workflow gap. Broad "fitness UI" searches are prohibited.
7. **Mobbin acquisition:** obey `control.json` caps, concurrency one, inspection, K1-K5 dedupe, and `evidence/2`.
8. **Compare:** map each candidate to exactly one baseline capability and measure novelty, usability, Swan fit, Sean taste fit, strategic fit, cost, and risk.
9. **Notify:** run the evaluator and present `USE_NOW`, `TRIAL`, `WATCH`, and `REJECT` with concise reasons.
10. **Human gate:** Sean chooses whether to implement, prototype, retain, or discard. A label is not authorization.
11. **Counter-search:** challenge high-impact ideas with contrary patterns before canon promotion.
12. **Replan:** select the highest-value unresolved gap and repeat while budgets, auth, and connector health remain safe.

## 5. Notification meanings

| Label | Meaning | Required next action |
|---|---|---|
| `USE_NOW` | Strong evidence and a real Swan gap or integration opportunity | Ask Sean for implementation approval |
| `TRIAL` | Promising, but needs browser proof, a bounded prototype, or token decision | Define a reversible trial |
| `WATCH` | Interesting but duplicative, costly, or uncertain | Retain distilled evidence only |
| `REJECT` | Canon conflict, raw clone, fake data, inaccessible UX, or low-value duplicate | Do not retain as a recommendation |

Flags refine the label:

- `DUPLICATE`: Swan already has the capability.
- `CANON_CONFLICT`: violates Swan doctrine or data truth.
- `NEEDS_BROWSER_PROOF`: source/crawler evidence is not enough.
- `NEEDS_BASELINE_PROOF`: Swan capability absence has not been established.
- `TOKEN_PROPOSAL`: visual direction requires an explicit canon decision.
- `EVIDENCE_LIMITED`: not enough evidence for `USE_NOW`.

## 6. Sean taste profile

- Black + white + yellow/gold maps to Obsidian Black, Frost White, and Gilded Fern.
- Black + white + blue maps to Obsidian Black, Frost White, Ice Wing, and Midnight Sapphire.
- Black + white + green is a valid preference signal, but the client palette has no approved green token.
- Cyberforest green belongs to Sean-only operator surfaces and cannot be copied into client UI.
- A green candidate is therefore `TOKEN_PROPOSAL`, normally capped at `TRIAL`, until Sean approves a client token and the source-of-truth docs are updated.

Taste fit can raise or lower priority. It cannot override accessibility, product truth, or Swan canon.

## 7. Current first-pass recommendation

The 2026-07-19 comparison produced:

- `USE_NOW`: integrate the already-built post-save handoff around **Proof -> Meaning -> One Next Move**. It exists on `origin/main` but defaults dark behind server and client flags.
- `USE_NOW`: prefer mounting Swan's existing real-data `PostWorkoutCelebration` over inventing another generic success modal.
- `TRIAL`: readiness explanation with confidence and data freshness; needs rendered authenticated proof.
- `TRIAL`: client soreness/difficulty feedback -> coach interpretation -> human override; currently fragmented.
- `TRIAL`: black/white/green recovery state, explicitly as a client token proposal.
- `REJECT`: generic workout-saved modal; it duplicates Swan proof without improving the workflow.

Machine output: `C:/tmp/swan-element-intelligence-20260719/recommendations.json`.

## 8. Stop and safety rules

Stop acquisition before a published Mobbin cap or observed throttle, not after an error. Also stop on auth failure, repeated latency growth, connector warnings, unknown identity, denied fields, missing inspection, duplicate collision, or kill switch.

The loop may continue research automatically only inside the approved budget. It may never:

- scrape or bulk-export Mobbin;
- store raw screenshots or proprietary copy as brain canon;
- weaken validation to increase volume;
- mutate product code, design canon, or external systems without the applicable human gate;
- equate crawler invisibility with product absence;
- run indefinitely without a bounded run receipt and cumulative budget count.

## 9. Verification commands

```powershell
node --test scripts/ai-workflow/mobbin-learning/evidence-gate.test.mjs
node --test scripts/ai-workflow/mobbin-learning/element-recommendation.test.mjs
node scripts/ai-workflow/mobbin-learning/element-recommendation.mjs `
  --candidates=C:\tmp\swan-element-intelligence-20260719\candidates.json `
  --baseline=scripts\ai-workflow\mobbin-learning\swan-element-baseline.json `
  --policy=scripts\ai-workflow\mobbin-learning\recommendation-policy.json `
  --output=C:\tmp\swan-element-intelligence-20260719\recommendations.json
```
