# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Status:** complete (complete)
**Tokens:** 9572 in / 30105 out (reasoning: 25948) | total 39677
**Wall:** 367075ms

---

## 1. Claim vs evidence

`CE-1 | P2 | rows gemini-2.0-flash, gemini-3.8-flash (source[0]/source[1]) | Load-bearing facts (provider retirement; model existence) rest on "owner-supplied" hearsay, violating the header's own convention that every row cites file:line that was read. | A catalog/docs citation in `source`, or downgrade status to OWNER-REPORT-UNCONFIRMED.`

`CE-2 | P2 | row gpt-6-astra, notes | "ADMISSION WINDOW IS 600s AND IS ENFORCED AT IMPORT TIME" is asserted with zero supporting citation — none of AGENTS.md:1174, CLAUDE.md:1106, or the observation note plausibly states it. | Cite the code/doc defining the 600s import deadline or delete the claim.`

`CE-3 | P2 | row claude-fable-5-1 notes | Row says catalog re-query/price re-read "none done" while the review packet states a free catalog query verified presence and pricing on 2026-09-13 — the packet and the artifact cannot both be true. | Reconcile against the session transcript of the metadata query.`

`CE-4 | P2 | schemaVersion:1 / status fields | "VERIFIED" carries two incompatible evidentiary meanings — observed-working (glm-5.3, astra) vs exists-as-literal ("VERIFIED (as literal)", "VERIFIED (as the live default literal)") — with no status vocabulary defined anywhere. | Define a status enum; re-label the literal-only rows CONFIGURED.`

`CE-5 | P2 | invariant cap-before-spend + row openai/gpt-5.6-sol-pro notes | The invariant claims worst-case estimates before spend while the sol seat's own notes document divergent hardcoded prices ($2/$10 vs $2.50/$15), so the "enforced" estimate can understate cost 25–50% and the cap still nominally passes. | Recompute a sol worst-case under both price tables and show the cap threshold crossing.`

`CE-6 | P3 | row zai-coding-cn | A never-exercised route ("no DSH agent preset selects this route") claims a verification method (credential-seam failure codes) that presupposes a run, and leaves endpointFamily as "declared by the installed pi-ai catalog" — unverifiable by the row's own evidence. | Produce one observed MISSING_CREDENTIAL/INVALID_CREDENTIAL event for this provider and the catalog's declared endpoint, or mark NOT ESTABLISHED.`

`CE-7 | P3 | rows minimax-m2.7, hy3, qwen (source arrays) | Sources cited without line numbers ("config/MODEL_VERSIONS.md", "scripts/consult-hy3-design.mjs", "scripts/consult-qwen.mjs") break the stated convention and are masked by the validator's any-colon-digit regex. | Add line numbers or mark the rows unverifiable.`

`CE-8 | P3 | row stealth/ox-alpha notes | "guaranteed invalid-arguments, exit 2" states an unexecuted static inference as observed fact. | Run the wrapper locally with --effort high and no credentials (argv parsing fails pre-socket; no provider call involved); capture the exit code.`

`CE-9 | P3 | invariants preamble + dirty-checkout-read-only | The preamble claims all invariants are "assertions a validator can check," but the dirty-checkout invariant's own enforcedBy admits no repo rule exists and no validator check touches it. | Grep the validator for checkout/dirty — zero hits.`

`CE-10 | P3 | rows glm-5.3 / glm-5.3-flash + openDecision glm-credential-name | The registry records ZAI_API_KEY's location but omits the established fact that it is ABSENT from the harness process env — meaning these seats fail closed when harness-invoked — dropping decision-relevant evidence from the very decision that needs it. | Dump harness child env key NAMES only; record the absence in-row.`

`CE-11 | P3 | throughout YAML | The artifact as presented contains UTF-8 mojibake ("â€”" for "—"), indicating encoding damage at write or in transit; it is unverifiable which bytes are canonical. | Hexdump a damaged line in the committed file.`

## 2. Wrong lane

`WL-1 | P1 | row stealth/ox-alpha | The seat is labeled billingLane openrouter / credential OPENROUTER_API_KEY, but its exec chain (panel 'ox' → consult-ox.mjs → consult-glm.mjs) bills the Z.ai subscription with ZAI_API_KEY — the registry's own glm-5.3-flash row assigns subscription-zai to the same harness — and the row's own rollback ("drop the unsupported flag") would activate a silently mis-billed, mis-accounted seat one step away. | Trace panel-seats.mjs:118-125's exec target; correct lane is subscription-zai (or "none while broken").`

No other lane errors found.

## 3. Missing rows / fabricated rows

`MR-1 | P1 | row deepseek-v4.1-flash ("harness: none", "NO ROUTE") | The row's own citations contradict "no route": the harness store holds a DEEPSEEK_API_KEY ref, scripts/hooks/egress-chokepoint-guard.mjs:71 guards api.deepseek.com (a guard exists only if something egresses there — plausibly the DeepSeek Harness session authoring this file), and the auditor's own serving route has no row: the registry audits every seat except the auditor. | Enumerate the harness session's actual provider/endpoint from DSH runtime config; register it or prove the chokepoint guard is dead code.`

`MR-2 | P2 | billingLanes.subscription-claude | A billing lane ("Claude Max 20x, teacher discount") is defined that zero rows occupy — either the live Claude subscription seat is a missing row or the lane is fabricated coverage. | Grep billingLane: subscription-claude across models → 0; identify the Claude Max consumer.`

`MR-3 | P2 | row x-ai/grok-4.6 notes | The notes acknowledge a live "SuperGrok via Kilo/OpenCode OAuth" subscription route, but it has neither row nor billing lane in a file claiming to record "what is true today." | Add the route and lane, or cite evidence it is inactive.`

`MR-4 | P2 | invariant no-auto-retry (scripts/consult-openrouter-panel.mjs:97-101) | A script that makes retried paid OpenRouter calls is the harness for no registry row, so its default model and spend path are unregistered. | Read its default model/seat list and cross-reference rows.`

`MR-5 | P2 | row id claude-fable-5-1 | The row is keyed to a spelling that its own source says appears in zero scripts and zero config, while the catalog-verified id (per the packet) is anthropic/claude-fable-5.1 — as keyed, the row is unverifiable. | Re-key to the catalog id; note the validator hardcodes the wrong spelling (VB-5).`

`MR-6 | P3 | row gemini-2.0-flash sources | Backend-tier coverage is asserted only for gemini-2.0-flash; whether modelSelector.mjs / aiChatService.mjs route additional models is unrecorded, so "coverage" is unproven rather than established. | Enumerate model ids in backend/services/ai/modelSelector.mjs and diff against rows.`

## 4. Authority

`AU-1 | P1 | rows anthropic/claude-fable-5 (final-decider) + gpt-6-astra (gate-owner, final-astra cadence) | The registry records two simultaneous final authorities — Fable per root policy (AGENTS.md:34, 871), Astra per the cadence/adjudication grant — as compatible facts with no openDecision surfacing the conflict, violating the package's own "conflicts are surfaced, never silently resolved" doctrine. | Add a fable-vs-astra authority decision to openDecisions with a session-independent default (root policy governs until overridden in writing).`

`AU-2 | P2 | row anthropic/claude-fable-5, rollback | The documented rollback is a SWAN_FUSION_JUDGE_MODEL env override on a Final Decider whose identityVerification is "requested-only" — i.e., the package documents a one-env-var path to exactly the "silent replacement of the Final Decider" it elsewhere forbids. | Set the override to another slug and show consult-fable runs it with no served-identity assertion and no guard test.`

`AU-3 | P2 | row gemini-2.5-pro (role vs authority) | Role "lead-design-authority console" and authority "advisory" contradict each other — either the source grants design authority the authority field denies, or the role label overstates. | Quote the granting text at the cited sources and align the fields.`

`AU-4 | P3 | rows glm-5.3 / glm-5.3-flash | If AGENTS.md:1174's GLM→Flash→Astra cadence makes the GLM stage a mandatory passage for every slice, "advisory" understates its procedural gate authority. | Read the cadence text: is the GLM review required before Astra admission?`

## 5. Validator blind spots

`VB-1 | P1 | check 'every row declares all required fields' | Presence-only field check: nothing validates billingLane against the billingLanes block (which could be deleted wholesale) or lane↔endpoint↔credential coherence, so WL-1's wrong lane and any typo'd/undefined lane pass 11/11. | Add lane-existence and triple-coherence checks; the current ox row is the counterexample.`

`VB-2 | P1 | check 'every row cites at least one file:line source' | The validator never opens a cited file — a fabricated or miscited file:line passes all checks, because the regex is satisfied by any colon-digit anywhere in the row body including notes. | Plant a bogus path:line and show 11/11 PASS today.`

`VB-3 | P2 | check 'no provider inference was attempted by this validator' | The flagship import-graph check is itself a single-quoted static-import substring scan: double-quoted specifiers, dynamic import(), and node:http2 / node:dns all fall outside the blocklist, so "no network module may be reachable" proves less than it claims. | Add `import {x} from "node:child_process"` (double quotes) or `await import('node:dns')`; the check still passes.`

`VB-4 | P2 | check 'no credential VALUE is present' | Prefix-allowlist scan plus a shape check confined to credential.reference — an unprefixed raw key (hex/base64, unlisted vendor prefix) in notes/source/rollback passes; the no-secret-in-config invariant claims this validator as enforcer. | Plant a 40-hex-char token in a notes field; 11/11 PASS.`

`VB-5 | P2 | check 'Fable 5.1 is recorded as a non-promoted candidate' | The check hardcodes the misspelled id 'claude-fable-5-1', entrenching MR-5: correcting the row to the catalog id fails the check while the wrong id passes. | Re-key the row per the catalog; run the validator.`

`VB-6 | P2 | no check touches authority | Two co-equal final authorities (AU-1) and free-text authority values pass 11/11 — the shipped file is itself the counterexample to any authority-uniqueness or enum check that doesn't exist. | Add an authority enum + single-final-decider uniqueness check; run against the current file.`

`VB-7 | P2 | all 11 checks | Ten of eleven checks assert the file contains the correct prose ("NO implementing code", "DO NOT PROMOTE", "RETIRED BY PROVIDER", "BLOCKED") rather than that reality matches it — a lying registry with correct vocabulary passes 11/11. | Construct a registry with true vocabulary and false content; observe 11/11 PASS.`

`VB-8 | P3 | checks 'rows parsed' / 'GLM never paired…' | Row-count floor is 15 of 21 (silent deletions pass); duplicate ids and stale schemaVersion pass; the GLM check exempts any body containing the literal "BLOCKED" and only inspects ids matching z-ai/, so a misrouted GLM under a bare id or with "BLOCKED" in a note escapes. | Delete five rows / duplicate an id / add "BLOCKED" to a misrouted bare-id row; all pass.`

`VB-9 | P3 | parser: text.indexOf('\ninvariants:') | A missing invariants section returns -1 and slice(modelsStart, -1) silently truncates the last row's body instead of failing. | Remove the invariants section; the run does not error.`

## 6. Inertness claim

`IN-1 | P2 | registry header (lines 1–8) | "Nothing under $DSH_HOME loads this file" is literally false — provider-registry.check.mjs reads and parses it — and unproven in general (no negative search cited), while the adjacent claim "routing truth lives only in settings.yaml" is false by the registry's own content: ~19 of 21 rows document SS-PT script routing that never touches settings.yaml. | grep -r 'provider-registry' over $DSH_HOME surfaces the loader; read any consult-*.mjs to see settings-independent routing.`

`IN-2 | P3 | package as a whole | The safety story leans on inertness of load, but the package's guidance is actionable (ox rollback, promotion gates, rollback env overrides), so a wrong row causes mis-spend when acted on even while unloaded — inert load ≠ inert effect; WL-1 is the worked example. | Execute the ox-row rollback as written and observe spend on the unrecorded lane.`

## 7. Secret hygiene

`SH-1 | P2 | row gemini-2.5-pro notes | The registry documents that consult-gemini.mjs sends GEMINI_API_KEY as a URL query parameter (?key=) — an active leak channel into logs, proxies, and shell history — but files it as an annotation rather than a defect with a repair ticket, unlike the parallel gemini-2.0-flash finding which was escalated. | Inspect consult-gemini.mjs:452 and any shell/http logs; promote to a repair item.`

`SH-2 | P3 | row zai-coding-cn notes ("len 49") | Publishing the credential's length is key-metadata disclosure beyond the names-only convention and fingerprints the secret in a file designed to be shared — this review packet is proof it travels. | Delete the length; restate as "present".`

`SH-3 | P3 | privacyClass across rows | Uniform privacyClass repo-source-only conflates materially different recipients (Z.ai CN endpoint, OpenRouter relay including the unidentified vendor "stealth", Google direct); only the qwen row differentiates, proving the field can carry risk signal but doesn't where it matters. | Reclassify per recipient/vendor retention; at minimum flag the stealth seat.`

No path by which this package transmits a credential VALUE was found; the exposures above are metadata and documented-but-unremediated transport defects.

## 8. Decision quality

`DQ-1 | P2 | openDecision push-rule | defaultUntilDecided "no push performed by this session" is a fact about the authoring session, not a default — the next session inherits nothing between "no push to main without approval" (AGENTS.md:36) and "always push to deploy" (AGENTS.md:908 + rule 13). | Rewrite as a session-independent rule (e.g., "no push without human approval").`

`DQ-2 | P2 | openDecision deepseek-cap-enforcer | The hold default "claim stands unimplemented and is marked as such" preserves an advertised $5/month cap that does not exist — a false safety control inviting reliance; the conservative default is "cap is not real; lane stays dark." | Flip the default or implement the gate in spend-guard-gate.mjs before any route exists.`

`DQ-3 | P2 | openDecisions (absence) | The highest-stakes conflict in the package — Fable final-decider vs Astra gate-owner (AU-1) — has no open decision while lesser conflicts (sc-v3, push-rule) do; none of the seven carries a review-by date or escalation, so "open" can mean "indefinitely stalled." | Add the authority decision; add deadlines/escalation to all seven.`

`DQ-4 | P3 | openDecision fable-5-1-promotion | The decision names 'anthropic/claude-fable-5.1' while the governed row is keyed 'claude-fable-5-1' and the validator hardcodes the latter — identifier drift means the decision may not bind the artifact it governs. | Normalize one id across row, decision, and validator.`

`DQ-5 | P3 | openDecision sc-v3-carveout | "Both statements stand" leaves two contradictory cadence directives simultaneously executable, while the analogous push-rule conflict was treated as needing an active hold — incoherent default doctrine across the two conflict decisions. | Pick one doctrine for standing contradictions and apply it to both.`

The seven decisions are genuinely open and owned; the defects are the defaults (DQ-1, DQ-2), the missing eighth (DQ-3), and identifier binding (DQ-4).

## Packet claims contradicted

- **"asserts on its own IMPORT GRAPH rather than substrings" — false as stated.** One check of eleven asserts on the import graph; ten are substring/prose checks. And the import-graph check is itself a single-quoted static-import substring scan with the bypasses in VB-3.
- **"Nothing loads it" / "Routing truth lives only in settings.yaml" — both false as absolutes.** The validator loads the file (IN-1), and the registry's own rows document routing truth distributed across SS-PT scripts, panel-seats.mjs, and env overrides.
- **"anthropic/claude-fable-5.1 was verified present in the live OpenRouter catalog … by a free metadata query" vs the row's "catalog id re-query, price re-read … none done."** These are mutually exclusive; one of the two artifacts misreports the evidence trail (CE-3). Given the row also omits the pricing the packet says was learned, the registry is the more likely liar — but the packet's claim is unverifiable from the artifacts supplied.

**Tally: 33 findings — 0×P0, 5×P1 (WL-1, MR-1, AU-1, VB-1, VB-2), 14×P2, 14×P3.**
