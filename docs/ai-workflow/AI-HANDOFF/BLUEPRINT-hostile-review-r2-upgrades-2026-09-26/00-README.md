**Purpose**

Harden SwanStudios so client records remain properly scoped, a payment produces exactly its purchased entitlement once, and failures remain visible and recoverable.

**Plan identity**

- Package: `BLUEPRINT-hostile-review-r2-upgrades-2026-09-26`
- Revision: `r3-proposed`
- Repository: `C:\Users\BigotSmasher\Desktop\@Everything\quick-pt\SS-PT`
- Branch: `creator-brains-engine-r2-20260915`
- Campaign baseline: `ad268c2d4`
- Observed checkout: `74170358b`
- Source packet SHA-256: `39b9029017ef7ead91af31a021ff2f30b9014dc43f2441f629bf4ee3e0547ff1`
- Status: **reviewed proposal; not implementation-ready**
- Delivery: document contents emitted here; filesystem persistence and archive filing not performed.

**Requirements**

| ID | Required outcome | Acceptance |
|---|---|---|
| R01 | Cross-client operations require current authorization. | Mounted role matrix returns zero unauthorized reads/writes. |
| R02 | Purchased terms cannot change during fulfillment. | Catalog/cart mutation does not change the recorded purchase or grant. |
| R03 | One purchase causes one complete allocation. | Concurrent callers produce one grant, one financial effect, and the correct balance. |
| R04 | Private data stays behind authorization boundaries. | Every media alias and provider transport passes synthetic negative controls. |
| R05 | Payment and refund failures remain recoverable. | Acknowledged events have durable applied/review/retry state. |
| R06 | Public input cannot establish account identity or exhaust unbounded provider quota. | Anonymous waiver stays unlinked; limits work across two application instances. |
| R07 | Schema and product data agree. | Isolated migrations, enum/FK checks, onboarding and concurrency tests pass. |
| R08 | Operations report failure honestly. | Startup, logs, polling, errors, and release checks meet `09-tests.md`. |

**Build order**

`S0 evidence → S1 mounted authorization → S2 private media → S3 provider privacy → S4 public intake/abuse → S5 schema/startup → S6 checkout snapshots → S7 allocation/provenance → S8 refunds/recovery/UI → S9 site truth → S10 operations → S11 release verification`

P0 containment can ship separately after its own review and release authorization. S5 is a P3 prerequisite pulled forward before money-path DDL.

**Roles and boundaries**

- Anonymous visitor: public content and unlinked waiver submission only.
- Client/user: own permitted records.
- Trainer: own records plus clients with an active assignment.
- Admin: existing administrative scope, with explicit audited money actions.
- Payment provider: signed payment evidence, never authority to select arbitrary user records.
- Application operator: deploy, schema approval, and historical reconciliation owner.

**Builder contract**

Implement one slice at a time. Preserve unrelated work. Re-read source bindings before editing. Run the slice’s behavioral checks and receive a checkpoint verdict before advancing. Record any allowed implementation choice under `10-delegated-bounds.md`; do not silently widen scope.

No production DDL, production writes, paid review, or `main` push is authorized by this package.

**Preconditions actually checked**

| Check | Result |
|---|---|
| Repository, branch, commit, relevant backend drift | Verified locally |
| Prior archive lookup | Incomplete archive coverage reported |
| Native lane digest | Reported “not a git repository”; clearance not established |
| Continuity promotion count | Command failed, Windows error 5 |
| Payment and workout backend ownership | Inspected; workout shadow confirmed |
| Checkout-success and waiver JSX mounts | Inspected |
| Browser rendering and deployed route behavior | NOT RUN |
| Disposable PostgreSQL | NOT ESTABLISHED |
| Independent final review | NOT RUN |

No edit claims were made during this read-only pass.
