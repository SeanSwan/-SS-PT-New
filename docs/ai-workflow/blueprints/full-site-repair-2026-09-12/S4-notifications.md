# S4 — single store and recipient-owned notifications

Owner Astra; version 1. Implements R7 / transport T1,T2,T5 and BE-07. Review deferred; no DB schema/money changes.

Make `frontend/src/redux/store.ts` canonical. `store/index.ts` compatibility re-exports same instance, RootState/AppDispatch/default, typed hooks and inert persister API. Preserve old customization/menu/orientation consumers by adding their reducers to canonical store if required. Avoid circular slice imports. Do not create a second configureStore.

Notification lifecycle binds current user generation. Logout/account switch clears recipient-specific state and cancels/invalidates pending REST reads/polling. Late fulfilled requests may not repopulate a new account. Realtime events require current recipient identity where DTO provides it; duplicate IDs reconcile instead of incrementing counts twice. REST unread count is authoritative. Do not rely on frontend filtering to repair server fanout.

`createAdminNotification` creates one row per admin and emits only to that recipient; remove recipient-specific records from the shared admin broadcast. Tests with two admins assert no other recipient ID and one event each. Keep existing mark/read ownership checks.

Header notification deletion awaits successful server confirmation before removal, or rolls back with visible error. Failure retains row and retry action; account change suppresses stale completion. Same for any touched mutation path. UI: pending action disabled; error uses existing notification/toast pattern, no silent catch. Desktop popover and mobile view retain keyboard labels and 44px targets.

Tests: canonical store identity under actual Provider, initializer dispatch and cleanup, delayed previous-user fetch, logout/reset, repeated realtime ID/count; two-admin backend events; failed/successful delete and changed-account completion. Existing notification slice/permission tests remain green. No live notifications are created during testing.

Flow: actor→one store→scoped fetch/events→ID reconciliation; logout→invalidate/clear; mutation→pending→confirmed remove or failure+retry. Rollback preserves server rows; reverting code never bulk-deletes notifications. Exact files are fixed before Luna starts.
