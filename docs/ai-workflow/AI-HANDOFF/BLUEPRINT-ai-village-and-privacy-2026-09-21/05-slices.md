**S0 — Evidence and preservation**

- **Requirements:** V-10, V-11, V-12.
- **Entry:** Correct checkout and ownership established.
- **Work:** Confirm six bypass locations, 14 listed legacy references, actual imports, provider adapters, current tests, and archived-review requirements.
- **Exit:** Hash-bound source inventory, caller map, current status, and explicit gaps.
- **Blocker:** No repository surface was available in this consult.

**S1 — Local policy and review contracts**

- **Requirements:** V-02, V-04, V-05, V-06, V-08.
- **Files:** `manifest.mjs`, `policy.mjs`, `coverage.mjs`, `findings.mjs`.
- **Acceptance:** Contract cases P01–P08 and D01–D03 in `09-tests-a.md`.
- **Forbidden side effects:** Network, database access, client-roster loading, mutation of source artifacts.

**S2 — Budgets, rounds, and dispatch integrity**

- **Requirements:** V-03, V-07, V-09.
- **Files:** `budget.mjs`, `rounds.mjs`, `freeze.mjs`, `dispatch.mjs`, `journal.mjs`, `engine.mjs`.
- **Acceptance:** B01–B03, R01–R05, T01–T02, E01–E03.
- **Additional gate:** Real crash and concurrent-process tests. In-memory tests do not satisfy journal durability.

**S3 — Subscription route integration**

- **Requirements:** V-03, V-04, V-05, V-09.
- **Files:** `providers.mjs`, `adapters/subscription.mjs`.
- **Acceptance:** Each selected adapter produces a verified capability record, rejects unknown billing/context, executes one approved synthetic request without extra context, and records served identity.
- **Blockers:** Actual exports, invocation arguments, automated-use terms, entitlement evidence, and isolation behavior are absent.

**S4 — Special OpenRouter integration**

- **Requirements:** V-03, V-04, V-05, V-09.
- **Files:** `adapters/openrouter.mjs`; existing egress integration.
- **Acceptance:** Zero sends without explicit special-profile approval; exact destination and final-body verification; full input/output spend bound; no Kimi; no fallback or retry.
- **Blockers:** Current pricing, exact route configuration, and complete adapter source were not supplied.
- **Live test authority:** Requires its own concrete spend approval; this package supplies none.

**S5 — Existing callers and image bypasses**

- **Requirements:** V-01, V-03, V-10, V-12.
- **Targets:** Council, retained review entry points, and the five listed image scripts.
- **Acceptance:** Real callers use the shared boundary; Council protocol output remains valid; invalid packets produce zero sends.
- **Media-specific acceptance:** Approved text is protected, media bytes remain unchanged, unknown attachment provenance blocks dispatch, and transport credentials reach only the approved endpoint.
- **Blocker:** Typed media request schemas and actual caller bodies are absent. Do not perform a blind `fetch()` replacement.

**S6 — Legacy migration and archival**

- **Requirements:** V-01, V-10, V-11.
- **Acceptance:** Every discovered caller is migrated, intentionally retired, or explicitly blocked; snapshots and rollback are verified; no unknown active caller remains.
- **Authorization:** Archival moves require explicit cleanup approval after the concrete move list is reviewable.
- **Ban:** No deletion.

**S7 — Final verification and filing**

- **Requirements:** All.
- **Acceptance:** Local tests, real adapter evidence, caller tests, budget receipts, unresolved findings, and required archive receipt are linked.
- **Result vocabulary:** `LOCAL CONTRACTS VERIFIED`, `SELECTED ROUTES VERIFIED`, `CALLER MIGRATION VERIFIED`, or `BLOCKED`.
- **Ban:** Do not infer machine-wide privacy, deployment, or universal provider coverage from a narrower result.
