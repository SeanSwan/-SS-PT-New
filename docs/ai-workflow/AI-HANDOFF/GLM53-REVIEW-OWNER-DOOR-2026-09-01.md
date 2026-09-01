# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 5015 in / 16741 out (reasoning: 14557) | total 21756
**Wall:** 289.0s

---

## Findings

**1. CRITICAL — `apps/api/src/authRoutes.ts:90-96` (`createDevSession` owner branch) + `apps/api/src/config.ts:49` (`allowOwnerDoor`): the owner door has no locality binding. Both gates are environment booleans; neither inspects the request source.**
Scenario: the packet's own words — "dev server binds `0.0.0.0` and carries a tailnet address." The launcher runs non-production `NODE_ENV` with `SWANGUARD_ALLOW_OWNER_DOOR=true` (verified: 201/owner). While the owner double-clicks and browses his app — i.e., during every normal use — any tailnet/LAN peer runs `curl -X POST http://<tailnet-host>:4100/api/auth/dev-sign-in -H 'content-type: application/json' -d '{"owner":true}'` → 201, owner session. Gate 3 is irrelevant: attackers don't click buttons. The self-review *named this exact scenario* and the shipped mitigation (DEV-gating the button) addresses a different one — production builds — not the non-production exposure that was the threat.
Fix: hard-require loopback on the owner branch (`remoteAddress ∈ {127.0.0.1, ::1}`), and have the launcher bind the API to `127.0.0.1`. Optionally a per-boot nonce. The env flag alone is not a boundary.

**2. HIGH — `apps/api/src/config.ts` (`loadConfig`, `nodeEnv` derivation, not shown): gate 1 may fail open. The packet never states the default for `NODE_ENV` unset or misspelled (`prod`, `Production`).**
Scenario: API deployed on a LAN/host with `NODE_ENV` unset (defaults to `'development'` in most loaders) plus a `.env` copied from the launcher template (which contains the flag) → both gates pass → remote one-click owner. The packet's own attack list names this; nothing in the diff or verification answers it.
Fix: publish and test the unset/misspelled behavior; make the owner branch require `nodeEnv === 'development'` explicitly (not "not production") in addition to finding 1's loopback check.

**3. HIGH — `dev-sign-in` route registration (not shown) / `browserAuth.ts:103-105` (`publicJson` POST): no evidence of CSRF token, Origin, or Host-header validation on the route that mints owner.**
Scenario A (DNS rebinding): owner browses the web while the launcher runs; a page at `evil.com` rebinds to `127.0.0.1:4100` and same-origin-POSTs `{"owner":true}` → attacker's JS reads the 201 and drives every owner API through the rebound origin — remotely, via the owner's own browser. Scenario B (form CSRF): cross-site POST plants an owner cookie for localhost that activates on the owner's next local visit.
Fix: validate Host/Origin (localhost allowlist) on this route, require the existing CSRF machinery even here, or require the finding-1 nonce, which rebinding cannot read.

**4. MEDIUM — `config.ts` (`ownerEmailHash`) + `authRoutes.ts` member path (`readSignInEmailHash` → `findOrCreateUser`): the owner emailHash is a bearer credential persisted on disk, and the member door honors it regardless of the door flag.**
Scenario: `requireConfiguredOwnerHash` proves the hash lives in the launcher's env/file. Anyone who reads that file (shared machine, backup, sync folder) POSTs `{"emailHash":"<value>"}` to any reachable non-prod API where `SWANGUARD_OWNER_EMAIL_HASH` is configured → promoted to owner with `SWANGUARD_ALLOW_OWNER_DOOR` **off**. The flag gates only the `{owner:true}` convenience, not owner access. "No password database" now has a password-equivalent file, unprotected and unmentioned.
Fix: ACL the launcher env; document that the hash is a credential; consider a boot-scoped pepper so a persisted hash alone is insufficient.

**5. MEDIUM — `scripts/postgres-migration-runner.mjs:185-193` (`checksumForms`) + packet §2 diagnosis: root cause (`core.autocrlf=true`, no `.gitattributes`) is left in place, and normalization can bless *divergent* SQL.**
Scenario: a future migration embeds a literal CRLF inside a string constant (or mixed endings). `git` converts content-blind, so the Windows checkout's raw SQL genuinely differs from the LF tree's — inside the literal. `checksumForms` normalizes both to identical hashes, so the guard declares "identical" while the executed SQL (and stored string data) differs per platform. Conversely, a legacy mixed-ending row matches neither form and the run hard-aborts — the exact failure class this change claims to have fixed. The diagnosis "0 matched neither" is true of today's 29 files only.
Fix: add `.gitattributes` (`*.sql text eol=lf`), `git add --renormalize .`, and make the runner fail loudly on any bare `\r` surviving normalization instead of silently accepting it.

**6. MEDIUM — `apps/web/src/AuthGate.tsx:23-26` (`allowOwnerEntry = import.meta.env.DEV`) + §3 table last row: the "production build omits it" claim was never tested.**
Scenario: `vite build --mode development` (or a copied CI script) emits `DEV=true` → the button ships to a hosted static site; combined with finding 2, the remote one-click owner is live. Evidence offered: jsdom click, a DEV=true assertion, and a dev-server module string — none exercises a production bundle.
Fix: run `vite build` once and assert `'Enter as owner'` is absent from `dist/`; add it to CI. Also stop counting this as a security gate in the write-up — the API is the attack surface.

**7. MEDIUM — `authRoutes.ts` (`createSessionResponse` for the owner path) + `AuthGate.tsx:111-125` (`enterAsOwner`, `completeEntry(user, false)`): `role: 'owner'` with `trustLevel: 'new'` is asserted coherent by silence.**
Scenario: any owner surface that also checks trust (or `AuthGate` routing new-trust users toward `'passkey-setup'`) blocks or misroutes the owner — the owner double-clicks and lands in passkey enrollment or a half-open admin. The one thing the packet admits is unproven (real browser) is precisely where this would appear; jsdom + module-string proxies cannot catch routing phase behavior.
Fix: enumerate trust-gated checks against role checks; either elevate trust on owner-door sessions or skip the passkey nudge for `role === 'owner'`; verify in the actual browser before sign-off.

**8. MEDIUM — `scripts/postgres-migration-runner.mjs:151` (`seedOwnerUser(client, options.ownerEmailHash ?? …)`): semantics against the pre-existing `member` row are unspecified.**
Scenario: live DB held exactly one user, role `member`, same email hash. The launcher env now supplies `ownerEmailHash`, so seed ran against that row. If the seed is insert-on-conflict-skip, the row's persisted role can stay `member` while session-level promotion works — any data-level check ("does an owner row exist", workspace ownership, ACL seeds) reads `member` and owner-gated-by-data features misbehave. The table records `applied 0, skipped 29` but never records the seed's outcome.
Fix: verify the seed upgrades an existing row; add a test for seed-vs-existing-member.

**9. MEDIUM — Plan claim §4.2 ("F3 … verified absent"): the grep covered 2 of 5 workspaces.**
Scenario: a `/feed` implementation or stub in `packages/*` or a third app → "F3 is next" is false and work duplicates. "All 11 hits in `apps/api/src` + `apps/web/src`" is a scoped negative, stated as a global one.
Fix: re-grep all five workspaces plus `scripts/`; publish the command.

**10. LOW — Plan claim §4.3 ("F3 will render empty regardless"): falsified by Change A itself.**
Scenario: the owner door now produces a functioning owner; the owner flips creators to enabled (owner-gated surface), configures a key → ingest runs → feed non-empty. "Regardless" is contingent on two conditions this very change makes mutable.
Fix: restate as "empty iff no platform keys OR enabled set is 0."

**11. LOW — `config.ts:49` + claimed gate 2 ("must be `'true'`"): `parseBooleanFlag`'s accepted set is unspecified and untested.**
Scenario: `SWANGUARD_ALLOW_OWNER_DOOR=1` or `True` — if accepted, the claim's tightness is false; if rejected, any doc suggesting those values silently breaks the door (owner 403s after following it). Only absent/exact-`true` were tested.
Fix: pin and test the accepted set; document it.

**12. LOW — `authRoutes.ts:106-120` (`requireConfiguredOwnerHash`): configuration-state oracle plus env-var coaching.**
Scenario: a tailnet scanner distinguishes `403 owner_door_disabled` / `409 owner_not_configured` / `201` and learns both the flag state and the exact env var names to hunt for, from the error text itself.
Fix: single opaque 403 for both conditions; generic message to remote callers.

**13. LOW — `postgres-migration-runner.mjs:151-157` (`reconciled` output): the heal rewrites an anti-tamper record and the only durable trace is a stdout line in a double-clicked console window.**
Scenario: a heal that masked a real filesystem compromise leaves no persisted evidence after the window closes; the comment's own standard ("indistinguishable from a guard that stopped guarding") is unmet.
Fix: persist heal events (audit table or log record), not just `output.info`.

**REJECT**
