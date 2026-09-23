# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 3916 in / 16988 out (reasoning: 13863) | total 20904
**Wall:** 394.9s

---

# ROUND 2 — hostile review of `e3e9da6`

## Findings

---

**F1 · MEDIUM — The locality fix draws the boundary at the *machine*, not the *user*. Any local account can mint an owner session.**
- **Where:** `requireOwnerDoor` — the entire gate is `x-swanguard-peer === 'loopback'` + Host/Origin. No per-request secret, no proof of same-user identity. `POST {"owner":true}` carries no credential at all; the door returns `config.ownerEmailHash` for free.
- **Scenario:** Windows fast user switching, or any service/scheduled task running as a *different* local account. Loopback is machine-scoped, not session-scoped: that process connects to `127.0.0.1:4177`, sends `Host: localhost`, no Origin → `origin === null` → `return true` → 201 with `role: owner`. The round-1 hole was "any LAN peer"; the fixed hole is "any local account." On the single-operator box this is the accepted threat model; on a family PC, a shared dev box, or a machine with RDP sessions and service accounts, it is not.
- **Fix:** require something the other local user cannot read. Cheapest correct option: at boot, generate a random door token and write it `0600` next to `owner-hash` in the user's profile; the door requires it as a body field. Better: AF_UNIX socket (0600, `$XDG_RUNTIME_DIR`) / named pipe with per-user ACL instead of TCP loopback. At minimum, document the machine-not-user boundary next to `SWANGUARD_ALLOW_OWNER_DOOR`.

---

**F2 · MEDIUM — `origin === null → return true` makes any state-changing GET route trivially CSRFable, and nothing pins the door's routes to POST.**
- **Where:** `isLocalBrowserContext`, the `if (origin === null) return true;` branch.
- **Scenario:** browsers omit `Origin` on top-level GET navigations. A hostile page does `location = 'http://localhost:4177/<any owner-gated GET with side effects>'`. `x-swanguard-peer` is genuinely loopback (owner's own browser), `Host: localhost` ✓, Origin absent → trusted. The round-1 CSRF class reopens for *every* method except POST, and the browser is the attacker's launchpad — no local account needed. Today the door appears POST-only; that invariant lives in nobody's test. `POST {"owner":true}` is safe; the next GET route that calls `requireOwnerDoor` is not.
- **Fix:** in `requireOwnerDoor`, reject anything not in an explicit allowlist of methods (`request.method !== 'POST'` → 403), and add a test pinning every `requireOwnerDoor` call site to POST. Alternatively require Origin presence for all non-POST.

---

**F3 · MEDIUM — `nodeEnvExplicit`'s derivation is not in the packet, and its trust anchor is undefined. This is the one predicate with a false-*open* direction, and it is unreviewable.**
- **Where:** the `config.nodeEnv !== 'development' || !config.nodeEnvExplicit` clause in `requireOwnerDoor`; the computation of `nodeEnvExplicit` is nowhere shown.
- **Scenario:** if "explicit" means merely `process.env.NODE_ENV !== undefined` at config-read time, then any launcher, dotenv file, or wrapper that sets `NODE_ENV=development` for its own convenience (electron-vite and several bundler wrappers do exactly this) makes "explicitly classified dev box" true on machines nobody classified. A committed `.env` with `NODE_ENV=development` ships the open predicate with the repo; a staging box that inherits it and gets `SWANGUARD_ALLOW_OWNER_DOOR=true` from a copy-pasted config opens the door over loopback — on a box where, per F1, loopback = every local account. Conversely `NODE_ENV="development"` (quoted) or a trailing space reads as unset — those fail closed, which is fine but will confuse.
- **Fix:** show the derivation in review; define explicit as *actual process environment, not dotenv-injected* (compare against `process.env` before dotenv load, or read `execPath`-level env), and reject `NODE_ENV` supplied via `.env` files for this purpose. Add a test: door closed when NODE_ENV arrives from dotenv even if the value is `development`.

---

**F4 · MEDIUM — Executing normalized SQL erases a real class of edits: CRLF→LF inside string literals silently diverges databases.**
- **Where:** `checksumForms` + the apply path (`await client.query(migration.sql)` where `migration.sql` is the normalized text), and the heal branch that accepts `checksumCrlf`.
- **Scenario:** migration 0012 contains `INSERT INTO templates VALUES ('line1␍␊line2')` — literal CRLF authored on Windows (or a dollar-quoted function body with CRLF, stored verbatim into `pg_proc`). A dev "fixes formatting" to LF. `checksumForms` normalizes first, so the normalized text is byte-identical and `migration.checksum` is unchanged. Every already-migrated DB: `priorChecksum === migration.checksum` → **skipped, the semantic data change is never applied, no error, nothing in `reconciled`**. Every fresh DB: applies and stores LF data. Two databases, one checksum, different data, and the ledger is structurally incapable of telling them apart. This is also the honest answer to "does normalization corrupt intended `\r\n` data": yes — any migration whose *payload* legitimately contains CRLF (Windows `.bat` content, CRLF CSV export, `\r\n` in a stored template) gets its data silently rewritten to LF on the canonical path.
- **Fix:** authoring rule, not renormalization: lint migrations to forbid raw CR bytes and require `E'...\r\n'` / `chr(13)` escapes in literals; keep the checksum over normalized text for checkout-portability, but add a raw-byte-length or raw-hash column so a literal-ending-only edit is at least *detected*, even if accepted manually.

---

**F5 · MEDIUM — `recordReconciliation` swallows its own errors, and the packet contradicts itself about what actually runs. The audit trail can report heals that never stuck.**
- **Where:** §2 claims "persisted to `schema_migration_reconciliations`" via `recordReconciliation`, "swallows its own errors by design"; the shown code instead does a bare `await client.query(updateMigrationChecksumSql, ...)` followed by `reconciled.push`. Both cannot be the shipped behavior.
- **Scenario (either version):** (a) if the swallow is real: the UPDATE fails — table missing, permission revoked, read-only replica — the error is eaten, `reconciled.push` still executes, the summary reports version X reconciled, and the ledger row still holds the stale rendering. Every subsequent boot silently re-attempts and re-reports. Worse, where is `schema_migration_reconciliations` *created*? If its CREATE TABLE lives in migration 0030 (the latest), the heal of 0026–0029 runs during a pass that precedes 0030's apply on a fresh DB — the UPDATE hits a nonexistent table, the swallow hides it, and the run reports a reconciliation that never happened. (b) if the shown bare-await is real: an error aborts the run — good — but if the runner wraps versions in transactions, a later abort rolls back the heal while the printed `reconciled` list already shipped (the fix for "printed after seeding" moved the report earlier, which makes the false report *earlier*, not impossible).
- **Fix:** show the real implementation in the next packet. Make the swallow log at error level and non-silent; after the run, re-`SELECT` the healed row and assert it equals the canonical checksum, throwing if not; create `schema_migration_reconciliations` in a bootstrap step *before* the version loop, not inside it.

---

**F6 · MEDIUM — Round-1 #4 is cosmetically closed. The owner bearer secret now flows through the member sign-in path, and everything that path logs.**
- **Where:** `{emailHash: <owner hash>}` on the member route — unchanged mechanism, new credential.
- **Scenario:** the argument "the hash IS the owner identity" holds only if the secret never leaves the two intended endpoints. The member sign-in handler is lower-trust code: it is the path most likely to be request-logged, error-reported with bodies, or mirrored into the new audit table. One `logger.debug({emailHash})` in member auth and the owner credential — whose entire security property is "written once, never printed" — is sitting in plaintext logs that get shipped, rotated, and read by tooling, while `LOCALAPPDATA\SwanGuard\owner-hash` remains pristine. The 32 random bytes defend against guessing, not against the handler that receives them.
- **Fix:** refuse the owner hash on the member path (`403 invalid_sign_in`, constant-message), or hash-compare with a per-call-site pepper so member-side code never handles the raw owner secret. Also verify: the sign-in path must use a constant-time compare; unshown.

---

**F7 · MEDIUM — Hostname/bind normalization gaps: legit configs refused with misleading errors, and a mapped-IPv6 time bomb in the stamp.**
- **Where:** `isLoopbackHost` (config.ts) and `LOCAL_HOSTNAMES` / `hostnameOf`.
- **Concrete failures, all verified by trace:**
  1. `SWANGUARD_BIND_HOST=localhost SWANGUARD_ALLOW_OWNER_DOOR=true` → ConfigError "would expose the owner door to the network" — false: `localhost` resolves to loopback; meanwhile `LOCAL_HOSTNAMES` *accepts* `localhost` for the Host check. The asymmetry fails closed, but the error text is wrong about the risk, and a working dev config that previously booted now exits 1.
  2. `isLoopbackHost('::ffff:127.0.0.1')` → **false**. IPv4-mapped IPv6 is what Node reports for `remoteAddress` on any dual-stack socket. Unreachable under today's guard (only `127.x` and `::1` literals pass the bind check), so today it fails closed — but it is a latent inversion of the stamp: the moment someone binds via a resolved hostname or `::`, a genuinely local client is stamped `remote` and locked out, and a `bindHost` of the mapped literal is refused at boot.
  3. `http://localhost.:4177` (trailing-dot FQDN, which resolves to 127.0.0.1): `hostnameOf('localhost.')` → not in set → 403. Owner locked out by one keystroke; fails closed.
- **Fix:** in `isLoopbackHost`, strip a `::ffff:` prefix before testing; in `hostnameOf`, strip one trailing dot before the set lookup; for the bind guard, either accept `localhost` (resolve and verify loopback at listen time via `server.address()`) or reword the error to name the accepted forms.

---

**F8 · LOW — `requireOwnerDoor` hardcodes `'x-swanguard-peer'` instead of importing `PEER_HEADER`.**
- **Where:** `requireOwnerDoor` first line vs `PEER_HEADER` in server.ts.
- **Scenario:** someone renames the constant server-side; read side keeps the old string; absence → 403 everywhere. Fails closed, but the door dies silently and the first symptom is a mysterious total door outage. Fix: import and use the constant, plus one negative test asserting a missing stamp is 403.

---

**F9 · LOW — Packet/code hygiene.**
- `hostnameOf` is presented twice in §1. If that duplication exists in the committed file, tsc would have failed — so it is presumably a packet artifact; if it is real, delete it. Also: 403 paths throw without draining the request stream, so a prober sending a large POST can observe ECONNRESET instead of the clean 403 — cosmetic, but it makes the verification table's 403s non-deterministic for big bodies. Fix: consume-and-discard before throwing, or document.

---

## Cosmetic / non-closures, as required

- **R1 5.3 #4** — **cosmetically closed.** Credential swap only; the grant mechanism via the member path is intact (see F6).
- **R1 5.3 #12 / flash F8** — partial by design; the residual (a different-local-*user* prober reading `owner_door_disabled` vs `owner_not_configured` state) is subsumed by F1. Acceptable once F1 is decided.
- **flash F5 (mixed line endings)** — knowingly unfixed; the *refusal to renormalize a live DB is the right call*, but the durable fix is the F4 authoring lint, which is also missing.
- **R1 5.3 #7 (trustLevel `new`)** — test-pinned, acknowledged. First thing that breaks: any retention/archival job keyed on `trustLevel === 'new'` treats the owner row as sweepable garbage. Pin the owner row as immutable to cleanup jobs, not just its trust level.
- **§4.4 dual identity** — the unshown risk is any query resolving sessions `WHERE email = <owner email>` returning both rows and ordering arbitrarily. Demand a uniqueness assertion (email, role) or a test.

## Attacks that did not land (re-tested, one line each)

`127.0.0.1.evil.com` → exact-set, blocked. `Origin: null` string vs absent → correctly distinguished (absent trusted, string `"null"` rejected via URL throw). Forged `x-swanguard-peer` → overwritten last, verified by real-server test. DNS rebinding → browser sends `Host: evil.com:4177`, blocked. `file://` origin → URL host `''`, blocked. Duplicate Host → llhttp 400s before the handler. h2c-without-Host / missing stamp on alternate entrypoints → fails closed. Unix-socket `remoteAddress` undefined → stamped `remote`, closed. ReDoS on `hostnameOf` → linear.

## Verdict

**REVISE**
