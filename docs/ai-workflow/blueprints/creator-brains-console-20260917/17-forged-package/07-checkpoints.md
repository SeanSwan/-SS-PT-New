**Evidence protocol**

Each checkpoint records:

1. Exact checkout, branch, commit, dirty owned paths, and source hashes.
2. Requirement/test mapping and precise command.
3. Expected RED failure where feasible, excluding import/setup failures.
4. GREEN result after implementation; actual distinct test count.
5. Real boundary proof, separate from mocks.
6. Open findings, accepted limitations, rollback, and next allowed slice.
7. Filed review ID, reviewer identity evidence, and supersession links.

Reviewer order and spend remain governed by the existing task workflow. This requested Astra adjudication does not retroactively complete missing GLM/Flash receipts or authorize another provider call. A2 is the requested self-hardening pass, not a substitute for an independent implementation gate.

**Readiness receipt for this revision**

| Evidence | State |
|---|---|
| Input identity/hash | VERIFIED |
| Existing console source/mount inspection | VERIFIED, bounded scope |
| Original packet preservation | Original untouched; copied snapshot NOT RUN |
| D1–D9 adjudication | Emitted; D7 owner decision outstanding |
| A1/A2 | Emitted; archive filing BLOCKED |
| New test files | Specified, NOT WRITTEN in read-only session |
| Current bridge/web/engine test results | NOT RUN |
| Mermaid rendering | NOT RUN |
| Real browser, launcher, GPU | NOT RUN |
| Engine journal concurrency | BLOCKED pending executable proof |
| Backup boundary | BLOCKED pending Sean’s decision |
| Implementation readiness | **NOT ESTABLISHED** |

**Performance and operations**

- Cold bridge bind ≤1.5 seconds; Desktop-to-render ≤15 seconds.
- Warm file-backed reads p95 ≤50ms on a declared fixture size; report cold and expired-health-refresh latency separately.
- Status JSON ≤256KiB.
- Initial executable JS ≤500KiB gzip; lazy three chunk ≤900KiB gzip.
- Health refresh never blocks the HTTP thread while its subprocess waits.
- Scene DPR ≤2; target median frame time ≤16.7ms at 40 creators, measured on named hardware.
- Log method, route template, status, duration, request ID, child lifecycle, and refusal code only.
- Rotate console logs at 1MiB, retaining three files. Do not log bodies, query text, transcript text, or credentials.
- Owner: Sean. Recovery: restart console, inspect authoritative records, then explicitly retry only when outcome is known.

**Motion gates**

Enhancement import requires: first validated status read, width ≥768px, visible/intersecting panel, no reduced-motion preference, successful WebGL capability probe, and a subsequent idle callback. Fallback timer: 1 second after that status read.

Dolly: ≤2.5 seconds, once per page load, only if renderer is ready within 3 seconds of the first valid status read and the operator has not interacted. Otherwise skip.

Idle drift: ≤0.25 degrees/second, no autonomous zoom, no pulsing text, no particle field unrelated to creators. Stop scheduling rAF within one frame of hidden/offscreen state. Reduced-motion changes at runtime dispose active motion and show static content.

**Preservation and release**

Before modifying the canonical packet, preserve all owned files with SHA-256s, including untracked source. Exclude dependency/build trees from source snapshots; preserve lockfiles. Never call that an off-machine backup without evidence.

S7 creates a named tag and copied source tree with a manifest. Host library mode externalizes React, React DOM, and styled-components; receiving-repo dependency versions and network authorization remain receiver-owned gates.

Post-task hygiene: this pass created no filesystem artifacts. The future package, test receipts, screenshots, and manifests belong under the existing packet’s evidence tree, not the repository root.
