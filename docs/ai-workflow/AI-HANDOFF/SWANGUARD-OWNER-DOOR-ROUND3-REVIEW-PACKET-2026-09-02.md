# SwanGuard owner door — ROUND 3 hostile review packet

**Commit:** `3822c7b` · **Repo:** SwanGuard-Newsroom · **Date:** 2026-09-02
**Round 1:** REJECT / REVISE · **Round 2:** REVISE / REVISE
**Remit:** decide whether round 2 is closed, and break what round 3 introduced.

---

## 0. Standing instruction

Do not confirm that fixes look reasonable. Assume the author is still wrong. Round 2 found
a live CRITICAL that round 1 rated MEDIUM, so severity drift in your own direction is
expected and welcome.

**Two round-2 findings were checked and NOT applied**, because both seats were wrong the
same way: F2-3 / F5 claimed `recordReconciliation` writes to a table created by a future
migration and therefore records nothing. It creates the table inline with
`CREATE TABLE IF NOT EXISTS` in the same transaction. Both seats agreed because the packet
omitted the function body — a packet defect, not a code defect. Its body is included below
so you can judge it properly this time.

**Round-2's live CRITICAL, confirmed and fixed:** rotating the owner hash revoked nothing,
because the generic upsert returns the STORED role. The first hash this project shipped was
`sha256("swanguard-local-owner")` — published in a launcher comment and in a review packet
— and it had already been seeded as owner into the live database.

---

## 1. The door as committed

```ts
function requireOwnerDoor(config: ApiConfig, request: Request): string {
  // POST only, asserted HERE and not just at the route. A future owner-gated GET would be
  // reachable by top-level navigation from a hostile page, where the browser omits Origin
  // and the socket is genuinely the owner's own loopback.
  if (request.method !== 'POST') throw new HttpError(403, 'not_available', 'Not available');

  const local = request.headers.get(PEER_HEADER) === 'loopback';
  if (!local || wasRelayed(request)) throw new HttpError(403, 'not_available', 'Not available');

  // Loopback alone is NOT enough against DNS rebinding: a page on evil.com whose name has
  // been re-pointed at 127.0.0.1 reaches this handler over a genuinely local socket, and its
  // script can then read the owner session out of the response. The Host and Origin the
  // browser reports are what distinguish "the owner's own tab" from "a hostile page aimed
  // at the owner's loopback".
  if (!isLocalBrowserContext(config, request)) throw new HttpError(403, 'not_available', 'Not available');

  // A per-boot secret readable only from this user's own profile. Loopback proves the packet
  // came from THIS MACHINE, never from this USER: another local account, a service, or an
  // ordinary loopback reverse proxy (0.0.0.0:443 -> 127.0.0.1, changeOrigin) all present a
  // genuinely local socket with a rewritten Host. Header sniffing cannot see that; a secret
  // the relaying party cannot read can.
  if (!config.ownerDoorToken) throw new HttpError(403, 'not_available', 'Not available');
  if (!timingSafeEquals(readDoorToken(request), config.ownerDoorToken)) {
    throw new HttpError(403, 'not_available', 'Not available');
  }

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

function isLocalBrowserContext(config: ApiConfig, request: Request): boolean {
  const host = request.headers.get('host');
  if (!host || !LOCAL_HOSTNAMES.has(hostnameOf(host))) return false;

  const origin = request.headers.get('origin');
  if (origin === null) return true; // curl / same-origin non-CORS POST from the app itself

  // An ALLOWLIST, not "any loopback origin". Accepting every local origin trusted every
  // other process on the machine that can open a listener - a page served from
  // 127.0.0.1:8080 by an unrelated dev server, or by a hostile postinstall, passed.
  //
  // It is not plain same-origin either: Vite serves the app on its own port and proxies to
  // the API with changeOrigin, so the browser's Origin legitimately never equals the API's
  // Host. Same-origin here would refuse the real app while admitting nothing extra.
  try {
    const originHost = new URL(origin).host.toLowerCase();
    if (originHost === host.trim().toLowerCase()) return true;
    return config.ownerDoorOrigins.includes(originHost);
  } catch {
    return false;
  }
}

function readDoorToken(request: Request): string {
  return request.headers.get('x-swanguard-owner-door') ?? '';
}

function timingSafeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) {
    timingSafeEqual(right, right);
    return false;
  }
  return timingSafeEqual(left, right);
}

function wasRelayed(request: Request): boolean {
  return RELAY_HEADERS.some((name) => request.headers.get(name) !== null);
}

function hostnameOf(value: string): string {
  // Strip a port without tripping over IPv6 brackets.
  // A trailing dot is a legitimate absolute FQDN ('localhost.') that resolves to
  // loopback; without stripping it the owner is locked out by one keystroke. A
  // trailing colon ('127.0.0.1:') matches neither regex branch, so drop that too.
  const trimmed = value.trim().toLowerCase().replace(/:$/, '').replace(/\.$/, '');
  const match = trimmed.match(/^(\[[^\]]+\]|[^:]+)(?::\d+)?$/);
  return match ? match[1] : trimmed;
}

const RELAY_HEADERS = ['forwarded', 'via', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip'];

function hostnameOf(value: string): string {
  // Strip a port without tripping over IPv6 brackets.

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

```

## 2. Revocation (the round-2 CRITICAL)
```ts
  async function findOrCreateUser(emailHash: string): Promise<UserRecord> {
    if (options.ownerEmailHash === emailHash) return findOrCreateOwner(emailHash);

    // `role` is DEMOTED here, not merely left alone. The upsert returns the STORED role, so
    // a row seeded as owner under a previously-configured hash kept role=owner forever:
    // rotating SWANGUARD_OWNER_EMAIL_HASH changed which hash the door uses and revoked
    // nothing. The first hash this project shipped was a sha256 of a fixed literal printed
    // in a launcher comment, so "the old one still works" was a live, published credential.
    // Any owner row reached by a hash that is NOT the configured owner is demoted on sight.
    const result = await db.query<UserRow>(
      `
      insert into users (email_hash)
      values ($1)
      on conflict (email_hash) do update
        set email_hash = excluded.email_hash,
            role = case when users.role = 'owner' then 'member' else users.role end,
            updated_at = now()
      returning id, email_hash, household_id, privacy_mode, role, trust_level, created_at
      `,
      [emailHash]
    );

    return mapUserRow(requireSingleRow(result.rows, 'User could not be loaded'));
  }
```

## 3. recordReconciliation — the body both seats guessed at
```js
export async function recordReconciliation(client, versions, output = console) {
  try {
    await client.query(`
      create table if not exists schema_migration_reconciliations (
        id bigserial primary key,
        version text not null,
        reconciled_at timestamptz not null default now(),
        reason text not null
      );
    `);
    for (const version of versions) {
      await client.query(
        'insert into schema_migration_reconciliations (version, reason) values ($1, $2)',
        [version, 'line-ending-only checksum rendering; content proven identical after normalization']
      );
    }
  } catch (error) {
    output.info(`[postgres-migrate] WARNING: heal recorded on stdout only - audit write failed: ${error.message}`);
  }
}
```

---

## 4. Round 2 → what changed

| R2 | Finding | Action | Behaviour or test? |
|---|---|---|---|
| 5.3 F2-4B | **CRITICAL (live)** rotating the hash revoked nothing | both stores demote an owner row whose hash is not the configured owner, in the upsert itself | behaviour |
| 5.3 F2-1 | Origin check accepted *any* loopback origin | allowlist of the app's own dev origin. **Not** plain same-origin: Vite proxies with `changeOrigin`, so Origin never equals Host and same-origin would refuse the real app. Verified against the proxy config | behaviour, deviating from the proposed fix |
| 5.3 F2-2 / flash F1 | loopback proxy launders the stamp; boundary is the machine, not the user | per-boot door secret, constant-time compare, generated by the launcher, passed to the browser via Vite. Plus relay-header rejection | behaviour |
| flash F4 / 5.3 F2-5 | line-ending-only edit inside a literal → identical checksum → migration SKIPPED, edit never lands | bare CR refused at parse time + `qa:migration-literals` | behaviour |
| 5.3 F2-6 | the door itself was unaudited | `auth.owner_door.granted` per grant, with host/origin/peer and never the token or hash | behaviour |
| flash F8 | header string hardcoded, not `PEER_HEADER` | imported — and moved to a leaf module, because importing it from `server.ts` created the cycle authRoutes→server→runtime→app→authRoutes | behaviour |
| flash F2 | non-POST reachable if a future route calls the gate | POST enforced inside the gate | behaviour |
| flash F7 | `::ffff:127.0.0.1` false, `localhost.` locks owner out | both normalized | behaviour |
| flash F5 / both | mixed line endings | `.gitattributes` LF for **new** migrations; historical 29 deliberately NOT renormalized | partial, argued |
| 5.3 F2-3 / flash F5 | audit table "never created" | **not applied — claim was false**, see §0 | n/a |
| 5.3 F2-10 | env-var oracle after locality | unchanged; still argued in §6 | not applied |

---

## 5. Verification (live, this commit)

| Probe | Result |
|---|---|
| correct token + app origin | **201** |
| no token (another local account) | **403** |
| wrong token | **403** |
| foreign local origin `127.0.0.1:8080` | **403** |
| `x-forwarded-for` present | **403** |
| `via` present | **403** |
| hostile `Host` | **403** |
| curl, no Origin, correct token | **201** |
| LAN `192.168.x` / tailnet `100.x` | **CONNECTION REFUSED** |
| suites | api 580, web 406, scripts 158, 0 fail |
| type-check | exit 0 |
| secret scan | 0 findings |

---

## 6. Knowingly unresolved — argue

1. **The door secret reaches the browser through Vite (`VITE_*`), so it is in the served
   JS.** Any local process that can fetch `127.0.0.1:5187` can read it. It defends against
   a relaying proxy and a foreign origin, not against a local process that scrapes the
   bundle. Is that worth the mechanism, or is it security theatre?
2. **`origin === null → true`** still admits curl. Required for the non-browser path.
3. **Env-var names in post-locality error bodies.** Reachable only after loopback + Host +
   Origin + token all pass — i.e. by the operator. Still an oracle?
4. **Historical migrations not renormalized.** New ones are pinned LF.
5. **`trustLevel: 'new'` on owner** — still test-pinned, unchanged.
6. **Dual identity rows.** Nothing deleted; demote-on-read now handles the stale owner.
7. **Real-browser DOM still unproven** — the shared Playwright browser has been locked all session.

---

## 7. Remit

Findings only: **severity**, **file:line or claim**, **concrete failure scenario**, **fix**.
One verdict line: **APPROVE / REVISE / REJECT**.

Attack specifically:
- The token. Is constant-time compare correct here (`timingSafeEqual` on differing lengths)?
  Can it be replayed, or read by anything that should not have it?
- `wasRelayed` — a proxy that strips its own headers passes. Does the token actually save it?
- Demote-on-read: any path that reaches an owner row WITHOUT going through
  `findOrCreateUser` (session resume, passkey login, invite consume) and therefore keeps a
  stale owner alive?
- The audit write happens BEFORE `createSessionResponse`. If session creation then fails,
  the log records a grant that never happened. Which way should that fail?
- `.gitattributes` `*.sql text eol=lf`: what happens on the NEXT checkout to the 29
  historical files, and does the heal cover it?
