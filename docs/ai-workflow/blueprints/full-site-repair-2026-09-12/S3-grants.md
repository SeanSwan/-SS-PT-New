# S3 — atomic manual grants

Owner Astra; version 1; PLAN READY after preceding slice. Implements R6 / BE-03. Headless API repair; wireframes N/A because grant UI/response shape remains compatible.

`/api/session-packages/add-sessions` remains protect+adminOnly. Preserve strict count normalization, client eligibility and non-deducting source exclusions. Use existing Sequelize transaction/row lock conventions: load current User under UPDATE lock, validate current role/source/balance in transaction, atomically increment, obtain authoritative balance and commit, then respond. Invalid/missing target rolls back with unchanged status semantics. Error rolls back. A competing grant or booking deduction must be preserved; no load/add/ordinary-save outside locking. Log operation class/count without free-text notes or client payload. Do not change checkout/webhook/allocation ownership.

No new schema, payment key or retry idempotency claim. Without a caller operation ID, identical intentional grants and transport retries are indistinguishable; preserve compatibility and clearly record that boundary. Rollback is code revert, not reverse-grant or production data mutation.

T6 / BE-T03: existing validation tests; behavioral two-grant interleaving (10+5+7=22), grant/deduction interleaving, rollback, missing/invalid/free-source zero mutation. Use real PostgreSQL where possible: task-owned PostgreSQL17 cluster under `.mega-blueprints/artifacts/55c0633e8d876db7/postgres/data`, bound `127.0.0.1:55432`, dedicated database `sspt_full_site_repair_test`, user `swan_test`, synthetic fixtures only. Test must hard-fail unless URL is exactly loopback/dedicated test database. Never use DATABASE_URL from real backend config. Parent will stop the cluster when verification finishes. Confirm actual model/row-lock behavior with independent transactions; mocks alone are not DB proof.

Flow: authorized request→transaction→lock User→validate→increment→commit→receipt. Denied/invalid/error→rollback/no write. Concurrent request waits for lock then sees committed balance. UI uncertainty→explicit refresh before another intentional grant; no automatic replay.
