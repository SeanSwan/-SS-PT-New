# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 3915 in / 20630 out (reasoning: 17960) | total 24545
**Wall:** 332.1s

---

## Round 2 findings — SwanGuard owner door @ `e3e9da6`

### F2-1 · HIGH — `isLocalBrowserContext` accepts *any* loopback origin, not "the owner's own tab"
**Where:** `isLocalBrowserContext`, §1 (`LOCAL_HOSTNAMES.has(hostnameOf(new URL(origin).host))`).
**Scenario:** A malicious npm postinstall (or an XSS in any other local dev app) serves a page at `http://127.0.0.1:8080/p.html`. Its JS calls `fetch('http://127.0.0.1:4177/…owner…', {method:'POST', credentials:'include', body:'{"owner":true}'})`. The browser sends `Host: 127.0.0.1:4177` (derived from the attacker's URL → passes) and `Origin: http://127.0.0.1:8080` → `hostnameOf` → `127.0.0.1` ∈ `LOCAL_HOSTNAMES` → **gate passes**. The check the comment promises ("the owner's own tab vs a hostile page aimed at loopback") is not what the code does: every process on the machine that can open a loopback listener is an accepted origin. If the API's dev CORS reflects local origins (standard for a Vite-backed dev API) or the 201 sets a cookie without `SameSite`, the hostile page reads or rides the owner session outright; if not, it can still fire privileged side-effecting POSTs blind. The Vite-dev-proxy path makes this worse: `http://localhost:5173` is *by construction* an origin full of third-party dependency code, and it passes.
**Fix:** Require Origin, when present, to be **same-origin with the request Host** (scheme + host + port equality), or match an explicit config allowlist of the app's own dev origins (`http://localhost:5173`, `http://127.0.0.1:5173`). "Any loopback hostname" must not be the predicate. Your §3 verification never tested a foreign *local* Origin — the exact blind spot.

### F2-2 · HIGH — a loopback reverse proxy silently reinstates round-1 #1 (bind guard bypassed)
**Where:** socket stamp in `createFetchRequest` + `allowOwnerDoor && !isLoopbackHost(bindHost)` guard.
**Scenario:** Dev enables door + `NODE_ENV=development` (both required), then runs a completely ordinary local TLS/hostname proxy (`local-ssl-proxy`, `http-proxy` with `changeOrigin`) bound `0.0.0.0:443 → 127.0.0.1:4177`. A LAN peer POSTs through it: the API sees a loopback socket → stamped `loopback`; `changeOrigin` rewrote `Host` to `127.0.0.1:4177` → passes; curl sends no `Origin` → `origin === null` → `true`. **201, owner session, from the network.** The config guard inspects the API's bind, not the *effective* perimeter; the socket stamp is exactly the thing a proxy launders. This is the invited "future proxy" path and it requires no future — it's a standard dev workflow today.
**Fix:** In `requireOwnerDoor` (better: at the stamp), reject any request carrying `Forwarded`, `Via`, or `X-Forwarded-*` — cheap proxy fingerprint. Document that nothing may terminate in front of the door; optionally require `Host` to equal `bindHost:actualPort` exactly.

### F2-3 · HIGH — the reconciliation audit trail is empty in precisely the scenario it was built for
**Where:** heal branch + `recordReconciliation` ("swallows its own errors by design"), `postgres-migration-runner.mjs`.
**Scenario:** DB has 0001–0025 applied with raw-CRLF-era checksums (the exact historical state the fix describes). First run of the fixed runner: the loop reaches v0025, mismatches, heals — then `recordReconciliation` INSERTs into `schema_migration_reconciliations`, **a table created by a new migration (≥0030) that has not run yet** → `42P01` → swallowed by design. The run continues, 0030 applies, the table now exists — and every later run finds nothing to heal. The table stays empty forever. Round-1 5.3 #13's "durable trail" fix produces **zero rows in every production-shaped database**, and the swallow guarantees nobody notices. This is a cosmetic closure of #13.
**Fix:** `recordReconciliation` must idempotently ensure its own table (`CREATE TABLE IF NOT EXISTS` in the same transaction), or buffer rows in memory and write them after the migration loop, **failing the run loudly** if that write fails. Swallowing must not be permitted on the trail's first-ever write.

### F2-4 · HIGH — owner-hash member-path credential: no flag, no log, no revocation — and a stale-seed question that can make the credential change cosmetic
**Where:** §2 row "5.3 #4 … NOT changed in code" + §4.1/§4.4.
**Scenario A:** The 32-byte hash is a forever-valid bearer credential that grants `role: owner` with `allowOwnerDoor=false` and `NODE_ENV=production`, writes no audit row, and has no expiry or rotation. It leaks once (backup, ticket, dotfiles sync) → permanent unlogged owner. "The hash IS the owner identity" does not cover *this* path being exempt from every gate the door itself has.
**Scenario B (verify before closing this):** §4.4 says the live DB *already holds* an owner row, and "nothing was deleted." If that row was seeded when the hash was the published constant `sha256("swanguard-local-owner")`, and sign-in compares against the **DB row** rather than `config.ownerEmailHash`, then the published constant still authenticates as owner on loopback and the round-1 credential rotation closed nothing. Nobody has shown which side the comparison reads.
**Fix:** Refuse `{emailHash}` equal to the configured owner hash on the member path unless the door is enabled; write an audit row on every owner-hash grant; at boot, if a persisted owner row's hash ≠ `config.ownerEmailHash`, force re-seed or fail loudly; ship a rotate command.

### F2-5 · MEDIUM — normalizing executed SQL silently rewrites intended data, and the heal accepts a semantic edit as a "rendering"
**Where:** `checksumForms` / heal branch.
**Scenario:** (a) An author writes a literal containing an intentional `\r\n` (policy text, CSV seed). The runner now executes LF-normalized text on **every** platform — the intended bytes never reach any database, silently. Round-1 F4 was "hash normalized, execute raw"; the correct inverse is **execute raw, compare against both renderings** — comparison-only dual acceptance heals the ledger without touching execution semantics. The chosen fix changed execution instead. (b) The heal fires exactly when old-file ≡ new-file under uniform CRLF↔LF re-render — which includes `\r\n`→`\n` **inside string literals or dollar-quoted bodies**, i.e., a genuine data edit is accepted and the ledger is rewritten, silently, in the very construct F4 itself cited.
**Fix:** Execute the raw file; store the raw checksum; accept the alternate rendering for the *comparison* only. If dual-render execution must stay, record old checksum, new checksum, and raw-file checksum in `schema_migration_reconciliations`, and refuse to heal any file containing dollar-quote delimiters or multi-line literals.

### F2-6 · MEDIUM — the owner door itself is unaudited
**Where:** `requireOwnerDoor` handler path (201 creation).
**Scenario:** Incident question — "did a hostile local process mint an owner session at 14:03?" Nothing to query. The migration runner got a durable audit table; the *unauthenticated privilege grant* did not. Given F2-1/F2-2, forensics is the only backstop and it doesn't exist.
**Fix:** Append-only audit entry per door use: timestamp, peer stamp, Host, Origin, session id.

### F2-7 · MEDIUM — `hostnameOf` exists twice in the packet's "exactly as committed" code
**Where:** §1 — defined before `isLocalBrowserContext` and again immediately after it.
Two identical implementations in one module is TS2393 and contradicts "type-check exit 0"; therefore this is either two modules (drift hazard: the next hardening — trailing-colon, userinfo, mapped-v6 — lands in one copy and not the one `isLocalBrowserContext` uses) or a packet paste error (the packet is then *not* "exactly as committed," and I cannot tell which copy is live). Single-source it in one module and point both call sites at it.

### F2-8 · LOW — `hostnameOf` / `isLoopbackHost` false negatives and asymmetries
- `Host: 127.0.0.1:` (trailing colon) matches neither regex branch → returns the raw string → 403 for a legitimately local client. Trim a trailing `:` before the regex.
- `isLoopbackHost` omits `::ffff:127.0.0.1` / `::ffff:7f00:1` (unreachable under current bind rules — hardening only) and rejects the literal bind `localhost` while `LOCAL_HOSTNAMES` *accepts* `localhost` — the asymmetry is defensible for a bind (avoid DNS) but is undocumented and yields a boot error calling `localhost` non-loopback. Document it in the `ConfigError` text.
- `new Request(url)` in `createFetchRequest` throws on Hosts the WHATWG parser rejects (e.g. port > 65535). Local-only DoS, but wrap it: try/catch → 400.

### F2-9 · LOW — `trustLevel: 'new'` on an owner session (§4.2): first breakage is functional, not security
The first consumer that branches on `trustLevel !== 'new'` (publishing tools, invite quotas, trust-gated UI) silently denies the **owner in the owner's own session** and gets filed as "owner door broken." Pinning by test makes it a decision, not a correct one. Define the owner trust tier explicitly.

### F2-10 · LOW — post-locality env-var error bodies are a config oracle (§4.5, "attack this")
Combined with F2-1, local hostile JS that can read responses can distinguish door-off / NODE_ENV-unset / owner-unconfigured and target the machine's actual gap. Collapse the three post-locality failures to one opaque body; keep the env-var hints in server-side logs where the keyboard operator still gets them.

### Invites answered, not exploitable (kept brief, per remit)
`Origin: null` → `new URL('null')` throws → `false` (correct). Absent `Origin` → `true` is by-design local-trust, and is what makes F2-2 work. `127.0.0.1.evil.com`, userinfo in Host, and duplicate Host (Node comma-joins; joined string fails the exact-match set) all fail closed. `nodeEnvExplicit` mangled inputs (`NODE_ENV=development `, `"development"`, `dev`) all fail **closed**; no false-open path found. Mixed-ending files matching neither rendering and hard-throwing (§4.3) is accepted-but-brittle; the right long-term fix is `.gitattributes` on *new* migrations only, leaving the 29 historical files untouched — refusing that wholesale was fine, refusing it for new files was not.

---

**Balance:** round-1's CRITICAL (network-reachable owner) is genuinely closed for direct connections, but the fix set introduced one phantom fix (F2-3 — the #13 trail never records its one real event), one gate weaker than its own comment claims (F2-1), and one standard-workflow bypass of the bind guard (F2-2), plus an unresolved stale-credential question (F2-4B) that could void the #4 mitigation entirely.

REVISE
