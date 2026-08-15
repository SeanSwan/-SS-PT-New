# SESSION HANDOFF — SwanGuard deploy work + SS-PT shared-tree git lock (2026-08-14)

**Author:** vs-claude (`claude-opus-5`), Fable-tier.
**Two separate repos were touched. Do not confuse them.**
**Your first job is a hostile review of everything below.** See §7 — it is mandatory,
it comes before new work, and you run it with Kimi K3 and HY3.

---

## 0. TL;DR — state at handoff

| Thing | State |
|---|---|
| SwanGuard TASK A (single-origin web deploy) | **DONE, pushed, verified from a fresh clone** |
| SwanGuard API bundle boot defect | **FOUND + FIXED** — it could never have started in production |
| SwanGuard TASK C (Render deploy) | **BLOCKED ON SEAN** — dashboard work |
| SwanGuard TASK B (production sign-in) | **NOT STARTED** — provider decided, architecture blocker documented |
| SS-PT shared-tree git lock | **CLEARED 3×** — recurring, root cause understood, structural fix proposed |
| SS-PT Hermes durable corpus | **COMMITTED** — 16 packets that had been stranded up to a fortnight |
| Anything pushed in SS-PT | **NO** — branch has no upstream; that is Sean's call |

---

## 1. Repo A — SwanGuard (`https://github.com/SeanSwan/SwanGuard`)

Separate greenfield repo. **Not** SwanStudios. Inherits SwanStudios engineering
discipline only, per its own `CLAUDE.md`/`AGENTS.md`.

- **Branch:** `security/p0-remediation-20260813`
- **Local worktree:** `C:/tmp/swanguard-civic-release-20260813` (clean, 0 dirty, in sync)
- **Remote HEAD:** `869c86d` — local and origin at `0 0`
- **Baseline:** **868 pass / 0 fail**, `type-check` exit 0, `build` exit 0.
  Verified from a **fresh clone** of the pushed branch, not just the worktree.

### What I shipped

**`1a2fa89` — TASK A + a boot fix**

`apps/web` could not be deployed. It is now served by the API process itself from a
**single origin**. That is a security decision, not packaging convenience — four
independent mechanisms make this API same-origin by design:

| Mechanism | Location |
|---|---|
| `cross-origin-resource-policy: same-origin` | `packages/domain/src/httpHardening.ts:12` |
| `content-security-policy: default-src 'none'` | same file, line 10 |
| `sameSite: 'Strict'` on session **and** CSRF cookies | `apps/api/src/requestAuth.ts:20,29` |
| No CORS anywhere (`grep -rn "access-control" apps/api` → 0) | — |

A split origin would force CORS **plus** `SameSite=None` onto an app holding
household and civic data.

**The client needed no change at all.** With no `VITE_SWANGUARD_API_BASE_URL` set,
`resolveBackendBaseUrl` returns `undefined` and `toApiUrl` emits a bare relative
path (`apps/web/src/api/apiRuntimeConfig.ts:40,51`). The `isLocalHost` allowlist at
line 74 is **UNCHANGED** and still refuses every remote origin. **Do not widen it.**

New: `apps/api/src/staticSite.ts` (read its BLUEPRINT header) — extension allowlist
(source maps 404), two independent traversal defences, `/api/*` never shadowed,
immutable caching only for hashed `/assets/*`, `no-cache` for `index.html` and
`sw.js`, and a **document-scoped** CSP (`script-src 'self'`, no `unsafe-inline`, no
`unsafe-eval`). The API's `default-src 'none'` is untouched — `httpHardening.secure()`
only fills in headers that are *absent*. Opt-in via `SWANGUARD_WEB_STATIC_ROOT`;
unset ⇒ API-only, unchanged. Refuses to start if that root has no `index.html`.

**The separate stop-ship defect:** the API built with `esbuild --packages=external`,
which externalizes *every* bare import — including `@family-first/domain` and
`@family-first/contracts`, both TypeScript-source-only (`main: src/index.ts`,
`noEmit: true`, no `dist`). So `node apps/api/dist/server.js` — the `render.yaml`
startCommand — died at boot with `ERR_UNKNOWN_FILE_EXTENSION ".ts"`. **The API had
never been able to start in production.** Invisible because the service was never
deployed. Now `--external:pg`. **Only real npm deps may be external; workspace
packages must be bundled.**

**`869c86d`** — rewrote `docs/HANDOFF-SWANGUARD-DEPLOY-BLOCKERS.md`. **That document
is authoritative for SwanGuard.** Read it before touching that repo.

### Test delta 848 → 868

| Class | Count | Detail |
|---|---|---|
| Added | +20 | 14 `staticSite.test.ts`, 5 `apiRuntimeSameOrigin.test.ts`, 1 bundling guard |
| Re-anchored | 1 | `dev-backend-mode.test.mjs` pinned the exact esbuild string **including the broken flag** — a test defending a defect |
| Removed | 0 | — |

**5 of the 20 are guard tests that pass with or without the fix.** They pin
already-correct behaviour. Do not read them as evidence of my change.

### What remains — priority C → B

**TASK C — Sean's Render dashboard**, then you verify and paste real responses:
create the Blueprint from `render.yaml` on this branch, set
`SWANGUARD_OWNER_EMAIL_HASH`, confirm `SWANGUARD_TRUSTED_PROXY_HOPS` matches the
real proxy count (**never higher** — each extra hop is one more spoofable position
in `x-forwarded-for`). Verify `/api/health` 200, `/api/readiness` 200 with
`checks.database: "ok"`, `GET /` 200 `text/html`, `GET /api/nope` 404
`application/json`. Confirm migration `0021` ran.

**TASK B — production sign-in.** All three paths are closed:
`dev-sign-in` 403 (`authRoutes.ts:79`), `magic-link-intents` 503
(`authRoutes.ts:106`), `passkeys` 404 (`passkeyRoutes.ts:34`). **The passkey closure
is CORRECT and must stay** — that login verified no WebAuthn signature.

- **Provider DECIDED by Sean:** **Namecheap Private Email over SMTP**. He hosts the
  SwanStudios domain and mailbox there. **Verify the SMTP host/port against
  Namecheap's current docs — I did not confirm them and did not present them as fact.**
- **Architectural blocker:** `POST /api/auth/magic-link-intents` accepts
  **`{ emailHash }`** — the server never sees a raw address, and **you cannot email a
  hash.** The contract must take the raw address, hash it immediately for
  lookup/storage, and hold the raw value **in memory only** for the send. Never
  logged, persisted, or audited.
- **Two more landmines:** the dev response returns the token in the body
  (`devTokenPreview`, ~line 118) — a full bypass if it ever ships to production;
  and `/api/auth/magic-link-intents` is **missing from `AUTH_ATTEMPT_PATHS`**
  (`httpHardening.ts:55`), making the send endpoint an unmetered mail cannon.
- Scaffolding exists: `MagicLinkIntentRecord` (`auth.ts:51`) stores `tokenHash`,
  `expiresAt`, `consumedAt`.
- **nodemailer would be a new runtime dependency** — needs Sean's approval, and per
  the build rule it must then get an `--external:` entry. Alternative: a small
  in-repo SMTP client (more code, zero supply-chain surface).
- **SPF/DKIM/DMARC** must be verified or links land in spam. Sean has a known
  outstanding DMARC task.
- No user enumeration: identical status/body/timing for known and unknown identifiers.

### Known residual risk (reported, not fixed)

- `staticSite.ts` path containment is lexical (`resolve`), not `realpath`. A symlink
  planted inside the build output could escape — presupposes an attacker who already
  has write access to `dist`.
- Web build emits a single ~591 kB JS chunk (non-blocking Vite warning).

---

## 2. Repo B — SS-PT (SwanStudios), the shared-tree git lock

**This is the one that was hurting the whole fleet.**

Every index-writing git command in the SS-PT working tree had failed since **02:18**
— for *all* agents, not one. Cause: an orphaned `.git/index.lock` (0 bytes). Sean
experienced it as agents stuck on "pull locked or push".

**Nobody detected it for nine hours** because each agent saw only its own failed
commit and treated it as a local problem.

Collateral: the Hermes durable learning corpus — **16 packets, oldest 2026-07-28** —
was sitting **untracked**. A corpus defined as durable and compounding existed on one
machine, uncommitted.

Also found and killed: a hung `git credential-manager store` (PID 26272) blocked on
stdin since 01:54.

### Commits (SS-PT, branch `wip/comms-notifications-2026-07-05`)

| Commit | Contents |
|---|---|
| `b57d21d76` | 16 Hermes packets, 1,796 insertions |
| `777b8f6eb` | Incident + 3-model panel record |
| `c4a3d938a` | Durable learning packet |
| `6c21a71e1` | Added the `## Mistakes I made` section the gate caught missing |

### The procedure that worked (reuse it — the lock recurs)

1. Snapshot `.git/index` → `/c/tmp/git-index-backup-20260814/index.bak` (1.6 MB).
2. **Exclusive-open probe** to prove no live owner (no extra tooling needed):
   ```powershell
   try { $f=[IO.File]::Open('.git\index.lock','Open','ReadWrite','None'); $f.Close(); 'ORPHANED' }
   catch { 'HELD OPEN - do not touch' }
   ```
3. Re-check mtime at the moment of action.
4. **Move** the lock aside, do not delete — keeps it recoverable.
5. Verify: `fsck` clean, `HEAD` unchanged, **0 files staged by anyone**.
6. Stage the one explicit directory, verify nothing outside it is staged, then
   `git commit -o -- <path>` (`--only` — race-proof against another agent staging
   mid-flight).

**NEVER in this tree:** `git reset`, `git stash`, `git checkout -- .`, `git add -A`,
bare `git commit -a`.

### Root cause — and it will happen again

**Git takes the index lock BEFORE it validates arguments.** A malformed command
strands the lock. I proved it the embarrassing way: `git commit -o -- <path> -F-`
(after `--` everything is a pathspec, so `-F-` was read as a filename) failed on
argument parsing *after* taking the lock, and orphaned a second one. Pass the
message with `-F <file>` **before** the `--`.

**I cleared a THIRD orphan at handoff time** (created 17:24 by another agent, 0
bytes, no live owner, verified and cleared the same way). Two agents orphaned locks
within hours of each other. **This is a recurring structural problem, not an
incident.**

---

## 3. The 3-model panel (already run — do not re-run for the same question)

Kimi K3 ($0.0760, **truncated at Q1 of 6**, `finish_reason: error`), HY3 ($0.0036,
complete), Gemini 3.1 Pro (subscription, complete). **Total $0.0796.**

Full record: `docs/ai-workflow/AI-HANDOFF/MULTI-AGENT-GIT-LOCK-PANEL-2026-08-14.md`

**Where they disagreed, and it mattered:**

- **Gemini recommended `git reset` before staging.** Kimi and HY3 both classed that
  as destructive to a concurrent agent's staged work. In a tree with several nonstop
  agents it is exactly the toe-stepping Sean asked to prevent. **Not run.**
- **HY3 caught a factual error in Gemini's port-to-`main` procedure** — it proposed
  `git restore --source=<branch>` for files that were **untracked** and therefore
  existed on no branch at all.
- **Kimi supplied the decisive internal:** git never edits `.git/index` in place; it
  writes the lock then atomically renames. A **0-byte** stale lock means the writer
  died before writing, so the real index was never at risk. And lock creation is
  `O_EXCL`, so no new owner can appear between the check and the removal.

**Lesson for you: the most fluent, most standard-sounding answer is the one to check
hardest.**

**Script bug found:** `scripts/consult-hy3-design.mjs` and `scripts/consult-kimi.mjs`
BOTH write to `docs/ai-workflow/AI-HANDOFF/KIMI-DESIGN-REVIEW.md`. Kimi silently
overwrote HY3's artifact. **Fix: give each consult script a model-named output path.**

---

## 4. Structural fix — unanimous across all three models

**One `git worktree` per agent**, sharing one `.git` object store:

```bash
git worktree add -b agent/<name>-<task> ../wt-<name>
```

Each worktree gets its **own index**, so `index.lock` contention disappears entirely.
Rejected: separate clones (heavy, slow to sync), lock-serialising service (band-aid).

**SwanGuard is already worked this way and had none of these problems today.** That
is the empirical argument, not a theoretical one.

---

## 5. Open items for Sean (do not silently action these)

1. **Adopt worktree-per-agent.** The real fix for agents colliding.
2. **SS-PT branch `wip/comms-notifications-2026-07-05` has NO upstream** and is
   **1,926 commits behind `main`** (111 ahead). The durable corpus is committed but
   has never been pushed — it exists on one machine. Panel's corrected
   recommendation (HY3): create a `main`-based worktree, copy the packet directory
   in, commit, PR. **Never merge/rebase this WIP branch into `main`.**
3. **Fix the consult-script output collision** (§3).
4. **Add a fleet-level lock check** to the lane tooling: flag a `.git/index.lock`
   older than ~10 min with no live owner, instead of letting every agent fail quietly
   for nine hours.
5. **SwanGuard TASK C** — Blueprint + `SWANGUARD_OWNER_EMAIL_HASH`.
6. **SwanGuard TASK B** — approve or reject nodemailer.

---

## 6. Standing working rules (Sean checks these)

1. **Proof before "done".** Never say fixed/done/working without, in the same
   message, the exact command and its real output.
2. A test you just wrote proves nothing until you have seen it **fail without your
   fix**. For defence-in-depth guards, disable each layer separately — a single-layer
   mutation can leave the suite green and teach you the wrong lesson (this happened
   to me; both traversal guards had to be disabled before the test failed).
3. **Test-delta disclosure:** added / re-anchored / removed, separately. Say which
   existing assertion you rewrote and why it was wrong.
4. **Hostile review until dry:** loop until a full pass finds nothing, then one
   confirming pass. Report the round count.
5. **Never weaken a control** to make something work — CSP, cookies, CORS, kill
   switches, module gates, durability refusals, the localhost allowlist. Stop and ask.
6. **Don't widen scope silently.** Report what you find; folding it in unannounced is
   the problem, not fixing it.
7. **Rule 45:** no `--amend`, rebase, or force-push without Sean. Follow-up commits only.
8. Closeout gates fire on every build-shaped turn: Hermes inbox memo (with a literal
   `## Mistakes I made` heading), dry-loop ledger, Linear sync, `PROOF:` line.

---

## 7. YOUR FIRST TASK — hostile review of my work (MANDATORY, before new work)

Sean's explicit instruction: **the next agent runs a hostile review of everything
above, with Kimi K3 and HY3, and participates in it directly.** I am deliberately
not the reviewer of my own work here.

### How to run it

```bash
node scripts/consult-kimi.mjs --document <your-review-brief> --remit "..." --cap-usd 1.00 --confirm-spend
node scripts/consult-hy3-design.mjs --document <your-review-brief> --remit "..." --cap-usd 0.60 --confirm-spend
```

**Two traps:** (a) both scripts write to the same output file — read/rename the first
result before running the second, or fix the scripts first; (b) `--cap-usd` is
compared against a **worst-case ceiling**, not expected cost. I set $0.60 and the
call was refused at a $0.91 ceiling; actual cost was $0.076. Cap from observed cost.

### What to attack — highest-value targets first

1. **`apps/api/src/staticSite.ts`** — the new attack surface. Path traversal
   (encoded, double-encoded, UNC, symlink), MIME confusion, cache-poisoning via the
   immutable header, SPA fallback leaking non-HTML routes, whether `/api/*` can be
   shadowed by any casing/encoding trick, whether the document CSP is
   over-permissive. **Note the known residual: containment is lexical, not `realpath`.**
2. **The claim that same-origin serving weakens nothing.** Verify the API's
   `default-src 'none'` really is intact on every JSON response, and that
   `httpHardening.secure()`'s "only if absent" behaviour cannot be abused to strip a
   header.
3. **The esbuild change** (`--packages=external` → `--external:pg`). Did bundling the
   workspace packages change any runtime behaviour? Is any other real npm dependency
   now incorrectly bundled? Does `preDeployCommand` still work?
4. **My re-anchored test** in `scripts/dev-backend-mode.test.mjs` — did I weaken it
   while "fixing" it?
5. **The 5 guard tests that pass without the fix** — are they actually meaningful, or
   decoration?
6. **The git-lock remediation.** Was moving the lock aside correct? Did committing 16
   files authored by *other agents* overstep? Should the third orphan have been left
   for its owner? Is `git commit -o --` genuinely race-proof?
7. **My biggest blind spot, by my own admission:** I did not detect the nine-hour
   outage — Sean did. Ask what *else* is silently broken fleet-wide that no single
   agent would notice.

### Then

- Reconcile Kimi's and HY3's findings against each other and against the code —
  **verify every claim locally before acting on it** (both models were wrong about
  things this session; so was Gemini, twice).
- Report **CONFIRMED / PLAUSIBLE / DISPROVEN** per finding with file:line evidence.
- Fix real defects; flag Sean-gated ones rather than fixing.
- Then proceed to SwanGuard TASK C → TASK B.

---

## 8. Where everything lives

| Artifact | Path |
|---|---|
| SwanGuard authoritative brief | `docs/HANDOFF-SWANGUARD-DEPLOY-BLOCKERS.md` (on the SwanGuard branch) |
| SwanGuard slice registry | `docs/11-slice-registry.md` §Phase 129 (same repo) |
| Git-lock panel record | `docs/ai-workflow/AI-HANDOFF/MULTI-AGENT-GIT-LOCK-PANEL-2026-08-14.md` |
| Learning packet (lock) | `docs/ai-workflow/hermes-learning-packets/20260814-a-failed-command-can-hold-the-lock-forever.md` |
| Learning packet (build) | `docs/ai-workflow/hermes-learning-packets/20260814-a-green-build-is-not-a-bootable-artifact.md` |
| Hermes inbox memos (gitignored) | `.ai-workflow/hermes-inbox/pending/20260814T180706Z-*`, `20260814T210347Z-*` |
| Index + lock backups | `/c/tmp/git-index-backup-20260814/` (`index.bak`, `index.lock.stale{,2,3}`) |
| SwanGuard worktree | `C:/tmp/swanguard-civic-release-20260813` |
| Fresh-clone verification | `C:/tmp/sg-verify-20260814` |

**Stale-doc warning:** older files in `AI-Village-Documentation/` describe a
*different* SwanGuard branch. One claims a durable `/api/civic/archive` service
exists — it does not. Verify with grep before trusting any audit doc.
