# GLM Consult

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/panel-favourites-f0f1-2026-08-27/PACKET.md
**Tokens:** 8166 in / 24873 out (reasoning: 21242) | total 33039
**Wall:** 494.8s

---

# Findings

## P0

**P0-1 — Sean's steer path commits the unshelve before the CLI runs, never checks the CLI's verdict, and always answers 200.**
`routes-favourites.mjs`, `state === 'steer'`, `isSean` branch:

```js
if (onShelf) unshelveFor(profile, project, text);
json(res, 200, { ok: true, state: 'steer', message: cli(['--keep', v.text]) });
```

Three independent defects on two consecutive lines:

1. The shelf removal is committed **before** the CLI keep, and there is no rollback anywhere in the branch — unlike `promoteFor`, which at least tries. If `cli()` throws (kept.md unwritable, CLI binary missing, non-zero exit surfaced as an exception), the exception propagates out of `handleFavouriteRoutes` after the unshelve has already been written. The prompt is in **neither** `shelf.md` nor `kept.md`.
2. The return value of `cli()` is pasted into `message` and the response is hardcoded `ok: true`. Whatever the CLI prints — including a refusal — is reported as success. The UI (`app-make.js` `act()`: `Swan.say(r.ok ? r.message : r.error)`) will show the CLI's refusal text inside a success toast at best, "Steering." at worst.
3. This is where the two validators meet, and they do not agree: the route's "already steering" check is `loadTaste().kept.includes(text)` — line-exact against parsed bullets — while the CLI's duplicate check is (per the packet's own description) a **substring match against the whole file**, including `## Killed` and `## How to add`. So the route says "not steering," the CLI says "duplicate/refused," and the code above destroys the shelf entry in between.

Reproduction at the end of this review.

## P1

**P1-1 — "A failure can only ever leave it where it started" (promoteFor docstring) is false, three ways.** `favourites.mjs`, `promoteFor` / `demoteFor`.

- **(a) A throw skips the rollback.** `const kept = keepFor(...)` — `writeFileSync` inside `keepFor` throwing EACCES/ENOSPC propagates straight through `if (!kept.ok) { shelveFor(profile, project, text); return kept; }`; there is no try/finally in either function or in the route. Repro: shelve a prompt for `partner/x`, then `chmod 444` the project's `kept.md`, POST steer → 500, `shelf.md` no longer contains the line, `kept.md` never gained it.
- **(b) The rollback re-enters the same validator, and its result is discarded.** Hand-edit a shelf bullet to `- --sref 999 cold sea dawn study`, then promote: `unshelveFor` **succeeds** (it doesn't validate), `keepFor` refuses, the rollback calls `shelveFor` — which refuses the same text for the same reason — and the return value is ignored. The line is destroyed by a *failed* promote, and the user sees `keepFor`'s error believing the item is still shelved. `demoteFor` has the identical shape for a hand-edited `kept.md` line that fails `validateSavedPrompt` (e.g. a one-word line): unkeep succeeds, shelve refuses, rollback `keepFor` either refuses (item destroyed) or — if `keepFor` does not internally validate (HYPOTHESIS, its body is not shown) — an `--sref`/corpus line is silently re-written into a partner's `kept.md` **unvalidated**, which is a constitutional breach, not a P2.
- **(c) Crash between the two `writeFileSync` calls leaves it in neither list**, and there is no recovery path: a subsequent `state:'none'` only removes from the list it finds, leaving the half-state permanently.

**P1-2 — `parseBullets`' `!/^\(/` filter blackholes saved prompts: saved, invisible, infinitely duplicable, undeletable.** `taste.mjs` (`parseBullets`, last `.filter`), interacting with `validateSavedPrompt` (which has no paren rule).

Repro, API only, no hand-editing, against `sean/default`:
1. POST `/api/favourite` `{state:'shelf', prompt:'(study) soft rain on a tin roof'}` → 200 `Saved. N on the shelf` where N **excludes** it (the filter runs in the count too).
2. The line is appended to `shelf.md`. `readShelf` never returns it, so `onShelf` is false forever.
3. POST the same thing again → `duplicate:false`, a second identical line appended. Unbounded file growth.
4. POST `state:'none'` → 400 `"that prompt is not on this memory's shelf"` while the file visibly contains it. `promoteFor` likewise refuses.

The paren rule exists for `kept.md`'s "example bullet" convention (`## How to add`); importing it into user data via the shared loop is exactly the "one loop, two dialects" failure the docstring claims the loop prevents. Same round-trip class: a prompt wholly wrapped in backticks passes validation, is stored with them, and is read back **without** them (`.replace(/^`|`$/g, '')`), so duplicate detection and `onShelf` never match.

**P1-3 — The section splitter is fence-oblivious; hand-edited `kept.md` can gain phantom exemplars or silently lose real ones.** `taste.mjs` `parseBullets`: `split(/^##\s+/m)` honors code fences not at all.

Repro (trace, exact): `kept.md` — which for sean is *hand-edited by design* — contains a pasted snippet inside a fence:

```
## Kept
- real prompt one

someone asked for the format:

```md
## Kept
- fake exemplar
```

- real prompt two
```

`split(/^##\s+/m)` cuts at the fenced heading. The real `## Kept` section now ends at the fence — `real prompt two` silently leaves the generation pool — and a section whose text is `Kept\n- fake exemplar…` matches `/^kept\b/i`. If the real section is ever renamed or reordered, `.find` returns the fenced fake and a phantom enters the pool at score 1000. Related: any later heading of the form `## Kept — archived` **does** match `\b` (dash is a non-word char), so a duplicated section is silently ignored after the first. The same mechanism applied to `shelf.md` makes saved items unreadable while `shelveFor`'s duplicate check keeps missing them.

**P1-4 — The unguarded click-time writes can land in the wrong memory, during exactly the window the epoch was built to close.** This constructs your attack #5.

The switch handler is `Swan.profile = X; Swan.project = null; await loadProjects();`. During that await the event loop is free and the Make grid still shows the **old** memory's cards (re-render happens on `memoryChanged()`, which fires at the end). `act()` reads identity at click time (`app-make.js`, save/steer branch: `profileId: Swan.profile, projectId: Swan.project`). A click in that window POSTs `{profileId:'partner', projectId:null, prompt:<sean's prompt>}`. The route then does `body.projectId ?? DEFAULT_PROJECT` — `null ?? 'default'` → `'default'` — so sean's prompt is written to `partner/default`'s shelf (or, if the switch was *toward* sean, a partner prompt lands in `VAULT/taste/shelf.md`, one promote away from steering the owner's memory). Deterministic given the click; the epoch guard is irrelevant because the write is addressed by identity read *after* the bump. The `?? DEFAULT_PROJECT` coercion deserves its own mention: any client that omits or nulls `projectId` silently targets the owner's memory instead of erroring.

**P1-5 — `shelveFor` on a CRLF `shelf.md` reports success and writes nothing.** `favourites.mjs`, `shelveFor`: `md.replace(/(## Shelf\n)/, …)` cannot match `## Shelf\r\n`, while `/^## Shelf/m` still matches (so no duplicate heading is appended), and `writeFileSync` then writes the byte-identical file. Response: 200, `Saved. N on the shelf`, N unchanged, prompt absent. Repro: create `shelf.md` in any Windows editor (or let `core.autocrlf` touch it) with a `## Shelf` heading, ♥ Save, observe the file unchanged. The author knew about `\r` — `unshelveFor` splits `/\r?\n/` and rewrites the whole file as LF — so the two writers disagree about line endings, and ironically `promoteFor` "works" only because its unshelve heals the file before the save would have failed.

## P2

- **BOM / `##Shelf` blackhole.** A `shelf.md` whose first line is `\uFEFF## Shelf` (BOM, no preceding H1) never splits (`^##\s+` can't match after the BOM), so `parseShelf` returns `[]` forever; `shelveFor` still appends bullets after the BOM'd heading, reports `shelved: 0`, duplicate detection is dead, and `unshelveFor` refuses everything as "not on this memory's shelf." Written-but-unreadable and API-undeletable. Same for `##Shelf` with no space. Requires a hand-created file, hence P2 — but the reader is the file-level reader you told me to check, and it fails open.
- **Non-sean steer never validates in the route.** `validateSavedPrompt` is called only in the `isSean` branch; the partner path hands `text` straight to `promoteFor`/`keepFor`. "ONE CONTRACT governs both halves" is enforced at shelve-time and at sean-time only. Whether promotion of a *hand-edited* shelf line is validated depends entirely on unshown `keepFor` internals (HYPOTHESIS: it validates; if it doesn't, corpus material reaches a partner's steering list, which upgrades this).
- **Flag-shaped prompts reach the CLI as argv.** `validateSavedPrompt` blocks only `--sref`; `- leading dash prompt here` or `--keep x y` passes and is passed as `cli(['--keep', v.text])`. Whether that mangles into flags depends on the CLI's parser (HYPOTHESIS, CLI not shown) — but the route-side gap is visible.
- **`readShelf`/`readKept` run before existence narrowing.** For a well-formed slug with no project record, the route calls `projectDir` via `shelfPath` before its own nice 400s; if `projectDir` throws on unknown projects (HYPOTHESIS), the route 500s.
- **Concurrency.** Same-prompt requests are race-free *only* because every mutator is fully synchronous and every route read happens after the single `readBody` await — an implicit invariant, not a designed one. If `cli` is async (HYPOTHESIS on its contract), the isSean branch opens a real interleaving window between `unshelveFor` and the CLI write, and `message` becomes a JSON-serialized Promise (`{}`). Conversely, a synchronous `cli` freezes the entire event loop for the subprocess — the serialization is real but it's bought by blocking every other request.
- **Unguarded renders in `act()`.** `Swan.say(...)` and `status()` fire into whichever memory is current when the POST resolves; a late response prints the old memory's queue message under the new memory's tab. Cosmetic, but it is a render the F0 docstring claims this class of bug doesn't do anymore.
- **`judge.progress()`** checks `world.changed()` before `await r.json()` but not after; the returned count can still be old-world if the swap lands during the parse (HYPOTHESIS: depends on the caller inserting it unguarded). **`judge.load()`** does `await r.json()` with no `r.ok`/try — a non-JSON 500 leaves "loading…" forever.
- **Nested sub-bullets** (`  - note`) match `/^\s*[-*]\s+/` and parse as standalone items in both lists.

## Your seven questions, answered flatly

1. From the shown code, no reader globs a memory directory; the shelf is inert **in the shown readers**. HYPOTHESIS: `compileProfile`/`ownSubjects` are not shown, and `shelfPath` deliberately places `shelf.md` inside `VAULT/taste/` for sean — the one directory a "read all my taste markdown" glob would walk. That placement is the standing risk.
2. `## Shelf` cannot match `/^kept\b/i` — that specific claim holds. The reader breaks elsewhere: fences (P1-3), parens (P1-2), backticks, CRLF (P1-5), BOM.
3. Both-lists is prevented at rest; **neither-list is reachable** four ways (P0-1, P1-1a–c).
4. The setter placement holds for assignment-driven changes. The hole is that click-time addressing reads the *new* identity against the *old* card (P1-4). URL/`replaceState` sync without an assignment would also bypass the bump (HYPOTHESIS, code not shown).
5. Constructed: P1-4.
6. They disagree — line-exact vs whole-file substring — and the route's hardcoded 200 hides the CLI's verdict (P0-1).
7. Shelf-time validation covers only API-written items; hand-edited shelf lines are checked, if at all, at promote — see P1-1b. `CORPUS_MARKER`'s coverage is unverifiable from the packet (HYPOTHESIS).

## Over-built

Seven guarded reads protect the low-risk half (reads) while every proven cross-memory defect here is on the unguarded write half — the ceremony is complete where the risk isn't. `promoteFor`/`demoteFor`'s rollback-through-the-same-validator is machinery that actively destroys data where "validate, then move, no rollback" would be simpler and safe. The route's `steering`/`onShelf` pre-computation produces bespoke 400 prose for state combinations the mutators already handle. `world().label` is dead weight.

---

## Highest-severity defect

**P0-1: the sean steer path unshelves before the CLI, has no rollback, and returns `ok: true` regardless of the CLI's verdict.** It silently destroys a saved prompt on an ordinary gesture, and lies about it in the response.

**Reproduction (shown code only, no dependence on unshown internals):**
1. `chmod 444 ~/…/taste/kept.md` (or point the CLI at a missing binary — any `cli()` throw).
2. In the Make tab, ♥ Save any valid prompt, e.g. `cold harbour rain at dawn` → `shelf.md` gains the bullet; 200 `Saved.`
3. Click **Steer** on the same card.
4. Route: `steering` is false (line-exact), `validateSavedPrompt` passes, `onShelf` is true → `unshelveFor` **writes** — the bullet is removed from `shelf.md` — then `cli(['--keep', …])` throws → the exception exits the handler; nothing catches it; the rollback that exists in `promoteFor` does not exist on this path.
5. Observe: the prompt is in neither `shelf.md` nor `kept.md`. The user's save is gone.

**Variant without permissions (per the packet's own description of `appendKept`):** put `- storm light over the harbour, slow shutter, cold dawn rain` under `## Killed` in `kept.md`; ♥ Save `storm light over the harbour`; Steer. The route's line-exact check says not-steering, the CLI's whole-file substring check refuses it as a duplicate of the killed line, and the code above has already deleted it from the shelf — but the response is `200 {ok:true}`, so the UI reports success. The item is in neither file and nobody is told.
