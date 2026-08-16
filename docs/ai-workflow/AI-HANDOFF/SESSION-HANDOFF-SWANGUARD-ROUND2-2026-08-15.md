# SESSION HANDOFF — SwanGuard pre-ship hardening (2026-08-15)

**Author:** vs-claude (`claude-opus-5`), Fable-tier.
**Supersedes** `SESSION-HANDOFF-SWANGUARD-AND-GIT-LOCK-2026-08-14.md`, whose §7
review task is COMPLETE and whose git root-cause section is WRONG (corrected in §3).

**Two repos. Do not conflate them.**
**Your first job is §5 — a Kimi K3 + GLM-5.3 hostile review and hostile security
review of everything below, then fix until dry.** Then §6 (deploy).

---

## 1. Where this started

SwanGuard is a **separate greenfield repo** (`github.com/SeanSwan/SwanGuard`),
NOT SwanStudios. It holds household and civic data. It inherits SwanStudios
engineering discipline only, per its own `CLAUDE.md`.

Two sessions ago it had: a web app that could not be deployed, an API bundle that
**could never have started in production**, and no working sign-in. A previous
agent fixed the deploy shape (TASK A) and handed off asking the next agent to
hostile-review its work with Kimi K3 and HY3.

**That review happened. It found three live defects. Reviewing the FIXES then
found five more.** That is the through-line of this session: every review round
of freshly-changed code found more than the round before it.

---

## 2. Where we are now — Repo A, SwanGuard

- **Branch:** `security/p0-remediation-20260813`
- **Worktree:** `C:/tmp/swanguard-civic-release-20260813` — clean, `0 0` with origin
- **HEAD = `ee63b1c`, pushed and verified from the remote ref**
- **Baseline: 888 pass / 0 fail**, `tsc` exit 0, `esbuild` clean —
  verified from a **fresh clone** (`/c/tmp/sg-verify6`) with independent `npm ci`
- **Nothing has ever run in production.** That is the single most important fact
  for your review.

### Commits this session (all mine, all pushed)

| Commit | What |
|---|---|
| `a84f9a7` | link escape out of the served root; year-long cache on unhashed files; boot check that passed on a *directory* named index.html |
| `ea404ed` | rate limiter trusted `x-real-ip` (caller-supplied) — a **bypass at the production setting**; production boot guard on `SWANGUARD_TRUSTED_PROXY_HOPS` |
| `9b20fb4` | global sign-in kill switch; IPv6 /64 bypass; `unknown` chain entries; symlink-deploy regression I introduced; empty-shell boot |
| `ee63b1c` | fixed enum startup reason codes (`STARTUP_E_*`) |

### What each defect actually was (all reproduced live before fixing)

1. **Link escape.** Containment was lexical only. A junction at
   `dist/assets/out` returned `200 image/png`, `immutable`, with the bytes of a
   file **outside the root** — the extension allowlist keys on the REQUESTED
   name, so the target needs no extension and its MIME type is whatever the
   request claimed. Now: realpath re-check + non-regular files refused.
2. **`immutable` by directory convention.** `/assets/version.json` was served
   `max-age=31536000, immutable` — unreachable for a year. Now: content-hashed
   filenames only (floor is **6** chars; `[hash:6]` is a real Vite setting).
3. **Boot check passed on a directory.** Service booted, every page 404'd,
   `/api/health` still 200 → the platform marks the deploy live and retires the
   last good instance. Now: readable, **non-empty** regular file.
4. **`x-real-ip` rate-limit bypass.** A fresh `X-Real-IP` per request minted a
   fresh bucket at hops=0 **and at hops=1 whenever `x-forwarded-for` was absent
   or empty** — hops=1 is the production value. P1-6 closed this hole in
   `x-forwarded-for` and left it open one header over. Now never consulted;
   no-trusted-chain falls back to a shared `UNTRUSTED_ORIGIN`.
5. **Global sign-in kill switch.** `authKey` was `${clientKey}:${pathname}`, so
   on the shared fallback identity `maxFailures` failures from ONE attacker
   locked sign-in for **every user**, renewably. A rate limit and a lockout fail
   in opposite directions on a shared key. Now: no lockout without an identity.
   *Latent today only because all three auth paths are closed in production — it
   arms the moment TASK B lands magic-link.*
6. **IPv6 bypass.** Key was the literal address; every client holds a /64, so
   2^64 buckets. Now bucketed by /64.
7. **Symlink-deploy regression I introduced.** Canonicalising the root once at
   boot pinned `current -> releases/<stamp>` to the boot-time release: serve the
   old release forever, then 404 everything after retention cleanup, health
   still 200. Now resolved per request.
8. **Refused boot said nothing.** Fixed enum codes, selected by error TYPE.
   Nothing is interpolated from the error, config, or environment — the
   sanitization control (`server.test.ts` "logs sanitized startup failure output
   without raw environment values") still holds and is still asserted.

### Test delta 848 → 888 across the two sessions

Added 37. **Re-anchored 4**, each disclosed in its commit:
`dev-backend-mode.test.mjs` esbuild string; `index-abc123.js` → `index-abc12345.js`
(a 6-char hash is not Vite output); the app-boundary lockout test now runs with a
trusted hop (the production shape — it previously ran in exactly the shared-key
case now refused); the sanitization test's expected string gains the code.
Removed 0.

**Known-weak test, disclosed in the code:** `refuses an escaping path handed
straight to the containment boundary` does NOT discriminate the defence layers.
Mutation-measured — deleting the lexical containment check leaves the whole suite
green, because the realpath re-check rejects the same inputs. There is no input
the lexical check catches that realpath does not. It is a pre-filter, and the
comment warns the next editor.

---

## 3. Repo B — SS-PT, and the git-lock root cause the last handoff got WRONG

The previous handoff said: *"Git takes the index lock BEFORE it validates
arguments. A malformed command strands the lock,"* and prescribed passing
`-F <file>` **before** the `--`.

**Tested. It does not reproduce.**

```
git commit -o -- nonexistent.txt -m "x"   → exit 1, NO .git/index.lock (self-cleaned)
git commit -a -F -   (stdin never closed) → lock HELD, 251 bytes, indefinitely
                                          → others: "Unable to create '.git/index.lock': File exists"
```

**A git process that blocks on stdin or is killed mid-write strands the lock —
not argument validation.** The 0-byte locks the fleet saw fit a process *killed*
before writing. The prescribed mitigation would not have prevented the
recurrence. I proved it the hard way: **my own `git commit -o` ran past a
2-minute harness timeout, was killed holding the lock, and orphaned a 1.6 MB one
— the fourth that day.**

**Rules that follow, and they matter to you:**
- **Never run a git write under a kill-capable timeout.** Background it.
- `--only` rebuilds a temp index against the whole tree; on this 706 MB repo with
  400+ dirty files it exceeds any short timeout. Plain `git commit` after
  verifying the staged set is the pragmatic call.
- Set `GIT_TERMINAL_PROMPT=0` so a credential prompt fails fast instead of
  hanging on stdin.
- Clearing a lock: snapshot `.git/index` → **exclusive-open probe** (below) →
  re-check mtime → **MOVE aside, never delete** → verify `fsck` clean, HEAD
  unchanged, 0 staged.
- **NEVER in the SS-PT tree:** `git reset`, `git stash`, `git checkout -- .`,
  `git add -A`, bare `git commit -a`, `taskkill //IM git.exe`.

The probe — and **print its evidence**, because a broken probe lies:

```powershell
$p = '<WINDOWS PATH>\.git\index.lock'
if (-not (Test-Path $p)) { 'NO LOCK FILE'; exit }
'size=' + (Get-Item $p).Length
try { $f=[IO.File]::Open($p,'Open','ReadWrite','None'); $f.Close(); 'ORPHANED' }
catch { 'HELD OPEN - ' + $_.Exception.Message }
```

Mine reported `HELD OPEN` once when the real error was *path not found* — I had
interpolated a Git Bash `/c/...` path into a Windows call. Believing the verdict
label would have left the tree wedged for the next agent.

**SS-PT state:** branch `wip/comms-notifications-2026-07-05`, **no upstream**,
~1947 commits behind `origin/main`. My commits `ac3583053`, `de2035b76`.
**Another agent is active in this tree** (`20ee4bf2f`, `740dbe7e9` — recon skill
+ GLM script) and holds locks. Read `.ai-workflow/coordination/` before editing.

---

## 4. Where we're going — what remains

### TASK C — Render deploy (BLOCKED ON SEAN, then you verify)

Sean creates the Blueprint **from `render.yaml` on this branch** (it already sets
`SWANGUARD_TRUSTED_PROXY_HOPS: "1"` and `SWANGUARD_WEB_STATIC_ROOT`), sets
`SWANGUARD_OWNER_EMAIL_HASH`, and confirms the hop count matches the real proxy
count — **never higher**, each extra hop is one more spoofable position.

Then **you** verify and paste real responses:
`/api/health` 200; `/api/readiness` 200 with `checks.database: "ok"`;
`GET /` 200 `text/html`; `GET /api/nope` 404 `application/json`; migration `0021` ran.
**Plus one check added this session: confirm Render actually sends
`x-forwarded-for`.** If it sends only `x-real-ip`, per-client rate limiting
collapses to ONE shared bucket and users see 429s. This is the highest-risk
unverified assumption in the whole change set.

### TASK B — production sign-in (NOT STARTED)

All three paths closed: `dev-sign-in` 403, `magic-link-intents` 503,
`passkeys` 404. **The passkey closure is CORRECT and must stay** — that login
verified no WebAuthn signature.

- **Provider decided by Sean: Namecheap Private Email over SMTP.** Verify
  host/port against current Namecheap docs; nobody has confirmed them.
- **Architectural blocker:** `POST /api/auth/magic-link-intents` accepts
  `{ emailHash }` — **you cannot email a hash.** The contract must take the raw
  address, hash immediately for lookup/storage, hold the raw value **in memory
  only** for the send. Never logged, persisted, or audited.
- **Two landmines:** the dev response returns the token in the body
  (`devTokenPreview`) — a full bypass if it ever ships; and
  `/api/auth/magic-link-intents` is **missing from `AUTH_ATTEMPT_PATHS`**,
  making the send endpoint an unmetered mail cannon.
- **nodemailer needs Sean's approval** (new runtime dependency → must then get an
  `--external:` entry, see the build rule below).
- SPF/DKIM/DMARC must be verified or links land in spam. Sean has a standing
  DMARC task.
- No user enumeration: identical status/body/timing for known and unknown.

### Flagged, NOT fixed — Sean's calls (do not silently action)

1. **HIGHEST PRACTICAL RISK: static assets share the API's 2000/min per-IP
   bucket.** ~100 users behind one office/school NAT × ~40 assets per page load
   exceeds it and **the whole site 429s for that building**. Recommended fix: a
   separate, larger bucket for static GETs, leaving the API limit untouched.
   Raising a limit is a capacity decision, so it is Sean's.
2. `/api/health` does not exercise static serving — a runtime static failure
   still reads as healthy. Recommend wiring it into `/api/readiness`, NOT
   `/api/health`, so a transient blip cannot cause restart loops.
3. No runtime detection of a *wrong* hop count. The guard proves it is set, not
   correct. Too high → the caller controls the key (bypass); too low → everyone
   shares one bucket. Recommend logging derived-key cardinality at canary.
4. **Direct-to-node topologies:** forcing hops ≥ 1 means a caller-written
   `x-forwarded-for` is trusted verbatim. Correct for Render, wrong elsewhere.
5. `isContentHashed` runs on the requested path, not the resolved basename — an
   in-root symlink could serve mutable content with a one-year cache.
6. No cache validators (`ETag`/`Last-Modified`) on `no-cache` responses, so
   `index.html`/`sw.js` re-download in full every navigation.
7. `HEAD` drops `content-length`.
8. `recordAuthOutcome` **clears a lockout on the failure after it locks**
   (`withinWindow` requires `lockedUntil === 0`). Not reachable from the app —
   `app.ts` returns early on `authGuard` and never records while locked. Latent
   footgun, documented not changed.
9. Per-request `realpathSync` + `statSync` on every asset: negligible on local
   disk, potentially costly on a network mount. No caching added.
10. **Consult-script output collision** — `consult-kimi.mjs` and
    `consult-hy3-design.mjs` BOTH default to
    `AI-HANDOFF/KIMI-DESIGN-REVIEW.md` (line 21 of each). Use `--out`.

---

## 5. YOUR FIRST TASK — Kimi K3 + GLM-5.3, hostile review AND hostile security review

Sean's instruction. Run **both models**, then **fix until dry**.

```bash
# Kimi K3 — paid, spend-gated. Observed cost ~$0.21-0.24 per review.
node scripts/consult-kimi.mjs --document <brief> --remit "..." \
  --out docs/ai-workflow/AI-HANDOFF/REVIEW-KIMI-ROUND3-<date>.md \
  --cap-usd 2.00 --confirm-spend

# GLM-5.3 — subscription-billed, no spend gate, but consumes coding-plan credit.
# Needs ZAI_API_KEY. Flags: --document --out --remit --model (default glm-5.3) --max-tokens
node scripts/consult-glm.mjs --document <brief> --remit "..." \
  --out docs/ai-workflow/AI-HANDOFF/REVIEW-GLM-ROUND3-<date>.md
```

**Traps:** `--cap-usd` is compared against a **worst-case ceiling**, not expected
cost — a $0.60 cap once refused a call whose actual cost was $0.076; dry-run
first (both scripts are dry-run by default) and cap above the printed ceiling.
Give each script a distinct `--out`.

### What to attack — the fixes, not the code they replaced

Everything in §2 is freshly changed and **has never run in production**. Prior
rounds found the most in exactly this material. Highest-value targets:

- **The rate limiter** (`clientKey`, `authKey`, `normaliseIdentity`) — the change
  most likely to cause an outage. Chain longer/shorter than `hops`; IPv6
  normalisation correctness; whether removing the lockout on the shared identity
  removed brute-force protection somewhere it was load-bearing.
- **`resolveWithinRoot`** — TOCTOU between `realpathSync` and `readFile`;
  case-insensitive filesystems; the per-request root resolution I just added.
- **The enum startup codes** — does naming a gate leak anything useful?
- **`assertTrustedProxyConfiguration`** — is `>= 1` the right floor? Does it
  brick a legitimate topology?
- **A dedicated hostile SECURITY review** (separate remit): auth, session and
  CSRF cookies, CSP, the static surface, the closed sign-in paths, secret
  handling, and anything reachable before authentication.

### Then

- **Verify every model claim locally before acting on it.** In this session
  Kimi, HY3 and Gemini were each wrong about something; Gemini twice. Kimi's
  round-2 proposed fix for `unknown` chain entries **was itself a bypass** —
  filtering `unknown` out of the chain promotes a caller-written entry into the
  trusted position. Only a test caught it.
- Report **CONFIRMED / PLAUSIBLE / DISPROVEN** per finding with file:line.
- Fix real defects; flag Sean-gated ones. **Loop until a full round finds nothing
  fixable, then one confirming round** (two consecutive clean = dry). Report the
  round count.

---

## 6. Then — and only then — deploy

TASK C above. Sean does the Blueprint; you verify with real pasted responses.
Do not declare the deploy good without them.

---

## 7. Tooling traps that cost me real time — do not re-learn these

- **Port collisions give false findings.** Two processes bound the same port
  (one on `0.0.0.0`, mine on `127.0.0.1`); curl hit the foreign one and I was one
  step from reporting a critical routing vulnerability that did not exist.
  **Assert listener count AND served identity BEFORE the first probe**, not after
  a surprising result.
- **`$?` after a pipe is the pipe's exit, not the command's.** I reported
  `tsc exit=0` on a type-check that had failed. Use `${PIPESTATUS[0]}`.
- **Files here are CRLF.** `\n` anchors in `perl`/`sed`/node replacements match
  nothing and report "changed=false". Check the bytes before assuming.
- **An ambiguous probe that agrees with you is not evidence.** My first live
  proof of the startup codes printed the same code for the test and the control,
  because a memory database is rejected in production before the guard runs.
- **A test's NAME is part of the control it protects.** I nearly weakened the
  startup sanitization until I read the test title.

---

## 8. Standing rules Sean checks

1. **Proof before "done"** — exact command and real output in the same message.
2. A test proves nothing until you have seen it **fail without your fix**. For
   defence-in-depth, disable each layer separately; a single-layer mutation can
   leave the suite green and teach you the wrong lesson.
3. **Test-delta disclosure:** added / re-anchored / removed, separately, and say
   which existing assertion you rewrote and why it was wrong.
4. **Hostile review until dry**, then one confirming pass. Report round count.
5. **Never weaken a control to make something work** — stop and ask.
6. **Don't widen scope silently.** Report what you find.
7. **Rule 45:** no `--amend`, rebase, or force-push without Sean.
8. Closeout gates fire every build turn: Hermes inbox memo with a literal
   `## Mistakes I made` heading, dry-loop ledger, Linear line, `PROOF:` line,
   and a plain-English section BEFORE the technical one.
9. **Verify a push by reading the file back out of the remote ref**
   (`git show origin/<branch>:<path>`), not by trusting "push said OK".

---

## 9. Where everything lives

| Artifact | Path |
|---|---|
| SwanGuard authoritative brief | `docs/HANDOFF-SWANGUARD-DEPLOY-BLOCKERS.md` (SwanGuard branch) |
| Round-1 review result | `docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-RESULT-SWANGUARD-TASKA-2026-08-14.md` |
| Round-1 raw (Kimi, HY3) | `AI-HANDOFF/REVIEW-KIMI-TASKA-2026-08-14.md`, `REVIEW-HY3-TASKA-2026-08-14.md` |
| Round-2 brief + raw | `AI-HANDOFF/HOSTILE-REVIEW-BRIEF-ROUND2-2026-08-15.md`, `REVIEW-KIMI-ROUND2-2026-08-15.md` |
| Git-lock learning packet | `docs/ai-workflow/hermes-learning-packets/20260815-a-documented-root-cause-is-still-a-hypothesis.md` |
| Hermes memos (gitignored) | `.ai-workflow/hermes-inbox/pending/20260815T*` |
| SwanGuard worktree | `C:/tmp/swanguard-civic-release-20260813` |
| Fresh-clone verifications | `/c/tmp/sg-verify5`, `/c/tmp/sg-verify6` |
| Index/lock backups | `/c/tmp/git-index-backup-20260814/` |

**Stale-doc warning:** older files in `AI-Village-Documentation/` describe a
*different* SwanGuard branch; one claims a durable `/api/civic/archive` service
exists — it does not. Verify with grep before trusting any audit doc.
