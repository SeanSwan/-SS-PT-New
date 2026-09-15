# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Status:** incomplete (finish-not-stop)
**Tokens:** 67765 in / 34000 out (reasoning: 33062) | total 101765
**Wall:** 514462ms

---

**Seat: GLM 5.3 deep review — all six groups.** Findings marked **[SETTLED]** are proven from the packet alone; **[CONDITIONAL]** depend on files the packet does not contain (named in "what would settle it").

## Group 1 — "Every repair is proven by a RED→GREEN regression at the real boundary"

**1. HIGH — the blanket RED claim is unsupported for ~24 of 26 findings.**
- **Claim attacked:** Repair record §3: *"Every test is RED against the reviewed revision and asserts the repaired contract at the real boundary."*
- **Why it is wrong:** RED artifacts were saved for exactly two slices (`HR22-RED`, `HR23-RED` .txt files). For `review-repairs.test.mjs` (the evidence cited for most findings) there is **no RED capture at all** — only the assertion. Worse: the record itself documents that the repair changed public signatures (`buildBrain` pure, `renderBrain`→`publishBrain`, strict readers). A test written against the *new* contract, run against the reviewed revision, plausibly fails at import or on the old signature — which the blueprint's own §12.1 discipline explicitly rejects as RED proof. The record is careful to say "no import errors, no setup failures" for HR22/HR23; it makes no such claim here.
- **Falsification:** check out the reviewed revision, run `node --experimental-test-isolation=none --test scripts/creator-brains/test/review-repairs.test.mjs`, and classify each failure: behavioural assertion vs `ERR_MODULE_NOT_FOUND`/signature TypeError. Any setup failure disproves the claim for that finding.
- **What would settle it:** the RED log for the 35 tests, equivalent to the two saved RED files.

**2. MEDIUM — most findings have no named regression test anywhere in the packet.** 
- **Claim attacked:** Requirement-map footer: *"the per-finding test ids are in the repair record §0 and §3."*
- **Why it is wrong:** They are not. §0 is an instrument table; §3 names the file plus three defects (HR04/08/11/17 appear incidentally). Named tests exist only for the mutation-covered findings (HR01, HR09, HR18, HR22–HR25 via the mutation log) and the HR22/HR23 suites. For HR02, HR03, HR05, HR06, HR07, HR12–HR17, HR20, HR21 there is **no test id in the packet** — the "per-finding regression" is unverifiable, and the map's pointer dangles. **[SETTLED]**
- **Falsification:** search the packet for a test name adjacent to `HR05` or `HR15` — none exists.
- **What would settle it:** the suite log with per-test names, or the test files.

## Group 2 — "10/10 mutations killed, reproducibly"

**3. MEDIUM — five of ten kills rest on a killer file the packet does not contain, measured under an env that changes its behaviour.**
- **Claim attacked:** `mutations.mjs` header: a kill must be *"KILLED by a named test"*; record §4.3: 10/10.
- **Why it is wrong:** M2, M3, M5, M6, M10 are all killed by `test/mutation-gaps.test.mjs` — a file authored *after* the first run's survivors, absent from the packet — and `runKiller` injects `CREATOR_BRAINS_MUTATION_RUN=1` into every killer run, so the measurement configuration differs from the normal-suite configuration for any test that reads it. The record documents the stand-down only for MG6 (anchor re-validation); the packet cannot exclude that MG1–MG5 also branch on it. A kill earned under altered measurement conditions is weaker than claimed. **[CONDITIONAL]**
- **Falsification:** print `mutation-gaps.test.mjs`; any env branch outside MG6, or any assertion on source text rather than behaviour, weakens the five kills. Re-run `mutation-check.mjs` with the env injection removed and confirm 10/10.
- **What would settle it:** `test/mutation-gaps.test.mjs`.

**4. LOW — the harness never
