# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-favourites-f0f1-2026-08-27/PACKET.md
**Tokens:** 8142 in / 27430 out (reasoning: 22480) | total 35572
**Wall:** 515.9s

---

Verification note up front: I can only attack what's in the packet. `ownSubjects`, `tasteFor`, `compileProfile`, `keepFor`, `loadTaste`'s body, the generator, `/api/make`, and the CLI are **not in the packet** — every finding that depends on them is labeled HYPOTHESIS with the exact conditional. Everything else I trace from the quoted code.

---

## WP5 — Click-time writes. The epoch does not cover this, and your defense of it is a hope, not a mechanism.

**[P1, HYPOTHESIS — P0 if the conditional holds] Stale cards write into the current memory, and carry corpus `sref` fields across the law line.**

The epoch discards async *results*. It does nothing about already-rendered *DOM*. `app-make.js:12-75` `card()` renders buttons whose handler `act()` reads **live** identity at click time:

```js
const r = await Swan.post('/api/favourite', { prompt: p.prompt, state: ..., profileId: Swan.profile, projectId: Swan.project });
```

and for make:

```js
Swan.post('/api/make', { profileId: Swan.profile, projectId: Swan.project, prompts: [{ prompt: p.prompt, sref: p.sref ?? undefined }], count });
```

Your claim is that safety is "inherited from the list that rendered the card." That is inheritance by rendering — nothing enforces it. Reproduction sequence:

1. Make tab shows sean's cards (cards legitimately carry `p.sref` — corpus codes, sean-only).
2. Switch profile via the select: `Swan.profile = 'partner'; Swan.project = null; await loadProjects();`
3. If the Make grid is not unconditionally cleared *before* the fetch — e.g., the re-render is tab-lazy, or `loadProjects()`/the subsequent fetch fails and `note('…')` leaves old DOM standing (Judge's `load()` only clears the grid in the no-project branch, `app-judge.js:17-50`; on `!r.ok` it doesn't even check before `r.json()`) — the sean cards are still on screen under partner's identity.
4. Click **Steer** on a stale card → partner's steering list receives a sean-taste prompt. Click **Make** → `/api/make` receives `profileId: 'partner'` with `sref: <sean's corpus code>` as a **field** — and `validateSavedPrompt` never sees fields, only text.

The two conditionals I cannot verify: (a) whether every `onMemory` listener clears DOM synchronously before any await; (b) whether `/api/make` enforces sref ownership per profile. **If (b) is false, this is a P0 breach of the governing law, and no code in this packet prevents it.**

The galling part: you built the primitive that closes this and didn't use it. `card()` could capture `Swan.world()` at render and `act()` could refuse on `changed()` — one line each. The epoch guards seven reads and zero writes.

---

## WP6 + WP3 — The sean steer path. Your own file header forbids this bug, and then ships it.

**[P0] `routes-favourites.mjs`, steer branch, `if (isSean)`: unconditional `ok:true` after an uncompensated unshelve.**

```js
if (onShelf) unshelveFor(profile, project, text);
json(res, 200, { ok: true, state: 'steer', message: cli(['--keep', v.text]) });
```

Three defects in two lines:

1. **`ok: true` is a literal.** The CLI's outcome is stuffed into `message` and the status is 200 regardless. If the CLI refuses — its own validation, a substring-duplicate hit, a malformed hand-edited `kept.md`, the binary missing — the owner is told *Steering* while nothing steered.
2. **The unshelve is never compensated.** `promoteFor` (favourites.mjs) has re-shelve-on-failure for exactly this reason; the sean branch reimplements promote *without it*. This is a second promote implementation in the same feature — the precise "two implementations" bug the file's header paragraph claims to have abolished. The code contradicts its own header comment in the same file.
3. **The two duplicate checks disagree by construction.** Your own description: the route/`loadTaste().kept` check is **line-exact**; the CLI's `appendKept` is **substring against the whole file**. So there exist prompts that are "not steering" by the route's check and "duplicate" by the CLI's — every prompt that is a substring of any line in `kept.md`, *including lines under `## Killed`*, which the substring check scans because it checks the whole file.

Combined reproduction is in the final section. This also directly answers your WP3 question "neither list — silently lost?": **yes, deterministically, no crash required.**

**[P1, HYPOTHESIS] `message: cli([...])`.** If `cli` returns an object (or a promise, if it wraps `child_process.exec`), the toast renders `[object Object]` or `{}` under a green success. Unverifiable — the delegate isn't shown.

**[P2] Non-atomic two-write sequences everywhere.** `promoteFor` = `writeFileSync(shelf)` then `writeFileSync(kept)`; `demoteFor` = unkeep then shelve. Kill the process between the two writes and the prompt is in **neither** list; kill `demoteFor` mid-flight and you've silently dropped *steering material*. No journal, no temp-rename. You asked; confirmed.

**[P2] `promoteFor` discards the compensation result.**

```js
if (!kept.ok) { shelveFor(profile, project, text); return kept; }
```

The re-shelve's return value is thrown away. Worse: `shelveFor` **re-validates**. Any prompt shelved under a looser earlier contract, then promoted after `validateSavedPrompt` tightens (it has tightened in four panel rounds per its own comment), fails `keepFor`, then fails the re-`shelveFor` on the same new rule — **item in neither list, error returned as if nothing was lost.**

---

## WP1 + WP7 — Shelf reachability and the corpus law.

**[P1, HYPOTHESIS] Promotion performs no validation of its own.** `promoteFor` (favourites.mjs) calls `keepFor(profile, project, text)` directly — no `validateSavedPrompt` anywhere in the function. The non-sean steer branch of the route also never validates (`const r = onShelf ? promoteFor(...) : keepFor(...)`). Your stated invariant is "validated on the way IN" — i.e., at shelve time, against a **mutable file** that is hand-editable and was written by whatever contract held at write time. The sean branch validates explicitly in-route; the non-sean branch does not — which reads like you yourself don't trust that `keepFor` validates. If it doesn't, then: hand-poison or stale-poison `shelf.md` with `--sref 123456 calm sea`, POST `state:'steer'` → the corpus code lands in a partner's `kept.md` at score 1000. **Conditional on `keepFor`'s unseen body; if `keepFor` validates, downgrade to "two asymmetric call sites for one contract."**

**[P2, HYPOTHESIS] Sean's shelf lives inside the corpus vault.** `favourites.mjs`: `path.join(VAULT, 'taste/shelf.md')`. `loadTaste()` demonstrably reads from that directory (`taste.mjs:50-80`: `const themesMd = read('themes.md')`). You asked "did I miss a reader? anything that globs a memory's directory?" — I cannot enumerate readers I can't see, but your placement decision maximizes the blast radius: the shelf for the one profile governed by the corpus law is stored *inside the corpus VAULT*, in the one directory the taste loader is guaranteed to walk. Every future "read all markdown under `VAULT/taste/`" now must remember to exclude `shelf.md` — which is **exactly the "filter every future code path must remember" failure mode you claimed file separation eliminated**. You avoided it for kept-vs-shelf and reintroduced it for vault-vs-taste.

**[HYPOTHESIS, unquantifiable] `CORPUS_MARKER` evasion.** The regex isn't in the packet; any name-list marker is evadable by spacing/punctuation ("mid library dot io"), and the check runs on collapsed text only — `sref` traveling as a *field* is never checked by `validateSavedPrompt` at all (relevant only to the `/api/make` path above, not the shelf).

---

## WP2 — The parse contract. Your writer and your reader disagree, and the disagreement eats favourites.

**[P1, reproduced from code] Round-trip collisions make saved prompts immortal, unpromotable, and infinitely duplicable.**

`shelveFor` writes `- ${v.text}` with no check that the line re-parses to `v.text`. `parseBullets` (`taste.mjs:50-80`) then mutates the line on read:

```js
.map((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^`|`$/g, '').trim())
.filter((l) => l && !/^\(/.test(l));
```

Take text `` `silver birch at dusk` `` (passes `validateSavedPrompt`: ≥3 words, no `--sref`, no marker). File line: `` - `silver birch at dusk` ``. `readShelf` returns `silver birch at dusk` — **not the text that was saved**. Consequences, all deterministic:

- `shelveFor`'s duplicate check (`parseShelf(md).includes(v.text)`) never matches → every repeat ♥ Save appends another identical line. Unbounded duplication.
- `promoteFor`: `readShelf(...).includes(text)` → false → 400 *"that prompt is not on this memory's shelf."*
- `unshelveFor`: same membership check → 400 *"not on this memory's shelf."*

A zombie favourite: written, unreadable, undeletable through the API. Same failure for any text **ending** in a backtick, starting with `- ` or `* ` (one bullet marker stripped on read → text mismatch), or starting with `(` (the `/^\(/` filter drops the line entirely). Reachability caveat: card-generated prompts may rarely start with these characters, but the endpoint accepts arbitrary text and the UI offers Copy/paste flows. The general defect: **the writer never asserts `parse(write(text)) === text`.**

**[P1, reproduced from code] Two different regexes decide "the shelf heading exists," and they disagree at end-of-file.** `shelveFor`:

```js
if (!/^## Shelf/m.test(md)) md += '\n## Shelf\n';
md = md.replace(/(## Shelf\n)/, (m) => `${m}- ${v.text}\n`);
```

The test matches `## Shelf` at EOF **without** a trailing newline; the replacement requires one. If `shelf.md` ends with `## Shelf` and no final newline — which any editor with trim-final-newline produces, in the directory you explicitly hand-edit — then: heading test passes → no append; replacement doesn't match → `md` unchanged → `writeFileSync` writes the file back **byte-identical** → returns `{ ok: true, duplicate: false, shelved: 0 }`. The UI says *"Saved. 0 on the shelf."* Nothing was written, and **every subsequent save fails the same way until the file is hand-fixed**. Now chain it: in that state, `demoteFor` → `unkeepFor` ok → `shelveFor` returns `ok:true` while writing nothing → **an exemplar is removed from steering, lands on no shelf, and the response says success.** That is your "neither list, silently lost" outcome with no crash and no concurrency. (`unshelveFor`'s `split().filter().join('\n')` preserves trailing newlines, so the server's own writes don't trigger this — a single hand-save without final newline arms it permanently. Check whether `keepFor` shares this replace idiom; the `$&` comment implies shared lineage — HYPOTHESIS that kept.md has the same latent no-op.)

**[P2, HYPOTHESIS] BOM before a first-line `## Kept`.** `\uFEFF## Kept` doesn't split on `/^##\s+/m`, the section merges into the preamble, `parseKept` returns `[]` — an editor-BOM on the hand-edited `kept.md` silently voids *all* steering material with zero error. Deterministic given the bytes; editor-dependent in practice. `\r\n` is safe (final `.trim()`). A code-fenced `## Kept` inside `shelf.md` is irrelevant — nothing feeds shelf.md to `parseKept`; it matters only if shelf content is ever concatenated into a kept-shaped string.

---

## WP4 — The epoch mechanism itself holds; the claims around it don't fully.

What I **cannot** break: from the shown code, identity changes require the assignments, same-value assignment correctly doesn't bump, and changed-and-changed-back is caught because the counter is monotonic. The mechanism is sound **for the seven call sites that opt in**.

What's wrong:

- **[P2] The guard protects identity, not content.** `world().changed()` compares a counter bumped only by profile/project assignment. Sean hand-edits `kept.md` while a Judge read is in flight → the old list renders as fresh, `changed()` false. F0's claim "can no longer write or render into the wrong memory" is true only for the wrong *identity*; the wrong *version* of the right memory is unguarded by design, in the one memory that is edited outside the tool.
- **[P2] "Seven reads" is a hand-maintained manifest** — precisely the "rule every future code path must remember" that you reject as a design for filters. An eighth read added next month without `world()` is unprotected and nothing notices.
- **[P2] Bootstrap identity is unvalidated and epoch-less** (`app-shell.js:19-62`): `params.get('profile')` — `?profile=sean%20` initializes `_profile = 'sean '`, no slug check, and every request 400s with no hint. Fine for a local tool; noted because the server validates slugs and the shell doesn't.
- **[HYPOTHESIS] Bypasses I cannot rule out from the packet:** `loadProjects()` writing the `<select>` without an assignment (if any handler fires on programmatic mutation); a `popstate`/`hashchange` handler that re-reads `?profile=` into state; any second instance of the shell object across files (`S()` per-file). If any of these exist, the "no way to change the memory without moving the epoch" claim is false in exactly the way that matters.

---

## Additional findings

- **[P1] `♥ Save` can change generation — the tooltip and your headline claim are false at the gesture level.** `app-make.js` `act('save')` posts `state:'shelf'`; the route's shelf branch, for a prompt that is currently steering (non-sean), calls **`demoteFor`** — it removes a score-1000 exemplar. The card tooltip says *"It is remembered and changes nothing about what gets generated."* One toast ("Demoted…") is the only notice, and the card UI shows no current state, so the user cannot predict which action ♥ will perform. Natural impulse "♥ the ones I steered" = silent un-steering of every future batch.
- **[P2] `body.profileId ?? DEFAULT_PROFILE`** (routes-favourites.mjs): an under-specified request silently targets **sean/default** — the constitutional memory is the fallback for sloppy callers. Inverted defense-in-depth.
- **[P2] `state:'none'` on sean when the prompt is steering** returns 400 *"edit taste/kept.md"* — even when the prompt is *also* on the shelf and could at least be unshelved. Minor, but the refusal branch shadows a satisfiable sub-request.
- **[HYPOTHESIS] `state:'steer'`, non-sean, non-existent project**: the route checks `isProjectId` but not existence; `shelveFor` checks `memoryExists`, `keepFor` (unseen) may not — a favourite click could mint a memory directory. Conditional on `keepFor`.

---

## Claims that are simply false

1. *"♥ Save … contributes exactly zero to generation."* **False as a claim about the gesture**: ♥ Save on a steering prompt demotes it (route shelf branch → `demoteFor`). True only about the shelf-write path in isolation.
2. *"This way a failure can only ever leave it where it started"* (`promoteFor` comment). **False three ways**: the compensation's result is discarded and can itself fail (contract tightening); `shelveFor` can return `ok:true` while writing nothing (trailing-newline no-op); and the sean route path has no compensation at all.
3. *"The steer path calls the SAME keepFor()/CLI that /api/keep calls"* / *"Steer contributes exactly what Keep always did."* **False in the only case that matters**: `/api/keep` presumably reports the CLI's failure; this route returns `ok:true` unconditionally on the sean path. Same channel, fabricated status.
4. *"a callback that resolves after the memory has changed can no longer write or render into the wrong memory."* **True only for the seven opted-in reads.** Wrong-memory writes via stale DOM (WP5) are unguarded, and wrong-*version* renders (content staleness) are unguardable by an identity epoch.
5. *"ONE CONTRACT, NOT TWO."* The route holds **three validation postures** in one function: explicit `validateSavedPrompt` for sean-steer, `shelveFor`'s internal validation, and whatever `keepFor` does for direct steers. One function, one file, three contracts.

## What you over-built

- The compensating writes (`promoteFor`/`demoteFor` re-shelve/re-keep) that **pretend** to be transactions while their results are discarded — ceremony simulating atomicity that two non-atomic `writeFileSync` calls cannot deliver. Either journal it or don't pretend.
- `duplicate` flags returned by `shelveFor` that the route's message layer half-uses; the `epoch` getter nobody reads; the `WHO` map in the excerpt for decoration.
- The route-level sean pre-validation: if `keepFor` validates, it's redundant; if it doesn't, the non-sean path is the hole. You paid the ceremony cost on the safe branch and skipped the guard on the uncertain one.
- Meanwhile the cheap, load-bearing check — `parse(write(x)) === x` on save, and a card-captured `world()` check in `act()` — is absent. You guarded reads against time and left writes against space unguarded.

## Ranked summary

- **P0:** sean steer path — unconditional `ok:true` + uncompensated unshelve + substring-vs-line-exact disagreement (routes-favourites.mjs, `if (isSean)` branch).
- **P1:** round-trip parse collisions (zombie/duplicating favourites); `shelveFor` silent no-op at EOF-no-newline and its demote-path data loss; ♥-demote contradicting the zero-contribution claim; stale-card click-time writes into the wrong memory with `sref` field (HYPOTHESIS, P0-if-`/api/make`-unchecked); promotion without re-validation (HYPOTHESIS on `keepFor`).
- **P2:** non-atomic two-write crash windows; discarded compensation + contract tightening orphaning; shelf-inside-VAULT placement; identity-not-content epoch gap; hand-maintained guard manifest; unvalidated bootstrap; `?? DEFAULT_PROFILE` fallback to sean; BOM-vs-`## Kept`; sean `state:'none'` shadowing.

---

## The single highest-severity defect and its reproduction

**The sean steer branch of `POST /api/favourite` (`routes-favourites.mjs`, `handleFavouriteRoutes`, `if (isSean)` block) reports success unconditionally after irreversibly stripping the shelf — so a refused keep is reported as a steer, and the prompt ends up in neither list.**

Reproduction:

1. ♥ Save `calm ocean dawn` on sean/default → `taste/shelf.md` gains `- calm ocean dawn`.
2. Hand-edit `taste/kept.md` (which the design says you do): under `## Kept` add `- calm ocean dawn light over the harbour`. (Any line anywhere in the file containing the text as a substring works — including under `## Killed`, because per your own description the CLI's duplicate check scans the whole file.)
3. `POST /api/favourite {"profileId":"sean","projectId":"default","state":"steer","prompt":"calm ocean dawn"}`.
4. Route: `steering` = `loadTaste().kept.includes(...)` — **line-exact** → `false`. `validateSavedPrompt` → ok. `onShelf` → true → **`unshelveFor` deletes it from shelf.md**. Then `cli(['--keep', 'calm ocean dawn'])` → CLI's **substring** check hits the longer kept line → refuses (or dedupes without writing).
5. Response: **HTTP 200, `{ok: true, state: 'steer', …}`**. The Make tab toasts success.
6. Final state: the prompt is on **no list**. Generation unchanged. Owner believes it steers. The only artifact is a toast.

Step 4's CLI refusal depends on the CLI's exact behavior (unseen — HYPOTHESIS on its specifics, per your own description of `appendKept`). But the fabricated `ok:true` and the uncompensated unshelve are unconditional in the shown code: **any** CLI failure mode — rejection, malformed hand-edited kept.md, missing binary — produces the same outcome. A `promoteFor`-shaped compensation and an `ok` derived from the CLI's result would each have prevented it; the branch has neither, in the file whose header declares that exact bug shape forbidden.
