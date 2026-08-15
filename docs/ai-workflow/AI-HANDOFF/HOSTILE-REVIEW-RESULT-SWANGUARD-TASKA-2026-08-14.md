# Hostile review RESULT — SwanGuard TASK A + the SS-PT git lock (2026-08-14)

**Reviewer:** vs-claude (`claude-opus-5`), with Kimi K3 and HY3 as panel input.
**Reviewing:** the previous agent's work, per §7 of
`SESSION-HANDOFF-SWANGUARD-AND-GIT-LOCK-2026-08-14.md`. The outgoing agent did
not review itself.

**Panel cost:** Kimi K3 $0.2132 (`finish=stop`, not truncated), HY3 $0.0143.
**Total $0.2275.** Raw output: `REVIEW-KIMI-TASKA-2026-08-14.md`,
`REVIEW-HY3-TASKA-2026-08-14.md`. Brief: `HOSTILE-REVIEW-BRIEF-...md`.

Every model claim below was re-verified locally. Two of the three panel members
were wrong about something; so was I, twice.

---

## Verdicts

| # | Finding | Verdict | Action |
|---|---|---|---|
| 1 | Link inside the build root escapes containment | **CONFIRMED — live exploit** | FIXED `a84f9a7` |
| 2 | `immutable` granted by directory, not content hash | **CONFIRMED — live** | FIXED `a84f9a7` |
| 3 | Boot check accepts a *directory* named index.html | **CONFIRMED — live** | FIXED `a84f9a7` |
| 4 | Handoff's git-lock root cause | **DISPROVEN — misattributed** | corrected below |
| 5 | Same-origin serving weakened nothing | **CONFIRMED** | none |
| 6 | esbuild `--external:pg` correct | **CONFIRMED** | none |
| 7 | Re-anchored test was weakened | **DISPROVEN — strengthened** | none |
| 8 | 5 guard tests are decoration | **DISPROVEN — mutation-proven** | none |
| 9 | Traversal layers not independently covered | **CONFIRMED** | documented in code |
| 10 | No cache validators on `no-cache` | **CONFIRMED** | flagged, not fixed |
| 11 | HEAD drops `content-length` | **CONFIRMED** | flagged |
| 12 | `/.env` and `/API/health` return 200 shell | **CONFIRMED — low** | flagged |
| 13 | `TRUSTED_PROXY_HOPS=0` in prod = fleet DoS | **PLAUSIBLE — config, not code** | flagged for Sean |

---

## The three defects I fixed (`a84f9a7`, SwanGuard, not pushed)

Each was reproduced against the **running bundled server** before the fix and
replayed after it. A passing unit test alone would not have proved these.

**1 — Link escape (both panel members called this the most under-rated item).**
Containment was lexical (`resolve` + `startsWith`) only. A link inside the build
directory resolves to a path that *looks* contained while the bytes live
elsewhere. Proven: a junction at `dist/assets/out` →

```
GET /assets/out/leak.png
→ 200  content-type: image/png  cache-control: public, max-age=31536000, immutable
→ body: SECRET-OUTSIDE-ROOT-CONTENT   (a file outside the build root)
```

The extension allowlist keys on the **requested name**, so the target needs no
extension of its own and its MIME type is whatever the request claimed. The
realistic planter is a build step or a dependency copying a link into `dist` —
not an attacker with a shell, which is why the previous agent's "presupposes
write access to dist" framing under-rated it.
Fixed: real path resolved and re-checked inside the root; non-regular files
refused. Replay → `404`, zero bytes of the target.

**2 — `immutable` by directory convention.** `startsWith('/assets/')` is not
content addressing. Vite copies `public/` into the build verbatim, so an
unhashed file can land under `/assets/` and keep its name across deploys.
Proven: a plain `/assets/version.json` was served
`public, max-age=31536000, immutable` — unreachable for a year, and `immutable`
suppresses even revalidation. Fixed: immutable requires a content-hashed
filename. Replay → `no-cache`; hashed assets still `immutable`.
**Residual, documented in the code:** a hand-written name with an 8+ character
final dash-segment still matches. Closing it fully means reading the build
manifest.

**3 — Boot check passed on a directory.** `existsSync` is true for a *directory*
named `index.html`. Proven:

```
service booted OK   →  GET /            404 application/json   (SPA fully down)
                    →  GET /api/health  200                    (deploy looks healthy)
```

Render's `healthCheckPath` is `/api/health`, so the platform would mark the
deploy live and retire the last good instance. **Liveness is probed on the API
while the breakage is in static** — that is the general lesson, independent of
this particular trigger. Fixed: requires a readable regular file, and the shell
is re-checked per request. Replay → `HTTP server could not start`.

Kimi rated this medium; **HY3 rated it "none" and was wrong.**

Test delta **868 → 871**: added 3 (one per defect, each seen failing first),
**re-anchored 1** (`index-abc123.js` → `index-abc12345.js`; a six-character hash
is not what Vite emits and would not exercise the new rule), removed 0.

---

## What held up

**Same-origin serving weakened nothing (CONFIRMED, live).** `/api/health` returns
`application/json` with `default-src 'none'` intact. The HTML shell gets the
document CSP *plus* nosniff, HSTS, COOP, CORP and `x-frame-options: DENY` —
`secure()`'s only-if-absent behaviour stripped nothing. `.svg` inherits
`default-src 'none'`, so script-in-SVG cannot execute. Traversal battery (10
encodings incl. double-encoded, `%2f`-smuggled, backslash, NUL) → all 404 JSON,
no repo file served. POST/PUT/DELETE/OPTIONS → 405.

**esbuild change correct (CONFIRMED).** `pg` is the *only* real npm dependency;
everything else is a workspace package. Mutation-proven: reverting to
`--packages=external` fails 2 tests.

**The re-anchored test was strengthened, not weakened (DISPROVEN).** The exact-
equality assertion kept the same strictness and gained an independent property
test that pins the *reason*. Both fail on the same mutation.

**The 5 guard tests are real (DISPROVEN as decoration).** Widening the localhost
allowlist to `return true` fails the remote-origin guard — exactly the "wrong
fix" a future agent would attempt. The previous agent's disclosure that they
"pass with or without the fix" was honest and accurate.

**Traversal layer coverage gap (CONFIRMED).** Mutation: removing the `..` check
alone → 14/14 green; removing containment alone → 14/14 green; removing both → 1
fails. Kimi's sharpening is right and worth recording: WHATWG URL normalisation
collapses dot segments *before this module runs*, so the `..` check is largely
subsumed and no test can distinguish the layers. Now documented in the blueprint
header so a future refactor does not read the green suite as permission.

---

## The correction that matters most — the handoff's git root cause is wrong

The handoff states: *"Git takes the index lock BEFORE it validates arguments. A
malformed command strands the lock."* and prescribes passing `-F <file>` **before**
the `--`.

**Tested directly. It does not reproduce.**

```
git commit -o -- nonexistent-path.txt -m "x"
→ error: pathspec ... did not match any file(s) known to git
→ git exit=1        .git/index.lock : No such file or directory   ← self-cleaned
```

**What actually strands the lock — verified:**

```
git commit -a -F -        (message from stdin, stdin never closed)
→ .git/index.lock  present, 251 bytes, held for as long as the process waits
→ another agent:  fatal: Unable to create '.../.git/index.lock': File exists.
                  Another git process seems to be running in this repository
```

That is Sean's exact error. The mechanism is a git process that **blocks on
stdin or is killed mid-operation** — not argument validation. The handoff
actually *found* this and mis-filed it: it separately reports a hung
`git credential-manager store` "blocked on stdin since 01:54". The **0-byte**
locks the fleet saw fit a process *killed* before writing; my stdin-blocked lock
was 251 bytes. Same family, different moment of death.

**Why this matters:** the prescribed mitigation ("`-F` before `--`") is correct
about pathspec parsing but would **not** have prevented the recurrence, and would
have given false confidence. The load-bearing mitigations are unchanged and still
right: **worktree-per-agent**, plus non-interactive git
(`GIT_TERMINAL_PROMPT=0`, a configured credential helper, never `-F -` from an
agent), plus the stale-lock detector already proposed as §5 item 4.

**On the rest of the remediation:** moving rather than deleting the lock was the
genuinely good call (atomic, recoverable). Kimi is right that an exclusive-open
probe proves nothing on POSIX, where git's lock is existence-based, not `flock` —
but the previous agent ran it on **Windows**, where an exclusive open *does* fail
against a live holder, so the probe was more meaningful there than Kimi credits.
Both models agree committing 16 files authored by other agents was a rescue that
overstepped by not inspecting each file; untracked files are exactly where agents
drop scratch credentials. Nothing bad was actually committed, but the method was
"add the directory and hope."

**Fleet-wide silent-failure sweep (Kimi's list, checked against the real tree):**
no `gc.log` wedge, no stale ref/`packed-refs` locks, `core.hooksPath=.githooks`
is tracked in-repo so a change is visible rather than silent, `count-objects`
healthy (0 garbage, 0 prune-packable). Clean today.

---

## Flagged, not fixed — Sean's call

1. **`SWANGUARD_TRUSTED_PROXY_HOPS` has no production guard.** `render.yaml` sets
   `1` correctly. If it is ever `0` in production, every caller collapses into a
   bucket per Render LB egress IP and **organic traffic alone can 429 the whole
   user base** — no attacker needed. Set too high, an attacker mints unlimited
   buckets by appending fake `x-forwarded-for` entries. Proposed: fail closed at
   boot if `NODE_ENV=production` and hops < 1. I did not add it because it can
   refuse a boot Sean has not agreed to.
2. **Consult-script output collision** — `consult-kimi.mjs` and
   `consult-hy3-design.mjs` both default to
   `AI-HANDOFF/KIMI-DESIGN-REVIEW.md` (line 21 of each). I worked around it with
   `--out`; the default is still a trap. Listed as §5 item 3 in the handoff, so I
   left it for Sean rather than silently changing it.
3. **No cache validators.** `no-cache` without `ETag`/`Last-Modified` means
   `index.html` and `sw.js` are re-downloaded in full on every navigation —
   revalidation can never produce a 304. Performance, not security.
4. **HEAD drops `content-length`** (GET carries it, HEAD does not). Corrects my
   own earlier "HEAD → 200" as an incomplete verification.
5. **`/.env` → 200 HTML shell**, and `/API/health`, `/%61pi/health`,
   `/api%2fhealth` → 200 HTML shell. No data is reachable through the static
   handler in any case — it can only read the build directory. The forward-looking
   hazard is that "everything under `/api` is JSON" now depends on `isApiPath`
   seeing the *raw* pathname; worth a pinning test if anyone adds decoding
   middleware.
6. **`preDeployCommand` unverified.** `db:migrate:postgres` resolves to
   `scripts/postgres-migration-runner.mjs`, which exists. I could not execute it —
   no Postgres here. **Not** claimed as working.
7. **`a84f9a7` is committed but NOT pushed.** It should reach the remote *before*
   Sean creates the Render Blueprint, or TASK C deploys the vulnerable bundle.

---

## Still blocked on Sean (unchanged)

**TASK C** — Render Blueprint + `SWANGUARD_OWNER_EMAIL_HASH`; then I verify and
paste real responses. **TASK B** — magic-link sign-in; the architectural blocker
stands (`POST /api/auth/magic-link-intents` takes `{ emailHash }`, and you cannot
email a hash), and nodemailer needs approval.

## Hostile-review rounds

Round 1 my own read → found the dotfile and `/api` casing behaviour, and the
rate-limit question. Round 2 live battery → found nothing new beyond those.
Round 3 panel + local verification → the three fixed defects. Round 4 mutation
testing → the coverage gap. Round 5 against my own fix → the `readFile`
injection coupling question (checked: nothing injects it, no regression).
Round 6 confirming pass → dry.
