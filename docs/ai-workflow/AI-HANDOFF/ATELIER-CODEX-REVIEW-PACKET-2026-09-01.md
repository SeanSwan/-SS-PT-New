---
decision: "Consolidated Codex review packet for the Atelier video-poster slice and the eight backlog slices that followed. 21 commits. Written to be attacked, not admired."
status: open
supersedes: none
---

# Review packet — Atelier, `14b04c407..5b5558cdb`

**Branch** `feat/atelier-v2-compose` · worktree `c:/tmp/ss-atelier-v2` · pushed · not deployed
· **24 commits** · Linear **SWA-165**

Nine hostile rounds ran against the first slice with GLM 5.3 + Qwen 3.8 (records in
`panel-2026-08-27-atelier-video-poster/`). The eleven slices after it were reviewed **solo** —
the seats were out of tokens — which is exactly why this packet exists. **Treat the solo
slices as the least-reviewed code here.**

Everything below was falsified: each fix was neutered, its own test confirmed red, and the
file restored. Where that process itself went wrong, it says so.

---

## 0. If you only attack four things

1. **`keyOwnedByRow`** (§2) — a security predicate I got wrong **twice** before this version.
   It is the sole guard on four signing sites.
2. **`completeJob`** (§3) — a money/lease path, newly given dependency injection, with three
   behaviour changes. Its tests use fakes; **no Postgres has ever run them.**
3. **The 400 → 502 change** on an unauthenticated public endpoint (§5).
4. **The claim in §7 that `date_trunc` cannot be indexed** — I acted on it by deleting a
   migration. If I am wrong, a real performance fix was thrown away.

---

## 1. What the work was

The Assets library rendered every video as a grey box while its poster sat in storage.
`assetLibrary.mjs` skipped any row that was not an image; `videoRenderJobService.mjs:279`
writes `posterR2Key` onto the `MediaAsset` row for a finished clip.

Fixing that turned out to arm an existing hole, and the rest of the session followed from it.

---

## 2. The security core — `assetKeyOwnership.mjs`

**The exposure.** `POST /api/render-agents/jobs/:jobId/complete` (`renderAgentRoutes.mjs:176`)
does `const { r2Key, mime, ...meta } = req.body` and spreads `...meta` into `completeJob`,
which writes `posterR2Key` and `provenance` into `MediaAsset` defaults. **Nothing validated
them** — `verifyObject` checks that an object EXISTS at `r2Key`, never that a key is ours —
and `generateThumbnailUrl` presigns whatever key it is handed with no prefix restriction.

Inert before this slice, because non-image rows were never signed. **Signing video posters is
what would have armed it.**

```js
export function keyOwnedByRow(key, row) {
  if (typeof key !== 'string' || !key || !row) return false;
  const seg = key.split('/');
  if (seg.some((x) => !x || x === '.' || x === '..')) return false;

  if (seg.length >= 4 && seg[0] === 'atelier' && seg[1] === 'stills') {
    return row.ownerUserId !== null && row.ownerUserId !== undefined
      && seg[2] === String(row.ownerUserId);
  }
  if (seg.length >= 3 && seg[0] === 'jobs') {
    return row.jobId !== null && row.jobId !== undefined && seg[1] === String(row.jobId);
  }
  return false;
}
```

**I got this wrong twice.** v1 asked only "does the owner's id appear as SOME segment" — too
strict (a real video poster is `jobs/<jobId>/…` and carries no user id, so every legitimate
clip would have failed closed into the grey box the slice removes) **and** too loose
(`jobs/7/…` passed for owner 7 where that 7 is a *job* id). Both seats caught it
independently.

**Applied at four sites:** `assetPreviews.previewKeyFor`, `publishAsset.publishedReference`,
`publishAsset.resolvePublic` (**unauthenticated**), `motionBind.initImageReadTicket`.

### Attack these

- The two namespaces are the only ones this system writes — `persistStills.mjs:52`,
  `stillThumbnail.mjs:35`, `r2KeyForJob` (`videoRenderJobService.mjs:55`). **Is there a third
  I missed?** A writer using a different shape has its assets silently refused.
- `jobId` is a UUID and `ownerUserId` an integer, so they cannot collide. **Verify that
  holds** — if any deployment has integer job ids, `jobs/7/…` becomes reachable for owner 7.
- Segment equality is `String(row.x)`. Any coercion surprise?
- I refuse `.`/`..` segments. S3 keys are opaque and do not resolve them, so this is not
  traversal defence — is it therefore excluding a legitimate key shape for nothing?

---

## 3. `completeJob` — a money path with fakes for tests

Three defects in one `findOrCreate`, unfixable for two sessions because nothing there was
testable. `completeJob` now takes `jobModel` / `assetModel` / `db` through `options`.

- **(a)** `where: { r2Key }` → `where: { r2Key, ownerUserId: job.userId }`. It was finding
  and silently adopting other tenants' rows.
- **(b)** `defaults` are ignored on the found path, and the poster written twelve lines later
  belongs to `job.update` — the **job**, not the asset. Now backfilled, never overwritten.
- **(c)** the caller-supplied poster is validated with `keyOwnedByRow` and **dropped, not
  rejected** — a poster is an optimisation, and refusing the completion would trade a missing
  thumbnail for a lost render.
- **and** owner-scoping turns a collision into a UNIQUE-index throw
  (`ma_r2_key_live_uniq`), so that is named `409 KEY_COLLISION` rather than an unhandled 500.

### Attack these

- **The tests are fakes end to end.** They prove the logic this function applies; they do not
  prove Sequelize does what the fakes pretend. `findOrCreate` semantics under a partial unique
  index, inside a transaction, are exactly where a fake and reality diverge.
- Does adding `ownerUserId` to the lookup break the **idempotent replay** path? I reasoned it
  cannot — `job.userId` is stable across replays of the same job — but that is reasoning, not
  a test against a database.
- **(c) drops silently with a `logger.warn`.** Is silent-drop right, or should a caller
  declaring a foreign key be refused outright? I chose availability. Argue the other side.
- The collision catch keys on `err.name === 'SequelizeUniqueConstraintError'`. Fragile across
  Sequelize versions?

---

## 4. Signals — what the library is allowed to CLAIM

`previewsUnavailable` drives a page-wide banner: *"this is a preview-signing problem, not a
problem with your assets."* It now requires `attempted >= 2`.

- A sample of one cannot distinguish a purged object from a broken signer, so it asserts no
  cause; the log still speaks at every branch.
- **Round 3 reversed round 2 here**, and round 7 corrected the *reasoning*: presigning is a
  local HMAC (`@aws-sdk/s3-request-presigner`), so a purged object signs fine and 404s in the
  browser. Under today's signer a lone failure really is signer-side. The gate survives on the
  weaker ground that `readUrl` is an **injected seam** and the contract does not promise a
  signer never touches the object.
- A **partial** failure (some sign, some do not — e.g. a credential scoped to `atelier/*`
  passing stills and refusing clips) is logged but deliberately **not** bannered.

### Attack this

**Is the `attempted >= 2` gate justified at all?** If no conforming signer can fail
per-object, it costs a true signal in a rare shape and buys nothing. I kept it on a
contract argument. That is the weakest reasoning in this packet.

---

## 5. The unauthenticated endpoint

`GET /api/atelier/public/:id` — no auth by design. Two changes:

- **A ceiling**, 600/15min per IP. My first number was 120, reasoned from what *one reader*
  costs; fifty people behind one office NAT loading a six-image page is 300 legitimate
  requests on one `req.ip`. The test asserts the burst gets through, not just that the
  ceiling exists.
- **404 stopped meaning two things.** Every exception returned 404, so a rotated credential
  told the internet a published asset was GONE. Now 404 is the not-found predicate only;
  a downstream failure is 502 with a generic body.

### Attack these

- **Is 502-vs-404 an existence oracle?** I argue not: an unpublished asset still 404s through
  `resolvePublic` returning null, and only a caller already holding a valid UUIDv4 reaches
  the catch. Check that reasoning.
- 600/15min per IP is no defence against a distributed flood — stated in the code. Is a
  per-IP limiter on a public embed endpoint worth its availability cost at all?

---

## 6. Tooling — two things that had never worked

**`test-baseline-gate.mjs` had never given a correct answer.** Its parsers anchored on
literal text; vitest writes colour. Measured: raw → 0 files, null totals; stripped → 35
files, `{failed: 6, passed: 9904}`. It failed CLOSED, so nothing shipped — and that is why
nobody noticed. A gate stuck on FAIL is indistinguishable from a red suite.

**16 `node:test` suites were recorded as known-failures while passing 178/178**, run by no
automated path. They could never have left the baseline: the rot detector prunes entries that
start passing, and a file vitest cannot collect never starts passing.

Result: failing files **35 → 19**, baseline **23 → 7**, zero regressions, and the remainder
correctly classified as an install problem (`jose`, `sanitize-html` declared and absent).

### Attack these

- `parseMissingPackages` attributes a package to **every FAIL since the last error block**,
  because vitest groups suites. Does that over-claim on any reporter shape I have not seen?
  Over-claiming here **hides a real regression as "environment"** — the worst failure this
  code can have.
- Exit code 3 is new. Anything consuming this gate's exit status?
- The `.nodetest.mjs` convention rests on `*.test.mjs` not matching it. Subtle. The explicit
  vitest `exclude` is belt-and-braces — is it enough?

---

## 7. The claim I acted on by deleting code

I wrote a migration for the `MediaAsset` indexes, then deleted it.

`date_trunc(text, timestamptz)` is **STABLE** (TimeZone-dependent), so Postgres refuses it in
an index expression. Casting only the index (`created_at::timestamp`) creates cleanly and is
then **never used**, because `buildAssetQuery` emits bare `created_at`
(`assetLibrary.mjs:140`) and an expression index only serves a query written the same way.
An unused index costs writes and buys nothing.

**If this reasoning is wrong, I destroyed a real fix.** The module header and the handoff both
prescribed that index; I corrected both to say it cannot be created as written and that the
real change touches the cursor-comparison path on both sides at once — where a mismatch
silently drops the rows of a four-up Compose batch rather than erroring.

---

## 7b. Two slices added after this packet was first written

**`chargedUsdFor`** (`composeLimits.mjs`). The handoff asked for a `chargedUsd` parity gate.
A parity TEST is impossible — the only async lane is local, `unitUsd` is 0, both sides return
0 whatever they do, and the async site's own comment says "no test can redden on it". So the
gate is deleting the second copy. The rule lived in `composeStills` and `localBatchRunner`,
and the two had **already drifted**: sync multiplied `unitUsd` raw (NaN when unpriced, shipped
to the client as `null`), async coerced (0). Same rule, two answers, on the money path.

*Attack:* a bad input now returns 0. Is silently charging 0 right, or should an unpriced
batch refuse? I chose 0 because it is a claim we can defend and NaN is not.

**A log on `resolvePublic`'s refusal.** `keyOwnedByRow` refuses at four sites; three say why.
This one returned null and the route answered 404 — a permalink that worked yesterday simply
stops, indistinguishable from an unpublish, on the one path mounted without auth.

*Attack the residual risk it exposes, which I could not close:* `r2KeyForJob` is **called by
nothing in production** — only its own tests reference it. The agent supplies `r2Key` freely,
so `jobs/<jobId>/…` is a convention, not an enforced format. **If any historical video asset
carries a different shape, my guard now refuses to sign it.** Stills are provably fine (an
older `atelier/stills/<userId>/<ym>/<hash>` format passes, because the owner is checked
positionally at segment 2). Video needs the production database to confirm, and this
environment has none. **This is the single unquantified risk in the whole change.**

## 7c. The infrastructure slices — least reviewed, largest reach

Three slices are TOOLING rather than product, so a defect in them is silent by
construction: a broken detector reports nothing and reads as health.

**`test-baseline-gate.mjs` had never given a correct answer.** Its parsers anchored on
literal text; vitest writes ANSI. Measured: raw → 0 files and null totals; stripped → 35
files and `{failed: 6, passed: 9904}`. It failed CLOSED, which is why nobody noticed — a
gate stuck on FAIL is indistinguishable from a red suite, and this suite IS red.

**16 `node:test` suites were recorded as known-failures while passing 178/178**, executed
by no automated path. They could never have left the baseline: the rot detector prunes
entries that start passing, and a file vitest cannot collect never starts passing.

**Dependency drift (check 10) + `deps-restore.mjs`.** Worktrees share `node_modules` but
not `package.json`; a dep declared on a newer branch is invisible to an install run from
the checkout that owns the folder. Two findings, never merged: `missing` (broken now) and
`atRisk` (installed, declared here, absent from the owner's manifest — one `npm ci` from
vanishing). `origin/main` already declares both packages; the durable fix is an
operational branch move, not code.

### The infrastructure source, pasted WHOLE — this is the least-reviewed code here

`scripts/lib/dep-drift.mjs` (the classifier):

```js
export function classifyDeps({ declared = {}, isInstalled, ownerDeclared = null } = {}) {
  const names = Object.keys(declared).sort();
  const missing = [];
  const atRisk = [];

  for (const name of names) {
    const installed = isInstalled(name);
    if (!installed) {
      missing.push(name);
      continue;
    }
    // Only meaningful when the folder is SHARED. An unshared node_modules cannot be
    // reinstalled out from under this manifest, so nothing here is at risk — and
    // reporting it anyway would be the noise that gets a gate ignored.
    if (ownerDeclared && !ownerDeclared.has(name)) atRisk.push(name);
  }

  return { missing, atRisk };
}

/**
 * The finding text. Separated so a test can assert what an operator is actually told —
 * a detector that fires correctly and explains badly still costs someone an afternoon.
 *
 * Returns [] when there is nothing to say, so the caller can spread it unconditionally.
 */
export function describeDepDrift({ label, missing = [], atRisk = [], ownerPath = null } = {}) {
  const out = [];

  if (missing.length) {
    out.push(
      `${label}: ${missing.length} declared dependenc${missing.length === 1 ? 'y is' : 'ies are'} ` +
      `NOT INSTALLED — ${missing.join(', ')}. Files importing them cannot LOAD, and a test ` +
      'runner reports that as a failing file with zero tests, which reads exactly like an ' +
      'ordinary failure. Install before trusting any suite result.'
    );
  }

  if (atRisk.length) {
    out.push(
      `${label}: ${atRisk.length} package${atRisk.length === 1 ? '' : 's'} installed here ` +
      `but declared in NO manifest the owning checkout reads — ${atRisk.join(', ')}. ` +
      `node_modules is shared with ${ownerPath || 'another checkout'}, whose package.json ` +
      'predates them, so they exist only because someone installed them by hand. A clean ' +
      'install or `npm ci` there DELETES them and the affected suites silently stop ' +
      'loading. Durable fix: the owning checkout moves to a branch that declares them.'
    );
  }

  return out;
}
```

`scripts/hooks/drift-check-gate.mjs` (check 10 — the filesystem half):

```js
// ---- Check: declared dependencies vs the packages actually on disk ---------
//
// 2026-09-01: twelve backend suites — four of them security probes — had NEVER executed
// here, because `jose` and `sanitize-html` were declared and not installed. A file that
// cannot load is reported by the runner as a failing FILE with zero tests, which reads
// exactly like an ordinary failure. Nothing said "install something".
//
// The cause is structural and outlives today's fix: worktrees share `node_modules` but
// not `package.json`. Installing the packages left them declared in NO manifest the
// OWNING checkout reads, so the next clean install there deletes them and the suites go
// quiet again. That second state is the dangerous one, and it is what `atRisk` names.
//
// Reasoning lives in scripts/lib/dep-drift.mjs; the filesystem work is here, because it
// is the part that must fail open.
try {
  const readJson = (f) => { const t = read(f); if (!t) return null; try { return JSON.parse(t); } catch { return null; } };

  // Resolve the way Node does: this directory, then each parent. Without the walk a
  // hoisted dependency reads as missing, and a detector with false positives is one
  // nobody reads.
  const resolvesFrom = (startDir, name) => {
    let dir = startDir;
    for (let i = 0; i < 6; i += 1) {
      if (existsSync(join(dir, 'node_modules', name, 'package.json'))) return true;
      const up = dirname(dir);
      if (up === dir) break;
      dir = up;
    }
    return false;
  };

  // When node_modules is a symlink, the checkout it points into owns the folder — and
  // its manifest is the one a clean install would obey.
  const ownerManifestFor = (dir) => {
    const nm = join(dir, 'node_modules');
    try {
      if (!existsSync(nm) || !lstatSync(nm).isSymbolicLink()) return null;
      const ownerDir = dirname(realpathSync(nm));
      if (resolve(ownerDir) === resolve(dir)) return null;
      const pkg = readJson(join(ownerDir, 'package.json'));
      if (!pkg) return null;
      return { ownerDir, names: new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]) };
    } catch { return null; }
  };

  for (const rel of ['backend', 'frontend', '.']) {
    const dir = resolve(SS_PT, rel);
    const pkg = readJson(join(dir, 'package.json'));
    if (!pkg) continue;
    // devDependencies included on purpose: a missing test-only package is exactly how
    // this failed, and it is the class least likely to be noticed in production.
    const declared = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (!Object.keys(declared).length) continue;

    const owner = ownerManifestFor(dir);
    const { missing, atRisk } = classifyDeps({
      declared,
      isInstalled: (name) => resolvesFrom(dir, name),
      ownerDeclared: owner ? owner.names : null,
    });
    findings.push(...describeDepDrift({
      label: rel === '.' ? 'repo root' : rel,
      missing, atRisk,
      ownerPath: owner ? owner.ownerDir : null,
    }));
  }
} catch { /* fail-open — a drift detector must never be the thing that breaks a session */ }
```

`scripts/deps-restore.mjs` (the decision helpers; the npm call is untested by choice):

```js
export function resolvesFrom(startDir, name) {
  let dir = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'node_modules', name, 'package.json'))) return true;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return false;
}

export function ownerOf(dir) {
  const nm = join(dir, 'node_modules');
  try {
    if (!existsSync(nm) || !lstatSync(nm).isSymbolicLink()) return null;
    const ownerDir = dirname(realpathSync(nm));
    return resolve(ownerDir) === resolve(dir) ? null : ownerDir;
  } catch { return null; }
}

/**
 * Prefer the version the lockfile pins over the range the manifest allows.
 *
 * A range would let npm resolve something newer than the tree was tested against, on a
 * folder shared with every other worktree — a silent upgrade for everybody, arriving
 * through a repair script. Exact or nothing.
 */
export function pinnedVersion(dir, name, declaredRange) {
  const lock = readJson(join(dir, 'package-lock.json'));
  const entry = lock?.packages?.[`node_modules/${name}`];
  return entry?.version ? `${name}@${entry.version}` : `${name}@${declaredRange}`;
}

/**
 * ONLY WHEN RUN DIRECTLY. The helpers above are imported by a test, and everything below
 * spawns npm. Without this guard, importing `resolvesFrom` would start installing packages
 * into a folder shared with every other worktree — the exact class of accident this file
 * exists to prevent. Third time this trap has appeared today; the push gate and the
 * node:test runner both had it, and I only caught this one because the test I was writing
 * to prove the script printed "restored 0 packages" while merely being imported.
 */
const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
```

### Attack these hardest

- **`parseMissingPackages` attributes a package to EVERY `FAIL` since the last error
  block**, because vitest groups suites. Over-claiming here **hides a real regression as
  "environment"** — the worst failure this code can have. Is there a reporter shape where
  it over-claims?
- **The `.nodetest.mjs` convention rests on `*.test.mjs` not matching it.** Subtle. Is the
  explicit vitest `exclude` sufficient, and does the drift test really catch a new
  `node:test` file named wrongly?
- **Check 10 walks 6 parent levels to resolve.** Too few for a deep worktree? Too many, so
  it finds an unrelated package?
- **`deps-restore` never simulates its own `npm install`** — deliberately, since that
  means deleting packages from a folder three live agents share. Is the untested half the
  half that matters?
- **All three run at session start or on demand and are FAIL-OPEN by design.** Argue that
  contract is wrong, if you think it is: it means none of them can ever stop a bad state
  from being used, only describe it.

## 8. Verification

| | |
|---|---|
| Backend, atelier + touched suites | **626/626 across 45** |
| Frontend studio | **142/142 across 15** |
| `node --test` (previously invisible) | **178/178, exit 0** |
| Full backend | **9923 passed / 6 failed** — the same six |
| Baseline gate | exit 3, **zero regressions**, 12 files named as install |
| Guards | line cap, frontend guards, token registry, secret scan — clean |

**Every fix falsified.** Two files remain over the 300-line cap and are named as deferrals
with reasons (`videoRenderJobService` 466, `rateLimiter` 357) — both were over before this
work.

---

## 9. Where I know I am weak

- **§3's tests never touch a database.** That is the largest gap in the packet.
- **§4's gate** rests on a contract argument, not an observed failure mode.
- **Six slices had no second reader.** The nine-round record shows what a second reader found
  on the one slice that had one: two security misclassifications and a guard wrong in both
  directions. Assume the solo slices contain the same density and have not been found.
- **Qwen produced two fabricated P0s** in nine rounds (a pagination claim contradicted by the
  paste it was given; an "attacker sets `row.jobId`" claim contradicted by `jobId: job.id`).
  Its verdicts carry no information in either direction — **only its reasoning is worth
  tracing**, and the same caution applies to mine.
- **Six of the seats' findings across nine rounds were artifacts of what I failed to paste**,
  not defects. If something here looks missing, check whether this document simply omitted it
  before concluding the code is wrong.

## 10. My own mistakes this session, as a prior on where to look

A neuter that silently no-opped and I read it as proof (no assert on the match count; two
`SequelizeUniqueConstraintError` handlers in one file, I hit the wrong one) · sanitising one
half of a pair inside the fix for a pair defect · an exemption list I built that rotted within
the hour, first bad entry mine, because a *reason* makes an exemption reviewable but not true
· a detection heuristic that would have deleted two working suites · `node --check` passing a
file where `logger` was undefined · nearly importing two scripts that spawn test runs at
top level.

**The pattern: I am reliably wrong in the direction of trusting a proxy for the thing itself**
— a name, an import, a count, a comment. Attack the places where this code believes a label.
