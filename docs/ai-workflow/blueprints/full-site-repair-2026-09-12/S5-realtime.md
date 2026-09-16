# S5 — realtime lifecycle and honest message receipts

Owner Astra; version 1. Implements R8 / transport T3,T4,T6 and BE-06. Preserve tested production hostname and correct `/messaging` namespace, default authentication protocol and event names. No new socket stack or database migration.

Messaging send must await an authoritative success receipt, not simply `emit` and resolve. Prefer existing REST send API if its actual contract already provides durable response, with realtime retained for receiving. Otherwise add a backward-compatible Socket.IO acknowledgement that uses the persisted message as authority and separates secondary notification failure. Never send through both paths. On rejection retain draft and actionable error; on uncertain timeout refresh/dedupe before allowing automatic replay. No queued Promise can hang indefinitely. Follow existing client capabilities and assignment policy.

Socket manager asynchronous creation must honor unmount/logout/new-token generation. A late construction is disconnected unless still owned; subscriptions/intervals/listeners are disposed once; preserve other mounted users of the singleton. Observe actual ProductionTokenManager subscription rather than nonexistent `token_refreshed` window event. Do not put JWTs in query strings/logs.

Backend message-to-notification bridge uses canonical Notification fields/type/event. The metadata probe confirms `notifications` columns, so raw snake-case/content insert is invalid. A successfully committed/delivered message remains success when notification side effect fails. Preserve canonical conversation/participant authorization; no private body in logs. Normalize admin role consistently before session-room check; malformed/unauthorized room joins deny.

Presence should count multiple active sockets for one account; one tab disconnect cannot mark another connected tab offline. Include this if changing that lifecycle; otherwise retain an explicit open finding rather than claim it fixed.

Tests: local real Socket.IO client/server with synthetic auth/persistence exercises reject and success acknowledgement, secondary notification failure, event names and reconnect; deterministic deferred creation/unmount/token rotation tests; same user two sockets/disconnect; uppercase/lowercase admin, owner, unrelated and malformed room IDs. Test shared-hook ownership cleanup. UI wireframe: existing composer `[draft retained] [Send pending]` → confirmed message or `[Could not send — Retry]`, keyboard/44px unchanged. No production socket mutation/test message.

Flow: auth→connected→send pending→persist→receipt; denial→draft/retry; side-effect failure→message success+logged degradation; unknown outcome→refresh; logout→cancel pending ownership. No auto provider fallback or unrelated legacy rewrites. Rollback isolated code, never message deletion.
