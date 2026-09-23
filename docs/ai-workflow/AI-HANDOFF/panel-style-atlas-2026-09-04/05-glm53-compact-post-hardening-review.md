# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 16824 in / 27428 out (reasoning: 23960) | total 44252
**Wall:** 446.8s

---

# Style Atlas — hostile review of the provided packet

**Scope note (what I could not see):** `queuePath`, `readProject`, `corpusAccess`, `loadCatalog`/`catalogInsert`, `rngFrom`, `esc`, `Swan.say`, the Host/Origin gates, and CSS are outside the packet. Where their behavior matters to a finding I say so explicitly. No licensed corpus was needed or requested; all repros use synthetic fixtures or stubs.

---

## Verified defects

### [D1] P2 — Global Escape handler steals focus and closes the detail panel while the user is typing
`prompter/app-atlas.js:434-435` (with `closeDetail` default `restoreFocus:true` at `:334`)

**Repro (deterministic):** Owner → Atlas → click any cell (detail opens, focus moves to `#atlasDetailTitle`) → Tab/click into the queue **Subject** input (or the search box `atlasQ`) → type → press `Escape`.
**Observed:** the document-level handler runs unconditionally: the detail panel closes *and* `restoreFocus` yanks focus from the input to the origin grid cell — mid-keystroke caret loss. It also fires while the Atlas section is hidden (detail left open from a previous visit), focusing a cell inside a `hidden` section (focus falls to `body`).
**Fix (smallest):**
```js
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !state.open) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
  closeDetail();
});
```

### [D2] P2 — Discarded compose response leaves a permanent "Composing…" state
`prompter/app-atlas-queue.js:142-152`

**Repro:** Queue has ≥1 item → click **Compose draft** → before the response resolves, click any ✕ (or **Surprise me**) — either bumps `queueSeq` → the guard at line 152 returns without touching `#atlasQDraft` → the region shows `Composing…` forever (no output, no error) until another compose.
**Fix:**
```js
if (world.changed() || queueVersion !== queueSeq || seq !== composeSeq) { out.innerHTML = ''; return; }
```

### [D3] P2 — Compose route swallows the quarantine notice and reports a misleading error
`prompter/routes-atlas.mjs:143-147` + `prompter/lib/atlas-queue.mjs:159-163`

**Repro:** Hand-corrupt the queue file → `POST /api/atlas/compose` → response is `{ok:false, error:'the queue is empty — open a style and press + Queue'}`. The real event ("queue file was unreadable and has been quarantined") sits in the `notices` map and is only surfaced by an unrelated later queue GET/POST. The user is told to re-add styles with no explanation of data loss.
**Fix:** In the compose branch, `const notice = takeQueueNotice(ns.profile, ns.project);` and spread `...(notice ? { notice } : {})` into the response, matching lines 92/104/139.

### [D4] P2 (verify-gated) — Queue-add and compose resolve slugs through two different loaders
`prompter/lib/atlas-queue.mjs:165` vs `:121`

`queueAdd` validates against `loadAtlas().bySlug`; `composeDraft` resolves against `loadCatalog().index` and accepts no `sourcesRoot`. Two caches of the same corpus can diverge (partial checkout, versioned sources), after which queued slugs silently move into `unresolved` and drafts shrink without any error. It also means the fixture-root test path used elsewhere cannot exercise compose.
**Repro (unit):** stub `loadCatalog` to return `{index: []}` with a non-empty queue → `composeDraft` returns "none of the queued styles still exist", while `queueAdd` for the same slug succeeds.
**Fix:** resolve with `loadAtlas().bySlug` (thread `sourcesRoot` through), keep `catalogInsert` for formatting only. If the two loaders are provably identical today, document it and still unify — this is the packet's only place where one feature reads the corpus two ways.

### [D5] P2 — Quarantine failure on an already-moved or locked file throws out of `readQueue` → unhandled 500
`prompter/lib/atlas-queue.mjs:67-91`

`quarantineUnreadable` rethrows on any rename failure. `ENOENT` occurs when another process already moved the file (the corrupt file can be quarantined exactly once); on Windows, an editor/AV/backup handle makes `renameSync` fail `EPERM/EBUSY`. The throw escapes `readQueue`'s `catch` block (it *is* the catch block) and rejects the route.
**Reachability caveat:** in-process double-reads cannot interleave — the read→quarantine section is fully synchronous, so Node serializes concurrent requests. This is reachable only cross-process/handle-lock, or via the same stub your "simulated quarantine failure" test uses.
**Fix (smallest, preserves the mutation-blocking invariant you tested):**
```js
} catch (cause) {
  if (cause?.code === 'ENOENT') return;              // someone else quarantined it
  throw new Error('queue file is unreadable and could not be quarantined; no changes were made', { cause });
}
```
Optionally catch at the route and return `503 {error}` instead of an unhandled rejection; keep throwing for real I/O failures so writes stay blocked.

### [D6] NIT/P2-low — GET `/api/atlas/queue` skips the project guard used by every mutation
`prompter/routes-atlas.mjs:89-93` vs `guard()` at `atlas-queue.mjs:42-46`

**Repro:** `GET /api/atlas/queue?profile=sean&project=nope` → `200 {queue:[]}`; the equivalent POST → `400 unknown project`. GET also reaches `existsSync(queuePath(...))` with caller-controlled `project` (read-only, owner-scope — but confirm `queuePath`/`readProject` reject separators, since both are outside the packet).
**Fix:** apply the same `guard()` in the GET branch; return 400 on unknown project.

### [D7] NIT — Non-GET/POST atlas paths fall through instead of 405
`prompter/routes-atlas.mjs:38` returns `false` for e.g. `DELETE /api/atlas/queue`, leaving the response to whatever handles unmatched routes. Safe (falls to 404) but ambiguous. **Fix:** after the path match, reply `405` with `Allow: GET, POST`.

### [D8] NIT — Surprise coerces filters differently from the grid and drops `ignored`
`prompter/routes-atlas.mjs:126-129` vs `:152-156`

`eraFrom:"1850"` (string) is silently dropped (`Number.isFinite` fails) while GET's `int()` accepts it, so "samples the current grid filters" is falsifiable by a hand-crafted POST; invalid `type`/`country` land in `ignored`, which the surprise response never returns. Related: when the queue is near `QUEUE_MAX`, excess picks are silently discarded (the `added` list stays truthful, but no reason is surfaced). **Fix:** reuse the GET coercion helpers, echo `ignored`, and add a `skippedFull: true` field when a pick hits the cap.

### [D9] NIT — Subject can smuggle Midjourney flags past the aspect control
`prompter/lib/atlas-queue.mjs:177-181`

`subject = "a heron --ar 1:1 --seed 99"` yields a draft with conflicting `--ar` tokens, contradicting the dedicated Aspect-ratio select and the "draft only, Make decides params" posture. Owner-self-inflicted, so NIT. **Fix:** `subject.replace(/--\S+/g, ' ').replace(/\s+/g,' ').trim()` or reject with 400.

### [D10] NIT — Rename-based atomicity is not power-loss durability
`prompter/lib/atlas-queue.mjs:94-104`

`write()` is atomic w.r.t. concurrent readers (correct for the stated invariant), but there is no `fsync` of the temp file before `renameSync`; after power loss the renamed file can be zero-length, and the next read quarantines it — the queue is lost. Bounded, user-recoverable data, hence NIT. **Fix (optional):** `const fd = fs.openSync(tmp,'w'); fs.writeSync(fd, data); fs.fsyncSync(fd); fs.closeSync(fd);` before the rename.

### [D11] NIT (verify) — "whole-word" attribution claim vs `t.includes(c)`
`prompter/lib/atlas.mjs:120` vs the user-facing claim at `:216`

The visible matcher is substring containment. If `credited` (lines <120, not shown) is not pre-bounded, `counts.withPrompts` and per-style `promptCount` over-attribute. Verify upstream; if raw names, wrap with boundary checks before `includes`.

---

## Areas attacked and found sound (no churn requested)

- **Authorization placement:** `corpusAccess` runs before route dispatch, before the absent-catalog branch, and before every sub-route including queue and compose; partner/client fail closed with 403 and never learn catalog presence. Invariant holds in the shown code.
- **Stale-response guards:** the `world()` epoch + per-feature seq + re-computed `queryKey` triple-guard in `fetchPage`/`requery`/`openDetail`/`start` correctly discards late search, page, detail, facets, queue, and compose results, including the memory-switch path (`onMemory` bumps `startSeq`/`queueSeq`/`composeSeq`, clears caches, and the queue module nulls its host).
- **Listener lifecycle:** `start()` wipes `#atlasBody` before `buildControls`, and the un-guarded `scroller.addEventListener` at `:387` proves the scroller is rebuilt inside the wiped host — no listener accumulation across memory switches.
- **Link handling:** `safeHttpUrl` pins the scheme (`i`-flag covers `HTTPS://`), and `[^\s]` excludes `\uFEFF`/`\u2028`/all Unicode whitespace; every interpolation into `innerHTML`/attributes in the shown sinks goes through `esc`, including `data-queue`, `href`, and `aria-label`.
- **Queue semantics:** dedupe-before-cap, `QUEUE_MAX` clamp in `normalizeQueue`, quarantine-before-clear, atomic tmp+rename with `finally` cleanup, single-threaded serialization of read-modify-write (no in-process TOCTOU), seed bounds (`Math.random()*2**31` floors to ≤ `0x7FFFFFFF`).
- **Paging/clamps:** negative offsets clamped, `limit` 1..500, 7-digit int regex, `Infinity-Infinity → NaN` falsy fallthrough in era sort is handled by the `|| byName` tiebreak.

---

## Optional enhancements (not defects)

- Request timeouts in `Swan.api`/`Swan.post` (a hung loopback request currently leaves "Loading…" / "Composing…" with no recovery).
- `#atlasQDraft` is `aria-live="polite"` but receives focusable buttons (Copy) that are never focused — announce text and move focus to the Copy button on success.
- `Math.min(...years)` / `Math.max(...years)` spread at `routes-atlas.mjs:72-73` — fine at catalog scale, but a loop is free insurance.
- `loadAtlas` has no mtime invalidation; catalog updates need a restart (fine for a licensed local snapshot, worth a comment).

---

## Product summary (plain language)

Style Atlas is an owner-only browsing and assembly layer over the licensed local style catalog. The owner pages through it, filters it, opens per-style detail, and builds a shortlist (queue) per taste memory; a seeded, popularity-weighted "Surprise me" pulls new candidates from the current filters; "Compose draft" turns the queue plus an optional subject into copyable text — and nothing else. It never writes taste, never sends anything to the image pipeline, and never writes prompts: Make remains the only writer. The server re-authorizes every request against the profile/project namespace and refuses partner/client memories outright; the browser discards any late response that no longer matches the current memory or query. In the reviewed code the security and race invariants hold. What I found is polish-level: an Escape key that steals focus from inputs, a compose spinner that can stick forever, a quarantine notice that compose forgets to deliver, and a loader inconsistency in compose that should be unified before it can silently shrink drafts.

---

## Prioritized backlog (with acceptance tests)

1. **[D4] Unify compose slug resolution on `loadAtlas`** — *AT:* with an injected fixture `sourcesRoot`, `queueAdd` and `composeDraft` resolve the same slug set; stubbed empty catalog index cannot produce a false "all unresolved" for a valid queue; unit test with fixture root passes.
2. **[D1] Scope the Escape handler** — *AT:* Playwright: focus in `#atlasQSubject` and in `#atlasQ`, press Esc → detail stays open (or closes without moving focus), `document.activeElement` unchanged; Esc with focus on a grid cell still closes and restores focus.
3. **[D2] Clear discarded compose output** — *AT:* delay the compose response, mutate the queue, release → `#atlasQDraft` is empty or shows the prior draft; assert no permanent "Composing…" after 2s.
4. **[D3] Deliver the compose quarantine notice** — *AT:* corrupt queue → POST compose response contains `notice`; UI displays "quarantined" wording, not just "queue is empty".
5. **[D5] Benign ENOENT in quarantine** — *AT:* stub `renameSync` with `ENOENT` → GET queue returns 200 `[]` + notice; stub `EPERM` → mutations remain blocked (existing test) and GET returns a handled 503/error JSON, never an unhandled rejection.
6. **[D6] Guard parity on queue GET** — *AT:* GET with unknown project → 400 `unknown project`, matching POST; confirm `queuePath` rejects separators in `project`.
7. **[D8] Surprise filter parity + `ignored` echo** — *AT:* string `"1850"` for `eraFrom` filters identically to GET; response includes `ignored`; near-cap roll sets `skippedFull`.
8. **[D9] Strip `--` tokens from subject** — *AT:* subject `"a heron --ar 1:1"` produces a draft whose only flags are the appended `--ar`/`--v`.
9. **[D10] Optional fsync durability** — *AT:* crash-test harness (or documented rationale) shows a torn write is impossible or quarantines without silent loss.
10. **[D11] Confirm whole-word attribution** — *AT:* a name that is a substring of another token does not increment `promptCount`.

---

**VERDICT: APPROVE**

No P0/P1: authorization placement, fail-closed access, stale-response isolation, atomic/deduped queue writes, and link/HTML hardening all hold in the provided code. The P2s above are real user-facing defects (focus theft, stuck spinner, swallowed quarantine notice, compose loader divergence) that belong in the backlog, not blockers for a loopback, owner-only tool whose core invariants survived this pass.
