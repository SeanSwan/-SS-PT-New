# SwanGuard — owner door + migration ledger repair: HOSTILE REVIEW PACKET

**Date:** 2026-09-01 · **Repo:** SwanGuard-Newsroom (separate from SwanStudios)
**Branch:** `merge/newsroom-mainline-v3` · **State:** uncommitted working tree
**Reviewer remit:** find what is WRONG. Do not summarize. Do not praise.

---

## 0. What you are reviewing

Two changes plus a plan claim. The goal driving them: the owner (a single human,
local machine) double-clicks a `.cmd` launcher and gets into his own app to look at it.

Before this work:
- Double-clicking **failed at migrations** (`Migration checksum mismatch for 0026`),
  aborting before the app started.
- Any successful sign-in produced role `member`, never `owner`. The live DB held
  exactly one user, role `member`. Every owner-gated surface was therefore shut.

Explicit non-goal: **no password system.** The product advertises "No password database"
on its sign-in gate as a trust property, and every one of the 20 `password` references
in the codebase is a test asserting the word never appears in a response body or audit
event. The owner asked for "a password I can change"; that was pushed back on and he
chose the owner-door option instead.

---

## 1. Change A — the local owner door

`POST /api/auth/dev-sign-in` previously accepted only `{ emailHash }` and is used by
**78 files** (tests + smokes). It is production-blocked (`403 dev_sign_in_disabled`).

`findOrCreateUser` promotes to `owner` **only** when the supplied hash equals a
configured `ownerEmailHash`; otherwise the user is a plain `member`. The launcher never
set `SWANGUARD_OWNER_EMAIL_HASH`, so no owner existed and none could be created.

The new path: the browser sends `{ owner: true }` and the **server** resolves the hash
from its own config, so the browser never learns it and the HMAC key stays server-side.

### Claimed gates (attack these)
1. `config.nodeEnv === 'production'` -> 403 `dev_sign_in_disabled` (pre-existing, first check).
2. `SWANGUARD_ALLOW_OWNER_DOOR` must be `'true'` -> else 403 `owner_door_disabled`. Fail-closed;
   the flag is set ONLY by the local launcher.
3. The web button is defaulted to `import.meta.env.DEV`, so a production build omits it.

This third gate was added *after* a self-review found the first draft was a privilege
escalation: `{ owner: true }` handed owner to anything that could reach a NON-production
API, which is strictly worse than the member-only door beside it — on a machine whose
dev server binds `0.0.0.0` and carries a tailnet address.

```diff
diff --git a/apps/api/src/authRoutes.ts b/apps/api/src/authRoutes.ts
index 687b44d..1b7f062 100644
--- a/apps/api/src/authRoutes.ts
+++ b/apps/api/src/authRoutes.ts
@@ -89,8 +89,43 @@ export async function createSessionResponse(
 async function createDevSession(auth: AuthStore, config: ApiConfig, request: Request, requestId: string): Promise<Response> {
   if (config.nodeEnv === 'production') throw new HttpError(403, 'dev_sign_in_disabled', 'Dev sign-in is disabled');
   const body = await readJsonBody(request);
+  const emailHash = isOwnerSignInBody(body) ? requireConfiguredOwnerHash(config) : readSignInEmailHash(body);
+  return createSessionResponse(auth, config, await auth.findOrCreateUser(emailHash), requestId);
+}
+
+/**
+ * Local owner entry. The browser never learns the owner hash: it asks for `{ owner: true }`
+ * and the server answers from its own configuration. That keeps SWANGUARD_OWNER_EMAIL_HASH
+ * server-side, where the HMAC key that derives it already lives.
+ *
+ * Two independent gates keep this out of production: the nodeEnv check above returns 403,
+ * and a production web build never renders the button that calls it.
+ */
+function isOwnerSignInBody(body: unknown): body is { owner: true } {
+  return Boolean(body && typeof body === 'object' && (body as Record<string, unknown>).owner === true);
+}
+
+function requireConfiguredOwnerHash(config: ApiConfig): string {
+  if (!config.allowOwnerDoor) {
+    throw new HttpError(
+      403,
+      'owner_door_disabled',
+      'The local owner door is disabled. Set SWANGUARD_ALLOW_OWNER_DOOR=true to enable it.'
+    );
+  }
+  if (!config.ownerEmailHash) {
+    throw new HttpError(
+      409,
+      'owner_not_configured',
+      'No owner identity is configured. Set SWANGUARD_OWNER_EMAIL_HASH and restart the API.'
+    );
+  }
+  return config.ownerEmailHash;
+}
+
+function readSignInEmailHash(body: unknown): string {
   if (!isEmailHashBody(body)) throw new HttpError(400, 'invalid_sign_in', 'Invalid sign-in request');
-  return createSessionResponse(auth, config, await auth.findOrCreateUser(body.emailHash), requestId);
+  return body.emailHash;
 }
 
 function createCsrfResponse(config: ApiConfig, requestId: string): Response {
diff --git a/apps/api/src/config.ts b/apps/api/src/config.ts
index 5cd8afa..0cd9b78 100644
--- a/apps/api/src/config.ts
+++ b/apps/api/src/config.ts
@@ -9,6 +9,8 @@ export interface ApiConfig {
   emailHashKey: string;
   nodeEnv: 'development' | 'test' | 'production';
   authPasskeysEnabled: boolean;
+  /** Opt-in for the local owner door. Fail-closed: absent or false means the door is refused. */
+  allowOwnerDoor?: boolean;
   ownerEmailHash?: string;
   officialConnectors?: OfficialConnectorConfig;
   port: number;
@@ -44,6 +46,10 @@ export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
   const publicAppUrl = parsePublicAppUrl(env.SWANGUARD_PUBLIC_APP_URL, nodeEnv);
   const webAuthn = parseWebAuthnConfig(env, publicAppUrl, nodeEnv);
   const authPasskeysEnabled = parseBooleanFlag(env.SWANGUARD_AUTH_PASSKEYS, true);
+  // Defaults to false on purpose. Without this the owner door would hand owner to
+  // anything that can reach a non-production API, which is a wider door than the
+  // member-only dev sign-in it sits beside.
+  const allowOwnerDoor = parseBooleanFlag(env.SWANGUARD_ALLOW_OWNER_DOOR, false);
   const officialConnectors = parseOfficialConnectorConfig(env);
 
   if (!Number.isInteger(port) || port < 1 || port > 65535) {
@@ -51,6 +57,7 @@ export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
   }
 
   return {
+    allowOwnerDoor,
     appName: 'family-first-api',
     authPasskeysEnabled,
     database: parseDatabaseConfig(env, nodeEnv),
diff --git a/apps/web/src/api/browserAuth.ts b/apps/web/src/api/browserAuth.ts
index 6cf086c..635f943 100644
--- a/apps/web/src/api/browserAuth.ts
+++ b/apps/web/src/api/browserAuth.ts
@@ -31,6 +31,7 @@ export interface BrowserAuthClient {
   logout(): Promise<void>;
   registerPasskey(input: { nickname?: string; optInAccepted: boolean }): Promise<void>;
   requestMagicLink(email: string): Promise<void>;
+  signInAsOwner(): Promise<AuthUser>;
 }
 
 export function createBrowserAuthClient(
@@ -99,6 +100,9 @@ export function createBrowserAuthClient(
     },
     async requestMagicLink(email) {
       await publicJson('/api/auth/magic-link-intents', { email });
+    },
+    async signInAsOwner() {
+      return (await publicJson<{ user: AuthUser }>('/api/auth/dev-sign-in', { owner: true })).user;
     }
   };
 
```

### Web gate diff
```diff
diff --git a/apps/web/src/AuthGate.tsx b/apps/web/src/AuthGate.tsx
index 480b1e1..2d6827c 100644
--- a/apps/web/src/AuthGate.tsx
+++ b/apps/web/src/AuthGate.tsx
@@ -20,7 +20,11 @@ import {
 
 type GatePhase = 'access' | 'authenticated' | 'checking' | 'link-sent' | 'passkey-setup';
 
-export function AuthGate({ children, client }: { children: ReactNode; client?: BrowserAuthClient }) {
+export function AuthGate({
+  children,
+  client,
+  allowOwnerEntry = import.meta.env.DEV
+}: { allowOwnerEntry?: boolean; children: ReactNode; client?: BrowserAuthClient }) {
   const auth = useMemo(() => client ?? createBrowserAuthClient(), [client]);
   const entry = useMemo(readEntryIntent, []);
   const started = useRef(false);
@@ -104,6 +108,23 @@ export function AuthGate({ children, client }: { children: ReactNode; client?: B
     }
   }
 
+  /**
+   * Local owner entry. Defaults to the Vite DEV flag, so a production bundle never
+   * renders the control and the server's own nodeEnv gate rejects the route anyway.
+   * Exposed as a prop so tests drive both states without stubbing import.meta.
+   */
+  async function enterAsOwner() {
+    setError(null);
+    setWorking(true);
+    try {
+      completeEntry(await auth.signInAsOwner(), false);
+    } catch (ownerError) {
+      setError(readAuthError(ownerError));
+    } finally {
+      setWorking(false);
+    }
+  }
+
   async function signOut() {
     setError(null);
     setWorking(true);
@@ -177,16 +198,25 @@ export function AuthGate({ children, client }: { children: ReactNode; client?: B
           )}
 
           {phase === 'access' && (
-            <AccessForm onSubmit={(event) => void submitEmail(event)}>
-              <AccessField>
-                <span>Email address</span>
-                <input autoComplete="email webauthn" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
-              </AccessField>
-              <AccessActions>
-                <PrimaryAccessButton disabled={working} type="submit"><Mail size={18} aria-hidden="true" /> {working ? 'Sending…' : entry.inviteCode ? 'Accept secure invite' : 'Email secure link'}</PrimaryAccessButton>
-                {!entry.inviteCode && <SecondaryAccessButton disabled={working || !email} onClick={() => void usePasskey()} type="button"><KeyRound size={18} aria-hidden="true" /> Use a passkey</SecondaryAccessButton>}
-              </AccessActions>
-            </AccessForm>
+            <>
+              <AccessForm onSubmit={(event) => void submitEmail(event)}>
+                <AccessField>
+                  <span>Email address</span>
+                  <input autoComplete="email webauthn" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
+                </AccessField>
+                <AccessActions>
+                  <PrimaryAccessButton disabled={working} type="submit"><Mail size={18} aria-hidden="true" /> {working ? 'Sending…' : entry.inviteCode ? 'Accept secure invite' : 'Email secure link'}</PrimaryAccessButton>
+                  {!entry.inviteCode && <SecondaryAccessButton disabled={working || !email} onClick={() => void usePasskey()} type="button"><KeyRound size={18} aria-hidden="true" /> Use a passkey</SecondaryAccessButton>}
+                </AccessActions>
+              </AccessForm>
+              {allowOwnerEntry && !entry.inviteCode && (
+                <AccessActions>
+                  <SecondaryAccessButton disabled={working} onClick={() => void enterAsOwner()} type="button">
+                    <ShieldCheck size={18} aria-hidden="true" /> {working ? 'Entering…' : 'Enter as owner (local)'}
+                  </SecondaryAccessButton>
+                </AccessActions>
+              )}
+            </>
           )}
 
           <AccessTrustList aria-label="Privacy guarantees">
```

---

## 2. Change B — the migration checksum ledger

`postgres-migration-runner.mjs` refused to run: `Migration checksum mismatch for 0026`.
This aborts the launcher at step [2/4], so the app never boots.

**Diagnosis.** No migration content had been edited. All 29 files are CRLF on disk
(`core.autocrlf=true`, no `.gitattributes`). Comparing every stored checksum against
BOTH renderings of the current file:

- 0001-0025: stored checksum matches the file **as-is (CRLF)** — applied from this Windows checkout
- 0026-0029: stored checksum matches the **LF-normalized** content — applied from an LF environment
- **0 migrations matched neither.**

So the ledger held two line-ending renderings of files nobody had edited, and the guard
could not tell that from tampering.

**Fix.** Checksum over LF-normalized SQL (canonical, platform-independent). Keep a
`checksumCrlf` variant. If the stored value matches the variant, the content is proven
identical: heal the row to canonical **inside the same transaction**, record it in a
`reconciled` array, and print it. A genuine edit matches neither and still throws.

```diff
diff --git a/scripts/postgres-migration-runner.mjs b/scripts/postgres-migration-runner.mjs
index af682a9..5da8124 100644
--- a/scripts/postgres-migration-runner.mjs
+++ b/scripts/postgres-migration-runner.mjs
@@ -19,6 +19,8 @@ create table if not exists schema_migrations (
 
 const selectAppliedMigrationsSql = 'select version, checksum from schema_migrations order by version';
 
+const updateMigrationChecksumSql = 'update schema_migrations set checksum = $2 where version = $1';
+
 const insertMigrationSql = `
 insert into schema_migrations (version, name, checksum)
 values ($1, $2, $3)
@@ -45,7 +47,7 @@ export async function loadSqlMigrations(options = {}) {
     // Strip a leading UTF-8 BOM: Postgres rejects it ("syntax error at or near ...").
     // A single BOM'd migration crashed the whole run on real Postgres (2026-07-28).
     const sql = (await readFile(resolve(migrationsDir, file), 'utf8')).replace(/^﻿/, '');
-    migrations.push({ checksum: createChecksum(sql), name: match[2], sql, version: match[1] });
+    migrations.push({ ...checksumForms(sql), name: match[2], sql, version: match[1] });
   }
 
   return migrations;
@@ -55,6 +57,7 @@ export async function applySqlMigrations(client, migrations) {
   validateMigrations(migrations);
 
   const applied = [];
+  const reconciled = [];
   const skipped = [];
 
   await client.query('BEGIN');
@@ -69,7 +72,18 @@ export async function applySqlMigrations(client, migrations) {
 
       if (priorChecksum) {
         if (priorChecksum !== migration.checksum) {
-          throw new PostgresMigrationError(`Migration checksum mismatch for ${migration.version}`);
+          // A checkout on another platform re-renders line endings without changing a
+          // single statement, and that alone used to trip this guard: 0026-0029 were
+          // applied from an LF tree and 0001-0025 from a CRLF one, so the ledger held
+          // both renderings of files nobody had edited. Accept the other rendering of
+          // the SAME content and heal the row to the canonical checksum. A real edit
+          // matches neither rendering and still throws.
+          if (priorChecksum !== migration.checksumCrlf) {
+            throw new PostgresMigrationError(`Migration checksum mismatch for ${migration.version}`);
+          }
+
+          await client.query(updateMigrationChecksumSql, [migration.version, migration.checksum]);
+          reconciled.push(migration.version);
         }
 
         skipped.push(migration.version);
@@ -82,7 +96,7 @@ export async function applySqlMigrations(client, migrations) {
     }
 
     await client.query('COMMIT');
-    return { applied, skipped };
+    return { applied, reconciled, skipped };
   } catch (error) {
     await rollback(client);
     throw error;
@@ -134,6 +148,13 @@ export async function runPostgresMigrations(options = {}) {
     const result = await applySqlMigrations(client, await loadSqlMigrations(options));
     await seedOwnerUser(client, options.ownerEmailHash ?? process.env.SWANGUARD_OWNER_EMAIL_HASH, output);
     output.info(`[postgres-migrate] applied ${result.applied.length}, skipped ${result.skipped.length}`);
+    if (result.reconciled?.length) {
+      // Say it out loud. A checksum row rewritten in silence is indistinguishable
+      // from a guard that stopped guarding.
+      output.info(
+        `[postgres-migrate] reconciled ${result.reconciled.length} line-ending-only checksum(s): ${result.reconciled.join(', ')}`
+      );
+    }
     return result;
   } finally {
     if (client) client.release();
@@ -161,6 +182,20 @@ function createChecksum(sql) {
   return createHash('sha256').update(sql).digest('hex');
 }
 
+/**
+ * Checksums are taken over LF-normalized SQL so one migration hashes identically on
+ * every platform. `checksumCrlf` is the CRLF rendering of that same content, kept only
+ * so a ledger written before this normalization is recognized and healed rather than
+ * mistaken for tampering.
+ */
+function checksumForms(sql) {
+  const normalized = sql.split('\r\n').join('\n');
+  return {
+    checksum: createChecksum(normalized),
+    checksumCrlf: createChecksum(normalized.split('\n').join('\r\n'))
+  };
+}
+
 async function rollback(client) {
   try {
     await client.query('ROLLBACK');
```

---

## 3. Verification actually performed (current session)

| Check | Result |
|---|---|
| Live: flag absent | `403 owner_door_disabled` |
| Live: flag present (launcher's exact env) | `201`, `role: "owner"`, real Postgres |
| Live: ordinary `{emailHash}` sign-in | `201`, `role: "member"` — unchanged |
| Live: production env + flag | `403 dev_sign_in_disabled` (unit) |
| Migrations | `applied 0, skipped 29`; idempotent on rerun |
| Negative control | implementation reverted, tests kept -> 2 API + 2 web tests failed |
| api / web / scripts suites | 530 / 406 / 148 pass, 0 fail |
| `type-check` | exit 0, all 5 workspaces |
| Secret scan | 0 findings |

**Known unproven:** the rendered DOM in a real browser. The shared Playwright browser was
locked by another agent for the whole session. Proxies used instead: jsdom render+click,
a test asserting the DEFAULT prop path under a Vite env (`import.meta.env.DEV === true`),
and confirming the dev server serves a module containing the button string.

---

## 4. Plan claims (attack these too)

1. The registry said **F2b was NEXT**. Verification found F2b **already built**: route at
   `creatorCatalogRoutes.ts:113`, runner wired at `runtime.ts:190`, and the
   `schemaVerification.ts` debt paid (its comment says "landed with F2b"; all 9
   `creator_item` columns checked). 46 + 9 tests green. The registry rows were corrected.
2. Therefore **F3 (`GET /api/feed`) is next** — verified absent (all 11 `/feed` hits in
   `apps/api/src` + `apps/web/src` are `feedUrl` strings in tests).
3. Claim: F3 will render **empty** regardless, because ingest needs
   `SWANGUARD_YOUTUBE_API_KEY` (or the Twitch pair) — none configured, the runner returns
   an "unavailable" stub without them — AND `runCreatorIngest` intersects with the ENABLED
   set, which is **0 of 51 creators**.

---

## 5. Your remit

Return findings ONLY. For each: **severity (CRITICAL/HIGH/MEDIUM/LOW)**, the **exact
file:line or claim**, the **concrete failure scenario** (inputs -> wrong outcome), and a
**fix**. End with one verdict: **APPROVE / REVISE / REJECT**.

Attack specifically:
- Can the owner door be reached in any configuration the author did not consider?
  Proxies, `x-forwarded-for`, a `.env` that sets the flag, `NODE_ENV` unset or misspelled,
  a bundler that leaks `import.meta.env.DEV` as true, someone running `npm run dev` on a
  public host, a reverse proxy in front of :4100.
- Does `parseBooleanFlag` treat `'TRUE'`, `'1'`, `'yes'` as true? Should it?
- Can the checksum heal mask real tampering? Consider an attacker who controls the
  migration FILE but not the DB, and vice versa. Consider a file that is neither pure
  CRLF nor pure LF (mixed endings), or one containing a literal `\r\n` inside a string.
- Is healing inside the migration transaction correct, or does it widen a lock/failure window?
- Is `role: 'owner'` on a session with `trustLevel: 'new'` a coherent state?
- What did the author fail to verify, and what would a real browser have shown?
- Is the F2b/F3 sequencing claim actually right, or is there a further stale assumption?
