**Receipt schema**

```json
{
  "date": "ISO-8601",
  "slice": "S0",
  "repository": "absolute path",
  "branch": "exact branch",
  "commit": "full SHA",
  "dirtyPaths": [],
  "sourceHashes": {},
  "command": "exact command",
  "exitCode": 0,
  "result": "PASS|FAIL|BLOCKED|NOT_RUN",
  "resources": "synthetic or disposable resource identity",
  "expected": "observable result",
  "observed": "actual result",
  "forbiddenEffectsChecked": [],
  "limitations": [],
  "reviewId": null
}
```

**Observed source bindings**

| File | SHA-256 |
|---|---|
| `backend/controllers/workoutController.mjs` | `e4fa75a4e96b661655d928317b5f0a188eb96afb0df5f4f870ea1638d3565e1c` |
| `backend/services/SessionAllocationService.mjs` | `34a5f4942faa311a6c902a2e4eb4479ce5c67bb6b728ef723041b2c652bf24b9` |
| `backend/services/SessionGrantService.mjs` | `5ae116bcd733293e37120cb723eac0b490543ed91a6306dce49c13c42c54ac51` |
| `backend/webhooks/stripeWebhook.mjs` | `144678b7989d4d4017444e49f96b532811a81be316f3d343221de1dece0d5d6c` |

**Local diagnostic receipts**

All used PowerShell stdin to:

```powershell
node --experimental-vm-modules --input-type=module
```

Node version: `v24.19.0`.

| Invocation | Observation | Exit |
|---|---|---:|
| Allocation and grant helpers | Allocation creates 2 rows, balance stays 0, retry skips; financial failure attempted once; mutable credits and invalid reconciliation accepted | 0 |
| Later workout route | Synthetic self-owned record reassigned to another user through accepted schema | 0 |
| Main webhook | Unpaid/stale evidence reaches grant; stale expiry overwrites newer pending state | 0 |
| First-mounted workout controller | Cross-client trainer read/create/update/delete return 200/201 | 0 |
| PII middleware with real local sanitizer dependencies | Synthetic name, date, medication survive; no critical flag | 0 |

**Count correction:** the observed tool record contains **five invocations**, with the first invocation covering both allocation and grant probes. The extra “six invocations” sentence in `09-tests.md` is superseded by this exact receipt inventory; do not use invocation totals as test coverage.

**Limitations**

- Router ordering was established from source; a booted mounted HTTP test was not run.
- Model, Stripe, and transaction dependencies were stubbed in diagnostic probes.
- No real PostgreSQL concurrency, constraints, migrations, or rollback were exercised.
- No external provider, storage, browser, production, or remote Git probe was performed.
- Existing campaign test totals remain packet claims.
- The emitted regression file and remaining proposed suites are not installed.
- Archive write, package splitter, structural readiness checks, and independent final review were not run.
- Mermaid source is supplied; rendered diagrams were not inspected.

**Readiness**

| Gate | Status |
|---|---|
| Source-linked findings | PASS within stated scope |
| Proposed priority/build decisions | Documented |
| Files persisted and archive filed | BLOCKED |
| Complete mounted surface receipts | PARTIAL |
| Executable acceptance suites installed | NOT RUN |
| Disposable PostgreSQL evidence | NOT RUN |
| UI and accessibility evidence | NOT RUN |
| Independent implementation review | NOT RUN |
| Deployment approval/readiness | NOT RUN |

**Overall: IMPLEMENTATION READINESS BLOCKED.** The next deliverable is S0’s durable package, complete test isolation, route/writer inventory, and extraction manifest—not a production deploy.
