| Gate | Required evidence | Passing meaning |
|---|---|---|
| G0 — Rescue captured | Provisional copy inventory and explicit gaps | Available vulnerable bytes have a rescue copy |
| G1 — Preservation verified | Stable source reconciliation, copy hashes, storage attestation | L6 preservation requirement satisfied |
| G2 — Authority resolved | Canonical policy amendment, registry, lane authorities and reviewer policy | A slice can be prepared under a determinate process |
| G3 — Source bound | Full commit/tree, clean isolated checkout, complete tracked-file manifest, scoped boundary receipts | Review target is identifiable |
| G4 — Behavior verified locally | Actual lane commands/results, fixtures and real-boundary evidence | Specified local acceptance criteria passed |
| G5 — Reviewed and filed | Required ordered reviews, terminal/identity evidence, archive IDs, findings disposition | Existing final authority can decide admission |
| G6 — Admitted | Exact-revision final-authority attestation | Only that revision may integrate |
| G7 — Integrated | Resulting revision, affected test union and applicable combined review | Implementation verified within its recorded scope |
| G8 — Deployed | Separate release authority, deployment identity and live checks | Only the evidenced deployed behavior is established |

**Current receipt**

| Item | Status |
|---|---|
| Master package emitted | **[VERIFIED]** This response |
| Source exploration or live verification | **NOT RUN**, by dispatch scope |
| Preservation | **NOT RUN** |
| Policy amendment / registry written | **NOT RUN** |
| Executable evidence test source supplied | **[VERIFIED]** `09-tests.md` |
| Evidence or lane tests executed | **NOT RUN** |
| Full lane documents and archive bodies reviewed | **NOT RUN** |
| This master review filed | **Caller action pending** |
| Any lane admitted | **No** |
| Combined implementation verified | **No** |
| Deployment | **Not established** |

**Caller filing record**

File this combined planning review with:

- Subject: `master-blueprint-reconciliation-20260920`
- Verdict: `DEFECTS-FOUND`
- Scope: supplied eight-lane excerpts and cross-lane reconciliation; excludes unsupplied lane bodies and runtime implementation.
- Reviewed source: the supplied packet and emitted package, bound by artifact hashes.
- Repository commit: reported `382427ae6`, explicitly marked inherited and insufficient to identify the dirty tree.
- `unproven`: source currency, full lane contracts, runtime behavior, defect dispositions, preservation and deployment.
- Supersession: none unless the caller establishes an actual earlier review of this same master scope.

Use actual caller/tool metadata. Do not invent filing time, review ID or verified identity. Run the archive’s existing indexing process and retain its result.

**Long-running progress record**

Each admitted task keeps a compact record of:

`finished → exact revision/artifacts → failed or blocked → next authorized action`

This is working state, not an automatic continuity closeout.

**Artifact hygiene**

Expected new artifacts are the master package, registry, one evidence test file, revision records and local preservation copies. Keep temporary outputs inside the evidence directory. Do not place ad hoc logs or screenshots at repository root. Preserve filed reviews and preservation evidence.
