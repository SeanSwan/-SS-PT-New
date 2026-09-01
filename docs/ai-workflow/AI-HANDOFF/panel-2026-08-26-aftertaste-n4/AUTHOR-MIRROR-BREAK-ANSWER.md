# z-ai/glm-5.3-flash — Hostile Gate Review

**Reviewer:** OpenRouter `z-ai/glm-5.3-flash` (effort: high)
**Served:** `z-ai/glm-5.3-flash`
**Document:** docs/ai-workflow/brainstorms/aftertaste-mirror-break-question-2026-08-26.md
**Seed:** (none)
**Tokens:** 2357 in / 5442 out · **Cost:** ~$0.0015 · **Wall:** 112.9s · **finish:** stop

---

# GATE REVIEW — MIRROR-BREAK arbitration & 11-spec re-author letter

---

## (a) VERDICT

**REVISE** — the core move (ask the author, don't infer) is correct and the §1 circularity confession is genuinely good epistemics, but the document contains one internally impossible data table (§1), one self-contradicting escape hatch that guts its own connectivity law (§3a), one grammar-drift violation (undeclared `components:` field), and multiple unfalsifiable "fixed"/"now builds" claims with no named verification path.

---

## (b) Correctness attacks

**B1. The §1 table is arithmetically impossible under the document's own definitions.**
The row `matches declared count: 12 / 10 / 10` cannot vary across `off` / `on0` / `on1`. Readings `on0` and `on1` are pure **translations** (`z += 1`); translations do not change cell counts. Therefore `voxelCount` matches must be identical across all three translation readings. Only reading *(d)* (extent growth, `dz+1`) changes counts — and *(d)* is not a column in the table. So either:
- the `on0`/`on1` columns silently fold in reading *(d)* (undisclosed mixing of hypotheses — fatal for a document whose entire thesis is "reported and not scored"), or
- the numbers are stale or transcribed from a different run.
Either way, this table is the document's central evidence and it does not survive its own footnote. Recompute and label which readings each column actually includes.

**B2. Reconciliation gap between "12 match declared count" and "7 pass."**
Under `off`: 18 creatures, 7 pass, 11 refused, partitioned as 8 disconnected (§3a) + 3 count-mismatch (§3b), disjoint sets. But 12 − 7 = 5 creatures that allegedly match their declared count yet don't pass, and 18 − 12 = 6 that allegedly mismatch, of which only 3 are ever named. Three unnamed count mismatches exist nowhere in the document. Where are they? If disconnected creatures can *also* mismatch counts, say so and show the overlap matrix; as written, the partition doesn't close.

**B3. Reading *(e)* is presented then dropped from the actual question.**
Five readings are enumerated; the closing ask in §1 ("is 'odd' counted from 0 or from 1? And is `z += 1` a translation or an extent change?") resolves only readings `on0`/`on1`/*(d)*. Reading *(e)* — odd-indexed over **N statements** rather than copies — is never asked about. The author can answer both posed questions completely and leave *(e)* unresolved. Add it explicitly.

**B4. Missing ambiguity: stacked vs. flat lift.**
"Odd-indexed copies receive `z += 1`" does not specify whether copy *i* receives `z += 1` (flat) or accumulates with the shift term (effectively `z += 1` once vs. interacting with `i·sz`). Translation-commutativity saves you on ordering, but flat-vs-per-copy is a real fork the question set misses.

**B5. Standing-bias claim is asserted, not shown.**
"A z-lift also breaks face contact far more often than it creates it, so the measure carries a standing bias toward `off`" — no derivation, no example, no count. This is exactly the class of unsupported inference the document spends §1 apologizing for. Either prove it on this roster or cut it.

**B6. No error-path / stall path.**
Status `open`, no deadline, no fallback. If the author is unreachable, 14 of 18 assets (per the doc's own "14 of 18 build differently") are blocked indefinitely. Specify a default resolution (e.g., "if no answer by date X, adopt `on0`, rebuild, and record the deviation in the roster changelog") or the pipeline has a single point of human failure.

**B7. §2's computations are reading-dependent and the doc doesn't admit it.**
"`deep.barreleye` … declares 24, sums to 24, unions to 22 … now builds" — built under `off` (per §1). If the answer comes back `on0`/`on1`/*(d)*, barreleye's sum/union figures change and the "falsely refused" exoneration may not hold. Cross-section dependency unacknowledged.

---

## (c) Security attacks

Mapped to this artifact's actual attack surface (content pipeline, parser, gate):

**C1. Parser DoS via unbounded arity.** "Every statement must be a whole production with exact arity" fixes malformed-syntax injection, but nothing bounds `k` in `N(k,sx,sy,sz,…)` *before* expansion. `k = 10⁹` with the 4–40 cell check applied post-expansion is a memory bomb. Bound `k` (and |sx|,|sy|,|sz|) at parse time, reject before allocation.

**C2. Version-pinning / replay.** The letter requests corrected blocks with no roster revision identifier. If the author answers against a stale roster state (or the roster is edited while the answer is in flight), corrections apply to drifted input. Pin the request to a roster hash and have the gate verify the hash on receipt.

**C3. The `components: N` field is an authorization bypass on the connectivity invariant** — see (f). Any consumer who learns the field name can ship arbitrary fragment piles.

**C4. Dual-convention acceptance widens the accept-set permanently.** "A declared count is checked against either" means an overlapping recipe passes on whichever number is larger. This is a scope-weakening change made unilaterally pending author confirmation. Accept-either should be a temporary, logged leniency with an expiry, not the new steady state.

No PII concerns — the ID/role-only discipline holds throughout; coordinates and creature IDs are not personal data. No secrets present.

---

## (d) Data-truth / schema-drift (Rule 58)

**D1. Grammar drift: `components: N` does not exist in the quoted grammar.** §1 quotes the BOX grammar as `N(k,sx,sy,sz, C(...))` plus GLOBAL RULES. §3a instructs the author to emit a `components` field that grammar does not define. This is precisely the model-column-vs-caller-field drift Rule 58 exists to catch — the gate will accept a field the published schema doesn't contain, or the quoted grammar is already stale. Amend the grammar block in the same document that introduces the field.

**D2. Field-naming drift:** prose uses `voxelCount` (camelCase), the formula uses `cells = Σ(dx·dy·dz)`, and §3b reports "declared / distinct / summed" — three vocabularies for related-but-distinct quantities with no statement of which field lives where (inline in recipe? sidecar manifest?). When the author answers "which convention," the gate must also state *which stored field* it writes/checks, or the next audit rediscovers this exact bug.

**D3. Frontend/response-shape:** `.obj` headers "record" the MIRROR-BREAK reading — but the header format isn't specified, so downstream consumers can't distinguish `off` builds from `on0` builds mechanically. Define the header token now (e.g., `# mirror-break: on0`) or the seven rebuilt creatures are indistinguishable from the current ones.

---

## (e) House-rule violations & speculative-success language

- **Speculative/unverifiable success claims:** *"now builds"* (§2, barreleye), *"That is fixed"* (§4, parser strictness), *"it means a typo now comes back to you as a refusal"* — none cite a commit, test name, or refusal transcript. Per panel standard, every "fixed" needs a named verified path (e.g., "parser strict-mode, PR #_, refusal cases: missing-bracket, bad-arity-N, trailing-text"). Currently these are trust-me statements from the same party the document itself argues against trusting.
- **Self-contradiction on attestations:** §1 correctly rejects author self-attestation as an oracle ("authored by the same party whose counts this roster gets wrong… it cannot judge itself"). §3a then makes author self-attestation (`components: N`) *sufficient* to waive the connectivity law. You cannot hold both positions. Pick one.
- Palette/token usage (`--world-danger` telegraph-only) is compliant in spirit; add the required fallback form `var(--world-danger, #fallback)` when this constraint text is next copied into spec templates. No banned terminology ("yoga/meditation") present; credential phrasing N/A. Privacy header (`IDs/roles only`) is compliant and honored.

---

## (f) SINGLE HIGHEST-RISK ITEM

**The `components: N` opt-out (§3a).** As specified, the gate "will verify that number instead of assuming 1" — meaning a creature shattered into *N* arbitrary fragments passes by adding one integer. Combined with the fact that the verifier of that integer is the same author whose declared counts are wrong on three creatures (the doc's own §1 finding), this converts the cluster-touch law from an enforced invariant into an honor system, permanently, for every future roster — and it directly contradicts the document's own anti-attestation argument.

**De-risk before ship:** require `components` declarations to carry a **partition**, not a count — i.e., the author declares which cell-ranges belong to which component, and the gate verifies (1) the partition covers all occupied cells, (2) each component is internally 6-connected, (3) the component count equals `N`. Deliberate multi-part creatures (detached lure, floating wings) then pass *with structure verified*, while a typo'd bridge still fails. Restrict the field to named appendage classes if you want a tighter fence. Until this lands, `components: N` should not be offered to the author as fix-option B in §3a — offer bridging cells only.

Secondary de-risk (cheap): recompute the §1 table with columns explicitly labeled per-reading-composite (including *(d)*), reconcile the 12-vs-7 gap, and attach refusal transcripts for the "parser is now strict" claim before this letter goes out.
