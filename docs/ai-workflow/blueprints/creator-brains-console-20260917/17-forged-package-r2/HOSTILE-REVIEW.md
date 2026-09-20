# PART A — Hostile Review (Astra Pro)

> Review first, per the Forge: findings carry file:line evidence and a fix.
> A finding without a fix is not a finding.

---

**Verdict: REVISE.** The relocation is verified. Several claimed closures are incomplete, and the new containment and worker implementations introduce gaps that must close before S2.

Evidence prefixes:

- `C/` = `packages/creator-brains-console/`
- `E/` = `scripts/creator-brains/`
- `P/` = `docs/ai-workflow/blueprints/creator-brains-console-20260917/`

**Verified review boundary**

[VERIFIED] Inspected branch `creator-brains-engine-r2-20260915`, HEAD `3fb767374df673da32e26372459962b47baf838a`, dirty shared checkout. Input packet SHA-256:

```text
1d0bf0c40c8983be6a315dd1e078fe57441ddb4338e48a1932cfa63fdf46337b
```

[VERIFIED] Fresh checks:

- `node scripts/creator-brains/consistency-check.mjs`: **15/15**, 85 engine `.mjs` files, exit 0.
- `npm --prefix packages/creator-brains-console/web run typecheck`: **PASS**, exit 0.
- Fatal UTF-8 probe: malformed byte inside a quoted JSON string rejected; valid control accepted.
- In-memory filesystem probes exercised the actual drawer/query functions and reproduced the failures below.

[UNKNOWN] Current bridge/web suite results, real filesystem attacks, browser behavior, launcher behavior, GPU performance, and cross-process journal preservation. Fixture-writing suites were not executed in this read-only session. Historical mutation receipts were not independently reproduced.

**A1 — Verification of all sixteen round-1 findings**

| Round-1 ID | Round-2 disposition | Evidence and required correction |
|---|---|---|
| A1-01 | **CLOSED for installation-layout defect** | [VERIFIED] Fresh consistency check passes; neither staged nor unstaged engine changes outside the old console subtree appeared in the scoped diff. This does not establish a fresh full-engine suite result. |
| A1-02 | **PARTIAL** | [VERIFIED] Server split and relocation stand. `P/readiness.json:6`, `P/07-traceability.md:3`, and active document headers remain stale. Correct under R2-07. |
| A1-03 | **REOPENED** | [VERIFIED] `C/web/src/adapters/types.ts:16,85,103,123` still contradicts the amended contract. R2-01. |
| A1-04 | **PARTIAL** | [VERIFIED] Claims now exist, but generation consistency fails when the second generation contains no valid hits. R2-03. |
| A1-05 | **AMENDED, implementation deferred** | [VERIFIED] `P/05-contracts.md#1` changes acceptance, but §2b and actual adapter signatures retain the old shape. R2-06. |
| A1-06 | **GATE ACCEPTED; unresolved** | [VERIFIED] Journal precedes lock acquisition at `E/lib/run.mjs:107,154`. Apply the gate to repair too. R2-06. |
| A1-07 | **PARTIAL DOCUMENT CORRECTION** | [VERIFIED] Contract §1 is corrected; §2b, test T-B10, and adapters still promise `requeued`. R2-06. |
| A1-08 | **BLOCKED, correctly retained** | [VERIFIED] Backup remains absent from `C/routes.mjs:80`. Active S3 instructions must stop scheduling it. R2-06. |
| A1-09 | **PARTIAL** | [VERIFIED] Adapter sends the required header. Origin checking accepts unrelated loopback origins. R2-05. |
| A1-10 | **OFF-THREAD CHANGE PRESENT; closure incomplete** | [VERIFIED] Production probe uses a worker; lifecycle failures and stale-result isolation are missing. R2-04. |
| A1-11 | **REOPENED** | [VERIFIED] Directory checks cover the drawer only, not query or individual files. R2-02. |
| A1-12 | **SOURCE CORRECTION VERIFIED** | [VERIFIED] `C/lib/creators.mjs:99` preserves engine consent and uses nonthrowing measured-or-null counts. New regression tests exist; fresh suite execution remains NOT RUN. |
| A1-13 | **AMENDMENT ACCEPTED; propagation incomplete** | [VERIFIED] `P/19-held-findings.md#5` distinguishes refusal from uncertainty, but T-B19 still states the broader invariant. R2-06. |
| A1-14 | **PARTIAL** | [VERIFIED] Engine live-test exclusion is described; 375px drawings and mock matrix remain owed. New test-ID collisions exist. R2-08. |
| A1-15 | **VERIFIED** | [VERIFIED] `C/lib/http.mjs:173` uses fatal decoding; the direct malformed-string probe rejects with `VALIDATION`. |
| A1-16 | **PARTIAL** | [VERIFIED] README attribution improved; the amendment’s assertion that predictive usage claims were removed is false. R2-10. |

**A1 — Findings against the fixes and remaining active package**

| ID | Severity / confidence | Finding, evidence, concrete fix |
|---|---|---|
| **R2-01** | **High [VERIFIED]** | **The declared contract closure did not reach the contract or mounted consumer.** `types.ts:16` narrows status health; `:85` omits generation and retains `slug`; `:103` excludes `unknown` and null provenance. `LocalEngineAdapter.ts:80` still casts every non-status response. `StatusBoard.tsx:178` renders historical success as ordinary “ok” and pending health as “not resolved.” This contradicts `P/19-held-findings.md:21,46,53`. **Fix:** synchronize types, fixtures, serializers and consumed-route validators; render pending/history/failure explicitly. Preserve `slug` as the compatibility field containing a channel ID. |
| **R2-02** | **High [VERIFIED control flow; UNKNOWN live exploit]** | **Containment does not protect the complete read surface.** `C/lib/brains.mjs:147` calls `queryBrains` directly; `E/lib/render.mjs:68` joins unchecked pointer generations; `E/lib/query.mjs:57` reads that path. The synthetic probe returned a hit after reading `outside/rules.jsonl`. Drawer containment checks directories at `C/lib/brains.mjs:127`, then opens unchecked leaf files at `:241`; pointer files are also read before containment. **Fix:** one console-owned contained reader for pointer, generation and every derived leaf, used by both query and drawer. Reject escaping links before content reads. Retain real Windows filesystem tests as a release gate. |
| **R2-03** | **High [VERIFIED]** | **The generation guard operates on hits, so an empty generation bypasses it.** `C/lib/brains.mjs:259` resolves the pointer again; `:265` compares generation only inside the hit loop. The synthetic pointer-switch probe returned `generation:"gen-0001"`, markdown from generation 1, and empty claims read from generation 2. **Fix:** pin one pointer and read all four files directly from that generation. No second `loadHits()` traversal. Test switches to empty, malformed and missing-rules generations. |
| **R2-04** | **High [VERIFIED omissions; LIKELY process failure]** | **The worker has no owned failure lifecycle.** `C/lib/health-probe.mjs:36` creates a worker without `error`/`exit` handlers or a watchdog. `:75` clears only a Boolean; it neither terminates the worker nor drains/version-tags queued messages. `C/lib/health.mjs:75` caches history globally despite accepting a store root. **Fix:** retain worker/port ownership, handle error/exit/timeout, discard obsolete epoch messages, close resources on reset/shutdown, and isolate history by canonical store root. A worker startup failure must become a reading, not an unhandled process error. |
| **R2-05** | **Medium [VERIFIED contract deviation; UNKNOWN browser exploit]** | **“Same-origin” became “any loopback origin.”** `C/lib/write-gate.mjs:85,94,136` accepts any loopback port. The direct probe accepted `http://localhost:5173`. Its development justification at `:45` does not work in a browser: the adapter defaults to the page origin, while cross-origin custom-header requests receive no CORS permission. **Fix:** exact serving-origin equality, preserving Origin-less native clients and `x-console-write`. Serve the built app from the bridge; do not invent a cross-origin development exception. |
| **R2-06** | **High [VERIFIED]** | **Active build instructions can recreate rejected behavior.** `P/05-contracts.md#2b` retains `{runId}` and `{requeued}`; `P/08-slices-operations.md:10` schedules Backup; `P/06-test-plan.md#T-B19` retains “non-2xx means nothing was written.” Repair invokes the same `runDaily` journal path, but the amendment gates S4 alone. **Fix:** replace these instructions together; gate both repair and daily runs; retain Backup visibly blocked. Also replace the “engine change required” add-blocker claim with the additive resolver-worker design supported by `E/lib/registry.mjs:111`. |
| **R2-07** | **Medium [VERIFIED]** | **The machine-readable next step still describes the pre-relocation world.** `P/readiness.json:6` says the engine gate is red and D7 awaits Sean; `P/07-traceability.md:3` says no code exists. These are active control artifacts, not historical receipts. **Fix:** refresh current status and hashes, distinguish implemented source from runtime verification, and make the next slice S0H hardening. Preserve historical receipts unchanged. |
| **R2-08** | **Medium [VERIFIED]** | **New tests repeat the traceability defect and miss the relevant races.** `C/test/bridge.writegate.test.mjs:41` reuses T-B22a, already assigned at `bridge.brains.test.mjs:37`. `health.offthread.test.mjs:121` proves only that reset clears a flag. `bridge.brains.test.mjs:229` checks two namespaces, not a pointer switch during one read. **Fix:** retain T-B22 for brains, assign write-gate tests T-B26, enforce unique IDs, and add the explicit races in `09-tests.md`. |
| **R2-09** | **Medium [VERIFIED]** | **The containment fix rejects a generation the engine can emit.** `C/lib/brains.mjs:89` permits exactly four digits; `E/lib/render.mjs:76` uses `padStart(4)`, which emits `gen-10000` after 9999. The synthetic probe classified it as impossible store damage. **Fix:** accept canonical positive decimal generation suffixes padded to at least four digits. Separately report the engine’s four-digit enumeration at `render.mjs:74`; do not modify it in a console slice. |
| **R2-10** | **Low [VERIFIED]** | **The amendment certifies an edit that did not happen.** `P/19-held-findings.md:153` says predictive subscription estimates were removed; `P/10-astra-cost-and-value.md#1,#3,#6` retains them. **Fix:** classify document 10 as historical and explicitly supersede its usage predictions in the current README. Do not rewrite historical billing observations or claim remaining subscription capacity. |

**A2 — One hostile pass over this draft**

The following corrections are incorporated in Part B.

| ID | Draft defect | Correction |
|---|---|---|
| A2-R2-01 | A shared reader alone could still follow a symlink on `current.json` or a leaf. | The containment contract covers the pointer, ancestors, generation and each leaf; permission failures are not treated as absence. |
| A2-R2-02 | “Safe engine repair” sounded transcript-free, although the engine’s repair pipeline may internally consume its private tier. | Distinguish engine-internal processing from console presentation reads. The worker returns only the projected run result. |
| A2-R2-03 | Add-success copy required knowing whether a creator was newly created, but `CreatorRow` carries no such flag. | Use “Creator saved. Enabled: {Yes/No}.” Consent is shown from the response; creation status is not inferred. |
| A2-R2-04 | Exact-origin validation could reject a page served through the permitted `localhost` alias. | Derive the expected origin from the already validated request authority, including its actual port. |
| A2-R2-05 | Repair counts without `ok`, `runId`, or quarantine count could look successful after an unsuccessful run. | `RepairResult` includes engine identity, verdict and `quarantined`; missing counts cause a contract failure rather than fabricated zeros. |
| A2-R2-06 | A portable path-check plan implied protection against a malicious process continuously replacing filesystem links. | State that limitation explicitly. Test cooperating atomic publication and pre-existing links; do not certify hostile concurrent filesystem mutation without platform-specific proof. |

**Archive status:** [VERIFIED] The existing round-1 archive was queried and read. This output remains **unfiled** because this session permits no filesystem writes. The [archive skill](~/Desktop/@Everything/quick-pt/SS-PT/.claude/skills/hostile-review-archive/SKILL.md) requires: “Every hostile-review pass leaves exactly one file in `Z:\HostileReviews`.” Archive completion and reciprocal supersession remain pending.
