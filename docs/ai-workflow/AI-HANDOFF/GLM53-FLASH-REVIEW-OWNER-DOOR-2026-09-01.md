# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 5016 in / 14286 out (reasoning: 12108) | total 19302
**Wall:** 330.4s

---

**F1 — CRITICAL — apps/api/src/authRoutes.ts:92 + apps/api/src/config.ts:51 + gate claim 2**
The owner door has no loopback restriction. The only protections are `nodeEnv !== 'production'` and a boolean env flag whose sole containment is the *convention* that only the launcher sets it — on a machine the packet itself documents as binding `0.0.0.0` with a tailnet address.
Failure scenario: owner double-clicks the launcher → API up on `0.0.0.0:4100` with `SWANGUARD_ALLOW_OWNER_DOOR=true` for the entire process lifetime → any tailnet peer (or anything that reaches the port via port-forward, LAN, or a casually placed reverse proxy) runs `curl -X POST http://<tailnet-ip>:4100/api/auth/dev-sign-in -d '{"owner":true}'` → `201`, session `role: "owner"`. Zero secrets. Same outcome on any staging/QA host classified non-production that inherits the flag through a shared `.env` or `docker env_file`. This is the exact escalation shape the self-review caught in draft 1, narrowed by one env var — an unenforced operational convention is not a gate.
Fix: (a) launcher binds `127.0.0.1`; (b) in `requireConfiguredOwnerHash` (or a wrapper), require the socket remote address to be loopback; (c) `loadConfig` refuses to boot with `allowOwnerDoor=true` when the configured bind host is not loopback. Do at least (b) or (c).

**F2 — MEDIUM — apps/api/src/config.ts:51 / claim "parseBooleanFlag"**
`parseBooleanFlag` is now load-bearing for a security gate, and its truthiness table is neither shown nor tested. If it accepts `'TRUE'`, `'1'`, `'yes'`, or any non-empty string, then `SWANGUARD_ALLOW_OWNER_DOOR=1` copied between env files, or shell profile residue, silently opens F1 wider. Also folded in here: if the unknown-`NODE_ENV` fallback is `'development'` (the common pattern), a prod-like box with `NODE_ENV` unset or misspelled (`'PRODUCTION'`, `'prod'`) is classified development, and an inherited flag yields a remote owner grant on a machine the operator believes is production.
Failure scenario: `.env` carries `SWANGUARD_ALLOW_OWNER_DOOR=TRUE`; parser is case-insensitive → 201 owner on a host that was supposed to refuse.
Fix: pin the parser to exact `'true'` (or decide the table and unit-test it: `'TRUE'`, `'1'`, `'yes'`, `'0'`, `''` must all 403); make `loadConfig` throw on unrecognized `NODE_ENV` instead of defaulting.

**F3 — MEDIUM — apps/web/src/AuthGate.tsx:24 / gate claim 3**
"A production build omits it" is mode-dependent, not guaranteed. `import.meta.env.DEV` is `true` under `vite build --mode development` (staging builds, prod-bundle debugging), so that "production" bundle ships the button; a custom `define` override leaks it too. The claimed "two independent gates" then collapses to one — the server gate, which is F1's single convention.
Failure scenario: deploy pipeline builds with `--mode development` against an API that mis-set `NODE_ENV` (see F2) → button rendered, door open.
Fix: gate the button on an explicit build-time injected `SWANGUARD_OWNER_ENTRY` defaulting false, or accept the button is cosmetic, fix F1 server-side, and stop describing this as an independent gate.

**F4 — MEDIUM — scripts/postgres-migration-runner.mjs:185-196 vs `migrations.push({... checksumForms(sql), sql ...})`**
Checksums are taken over LF-normalized content, but **execution still uses the raw on-disk `sql`**. For SQL containing newlines inside string literals or dollar-quoted bodies, CRLF and LF renderings produce *different stored data* (`\r\n` bytes vs `\n`). The heal comment's claim that content is "proven identical" is false at the data layer.
Failure scenario: 0027 seeds a row with an embedded newline → fresh apply on Windows stores `\r\n` in the value while recording the canonical LF checksum; fresh apply from an LF tree stores `\n`. The guard reports both as identical; dumps and content digests diverge permanently across environments.
Fix: execute the normalized form (store `normalized` on the migration object and run that), so every fresh apply converges to the same bytes; keep the raw read only to derive `checksumCrlf`. A literal `\r\n` inside a string then also behaves consistently.

**F5 — MEDIUM — scripts/postgres-migration-runner.mjs:77-84 / claim "A real edit matches neither"**
The heal covers exactly two renderings: pure-LF and pure-CRLF. A file with **mixed** line endings (an editor that converted only touched lines — the most common real-world ending churn) matches neither and hard-throws, re-bricking the launcher with the identical symptom this change exists to remove. "0 migrations matched neither" is true only of today's 29 files.
Failure scenario: someone edits 0030 in an editor that leaves surrounding lines CRLF and saved lines LF → `Migration checksum mismatch for 0030` → launcher dead again, now with a heal mechanism that watched it happen.
Fix: document the mixed-ending behavior; consider reconciling on read (in-memory normalization with a warning) so on-disk variance can never produce a third checksum class; keep the throw for genuine content edits.

**F6 — MEDIUM — authRoutes.ts:93 (`findOrCreateUser`) / coherence of `role:'owner'` + `trustLevel:'new'`**
The door mints a **second, parallel identity**. The live DB already holds the human as `member` (user A); the owner door creates user B from the configured hash. Consequences: (a) the owner sees none of A's rows — he asked to "get into his own app" and lands in an empty personal state; (b) `trustLevel:'new'` on an owner is undefined behavior by policy — either trust-level checks silently bypass for owner (incoherent invariant) or they block owner actions (confusing failure); (c) two rows for one human guarantees a future promotion/migration bug.
Failure scenario: owner enters, wonders why his prior member-scoped data is invisible; later, a feature keyed on `trustLevel !== 'new'` either locks the owner out or is special-cased ad hoc.
Fix: define the invariant explicitly — either promote the existing local user to `owner`, or pin owner sessions to a trust floor — and add a test asserting the exact role/trustLevel pair returned by the door.

**F7 — LOW — scripts/postgres-migration-runner.mjs:148-159**
The reconcile report prints **after** `seedOwnerUser`. The heal is COMMITted inside `applySqlMigrations`; if seeding throws, the operator sees a failure with no mention that checksum rows were rewritten — precisely the "rewritten in silence" the comment forbids.
Failure scenario: seed throws on misconfigured owner hash → error output shows no reconcile line → ledger was still mutated.
Fix: print `result.reconciled` immediately after `applySqlMigrations`, before seeding. Related verification gap: the table's "applied 0, skipped 29" never shows the reconciled count from the *first* post-fix live run — the exact unbricking path was exercised only indirectly.

**F8 — LOW — authRoutes.ts:105-119**
The 403 body tells remote callers "Set SWANGUARD_ALLOW_OWNER_DOOR=true to enable it" and the 409 names the exact env var. Combined with F1, this is free enablement instructions to non-loopback clients. Also, 409 Conflict is the wrong status for a server configuration gap.
Failure scenario: tailnet peer probes, receives exact instructions for the takeover primitive in F1.
Fix: loopback callers get detail; others get an opaque message. Use 500/503 for unconfigured state.

**F9 — LOW — AuthGate.tsx:117-125 / admitted unverified surface**
`completeEntry(await auth.signInAsOwner(), false)` — the second argument's semantics are not established in the diff. If it mirrors the magic-link path's persist flag, `false` may produce a session that does not survive reload; jsdom render+click does not test post-entry routing or refresh.
Failure scenario: owner clicks, gets in, refreshes, bounced to the invite gate.
Fix: assert the argument's meaning; add a jsdom test for the phase transition and post-entry redirect; run the Playwright pass before merge — it is the only claimed-but-unproven surface.

**F10 — LOW — claim 4.2 (F3 "verified absent")**
Absence was established by keyword search of two source directories. A route registered via a mount table or dynamically string-built path would be missed.
Failure scenario: a routes index mounts `/${resource}` for `resource in [...]` including feed → claim false, F3 sequencing wrong.
Fix: case-insensitive `feed` grep repo-wide including route-mount/index files; snapshot every mounted route at boot in a test.

**F11 — LOW — authRoutes.ts:92 + isOwnerSignInBody**
`{ emailHash: X, owner: true }` silently discards the caller's hash and returns the configured owner.
Failure scenario: existing tooling/tests that post both fields expecting a member session receive an owner session → flaky authorization tests.
Fix: 400 on bodies containing both fields, or document precedence.

**F12 — LOW — claim 4.3**
"0 of 51 creators enabled" is asserted from code reading, not a DB query; if any seed migration flips `enabled=true` by default, the "renders empty" prediction rests on the API-key argument alone.
Fix: confirm with one live `select count(*) ... where enabled` before building F3 against that assumption.

REVISE
