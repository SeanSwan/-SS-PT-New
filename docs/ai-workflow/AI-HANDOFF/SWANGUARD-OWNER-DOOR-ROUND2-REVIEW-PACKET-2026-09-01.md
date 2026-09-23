# SwanGuard owner door — ROUND 2 hostile review packet

**Date:** 2026-09-01 · **Repo:** SwanGuard-Newsroom · **Commit:** `e3e9da6` on `merge/newsroom-mainline-v3`
**Round 1 verdicts:** GLM-5.3 **REJECT** (13 findings) · GLM-5.3-flash **REVISE** (12 findings)
**Reviewer remit:** decide whether round 1 is actually closed, and find what the FIXES broke.

---

## 0. How to read this

Round 1 reviewed an uncommitted draft. That draft is gone. This packet contains the code
**as committed**, so you are not re-reviewing a version that no longer exists.

Round 1's central finding was correct and is worth restating, because it is the thing to
re-test rather than take on trust: the owner door had **no locality binding**. The API
bound `0.0.0.0`, so any LAN or tailnet peer could `POST {"owner":true}` and receive an
owner session knowing no secret. The author had named that exact exposure in a self-review
and then shipped a mitigation for a different threat (hiding a button in production builds).

**Your job is not to confirm the fixes look reasonable. It is to break them.** Assume the
author is still wrong in a way neither round-1 seat found. Two specific invitations:

1. **Did the fixes introduce anything?** Loopback stamping, a Host/Origin check, an
   explicit-NODE_ENV requirement, executing normalized SQL, and a persisted audit table are
   all NEW code paths written in one pass under time pressure.
2. **Is any round-1 finding only cosmetically closed?** Several were answered with a test
   rather than a behaviour change. A test that asserts the current behaviour is not a fix.

---

## 1. The door, exactly as committed

Order matters here and is deliberate; attack the order as well as the parts.

```ts
function requireOwnerDoor(config: ApiConfig, request: Request): string {
  const local = request.headers.get('x-swanguard-peer') === 'loopback';
  if (!local) throw new HttpError(403, 'not_available', 'Not available');

  // Loopback alone is NOT enough against DNS rebinding: a page on evil.com whose name has
  // been re-pointed at 127.0.0.1 reaches this handler over a genuinely local socket, and its
  // script can then read the owner session out of the response. The Host and Origin the
  // browser reports are what distinguish "the owner's own tab" from "a hostile page aimed
  // at the owner's loopback".
  if (!isLocalBrowserContext(request)) throw new HttpError(403, 'not_available', 'Not available');

  if (!config.allowOwnerDoor) {
    throw new HttpError(
      403,
      'owner_door_disabled',
      'The local owner door is disabled. Set SWANGUARD_ALLOW_OWNER_DOOR=true to enable it.'
    );
  }
  // "Nobody set NODE_ENV" is not a developer saying "this is my dev box". Unset used to
  // resolve to development and open the door on hosts nobody had classified.
  if (config.nodeEnv !== 'development' || !config.nodeEnvExplicit) {
    throw new HttpError(
      403,
      'owner_door_disabled',
      'The local owner door requires NODE_ENV=development to be set explicitly.'
    );
  }
  if (!config.ownerEmailHash) {
    throw new HttpError(
      503,
      'owner_not_configured',
      'No owner identity is configured. Set SWANGUARD_OWNER_EMAIL_HASH and restart the API.'
    );
  }
  return config.ownerEmailHash;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function hostnameOf(value: string): string {
  // Strip a port without tripping over IPv6 brackets.
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\[[^\]]+\]|[^:]+)(?::\d+)?$/);
  return match ? match[1] : trimmed;
}
function isLocalBrowserContext(request: Request): boolean {
  const host = request.headers.get('host');
  if (!host || !LOCAL_HOSTNAMES.has(hostnameOf(host))) return false;

  const origin = request.headers.get('origin');
  if (origin === null) return true; // curl / same-origin non-CORS POST from the app itself
  try {
    return LOCAL_HOSTNAMES.has(hostnameOf(new URL(origin).host));
  } catch {
    return false;
  }
}
function hostnameOf(value: string): string {
  // Strip a port without tripping over IPv6 brackets.
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\[[^\]]+\]|[^:]+)(?::\d+)?$/);
  return match ? match[1] : trimmed;
}
```

### The socket stamp (server.ts)
```ts
export const PEER_HEADER = 'x-swanguard-peer';

function createFetchRequest(incoming: IncomingMessage): Request {
  const method = incoming.method ?? 'GET';
  const host = incoming.headers.host ?? '127.0.0.1';
  const url = `http://${host}${incoming.url ?? '/'}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  // Authoritative, and deliberately last: whatever the client sent under this name is gone.
  headers.set(PEER_HEADER, isLoopbackHost(incoming.socket?.remoteAddress ?? '') ? 'loopback' : 'remote');

  const init: RequestInit & { duplex?: 'half' } = { headers, method };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = incoming as unknown as BodyInit;
    init.duplex = 'half';
  }

  return new Request(url, init);
}
```

### Config guard + loopback test (config.ts)
```ts
export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === '127.0.0.1' || normalized === '::1' || /^127\.\d+\.\d+\.\d+$/.test(normalized);
}
  if (allowOwnerDoor && !isLoopbackHost(bindHost)) {
    throw new ConfigError(
      `SWANGUARD_ALLOW_OWNER_DOOR=true requires a loopback bind; SWANGUARD_BIND_HOST=${bindHost} would expose the owner door to the network`
    );
  }

  return {
    allowOwnerDoor,
    bindHost,
```

### Migration checksum + execution (postgres-migration-runner.mjs)
```js
function checksumForms(sql) {
  const normalized = sql.split('\r\n').join('\n');
  return {
    // `sql` IS the normalized text, and it is what gets executed. Hashing the normalized
    // form while executing the raw bytes made the guard's "content is identical" claim false
    // at the data layer: a newline inside a string literal or a dollar-quoted body stores
    // \r\n on a CRLF checkout and \n on an LF one, under one shared checksum. Executing the
    // normalized form makes every fresh apply converge on the same bytes on every platform.
    sql: normalized,
    checksum: createChecksum(normalized),
    checksumCrlf: createChecksum(normalized.split('\n').join('\r\n'))
  };
}

      const priorChecksum = checksums.get(migration.version);

      if (priorChecksum) {
        if (priorChecksum !== migration.checksum) {
          // A checkout on another platform re-renders line endings without changing a
          // single statement, and that alone used to trip this guard: 0026-0029 were
          // applied from an LF tree and 0001-0025 from a CRLF one, so the ledger held
          // both renderings of files nobody had edited. Accept the other rendering of
          // the SAME content and heal the row to the canonical checksum. A real edit
          // matches neither rendering and still throws.
          if (priorChecksum !== migration.checksumCrlf) {
            throw new PostgresMigrationError(`Migration checksum mismatch for ${migration.version}`);
          }

          await client.query(updateMigrationChecksumSql, [migration.version, migration.checksum]);
          reconciled.push(migration.version);
        }

        skipped.push(migration.version);
        continue;
      }

      await client.query(migration.sql);
      await client.query(insertMigrationSql, [migration.version, migration.name, migration.checksum]);
      applied.push(migration.version);
```

---

## 2. Round 1 → what changed. Check each claim.

| R1 | Finding | What was done | Behaviour change, or just a test? |
|---|---|---|---|
| 5.3 #1 / flash F1 | **CRITICAL** no locality binding | API binds loopback; config REFUSES TO BOOT with the door open on a non-loopback bind; socket-stamped `x-swanguard-peer` set AFTER client headers are copied; absence treated as remote; web dev server loopback too | behaviour |
| 5.3 #4 | `{emailHash: <owner hash>}` grants owner regardless of the door flag | **NOT changed in code.** The hash is now 32 random bytes generated once into `%LOCALAPPDATA%\SwanGuard\owner-hash` (outside the repo) instead of `sha256("swanguard-local-owner")` published in a launcher comment | credential change only — see §4 |
| 5.3 #2 / flash F2 | `NODE_ENV` unset resolved to development and opened the door | door now requires `nodeEnv === 'development'` **and** `nodeEnvExplicit` | behaviour |
| 5.3 #3 | DNS rebinding / no Origin check | Host must be a local hostname; Origin, when present, must be local | behaviour |
| flash F4 | checksum over normalized SQL but **raw** SQL executed | `checksumForms` now returns the normalized text and that is what executes | behaviour |
| 5.3 #6 / flash F3 | "production build omits the button" was FALSE | claim retracted. `npm run qa:owner-entry-build` asserts the narrower true thing: default compiles to `false`, `import.meta.env.DEV` fully substituted. Checker is negative-controlled (5 tests, incl. one that must fail and a positive control) | claim corrected + check |
| 5.3 #7 / flash F6 | `role:'owner'` + `trustLevel:'new'` undefined by policy | **pinned by test, not changed.** Trust level is still `new` | test only — see §4 |
| 5.3 #12 / flash F8 | error text names env vars to a prober | locality and Host/Origin failures return one opaque `403 not_available`. The env-var messages remain, but only reachable AFTER both checks pass | partial, deliberate — attack this |
| 5.3 #13 / flash F7 | heal had no durable trail; printed after seeding | persisted to `schema_migration_reconciliations`; reported BEFORE `seedOwnerUser`, which can throw | behaviour |
| flash F11 | `{emailHash, owner:true}` silently discarded the hash | 400 `invalid_sign_in` | behaviour |
| 5.3 #9 / flash F10 | `/feed` absence proven over 2 of 5 workspaces | re-grepped `apps/*`, `packages/*`, `scripts/`, build output excluded: **0** matches, vs **10** for a route that exists (positive control) | evidence |
| 5.3 #11 | `parseBooleanFlag` accepted set unknown | measured: strict `'true'`/`'false'`, everything else throws and the API will not boot. Asserted for `TRUE/True/1/yes/on` | evidence |
| 5.3 #10 | "F3 renders empty regardless" overstated | restated as contingent on keys AND enabled-set | wording |
| flash F5 | mixed line endings match neither rendering and re-brick the launcher | **NOT FIXED.** See §4 |
| flash F12 | "0 of 51 enabled" was assumed | it was a live DB query, not code reading. Finding was wrong | n/a |

---

## 3. Verification performed

| Check | Result |
|---|---|
| `POST {"owner":true}` → 192.168.50.83:4177 (LAN) | **CONNECTION REFUSED** |
| `POST {"owner":true}` → 100.84.224.29:4177 (tailnet) | **CONNECTION REFUSED** |
| same → 127.0.0.1:4177 | 201, `role: owner` |
| loopback + `Host: evil.example` | 403 `not_available` |
| loopback + `Origin: https://evil.example` | 403 `not_available` |
| `{"owner":true,"emailHash":"deadbeef"}` | 400 `invalid_sign_in` |
| door open + `SWANGUARD_BIND_HOST=0.0.0.0` | exit 1, refuses to boot |
| door open + loopback bind | listening on `127.0.0.1` only (netstat) |
| forged `x-swanguard-peer: remote` over a real loopback socket | overwritten; 201 (real HTTP server test) |
| api / web / scripts suites | 561 / 406 / 154 pass, 0 fail |
| type-check | exit 0, 5 workspaces |
| secret scan | 0 findings |

Round-1 fixes broke three existing tests. The **causes** were fixed, not the assertions:
`server.test.ts` blocked a port on `0.0.0.0` that no longer collides with a loopback
server, and `dev-backend-mode.test.mjs` asserted the old wide bind.

---

## 4. Knowingly unfixed — argue with these

1. **`{emailHash: <owner hash>}` still grants owner** with the door flag off. Only the
   credential changed (random, outside the repo, never printed). The reasoning: the hash IS
   the owner identity, so the member path honouring it is the mechanism, not a bug. Is that
   defensible, or should the owner hash be refused on the `{emailHash}` path entirely?
2. **`trustLevel` is still `new` on an owner session.** Pinned by test so a change is a
   decision rather than drift. What actually breaks first?
3. **Mixed line endings still hard-throw** (flash F5). The heal covers pure-LF and pure-CRLF
   only. No `.gitattributes` was added — deliberately, because renormalizing 29 files would
   rewrite the very content the checksums protect, on a live database. Right call or not?
4. **Dual identity.** The live DB now holds a `member` (pre-existing demo user) and the
   door's `owner` as separate rows. Nothing was deleted (destructive, owner's call).
5. **Env-var names still in error text** after locality + Host/Origin pass. Argument: only
   the person at the keyboard can reach those, and they are the one who needs the hint.
6. **Real-browser DOM still unproven** — the shared Playwright browser was locked for the
   entire session. jsdom render+click, a default-prop test under a Vite env, and a bundle
   assertion stand in.

---

## 5. Your remit

Findings only. Each: **severity**, exact **file:line or claim**, a **concrete failure
scenario** (inputs → wrong outcome), and a **fix**. End with one verdict: **APPROVE /
REVISE / REJECT**.

Attack specifically:
- `hostnameOf` and `isLocalBrowserContext`. IPv6 forms, `127.0.0.1.evil.com`, a Host with
  userinfo, duplicate Host headers, an absent Host on HTTP/2, `Origin: null` (sandboxed
  iframe — currently treated as a string, not absent). Can a hostile page reach the door?
- The socket stamp. Is there any path into `app.handle` that does NOT go through
  `createFetchRequest` — another entrypoint, a test harness, a future proxy — where absence
  now means something different than intended?
- `isLoopbackHost` rejects `localhost` for the BIND host but `LOCAL_HOSTNAMES` accepts
  `localhost` for the Host header. Deliberate asymmetry or a bug?
- Executing normalized SQL: does converting CRLF→LF inside a migration change any statement
  semantics, or corrupt intended `\r\n` data?
- `recordReconciliation` swallows its own errors by design. Does that hide anything worse?
- Does `nodeEnvExplicit` have a false-negative path — a launcher or CI that sets NODE_ENV
  in a way that reads as unset?
