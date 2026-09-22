# Swan Media API — 2026-09-18

**Read this file first.** It is the index for the packet, the adjudication, the code that came
out of them, and — most importantly — the honest line between what is proven and what is not.

| File | What it is |
|---|---|
| `PACKET.md` | The consult packet sent to Astra. Remit, verified baseline, the gap, decisions D-A…D-H, constraints. |
| `ASTRA-PRO-REPLY.md` | The adjudication. Live, 30,173 prompt / 15,656 completion tokens, `finish_reason: stop` — not truncated. |
| `README.md` | This file. Verdict, decision summary, readiness receipt, open work. |

---

## What was asked

Sean's request, in one sentence: *make the MiniMax H3 / ComfyUI setup I already have behave like my own
callable API, and add Higgsfield's API model to it — get it as close as we can, then hand it over so I
can take over.*

Three decisions he made up front, and they shaped everything below:

- **Target** — a new worktree off `main`, not the engine branch.
- **Astra** — run it live on OpenRouter, not offline.
- **Surface** — a REST gateway: submit a generation, poll status, fetch the artifact.

---

## Verdict: **PLAN REVISED**

Astra did not approve the plan and did not reject it. It rewrote three load-bearing parts, and all
three had already been built before the review ran — which is the entire argument for running the
review live rather than offline.

> Adopt a **neutral, asynchronous quote → job → asset API**, with provider-specific execution,
> duration, pricing, licence and cancellation facts kept visible. Do not make "local GPU execution"
> and "hosted billable generation" interchangeable merely because both produce video.
>
> **Money is bounded by server-owned caller allowances, atomic reservations before submission, and
> explicit approval of a priced route — not by an agent's willingness to supply a spending limit.**

### The three things that were already built and were rejected

| Built | Astra's ruling | What changed |
|---|---|---|
| A **Higgsfield-shaped** public API (`POST /v1/generations` → `{request_id, status_url, cancel_url}`) | *"Do not make 'local GPU execution' and 'hosted billable generation' interchangeable merely because both produce video."* | Rewrote to `POST /v1/quotes` (prices, spends nothing) → `POST /v1/jobs` (requires the quote, a `max_cost_usd` ceiling, and an `Idempotency-Key`). Submission and payment are no longer the same act. |
| `commercialUse: 'permitted'` on the hosted rows | *"The packet's description of hosted H3 as 'permitted' is NOT sufficient hosted licence evidence."* | The rows carry `evidence: 'unretrieved'` / `commercialUse: 'unverified'`, and `registry.resolve()` **refuses** any commercial request against a row in that state. The previous value let a hosted call proceed on the strength of an assumption. |
| **Float** money arithmetic (`toFixed(4)`) | *"Use fixed-point decimal/integer arithmetic, never binary floating-point money arithmetic."* | Rewrote `costEstimate.mjs` around integer micro-dollars. `0.1 + 0.2 !== 0.3` in binary floating point, and a ledger that accumulates that error drifts in the direction that admits a run the ceiling should have refused. |

The third one is the one that would have been invisible. It looked correct, it produced `0.78`, and it
was wrong at exactly the boundary where being wrong costs money.

---

## What exists now

### Provider layer — `shared/providers/video/`

> **Counts re-derived 2026-09-22, and the drift was larger than the review found.**
> Astra round 4 (L-04) reported the 300-line cap breached by five modules and the table stale in
> four rows. A full sweep of all 28 counted rows against the filesystem found **nine** stale, every
> one of them **understated** — the same direction the lane's count-drift always runs, because the
> table is written at the time a module is created and never re-read after rounds add to it.
>
> | module | was | now |
> |---|---|---|
> | `catalogueHosted.mjs` | 183 | **412** |
> | `specShape.mjs` | 257 | **370** |
> | `registry.mjs` | 283 | **350** |
> | `costEstimate.mjs` | 248 | **311** |
> | `higgsfield.mjs` | 222 | **259** |
> | `comfyuiHistory.mjs` | 147 | **206** |
> | `preflight.mjs` | 171 | **183** |
> | `comfyuiLocal.mjs` | 283 | **291** |
> | `wire.mjs` | 181 | **188** |
>
> Two of these — `preflight.mjs` and `wire.mjs` — were **not** in the round-4 finding, which is the
> argument for the sweep rather than the four-row fix: a partial correction leaves the same defect
> class with a smaller footprint and a document that now looks audited.
>
> **These numbers are still a prose claim.** Binding them to a check is what would make them a
> receipt, and that check does not exist yet — see `media-api/EXECUTION-MANIFEST.txt` for the
> generated pattern this table should eventually adopt.

| File | Role | Lines |
|---|---|---|
| `catalogue.mjs` | **DATA.** Local rows whose behaviour was measured on hardware we own. Validates every row at import. Round 16 gave every row a real `modelVersion` — the WEIGHTS, not the provider. | 208 |
| `catalogueHosted.mjs` | **DATA.** Hosted rows whose behaviour is a vendor's published claim. Round 16 derives each row's `modelVersion` from the same rate-card entry that names the model. | 412 |
| `provenanceTags.mjs` | `probed` / `published` / `claimed`, extracted to break an import cycle. | 25 |
| `provenance.mjs` | **The durable record promised to the licensor.** Freezes the licence as it stood at generation time and welds the policy flags to the asset. **Round 16** stopped it filling an EVIDENCE field with a fallback: `modelVersion` no longer falls back to the provider id, a non-array exclusion list is recorded as `null` rather than spread into characters, and a boolean the caller never supplied is recorded as unknown instead of `false`. Round 17 moved `PROVENANCE_SCHEMA` to **2** — a field whose domain widens to `null` is a parse change — and made `auditProvenance` refuse a record whose model version repeats its provider. | 275 |
| `specShape.mjs` | **The shape contract.** `assertSpecShape`, extracted from `catalogue.mjs` for rule 4. Round 14 added the LICENCE block: a row whose licence is a bare string, or whose `commercialUse` is outside the vocabulary, is now rejected at import rather than read as a permission at request time. Round 16 added `modelVersion` (a non-blank string that may not equal the provider id) and required `licence.requiresAttribution` to be a boolean, because both are copied into the provenance record. Round 17 made the id comparison **normalised**, so a padded or differently-cased id is rejected too. | 370 |
| `registry.mjs` | **BEHAVIOUR.** `resolve()`, `validateVideoRequest()`, the licence evidence gate. Round 16 exposes `modelVersion` through `capabilities()` — its absence was why every record fell back to the provider id. | 350 |
| `licenceTerms.mjs` | **The CLOSED licence vocabulary, as DATA.** `COMMERCIAL_USE` (four positions), `evidenceUnretrieved()`, `exclusionList()`. Shared by the validator and the judgement so the two cannot disagree about which values exist — the same move `provenanceTags.mjs` makes for provenance, for the same reason. | 146 |
| `licenceGate.mjs` | **The licence JUDGEMENT**, extracted from `registry.mjs` for rule 4. Returns a refusal; `territories()` decides who names the jurisdiction. Round 14 made it fail **closed** on anything it does not recognise, including a missing position; round 15 made `commercial` itself a strict boolean. | 201 |
| `normalizeResponse.mjs` | Vendor response-envelope flattening, extracted from `registry.mjs` for rule 4. | 50 |
| `promptPolicy.mjs` | **The content guardrail, and a named commitment.** The 2026-08-16 request promised *"a policy filter runs on every prompt before submission; no depiction of identifiable real people without consent, no minors, no deceptive or impersonating content."* Round 5 fixed a false-positive guard that was tested against the WHOLE prompt, so a place name suppressed the person-name flag for every name in it. **Round 18 found it had no row in this table** — the same omission as `provenance.mjs` in round 16, which is why section G of round 18's probe now asserts that every module in the lane has one. | 260 |
| `costEstimate.mjs` | Rate × duration → cost, in integer micro-dollars. | 311 |
| `spendGuard.mjs` | **The GLOBAL ceiling.** Volume + spend caps, fail-closed. Refuses a ledger count it cannot trust. Takes an OPTIONAL caller scope as its fourth parameter. | 188 |
| `usageLedger.mjs` | **Persistence**, split out of `spendGuard.mjs` for rule 4. The day-scoped usage ledger, now with an additive per-caller split. **Round 21** attacked its WRITE half, which twenty rounds had left alone, and found it undoing everything the read half refuses: `record()` wrote over a file it could not parse (clearing `degraded` and re-enabling billing after one free run), the 30-day trim silently discarded the day being recorded, and a write that failed threw from `generateVideo.mjs` after the render had already succeeded. `dayRecordIsTrustworthy` is now the one predicate both halves call, and a write that does not land degrades the ledger rather than failing the job. | 268 |
| `ceilingGate.mjs` | **The per-JOB judgement.** `jobRefusal()` applies the caller's `max_cost_usd` to the CHARGE. Returns refusals, never throws. Round 13 split the per-caller half out for rule 4 and re-exports it, so no import path changed. | 124 |
| `callerCeiling.mjs` | **The per-CALLER judgement**, split out of `ceilingGate.mjs` in round 13 when the combined file reached 347 lines. `callerRefusal()`, `callerLimits()`, `callerScope()`. | 263 |
| `comfyuiLocal.mjs` | **The local adapter — the first thing to run on the render box.** `capabilities()`, `generate()`, `verify()`. **Round 18** found `verify()` reporting `ok: true` for three configurations in which every run fails — a template that is not JSON, a GUI-format export ComfyUI answers with a 400, and a prompt binding naming a node the graph does not contain — because its template check was `existsSync` and it never read the graph. It now loads the graph and inspects the bindings, so the answer is about USABILITY rather than presence. **Round 19** took the completion decision out of its poll loop: `entry?.status?.completed || entry?.outputs` could not tell a failed run from a finished one, because ComfyUI reports both as `{}`. It now asks `comfyuiHistory.mjs`, and raises `E_GRAPH_FAILED` carrying the node and its own exception. Its `E_NO_OUTPUT` branch is the same message it always was — but it is now reached only when the graph genuinely finished, which is what makes that message true. | 291 |
| `comfyuiGraph.mjs` | **The GRAPH: loading a ComfyUI workflow and injecting one request into it**, split out of `comfyuiLocal.mjs` for rule 4. **Round 18** turned three prototype-chain lookups into own-property tests and gave `loadGraph` a shape check: a slot named after an `Object.prototype` member threw a `TypeError` where a refusal belonged, `'constructor' in node.inputs` was TRUE on every node — so the DETECTION-NEVER-CREATION guard would have "detected" an input that does not exist and written the prompt to a key ComfyUI ignores — and a node id such as `constructor` resolved to a function the code then wrote to, creating `Object.inputs` on the global `Object`. | 241 |
| `comfyuiHistory.mjs` | **What a ComfyUI history entry MEANS**, split out of `comfyuiLocal.mjs` for rule 4 — the same seam that produced `comfyuiGraph.mjs`, one direction over: that file is about the document we SEND, this one about the document we READ BACK. **Round 19** replaced a truthiness test that could not answer the question it was asked. `entry?.outputs` is truthy for `{}`, and `{}` is what ComfyUI reports BOTH for a graph that raised and for one that has not produced anything yet — so `terminalState()` decides FAILURE before COMPLETION, and reads `status_str`, the only field that separates the two. It also reads the node's own exception out of `status.messages`, which nothing had ever opened. It returns a descriptor rather than throwing, so the adapter owns the error code. | 206 |
| `higgsfield.mjs` | The hosted adapter: `verify()` and `generate()`. **Round 20** — the first hostile round to reach this file — found `verify()` calling the credential **accepted** for a 500, a 429 and a 302, because it treated every status that was not 401/403 as proof. It now separates a DECISION the API made (2xx, or a non-auth 4xx) from the vendor failing, rate-limiting or redirecting before any decision, and will not call the latter a yes. It also refuses an artifact URL that is not https, because that URL comes out of the vendor's response body and was previously fetched unvalidated. | 259 |
| `higgsfieldTransport.mjs` | Credentials, auth header, submit/poll/cancel, status vocabulary. **Round 20** added the three checks this file was missing: `insecureBaseUrl()` refuses to send a credential to a non-https base URL (measured pre-fix: `Authorization: Key <id>:<secret>` went out in cleartext), `poll()` refuses immediately on a 401/403 instead of spinning for fifteen minutes and then claiming the request "may still be running and billing", and `describePollTimeout()` reports what was actually observed — how many polls completed and how many were refused. | 286 |

### The gateway — `media-api/`

| File | Role | Lines |
|---|---|---|
| `server.mjs` | Routing, the detached runner, the fail-closed bind. The runner's catch cannot itself reject. | 288 |
| `http.mjs` | HTTP primitives: constant-time compare, bearer check, capped body read, envelope. **Round 22** — the first hostile round to reach this file — found the bearer check THROWING when `req.headers` was absent (so a request it could not read became a 500 rather than a 401), `readBody()` resolving `null` and every other non-object JSON as success (a body of `null` reaches a route and surfaces as a 500 where it is a 400), `send()` letting `extraHeaders` replace the `content-type` and `content-length` it exists to impose, and `safeEqual()` reporting two ABSENT values as equal. | 156 |
| `router.mjs` | The route table, extracted from `server.mjs` as a pure `(method, path)` function. | 38 |
| `routes.mjs` | The **executing** surface: quotes, jobs, cancel, assets. Ownership before expiry. | 281 |
| `routesCatalog.mjs` | The **read-only** surface: models, wallet, estimate. Round 15 made the published `evidence` field the gate's own reading rather than a `??` default; round 16 publishes `model_version` beside the provider id, because the id cannot answer which weights a row serves. | 172 |
| `preflight.mjs` | The gate order, run before anything is created. | 183 |
| `store.mjs` | Atomic JSON job + quote stores. | 221 |
| `wire.mjs` | Error envelope, status mapping, public job projection. **Round 18** gave the **eighteen adapter refusal codes** a status — they had none, and fell through to the fallback 400 — after round 7's coverage sweep was found to have omitted all four adapter modules from its list. The code says WHICH LAYER refused: 500 our provisioning, 502 the provider, 504 a timeout, 422 a content refusal. `retryable` is a separate, named field, so "which layer" and "should I retry" are not the same axis. **Round 19** added a nineteenth: `E_GRAPH_FAILED` → 502, for a graph ComfyUI EXECUTED and a node that raised. The boundary with `E_SUBMIT_REJECTED` (500) is the point — a 4xx submit is a graph refused before it ran, which is ours; this is the provider running it and the run blowing up. **Round 20** added the hosted lane's three: `E_POLL_REJECTED` and `E_INSECURE_BASE_URL` are 500 (our provisioning — a key the vendor rejects, a base URL that would carry that key in cleartext), and `E_BAD_ARTIFACT_URL` is 502 (the provider reported completion and handed back a URL this process will not fetch). | 188 |

### Verification artifacts — `media-api/`

| File | What it proves |
|---|---|
| `media-api.test.mjs` | 48 unit tests, `node --test`, zero dependencies. |
| `demo-http-flow.mjs` | The authenticated flow over a **real socket**. 44 checks. |
| `hostile-http-probe.mjs` | Round 1. The adversarial half. 24 checks. |
| `hostile-round2-probe.mjs` | Round 2. HTTP primitives, auth, idempotency, ceiling types. 26 checks. |
| `hostile-round3-probe.mjs` | Round 3. Money rounding, store pruning, estimate/quote agreement. 23 checks. |
| `hostile-round4-probe.mjs` | Round 4. Undeterminable cost, ledger asymmetry, exact enablement. 27 checks. |
| `hostile-round5-probe.mjs` | Round 5. Prompt policy, claimed-value evasions, code coverage sweep. 24 checks. |
| `hostile-round6-probe.mjs` | Round 6. The catalogue/registry shape contract and what the ceilings enforce. 71 checks. |
| `hostile-round7-probe.mjs` | Round 7. Extraction identity, money PROPERTIES, the route table, code coverage. **Round 18 widened its `GATEWAY` list, which had omitted all four adapter modules** — the files that raise the most refusal codes — so the sweep was green about the modules it listed and silent about the ones that would have failed it. 51 checks. |
| `hostile-round8-probe.mjs` | Round 8. The dry pass: principal, the body-cap boundary, the quote store, gate order. 42 checks. |
| `hostile-round9-probe.mjs` | Round 9. The ledger READ BACK, quote ownership in every state, store invariants, the route table, the auth primitive. 49 checks. |
| `hostile-round10-probe.mjs` | Round 10. The runner: the cancellation window measured, terminal-state guarantees, a failing store write, idempotency, the artifact path. 27 checks. |
| `hostile-round11-probe.mjs` | Round 11. The licence and enablement layer: who names the territory, the parsers, the evidence gate. 39 checks. |
| `hostile-round12-probe.mjs` | Round 12. The three ceilings **driven rather than read**: the per-job ceiling through `runGenerate`, the per-caller ceiling on the free and billed lanes, and the ledger's per-caller split. 35 checks. |
| `hostile-round13-probe.mjs` | Round 13. The round-12 code attacked **as new code**: whether the ceilings refuse things they should not, money compared in micro-dollars rather than binary floats, prototype-named callers, and a cap that overflows to `Infinity`. 30 checks. |
| `hostile-round14-probe.mjs` | Round 14. The licence gate attacked where it fails **OPEN**: an unrecognised `commercialUse`, an evidence flag matched by exact string, a licence that is not an object, a territory list read with `.includes()`, and the one assertion that the vocabulary has a single definition. 52 checks. |
| `hostile-round15-probe.mjs` | Round 15. The **round-14 code attacked as new code**: whether an ambiguous `commercial` value disables the gate, whether the wire and the gate read `evidence` the same way, whether the validator's evidence-vs-position asymmetry is deliberate, and whether all three new codes are reachable and classified. 40 checks. |
| `hostile-round16-probe.mjs` | Round 16. The **provenance record**, where a wrong field is worse than a crash: whether `modelVersion` identifies the weights or repeats the provider, whether the licence snapshot corrupts what it copies, and whether a boolean the caller never supplied is recorded as a negative. 29 checks. |
| `hostile-round17-probe.mjs` | Round 17. **Round 16's own code attacked as new code**: whether "not the provider id" is defeated by padding or case, whether the AUDIT checks the property the validator guarantees, whether a widened value domain moved the version number, and whether the adapter branch the record prefers is reachable at all. 29 checks. |
| `hostile-round18-probe.mjs` | Round 18. **The GPU-facing surface, attacked for the first time**: whether `verify()` answers about a configuration that can actually run, three prototype-chain lookups in the graph helper, a `loadGraph` that checked JSON syntax but never JSON shape, and the coverage sweep whose module list was blind to the files that raise the most codes. **Round 21 added G5** — the re-verification block's file count, which round 21 had to correct by hand because G2 covers only the closing block — so it now carries 67 checks. **Round 23** emptied its `NOT_LANE_OWNED` exemption map and added a redundant-exemption control — a module that is both exempted and documented now fails — so the check that this round's new file tripped on its first run is the one that also closed the gap that let `completion.mjs` hide behind it. |
| `hostile-round19-probe.mjs` | Round 19. **What a failed GPU run is reported as**: whether a graph that RAISED is distinguishable from one that finished with nothing (both are `outputs: {}`), whether `completed: true` alongside an execution error is read as success, whether a still-EXECUTING job is read as a finished one, and whether `E_TIMEOUT` asserts a cause it never observed. It also carries the round's own two vacuous checks as defect rows, because a probe that passes on the pre-fix tree is a defect like any other. 24 checks. |
| `hostile-round20-probe.mjs` | Round 20. **The hosted adapter, attacked for the first time**: whether `verify()` calls a credential accepted on the strength of the vendor failing, whether a rejected credential becomes a fifteen-minute timeout that asserts billing, whether the credential's destination is checked for https, and whether the artifact URL out of the response body is validated before this process fetches it. It also measures that the credential *leaves the process* by recording every request the stub receives. 32 checks. |
| `hostile-round21-probe.mjs` | Round 21. **The usage ledger's WRITE path**: whether `record()` overwrites a ledger it could not read, whether the 30-day trim can discard the day it just counted, and whether a write that fails becomes a failed render. Every check drives the real `makeFileLedger` through an injected `fs`, and the money consequences through the real `checkRunAllowed` and `assertRunAllowed`. Carries four mutation controls, one per defect, each of which re-introduces its defect into a copy of the module and requires the round's own assertion to fail there. 41 checks. |
| `hostile-round22-probe.mjs` | Round 22. **The HTTP primitives, attacked for the first time**: whether `authorized()` refuses or throws when it cannot read the request, whether `readBody()` accepts JSON the routes cannot dereference (a body of `null` reached a route and became a 500), whether `send()` can have its own envelope overridden by the caller it exists to constrain, and whether `safeEqual()` calls two absent values equal. Carries four mutation controls, one per defect. 31 checks. |
| `hostile-round23-probe.mjs` | Round 23. **The queue-completion projection, attacked for the first time** — the one module the file-table assertion exempted by name. Whether `mimeForFilename` can return a non-string through `Object.prototype` (it could: `.constructor` gave the `Object` constructor, and `JSON.stringify` then dropped the key, so the queue stored a completion with no mime), whether `completionBody`'s `\|\|` guarantees a string (it is an absence test), and whether `completionSummary` still prints the string its own header calls "worse than silence". Also asserts the ledger's own stated totals are self-consistent, which is how round 23's two stale counts were found. Carries three mutation controls, one per defect. **Round 24 corrected this row's count from 43 to 49** — the receipt said 49 all along, and nothing compared the two. **Round 26 added E1b**, which closes a SILENT SKIP this round had left in place: a gate-count phrase written in a word the check's own map did not carry was skipped rather than flagged, so E1 stayed green reading a count from a DIFFERENT sentence while the sentence it should have read said something else. Round 26 hit it directly by writing "thirty-two" against a map that stopped at "thirty-one". The map is extended and the skip is now a failure. **Round 27 made the detector TOTAL** — Astra's F5 showed the round-26 closure was ITSELF scoped: the family filter read `/^(twenty|thirty)(-[a-z]+)*$/i`, so a count written as "forty" was neither read nor flagged, which is the same silent-skip class one family over. The map now covers every tens family by construction and the predicate is INVERTED, so any token it cannot read is flagged unless it is on an explicit allowlist carrying a reason; E1c runs the scan over a synthetic unreadable phrase and requires it to be flagged. Measured: with the old filter restored, E1b still PASSES and E1c FAILS — which is why E1b alone was never evidence of anything. 51 checks. |
| `hostile-round24-probe.mjs` | Round 24. **The document's own module count, and the file table's CONVERSE.** Whether the count this document states matches the count the filesystem has — it did not: the sentence said 53 against 59, and gate 25 derived the right number, printed it, and never compared it to the prose. Whether every module ROW names a module that exists, which is the direction gate 25 cannot see by construction. Whether every gate in the receipt contributes a countable number, which one did not: `smoke-adapters.mjs` printed no count, so all 15 of its assertions were missing from a headline total that nevertheless counted its gate. And whether each probe's stated check count matches its own receipt line, which one did not. Reads gate 25's source for its directory list rather than trusting a comment, and reads the assertion total in every form the document writes it. **C4 was added after the probe's own C2 turned out to be a partial mutation** — nothing here had asserted that A2 is total over more than one statement of the count. 13 checks. |
| `hostile-round25-probe.mjs` | Round 25. **Which graph failures are worth another full GPU render?** `E_GRAPH_FAILED` is a **MIXED** code — its canonical instance in this lane is `CUDA out of memory`, a fact about the *moment* — so it cannot be classified by code at all, and adding it to `PERMANENT_CODES` would make OOM permanent and throw away jobs that would have succeeded. The adapter therefore marks permanence per **INSTANCE**, from the node's own exception. `E_NO_OUTPUT` is NOT mixed — it is reached only after the graph finished — so it does join the set. Defaults to RETRYABLE, because a wrong guess costs GPU time while the inverse costs a job. Reads the closed type list and the transient markers out of the module's **own source** and takes the full cross-product, so a type or marker added later is covered. 22 checks. |
| `hostile-round26-probe.mjs` | Round 26. **The catalogue DATA, adjudicated by an external consult.** Rounds 11–25 assumed the data was trustworthy; Astra's 2026-09-20 adjudication attacked that assumption, and this is a different class of defect — data that **reads as an answer while the question is open**. Four findings. **D1:** the `seedance-2.5` rate could not be reproduced, so `costPerSecondUsd.value` is `null` with `pricingStatus: 'disputed'`, the original figure is KEPT as an unreconciled historical observation with channel/configuration/date/conditions, and the probe asserts no mean, min or max was substituted. **D2:** `excludedTerritories: []` and `requiresAttribution: false` were readable as "worldwide" and "no attribution required" while those facts were unretrieved — both now carry an explicit evidence status, `requiresAttribution` is fail-closed `true`, and two new `specShape` rules make the coupling mechanical at IMPORT rather than advisory. **D3:** "non-default, paid" existed only as a side effect of an unrelated `costPerRunUsd: null`, so hosted rows now declare `selectionPolicy: 'explicit-paid-only'` and `resolve()` refuses them unless the caller asserts an explicit selection — asserted to bind regardless of the `commercial` flag, because a hosted render costs money either way. **D4:** the four cost quantities (provider charge estimate, maximum liability, actual billed charge, local operating cost) are kept separate, and the header no longer turns `$0` provider fees into a claim of zero electricity, depreciation or opportunity cost. Section E records the invariants that ARE enforced and **names the two that are not** — atomic reservation and uncertain-submission reconciliation — rather than letting the gap be inferred from silence. Enablement stays BLOCKED throughout. **Round 27 moved this gate from 39 to 45** after Astra's F4 found a TAUTOLOGY among its checks (`numerics.length === caps.observedRates.filter(...).length`, where `numerics` IS that filter — `x.length === x.length`, true for every input including the collapsed state it claimed to exclude) and two labels that OVERCLAIMED (static catalogue fields named "INVARIANT 2", a pricing refusal named "INVARIANT 3"). The tautology is replaced by A4a/A4b/A4c, each of which can fail; the labels now say what they exercise; and E4/E4b/E5/E5b/E5c add the boundary test Astra asked for — the flag must be the CALLER's, driven through the real handler and the real adapter rather than asserted against `resolve()` directly. 45 checks. |
| `hostile-round27-probe.mjs` | Round 27. **The F1–F7 fixes, and the ENFORCEMENT they add.** Astra's round-2 review returned `DEFECTS-FOUND` against round 26's commit, and the two load-bearing findings share one shape: **a policy enforced only by another field's ABSENCE is not a policy** — the third appearance of that class in this lane. **F1:** `pricingStatus` read as a policy and enforced nothing, so a row could declare itself `disputed` and still carry a rate the money path would price. Fixed in BOTH places it can be violated — `specShape.mjs` rejects the contradiction at IMPORT (`E_BAD_SPEC`, A1–A1f), and `costEstimate.mjs` refuses to price any non-`published` row at the AUTHORITATIVE boundary (B1–B4). B2 is the control that makes B1 falsifiable: the SAME caps declaring `published` prices to 442800 micros, so `pricingStatus` is the only variable. **F2:** the adapter reached `submit()` without ever calling `resolve()`, so the one path that spends money bypassed enablement, the licence judgement and the D3 gate; C1–C3 read that call and its ordering, and C4 asserts the BEHAVIOURAL evidence in round 26's probe still exists — because source text cannot tell a call that refuses from one that throws. **F3:** the quote path could not express a selection the handler accepted, so no hosted row could be quoted through the documented path at all (D1–D4). F5 and F7 are pinned where their evidence lives (E1–E5), and F6 — a patch receipt advanced as a current claim — is asserted as a property of this document (F1–F3). Section G states what was NOT done. Enablement stays BLOCKED: Astra's verdict was explicitly not an enablement approval. 26 checks. |
| `control-round12-checks.mjs` | **The control for the controls.** Replays round 12's new source-text assertions against MUTATED sources and fails if any still matches. 16 checks. |
| `smoke-adapters.mjs` | The adapter gate ladder, one rung at a time. |

### Adapter registration — `backend/scripts/handlers/`

| File | Change |
|---|---|
| `adapters.mjs` | **New.** The transport registry, split out of `generateVideo.mjs` to stay inside rule 4. Hosted ids are **derived** from the catalogue, so a row cannot exist without an adapter. |
| `ceilings.mjs` | **New in round 12.** Composes the three ceilings in the order the handler needs them. It lives here, not in a shared module, because composing them would make `spendGuard` and `ceilingGate` import each other. |
| `generateVideo.mjs` | 300 → 293 lines across rounds 11–12. Reads `job.maxCostUsd`, names the caller when charging the ledger, and re-exports `ADAPTERS` and `ComfyError` so no caller changes an import. |
| `completion.mjs` | **The queue-completion projection.** `completionBody` / `completionSummary` / `mimeForFilename` — what the agent reports to the queue when a job finishes, and the line the operator reads. **Round 23** attacked it for the first time: it had been the file-table assertion's one named exemption, on the grounds that "the lane has never modified it", which is a fact about the **patch** and not about the lane's dependency surface — `generateVideo.mjs` imports `mimeForFilename` from here, so every video job's `r2Key` and mime are built out of this file. Found the prototype-lookup class round 18 fixed three times in `comfyuiGraph.mjs` (`MIME_BY_EXT['constructor']` returned the `Object` **constructor**, a truthy non-string that `JSON.stringify` then dropped, so the queue stored a completion with no mime at all), a fallback that shipped the exact string its own header calls "worse than silence", and an `\|\|` doing an absence test where a type was required. |

Every source file is **under rule 4's 300-line cap.** The test file is 526, matching the repo's own
precedent (`backend/tests/unit/videoProviderRegistry.test.mjs` is 635).

---

## Readiness receipt

All **thirty-three** gates, run in this session, all green — **1220 assertions**:

```
cd backend && npx vitest run tests/unit/videoProviderRegistry.test.mjs
#   ✓ tests/unit/videoProviderRegistry.test.mjs (63 tests) — 63 passed (63)
#   the suite is UNCHANGED — git reports no diff against main for it
#   (git diff --stat main -- <file> is empty; the only byte delta is CRLF
#    checkout conversion, which every file in the repo shares)

cd backend && npx vitest run tests/unit/videoComplianceControls.test.mjs
#   ✓ tests/unit/videoComplianceControls.test.mjs (64 tests) — 64 passed (64)
#   GATE 16. This suite existed the whole time and NO gate ran it until round 12.
#   It covers the spend guard, the usage ledger, the prompt policy and the generate
#   handler — i.e. exactly the code the ceilings touch. The fifteen-gate receipt was
#   green while 64 relevant tests went unrun. See "The gate that was never run" below.

node --test media-api/media-api.test.mjs
#   # tests 48   # pass 48   # fail 0

node media-api/demo-http-flow.mjs
#   ALL 44 CHECKS PASSED

node media-api/hostile-http-probe.mjs
#   ALL 24 CHECKS PASSED

node media-api/hostile-round2-probe.mjs   # 26 CHECKS — 26 passed, 0 failed
node media-api/hostile-round3-probe.mjs   # 23 CHECKS — 23 passed, 0 failed
node media-api/hostile-round4-probe.mjs   # 27 CHECKS — 27 passed, 0 failed
node media-api/hostile-round5-probe.mjs   # 24 CHECKS — 24 passed, 0 failed
node media-api/hostile-round6-probe.mjs   # 71 CHECKS — 71 passed, 0 failed
node media-api/hostile-round7-probe.mjs   # 51 CHECKS — 51 passed, 0 failed
node media-api/hostile-round8-probe.mjs   # 42 CHECKS — 42 passed, 0 failed
node media-api/hostile-round9-probe.mjs   # 49 CHECKS — 49 passed, 0 failed
node media-api/hostile-round10-probe.mjs  # 27 CHECKS — 27 passed, 0 failed
node media-api/hostile-round11-probe.mjs  # 39 CHECKS — 39 passed, 0 failed
node media-api/hostile-round12-probe.mjs  # 35 CHECKS — 35 passed, 0 failed
node media-api/hostile-round13-probe.mjs  # 30 CHECKS — 30 passed, 0 failed
node media-api/hostile-round14-probe.mjs  # 52 CHECKS — 52 passed, 0 failed
node media-api/hostile-round15-probe.mjs  # 40 CHECKS — 40 passed, 0 failed
node media-api/hostile-round16-probe.mjs  # 29 CHECKS — 29 passed, 0 failed
node media-api/hostile-round17-probe.mjs  # 29 CHECKS — 29 passed, 0 failed
node media-api/hostile-round18-probe.mjs  # 67 CHECKS — 67 passed, 0 failed
node media-api/hostile-round19-probe.mjs  # 24 CHECKS — 24 passed, 0 failed
node media-api/hostile-round20-probe.mjs  # 32 CHECKS — 32 passed, 0 failed
node media-api/hostile-round21-probe.mjs  # 41 CHECKS — 41 passed, 0 failed
node media-api/hostile-round22-probe.mjs  # 31 CHECKS — 31 passed, 0 failed
node media-api/hostile-round23-probe.mjs  # 51 CHECKS — 51 passed, 0 failed
#   GATE 28. 21 of these 49 FAILED on the round-22 tree restored from HEAD (9f9957b1b), which
#            is the control. Three of those 21 are the mutation controls, which fail there for
#            the reason they should: the strings they re-introduce do not exist until the fix
#            lands. Four more are section E, which asserts the LEDGER's own stated totals
#            rather than the module — it failed on the round-22 document because two of those
#            totals were stale, and that is the round's fourth finding. Section E is also the
#            only check in the lane that reads the document's arithmetic, which is why nothing
#            had caught the drift before.
#   GATE 27. 21 of these 41 FAILED on the round-20 tree, which is the control. Four of
#            those 21 are the mutation controls, which fail there for the reason they
#            should: the strings they re-introduce do not exist until the fix lands.
#   GATE 26. 18 of these 32 FAILED on the round-19 tree, which is the control.
#   GATE 25. 18 of these 24 FAILED on the round-18 tree, which is the control.

node media-api/hostile-round24-probe.mjs  # 13 CHECKS — 13 passed, 0 failed
#   GATE 30. The document's own module count, and the file table's converse. A2, A3 and B2 FAIL
#            on the pre-fix document (it stated 53 where the filesystem holds 59), and A6 FAILS
#            on the pre-fix RECEIPT (29 gate commands against 28 countable numbers) — which is
#            the round's second finding. A4 reads gate 25's source rather than trusting a
#            comment, and A5 reads the assertion total in EVERY form the document writes it.
#            The receipt's gate LABELS skip round 22's probe, which carries none; the labels are
#            a reading aid, and the count that matters is the one A6 asserts.
#            C4 exists because C2's FIRST version was a partial mutation: it removed one of two
#            occurrences and its diagnostic reported success while the check failed. Nothing here
#            had asserted that A2 is TOTAL over more than one statement of the count — A2 could
#            have been "the first claim matches" with every other check still green. A3's
#            diagnostic had the same shape: it printed `all three agree` on a FAILING check,
#            because it read claims[0] and derived its suffix from the row count alone. Both are
#            the round's own defect class, committed by the round's own gate on its first run.

node media-api/control-round12-checks.mjs # 16 passed, 0 failed
#   GATE 17. The control for the controls — see "A green gate that could not fail".

node media-api/smoke-adapters.mjs
#   ALL 15 CHECKS PASSED
#   Round 24: this line used to read a bare `ALL CHECKS PASSED`. With no number on it, the
#   headline total had nothing to add for this gate and silently omitted all fifteen of its
#   assertions — a gate counted in the gate total and missing from the assertion total.

node media-api/hostile-round25-probe.mjs  # 22 CHECKS — 22 passed, 0 failed
#   GATE 31. Which graph failures are worth another full GPU render? `E_GRAPH_FAILED` is a MIXED
#            code and the adapter marks permanence per INSTANCE from the node's own exception;
#            `E_NO_OUTPUT` is not mixed and joins PERMANENT_CODES. The classifier defaults to
#            RETRYABLE, so a wrong guess costs GPU time rather than a job. The closed type list and
#            the transient markers are read out of the module's OWN source and the full
#            cross-product is taken, so a type or marker added later is covered without anyone
#            remembering to update the check. D0 proves the mutation controls' rebuilt classifier
#            is faithful to the shipped one before any of them is believed; D1 records that OOM is
#            held retryable by TWO independent rules, so no single-line mutation can flip it.

node media-api/hostile-round26-probe.mjs  # 45 CHECKS — 45 passed, 0 failed
#   GATE 32. The catalogue DATA, adjudicated by an external consult. D1 quarantines an
#            unreproducible rate to `null` while KEEPING the original figure as an unreconciled
#            historical observation, and asserts no mean, min or max was substituted for it.
#            D2 makes an unretrieved territory or attribution fact unable to read as a
#            permissive one, enforced at IMPORT by two new specShape rules. D3 turns
#            "non-default, paid" into a declared policy enforced at the resolver and asserted
#            to bind regardless of the `commercial` flag. D4 keeps the provider charge estimate,
#            the maximum liability, the actual billed charge and the local operating cost as
#            SEPARATE quantities. Section E names the two invariants that are NOT implemented
#            — atomic reservation and uncertain-submission reconciliation — rather than letting
#            the gap be inferred from silence. Enablement stays BLOCKED.
#            ROUND 27 moved this gate from 39 to 45. Astra's F4 found one check was a TAUTOLOGY
#            (`x.length === x.length`, true for every input, including the collapsed state it
#            claimed to exclude) and two labels OVERCLAIMED — a pair of static catalogue fields
#            was named "INVARIANT 2" and an unknown-cost refusal was named "INVARIANT 3", though
#            it exercises neither authentication nor authorisation. The tautology is replaced by
#            A4a/A4b/A4c, each of which can fail; the labels now say what they exercise; and
#            E4/E4b/E5/E5b/E5c add the boundary test Astra asked for — the flag must be the
#            CALLER's, driven through the real handler and the real adapter, not the probe's.

node media-api/hostile-round27-probe.mjs  # 26 CHECKS — 26 passed, 0 failed
#   GATE 33. The F1–F7 fixes, and the ENFORCEMENT they add. Astra's round-2 review returned
#            DEFECTS-FOUND against round 26's commit, and the load-bearing two findings share
#            one shape: a policy enforced only by ANOTHER FIELD'S ABSENCE is not a policy.
#            F1: `pricingStatus` read as a policy and enforced nothing, so a row could declare
#            itself `disputed` and still carry a rate the money path would price. Fixed in BOTH
#            places it can be violated — `specShape.mjs` rejects the contradiction at IMPORT
#            (A1–A1f), and `costEstimate.mjs` refuses to price a non-`published` row at the
#            AUTHORITATIVE boundary (B1–B4). B2 is the control that makes B1 falsifiable: the
#            SAME caps declaring `published` prices to 442800 micros, so the only variable is
#            the status. F2: the adapter reached `submit()` without ever calling `resolve()`,
#            so the one path that spends money bypassed enablement, the licence judgement and
#            the D3 gate — C1–C3 read that call and its ordering, C4 asserts the BEHAVIOURAL
#            evidence in round 26's probe still exists. F3: the quote path could not express a
#            selection the handler accepted, so no hosted row could be quoted at all (D1–D4).
#            F5 and F7 are pinned where they live (E1–E5), and F6 — a receipt advanced as a
#            current claim — is asserted as a property of this document (F1–F3). Enablement
#            stays BLOCKED: Astra's verdict was explicitly not an enablement approval.
#
#            AND THIS GATE CAUGHT ITS OWN FIX, which is the round's fourth finding. Run against
#            b796338fb it printed 25 passed, 1 failed: F2 was red, because the handover sentence
#            F6 exists to correct still named `4698de0e4` (round 26) as the tip AFTER round 27
#            was committed on top of it — the commit below carried the sentence that denied it.
#            F2's first form asserted the sentence named `git rev-parse HEAD`, which is
#            impossible for a document riding inside that commit: the fix re-breaks the check,
#            and a check you can never make green is a check you eventually delete. Its second
#            form asserted REACHABILITY, which is true of every commit in the repository's
#            history — verified by injecting round 26's exact stale reference (`9f9957b1b`) and
#            watching it stay GREEN. The shipped form asserts FRESHNESS: the named commit must be
#            within ONE commit of the tip. That is distance 0 here, survives the next commit, and
#            FAILS at the injected distance of 6. Both injections are recorded above rather than
#            described, because a check that has never been seen to fail is not evidence.
```

### The gate that was never run

Round 12 set out to close two ceiling gaps and found a third defect on the way in, in the
verification rather than the code.

`backend/tests/unit/videoComplianceControls.test.mjs` — **64 tests** over the spend guard, the
usage ledger, the prompt policy and the generate handler — sat in the repo the whole time and
**no gate ran it.** The three verifications the handoff named cover
`videoProviderRegistry.test.mjs` and `media-api.test.mjs`, and every probe was written by this
lane; nothing pointed at this file. It passes, and it passed before any of round 12's changes.

The failure mode this creates is the one the patch saga already taught, one level up: **a green
receipt can be green because it never looked.** The gate count was fifteen and the assertion
count was 545, and both were true of the gates that ran. Sixty-four tests covering the exact
modules about to be modified were outside the count entirely.

It is now **gate 16**, and the assertion total is **1220** (868 when this section was written — **853 plus the 15 that `smoke-adapters.mjs` ran and never reported, which round 24 found had been missing from this total since the day it was written**; round 18 added its own gate and 67 checks, round 19 one gate and 24, round 20 one gate and 32, round 21 one gate and 41, round 22 one gate and 31, round 23 one gate and 51, round 24 one gate and 13, round 25 one gate and 22, round 26 one gate and 45, round 27 one gate and 26). The other `video*`/`render*` suites in
that directory import modules outside this lane (`routes/contentStudioRoutes.mjs`) and fail in a
sparse checkout for that reason alone; this one is self-contained, which is why it is the one
that must run.

### Re-verified from the patch, on a fresh `main` base

The receipt above is from the worktree. It was then reproduced **from the patch itself**, because a
patch generated off a stale index is the failure mode this repo has already produced once.

**It had already produced it here, and the first version of this section missed it.** The handover
patch carried **23 files**. Two of them were missing that this lane had genuinely changed:

- `shared/providers/video/spendGuard.mjs` — round 4's `costFrom`, which is what stops an absent,
  empty or unparseable cost being read as **ZERO** (`Number(x) || 0`). Applying the 23-file patch to a
  fresh base would have **restored that defect**, silently, on the one guard that protects money.
- `shared/providers/video/promptPolicy.mjs` — round 5's per-matched-name false-positive guard.

The old verification reported all five gates green, and it was **right about the five it ran**. It was
green because the patch omitted the probes that would have caught the omission: a patch and its
verification can be wrong in the *same direction* and agree with each other. **A verification is only
as complete as the artifact it is verifying.**

#### The same omission happened twice more, and the third time it was caught before handover

Correcting the count to 35, then 37, did not fix the *procedure* that produced the wrong count — and
the procedure failed again. The patch regenerated after round 11 carried **37 files and was missing
two the lane depended on**:

- `shared/providers/video/licenceGate.mjs` — round 11's new module, imported by `registry.mjs`,
  `media-api/preflight.mjs` **and** `backend/scripts/handlers/generateVideo.mjs`. Applying that patch
  to a fresh base would not have restored a silent defect; it would have failed outright with
  `MODULE_NOT_FOUND` on **every** gate. Loud, but still wrong.
- `media-api/hostile-round11-probe.mjs` — the probe for the round-11 defect, so the same patch that
  omitted the fix's probe would also have omitted the fix's proof.

The cause is structural and was recorded in the "regenerate after the last edit" lesson without being
fixed: **`git diff <base>` reads the INDEX, and a newly created file is untracked, therefore invisible
to it.** Regenerating on a newer index cannot help; the file is never in the index at all.

The fix is a generator that refuses to write a patch it cannot prove complete —
`gen-lane-patch.sh` in the session workspace — asserting five things, any of which aborts:

1. **no untracked file in the lane** (the exact hole: an untracked file is silently omitted);
2. the patch's file set **equals** the set of files whose *content* differs from the base;
3. the count matches, so a silent truncation is caught;
4. **no path outside the lane** (the patch may not smuggle unrelated changes);
5. **no relatively-imported module is shipped missing** — the check that catches the
   `licenceGate.mjs` case by name.

Guards 2–5 are mechanical. Guard 1 is the one that matters, and a guard with no control can pass
vacuously — so it was tested against the defective artifact: replaying the old 37-file list through
guard 5 flags `shared/providers/video/licenceGate.mjs` by name. **The control fails, which is why the
guard is trusted.**

A second, subtler trap surfaced while writing it, and it is worth stating because it produced a
*false alarm* rather than a false pass. The natural way to build the expected set is
`git diff <base>` unioned with `git diff --cached`. **In this worktree that is wrong**, because HEAD
is unborn: `git diff --cached` compares the *empty tree* to the index, so it lists **every** lane file
in the index — including the eight that are byte-identical to `main` modulo line endings. The union
came to **47** against the patch's 39 and reported eight files as missing. They were not missing;
they were unchanged. Verified individually: `completion.mjs`, `comfyuiGraph.mjs`, `comfyuiLocal.mjs`,
`provenance.mjs`, `workflows/README.md`, `comfy-object-info.cache.json` and both
`minimax_h3_*_api.json` files are **line-endings-only** differences from `main`, which is why
`git diff` reports no change while a raw `sha256sum` differs. **The only correct source of truth is a
content diff against the base.** (The branch was unborn for twenty-one rounds, which is what made
`git diff --cached` meaningless here — it compared the empty tree to the index. That is no longer
true: see "There was no commit for twenty-one rounds" below. The content diff remains the right
source of truth for the file set, since a patch must describe *changes*, not a tree.)

The patch is now **92 files** (9 modified, 83 new) — **derived**, not asserted: `git diff --name-status
2b3e7a62a` over the four lane directories returns exactly 92 rows, 9 `M` and 83 `A`.
The 92nd is `media-api/EXECUTION-MANIFEST.txt`, added in round 29 — so the drift ran again in the
other direction when a round added a file, which is the same class and is why the claim is
re-derived rather than remembered. The previous
figure here was **82 (9 modified, 73 new)**, and the drift is this lane's recurring defect
class: a number written when it was true, then left to age while rounds 23–28 added more files
(the round-23/24/25/26/27 probes, `run-all-gates.sh`, `ROUND-3-FIX-LOG.md`, `ROUND-3-REVIEW-PACKET.md`,
and the baseline/receipt/integrity text files). Gate 28's E1 now derives it on every run, so the
number can no longer outlive its own truth. **The 82 → 91 step happened while this very round was
being written**, and it is the clearest illustration of why the derivation matters. Three further
documents landed in the lane after the earlier figure was measured and before this sentence was read
(`ROUND-3-4-SUMMARY.md`, `RECEIPT-round28-1e3c1bd7.txt`, and this round's own
`OBJECT-STORE-DAMAGE.md`), and E1 caught the drift on every run — no human noticed the first two, and
no human was asked to. The count was corrected three times in one sitting, which is the point:
the number is now *derived on demand* rather than *remembered*, so being wrong has a shelf life of
one run instead of one round.
The nine modified are the same set: (`generateVideo.mjs`, `catalogue.mjs`, `promptPolicy.mjs`,
`registry.mjs`, `spendGuard.mjs`, **`provenance.mjs`**, **`comfyuiLocal.mjs`** and **`comfyuiGraph.mjs`** — new in round 18 — and **`completion.mjs`**, new in round 23) plus 82 new (the whole `media-api/` surface, `router.mjs`,
`normalizeResponse.mjs`, `specShape.mjs`, `licenceGate.mjs`, `licenceTerms.mjs`, `ceilingGate.mjs`,
`usageLedger.mjs`, `ceilings.mjs`, `callerCeiling.mjs`, `comfyuiHistory.mjs`, and every round's probe) — and it is verified by running **all thirty-three** gates on the patched base, not the five that happened to be in it:

```
git clone --local --branch main --single-branch <SS-PT> C:/tmp/ss-media-api-patch-verify-20260918.R10
cd C:/tmp/ss-media-api-patch-verify-20260918.R10
#   base = 2b3e7a62a, and it has NO media-api/ and NO adapters.mjs  (genuinely pre-work)

git apply --check <patch>      # exit 0
git apply <patch>              # exit 0
#   63 files changed; every path is inside the lane's directories
#   git status --porcelain -uall | wc -l   ->  63, and zero paths outside the lane
#   each of the 63 files hashes identical to the worktree once CR is stripped   -> 63/63
#   (The three 63s above are what THAT RUN printed, kept as its record and deliberately NOT
#    updated: it predates rounds 18-24, which added sixteen files. The live count is the one
#    stated above this block, and gate 31's E1 now derives that from git against the base
#    rather than trusting any number in this block. A record that is silently rewritten to
#    match today is not a record.)
#   (roughly 12.6k inserted lines and 247 deleted lines. The exact line count, like the
#    byte count, is a property of THIS snapshot — this README is inside the patch, so
#    editing this sentence changes it. Stated as a bound, not as a figure to trust.)

cd backend && npm ci           # 489 packages; the patch touches no dependency manifest
npx vitest run tests/unit/videoProviderRegistry.test.mjs   # 63 passed (63)      <- gate 01
npx vitest run tests/unit/videoComplianceControls.test.mjs # 64 passed (64)      <- gate 16
cd .. && node --test media-api/media-api.test.mjs          # 48 pass, 0 fail
node media-api/hostile-http-probe.mjs                      # ALL 24 CHECKS PASSED
node media-api/hostile-round2-probe.mjs                    # 26 passed, 0 failed
node media-api/hostile-round3-probe.mjs                    # 23 passed, 0 failed
node media-api/hostile-round4-probe.mjs                    # 27 passed, 0 failed
node media-api/hostile-round5-probe.mjs                    # 24 passed, 0 failed
node media-api/hostile-round6-probe.mjs                    # 71 passed, 0 failed
node media-api/hostile-round7-probe.mjs                    # 51 passed, 0 failed
node media-api/hostile-round8-probe.mjs                    # 42 passed, 0 failed
node media-api/hostile-round9-probe.mjs                    # 49 passed, 0 failed
node media-api/hostile-round10-probe.mjs                   # 27 passed, 0 failed
node media-api/hostile-round11-probe.mjs                   # 39 passed, 0 failed
node media-api/hostile-round12-probe.mjs                   # 35 passed, 0 failed
node media-api/hostile-round13-probe.mjs                   # 30 passed, 0 failed
node media-api/hostile-round14-probe.mjs                   # 52 passed, 0 failed
node media-api/hostile-round15-probe.mjs                   # 40 passed, 0 failed
node media-api/hostile-round16-probe.mjs                   # 29 passed, 0 failed
node media-api/hostile-round17-probe.mjs                   # 29 passed, 0 failed
node media-api/demo-http-flow.mjs                          # ALL 44 CHECKS PASSED
node media-api/smoke-adapters.mjs                          # ALL CHECKS PASSED
node media-api/control-round12-checks.mjs                  # 16 passed, 0 failed  <- gate 17
```

The artifact and the safety net are now the **same set of files**, which is the point: the safety net
is built *from the patch's own file list* (`build-safety-net.sh`), so
`patch file count == safety-net file count == lane content-diff count` is one number, checkable three
ways. An earlier attempt built the net from `git status`, which under an unborn HEAD yields **47**
(39 changed + the 8 unchanged) against a 39-file patch — two artifacts, two counts, no way to tell
which was right. That ambiguity is what let the first two defective patches through.

One more thing the patch re-verification caught, and it is the same lesson a second time. The first
regeneration of this section reported **35 files** and a full green run — and both were true of the
patch that existed at that moment. It stopped being true the instant rounds 9, 10 and 11 landed,
because a patch is a snapshot of an index, not a live view of a worktree. **The patch is regenerated
after the last edit, not before it** — and, as the licenceGate omission shows, regenerating is not
sufficient on its own unless the generator *asserts completeness*. The receipt above is from the
asserted artifact, verified by applying it to a fresh `main` clone and running all thirty-three gates
there.

**Round 16 moved the count by TWO, and the reason is the same lesson this section is about.** `provenance.mjs` had never been in the patch: its only difference from `main` was line endings, and `git diff` reports no change for those. Round 16 changed its content, so it entered the patch as a sixth MODIFIED file. A file can be absent from the artifact for a reason that looks like "nothing to ship" and is actually "nothing shipped yet" — which is why the generator asserts the patch set equals the *content*-diff set rather than trusting a count that happened to be stable.

**Round 18 moved it by THREE, for the same reason one more turn out.** `comfyuiLocal.mjs` and `comfyuiGraph.mjs` had never been in the patch either — this lane had never touched them — so the moment round 18 changed them, two files that have always existed in `main` entered the artifact as MODIFIED. Nothing about the count would have revealed their absence: they were in the worktree, the probes import them, and every gate was green. A file that is genuinely unchanged is invisible to a patch by design, and that is correct. The thing to distrust is a count, never the mechanism.

One honest detail: the patch's blobs are LF, and `git apply` writes them out through
`core.autocrlf`, so the applied files are CRLF. Content is identical — stripping CR makes every file
hash-match the worktree — and CRLF is what the rest of this checkout uses. It is a checkout
convention, not a content difference, and it is why "byte-identical" is stated above as "git reports
no diff" rather than as a raw hash claim.

Three gotchas worth recording, each already paid for once:

- `git apply <patch>` needs a **Windows-style** path (`C:/…`); `/c/…` fails with "can't open patch".
  The same trap applies to `git clone --local`.
- `git status --porcelain` **collapses untracked directories**, so a patch that creates `media-api/`
  from nothing reports as ~15 entries rather than 39. Use `--untracked-files=all` before concluding a
  patch is complete — the first count here said 15 and looked like a *different* bug.
- **A hand-escaped regex inside a double-quoted shell string is not a reliable way to inspect a
  patch.** `grep -c 'replace(/\\r\\n/g'` against the patch returned **0** and made a *current* patch
  look stale; the same pattern also nearly hid the licenceGate omission, because a grep that matches
  nothing looks exactly like a grep for something that is genuinely absent. Use `grep -F` with a
  literal string, and confirm the check can *fail* before trusting it to pass.

### The flow, demonstrated over a real socket

`demo-http-flow.mjs` binds a real server on `127.0.0.1`, drives it with `fetch`, and asserts:

- **The auth boundary.** No token → 401. Wrong token → 401. Valid token → 200. Unauthenticated quote → 401.
- **The catalogue.** The enabled local row reports the **runtime** enablement, with the shipped default kept separately.
- **Quote.** `201`; id captured; local lane priced `0.0000`; `basis: "run"`; `grant_recorded: false`; carries the note that a quote authorises nothing.
- **Job.** Missing `Idempotency-Key` → `400 E_NO_IDEMPOTENCY_KEY`. With it → `202`. Same key replayed → **same job id, same body shape, no second render.**
- **Polling.** `states seen: running -> succeeded` — the loop observed the job **in flight**, not merely at rest.
- **Asset.** `sha256` present; provenance carries the licence snapshot (`commercialUse: "requires-grant"`, `excludedTerritories: ["US"]`, `usedCommercially: false`) and the prompt hash.
- **The bytes.** `content -> 200`, `content-type: video/mp4`, and **the served bytes hash to the recorded sha256** (`8ea2ae02…` on both sides). `ffprobe`: `codec_name=h264 width=320 height=240 nb_frames=20` — real, decodable video.
- **The ledger.** `runs: 1` counted; `spend_usd: 0`; `gpu_budget_enforcement: "metered_only"`; `ledger_degraded: false`.
- **The refusals.** Cancelling a finished job → `409`. Unknown job → `404`. Unknown route → `404`. A hosted row → `403`.

**The engine ran for real.** Only the *transport* is injected (`deps.adapters`). So `runGenerate`'s
licence gate, `validateVideoRequest`, `assertPromptAllowed`, `checkRunAllowed`, the ledger `record()`
and `buildProvenance` all executed. The provenance record and the ledger entry are the evidence: a
stubbed `runGenerate` would have produced neither.

### What the hostile pass looked for, and what it found

The probe attacks five surfaces. It found **four defects**, all now fixed and re-verified:

| # | Defect | How it surfaced | Fix |
|---|---|---|---|
| 1 | **`/v1/models` reported the catalogue's shipped default, not runtime enablement.** With the provider enabled, a quote and job for it both succeeded while the catalogue said `enabled:false, runnable:false`. An agent reading the catalogue would conclude it had nothing to call. | Driving the real flow and reading the response | `listModels` now reads `readEnabled(env)`, reports runtime state as `enabled`, and keeps the shipped default as `readiness.catalog_enabled`. |
| 2 | **`generateVideo.mjs` dropped `sha256`.** It was used for the upload-url body and then omitted from the return, so `server.mjs`'s `out.sha256 ?? null` put a **null on every asset** — a caller could download the bytes with nothing to verify them against. The provenance record had the hash; the asset metadata did not. | Fetching the artifact and comparing hashes | `sha256: result.sha256 ?? null` added to the return. |
| 3 | **A 413 that could never be delivered.** `readBody` called `req.destroy()` the instant the cap was crossed, resetting the socket while the client's body was still in flight — so `fetch` threw and the caller never saw the status. The limit worked; the refusal was unreachable. | Sending a 300 KB body from the probe | Stop buffering, keep draining, reject immediately; `connection: close` on the 413. Memory stays bounded because the chunks are discarded. |
| 4 | **One endpoint, two body shapes.** The idempotency replay returned a hand-rolled `{id, state}` while the first call returned the full projection — so a client written against the first `202` read `undefined` for every field it needed. | Comparing the two responses | The replay now returns `publicJob(existing)`. |

Two further clarity defects, found by reading with hostile intent:

- `pricing.basis` fell through to `'none'` for a per-run provider, so `rate.unit: "run"` and
  `pricing.basis: "none"` described the same fact two ways. Now `basis: "run"`.
- `grant_recorded: pre.usage && false` was a truthiness dance that read as though a grant could be
  inherited from a usage record. It cannot. Now plainly `false`.

And one thing the probe asserted that was **wrong about the code**: trailing OWS on the bearer header
is tolerated (`"Bearer x "` matches). That is benign — trimming can only make a *correct* token match,
never a wrong one, since the comparison is still constant-time with a length check. Recorded as
accepted behaviour, not "fixed".

### Rounds 2–23 — the hostile loop, run until a pass finds nothing

Rule 74 cannot be satisfied by one adversarial pass. The loop is: find defects → fix → re-verify →
repeat until a full pass finds **nothing new**. Rounds 2–23 have done that, and each round's probe is
now a permanent gate. **97 further defects**, every one with a passing control beside it.

(That count is the number of rows below, which is what the table is for. It previously read "20" while
the table held 21 — an under-claim in the one section whose whole point is not under-claiming. It then
read "70" while the table held 83: rounds 21 and 22 added nine rows and never moved the number, and
**no assertion read it** until round 23's section E derived it from the table itself. The same
paragraph is now checked by arithmetic rather than by attention, which is the only version that keeps
working.)

| Round | Defect | Why it mattered |
|---|---|---|
| 2 | `readBody` leaked its handler on client abort | A client that promised a body, sent 10 bytes and reset emitted neither `end` nor `error`. The promise stayed **pending forever**, retaining the handler, request and response for the process lifetime. Unbounded memory from an unauthenticated caller. |
| 2 | **`authorized()` authenticated `Bearer undefined`** | `safeEqual` stringifies both sides, so an `undefined` token became the 9-character string `"undefined"` and matched. An authentication bypass wearing the costume of a type coercion. |
| 2 | **A malformed `Host` header killed the process** | `new URL(req.url, req.headers.host)` throws on `127.0.0.1:99999999`, `:8080`, `a b`, `[::1`, and the throw escaped the request listener. **Unauthenticated, pre-auth remote kill switch.** |
| 2 | `createReadStream(...).pipe(res)` with no `'error'` listener | An `EISDIR` on an artifact path with no error listener is an unhandled `'error'` event — a process kill, reachable from any job whose `localPath` stopped being a file. |
| 2 | `E_ARTIFACT_MISSING` leaked the absolute server path | An error message is the one place a caller reads a deployment's layout off the wire. Now names only `basename(path)`. |
| 2 | `max_cost_usd` type coercion | `Number(true)` is 1 and `Number([5])` is 5, so `max_cost_usd: true` silently authorised **$1**. The one field where a coercion bug is a money bug, so it is type-checked rather than coerced. |
| 3 | `toMicros` **truncated** a rate | Truncating understates the cost a rate produces, which is the unsafe direction for money. `0.9999999` became 999999 instead of 1000000. Now rounds half-up with a guard digit. |
| 3 | `formatUsd` **truncated** a cost | The string a caller reads a ceiling comparison off rendered 1234567 micros as `"1.2345"` — below the truth. |
| 3 | **A newly created job could be pruned and lost** | `prune()` sorts by `createdAt` descending; on a timestamp tie a stable sort keeps insertion order, putting the NEWEST job last, where `.slice(0, maxJobs)` cuts. A `202` for a job the server never persisted. |
| 3 | `/v1/estimate` priced providers `/v1/quotes` refuses | `capabilities()` resolves any catalogue row, so the estimate cheerfully priced `minimax/hailuo-hosted` while the quote refused the identical request. The documented flow is estimate → quote → job, so this walked a caller into a wall it was told was clear. |
| 4 | **`checkRunAllowed` read an absent cost as free** | `Number(x) \|\| 0` turned an absent field, an empty string and `'not-a-number'` all into ZERO — three ways to give a billing provider a free run by malforming its cost. |
| 5 | **A place name disabled the person-name flag** | The false-positive guard was tested against the WHOLE prompt, so `New York` suppressed the possible-real-person flag for every name in it. Now tested per matched name. |
| 6 | **`null * duration === 0`** | An unwrapped rate made `trusted()` return `undefined`, `toMicros` return `null` for it, and `null * 6` is **ZERO** in JavaScript — so a billing provider authored in the wrong shape was priced at nothing. The `rateMicros === 0` guard never fired, because `null !== 0`. |
| 6 | `trusted()` silently accepted a bare field | It read `.value` off a non-envelope, yielding `undefined` instead of `null`. Now requires the `{value, provenance}` envelope. |
| 6 | `assertSpecShape` checked the envelope, not the payload | `{value: '', provenance: 'published'}` passed validation, and an empty-string rate is read by `costEstimate` as **explicitly free** — a billing provider priced at $0.00 that the ceiling is never charged for. |
| 6 | **`Number(rate) === 0` priced `''`, `false`, `' '` as free** | The same coercion class as `max_cost_usd: true`. A rate cell authored empty became a free billed run. Found by sweeping the unreadable shapes rather than enumerating expected values. |
| 6 | **The guard and the estimator disagreed about one malformed rate** | `spendGuard.costFrom` returned `Infinity` for `''` while `costEstimate` returned `0` for the same value — two halves of one decision, opposite verdicts. A guard is only as strong as its worst reading, and this was the worst. |
| 6 | **A prototype key resolved as a provider spec** | `VIDEO_PROVIDERS['constructor']` resolves through the prototype chain to the `Object` constructor. It failed closed, but as `E_BAD_SPEC` — "our catalogue is broken" — for what is plainly an unknown provider. `Object.hasOwn` now. |
| 6 | **The catalogue was never validated at import** | `assertSpecShape` was reachable only from `capabilities()`, so a malformed row shipped and was discovered by whoever requested it — as a 500, or as a 500 for the **whole** of `/v1/models` if the row was served. The docstring had always claimed import-time enforcement. It now has it. |
| 6 | `E_BAD_SPEC` / `E_NO_ATTRIBUTION` unmapped | The fallback is 400, and 400 says "your request was malformed" about a row the caller never wrote — the exact wrong-layer mistake `wire.mjs` already documents in the other direction. |
| 7 | **`/v1/estimate` published only the display string** | `formatUsd` renders four decimals, so a cost below 0.00005 USD renders as `"0.0000"` — indistinguishable from free in the field a caller reads first. The QUOTE response carried `pricing.estimated_micros`; the estimate carried only the string, so the two halves of the same documented flow disagreed about what "the cost" is. Now returns `estimate_micros` beside `estimate_usd`. |
| 9 | **A tampered ledger bought back the whole ceiling** | `record()` is monotonic and clamps at zero, so this code can never WRITE a negative count — but `usageFor` read one back through `Number(x) \|\| 0`. A ledger containing `{"runs":-999,"spendUsd":-999}` produced `projectedSpendUsd: -994` for a $5 run against a $10 ceiling, and `checkRunAllowed` said **ALLOWED**. The write path had been hardened against exactly this exploit; the read path had not. | A count that is not a non-negative finite number now sets `degraded`, which refuses anything that bills. Clamping to zero would have been the wrong repair: **zero IS a fresh day**, so a tampered `-999` clamped to 0 still returns the entire ceiling. |
| 9 | **The quote-ownership check ran AFTER the expiry check** | `createJob`'s own comment reads "404, not 403: a caller should not learn that another principal's quote exists." But another principal's **expired** quote answered `410` while a quote that does not exist answered `404` — and that difference IS the oracle the comment says does not exist. Unreachable while `principal` is hardcoded to `'owner'`, which is exactly why it would have shipped. | Ownership is tested first, so the two refusals are the same answer in every state. |
| 10 | **The runner's `catch` could itself reject into nothing** | `.catch((err) => jobs.update(...))` was the guarantee that "the runner must never reject into nothing". But `jobs.update` is precisely what throws when the STORE fails — a full disk, a read-only volume, or `E_STORE_CORRUPT` from the store's own refusal to read a file it cannot parse. The first update throws, the catch runs, its update throws again, out of a detached promise where nothing is listening. Node exits on an unhandled rejection by default, so **one bookkeeping fault would have killed every other in-flight render.** | The catch's own update is wrapped in a guard that logs; the job is left non-terminal for the next boot's `reconcileOrphans`, and the process survives. Proven by injecting a store whose every write throws and asserting **zero** unhandled rejections. |
| 11 | **The licence exclusion was SELF-CERTIFIED by the caller** | The H3 row is `requires-grant` **and** excludes US territory. The territory that decides whether the exclusion applies was read as `params.territory \|\| env.SWAN_OPERATOR_TERRITORY \|\| 'US'` — so the caller named its own jurisdiction. Measured over HTTP with **no grant on file**: `commercial: true, territory: "US"` → `403 E_LICENCE_GRANT_REQUIRED`, while the IDENTICAL request with `territory: "CA"` → **201 and a quote**. A licence gate a caller can self-certify past is not a gate. Present in all three call sites, including the enforcement path in `generateVideo.mjs`. | The territory is an OPERATOR fact — the licence restricts where the *weights run*, and a request cannot move the machine. `licenceGate.territories()` builds the list from the operator's declaration and appends a request-named territory only in the direction that cannot weaken the gate: **any refusal among them wins**, the same rule `max_cost_usd` already follows against the server's allowance. The provenance record now states the operator's territory too, rather than a claim. |
| 12 | **The caller's `max_cost_usd` was never enforced against the CHARGE** | `routes.createJob` type-checked it, compared it against the quote's **estimate** and stored it on the job — and `runGenerate` never read the field. So the caller's ceiling was an assertion about a *forecast*, and a quote is valid for five minutes while the charge happens after. Named by Sean as an honest-scope gap against Astra's *"enforce per-job, per-caller and global ceilings"*; the global one existed, this one did not. | `ceilingGate.jobRefusal()` compares the stored ceiling against the cost the guard authorised, in integer micro-dollars, and refuses `E_JOB_COST_EXCEEDED` — **permanently**, because a retry re-reads the same ceiling and the same catalogue price. It can only ever refuse, never widen, like the submission check it mirrors. Proven end to end through `runGenerate`, including that a refused job is **not** charged to the ledger. |
| 12 | **There was no per-caller ceiling at all** | `checkRunAllowed` took `(caps, usage, limits)` — no principal — and the ledger was keyed by UTC day alone, so every caller shared one budget. Named by Sean alongside the gap above. | The guard takes an OPTIONAL fourth parameter (a caller scope), and the ledger records an **additive** per-caller split beside the global totals. Both caps default to **unset**, so an unconfigured deployment is byte-for-byte the three-argument function it was — which is what makes it a new ceiling rather than a new outage. |
| 12 | **64 relevant tests were outside every gate** | `backend/tests/unit/videoComplianceControls.test.mjs` — 64 passing tests over the spend guard, the usage ledger, the prompt policy and the generate handler — was never run by any gate. The three verifications the handoff named point at two other suites, and every probe was written by this lane. **A green receipt can be green because it never looked**: "fifteen gates, 545 assertions" was true of the gates that ran, while the exact modules about to be modified were outside the count. | It is now **gate 16**. Found by listing the directory rather than trusting the gate list — the same move that found the incomplete patch, one level up. |
| 12 | **Round 6's `max_cost_usd` disclosure check passed VACUOUSLY after the refactor** | The check asserted the *absence* of `maxCostUsd` from `generateVideo.mjs`. Round 12 moved the ceiling logic into `ceilings.mjs`, so the string was absent — and the check went on passing, now testing nothing. An absence assertion cannot tell "the behaviour was fixed" from "the code moved". Its sibling, `CONTROL: the runner source was read`, **did** fail, which is the only reason the section was re-examined. | Section H now reads the files the code actually lives in, strips comments before asserting on code, and states the current contract. **And the assertions are themselves controlled**: `control-round12-checks.mjs` replays each new pattern against a MUTATED source — the exact edit a regression would make — and fails if any still matches. It is gate 17. |
| 13 | **The per-caller ceiling admitted only callers the ledger had ALREADY seen** | Round 12 read an absent caller as an unknown share and refused. That is right for a day with no split — and wrong for a day whose split is complete, and the difference is **decidable**: `record()` writes an entry for every caller it sees and increments the day's total for every run, so `sum(callers[*].runs) === runs` means the split accounts for the whole day and an absent caller has provably used nothing. Round 12 collapsed both readings into the conservative one, so the **second caller of any day was refused for the rest of the day**. A refusal that fires on the normal case is not fail-closed, it is broken — the feature was unusable for its stated purpose, and it would have shipped silently because every round-12 check tested refusals. The message compounded it: it said "no per-caller split" about a day that had one. | `attributedRuns()` reconciles the split against the day's total. Reconciled → an absent caller is a **known zero** and proceeds. Not reconciled (no split, an unattributed run, or an unreadable entry) → refused, with a message that says *which* unknown it is. A malformed entry for the caller themselves is refused unconditionally, so tampering cannot reset a caller to zero and hand back their ceiling. |
| 13 | **The per-caller spend cap compared money in binary floating point** | `spend + runCostUsd > spendCap` — so `0.1 + 0.2` is `0.30000000000000004`, and a caller landing **exactly** on their ceiling was refused. Astra's ruling for this lane is *"never binary floating-point money arithmetic"*; the global guard and the per-job ceiling both honour it in micro-dollars, and the per-caller cap was the one place that broke it. The error direction is over-restrictive rather than money-losing, which is why no earlier probe caught it — but the boundary is wrong, and a ceiling is inclusive. | All three values snap to the micro grid and the comparison is integer: `300000 > 300000` is false, so a caller exactly at their ceiling proceeds. A one-micro overshoot (`300001`) is still refused, so the boundary moved by the rounding error and nothing else. |
| 13 | **A cap that OVERFLOWS to `Infinity` silently disabled the ceiling** | `optionalCapFrom` rejects a non-numeric cap with `E_BAD_CAP` — and a digit-only string passes that test. `Number('9'.repeat(400))` is `Infinity`, so the check missed it, and the value lands exactly where it does the most harm: `callerScope()` returns `null` when neither cap is finite, and `callerRefusal()` reads a non-finite cap as unconfigured. **An operator who set a cap got no cap**, with no error — the precise "typo reads as unset" outcome the existing check exists to prevent, arriving through the one shape it does not cover. | A finiteness check beside the shape check, throwing `E_BAD_CAP`. One keystroke-hold was the whole distance between "enforced" and "absent". |
| 13 | **A caller named after a prototype member resolved through the chain** | `all.callers[who]` with `who = 'constructor'` returns the `Object` constructor; `who = '__proto__'` returns `Object.prototype`, which **is** an object and so passes the bare `typeof` shape test and is read as a recorded entry. It failed closed in both cases — but by accident, and it is the same class round 6 fixed on the provider catalogue (`VIDEO_PROVIDERS['constructor']`). A caller name is caller-supplied on the very path this ceiling protects, so "it happens to fail closed" is not the standard. | `Object.hasOwn` for the lookup, in both the gate and the ledger's write path. Also asserted that a **computed** key (`[who]:`) keeps `__proto__` an own data property, which is what lets a caller be named anything without polluting the object. |
| 13 | **The round-13 fix itself breached rule 4, and the split broke section H** | Closing the three defects above pushed `ceilingGate.mjs` to **347 lines**, past the 300-line cap. Splitting it moved the per-caller code into a new module — and `hostile-round6-probe.mjs`'s section H immediately failed **two** checks, because it asserted where that code *used to* live. That is the third occurrence of this class in this lane (round 12's vacuous pass was the second), and it is why the failure is recorded as a defect rather than a nuisance: the probe caught it, and the probe's own control caught it too. | Split on the seam the module's header already named — a judgement about a JOB vs about a CALLER — into `callerCeiling.mjs`, with `ceilingGate.mjs` **re-exporting** every name so no import path changed. Section H now reads the file the code lives in, and both it and gate 17's control gained an assertion that the re-export bridge exists, so the split cannot silently become a copy. |
| 14 | **`commercialUse` was a CLOSED vocabulary stored in an OPEN string** | The gate recognised exactly one restrictive value (`requires-grant`) and treated the entire rest of the string space as permission — `'prohibited'`, `'unknown'`, `'unverified'`, `'No'`, and the empty space left by a **missing field**. The live consequence was not hypothetical: `catalogueHosted.mjs` instructs the operator to clear the hosted refusal by setting `commercialUse` "to what they actually say" and dropping `evidence`, and terms that FORBID commercial use are as common as terms that permit it. Following that instruction with a prohibitory reading moved the row from **REFUSED to PERMITTED** — the documented way to clear the flag was the documented way to open the hole, which is the worst shape a gate can have, because the operator is doing what the code told them to do. | The vocabulary is enumerated in `licenceTerms.mjs` — a data module, so the validator that rejects a row at import and the gate that refuses it at request time read **one list** and cannot drift. An unrecognised or absent position now refuses as `E_LICENCE_POSITION_UNKNOWN`; `'prohibited'` refuses as `E_LICENCE_PROHIBITED` (no grant can fix a prohibition, so there is nothing to apply for) and `'unverified'` as `E_LICENCE_UNVERIFIED`. All three are mapped to **403**, not the 400 default: they are authorisation, not syntax, and mapping them to 400 would repeat round 11's defect where a licence refusal surfaced as a server fault. |
| 14 | **The evidence flag was matched by exact string equality** | Guard one was `licence.evidence === 'unretrieved'` — an exact match on a field nothing validated. Not the catalogue, not `assertSpecShape`, not the registry. So the **entire** fail-closed guarantee for the hosted lane rested on one string literal matching by luck, and every plausible near-miss — `'pending'`, `'claim'`, `'not-retrieved'`, a typo, a different case, stray whitespace — read as PERMITTED. | The test is now the flag's **presence**: a row that carries an evidence marker of any value is saying its terms have not been established. That is what the field already meant in prose, and it makes the instruction and the implementation agree — the only thing that clears the flag is removing it. `routesCatalog.mjs`'s wire-level `?? 'retrieved'` default is a rendering decision about a response body and never reaches the gate; that distinction is now written down rather than assumed. |
| 14 | **`licence` had to exist but never had to BE an object** | `assertSpecShape` required the field to be present and rejected only `undefined`, so `licence: 'Apache-2.0'` was a legal catalogue row. The gate then did `licence \|\| {}` and read `.evidence` and `.commercialUse` off a **string** — both `undefined` — and every guard fell through to PERMITTED. This is the same bare-value trap the cost fields are already protected from, in the one field whose failure mode is **legal** rather than financial: no amount of arithmetic reveals it. | `specShape.mjs` now validates the licence block the way it already validated `costPerSecondUsd` — the record must be a plain object, `commercialUse` must be in the shared vocabulary, and `excludedTerritories` must be an array. It also **rejects a row that carries an evidence flag AND claims `permitted` or `requires-grant`**, which is the original hosted defect ("asserted `permitted` by analogy with another vendor") made impossible to reintroduce: it now fails at boot, where the operator is looking. |
| 14 | **`excludedTerritories` was read with `.includes()` on whatever type was there** | `(licence.excludedTerritories \|\| []).includes(territory)` on a **string** is `String.prototype.includes` — a substring test, and it mis-reads in **both** directions. `'CANADA'.includes('CA')` is TRUE, so the gate invented an exclusion on a territory the operator never listed and asked them for a grant to it. And `'US'.includes('CA')` is FALSE, so an unreadable list read as an **empty** one and the row was permitted outright — the fail-open direction, and the one an author reaches by writing the field the obvious wrong way. Neither is decidable from the value. | `exclusionList()` returns `null` for a non-array and the gate refuses as `E_LICENCE_POSITION_UNKNOWN`: "cannot be evaluated" must not resolve to "no exclusion". An **absent** list is still `[]`, matching the behaviour it always had — the validator makes absence impossible for a catalogue row, so no caller's behaviour changes. |
| 15 | **`commercial` was read by TRUTHINESS, so an ambiguous value skipped the whole gate** | Round 14's rule is that a field the gate reads as a known, enumerated fact must be validated as closed, and a value it does not recognise is not a yes. It applied that rule once per field it reads — and not to the field that decides **whether the gate runs at all**. `if (!commercial) return null` took the non-commercial branch for `0`, `''`, `null`, `NaN` and `undefined`, so a row that requires a grant and excludes the operator territory was permitted outright. "Not commercial" is a **claim**, and the only value that makes it is the boolean `false`. | `commercial === false` is the only bypass. Both HTTP boundaries already read `params.commercial !== false`, so nothing reachable over the wire changes — and the probe asserts that coupling at the source, so relaxing either boundary to a truthiness test fails the probe rather than quietly opening the gate. The same lesson as round 13's "a guard whose safety rests on another file deserves an assertion", applied to the guard that gates every other guard. |
| 15 | **The wire and the gate read `evidence` by two different rules** | `routesCatalog.listModels` published `caps.licence.evidence ?? 'retrieved'`, which catches null and undefined and nothing else — while the gate's test is "the flag is present and non-empty". Two rules for one field, **one module apart**, which is precisely the defect round 14 fixed inside the gate; round 15 found it surviving outside it. With `??` the wire published `"pending"`, `""` or `"  "` — values the field is not documented to carry — and published `"retrieved"` about a row the gate refuses. | The route derives the field from the shared predicate (`evidenceUnretrieved`), so what a caller is told and what the gate decides cannot drift. The probe drives the **real route** over all nine served rows and asserts agreement, and asserts the source-level derivation too, because the shipped rows are all the same shape and a behaviour check alone cannot tell "derives it" from "happens to be right about these rows". |
| 15 | **The round-15 probe's first draft asserted against its own copy of the old rule** | Section B's headline check reimplemented the route's expression locally as `evidence ?? 'retrieved'` and compared it to the gate. That check can only ever report what the **old** code did — it kept failing after the route was fixed, because it was testing a constant, not the route. This is round 6's vacuous pass one level down: an assertion that has stopped being about the thing it names. | Rewritten to drive `listModels()` and assert the published values, with the local expression kept only as a **CONTROL** that the two rules genuinely differ — which is what makes the source assertion load-bearing rather than stylistic. Recorded as a defect rather than a nuisance because it is the third time this class has appeared and the first time it appeared in a probe written specifically to catch it. |
| 16 | **`modelVersion` always held the provider id** | `provenance.mjs` built it as `result?.modelVersion \|\| caps.modelVersion \|\| caps.provider`, and `capabilities()` never exposed the field and no adapter returned one — so the last term was the only term, on **every** record this lane has ever built. The record's own comment says *"which weights produced this is not answerable from the provider name alone"*, one line above the code that answers it with the provider name. `auditProvenance` then read the fallback as an answer and reported the record **complete** — a completeness check satisfied by a fabrication, in the artifact that exists to be the licensor's evidence. Astra's rule for this lane is *"zero is never the fallback for an unknown cost"*; the provider name is never the fallback for an unknown model version. | All ten rows declare a real `modelVersion` (the weights — `Wan 2.2 TI2V-5B`, not `comfyui/wan-2.2`), `capabilities()` and the catalogue route publish it, and `specShape.mjs` requires a non-blank string that is **never equal to the provider id**, so a new row cannot reintroduce it. The record falls back to `null` and the audit names the gap. Proven by driving the real catalogue, by the route, and by a source-level assertion **controlled** against a mutated copy with the fallback restored. |
| 16 | **The licence snapshot spread a string into characters** | `snapshotLicence` did `Object.freeze([...(lic.excludedTerritories \|\| [])])`. On a string that is `String.prototype[Symbol.iterator]`, so a row authored `excludedTerritories: 'US'` recorded `['U','S']` in the durable record — a territory list nobody wrote, inside the artifact whose whole purpose is immutability. Round 14 made the validator reject that row and the gate refuse it, so it is unreachable *from the catalogue*; the record must not be the one place an unreadable value is reshaped into a plausible one. | A non-array records `null` — "not read", the same answer `licenceTerms.exclusionList()` gives — and a control asserts a real list is still copied, frozen and **not** an alias of the catalogue row. |
| 16 | **A boolean in an evidence record collapsed "not told" into `false`** | `commercial === true`, `grantRecorded === true` and `requiresAttribution === true` each recorded `false` for two different facts: "the caller said this was not commercial" and "nobody said anything". The auditor's question is *was this run authorised?*, and those two answer it differently — so the record asserted a refusal, and a licence condition, that were never claimed. Same mistake as round 13's money coercion, in the fields that decide whether a licence was needed at all. | A boolean in the record is now **tri-state**: `true`, `false`, or `null` for "not told" — deliberately falsy everywhere the old `false` was, so nothing downstream reads it as a grant. The two caller-supplied flags change nothing the runner does (it always passes a boolean); for the catalogue-supplied `requiresAttribution` the validator now **requires** a boolean, because `auditProvenance` reads it to decide whether a missing attribution makes the record incomplete. |
| 16 | **The round-16 probe's first draft compared two absences** | The route check read `listed.model_version === capabilities(LOCAL).modelVersion && listed.model_version !== listed.id` and **passed against the pre-fix tree** — both sides `undefined`, and `undefined !== 'comfyui/minimax-h3'`. An assertion that compares two absences is satisfied by a field that does not exist: the same vacuity as the `expect(r.modelVersion).toBeTruthy()` this round exists to replace, written by the probe that exists to replace it. | It asserts a real string before the equality, and the round is **controlled** by running the finished probe against the round-15 tree: **12 failures there, 29/29 here**. Recorded rather than quietly corrected, because it is the fourth appearance of this class in this lane. |
| 17 | **"Not the provider id" was an EXACT test, so padding and case defeated it** | Round 16's validator compared `spec.modelVersion === id`, which rejects only the byte-identical string — while the plausible authoring mistake is a copy-paste of the id with a stray space. `' comfyui/minimax-h3 '` and `'COMFYUI/MINIMAX-H3'` both PASSED, and the record then repeated the provider id in the field that exists to distinguish it: round 16's defect, surviving inside round 16's fix, reachable by the one near-miss a human actually types. The record also stored the value UNTRIMMED, so `'  MiniMax H3  '` and `'MiniMax H3'` — the same model — compared unequal. | The comparison is normalised (`trim` + case-fold) on BOTH sides, and the record returns the label trimmed. Deliberately **not** extended to internal whitespace: collapsing that would make `'Sora 2'` and `sora2` equal and refuse a legitimate row at boot — measured, not argued, and pinned as a CONTROL so the boundary cannot drift. Controlled against a mutated source with the exact test restored. |
| 17 | **The AUDIT never checked the property the validator guarantees** | Round 16 stopped the RECORD filling `modelVersion` with the provider id and left `auditProvenance` reading truthiness — so a record built from any `caps` that never went through the catalogue (the function is exported and takes whatever it is handed) could still repeat the provider id and be reported **COMPLETE**. The validator covers catalogue rows; the audit is the last check before a reader, and it was the one place the property was not asserted. Round 13's lesson — a guard whose safety rests on another file's validation needs an assertion of its own — applied to round 16's own fix. | The audit now refuses such a record with a **distinct** token, `modelVersion.duplicatesProvider`, because "add a value" and "change this value" are different repairs and one token for both would send a reader to do the wrong one. A CONTROL pins that a record from the real catalogue is still complete. |
| 17 | **A widened value domain did not move the schema version** | Round 16 made three fields `boolean \| null` and one `Array \| null`, then asserted `PROVENANCE_SCHEMA` was unchanged because "the record's shape did not move, only what its fields are allowed to claim". **That claim was false.** A reader of v1 parses `licence.excludedTerritories` as an array and calls `.includes()` on it; it now throws on a record this code happily produces. The constant's own comment is *"Bump when the RECORD SHAPE changes, so a reader can tell how to parse it"* — and a widened domain IS a parse change. It is not theoretical: `snapshotLicence({ licence: { name: 'x' } }, {})` yields four nulls, and both it and `buildProvenance` are exported. | `PROVENANCE_SCHEMA` is **2**, so a reader can tell. A v1 record now audits as `missing: ['schema']` — the fail-closed direction, and deliberate: "we cannot tell you this is complete" beats a green tick from a parser that read the field as the wrong type. `demo-http-flow.mjs` pinned the literal `1` and now imports the constant, which is the round-15 lesson (a check that names a copy of the artifact can only be right about the copy) in the end-to-end demo. |
| 17 | **The round-17 probe's first draft demanded a normalisation that would have broken the rule** | Section A's third check asserted that `'comfyui / minimax-h3'` — the id with a space around the slash — must be rejected, and it FAILED against the fixed code. It was the probe that was wrong: closing that hole requires deleting ALL whitespace before comparing, which makes `'Wan 2.2'` equal to `wan2.2`, so a provider id without a vendor prefix plus a model name differing only by a space would be **refused at boot**. A rule that refuses the normal case is broken, not fail-closed. | Converted into a CONTROL that pins the boundary and carries the counter-example, so the next reader finds the reason rather than filing the bug. Recorded rather than quietly corrected: it is the **fifth** appearance of "the probe was the defect" in this lane, and the second in a probe written specifically to catch it. |
| 18 | **`verify()` reported `ok: true` for a template that cannot be used** | Its template check was `Boolean(path) && existsSync(path)` — which answers "is there a file at that path", and was read as "is this provider ready". Measured: a file containing `{ this is not json` and a GUI-format export both returned `verify().ok === true` with all three checks green, while every run against either throws. This is the one command whose whole purpose is to be *"the first command run on the render box, by whoever has not finished setting it up"*, and it was answering a different question. | It now calls `loadGraph` — the same function `buildGraph` uses — so the check reports what a run would actually get, and names the file and the code when it fails. A template that is present but unloadable is no longer "ok". |
| 18 | **`verify()` never checked that the binding names a node the template DECLARES** | `SWAN_COMFYUI_NODE_PROMPT=99` against a template containing only nodes `1` and `9` reported `ok: true`. Every run then throws `E_NO_NODE` — but `buildGraph` runs INSIDE `generate()`, which the queue reaches only after the quote was authorised and the job created, so the typo costs a JOB. The check that exists to prevent exactly that could not see it. | `inspectBindings()` compares each SET binding against the loaded graph and reports the node id, the ids that ARE present, and the environment variable to change. The optional bindings get their own line, so a broken duration/seed/image binding is named rather than hidden behind a healthy prompt binding. `buildGraph` and `inspectBindings` iterate ONE table (`BINDINGS`), because two lists would drift and the drift is invisible in the direction that matters — a report calling a configuration healthy that every run refuses. |
| 18 | **`FIELD_CANDIDATES[slot]` walked the prototype chain and returned a FUNCTION** | `FIELD_CANDIDATES['constructor']` is `Object`, so `(FIELD_CANDIDATES[slot] || [slot]).find` threw `is not a function` — a raw `TypeError` where a named refusal belongs, which is the "fails as the wrong answer" failure `wire.mjs` names. Same class as round 6's `VIDEO_PROVIDERS['constructor']` and round 13's `all.callers['__proto__']`, in a third shape. | An `own()` helper (`Object.hasOwn`, with a null guard) replaces every prototype-resolving lookup, and a slot named after an `Object.prototype` member now raises `E_NO_INPUT`. The fallback to the slot's own name is deliberately KEPT, so an unknown slot behaves as it did. |
| 18 | **`'constructor' in node.inputs` was TRUE on every node — which broke the guard's core promise** | The comment above that line says DETECTION, NEVER CREATION, and explains why creating an input is the worst available failure: *"ComfyUI silently ignores an input a node does not declare, so the graph would run at full GPU cost, render whatever placeholder prompt the template was saved with, and report success."* `in` resolves through the prototype chain, so `'constructor' in {}` is `true`. Had the line above it been fixed alone, a prototype-named slot would have been "detected" and the prompt written to a key ComfyUI ignores — the exact failure the guard exists to prevent, introduced by fixing its neighbour. | The `.find` predicate is an own-property test, so a phantom input cannot be detected, and a CONTROL replays the assertion against a source with `in` restored. This is the fourth shape of the prototype-lookup class in this lane, and the first one where the bug was in the GUARD rather than in a lookup table. |
| 18 | **A node id resolving to a prototype member made the code WRITE to a global built-in** | `graph[nodeId]` resolves `graph['constructor']` to a FUNCTION, and `node.inputs = node.inputs || {}` then wrote to it. Measured: `SWAN_COMFYUI_NODE_PROMPT=constructor` created `Object.inputs` on the global `Object` constructor — a mutation of a process-wide built-in, triggered by an operator-set environment variable, from a function whose contract is to be a pure graph helper. It failed closed for the run (`E_NO_INPUT` afterwards), which is why it would not have been noticed. | The node is fetched only when `own(graph, nodeId)` holds, and a value that is not an object is refused as `E_NO_NODE`. The probe asserts the code AND that `Object.inputs` was not created — a control that fails if the write returns. |
| 18 | **`loadGraph` validated JSON *syntax* and never JSON *shape*** | `JSON.parse('null')` succeeds, so a template file containing `null` was returned as a "graph", and the next call ran `Object.keys(null)` inside its own `E_NO_NODE` message and threw `Cannot read properties of null (reading '1')`. A bare array and a scalar parsed the same way. A refusal that cannot say what is wrong is a refusal the operator cannot act on. | `loadGraph` now requires a non-null, non-array object and refuses anything else as `E_BAD_WORKFLOW`, naming the file and what it actually contained. The GUI-format check keeps its own, more specific code. `verify()` reports it too, since it loads through the same path. |
| 18 | **The code-coverage gate was blind to the four modules that raise the most codes** | Round 7's check asks *"of the codes the GATEWAY can raise, which have no defined status?"* — and its `GATEWAY` list contained no adapter module. **Eighteen** codes (`E_NOT_CONFIGURED`, `E_NO_WORKFLOW`, `E_BAD_WORKFLOW`, `E_GUI_FORMAT_WORKFLOW`, `E_NO_NODE`, `E_NO_INPUT`, `E_NO_OUTPUT_PATH`, `E_SUBMIT_REJECTED`, `E_SUBMIT_FAILED`, `E_NO_PROMPT_ID`, `E_NO_REQUEST_ID`, `E_DOWNLOAD_FAILED`, `E_EMPTY_ARTIFACT`, `E_NO_OUTPUT`, `E_GENERATION_FAILED`, `E_CANCEL_FAILED`, `E_TIMEOUT`, `E_NSFW`) had no status anywhere and fell through to 400 — which says *"your request was malformed"* about a graph the caller never wrote. Third appearance of the same lesson in this lane: a green gate can be green because it never looked. | All four adapter modules are in the `GATEWAY` list, and all eighteen codes are mapped to the layer that actually refused — 8 at 500 (our provisioning or our graph), 8 at 502 (the provider failed or broke its contract), `E_TIMEOUT` at 504, `E_NSFW` at 422. The probe writes the expected map out itself rather than reading it back, and asserts the boundary the adapter's own comment draws: a 4xx submit is OUR graph at 500, a 5xx is the PROVIDER at 502. **Reachability is stated rather than assumed** — an adapter refusal reaches a caller as `job.error.code` on a 200 job fetch, so this mapping changes no response today. |
| 18 | **The round-18 probe's own CONTROLS passed vacuously against the pre-fix tree** | Three of them asserted an ABSENCE — "the load is gone", "the `in` test is restored", "the adapter is missing from the list" — by testing that a string was not present. Against the pre-fix tree the string was never there, so the mutation was a no-op and the control passed for the wrong reason: one of them passed *because the defect it was checking for was still in the code*. **An absence assertion cannot tell "removed" from "never there"** — the trap this lane has now walked into four times. | Each control asserts that the mutation CHANGED the source (`mutated !== original`) as well as the absence. Caught by reading the pre-fix control output rather than the post-fix one, which is the whole point of running the control. Recorded rather than quietly corrected, because a control that cannot fail is the defect it was written to catch. |
| 18 | **The README's own file tables had omitted both files this round is about — and a third module besides** | Round 16 found `provenance.mjs` missing from the provider-layer table. Round 18 found `comfyuiLocal.mjs` and `comfyuiGraph.mjs` missing from it: the same gap, in the round whose entire subject they are, and nothing noticed either time. Once section G made it an assertion, the check immediately found a **third** — `promptPolicy.mjs`, 260 lines holding the licensor's content-policy commitment, absent from the table since it was written. Under-claiming is a correctness problem (rule 75), and a table nobody checks drifts silently in the direction that looks like "nothing to say". | All three now have rows, and section G asserts that every module in `shared/providers/video/`, `media-api/` and `backend/scripts/handlers/` has a ROW in the document — 63 modules. **That count was 53 until round 24, and 62 until round 27** — which is the whole
point of the paragraph: the gate derived the number, printed it, and never compared it to this
sentence, so the two were free to disagree for five rounds. Round 24's A2 now asserts every count
this document states against the count the filesystem has. **The check's own first version was vacuous**, and that is worth recording: it asked whether the name appeared ANYWHERE, and the round-17 README satisfied it for both comfyui modules because round 17's narrative names them in a sentence. It passed for the two files whose absence was the defect. It now requires a table row (`| \`name\``), which prose cannot satisfy, and carries a mutation control. One pre-existing handler, `completion.mjs`, is exempt BY NAME with its reason — the lane has never modified it and it is absent from the patch — and a stale exemption fails. |
| 19 | **A graph that RAISED on the GPU was reported as a graph that FINISHED with nothing** | ComfyUI reports an errored run as `outputs: {}` with `status_str: "error"`. `{}` is TRUTHY, so `entry?.status?.completed \|\| entry?.outputs` broke the loop, `findOutputFile` found no video, and the refusal was `E_NO_OUTPUT`: *"ComfyUI reported completion but produced no video output. Check that the graph ends in a video-saving node."* Measured with a fixture whose node raised `CUDA out of memory` — which was sitting in `status.messages` the whole time, in a field no code path had ever opened. | A failed run now raises `E_GRAPH_FAILED`, and the message names the node, its type and its own exception, quoted verbatim. The reporting half is closed; the permanence half is item 21 under "NOT proven", because it lives in the runner. |
| 19 | **The break condition was a truthiness test on a CONTAINER, not a completion test** | `entry?.outputs` is not a question about completion — it is a question about whether the key exists. `{}` is truthy, `[]` is truthy, and ComfyUI emits `{}` for a run that has not produced anything YET as well as for one that raised. So an entry that was still executing on the first poll was read as a finished graph and reported as `E_NO_OUTPUT`. | `terminalState()` answers `pending` / `done` / `failed` from the entry, decides `failed` BEFORE `done`, and consults `outputs` only after `status_str` and `completed` have both been read. The unknown direction is `pending`, deliberately: a false failure abandons a render that is still running, while a false pending costs only the timeout that was already budgeted. |
| 19 | **`completed: true` alongside an execution error was unreachable, because `\|\|` short-circuits** | The two facts are not mutually exclusive in ComfyUI's wire format, and the loop tested `completed` FIRST — so whenever the flag was set the error branch could never run. Measured: the same failing entry with `completed: true` produced `E_NO_OUTPUT`. | The failure is decided first, unconditionally. Pinned by a check that feeds the identical error payload twice, once with the flag clear and once with it set, and requires the same code both times. |
| 19 | **A still-EXECUTING job was read as a finished one** | Same line, different direction: `{ status: { completed: false }, outputs: {} }` — an entry that exists, has not finished, and has an empty outputs object — broke the loop on its first poll and was reported as a graph that finished with nothing. | It is now `pending`, and the run ends in `E_TIMEOUT` with the "still running" wording. The fixture is synthetic and is labelled as such in the probe: the shape is plausible, the measured fact is that the predicate cannot distinguish it from a failure. |
| 19 | **`E_TIMEOUT` asserted "The job is still queued on the GPU" without knowing it** | The message was unconditional. When the history endpoint never answered a single poll, or answered every poll without ever holding the prompt, the code had established the OPPOSITE — that it had no evidence of a queued job at all — and still stated a cause. The same defect as round 16's fabricated provenance field, one file over: a report must not state something it does not know. | The loop now counts what it actually observed (`historyOk`, `sawEntry`) and `describeTimeout()` reports one of three situations: no record at all, an entry that is genuinely still running, or a history endpoint that never answered. The sub-second budget is also printed as milliseconds, because "within 0s" reads as a broken message rather than a short one. |
| 19 | **Two of the round-19 probe's own checks passed on the pre-fix tree** | The first version of the `E.` absence check STRIPPED the offending string from the source and then asserted it was absent — which passes pre-fix, because the strip is what removed it. That is round 18's vacuity one level down: a check that mutates its own subject and then asserts the mutation took effect tests the mutation, not the code. The `D.` disclosure check asked only `isPermanentCode('E_GRAPH_FAILED') === false`, which is false for every string the runner has never heard of — so it passed on a tree where the code did not exist. | The control now runs in the other direction: RE-INTRODUCE the defect into a copy and require the assertion to fail on it. The disclosure now requires the code to EXIST as well as to be retryable. Both were caught by reading the PRE-FIX control output rather than the green run. |
| 20 | **`verify()` called the credential ACCEPTED on the strength of the vendor failing** | The probe is a status GET for a non-existent request id, and the code treated every status that was not 401/403 as proof the credential worked. Measured: a **500**, a **503**, a **429**, a **301** and a **302** each produced `ok: true` with the detail *"host reachable, credential accepted (probe answered 500)"*. This is the first command run on a machine that is not set up, and it answered YES because the vendor was down. Round 18's finding 1, in the other adapter. | A status now proves the credential only if the API reached a DECISION about the request — a 2xx, or a non-auth 4xx. A 5xx, a 429 and a redirect are INCONCLUSIVE, the check fails, and the detail names which of the three it was. `ok: false` is right on its own terms too: a vendor that cannot answer is not a usable provider. |
| 20 | **A rejected credential became a fifteen-minute timeout that asserted billing** | `poll()` treated every non-ok response as a blip, so a status endpoint answering **401 on every poll** spun to the deadline and then raised `E_TIMEOUT` carrying *"The request may still be running and billing."* The code had established the opposite: it had never read a status at all. The credential is identical on every poll, so no amount of waiting can change the answer — and the job spent its whole attempt budget discovering that. | A 401/403 on the status endpoint refuses immediately with `E_POLL_REJECTED`, naming the status and the two variables to check. Every other failure is still a blip, and the timeout now reports what was observed — `describePollTimeout` distinguishes *no poll completed*, *every poll was refused*, *some were*, and *a genuinely slow render*, and only the last keeps the billing warning. |
| 20 | **The credential's destination was never checked for https** | `SWAN_HIGGSFIELD_URL` was used verbatim, so a base URL of `http://` put `Authorization: Key <id>:<secret>` on the wire in cleartext on every request — measured, with the header quoted out of the probe's own recorder. The vendor's authentication page instructs integrators to keep credentials out of anything observable. | `insecureBaseUrl()` refuses a non-https base URL **when a credential is present**, before the header is built, so nothing leaves the process. It deliberately returns null when there is no credential to protect: an http base URL pointing at a local stub is a legitimate way to exercise this module, and refusing it would break the normal case of a test. |
| 20 | **The response body chose what this process fetched** | `findArtifactUrl` returns a string out of the vendor's body and `generate()` issued a server-side GET to it with no validation of any kind, then wrote the bytes to disk. Measured: `http://169.254.169.254/latest/meta-data/` was fetched. A vendor response — or anything that can influence it — picked the target of a request made from inside this process. | The URL must be absolute https, checked before the fetch, with `E_BAD_ARTIFACT_URL` naming what was wrong. The SCHEME is what is checked, not the origin: the vendor may legitimately serve artifacts from a CDN, and an origin allowlist built on infrastructure this lane has never observed would refuse real artifacts. Recorded as a limitation, not as a protection. |
| 20 | **The probe's own fixture never exercised the path it was written to test** | Section D's first version built the completed status body as `{ status: 'completed' }` — without the artifact URL in it — so `findArtifactUrl` returned `null` and the run ended at `E_NO_OUTPUT`. The section would have measured the wrong branch entirely and reported the unvalidated fetch as "not reached". Caught by reading the fixture against the code path before the control run rather than by a vacuous pass, which is the cheaper half of the round-19 lesson: a check that cannot reach its subject is the same defect as one that cannot fail. | The fixture now carries `video: { url }` so the URL reaches `generate()`, and the `E_NO_OUTPUT` control passes `{ video: null }` explicitly — the two branches are now separable, which is what the section needed to be. |
| 20 | **Two hand-written counts in the prose had drifted, and nothing read them** | The closing block said "the same **55**-file list" while the same paragraph said "**58 files**" twice. 55 dated from the round when the patch held 55 files and had survived **three rounds** (round 18 was 57 files, round 19 was 57, round 20 is 58) because no assertion had ever read this prose. The gate-16 section carried a second instance: it said "the assertion total is **936**" — round 19's total — while its own parenthetical, *853 + 59 + 24 + 32*, summed to 968. The round-20 update corrected the total in two places and missed the third. Both are row 18's defect in a new costume: a hand-written count with no assertion over it drifts silently in the direction that reads as "nothing changed", and a reader reconciling the block against the artifact finds two different numbers in one paragraph with no way to tell which is the receipt. | Both counts are corrected, and round 18's section G now asserts them — **G2** requires the closing block to state ONE file count in all three sentences that mention it, **G3** requires the modified/new split to add up to the total, and **G4** requires the stated assertion total to equal the sum of the parts its own parenthetical lists. All three are checkable **without git**, deliberately: the patch is generated after this document and does not exist in the clone, so a git-derived count would be green in the worktree and red in the receipt — the exact failure the apply-to-a-fresh-base ritual exists to prevent. The **byte** count stays approximate and the document says why; the file count has no such excuse. The new control also had to be written carefully: it re-introduces a stale count into a copy, and **it failed on the first run** because the document already contained the defect, so the mutation was a no-op — which is the rule that a control must assert the mutation CHANGED the source, catching its own author. |
| 21 | **`record()` laundered a ledger it could not read, and the next free run re-enabled billing** | The READ half was hardened over four rounds: a truncated file, a misshapen day and a count that is not a count each degrade the ledger and refuse billing. The WRITE half was never attacked, and it undid all three. `read()` returns `{}` for a corrupt file, and `record()` wrote `{...{}, [day]: next}` — a file that parses, carrying one day, with every other day gone and the corruption invisible. `degraded` cleared and billing resumed against a counter rebuilt from nothing. This is reachable from the lane the refusal deliberately leaves open: **the free local path still runs while degraded**, and its first `record()` is the laundering. Measured: $40 recorded of a $50 ceiling, file truncated to `{`, ONE free local run, then a $12 billing run admitted. | `record()` will not write over a ledger it could not read, and returns `null`. Not recording costs nothing already lost — while degraded, `usageFor` reports zero, so the volume ceiling already cannot bind — and it keeps the corrupt file visible until a human does what the error message already says: repair it or delete it. |
| 21 | **A day whose totals could not be read was replaced by totals this code invented** | `all[day] \|\| { runs: 0, spendUsd: 0 }` followed by `Number(rec.runs) \|\| 0` reads a string as an empty record and `"many"` as `0`. So a day record of `'yesterday-was-busy'`, `[1,2,3]`, `-5` or `'many'` was overwritten with a fresh count — and the replacement parses, so `degraded` cleared. One level below the row above, and the same defect: a value the reader refuses is one the writer went on to replace. | `dayRecordIsTrustworthy` is now ONE predicate both halves call, so they cannot drift — the same move `licenceTerms.mjs` makes for the licence vocabulary. `record()` refuses a day it cannot read; `usageFor` still refuses to return it as a count. |
| 21 | **The 30-day trim silently discarded the day it was recording** | The trim sorted descending and sliced 30, so a day outside the window vanished while `record()` still returned its total and `usageFor` then read `0/0` with `degraded: false`. Two ways in. The obvious one is a backdated day with 30 newer ones present. The one that matters is **30 future-dated days planted in the file**: those are valid JSON holding valid counts, so the file is not corrupt and nothing degrades — today's usage is evicted on **every** write and the ceiling never accumulates. The anti-truncation fix detects a file it cannot **parse**, not one that **forgets**. | `trimKeeping` always retains the day being recorded, displacing the oldest retained entry instead of the newest. Retention is still 30. Today's row is the one the ceiling is computed from; the oldest row is the one that answers no question this guard asks. |
| 21 | **A ledger write that failed became a failed render — and an unwritable ledger read as a fresh day forever** | `record()` runs at `generateVideo.mjs:207`, **after** `adapter.generate` has returned, and its `fs.writeFileSync` was unguarded. A ledger path whose directory does not exist (or a read-only disk, or EACCES) threw ENOENT out of a completed job — for a billing provider the vendor had already charged. And because ENOENT is deliberately excluded from `degraded`, the same path read as a fresh ledger on every subsequent request: the ceiling never bound **and** every job failed after succeeding. | The write is caught, and a write that does not land sets a **sticky** `writeFault`, so the ledger degrades and the next billing run is refused while the free lane keeps running — the asymmetric degradation this module already uses for a read fault, applied to the write. Two faults are tracked separately on purpose: a read fault is recomputed every read, because a repaired file must stop being degraded, while a write fault cannot be cleared by a read, because the file being parseable says nothing about whether the spend was recorded. |
| 22 | **`authorized()` threw instead of refusing when it could not read the request** | `req.headers.authorization` raised a TypeError when `req.headers` was absent. An auth check that throws is not a 401: `server.mjs` catches it and answers **500** with a stderr line, so "I cannot tell whether you are authorised" and "the gateway broke" became the same response. The file already states the governing principle about its own `token` argument — *a guard that only holds because of a caller's precondition is not a guard* — and applied it to `token` but not to `req`. | A request carrying no headers presented no credential, so it returns `false`. The three real decisions (right token, wrong token, missing header) are unchanged and asserted. |
| 22 | **`readBody()` reported success on JSON the routes cannot dereference** | `JSON.parse` accepts `null`, a number, a string, a boolean and an array, and every one of them was resolved as a valid body. `null` is the one that bites: `server.mjs:218` hands it to a route, the route reads `body.provider`, and the TypeError surfaces to the caller as **500** where a body this gateway cannot use is **400 E_BAD_JSON**. Measured through the real `createQuote`, not described. A parse layer that reports success on input its own consumer cannot use has not finished its job. | Only a plain JSON object is accepted; everything else is `E_BAD_JSON`, naming what arrived. Arrays are refused with the scalars because `typeof []` is `'object'` and no route in this gateway takes a list. |
| 22 | **`send()` could have its own envelope taken away by the caller it exists to constrain** | The docstring says the function exists so that *no route invents its own envelope*, and `...extraHeaders` sat **last** in the header object — so a caller passing `content-type` or `content-length` replaced both. Measured: `content-length: 999` on a 7-byte payload, which either truncates the body or desynchronises the next response on a keep-alive socket. | Caller headers are applied first and the two invariants overwrite them, so extra headers still work (`server.mjs` sends `connection: close` on a 413) while the fields this function owns cannot be removed from it. |
| 22 | **`safeEqual()` called two ABSENT values equal** | `Buffer.from(String(undefined))` is the nine-character string `"undefined"` on both sides, so `safeEqual(undefined, undefined)` was `true` — as were `(null, null)` and `("", "")`. "Neither side supplied a value" read as "the values agree". Unreachable through `authorized` only because that function validates `token` first: the token bypass this file already fixed, reached through the other argument. | Both arguments must be strings. Equal strings still compare equal, different strings still do not, and a length mismatch is still a mismatch without throwing — all three asserted. |
| 21 | **The close-out: round 20's count assertions covered one block, and the other drifted** | Round 20 asserted the file count in the **closing** block (G2/G3) and the assertion total in the gate-16 sentence (G4). The **re-verification** block states the same file count in five more places, and round 21 had to correct all five by hand — they said 58 while the closing block said 59, with every gate green. It is the round-20 finding one more time, in the block that finding did not reach: **asserting a count in one place does not cover the other places it is written.** | **G5** requires the re-verification block's count to equal the closing block's, in all six places, with a mutation control in the re-introduce direction. The lesson generalises: a self-consistency check has to be TOTAL over the places the fact is stated, not over the one the author happened to be editing. |
| 23 | **`mimeForFilename` resolved an extension through `Object.prototype`** | `MIME_BY_EXT` is a plain object literal — `Object.freeze` does not remove the prototype — so `MIME_BY_EXT[ext]` is not a miss for a name that lives on `Object.prototype`. Measured: `mimeForFilename('out.constructor')` returned the **`Object` constructor, a function**, and `('out.__proto__')` returned `Object.prototype`. Both are truthy, so `completionBody`'s `\|\|` passed them through, and `JSON.stringify` then **dropped the key entirely** — the queue received a completion body with **no mime at all**. Only names that are already lowercase can reach the prototype, which is why the obvious probe (`a.toString` → `tostring`) came back clean and hid this. The same class round 18 fixed three times in `comfyuiGraph.mjs`, in the one module the file-table check had formally exempted. | `Object.hasOwn` for the lookup, plus a type assertion, because the value goes into a JSON body (which drops a function) and an HTTP header (which stringifies one). Probed TOTAL over `Object.getOwnPropertyNames(Object.prototype)` rather than over the two names that happen to work, so a hand-written list cannot drift. |
| 23 | **`completionBody` used `\|\|` where a TYPE was required** | `\|\|` answers "is it absent", and a function is not absent — so the fallback that reads as "a string is guaranteed here" guaranteed nothing. Its sibling `r2Key` had the same shape, and a non-string there serialises away just as silently. | Both fields go through one predicate, `str(v)` — a non-empty string or `null` — so "undeclared" and "wrong type" reach the same fallback and the payload always carries a usable string. |
| 23 | **`completionSummary` shipped the exact string its own header indicts** | The docstring says `offset undefineds usable=undefined` is *"worse than silence, because it reads as a measurement that ran and failed"* — and then leaves that expression as the default for any handler that declares no summary. The `??` fix only helped callers that already declared one, and `render-agent.mjs:262` prints this unconditionally to the operator log. | The offset line is reached only when **both** of mediasync's fields are present; otherwise the line names the gap (`no summary declared by this handler`). No test covered the absent case, so nothing could have caught it — the round adds those cases, including `summary: ''` and a whitespace summary. |
| 23 | **The ledger's own totals had drifted, and the assertion covered only some of them** | Round 21's **G5** made the *file* count total over all six places it is written, and left the **gate count** and the **defect total** with no assertion at all. Both had drifted: the patch paragraph said *"twenty-seven gates"* while three other sentences said twenty-eight, and the rounds table held **83 rows** under a sentence claiming **70** — rounds 21 and 22 added nine rows and never moved the number. A third instance sits one paragraph away: the gate-16 total was corrected in two places and missed a third. | Round 23's section **E** asserts the gate count in every sentence that states it, requires it to equal the number of commands the receipt itself lists, requires the defect total to equal the table's own row count, and requires the stated assertion total to equal the sum of the parts the receipt lists — each with a re-introduce-direction control. The broader draft ("every sentence stating the total agrees") was **narrowed, not kept**: it fired on row 20's narrative, where `936` is a *quotation of a corrected defect* rather than a live claim, and a guard that fires on the document's own account of a fixed bug is a guard the next author deletes. Recorded as a rejected rule so it is not re-proposed as a gap. |
| 24 | **The document stated a module count that nothing compared to the filesystem** | This document said *"section G asserts that every module in `shared/providers/video/`, `media-api/` and `backend/scripts/handlers/` has a ROW in the document"* and gave the count as **53**. Measured: **59** — and 60 once this round's own probe exists. The historical number is written here **without the noun**, deliberately: A2 reads every plain statement of the form *N* + "modules" as a live claim, so a quotation that kept the noun would be a second claim and would fail the check that this row is about. The probe's own header predicted that trap before the row was written, and the row walked into it on the probe's first run — see the row below. Gate 25 derives the count, asserts only `modules.length >= 45`, and **prints** the live number. So the gate was right, the document was wrong, and the two were free to disagree for five rounds. The drift is +6 in the under-claiming direction, which rule 75 calls a correctness problem rather than a cosmetic one. | Round 24's A2 asserts every count the document states against the count the filesystem has; A3 ties it to the table's own row count; A4 reads gate 25's **source** so the two directory lists cannot drift apart; C1 and C2 are the re-introduce and the remove controls, and C4 is the totality control C2's own first version turned out to be missing. The number is corrected as well — but correcting a number has been the fix four times in this lane and it is not the fix. **The shape of the check was the defect:** a derived value never compared to the document's stated value is not a check on the document. Round 23's section E made the gate count, the defect total and the assertion total total over every place they are written, and stopped one surface short of this one. |
| 24 | **A whole gate's assertions were missing from the headline total, and every check stayed green** | `smoke-adapters.mjs` ran **15** checks and printed a bare `ALL CHECKS PASSED` with no number on it. The total is the sum of the countable numbers the receipt lists, so it added **nothing** for that gate: thirty gates counted, twenty-nine summed, and the omission had been there since the total was first written. | The gate now prints `ALL 15 CHECKS PASSED` — the shape `demo-http-flow.mjs` and `hostile-http-probe.mjs` have always used — and round 24's **A6** asserts that every gate command in the receipt contributes exactly one countable number, so the next gate to print an uncountable summary fails a check instead. E2 compares the commands to the stated GATE count and E4 compares the stated total to the sum of the PARTS; neither can notice a gate that contributes no part, because both are arithmetic and this was a **scope** error. The base in the gate-16 sentence moved from 853 to 868 for the same reason — it had inherited the omission. A total can be arithmetically perfect and still be wrong about what it counts. |
| 24 | **A probe's table row stated a check count that the receipt contradicted** | The table row for `hostile-round23-probe.mjs` read **"43 checks"** while its own receipt line read **49**. The same fact written in two places, read by nothing, drifted by six — inside the very table this round's section B asserts. | Round 24's **B3** asserts that every probe the receipt states a count for states the same count in its table row, and **fails** on a probe that has a receipt line and no row rather than skipping it. Section B1 and B2 compare rows to the FILESYSTEM; neither can see a number written *inside* a row disagreeing with a number written inside the receipt. This is round 21's G5 rule — a self-consistency check must be total over the places the fact is stated — applied to a count nobody had thought to enumerate, and it is the first time in this lane that a new check found a defect the round was not looking for. |
| 24 | **The round-24 probe failed its own first run in three ways, and two of them were defects in the probe** | The gate was written to catch a derived value that is never compared to what it should be, and its first real run caught three of its own. **(a)** A2 fired on **this document's own narrative**: row 24 quoted the corrected count **with the noun attached** — the plain form A2 reads as a live claim — and failed on it. The probe's header had **predicted** that exact trap before the row existed, naming a round-24 narrative that reproduces the corrected count in that form as the case that would create a second claim and fail the check — and the row walked into it anyway. **The header's own example sentence broke the convention as well** and had to be rewritten: the first statement of the rule was also its first violation, which is recorded here rather than quietly tidied, because it is the same "the author of the check was the first to break it" shape as round 20's control that fired on the document's existing defect. **(b)** A3 printed `stated 60, derived 60, rows 60 — all three agree` **on a failing check**: its predicate is `claims.every(...)` but its detail printed `claims[0].value` and derived the suffix from `rows.length` alone. A check whose own account of the facts is false is worse than one that merely fails, because the reader trusts the detail line over the verdict. **(c)** C2's mutation was `doc.replace(/\s*—\s*\d+\s+modules\./, '.')` — non-global and anchored to one shape — so with two occurrences it removed **one**; the predicate correctly failed while the diagnostic, a two-branch ternary on `removed === doc`, printed the **success** text. A partial mutation reported as a clean one is the defect this control exists to catch, committed by the control. | **(a)** The row now quotes historical counts **without the noun**, and the alternative — narrowing A2 to skip quoted spans — was rejected for the same reason round 23 rejected narrowing its E4: a guard that has to guess which sentences are real is a guard the next author deletes. **(b)** A3 names every **distinct** stated value and derives its suffix from all three conditions rather than one. **(c)** C2's mutation is **total** over the population the check reads — the same regex, applied globally — and its diagnostic has the three branches the situation actually has: no-op, partial, clean. **C4 is new, and is the control the bug revealed was missing**: it re-introduces a **second** plain-form claim and requires A2 to fail on it, because nothing in this file had asserted that A2 is total over more than one statement — A2 could have been implemented as "the first claim matches" with every other check still green. This is round 21's G5 rule, *a self-consistency check must be total over the places the fact is stated*, applied to a control rather than to a guard; and it is the second defect in two rounds found by a check the round was not looking for. |

| 25 | **`E_GRAPH_FAILED` is a MIXED code, and the one-line fix for the cost defect was the wrong one** | Round 19 disclosed that a graph that fails identically every time is worth another full GPU render on each attempt, and filed the decision as the runner's. The obvious fix — add `E_GRAPH_FAILED` to `PERMANENT_CODES` — would have made **`CUDA out of memory` permanent**, and OOM is the canonical `E_GRAPH_FAILED` *in this lane's own round-18 fixture*. OOM is a fact about the MOMENT: another process may release VRAM, fragmentation differs, a retry can genuinely succeed. The file's own header says the inverse error is "just as bad" — a wrongly-permanent code throws away a job that would have succeeded. Measured cost of *not* fixing it, on this box: **80.1s** for the 4-step turbo graph, **387.7s** for the long one, so three attempts is 4 to 19 minutes of a 5090 spent reproducing an answer the graph already gave. | The code is **mixed**, so it is not classified by code at all: `failureIsDeterministic()` decides per **instance** from the node's own exception, and the adapter sets `permanent` there — where the information actually is. `E_NO_OUTPUT` is the opposite — not mixed, because it is reached only after `terminalState` says the graph FINISHED — so it **does** join `PERMANENT_CODES`. Two codes, one disclosure, two mechanisms, and **the asymmetry is the finding**: a reader who "finishes the job" by adding the code to the set breaks the OOM case, and round 18's section E now fails if they try. No new error code, no status mapping, no change to `wire.mjs` — permanence is carried by `permanent`, which the public envelope already projects as `retryable`. |
| 25 | **The classifier's two error directions are not symmetric, and the guess is aimed at the cheap one** | Any classifier of "permanent vs transient" has to be wrong sometimes. Getting it wrong in one direction costs GPU time; getting it wrong in the other throws away a job that would have succeeded. Nothing in the code said which direction it was willing to be wrong in, and the first draft of the classifier got it wrong in the expensive one: it classified by exception **type** alone, so a node wrapping `CUDA out of memory` inside a `ValueError` would have been called permanent and the job lost. | **Default RETRYABLE**, and the type list is **closed**. Only an explicitly-named deterministic type, with no transient marker anywhere in its message or type, is called permanent; an unrecognised exception keeps its retry, and a transient marker **beats** a deterministic type. So the classifier can only be wrong in the direction that costs time. The cross-product is asserted rather than a hand-picked pair: the type list and the marker list are both read out of the module's **own source** and every pair is checked, so a type or marker added later is covered without anyone remembering to update the check. |
| 25 | **An interrupted run's message PREDICTED the outcome, and the prediction was the opposite of the classification** | `describeFailure` ended *"a re-run will be cancelled again"*. That is a prediction the code cannot make — whoever cancelled may have been freeing the GPU for one run, or may have stopped — and it is round 16's fabricated-provenance defect in a different file: a report asserting something it never established. It was also **self-contradictory** with the new classification, which calls an interruption retryable precisely because it is an action taken by somebody else. | The sentence now names the interruption, says it came from outside the graph, and states what to check **without** predicting the result: *"if that actor is still active, the next attempt will be cancelled too."* Recorded rather than quietly reworded because the classification and the message had to be made to agree, and the message was the half that was over-claiming. |
| 25 | **The round-25 probe's own controls could not fire, twice, and its fixture could not reach the code under test** | Three first-run failures, all in the new gate. **(a)** The fixture graph was `{1: KSampler, inputs:{seed}}` with no prompt-carrying input, so the adapter refused with `E_NO_INPUT` before reaching the failure path — **round 20's defect** ("the fixture never exercised the path it was written to test") committed again, and it made four checks fail for a reason that had nothing to do with their subject. **(b)** The first two drafts of control D1 removed one rule at a time and **neither fired**, because OOM is held retryable by *two* independent rules — the transient-marker test and the closed type list — so removing either alone changes nothing. That is "a control that cannot fail is not a control", and it caught the author of the check. | **(a)** The fixture now uses round 18's graph shape, and the check says why. **(b)** D1 no longer pretends a single mutation is enough: it asserts the **redundancy** — marker removed, still retryable; type gate removed, still retryable; **both** removed, OOM flips to permanent — so the control fires and the property it measures is stronger than the one originally intended. **D0** was added for the same reason: the mutation controls rebuild the classifier from the module's own source, so D0 proves the rebuild is faithful **before** any control is believed. A control against a different function than the shipped one tests nothing. |
| 25 | **The file count was stated in prose and derived nowhere — the sixth appearance of one class, and this time it was sixteen files** | Round 23 made the defect total arithmetic; round 24 made the module count arithmetic. The handover's file count was the third number of the same shape and it was still pure prose: it read **63 files** where the change set against the documented base is **80** — the modified set was right at 9, and the new-file count was 54 against an actual 71. Rounds 18–24 added sixteen files and never moved the number, and no gate read it — so it was free to be wrong for seven rounds. Round 24's own commit message records that the first four occurrences of this class were each "fixed" by editing the drifted number, which is the trap this round refuses. | The number is corrected **and derived**: gate 31's E1 reads the base SHA **out of the document itself**, runs `git diff --name-status <base>` plus untracked files, restricts the set to the lane's own directories, and requires every live statement of the count to equal it. The restriction is load-bearing rather than cosmetic — this worktree is a **sparse checkout**, so an unfiltered diff reports ~13,000 paths as deleted that are simply not checked out. E2 is the control. It is **narrowed to the LIVE claims only**, because the document carries eight bolded file counts and five are historical: a check that fires on round 11's 23, on a later 35, or on a quotation of round 20's 58 is the trap round 23's E4 already had to be narrowed for. **This row is itself the proof of that rule** — its first draft wrote the old value in the live-claim form, and E1 fired on it immediately. The fix was the prose, not the guard. |
| 25 | **A gate compared a historical RECORD to a live CLAIM, so staying green required falsifying the record** | Gate 18's G5 asserted that the re-verification block's file count equalled the closing block's. Three of the numbers it read (`#   63 files changed`, `wc -l -> 63`, `-> 63/63`) are the **printed output of one run** against a patch generation that round 23 established no longer exists on disk. Once the live claim moved to 80, G5 could only stay green if the run's own output was rewritten to 80 — that is, if a record of what a command printed were edited to say something it never printed. Round 25 had annotated that block to say its numbers are deliberately not updated, and G5 was still demanding the opposite. | G5 now compares the block's **live** sentence against the closing block's three claims — round 21's lesson ("asserting one block does not cover the others") kept intact — and leaves the record alone. Its control still fires: reintroducing a stale count into the live sentence makes it fail. The rule this adds to the lane's set: **a check must know which of the numbers it reads are claims and which are receipts**, because the two drift in opposite directions — a claim is wrong when it lags, a receipt is wrong when it is updated. |

Round 7 was built to be the dry pass and was not, so Round 8 was. **Round 8's first run found no defect
in the code at all** — all three of its failures were the probe asserting something the code
deliberately does not do. That is what a dry pass looks like, and the three are worth recording
because each one nearly became a false accusation:

| Round 8 assertion | Why it was wrong |
|---|---|
| "a valid free local request passes the gates" | The probe passed `env: {}`, so nothing was enabled and everything returned `E_PROVIDER_DISABLED`. An unset `SWAN_VIDEO_PROVIDERS_ENABLED` enables nothing — the fail-closed reading. The probe was wrong about the default, not the code about the gate. |
| "provenance carries the prompt HASH, not the prompt" | Provenance carries **both**: up to `PROMPT_KEEP_CHARS` (500) of the prompt for human review, plus a sha256 of the *full* prompt. Deliberate and documented. The check now tests the BOUND — including that the recorded hash is of the full prompt, so a truncated slice cannot reproduce it. |
| "an empty prompt is refused as INPUT, before any licence question" | Licence precedes input shape, and that is **correct**: a commercial request against H3 is unlawful whatever the prompt says, so telling the caller to fix their prompt would be true and useless. The probe now asserts the order that exists, both ways. |

Round 8 also confirmed three things it was designed to be able to falsify: the body cap is
off-by-one-safe (exactly 262,144 bytes accepted, 262,145 refused **with a deliverable parsed 413**),
the quote store's expiry is an exclusive bound evaluated on read and pruned on write, and the gate
order is enablement → licence → input shape.

### Rounds 9, 10 and 11 — what the loop found after it had already gone quiet

Round 8 was dry, and a single dry pass can be luck. Round 9 attacked surfaces no earlier round had
touched — the ledger **read back**, quote ownership in every state, the route table *as a table*, the auth
primitive driven directly — and found two defects, which is the honest reason round 10 exists. Round 10
then took the runner: the detached promise that turns a 202 into a terminal state. Round 11 took the
licence and enablement layer, which every earlier round had exercised only indirectly.

**Round 11 is also the clearest case in this document of a hostile reviewer being wrong**, and it is
recorded because the failure mode is the one this loop keeps producing. Its first draft asserted that a
`requires-grant` row must demand a grant in *every* territory, and the change was made on that basis. The
registry suite caught it immediately — **63 tests went to 62 passed, 1 failed** — on a test that had been
sitting there the whole time:

```
it('permits the same model outside the excluded territory', ...)
```

The licence restricts *running the weights in an excluded territory*, and the catalogue row says so in its
own comment. Over-restricting is a defect too, and a hostile probe can assert the wrong invariant with
exactly the confidence it asserts the right one. What saved it was a pre-existing specification, a gate
that runs the *whole* suite rather than the part the change touched, and reading the failure instead of
explaining it away.

The real defect was narrower and was in a different place: the **source** of the territory. It came from
the request. Section A now pins *that* — the request may narrow the licence position, never widen it.

Round 10 measured two things rather than assuming them, and both are now pinned by assertions so they
cannot quietly change:

- **The cancellation window is zero-width.** `POST /v1/jobs/:id/cancel` can only ever refuse.
  `createJob` calls `runner()` *before* the 202 is written, and the runner's first act is a microtask
  that sets `running`; Node drains microtasks before it reads another request off the socket. So the
  202's `state: "queued"` is true at the instant it is written and **stale on arrival** — 12 submissions
  each followed immediately by a cancellation produced **0 successes**. This is not a bug in the branch:
  the branch is correct and becomes reachable the moment dispatch is queued rather than immediate. But
  the endpoint can only refuse today, and that is now stated in the code and under "NOT proven".
- **A runner that never settles leaves the job non-terminal** until the next boot's `reconcileOrphans`
  marks it `E_ORPHANED`. Deliberate — a local render may have finished and a hosted one may have been
  billed, so declaring failure is the weaker claim. Recorded, not fixed.

Round 9's disclosure corrects a *claim* rather than a behaviour, so it gets its own line: **while the
ledger is unreadable, the VOLUME ceiling cannot bind either.** `usageFor` reports today's usage as zero
runs, so the free path runs with no volume bound at all. That is the deliberate half of the asymmetric
degradation — a bookkeeping fault must not become an outage for the zero-cost lane — but it means
`spendGuard.mjs`'s "there is always a cap" was false, and the header now says so instead.

Five of these were **defects in the probes themselves**, corrected rather than papered over, and worth
recording because the pattern recurs:

- Round 2's raw request builder omitted the blank line terminating the header block, so **six checks
  passed vacuously** ("the server answered no response" — it was still waiting for headers). Every
  section now carries a control that proves the legitimate case works before asserting the bad one is
  refused.
- Round 6's section D asked "does every catalogue row have an adapter?" and failed on
  `minimax/hailuo-hosted`. `VIDEO_PROVIDERS` spreads the hosted rows in, so `Object.keys()` is the whole
  catalogue, not the local rows. The invariant that matters is not "every row is wired" but "everything
  the API *offers* is wired".
- Round 6's per-caller-ceiling check matched the word "caller" inside a comment and failed on prose.
  A source-text assertion has to test the code, so comments are stripped first — the same
  substring-sweep mistake round 5 made twice (`E_GRANTS` inside `SWAN_VIDEO_LICENCE_GRANTS`).
- **Round 6's source-text assertions assumed LF line endings.** `catalogue.mjs validates every row at
  MODULE LEVEL` passed in the worktree and **FAILED on the patched base** — because `git apply` writes
  through `core.autocrlf`, so the same commit checks out CRLF there. The regex used a literal `\n`,
  and `{\r\n` is not `{\n`. Found only because the patch verification ran the *full* gate set rather
  than the subset that happened to be in the patch. Both source-reading probes now normalise line
  endings at the read. The general lesson: **a source-text assertion is a claim about a file that
  exists in two byte forms in this repo**, so it must be line-ending agnostic.
- **Round 1's probe was flaky, and its failure message lied.** Roughly one run in ten it aborted with
  `TypeError: fetch failed` after 9 checks and printed `1 of 9 CHECKS FAILED` — which reads as "eight
  passed" when in fact **fifteen checks never ran**. Two fixes: the abort now prints the full
  `err.cause` chain (the underlying `read ECONNRESET` was being discarded, which is why it was
  undiagnosable), and an abort reports `ABORTED — N check(s) ran … the remaining checks NEVER RAN`
  instead of a failure ratio.

  The cause is worth stating because it is **not** a server defect. The harness's test adapter renders
  with `spawnSync`, which blocks the event loop; while it is blocked the server's 5s `keepAliveTimeout`
  closes the socket undici had pooled, and the next request lands on a closing connection. Closing an
  idle keep-alive socket is what every HTTP server does, and the blocking is a property of the
  *harness* — `comfyuiLocal.mjs` and `higgsfield.mjs` are async HTTP clients. So the fix is a narrow,
  **reported** retry for idempotent methods only (a silent retry can hide a real failure; a retried
  POST is a double submission). Verified with two injected controls: a forced GET reset is retried once
  and reported, and a forced POST reset still aborts loudly. **88 consecutive clean runs** afterwards,
  including three full eight-probe passes under load.

### Round 13 — the round-12 code, attacked as new code

Round 12 added ~490 lines and every one of them was covered only by probes written in **this lane, in
the same round, by the same author.** That is the blind spot round 12 had just finished documenting one
level up ("the three verifications the handoff named point at two other suites, and every probe was
written by this lane"), applied to itself. A green round-12 run says the author's model matches the
author's tests. It does not say the model is right.

So round 13 asked the question round 12 never asked. **Every ceiling in this lane is
one-directional — it can only refuse.** A probe that tests refusals therefore cannot see a bug that
refuses too much, and a bug that refuses too much does not look like a bug in review: it looks like
fail-closed, which is the property this lane keeps being praised for. It shows up as a feature that
does not work the day it is switched on. Three real defects came out of asking it, and the worst one
was exactly that shape.

**1. The per-caller ceiling admitted only callers the ledger had already seen.** Round 12 read an
absent caller as an unknown share and refused — right for a day with no split, and wrong for a day
whose split is complete. The two are **decidable**: `record()` writes an entry for every caller it
sees and increments the day's total for every run, so `sum(callers[*].runs) === runs` means the split
accounts for the whole day, and a caller absent from a complete split has provably used nothing.
Round 12 collapsed both into the conservative reading, so **the second caller of any day was refused
for the rest of the day.** The feature was unusable for its stated purpose. Its refusal message also
said "no per-caller split" about a day that had one — a false statement in an error string, which is
the one place a caller reads a deployment's reasoning off the wire.

The fix reconciles the split against the day's total. Reconciled → an absent caller is a known zero.
Not reconciled (no split, an unattributed run, or an unreadable entry) → refused, with a message that
names *which* unknown it is. A malformed entry for the caller themselves is refused unconditionally,
so tampering cannot reset a caller to zero and hand back their whole ceiling.

**2. The per-caller spend cap compared money in binary floating point.** `0.1 + 0.2` is
`0.30000000000000004`, so a caller landing **exactly** on their ceiling was refused. Astra's standing
ruling for this lane is *"never binary floating-point money arithmetic"*; the global guard and the
per-job ceiling both honour it in integer micro-dollars, and the per-caller cap — added in round 12 —
was the one place that broke it. The error direction is over-restrictive rather than money-losing,
which is precisely why no earlier probe found it: every probe asked whether money could leak, and this
leak runs the other way. All three values now snap to the micro grid, so `300000 > 300000` is false and
a one-micro overshoot is still refused.

**3. A cap that overflows to `Infinity` silently disabled the ceiling.** `optionalCapFrom` already
rejected a non-numeric cap with `E_BAD_CAP` — and a **digit-only** string passes that test.
`Number('9'.repeat(400))` is `Infinity`, and the value lands where it does the most harm: `callerScope()`
returns `null` when neither cap is finite, and `callerRefusal()` reads a non-finite cap as
unconfigured. **An operator who set a cap got no cap**, with no error — the exact "typo reads as unset"
outcome the existing check exists to prevent, arriving through the one shape it does not cover. One
keystroke-hold was the whole distance between "enforced" and "absent".

A fourth finding was real but low: a caller named `constructor` or `__proto__` resolved through the
prototype chain — `Object.prototype` **is** an object, so it passed the bare `typeof` shape test and
was read as a recorded entry. It failed closed, but by accident, and it is the same class round 6
fixed on the provider catalogue. `Object.hasOwn` now guards both the gate and the ledger's write path.

And a fifth, which is about this document's own discipline: **closing those three defects pushed
`ceilingGate.mjs` to 347 lines, past rule 4's cap.** Splitting it moved the per-caller code into
`callerCeiling.mjs` — and section H of the round-6 probe failed **two** checks immediately, because it
asserted where that code *used* to live. That is the third time this class has bitten this lane. It is
recorded as a defect rather than a nuisance for one reason: **the probe caught it, and the probe's own
control caught it too.** The apparatus worked. Section H now reads the file the code lives in, and both
it and gate 17's control gained an assertion that the re-export bridge exists, so the split cannot
silently become a copy in one file and a stale assertion in the other.

**A defect that was found and deleted, recorded because the deletion is the point.** Round 13's first
draft claimed `jobRefusal`'s `charge === 0` short-circuit was reachable with a sub-micro charge. It is
not, and the reason is worth keeping: a rate below `1e-6` stringifies to exponent form (`String(4e-7)`
is `"4e-7"`), `spendGuard.costFrom`'s plain-decimal test rejects exponent form, and so the rate returns
`Infinity` and is refused before any ceiling sees it. The string form `"0.0000004"` *would* pass that
test — and `assertSpecShape` requires `costPerRunUsd` to be a **number**, which is what keeps it out.
**The hole is closed by two other files, not by `ceilingGate`.** Section C asserts that coupling, so
relaxing either one fails the probe rather than quietly opening a fail-open path. A guard whose safety
rests on another file's regex deserves an assertion, not a comment.

### Round 14 — the licence gate, attacked where it fails OPEN

Rounds 9–13 hardened money. Every one of those failures costs dollars and is recoverable, because a refused run can be re-run. **The licence judgement is the one decision in this lane whose failure mode is legal**, and a permissive answer is not recoverable by retrying — it is recoverable by un-shipping a video. Round 11 rewrote it, but before the ceiling work, and it was rewritten to close a hole that was reachable over HTTP. That is the wrong reason to trust the rest of it: a fix aimed at one reachable hole says nothing about the ones nobody tried.

Round 13 asked whether the ceilings refuse things they should **not**. Round 14 asks the mirror question of the licence gate: **what does it do with a value it has never seen?** Every guard in it can only refuse, so anything the guards do not recognise falls through to PERMITTED — and a probe that tests its refusals cannot see that either. The same blind spot, pointed the other way.

The answer, once per field the gate reads, was that each one is the same mistake: a field the gate treats as a known, enumerated fact while nothing constrains what may be written into it. `commercialUse` was a closed vocabulary in an open string. `evidence` was an exact match on an unvalidated field. `licence` had to exist but never had to be an object. `excludedTerritories` was `.includes()`d whatever the type. The four rows above are the consequence.

**The headline is the one that is about this document's own instructions.** `catalogueHosted.mjs` tells the operator exactly how to clear the hosted refusal: retrieve the vendor's terms, set `commercialUse` to what they actually say, and drop `evidence`. Section A7 of the probe performs that edit — the catalogue's own instruction, verbatim — with the terms reading *prohibited*, and asserts the row is still refused. Before the fix it was **permitted**. A gate whose documented clearing procedure is also its documented bypass is worse than no gate, because the operator following the instructions believes they have done the careful thing.

The fix's shape matters more than its size. `licenceTerms.mjs` holds the vocabulary as **data**, imported by both the validator and the judgement, for the reason `provenanceTags.mjs` already exists: two modules that need the same answer must not be able to disagree. If the vocabulary lived in the gate, the validator would import the module it protects — the coupling `specShape.mjs` already refuses for money. If it lived in the validator, the judgement would depend on the validator. Section F asserts the single definition at the source level, and **controls that assertion** by replaying it against a mutated copy that inlines the vocabulary.

**And the fix immediately broke six of round 6's CONTROLS — which is the apparatus working.** Section C of `hostile-round6-probe.mjs` builds a synthetic row it calls "a well-formed spec", and that row's licence was `{ name: 'Probe Licence' }`. It was well-formed until round 14 made the validator check the licence's contents, at which point six `CONTROL: ... passes` checks failed at once. The fixture was updated, and the new rule was **asserted** there rather than merely accommodated — a licence with no commercial-use position is now a rejected row, and so is one that is a bare string. A fixture that quietly loses its claim to be well-formed is the documentation version of an assertion that has stopped testing anything.

**What this round did NOT find, recorded so the absence is not mistaken for coverage.** `requires-grant` with no territory exclusion refuses nothing — and that is the **specified** reading, not an oversight: the H3 restriction binds running the weights in an excluded territory, not commercial use anywhere, and the registry suite requires "permits the same model outside the excluded territory". Round 11's first draft broke exactly that. The probe asserts the behaviour explicitly, so a future reader who sees "requires-grant" and no refusal finds the reason rather than filing a bug. `territories()` is untouched by this round: round 11 owns that rule, and the probe asserts it has not moved.

### Round 15 — the round-14 code, attacked as new code

This is the round-13 discipline applied one turn later, and it is the only round that can be trusted on round 14's work. Round 14 added `licenceTerms.mjs`, rewrote the judgement, added a validator block and registered three error codes — and **every line of it is covered only by probes written in this lane, in the same round, by the same author.** Round 14's own subject was a gate whose documented clearing procedure was also its bypass. An author who has just demonstrated that failure mode is not the person to certify that it is gone.

Round 14's rule — *a field read as a closed, enumerated fact must be validated as closed, and a value the gate does not recognise is not a yes* — was applied once per field the gate reads. Round 15 asked where it had **not** been applied, and found two places:

**1. The field that decides whether the gate runs at all.** `commercial` was read by truthiness, so `0`, `''`, `null` and `NaN` all meant "non-commercial" and skipped the entire judgement. Round 14 hardened four fields the gate reads and left the one that gates them. The fix is one token — `commercial === false` — and its significance is that it is the same rule applied one level up: an ambiguous value is not a claim.

**2. The module next door.** The route that publishes a row's licence read `evidence` with `??` while the gate read it as "present and non-empty". Round 14 fixed that disagreement **inside** the gate and did not look one module away, where the same field was being read by a different rule and published to callers. A caller could be told `"pending"` — a value the field is not documented to carry — or told `"retrieved"` about a row the gate refuses. Both are now derived from the shared predicate.

**And the probe caught its own author.** Section B's first draft reimplemented the route's expression locally and compared that to the gate — which can only ever describe the old code, and which kept failing after the route was fixed because it was testing a constant. It is recorded as a defect rather than quietly corrected: it is the third appearance of this class in this lane, and the first time it appeared in a probe written specifically to catch it. The rewritten section drives the real route and keeps the local expression only as a control that the two rules genuinely differ.

**What this round did NOT find, recorded so the absence is not mistaken for coverage.** The validator's asymmetry about `evidence` is **deliberate and now asserted**: a row that carries an unretrieved flag AND claims `permitted` or `requires-grant` is rejected at import, because that combination is the original hosted defect — but a row that carries the flag and claims `prohibited` or `unverified` is **accepted**, because "we have not read the terms, and we believe they forbid commercial use" is a coherent state in which both halves refuse. Rejecting it would delete an honest record rather than gate it. All three of round 14's new codes are asserted to be **reachable** (actually thrown, not merely present in the source), mapped to 403, and permanent in the runner — because a code that is mapped but never thrown claims an enforcement that does not exist, which is the round-7 lesson in the other direction.

### Round 16 — the provenance record, attacked as evidence rather than as a decision

Rounds 12–15 hardened money and the licence judgement. Both are **decisions**: they can be re-made, and a refusal can be re-run. `provenance.mjs` is not a decision — it is the EVIDENCE that a decision was made, and it exists because on 2026-08-16 a licensing request went to MiniMax stating that every generated asset carries *"a durable record of provider, model version, and the license in force at generation time."* That sentence has Sean's name on it. Round 11 touched this file, but before the ceiling and licence work.

The failure mode here is different from every earlier round. A guard that refuses too much breaks a feature; a money bug costs dollars. **A record that confidently states a wrong fact cannot be repaired by any later action, because the thing it describes is gone.** So the question is not "is it enforced" but **"does the record state something it does not know?"** — and the shape of the bug is the `result?.x || caps.x || fallback` idiom, which is a reasonable way to fill a *display* field and is not a reasonable way to fill an *evidence* field, because the completeness check downstream (`auditProvenance`) reads the fallback as an answer.

**1. `modelVersion` always held the provider id.** `capabilities()` never exposed `modelVersion` and no adapter returned one, so `result?.modelVersion || caps.modelVersion || caps.provider` fell through to the last term on **every** record this lane has ever built — in the one field whose own comment says *"which weights produced this is not answerable from the provider name alone."* Worse, the audit then read the fabrication as an answer and reported the record **complete**. Astra's standing ruling for this lane is *"zero is never the fallback for an unknown cost"*; this is the same rule as *"the provider name is never the fallback for an unknown model version."* Fixed at three levels: every one of the ten catalogue rows declares a real `modelVersion` (the weights — `Wan 2.2 TI2V-5B`, not `comfyui/wan-2.2`), `capabilities()` and the catalogue route publish it, `specShape.mjs` **requires** it as a non-blank string that may never equal the provider id, and the record falls back to `null` so the audit names the gap. `auditProvenance(build()).ok` is still `true` for a real row — asserted, because that is what keeps the change additive rather than merely strict.

**2. The licence snapshot corrupted what it copied.** `[...(lic.excludedTerritories || [])]` on a **string** spreads its CHARACTERS: a row whose exclusion list was authored as `'US'` recorded `['U','S']` — a territory list nobody wrote, inside the artifact whose entire purpose is to be immutable. Round 14 made the validator reject that row and the gate refuse it, so it is unreachable *from the catalogue*; the record must still not be the one place where an unreadable value is silently reshaped into a plausible one. It now records `null` for a non-array — the same answer `licenceTerms.exclusionList()` gives — and a control pins that a real list is still copied, frozen, and **not** an alias of the catalogue row.

**3. A boolean in an evidence record has three states, not two.** `commercial === true`, `grantRecorded === true` and `requiresAttribution === true` each recorded `false` for two different facts: "the caller said no" and "nobody said anything". The auditor's question is *was this run authorised?*, and those two answer it differently. All three now record `null` for "not told" — deliberately falsy everywhere the old `false` was, so nothing downstream reads it as a grant. For the two caller-supplied flags this changes nothing the runner does (it always passes a boolean); for the catalogue-supplied `requiresAttribution` the validator now **requires** a boolean, so a shipped row cannot be silent about a licence condition that `auditProvenance` reads.

**And the probe caught its own author, for the second round running.** The first draft of the route check read `listed.model_version === capabilities(LOCAL).modelVersion && listed.model_version !== listed.id` — and it **passed against the pre-fix tree**, because both sides were `undefined` and `undefined !== 'comfyui/minimax-h3'`. An assertion that compares two absences is satisfied by a field that does not exist, which is the same vacuity as the `expect(r.modelVersion).toBeTruthy()` this round exists to replace. It now asserts a real string first. **The control for the whole round is that the finished 29-check probe was run against the round-15 tree and failed 12 checks**, then passed 29/29 on the fixed tree — so the probe tests the fix rather than passing on any tree at all.

**And it immediately broke six of round 6's CONTROLS again** — the identical apparatus failure round 14 caused, from the identical fixture. Section C's "well-formed spec" had no `modelVersion`, so six `CONTROL: ... passes` checks failed at once. The fixture was updated and the four new rules were **asserted there** rather than accommodated: no model version, a model version equal to the id, a blank one, and a licence that does not say whether attribution is required are all rejected rows now.

**One documentation gap this round found and closed.** The provider-layer file table listed fifteen modules and **omitted `provenance.mjs`** — the module that holds the licensor commitment, and the subject of this round. It was mentioned exactly once, in a paragraph about line-endings-only differences. That is the under-claiming Rule 75 names, and it is now a row.

**What this round did NOT find, recorded so the absence is not mistaken for coverage.** It also asserted that `PROVENANCE_SCHEMA` was unchanged, because "the record's shape did not move, only what its fields are allowed to claim" — **and round 17 disproved that claim**: widening a field's domain to `null` IS a parse change, so the version moved to 2. Rounds 8 and 11's settled contracts were re-asserted rather than assumed: the truncated prompt travels with the hash of the FULL prompt, the recorded territory is the OPERATOR's, the top level and every sub-object are frozen, and the policy flags are welded to the asset with `consentConfirmed: false`. One thing is **disclosed rather than fixed**: the runner never passes `agentVersion`, so it is `null` in every record and `auditProvenance` does not check it — a field that reads like provenance and carries none. Inventing a version string would be worse, so it is stated.

### Round 17 — round 16's own code, attacked as new code

Round 16 added two validator rules, widened four fields' value domains and put a new field on the wire — and **every line of it was covered only by probes written in this lane, in the same round, by the same author.** Round 16's own subject was a completeness check that read a fabrication as an answer. An author who has just demonstrated that failure mode is not the person to certify it is gone. This is the round-13 and round-15 discipline applied one turn later, and it found three defects **inside round 16's fix**:

**1. The rule was enforced by an exact test.** Round 16's validator compared `spec.modelVersion === id` — which rejects only the byte-identical string. `' comfyui/minimax-h3 '` and `'COMFYUI/MINIMAX-H3'` both passed, and the record then repeated the provider id in the field that exists to distinguish it. So the defect round 16 was added to prevent survived inside round 16's fix, reachable through the one near-miss a human actually produces. The comparison is now normalised on both sides, and the record returns the label trimmed.

**The boundary matters more than the fix.** The probe's own first draft demanded that `'comfyui / minimax-h3'` be rejected too — and closing that requires deleting ALL whitespace before comparing, which makes `'Wan 2.2'` equal to `wan2.2`. A provider id without a vendor prefix plus a model name differing only by a space would then be **refused at boot**. That is a rule that refuses the normal case, which round 13 already named as broken rather than fail-closed. So the normalisation is trim + case-fold and stops there; the boundary is pinned as a CONTROL carrying the counter-example.

**2. The audit never checked the property.** Round 16 stopped the *record* filling `modelVersion` with the provider id and left `auditProvenance` reading truthiness — so a record built from any `caps` outside the catalogue (the function is exported) could still repeat the provider id and be reported **complete**. The validator covers catalogue rows; the audit is the last check before a reader, and it was the one place the property was unasserted. Round 13's rule — *a guard whose safety rests on another file's validation needs an assertion of its own* — applied to round 16's fix. The audit now refuses with a **distinct** token, `modelVersion.duplicatesProvider`, because "add a value" and "change this value" are different repairs.

**3. A widened domain did not move the version number.** Round 16 asserted the schema was unchanged because the record's *keys* had not moved. **That claim was false.** A v1 reader parses `licence.excludedTerritories` as an array and calls `.includes()` on it; it now throws on a record this code produces happily — and the widening is reachable through the exported API, not theoretical. The constant's own comment says to bump when the shape changes so a reader can tell how to parse it, and a widened value domain is exactly that. `PROVENANCE_SCHEMA` is now **2**, a v1 record audits as `missing: ['schema']` (the fail-closed direction), and `demo-http-flow.mjs` — which pinned the literal `1` — now imports the constant. That last one is the round-15 lesson in the end-to-end demo: a check that hardcodes the number tests a copy of the schema, so it fails on a bump while saying nothing about the record.

**Two disclosures, pinned rather than left to be discovered.** Round 16's control *"an adapter that reports its own model version still wins"* passes because the **probe** supplies one — **no shipped adapter reports a model version**, so that branch never runs in production and the record always states the catalogue's declared version. That is a claim about what *should* run, not a measurement of what did, and nothing in the record names the graph that selected the weights. Fixing it means choosing a graph identity, which is an adapter change and Sean's call. And round 16's tri-state is **unreachable from the runner**: `generateVideo.mjs` passes `p.commercial !== false` and `readGrants(env).has(providerId)`, both booleans by construction, so the change protects the API surface rather than the run path. Stated so the fix is not read as "the runner can now record an unknown".

**What this round did NOT find, recorded so the absence is not mistaken for coverage.** Round 16's rules themselves are correct and are re-asserted unchanged in section F: every shipped row declares a real model version, the route publishes it, a non-array exclusion list records `null`, an absent commercial flag records unknown, the prompt contract holds, and the record is frozen at every level. Section D also confirms the widening is reachable before arguing that the version must move — because a defect that cannot be triggered is a style opinion, not a defect.

### Round 18 — the surface that runs first on the GPU, attacked for the first time

Seventeen rounds went into the money gates, the licence gate, the provenance record and the wire. **None had touched `comfyuiLocal.mjs` or `comfyuiGraph.mjs`** — the lines that execute first when Sean starts the render box, on the machine where a mistake costs GPU time rather than a stack trace. That is the round-16 shape again: a surface nobody had asked a hostile question about, and therefore a surface where the absence of findings meant nothing.

The failure mode here is different from every earlier round. A money bug costs dollars; a licence bug ships something unlawful. **A misconfigured render box costs time in the one place where the operator is least able to see what went wrong** — the graph runs, the GPU burns, and the output is a video that is not the video that was asked for, or a refusal whose message points at the wrong file. So the questions are *"does the check that tells the operator what to do actually answer the question it is asked?"* and *"does the guard that refuses to invent an input actually refuse?"*

**1. `verify()` answered a different question than it was asked.** Its template check was `existsSync`, and its binding check was truthiness. Measured, before any fix: a template containing `{ this is not json`, a GUI-format export that ComfyUI answers with a 400, a binding naming node `99` in a template that has nodes `1` and `9`, and a binding on node `9` which declares no text input — **all four returned `verify().ok === true`**, all three checks green. Four configurations in which every run fails, reported healthy by the one command whose job is to say whether they will. It now loads the graph through the same `loadGraph` a run uses, and inspects the bindings through the same table a run injects from.

**2. The prototype chain, in a third shape — and this time in the GUARD.** Rounds 6 and 13 fixed `VIDEO_PROVIDERS['constructor']` and `all.callers['__proto__']`. Round 18 found the same class three times in one file, and the middle one is the interesting one: `'constructor' in node.inputs` is TRUE on **every** node, so the predicate inside the DETECTION-NEVER-CREATION guard would have "detected" an input that does not exist and written the prompt to a key ComfyUI ignores — *"full GPU cost, the template's placeholder rendered, success reported"*, which is the failure the comment three lines above that guard describes in those words. Fixing the lookup above it without fixing the predicate would have **introduced** that bug. The third shape is worse than a crash: `graph['constructor']` is a function, and `node.inputs = node.inputs || {}` wrote to it, creating `Object.inputs` on the global `Object` constructor from an environment variable. Measured, not reasoned.

**3. `loadGraph` checked syntax and never shape.** A template file containing `null` is valid JSON, was returned as a "graph", and made the next call throw `Cannot read properties of null (reading '1')` — a raw `TypeError` where a named refusal belongs. `verify()` inherited it, because it loads through the same path.

**4. The coverage gate's list was the defect.** Round 7's check exists to answer *"of the codes the gateway can raise, which have no defined status?"* — and its `GATEWAY` list named no adapter module. **Eighteen** codes had no status anywhere and fell through to the fallback 400, which tells a caller *"your request was malformed"* about a graph they never wrote. This is the **third** appearance of the same lesson in this lane — after the fifteen-gate receipt that never ran the compliance suite, and the round-16 file table that omitted `provenance.mjs` — and it is the same sentence every time: **a green result can be green because it never looked.** The fix is two-part and the second part matters more: the codes are mapped (8 × 500 our provisioning, 8 × 502 the provider, 504 for the timeout, 422 for the content refusal), and the adapters are **added to the sweep's list**, so the gate that missed them now looks at them.

**5. The file table had omitted the two modules the round is about — and a third besides.** Round 16 found `provenance.mjs` missing from the provider-layer table and closed it by adding the row. Round 18 found `comfyuiLocal.mjs` and `comfyuiGraph.mjs` missing from the same table — the same gap, in the round whose entire subject they are. The fix is not a third row added by hand: section G asserts that **every** module in the lane's three source directories has a row, so the omission cannot recur. Turning it on immediately found a third: `promptPolicy.mjs`, 260 lines holding the licensor's content-policy commitment, had never had one. **And the check's own first version was vacuous** — it asked whether the name appeared anywhere in the document, and the round-17 README satisfied it for BOTH comfyui modules because round 17's narrative names them in a sentence about the adapters it scanned. It passed for the two files whose absence was the defect. It now requires a table row, which prose cannot satisfy.

**The probe caught its own author again — the seventh time, and in a new way.** Three of round 18's CONTROLS asserted an ABSENCE: "the load is gone", "the `in` test is restored", "the adapter is missing from the list". Against the pre-fix tree the string was never there, so the mutation was a no-op and the control passed — one of them passed **because the defect it was checking for was still in the code**. They now assert that the mutation CHANGED the source. Found by reading the pre-fix control output rather than the post-fix one, which is the only reason running a control is worth anything.

**The control for the round, stated as a number.** The finished 58-check probe was run against the round-17 tree, materialised from the previous patch on a fresh `main` base: **30 failures there, 0 here**. The disclosure section passes on both, by construction — it documents behaviour this round deliberately does not change.

**What this round did NOT find, recorded so the absence is not mistaken for coverage.** The adapter's settled contracts are re-asserted rather than assumed: the 4xx/5xx submit split and its permanence classification, the artifact's real container winning over the proposed path, `findOutputFile` scanning every output key and ignoring a png, a timeout reported as a timeout, an unconfigured provider fabricating nothing, the suffixed-env-key fallback, and the `sha256`/`attribution` return. One thing is **disclosed rather than fixed** and is the first item for round 19: a graph that fails on the GPU is reported as `E_NO_OUTPUT` with a message that blames the saver node, the node's real exception is discarded, and the code is classified retryable — so the broken graph is re-rendered at full cost. Section E proves all three parts; the repair needs a permanence decision in the runner, which is Sean's call.

### Also proven structurally

- **The JSON store cannot lose a concurrent update, in-process.** `store.mjs` uses only synchronous
  `readFileSync`/`writeFileSync`/`renameSync` — no `async`, no `await` — so `update()` is a critical
  section Node's single thread cannot interleave. Probed with 5 simultaneous submissions: all 5
  accepted, all 5 unique, all 5 persisted, all 5 terminal, ledger `runs: 5`. This holds **within one
  process**; it is not a cross-process guarantee.
- **The licence gate refuses over the wire.** A commercial request against local H3 → `403
  E_LICENCE_GRANT_REQUIRED`, `retryable: false`. An **omitted** `commercial` is treated as commercial,
  which is the fail-closed direction.
- **Path traversal is inert.** `..%2F..%2Fetc%2Fpasswd` on asset content and on a job id both `404`.
- **A token in the query string does not authenticate**; `Basic` does not authenticate; the bearer
  scheme is case-insensitive.

### Round 19 — what a failed GPU run is reported as

Round 18 named this defect and deliberately did not close it, because half of it is the runner's:
`E_NO_OUTPUT` is absent from `PERMANENT_CODES`, so a graph that fails identically every time is
re-rendered at full GPU cost on each attempt. **The other half is not the runner's, and that half is
the one that misled the operator.**

The whole defect was one line:

```js
if (entry?.status?.completed || entry?.outputs) { completed = true; break; }
```

`entry?.outputs` is not a completion test. It is a test for whether the key exists — and `{}` is
truthy. ComfyUI reports an errored graph as `outputs: {}` with `status_str: "error"`, so the loop
broke on the first poll, `findOutputFile` found no video, and the operator was told:

> ComfyUI reported completion but produced no video output. Check that the graph ends in a
> video-saving node.

Meanwhile the node's real exception — measured as `CUDA out of memory` — was sitting in
`status.messages`, in a field **no code path in this lane had ever opened**. Every part of that
diagnosis is wrong, and the direction of the error is the expensive one: the operator is sent to
rewrite a working graph while the GPU is out of memory.

Round 19 moves the decision into `comfyuiHistory.mjs`, which answers `pending` / `done` / `failed`
and returns a descriptor rather than throwing — the same shape `ceilingGate` and `licenceGate` use,
so the adapter owns the error code and the pre-fix replay of a probe gets a report instead of a
stack trace. Three things follow from putting it in one place:

- **Failure is decided before completion.** `||` short-circuits, so testing `completed` first made
  the error branch unreachable in exactly the case where both are set. They are not mutually
  exclusive in the wire format, and the probe feeds the identical payload both ways and requires the
  same code.
- **`status_str` is read**, and it is the only field that separates "finished and produced nothing"
  from "failed before producing anything" — because both are `{}`.
- **The unknown direction is `pending`.** A false failure abandons a render that is still running; a
  false pending costs the timeout that was already budgeted. The safe direction is not the
  conservative one here.

The new code is `E_GRAPH_FAILED`, mapped to **502**, and the boundary is worth stating because round
18 drew the neighbouring line: a 4xx submit (`E_SUBMIT_REJECTED`, 500) is a graph ComfyUI **refused
before running it**, which is ours; this is the provider **running it and the run blowing up** — an
OOM, a missing weight, a node's own bug. The exception is quoted into the message, so the reader does
not need the status code to tell them apart.

`E_NO_OUTPUT` keeps its exact wording, and that is the point: it is now reached **only** when
`terminalState` said `done`, so "ComfyUI reported completion but produced no video output" is finally
a true statement rather than a guess. Two codes, two facts, no overlap.

**And the third defect was in the timeout, not the failure.** `E_TIMEOUT` said *"The job is still
queued on the GPU; this attempt gave up waiting"* — unconditionally. When the history endpoint never
answered, or answered every poll without ever holding the prompt, the code had established the
opposite and still stated a cause. It now reports what it observed: no record at all, a history
endpoint that never answered, or an entry that is genuinely still running. This is round 16's rule
(a report must not state something it does not know) applied to the one message an operator reads
when a render is late.

**The controls.** The finished 24-check probe was replayed against the round-18 tree, materialised
from the previous patch: **18 failures there, 0 here.** Two of those 18 were the probe's own defect —
an absence check that mutated its own subject, and a disclosure check that asked about a code which
did not exist — and both are recorded in the table above rather than quietly repaired. The round-18
probe's section E was a **disclosure** asserting the broken behaviour; the fix made two of its checks
fail, which is what a disclosure is for, and it now asserts the fixed behaviour instead.

One more thing happened without being asked. Round 18 made the README's file table a permanent
assertion — every module in the lane must have a **row**. Adding `comfyuiHistory.mjs` and
`hostile-round19-probe.mjs` made that gate fail immediately, naming both files. **The ratchet caught
its own round's additions**, which is the first time in this lane that a check written in one round
did the work it was written for in the next.

### Round 20 — the hosted adapter, attacked for the first time

The ledger test picked this surface for the same reason it picked the last one: `higgsfield.mjs` and
`higgsfieldTransport.mjs` had a row each in this document and **not one finding** across nineteen
rounds. Rounds 18 and 19 went to the local lane; the hosted lane — the one that spends money — had
never been asked a hostile question.

**Four defects, all measured through the real `verify()` and `generate()` against a stub `fetchImpl`.**

The first is round 18's finding 1 in the other adapter. `verify()` proves reachability with a status
GET for a non-existent request id, and it treated every status that was not 401/403 as proof the
credential worked:

> host reachable, credential accepted (probe answered 500)

A 500, a 503, a 429, a 301 and a 302 all produced `ok: true` and that sentence. The vendor failing,
rate-limiting or redirecting is not a decision about the credential — it is the *absence* of one, and
an absence is not a yes. It now separates a decision the API made (2xx, or a non-auth 4xx) from
everything else, and the inconclusive cases fail the check and name which of the three they were.

The second is round 19's finding 4 in the lane that bills. `poll()` treated every non-ok response as a
blip, so a status endpoint answering **401 on every poll** ran to the deadline and raised `E_TIMEOUT`
carrying *"The request may still be running and billing."* The code had never read a status at all.
The credential is identical on every poll, so waiting cannot change the answer — and the job spent its
entire attempt budget learning that. A 401/403 now refuses immediately as `E_POLL_REJECTED`; every
other failure stays a blip, and `describePollTimeout()` reports what was actually observed — no poll
completed, every poll was refused, some were, or a genuinely slow render. Only the last keeps the
billing warning, because only the last has earned it.

The third and fourth are new ground. The credential's destination was never checked: a base URL of
`http://` sent `Authorization: Key <id>:<secret>` in cleartext, measured with the header quoted out of
the probe's own request recorder. And the artifact URL — a string taken out of the vendor's response
body — was fetched server-side with **no validation at all**; the probe drove
`http://169.254.169.254/latest/meta-data/` through it and the adapter fetched it and wrote the bytes
to disk.

**Both new guards are deliberately narrow, and the controls are what keep them so.** The https
assertion on the base URL returns null when there is no credential to protect, so a local stub still
works. The artifact guard checks the **scheme, not the origin** — the vendor may serve artifacts from
a CDN, and an allowlist built on infrastructure this lane has never observed would refuse real
artifacts. That is stated as a limitation rather than dressed up as a protection: the control asserting
that an https URL on a *different host* still works is the check that keeps the guard from becoming
the next defect.

**The controls.** The finished 32-check probe was replayed against the round-19 tree: **18 failures
there, 0 here.** The round-19 probe's section E — a disclosure asserting the broken behaviour — did
not move this round, because round 20 changed a different adapter; that is worth noting, since a
**The close-out found a sixth defect, in this document rather than in the code.** Reconciling the
closing block against the artifact turned up two hand-written counts that had drifted with nothing
asserting over them. The block said "the same **55**-file list" while the same paragraph said
"**58 files**" twice; the gate-16 section said "the assertion total is **936**" — round 19's
total — while its own parenthetical, *853 + 59 + 24 + 32*, summed to 968. The 55 had survived
**three rounds** (round 18's patch was 57 files, round 19's 57, round 20's 58) because no check had
ever read this prose, and the 936 had survived one because the round-20 update corrected the total
in two places and missed the third. That is finding 18 in a new costume: a hand-written count with
no assertion over it drifts silently in the direction that reads as "nothing changed". Both are
corrected, and both are now assertions in section G — **G2** (one file count, in all three
sentences that state it), **G3** (the modified/new split adds up to the total) and **G4** (the
stated assertion total equals the sum of the parts its own parenthetical lists) — which is why this
probe's check count moved from 59 to 64. They are deliberately checkable **without git**: the patch
is generated after this document and does not exist in the clone, so a git-derived count would be
green in the worktree and red in the receipt, which is the exact failure the apply-to-a-fresh-base
ritual exists to prevent. **The new control failed on its first run**, and that is the useful part:
it re-introduces a stale count into a copy, and the document already contained the defect, so the
mutation was a no-op — the rule that a control must assert the mutation *changed* the source,
catching its own author.

disclosure only has to be rewritten when its own subject moves.

### Round 21 — the usage ledger's write path, attacked for the first time

The ledger test picked this surface again: `usageLedger.mjs` had a file-table row and one incidental
list mention, and **not one finding across twenty rounds**. It is also the only module in the lane
that both reads and writes the artefact the money ceiling is computed from — and every round before
this one attacked `usageFor`. Rounds 4 and 12 hardened it until a truncated file, a misshapen day and
a negative count each degrade the ledger and refuse billing.

**`record()` was the half nobody attacked, and it undid all three.** The defect is not that it writes;
it is *what it writes when it could not read*. `read()` hands back `{}` for a corrupt file and
`usageFor` turns that into `degraded`, which is the right answer — and then the very next write erased
it, because the free local lane is deliberately still allowed to run while degraded, and its
`record()` wrote `{...{}, [day]: next}`: a file that parses, carrying one day, with the corruption
gone and every other day gone with it. `degraded` cleared and billing resumed.

The escalation is one line, and it is measured rather than argued:

```
$40 recorded of a $50 ceiling   ->  billing REFUSED (E_RUN_CAP)
file truncated to "{"           ->  billing REFUSED (E_LEDGER_DEGRADED)   correct
one FREE local run              ->  file rewritten clean, degraded cleared
$12 billing run                 ->  ALLOWED                                the defect
```

The refusal is undone by the next write from the one lane that is exempt from it. That is the shape
worth naming: **the asymmetric degradation is a decision about the read path, and the write path was
never asked to honour it.** A guard that refuses a value is not a guard if the next write replaces
the value with one it invented.

The second and third defects are the same sentence one level down. A day record this code cannot
read — a string, an array, `-5`, `"many"` — was overwritten with a fresh count, because
`all[day] || {}` reads a string as an empty record and `Number(x) || 0` reads `"many"` as `0`; and
the replacement parses, so `degraded` cleared. And the 30-day trim sorted descending and sliced 30,
so a day outside the window was **discarded while `record()` still returned its total** — with a
path that survives the anti-truncation fix entirely, because 30 future-dated days planted in the file
are valid JSON holding valid counts: nothing is corrupt, nothing degrades, and today's usage is
evicted on every write. **The fix for a file that cannot be parsed is not a fix for a file that
forgets.**

The fix is one rule, applied on both sides: **the writer makes the same judgement as the reader.**
`dayRecordIsTrustworthy` is a single predicate `usageFor` and `record` both call — the same move
`licenceTerms.mjs` makes for the licence vocabulary, for the same reason: two copies agree until
someone edits one. A write that does not land sets a *sticky* fault, separate from the read fault,
because a read cannot forgive it — the file being parseable says nothing about whether the spend was
recorded, and that is the only question the ceiling asks.

**The control for the round, stated as a number.** The finished 41-check probe was run against the
round-20 tree, materialised from the previous patch: **21 failures there, 0 here.** Seventeen of the
21 are the defects; four are the mutation controls failing there for the reason they should, since
the strings they re-introduce do not exist until the fix lands.

**Two things this round nearly got wrong.** The mutation controls were written *after* the fix, which
is the only order in which they can be — a control that re-introduces a defect needs the defect's
replacement to exist to target — and the pre-fix replay therefore reports them as failures that are
not findings. And the first draft of section C tested the backdated-day path only; the planted-
future-days path, which is the one that matters because it defeats `degraded` entirely, was added
after re-reading the trim against the threat model the module states for itself ("anyone with disk
access to the worker can [truncate it]").

**And the close-out found a fifth, in the document.** Reconciling the numbers against the artifact
turned up the re-verification block stating the file count in five places, all saying 58 while the
closing block said 59 — corrected by hand, with every gate green. Round 20 asserted the *closing*
block; this was the same count in a block that assertion never reached. It is now **G5**, and the
generalisation is the useful part: a self-consistency check has to be **total** over the places a
fact is written, not over the one its author happened to be editing.

### Round 22 — the HTTP primitives, attacked for the first time

The ledger test picked this surface again: `http.mjs` had a file-table row and **not one finding
across twenty-one rounds**. It is 116 lines, it has no state and no routing, and every request
passes through it before anything else — the bearer check, the body cap, and the one response
envelope. Twenty-one rounds attacked the money, the licence, the provenance record, both adapters
and the ledger's write path, and never asked this door a hostile question.

**The finding that matters is the shape, not any single one of the four.** Three of them are the
same sentence: *a guard that only holds because of a caller's precondition is not a guard.* The file
states that principle in its own comment about the `token` argument — and then relies on a caller's
precondition three more times:

- `authorized()` trusted `req.headers` to exist and **threw** when it did not. An auth check that
  throws is not a refusal; it is an exception, and `server.mjs` answers it with a 500.
- `safeEqual()` trusted its caller to pass strings and returned **true** for
  `(undefined, undefined)`, because both sides stringify to the same placeholder.
- `readBody()` trusted its caller to handle any JSON value, and `null` is the one that bites: it
  reaches a route, `body.provider` throws, and the caller sees a **500** where the right answer is
  **400 E_BAD_JSON**.

The fourth is the mirror of it. `send()` exists so that *"no route invents its own envelope"*, and
it put `...extraHeaders` **last** — so a caller could replace the `content-type` and
`content-length` that the function's whole purpose is to impose. A module that constrains its
callers has to apply its own invariants, not offer them.

**The control for the round, stated as a number.** The finished 31-check probe was run against the
round-21 tree, materialised from the previous patch: **17 failures there, 0 here.** Thirteen are the
defects; four are the mutation controls failing there for the reason they should, since the strings
they re-introduce do not exist until the fix lands.

**What this round nearly got wrong.** Two of its own CONTROLS were wrong on the first run: they
hard-coded `content-length` as 8 and 12 for payloads that are 7 and 13 bytes. Both reported the
pre-fix code as failing an assertion it was passing, which is a false accusation — a control that
measures the wrong number is as misleading as a check that cannot fail, and it is caught the same
way, by reading the observed value against the claim before believing the failure.

### Round 23 — the queue-completion projection, and the ledger's own arithmetic

The ledger test picked this surface by the rule that has found every good surface in this lane:
`backend/scripts/handlers/completion.mjs` is the **one module the file-table assertion exempted by
name**, on the stated grounds that *"this lane has never modified it (absent from the patch)"*.

That reason is a fact about the **patch**, not about the lane's dependency surface.
`generateVideo.mjs` imports `mimeForFilename` from it, so every video job's `r2Key`, its mime and the
line the operator watches are all built out of this file. An exemption justified by "we never edited
it" cannot distinguish a module *outside* the lane from a module the lane *depends on and never
looked at* — and the second kind is exactly where the best finds are. Twenty-two rounds attacked the
money, the licence, the provenance record, both adapters, the ledger's write path and the HTTP
primitives, and left the one module the review had formally excluded from its own coverage
assertion unexamined.

**Three defects in the module, and one in the document.**

1. **`mimeForFilename` resolved an extension through `Object.prototype`.** `MIME_BY_EXT` is a plain
   object literal, and `Object.freeze` does not remove the prototype. Measured:

   ```
   mimeForFilename('out.constructor')  ->  [function]   the Object constructor
   mimeForFilename('out.__proto__')    ->  [object]     Object.prototype
   mimeForFilename('out.toString')     ->  'application/octet-stream'   (clean — see below)
   ```

   The third line is why this hid for twenty-two rounds. The extension is lowercased before the
   lookup, so only names that are *already* lowercase can reach the prototype; `toString` becomes
   `tostring` and misses. **The obvious probe comes back clean and the defect does not.** Both
   reachable values are truthy, so `completionBody`'s `||` passed them straight through — and
   `JSON.stringify` then dropped the key, because a function is not JSON:

   ```
   {"r2Key":"jobs/j1/mediasync.json","output":{}}
   ```

   **No `mime` at all.** The queue stored a completion with no artifact type, which is the same
   defect this module was extracted to fix — a queue that believes something it was never told —
   one layer down. The probe now enumerates `Object.getOwnPropertyNames(Object.prototype)` rather
   than the two names that happen to work, so a hand-written list cannot drift out from under it.

2. **`completionSummary` shipped the exact string its own header indicts.** The docstring calls
   `offset undefineds usable=undefined` *"worse than silence, because it reads as a measurement that
   ran and failed rather than a field that was never meant to apply"* — and leaves that expression
   as the default. The `??` fix only helped handlers that already declared a summary, and
   `render-agent.mjs:262` prints the result unconditionally to the operator log. The offset line is
   now reached only when **both** of mediasync's fields are present; anything else names the gap.
   No test covered the absent case, which is why nothing caught it — so the round adds those cases,
   including `summary: ''` and a whitespace summary.

3. **`completionBody` used `||` where a TYPE was required.** `||` answers "is it absent", and a
   function is not absent. The fallback that reads as *"a string is guaranteed here"* guaranteed
   nothing, and `r2Key` had the identical shape. Both now go through one predicate — a non-empty
   string or `null` — so "undeclared" and "wrong type" reach the same fallback.

**And the fourth finding is not in the code at all.** Round 21 established that a self-consistency
check has to be **total** over the places a fact is written, and then made the *file* count total
over all six of its homes — while leaving the **gate count** and the **defect total** with no
assertion whatsoever. Both had drifted:

- The patch paragraph said **"twenty-seven gates"** while three other sentences said twenty-eight.
- The rounds table held **83 rows** under a sentence claiming **70** — rounds 21 and 22 added nine
  rows and never moved the number.

Neither is findable by reading, which is the whole point: both are checkable by *arithmetic*, and
nothing was doing the arithmetic. Round 23's section E now asserts the gate count in every sentence
that states it, requires it to equal the number of commands the receipt itself lists, requires the
defect total to equal the table's own row count, and requires the stated assertion total to equal
the sum of the parts the receipt lists — each with a re-introduce-direction control.

**One rule was drafted and then narrowed, and the narrowing is recorded rather than hidden.** The
first version of E4 asserted that *every* sentence stating the assertion total agrees. It fired on
row 20's narrative, where `936` appears as a **quotation of a defect that was corrected** — not a
live claim. A guard that fires on the document's own account of a fixed bug is a guard the next
author deletes, so the rule became arithmetic over the receipt's own parts. This is skill §20.6's
"reject noisy guards loudly, and record the rejection" — recorded here so it is not re-proposed as
a gap.

**The exemption is gone, and its control is stronger.** `completion.mjs` now has a row in the
handler table, the `NOT_LANE_OWNED` map is empty, and section G gained a **redundant-exemption**
control: a module that is both exempted *and* documented fails. Round 18's own list had only a
staleness check, and a staleness check cannot see an exemption that has stopped being needed —
which is where uncomfortable findings go to stop being visible.

**The control for the round, stated as a number.** The finished 49-check probe was run against the
round-22 tree restored from `HEAD` (`9f9957b1b`): **21 failures there, 0 here.** Three are the
mutation controls failing there for the reason they should — the strings they re-introduce do not
exist until the fix lands — four are section E on the stale document, and the rest are sections A
and B driving the real module. All three restored files were verified byte-identical by `sha256`
afterwards, so the "before" number is reproducible rather than remembered.

### The headline number

```
hosted  MiniMax H3 @ 6s : $0.78
local   MiniMax H3 @ 6s : $0.00   (the 5090 already runs these weights)
```

That comparison is the whole commercial argument for the local lane, and before this work it was an
assertion rather than a number.

---

## The GPU ran — the 1C demonstration, MET

> **RECONCILED 2026-09-22.** This heading previously read *"Astra's Slice 1 exit gate, MET"* while
> `forged-package/05-slices.md:24` — in the same artifact — read *"Slice 1 remains incomplete until
> API-002, JOB-002 and GPU-001 have real authorized evidence."* Two incompatible conclusions about
> one requirement, nothing marking which governed. That was Astra round 4's **L-01**, the single
> finding that blocked all slicing.
>
> The resolution is **AMENDMENT 1** in `forged-package/05-slices.md`, which:
> - preserves this run as MET **for the demonstration it is**,
> - replaces the contract's Wan profile with the measured H3 profile, and
> - **retains every other 1C requirement** (HTTP, restart reconciliation, resource ownership,
>   authorization, zero hosted egress).
>
> **The distinction this heading now carries:** *the demonstration ran* (proven here) is not the
> same claim as *Slice 1's contract is satisfied* (not yet — it also needs the retained 1C items).
> While the amendment is PROPOSED and not approved, the STOP clause stands and slicing must not
> begin. Do not read this section as an enablement approval; enablement remains BLOCKED.

Run **2026-09-20 03:38 PDT**, on Sean's explicit go-ahead, and the only section of this document
whose subject is a render rather than an assertion.

The lane's **own adapter** (`comfyuiLocal.mjs`) was pointed at a real ComfyUI with the real H3 graph
and a **prompt the graph has never contained**, so a silently un-injected binding could not pass as
success. Four things were established, and each is a separate measurement:

| What | Measured |
|---|---|
| Preflight | `verify()` green on all four checks **before** any render was spent — round 18's lesson that present is not usable |
| The render | `promptId ea41e13f-d2ce-4641-8035-e7bbd8f07ec8`, `h3_00004_.mp4`, **1,025,844 bytes**, wall **80.9s** |
| The artifact | `h264`, **1280x720**, **107 frames**, **24 fps**, sha256 `6765683ac892549bc486ce3bcb0cf098e81a26ec2c3df6c9674053033019b018`, re-hashed from the bytes on disk |
| Prompt injection | read back out of ComfyUI's **own history** for that prompt id: the graph was asked *"a scarlet macaw perched on a brass stand in a sunlit studio…"*, **not** its shipped default |

**The injection is the part worth stating.** The graph carries a hardcoded default prompt (*"a swan
taking off from still water…"*), so "it produced a video" is satisfied by a run that ignored the
binding entirely — at full GPU cost, rendering somebody else's test string. The check reads the
prompt back out of ComfyUI's history and requires an exact match, and a contact sheet of frames 0, 50
and 106 shows a scarlet macaw on a brass stand with coherent motion between them. **A swan would have
been a failure.**

Server-side, from ComfyUI's own log, so the claim does not rest on our client: `Total VRAM 32607 MB`
· `Device: cuda:0 NVIDIA GeForce RTX 5090` · `pytorch 2.13.0+cu130` · `Requested to load MiniMaxH3`
(**19983MB staged, 208 patches attached** — the turbo LoRA) · `MiniMaxH3VideoVAE` (4965MB) ·
**`Prompt executed in 80.08 seconds`**.

**What made the run cheap:** the graph is the 4-step turbo variant at 1280x720, so a clip costs ~80s
rather than the ~388s the long graph took on the same box. **Cost: zero.** The server was started with
`--disable-api-nodes`, so the paid `partner/` MiniMax nodes are not merely unused but **not loaded** —
a hosted call cannot be queued by accident, which is the structural version of the rule the workflow's
own notes state as advisory.

Artifacts: `C:/tmp/slice1-exit-gate/h3-slice1.mp4`, `slice1-receipt.json`, `contact-sheet.png`.

---

## NOT proven — read this part

1. **The GPU ran ONCE, on ONE graph, and that is the whole of what is proven.** Astra's Slice 1 exit
   gate is now **MET** — see "The GPU ran" below for the receipt, and the run is `h264, 1280x720,
   107 frames, 24 fps`, 1,025,844 bytes, **80.9s** wall, zero API cost, through the lane's own
   adapter. What that does **not** establish, and what this entry is now for: the run used the
   text-to-video graph only, so the **first-frame graph is still unexercised**; duration is still
   deliberately unbound, so nothing here measured the `length`→seconds relationship; the audio VAE is
   still installed and **not wired**; the run was a single prompt and a single seed, so it says
   nothing about determinism, repeatability, or output quality; and no **hosted** lane was touched, so
   the paid path is exactly as unproven as it was. The prior text of this entry said the GPU "never
   ran" and that the artifact came from **ffmpeg on the CPU** — both true until 2026-09-20 03:38 and
   neither true now, which is why the entry is rewritten rather than deleted.
2. **The hosted lane is dispatchable but not runnable, on purpose.** It reaches the spend guard and
   stops at `E_UNKNOWN_COST`, because `costPerRunUsd` is `null` on every per-second row. The guard
   cannot bound a price it cannot express. `costEstimate.mjs` computes the number (`$0.6720`) and
   `/v1/estimate` already returns it — but wiring it into the guard would make hosted spend possible
   *without* the reservation ledger Astra gated hosted enablement behind. **Loosening a money gate to
   make a smoke test green is the wrong trade.**
3. **`toUsdNumber()` is a float bridge and a known weak link.** `spendGuard.checkRunAllowed` still
   compares floats. Converting micros back for it reintroduces exactly the arithmetic Astra ruled out,
   at the one boundary that matters. Named `toUsdNumber` rather than `asNumber` so a reader cannot
   mistake it for the authoritative path. **Round 13 widened this entry rather than narrowing it:**
   round 12's per-caller spend cap added a SECOND float comparison on the same money
   (`spend + runCostUsd > spendCap`, which refused a caller landing exactly on their ceiling), and
   round 13 removed that one. So the per-caller cap is now integer — and this entry is the only
   float money comparison left, which is why it is stated as a count and not as an example.
4. **The licence record's OTHER fields are still free-form, and the `evidence` flag's meaning changed.** Round 14 closed the vocabulary for `commercialUse` and the type of `excludedTerritories`, and it did **not** touch `name`, `restricts` or `grantRequestDoc` — three unvalidated strings a human reads, not a gate. Nor does anything check that a row declaring `requires-grant` actually lists a territory: because the restriction is territorial, such a row refuses nothing, which is correct for H3 and would be wrong for a licence whose restriction is not. One deliberate behaviour change, disclosed rather than smuggled: `evidence` went from *"the value is the string `unretrieved`"* to *"the field is present and non-empty"*. A hypothetical row that stored `evidence: 'retrieved'` would previously have passed and now refuses. No row does, and the documented way to clear the flag has always been to remove it — but it is a change, so it is stated. |
5. **A billed run that FAILS is not counted against the ceiling.** `ledger.record()` sits *after*
   `adapter.generate()` in `runGenerate`, so a failure records nothing. For the free local lane that is
   correct — a failed free render costs nothing. For a billed provider it would under-count, and
   Astra's `vendor_reported_gross_usd` / `settled_net_usd` split is exactly what is missing. Hosted is
   blocked today, so the live exposure is zero; the accounting gap is real.
6. **What the ceilings actually enforce, and what they only record.** Round 6's section H pinned
   three related gaps as executable disclosures. **Two of the three were closed in round 12** and the
   disclosure checks were rewritten to assert the new contract rather than the old gap — see
   "A green gate that could not fail" below for why that rewrite was not optional:
   - **A quote is not single-use.** The probe created a second job from one quote and got `202`, so a
     job can execute against a price captured up to five minutes earlier. `E_QUOTE_USED` and
     `E_QUOTE_CHANGED` are mapped in `wire.mjs` and **never thrown**; they are now labelled as reserved
     where they appear, because a code in that table that nothing raises claims an enforcement that
     does not exist. Reuse is *safe rather than lax* — every run re-runs the gates and charges the
     ledger, so the daily caps bind across reused quotes — but the table was overstating.
   - **~~`max_cost_usd` is a submission-time floor assertion, not a runtime ceiling.~~ CLOSED in
     round 12.** This was true when written: `max_cost_usd` was type-checked, compared against the
     quote's estimate, and stored on the job, and `generateVideo.mjs` never read it. It is now read
     and enforced — `ceilingGate.jobRefusal()` compares the caller's stored ceiling against the cost
     the guard authorised, and refuses `E_JOB_COST_EXCEEDED` permanently when the charge is over.
     Proven end to end through `runGenerate` in round 12's section B, including that a refused job is
     **not** charged to the ledger. The disclosure was left in place, struck through, because the
     original reasoning is what justifies the shape of the fix.
   - **~~There is no per-caller ceiling at all.~~ CLOSED in round 12.** `checkRunAllowed` now takes an
     OPTIONAL fourth parameter — a caller scope from `ceilingGate.callerScope()` — and the ledger
     records an additive per-caller split. Both caps come from the environment
     (`SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER`, `SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER`) and **both
     default to unset**, which is what makes the change additive rather than a new way to refuse
     everyone: with nothing configured the scope is `null` and the guard is byte-for-byte the
     three-argument function it always was.
7. **The per-caller ceiling binds at RUN time, not at quote time.** `preflight.mjs` still calls the
   guard with three arguments, so a caller can be **quoted** and then refused at submission. This is
   deliberate rather than overlooked — refusing at quote time would change the quote path, which is a
   separate decision — but it is a real difference from the global ceiling, which is checked in both
   places. Stated so the round-12 fix is not read as "every ceiling is enforced everywhere".
8. **The runner costs a run from the catalogue's per-run figure; `preflight` uses the
   duration-adjusted estimate.** `preflight` calls `checkRunAllowed(withEstimatedRunCost(caps,
   request), …)`; `runGenerate` passes `caps` straight through. For a per-second row the two
   therefore disagree: the quote is priced from `costPerSecondUsd × duration` and the run is refused
   with `E_UNKNOWN_COST` because the catalogue's `costPerRunUsd` is `null` on those rows. **No money
   is mis-spent** — the refusal is the fail-closed direction — but the message is misleading and the
   two paths are not one policy. Round 12 deliberately did **not** change the runner's cost basis:
   that is an engine behaviour change rather than a gate, and the two ceilings it added are
   refusal-only and cannot alter any outcome that currently succeeds. Making the runner cost a run
   the way `preflight` does is the next honest step and is Sean's call.
9. **The global and per-caller ceilings are AGENT-side.** Whoever runs the agent can raise them. The
   original commitment said "server-side caps enforced before submission", and that is still owed;
   unchanged by round 12, which added a third ceiling without moving any of them server-side.
10. **No `Range` support.** Astra asked for `206` on asset content; the probe got `200`.
11. **`reconcileOrphans()` marks orphans `failed`; Astra asked for `reconciling`.** Astra's `reconciling`
   is **non-terminal** and requires operator intervention. A job marked `failed` is a terminal claim we
   have not earned. Recorded in `server.mjs` beside the critical window.
12. **`modelPath` is `null` on every hosted row.** The vendor's per-model paths live behind an OpenAPI
   reference that was not fully retrieved, and **inventing one is worse than leaving it null**: a wrong
   path fails at the vendor with an opaque 404 *after* the request has been authorised and costed. A
   null path fails at `verify()` with an instruction.
13. **The gateway has never been bound against the real ComfyUI**, and `start()` (as opposed to
   `buildServer`) has not been exercised.
14. **The API is single-tenant, so its owner-isolation checks are structurally vacuous.**
    `server.mjs` hardcodes `principal: 'owner'` for every request: the bearer token authenticates the
    **operator**, not a caller. Two clients sharing the token are one principal. `createJob` checks
    `quote.owner !== principal` and the idempotency lookup filters `j.owner === ctx.principal` — both
    are correct code and neither can be reached over HTTP today. This is a **scope gap, not a defect**,
    and it is why `AUTH-002` (per-caller opaque tokens and scopes) is a wiring job rather than a
    rewrite: the isolation logic is already written and tested, it simply has no caller identity to
    work with. Asserted in round 8's section A so it cannot quietly stop being true. Round 9's section B
    goes further and pins the *ordering* that makes it true: ownership is tested before expiry, so a
    foreign quote and a missing quote give the same answer in every state — including expired, where the
    reverse order leaked the difference as a 410-vs-404 oracle.
15. **`POST /v1/jobs/:id/cancel` can only ever refuse, and that is measured rather than argued.**
    `createJob` calls `runner()` before the 202 is written, and the runner's first act is a microtask
    that sets `running`. Node drains microtasks before it reads another request off the socket, so by
    the time any second request can be handled the job is already dispatched — the 202's
    `state: "queued"` is true at the instant it is written and **stale on arrival**. Round 10's section A
    submits and immediately cancels 12 times and records **0 successes**; every attempt is
    `409 E_CANCEL_TOO_LATE`, which is the *truthful* answer. So the endpoint is honest and useless rather
    than dishonest: it does not claim to have stopped anything. The branch becomes reachable as soon as
    dispatch is queued rather than immediate, and until then a caller who wants to abandon work should
    stop polling rather than expect a cancellation. Disclosed in `cancelJob`'s comment as well.
16. **The operator's territory is one variable, so a multi-jurisdiction operator gets the STRICTER
    reading rather than the one they wanted.** `SWAN_OPERATOR_TERRITORY` is a single value, and
    `licenceGate.territories()` evaluates it *plus* any territory the request names, with the first
    refusal winning. That is deliberate — the licence restricts where the weights run, and before round 11
    the request's territory was the FIRST thing read, which made the exclusion self-certified. The cost is
    that an operator genuinely running in two jurisdictions cannot declare that per request; they would
    have to run a process per jurisdiction. Not implemented, and named here so the limitation is a
    decision rather than a discovery.

17. **`agentVersion` is `null` in every provenance record, and the audit does not check it.** `buildProvenance` accepts it and `generateVideo.mjs` never passes it, so the field is present, always empty, and outside `auditProvenance`'s completeness check — a field that reads like provenance and carries none. Left that way deliberately rather than filled with a guess: an invented version string is a fact nobody can later disprove, which is worse than an acknowledged blank. Pinned by a DISCLOSURE check in round 16's section C so it cannot quietly stop being true.

18. **The record's `modelVersion` is the catalogue's DECLARATION, not a measurement of what ran.** `buildProvenance` prefers `result.modelVersion`, and **no shipped adapter returns one** — so the branch round 16 added as "the most specific source" never executes, and every record states what the catalogue says *should* run. Nothing in the record names the ComfyUI graph that actually selected the weights, so for a local run the record cannot be used to tell which graph produced the asset. Round 17 pins both facts as DISCLOSURE checks rather than fixing them: choosing a graph identity is an adapter change, and the adapter is Sean's call.
19. **Round 16's tri-state booleans are unreachable from the runner.** `generateVideo.mjs` passes `commercial: p.commercial !== false` and `grantRecorded: readGrants(env).has(providerId)` — a comparison and a `Set.has()`, both booleans by construction — so `usedCommercially: null` and `grantRecorded: null` never occur in production. The tri-state protects the exported API surface (a direct `buildProvenance` caller, or `snapshotLicence` with an incomplete licence) rather than the run path. Stated so the change is not read as "the runner can now record an unknown", which it cannot.

20. **~~A graph that fails ON THE GPU is reported as `E_NO_OUTPUT`, with the wrong message, and is retried.~~ The REPORTING half is CLOSED in round 19; the RETRY half is item 21.** ComfyUI reports a graph that errored as `outputs: {}` with `status_str: "error"` — and `{}` is TRUTHY, so the poll loop's `entry?.status?.completed || entry?.outputs` breaks on it and the adapter concludes the graph finished. `findOutputFile` then finds nothing and the refusal is `E_NO_OUTPUT`: *"ComfyUI reported completion but produced no video output. Check that the graph ends in a video-saving node."* The node's own exception — measured with `CUDA out of memory` — is sitting in `status.messages` and is never read, so the operator is sent to the wrong problem. And `E_NO_OUTPUT` is **not** in the runner's `PERMANENT_CODES`, so the queue re-renders the identical broken graph at full GPU cost on every attempt. Round 18 proves all three parts through `generate()` and **does not fix them**: the repair needs a new code and a permanence decision, and `PERMANENT_CODES` lives in `backend/scripts/handlers/generateVideo.mjs` — the runner, which is Sean's call. Named rather than silently closed, the way round 13 handled the ceilings. **Round 19 closed the reporting half** — a failed run raises `E_GRAPH_FAILED` naming the node and quoting its own exception, decided by `comfyuiHistory.mjs`; `E_NO_OUTPUT` survives with its exact wording but is now reached only for a graph that genuinely finished. The disclosure is left in place, struck through, because the original reasoning is what justifies the split.

---

21. **The two GPU-failure codes are BOTH still retryable, and that is the runner's call.**
    > **SUPERSEDED 2026-09-22 — read item 25 before acting on the sentence below.**
    > This item originally continued: *"The one-line change is to add `E_GRAPH_FAILED` (and arguably
    > `E_NO_OUTPUT`) to that set."* **Round 25 measured that change and it is wrong.**
    > `E_GRAPH_FAILED` is a **MIXED** code whose canonical instance in this lane is
    > `CUDA out of memory` — a fact about the *moment*, not the graph — so adding the code to
    > `PERMANENT_CODES` would make OOM permanent and **throw away jobs that would have succeeded**.
    > Item 25 is the superseding entry: permanence is decided per **INSTANCE** in the adapter, from
    > the node's own exception; `E_NO_OUTPUT` is not mixed (it is reached only after the graph
    > finished) and **does** join the set. Two codes, two mechanisms, and the asymmetry is the
    > finding. The original sentence is retained below because the reasoning it rests on is what
    > makes the correct answer legible — but it is guidance no longer, and the repair it names
    > would re-open the defect round 25 closed.
    >
    > Both halves are now true: the **RETRY** half moved into the adapter (round 25), the
    > **REPORTING** half closed in round 19. The disclosure checks still flip as designed.

    Round 19 gave a failed graph a code of its own, but `E_GRAPH_FAILED` is absent from `PERMANENT_CODES` in `backend/scripts/handlers/generateVideo.mjs`, exactly as `E_NO_OUTPUT` is. A graph that raises identically every time — an OOM on the same weights, a node that cannot load a missing model — is worth another full GPU render on each attempt, and the queue will spend it. Round 19 does **not** close this: changing the runner is an engine behaviour change, and it is Sean's call. ~~The one-line change is to add `E_GRAPH_FAILED` (and arguably `E_NO_OUTPUT`) to that set.~~ Both probes now carry a DISCLOSURE check that FLIPS the day it happens, so the disclosure cannot outlive the gap — the idiom round 13 used for the ceilings. What round 19 does guarantee is that the operator learns the truth on the FIRST attempt, whatever the queue then does.
22. **The mid-run history shape is synthetic.** The `B.` check proving that a still-executing job is not read as finished uses `{ status: { completed: false }, outputs: {} }`, which is the shape the predicate cannot distinguish from a failure — but this lane has never seen a real ComfyUI emit it mid-run, because ComfyUI is not running on this machine. The measured fact is about the PREDICATE, not about ComfyUI: `entry?.outputs` is truthy for `{}` whatever the server meant by it. Closing the gap needs the render box up.

23. **The hosted lane's three new codes are all still RETRYABLE, and the artifact guard is a scheme check rather than an allowlist.** `E_POLL_REJECTED`, `E_INSECURE_BASE_URL` and `E_BAD_ARTIFACT_URL` are all configuration or contract facts — a wrong key, a cleartext base URL, an artifact URL that cannot be trusted — so all three fail identically on every retry, and none is in the runner's `PERMANENT_CODES`. Same shape as item 21: `backend/scripts/handlers/generateVideo.mjs` is Sean's call, so round 20 maps them and names the gap, and the probe carries a DISCLOSURE check that flips the day they are added. Separately, the artifact guard asserts **https** and nothing else: a vendor response pointing at an arbitrary https host is still fetched. Closing that needs an origin allowlist, which needs a fact about the vendor's CDN that this lane has never observed — so it is recorded as a limit rather than guessed at.
24. **`redactSecrets` silently skips anything shorter than six characters.** The threshold exists so a one-character secret cannot rewrite a whole message, but it is a silent policy: a credential under six characters is echoed in full into a thrown message. Real vendor secrets are far longer, so this is theoretical — pinned by a DISCLOSURE check so the threshold cannot move without this note being revisited. No live call has ever been made, so the vendor's actual error-body shape remains unobserved (see item 1's sibling: `No live Higgsfield call`).

25. **The handover patch on disk is NOT the artifact this document describes.** Round 23 checked the
    receipt against the filesystem, which is the one thing the earlier rounds' "regenerate, then
    re-verify" rule assumes somebody did. `ss-media-api-2026-09-18.patch` in the session workspace is
    **500,862 bytes and 39 files**, dated `2026-09-18 20:38` — a round-12-era artifact — while the
    text below describes **92 files (9 modified, 83 new)**. The `gen-lane-patch.sh` that
    produced it is **not present** in either workspace, so it cannot be re-run from here and the
    documented artifact cannot be reproduced. This is skill §17.4's finding in the handover slot:
    *verify the artifact that exists, not the one the receipt names.* Two things follow, and the
    second is the one that matters: the patch is **superseded as the handover of record by the
    commit** (`9f9957b1b` on `feat/media-api-2026-09-18`, plus round 23's commit), because a commit
    is checkable with `git rev-parse` and a stale file is not; and **regenerating the patch is a
    deliberate omission, not an oversight** — writing a new generator with different completeness
    assertions than the one the document describes would produce an artifact whose receipt nobody
    can audit, which is worse than an acknowledged stale one. Named here so the next reader does not
    discover it by trying to apply it.

26. **`normalizeProviderResponse` reports a FAILED run as `completed` when a URL is present, and no
    shipped adapter calls it.** `status: videoUrl ? 'completed' : (rawStatus || 'queued')` — the rule
    is deliberate and round 7 pinned it (`{status: 'processing', videoUrl: 'd.mp4'}` → `completed`),
    because several APIs return a finished asset alongside a stale status. The gap is that the rule
    has **no exception for a failure**: a vendor envelope carrying `status: 'failed'` *and* a
    `videoUrl` reads as success, and `rawStatus` — which would say otherwise — is preserved beside it
    but is not what a consumer reads. Recorded as a **disclosure rather than a round-24 finding**,
    because `normalizeProviderResponse` has **no production caller**: `higgsfield.mjs` and
    `comfyuiLocal.mjs` each run their own poll loop and never reach it. A defect with no caller is a
    style opinion until an adapter uses the export, and inflating it into a finding would be the
    same error as deflating a real one. The moment an adapter does call it, this becomes a round.

## The branch divergence — reported, not papered over

This is material and it is not something I can fix from here.

```
main (2b3e7a62a)                        creator-brains-engine-r2-20260915 (83a19d456)
  shared/providers/video/       ✓         shared/providers/video/       ✗
  docs/.../miniswan-comfyui-…   ✗         docs/.../miniswan-comfyui-…   ✓
```

- The **provider layer** lives on `main`.
- The **prior Astra adjudication for the H3/ComfyUI work** (`miniswan-comfyui-2026-09-16/`) lives on
  `creator-brains-engine-r2-20260915` and is **not on `main`**.
- Neither branch has both. The code and the blueprint that produced it are on different branches.

The worktree is `C:\tmp\ss-media-api` on `feat/media-api-2026-09-18`, cut from `main` at `2b3e7a62a`
— so it sees the provider layer and **does not see the prior blueprint.**

### There was no commit for twenty-one rounds, and the reason was the git binary

`C:\tmp\ss-media-api` had **no HEAD commit** from the day the lane started until round 21, and the
document said so. The stated cause was wrong: *"writes into the main repo's `.git` do not persist
from an agent session."* They do persist. The actual cause is worth recording, because it cost this
lane three weeks of "commit-verified: no" and it will cost someone else the same:

**The bundled `PortableGit` 2.55.0 that this session's `git` resolves to fails silently when creating
a ref in a subdirectory of `refs/heads/` that does not already exist.** `git commit`, `git reset
--soft` and `git update-ref refs/heads/<a>/<b>` all exit **0**, write the commit object and the
reflog, and then write **no ref** — and git prunes the empty directory it just created, so there is
no trace. A flat ref (`refs/heads/<name>`) works; a nested one does not. `GIT_TRACE=1` shows the
built-in running and stopping, with no error. The system git at
`C:\Program Files\Git\bin\git.exe` (2.47.0) creates the same ref correctly, first try.

Two consequences, both now fixed:

- The lane's first commit was recoverable rather than lost. The reflog at
  `.git/logs/refs/heads/feat/media-api-2026-09-18` still named `ba588359`, a commit made at
  `02:15` whose parent is `main` — created by a session that hit the same wall, and orphaned when
  the ref write failed. Restoring it gave the branch real history instead of a root commit.
- **The work is now commit-verified.** `018daf366` — 54 files, 11,070 insertions, 561 deletions —
  on `feat/media-api-2026-09-18`, whose parent is `ba588359`, whose parent is `main` at
  `2b3e7a62a`. The worktree is clean.

**The lesson, stated because it generalises:** a tool that reports success and does nothing is worse
than a tool that fails loudly, and the way to catch one is to verify the outcome rather than the
exit code. `git commit` returned 0 for this twenty-one times. What caught it was
`git rev-parse HEAD` in a separate process afterwards — the same discipline as §7's "a probe that
has never failed is not evidence", applied to the toolchain.

Handover is a **patch**: `ss-media-api-2026-09-18.patch` in the session workspace — **82 files**
(9 modified, 73 new), ≈1002 KB. Verified by applying it to a fresh `main` base (`2b3e7a62a`) in a
scratch repo and running **all thirty-three gates** there, not merely in the worktree the patch came
from: **1220 assertions, all green**. The same 82 files are also materialised as a safety net beside
it, built from the patch's own file list so the two cannot drift apart.

**THAT PARAGRAPH IS A HISTORICAL RECEIPT, AND ROUND 27 LABELS IT AS ONE. It is not a current claim,
and correcting its counts could never have made it one.** Astra's F6 found the document advancing it
as live verification while the paragraph immediately below disclosed that the artifact it describes
does not exist: the patch actually on disk is a **39-file, round-12-era** file, and the
`gen-lane-patch.sh` that produced this receipt is **not present in either workspace**, so the
paragraph above describes an artifact that cannot be reproduced from here (NOT-proven 25 carries the
detail). The trap is worth naming, because it is not the drift this lane has chased six times:
**a claim and a receipt are wrong in OPPOSITE directions.** A claim is wrong when it LAGS — that is
the defect rounds 20, 21, 23, 24 and 25 each found. A receipt is wrong when it is UPDATED, because it
records what a command printed on a particular tree at a particular time; rewriting its numbers to
match today's catalogue would be falsifying a record rather than repairing it. So the paragraph above
is left byte-for-byte as it was written — the numbers in it are now known to be stale, and that is
the honest state of a receipt for an artifact that no longer exists — and the current verification is
stated below instead, against the thing that DOES exist.

**The handover of record is the COMMIT, not the patch — and here is the commit this document was REVIEWED AGAINST, not the tip it rides on.** The reviewed base is `4c93db148` (round 31 — the `creator-brains-engine-r2-20260915` tip, and the commit this document rides on),
whose chain is `4c93db148` → `7c7774447` → `main` at `2b3e7a62a`. A commit is checkable with
`git rev-parse`; a stale file is not.

> **THE NAMED BASE MOVED A SECOND TIME, 2026-09-22 (round 31) — read this before treating it as drift.**
> It was `fb82c21a1` (round 28). It is now `4c93db148`. The reason is the same one that moved it the
> first time, only further along: the object store lost the subtrees the media-api lineage's commits
> point at. `fb82c21a1` survives as a commit, but its `media-api/` tree (`2dd1923f5`) and its `backend/`
> tree (`2354fb584`) are **missing**, so no tree can be read out of it and it can no longer be verified
> as an ancestor of anything. Recovery therefore rebuilt the lane's commit from the surviving working
> tree onto the last commit whose tree reads completely — `4c93db148`, the
> `creator-brains-engine-r2-20260915` tip — and that is the commit this document now rides on. The
> rebuilt commit is `68e8dc7d4`. It is path-scoped and purely additive: **+92 files (83 added, 9
> modified), 0 deletions, 0 changes outside the four lane directories** (`media-api/`,
> `shared/providers/video/`, `backend/scripts/handlers/`, and this blueprint directory). The lane's
> content is unchanged and complete; only its ancestry was rebuilt. An earlier attempt, `cb3170f0b`,
> carried only `media-api/` and this blueprint and derived 68 files against this document's 92 — gate
> 28 (E1) caught it, and it is superseded. See `OBJECT-STORE-DAMAGE.md` and
> `C:\tmp\astra-mega-r4\WORKING-STATE-R31.md`.

**WHY THE NAMED BASE MOVED FROM `b796338fb` TO `fb82c21a1` — AND WHY THAT IS NOT A COUNT FIX.** It
moved because `b796338fb` can no longer be VERIFIED as an ancestor in this repository. That is a fact
about the repository, not about the document: the object store is missing 37 trees, 4 commits and 218
blobs (see `OBJECT-STORE-DAMAGE.md` and `media-api/REPO-INTEGRITY-REPORT.txt`), and one of the four
missing commits is `4698de0e4` — **`b796338fb`'s own parent**. `git cat-file -t b796338fb` still prints
`commit`, so the name is not wrong, but `git merge-base --is-ancestor b796338fb HEAD` cannot walk past
it and exits 128. F2 asserts a RELATIONSHIP, so it fails exactly as it should when the relationship
cannot be established, and its diagnostic now says so verbatim rather than blaming the hash. Naming
`fb82c21a1` restores a base whose ancestry IS walkable here, which keeps the check meaningful while the
store is damaged. **The honest reading is that this check is currently verifying the best available
ancestor, not the reviewed one** — and when the missing objects are restored from a healthy clone, the
base should be moved back to the commit the round-3 work was actually reviewed against.

**WHY THIS SENTENCE NO LONGER NAMES A "TIP", AND WHY THAT IS R3-2.** It named a tip three times and
was wrong twice. The original named `9f9957b1b` — round 22 — while three later rounds sat on top of
it (round 23's own rule, "verify the artifact that exists, not the one the receipt names", arriving
one level up). Round 27 corrected it to `4698de0e4`, **which was stale on arrival**: true when the
sentence was written, false the moment round 27 was committed on top of it — *the commit below
carried the sentence that denied it.* Round 27's own gate 33/F2 caught that at `b796338fb` (25 passed,
1 failed). Round 28 then fixed F2 by asserting **freshness** — the named commit within one commit of
the tip — and an external review (round 3, filed as
`Z:\HostileReviews\2026-09-21-095428-media-api-round-27-28-the-f1-f7-fixes-astra.md`) found that fix
had a hole too: `git rev-list --count <named>..HEAD` is **0 for a descendant and 1 for a sibling**, so
`distance <= 1` accepts a commit that is not an ancestor at all — and any tolerance still leaves the
literal claim "this IS the tip" false, which it was.

The three failures share one cause, and the cause is structural rather than careless: **a document
that is committed inside a commit cannot name that commit.** Any sentence asserting "the tip is X"
is false at exactly the moment it is written into history, and every repair moves the tip again. So
this sentence no longer asserts a tip. It names the **reviewed base** — the commit the verification
below was performed against — which is a fact that does not change when this file is committed, and
which the gates check by **ancestry** rather than by distance: the named commit must be an ancestor of
the tree, and the tree is allowed to be ahead of it. That is the property that was always meant.
Round 28's own F2 asserted a number chosen to survive its own commit; the version below this round
asserts a relationship.

The **92 files (9 modified, 83 new)** above are the change set that chain carries
against `2b3e7a62a` — the set the patch was always meant to carry, and a number that is DERIVED
rather than asserted, by gate 28's E1, which reads the base SHA out of this document and compares it
to `git diff --name-status`.

**What is verified against the COMMIT, as distinct from the patch.** The thirty-three gates in the
readiness receipt above were run in this session against this worktree — the tree that reviewed base
`b796338fb` produces, plus this round's changes — and each gate's line records the number it printed.
That is the current verification, and it is attached to the tree it was actually run on rather than
to an artifact that cannot be reproduced. The distinction is the whole of F6: the patch receipt above
is evidence about a patch, and this paragraph is evidence about the commit.

**A receipt here is a record of a run, not a claim about today — and the derivation was fixed to
match.** Gate 28's E1 in this lane — the round-25 probe's file-count check — used to derive its
number from `git diff --name-status` **plus untracked files in the lane's directories**. The intent
was right: a lane file left untracked is invisible to `git diff` and was silently dropped from a
patch twice. But the consequence was that **any** agent who happened to leave an untracked file in
`media-api/` or in this blueprint's directory turned that gate red without changing a line of the
lane's code. Measured 2026-09-21: with two untracked scratch files present the probe derived 84 files
and FAILED; with them moved out it derived 82 and passed, against this document's own 82. **The
document was not the thing that drifted, and the tempting repair — editing the number here — would
have been a fabricated correction of a number that was right.**

Round 3, R3-5 fixed the derivation rather than the document: E1 now derives from **tracked state
only**, so its number is a property of the commit and not of the moment, and untracked lane files are
**reported separately by name** in the same gate's diagnostic instead of being folded into the count.
They are still visible — they are the original defect and the patch generator drops them — but they
are now a different fact from "the count is wrong", so a reader can tell the two apart. The control
(E3) asserts both halves, because ignoring untracked files entirely would silence the defect the
check was built for.

One caveat belongs with that, because it was observed rather than theorised: **the gate runner itself
was a producer of untracked files inside this tree.** It pointed `TMPDIR`/`TEMP`/`TMP` at
`$REPO/.tmp-gates`, so Node's compile cache and each demo run's job directory were created inside the
worktree during a suite containing gates that derive facts from `git status`. Two consecutive suite
runs with no source change between them reported a *different* gate red — gate 27 (four failures),
then gate 28 (one) — and a third reported neither. The scratch now lives outside the repository
entirely, which is the change the *observations* justify.

**The cause of those two reds is NOT established and is not claimed here.** The cache was the obvious
suspect and it was tested directly: `hostile-round24-probe.mjs` passes 13/13 with a leaked untracked
fixture present, with a foreign `.mjs` file in `media-api/`, and under continuous concurrent creation
and deletion of untracked files in both lane directories. So the mechanism was inferred, then found
unreproducible, and a confident causal sentence about it was **removed from the runner's comment
rather than left standing**. That is the same discipline this lane applies to gates: prose about a
gate is not exempt from needing evidence. What remains is the property that *is* established — a gate
that its own auditor's litter can redden is not a gate — and the repair that follows from it.

One property of that receipt is worth stating rather than hiding: **this README is inside the patch**,
so the patch's byte count and `sha256` cannot be stated exactly inside itself. The count above is
approximate for that reason; the exact figures identify the snapshot that was *verified*, and they are
recorded beside the artifact rather than in it. Any further edit to this document produces a new
artifact with a different byte count and the same 82-file list — which is why the rule below is
"regenerate, then re-verify", and never "regenerate and inherit the previous receipt".

The patch is produced by `gen-lane-patch.sh`, which **refuses to emit a patch it cannot prove
complete** — see "Re-verified from the patch" above for the two occasions on which an unasserted patch
shipped, and for the control that shows the completeness guard actually fails on the defective
artifact rather than passing vacuously. Its first check is the one that matters most here: **a lane
file left untracked is invisible to `git diff` and is silently dropped from the patch**, which is the
exact defect that shipped twice. Round 12 added five new lane files, all of them untracked at first;
the guard named each one until it was staged.

One gotcha worth recording: `git worktree add -b <branch>` failed with `fatal: invalid reference`
because **`.git/refs/heads/feat/` did not exist as a directory**. Git reported success on
`git update-ref` while writing nothing. `mkdir -p` first, then `git update-ref`. If a branch creation
silently no-ops in this repo, check for a missing leading directory before assuming anything stranger.

---

## Next

**Slice 1's demonstration is done; Slice 1's contract is not.** ComfyUI was started on the 5090 with
the real H3 graph and the lane's adapter ran against it un-stubbed: a model-rendered `h264 1280x720`
clip in **80.9s**, zero API cost. The receipt is in "The GPU ran" above, and it was a configuration
exercise rather than a build, exactly as this section predicted. The temporary operator enablement
Astra's Slice 1 entry gate required was given and has been **spent** — ComfyUI was started for this
run and is not part of the lane's steady state, so a second run needs the same enablement again
rather than inheriting it.

**Slicing is blocked on AMENDMENT 1**, not on the render. The contract's 1C still names Wan and
still requires HTTP, restart reconciliation and resource ownership on the demonstrated path; the
H3 run satisfies the *model* half of that requirement once the amendment is approved, and none of
the rest. See `forged-package/05-slices.md` for the amendment text and its four retained items.

Then, in Astra's order:

| Slice | Build status | Hostile loop |
|---|---|---|
| **1. Local over-wire vertical slice** | Gateway built, tested, and demonstrated over HTTP. **The graph render is MET** (2026-09-20, via `comfyuiLocal.mjs` with a read-back prompt-injection proof); **HTTP/restart/ownership on that path is not** — NOT-proven 13–14. An earlier revision of this row said "the video came from ffmpeg, not the graph", which was true before 2026-09-20 03:38 and is false now. | **Blocked, not dry.** Rounds 18–19 attacked the GPU-facing surface (`comfyuiLocal`, `comfyuiGraph`, `comfyuiHistory`) and found 15 defects between them. The remaining surface is the real ComfyUI, which needs Sean's go-ahead. |
| **2. Admission and crash hardening** | Partly done (atomic writes, idempotency keys, loopback enforcement, concurrent-submission probe). Missing: crash-at-every-write-boundary tests, `reconciling` instead of `failed`. | **Open.** Rounds 2, 8, 9, 10 and 22 attacked admission and the HTTP primitives; round 21 attacked the ledger's write half. The crash-at-every-write-boundary matrix is unbuilt, and `reconcileOrphans` still marks orphans `failed` where Astra asked for the non-terminal `reconciling` (NOT-proven 11). |
| **3. Hosted contract, offline only** | Mostly done: disabled rows, bounded-price arithmetic, credential redaction, `nsfw` carried through. Missing: mocked submit/poll/cancel fixtures, refund tests, retrieved OpenAPI paths. | **Open.** Round 20 attacked `higgsfield.mjs` and `higgsfieldTransport.mjs` and found 8 defects. The mocked submit/poll/cancel fixtures are still absent, so the poll loop's timing behaviour has never been driven against a stub. |
| **4. Optional owner-authorised hosted verification** | Not authorised by this packet. Requires separate spending approval and all D-F gates. | **Not started** — and correctly so. No live Higgsfield call has been made. |
| **5. Explicit routing profiles** | Not started. `409 ROUTE_SELECTION_REQUIRED` for model-only requests is unbuilt. | **Not started.** Nothing to attack yet. |

**The loop has not run dry, and round 23 is the evidence.** Twenty-three consecutive rounds have found
defects, and the two most recent found surfaces that every earlier round had walked past: round 22
found four in `http.mjs`, and round 23 found three in `completion.mjs` plus two stale counts in this
document. Each round's surface was chosen by the same rule — grep the ledger for the file, and a
surface with no mention is new ground — and that rule has not stopped producing. **Stopping is a
decision, not an observation:** the honest statement is that the next pass keeps earning its keep
until someone names a stopping point.

Also unbuilt, all named by Astra: per-caller opaque tokens and scopes (`AUTH-002`), the `transactions/`
crash journal (`STORE-001`), the multi-resource reservation ledger (`PAY-002`), the hosted enablement
gate's eight prerequisites (`D-F`), and duration binding for the local H3 graph (`DUR-001` / `DUR-002`
— `422 DURATION_UNBOUND`).

### Deliberately not done

- **No `enabled: true`** on any provider in the catalogue. Astra: *"Any implied authorization to enable
  providers or spend: neither is granted by this adjudication."* The demo enables a provider for the
  life of one process, from an env var, and says so.
- **No live Higgsfield call.** Nothing has been executed against `api.higgsfield.ai`.
- **No guessed model path.** See item 12. (This read "gap 8" until round 14, which was the wrong item even then — item 8 is about agent-side ceilings. Corrected rather than carried, because a cross-reference that points at the wrong paragraph is a small lie that a reader has no way to catch.)
- **No change to ComfyUI, the 5090 install, GSQ, or MiniSwan.** MiniSwan cannot run H3 — 29,850 MiB peak
  against a 16,376 MiB card, per the prior adjudication.
- **No paid nodes.** `partner/` nodes bill credits; `model/` nodes do not.
