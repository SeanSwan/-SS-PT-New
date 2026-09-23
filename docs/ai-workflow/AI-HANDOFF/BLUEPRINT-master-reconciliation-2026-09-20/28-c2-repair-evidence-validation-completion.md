# 28 — C2 "Repair evidence validation" completion record

**Status:** COMPLETE — orders 4 and 5 satisfied.
**Round 2 lane:** C2 (`05-slices.md`), orders 4–5.
**Round 2 stop condition:** *"Four named matrix cases pass; contradiction tests fail for their named
reasons; source/policy membership checks demonstrated; real caller-path proof remains separately
identified."* — first three satisfied; the fourth is explicitly out of scope and named in §5.

---

## 1. The defect being repaired (R2-06, High)

> *"Hash-correct garbage can satisfy admission evidence."*

`artifact()` establishes that bytes match a supplied hash. It does **not** establish that the bytes
support the receipt's assertion. Before this repair, five checks stopped at `artifact(...)` and never
interpreted what they hashed. Astra's table, reproduced as measured behaviour:

| Check | False evidence the old code accepted | Now rejected by |
|---|---|---|
| Required behavior evidence | `result.output` = `not a test result`; receipt says PASS, exit 0 | `assertRunReport` → `E_RUN_REPORT_INVALID` |
| Ordered filed reviews | archive says `verdict: DEFECTS-FOUND`; receipt says APPROVE | `assertReviewContent` → `E_REVIEW_CONTENT` |
| Terminal evidence | file says `{"status":"failed"}` | `assertTerminalEvidence` → `E_TERMINAL_EVIDENCE` |
| Identity evidence | file contains `null` | `assertIdentityEvidence` → `E_IDENTITY_EVIDENCE` |
| Final admission | attestation contains `DENIED`; receipt says ADMIT | `assertAdmissionAttestation` → `E_ADMISSION_ATTESTATION` |

Two further R2-06 findings are also closed:

- **`authorityRefs` only needed nonzero length.** Each ref must now resolve to a declared authority
  inside the frozen source/policy scope (`E_AUTHORITY_UNBOUND`).
- **The budget record was hashed without validating its meaning.** It must now bind the cited
  policy, be authorised, and carry a non-negative spend (`E_BUDGET_UNBOUND`).

And the R2-07 finding that the **`storageAttestation` was never parsed** — so its device evidence
was decorative — is closed by binding attestation `sourceId`, `inventorySha256` and copy list to the
record it attests (`E_STORAGE_UNBOUND`).

**The governing rule:** the OUTER assertion and the ARTIFACT it cites must agree, and a disagreement
must be **named**, so a caller can distinguish a semantic contradiction from a hash mismatch or an
I/O error. That is why every rejection above carries a stable reason code rather than a generic
assertion message.

---

## 2. Order 4 — Astra's Matrix A, materialized

`scripts/blueprint-master-evidence.regression.test.mjs` reproduces Astra's fixture as specified. It
loads the shipped checker into a `vm.SourceTextModule` with synthetic module resolution, so:

- `node:fs` is an **in-memory virtual filesystem** — nothing on disk is touched;
- `node:child_process` **throws on any call**, proving no case shells out to Git;
- `node:test` is captured, so the checker's **real registered callbacks** are invoked directly.

`callbacks()` asserts all three named callbacks exist before any case runs, satisfying Round 2's
requirement that *"renaming or disconnecting a callback is a setup/wiring failure, not a successful
negative case."*

### Observed behaviour — before and after

Against the **unrepaired** checker (the baseline Astra asked to observe):

```
ok      AT-01 valid synthetic evidence control
not ok  AT-02 rejects garbage ...    "Missing expected exception."
not ok  AT-03 rejects review ...     "Missing expected exception."
not ok  AT-04 rejects alias ...      "Duplicate values"   (wrong reason)
```

AT-02 and AT-03 accepted their false evidence outright, exactly as R2-06 predicted. AT-04 rejected —
the R2-07 duplicate-root check was already present — but with a generic message rather than the
`E_COPY_ALIAS` reason Astra named.

Against the **repaired** checker:

```
ok  AT-01 valid synthetic evidence control
ok  AT-02 rejects garbage for its designated reason
ok  AT-03 rejects review for its designated reason
ok  AT-04 rejects alias for its designated reason
# tests 4  # pass 4  # fail 0
```

### R2-07 additions in the same lane

`E_COPY_ALIAS` is now the explicit reason for a duplicate resolved copy root, and **ancestor link
resolution** is checked — a copy root's own link status does not establish that none of its ancestors
redirects it, which R2-07 named specifically.

---

## 3. A repair that broke its own control, and how it was found

The first repaired revision made **AT-01 fail**. The cause was not the semantic checks: my new
`scopeMembership` initializer read `snapshot.files`, which Astra's fixture deliberately omits
("the fixture deliberately does not certify the complete snapshot schema"). The repair therefore
hard-depended on a field the acceptance fixture is entitled to leave out.

This is recorded because it is the reason the fixture is written to Astra's spec rather than to a
convenient local one: **a fixture that supplies everything the implementation wants cannot detect
that the implementation over-demands.** The scope set is now built defensively from whatever the
snapshot actually declares.

A second self-inflicted failure followed: AT-02 rejected but with the message *"is not valid JSON"*
instead of `E_RUN_REPORT_INVALID`, because the JSON parse error surfaced before the named reason.
`artifactJson` now takes a reason code, so the named reason is emitted on a parse failure too.
Round 2 requires rejection *"for its designated reason,"* and a rejection for the wrong reason is
not the evidence the case is claiming.

---

## 4. Verification summary

| Suite | Command | Result |
|---|---|---|
| Matrix A (C2) | `node --experimental-vm-modules --test scripts/blueprint-master-evidence.regression.test.mjs` | **4/4 pass** |
| Matrix B (C3) | `node --test scripts/intake-reach.regression.test.mjs` | **8/8 pass** |
| Checker guard | run without `BLUEPRINT_RECEIPT` | still fails loudly ("Set BLUEPRINT_RECEIPT…") |

`scripts/lib/*.test.mjs` reports 202/205, with 3 failures in `scripts/lib/recursive-consensus.test.mjs`.
Those are **pre-existing and independent**: the file is untracked, dated 2026-08-13 (source
2026-08-16), and neither file references anything changed here. They are not reported as green and
are not attributed to this work.

---

## 5. What this does NOT claim — the separately-identified fourth obligation

Round 2's stop condition for C2 names a fourth obligation, *"real caller-path proof"*, and the
coverage table marks it **NOT RUN**. It remains NOT RUN and is not implied by the matrix:

- **Real caller wiring / G3 isolated caller-path run** — the matrix exercises the checker's
  callbacks in a VM, not the production admission path. Astra's requirement is a G3 run with valid
  controls and **bound collection provenance**.
- **Evidence authenticity** — R2-06 states plainly: *"Authenticity requires a trusted
  collection/authority boundary; adding more self-authored JSON does not create one."* No such
  boundary is demonstrated here, and none is claimed.
- **Ignored registry/authority exclusion** — membership is now checked against the frozen scope, but
  a demonstrated rejection of a *consumed ignored artifact* is still owed.
- **No real receipt exists on disk.** The checker has never been run against production evidence in
  this repository; the historical 8/8 result remains unproven (Astra's U4).

Per Round 2 PART C, *"the matrices' 4/4 + 4/4 target is a bounded regression result, not the
complete acceptance count."* **Product admission remains blocked.** Round 3 is still owed, and its
named target remains the admission caller path.
