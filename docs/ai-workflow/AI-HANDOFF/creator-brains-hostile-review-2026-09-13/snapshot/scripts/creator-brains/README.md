# Creator Brains — SS-PT acquisition engine

**One brain per creator, built from that creator's own videos, checked daily.**

> **Status:** IMPLEMENTATION VERIFIED against the live YouTube boundary (2026-09-12).
> **Governing plan:** [`docs/ai-workflow/AI-HANDOFF/CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md`](../../docs/ai-workflow/AI-HANDOFF/CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md)
> **Upstream plan it implements:** `SwanGuard-Newsroom/docs/SWANGUARD-CREATOR-BRAIN-BLUEPRINT-2026-09-02.md` (CB0 signed 2026-09-02).

---

## What it does

```
add a creator  →  enumerate every video  →  fetch every transcript  →  store it forever
                                      ↓
                     derive a brain:  cited claims · recurring topics · doctrine · timeline
                                      ↓
                     stage it for the Karpathy wiki vault's `creator-brains` collection
                                      ↓
                     run again tomorrow and fold in whatever is new
```

Every claim on a brain page carries a timestamp and a link that opens the creator's
own video **at the second it was said**. That link is the product: it is more useful
than 55 minutes of text, and it sends the traffic back to the creator.

## Quick start

```powershell
# 1. Add creators (they arrive DISABLED — enabling is a deliberate act)
node scripts/creator-brains/cli.mjs add "@SomeCreator"
node scripts/creator-brains/cli.mjs list

# 2. Turn one on
node scripts/creator-brains/cli.mjs enable UCxxxxxxxxxxxxxxxxxxxxxx

# 3. Prove yt-dlp works before running anything longer
node scripts/creator-brains/cli.mjs canary

# 4. Run the whole daily pass
node scripts/creator-brains/cli.mjs daily --per-hour=20

# 5. Ask the brains something
node scripts/creator-brains/cli.mjs query "shadow lift" --creator UCxxxx
```

`node scripts/creator-brains/cli.mjs` with no arguments prints the full command list.

## The daily job

```powershell
node scripts/creator-brains/run-daily.mjs --per-hour=20
```

Exit code `0` = every phase passed **and no fetch failed**. `1` = something failed,
and the digest says what. `2` = yt-dlp is missing, so it refused to run at all rather
than reporting a cascade of misleading fetch errors.

> `record.ok` is no longer the canary's verdict. A run where the canary passed while
> every catalog fetch failed used to print `COMPLETED` and exit `0` — the silent-rot
> outcome the digest exists to prevent, arriving through the digest itself. A phase
> now reports `ok: false` when its own work failed, and a per-creator exception is a
> failure rather than a note.

**Windows Task Scheduler** — two settings actually matter, and `schtasks` can only
set one of them:

```powershell
schtasks /create /tn "Creator Brains Daily" /sc daily /st 06:30 `
  /tr "node \"C:\path\to\SS-PT\scripts\creator-brains\run-daily.mjs\"" /rl LIMITED /f
```

Then open Task Scheduler and turn on **"Run task as soon as possible after a
scheduled start is missed"**. Without it, a forced-update reboot at 06:00 silently
skips the run — which is the failure mode where the brain quietly stops updating and
nothing anywhere says so.

The digest fires **on success too**. That is deliberate: if the digest only arrived
when something broke, its absence would carry no information and you could not tell
"all fine" from "the scheduler died three weeks ago". Absence is the alarm.

## Where things live

Everything is under `.ai-workflow/creator-brains/` (gitignored):

| Path | What | Tier |
|---|---|---|
| `docs/<channelId>/<videoId>.json` | the transcript, durably — **no pruning, no TTL** | **B — owner-private** |
| `brains/<slug>/{index,topics,timeline}.md`, `rules.jsonl` | the derived brain | C — derived |
| `vault/creator-brains/` | staging for the wiki vault | C — derived |
| `registry.json` · `state.json` · `ledger.jsonl` · `runs/` · `digest/` | catalog, per-video state, budget, run records, digests | C |

**The tier boundary is the safety model.** Lane B is owner-private transcript text:
it is gitignored, it is never rendered into a page, never exported, never in a
digest. Lane C is derived and may leave the machine. That boundary is enforced by
the **import graph** — `lib/export.mjs` cannot read a transcript because it does not
import the module that holds them — and by a test that greps every derived surface
for a verbatim run of 8+ words. The 7-word phrase cap in `lib/extract.mjs` is what
makes that test passable; it is a control, not a style preference.

## Publishing to the Karpathy wiki brain

The live vault (`~/hermes2/brain-vault`) is on WSL and is **not reachable from this
machine**, and `scripts/swan-brain.mjs` states in its own header that it *reads;
never writes and never exports*. So this engine **stages** and you copy:

```bash
# inside WSL
mkdir -p ~/hermes2/brain-vault/creator-brains
cp -r "<repo>/.ai-workflow/creator-brains/vault/creator-brains/." ~/hermes2/brain-vault/creator-brains/
```

Then confirm from the repo:

```powershell
node scripts/swan-brain.mjs -c creator-brains "shadow lift"
```

## OAuth subscription sync — currently BLOCKED

`cli.mjs sync` imports your real YouTube subscriptions as the creator catalog
(`subscriptions.list`, 1 unit per 50 channels). It is **blocked** because the
credential does not exist on this machine. It refuses with the exact steps rather
than returning an empty catalog, because an empty catalog and "you follow nobody"
look identical and one of them is a silent data loss.

To unblock:

1. Google Cloud Console → **APIs & Services → Credentials** → Create OAuth client ID → **Desktop app**.
2. **OAuth consent screen → Publishing status → `In production`.**
   Left in `Testing` with user type `External`, Google expires the refresh token
   after **7 days** and the catalog silently freezes on day 8. `Internal` is not
   available on a personal Google account.
3. Enable the **YouTube Data API v3**. Scope: `https://www.googleapis.com/auth/youtube.readonly`.
4. Save the JSON as `%LOCALAPPDATA%\SwanGuard\client_secret.json` — never in the repo, never in `.env`, never on a command line.
5. `node scripts/creator-brains/cli.mjs sync`

Until then, the manual list is fully functional.

> **What OAuth cannot do:** it does **not** unlock third-party captions.
> `captions.download` requires authority to *edit* the video regardless of scope.
> Timed-text via yt-dlp is the only path that returns another creator's transcript.

## Tests

```powershell
# offline suite — 54 tests, no network
node --experimental-test-isolation=none --test `
  scripts/creator-brains/test/unit.test.mjs `
  scripts/creator-brains/test/brain.test.mjs `
  scripts/creator-brains/test/tier.test.mjs `
  scripts/creator-brains/test/system.test.mjs `
  scripts/creator-brains/test/reliability.test.mjs `
  scripts/creator-brains/test/cli.test.mjs

# the real boundary — 4 tests, hits YouTube
$env:CREATOR_BRAINS_LIVE="1"
node --experimental-test-isolation=none --test scripts/creator-brains/test/live.test.mjs
```

`--experimental-test-isolation=none` is required in confined environments that deny
the named pipe Node's test runner uses to capture child output (`spawn EPERM`). It
runs every file in one process; the tests are written to be order-independent.

## Environment

| Variable | Meaning |
|---|---|
| `CREATOR_BRAINS_ROOT` | store root (default `<repo>/.ai-workflow/creator-brains`) |
| `CREATOR_BRAINS_YTDLP` | explicit yt-dlp binary path — bypasses resolution |
| `CREATOR_BRAINS_LIVE` | `1` enables the network tests |
| `CREATOR_BRAINS_CANARY_VIDEO` | override the canary video id |

yt-dlp resolution: `CREATOR_BRAINS_YTDLP` → `yt-dlp` on PATH → `uvx yt-dlp` with
`UV_CACHE_DIR` / `UV_TOOL_DIR` / `UV_TOOL_BIN_DIR` / `UV_PYTHON_INSTALL_DIR`
redirected into `.ai-workflow/uv/`. The redirect exists because `uvx` fails with
`Access is denied` when its cache lives somewhere the process cannot write.

## Known limits (v1)

- **Lexical search only.** `tear trough` will not find `under-eye hollow`. Both
  upstream review seats said embeddings are required for this use case and they are
  right; that is a rebuildable index over these same rows, not a v1 feature. A query
  with no match says which words it looked for rather than implying the creator
  never discussed it.
- **Deterministic extraction, no LLM.** Claim phrasing is a heuristic and it is
  rough — expect some fragments. The upside is that it cannot invent a rule that is
  not in the transcript, and it costs nothing. `rules.jsonl` is the seam where a
  model-backed extractor plugs in later, behind the spend gate.
- **No Whisper.** A video with no caption track goes `no_track_retry` for 48h (auto
  captions lag publication) then `unavailable`. This deliberately removes the entire
  GPU-contention and crash-cleanup surface from v1.
- **Rate cap is a request-tolerance cap, not a quota cap.** yt-dlp costs no API
  quota; the resource that runs out is YouTube's patience with one residential IP.
  One video costs two requests (probe + fetch), so a cap of 20 is up to 40 requests.
- **Backfill is slow by design.** 979 videos at 20/hour is ~2 days. Raise `--per-hour`
  deliberately for a backfill, and expect the soft-block risk to rise with it.
