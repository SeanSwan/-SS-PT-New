---
decision: "Full session handoff: ComfyUI stopped charging, 15 launchers got icons, the Taste Console shipped all five blueprint slices, and Favourites is blueprinted. Both open decisions answered; F0 (world epoch + browser suite) built and committed. Next agent starts at F1."
status: open
supersedes: none
board: SWA-186
date: 2026-08-27
author: "Opus 5 (VS Code terminal). Panel seats used: Ox Alpha, GLM 5.3, GLM 5.3 Flash — all $0."
privacy: IDs and roles only. No PII, no keys, no client names.
---

# Session handoff — Taste Console + Favourites

**Read this file, then `FAVOURITES-BLUEPRINT-2026-08-27.md`. That is enough to continue.**

You are picking up a session that ran long. Everything below is verified state, not recollection —
commits, measurements and file paths were re-read at handoff time.

---

## 0. The 60-second version

Three unrelated pieces of work happened, in this order:

1. **ComfyUI stopped asking Sean to pay.** It was opening on a paid cloud template. Fixed.
2. **All 15 Desktop launchers got SwanStudios icons**, plus a tool to make more.
3. **The Swan Taste Console** — a five-slice redesign of Sean's local taste tool. **All five slices
   shipped.** Then a hostile review found three live bugs, all fixed.
4. **Favourites** (save a prompt you like) is blueprinted. **Both open decisions are now answered**
   (shelf-by-default; `Keep` → `Steer`), and **F0 is built and committed** — the world epoch, five
   guarded reads, and the first automated coverage the client-side files have ever had (§13).
   **You start at F1.**

**Nothing is pushed.** SS-PT is 66 commits ahead of its remote (most predate this session).
swan-taste-brain is a local repo on `master` with **no remote at all** — commits are the only record.

---

## 1. Where the code lives (two repos, do not confuse them)

| | Path | Remote |
|---|---|---|
| **SS-PT** (the SaaS + all docs) | `%USERPROFILE%\Desktop\quick-pt\SS-PT` | yes, branch `wip/comms-notifications-2026-07-05` |
| **swan-taste-brain** (the tool this session mostly built) | `%USERPROFILE%\Desktop\swan-taste-brain` | **none — local only** |

The taste brain is **not** part of SS-PT. It is plain HTML/CSS/vanilla JS served by a small Node
server. **No build step, no framework, no bundler, no runtime npm dependency.** Any proposal needing
React, Tailwind, or an install is rejected on arrival. The SS-PT design skills are written for
styled-components — carry their *palette and law*, not their *stack rules*.

### Running it

- **Prompt server:** `node prompter/serve.mjs` → `http://127.0.0.1:7331` (**up right now**)
- **ComfyUI:** Sean's `Swan Local Video 5090.cmd` on the Desktop → `:8188` (**DOWN right now**)
- Tests: `node prompter/<suite>.mjs` from the **repo root** — fixtures resolve relative to it.
  Ten suites: `test test-probe test-modes test-bundle test-taste-namespace test-renders test-make
  test-range test-video test-round3`. **All 10 pass, exit 0, ~494 assertions.**

**Restart gotcha, cost me twice:** both server instances share an identical command line and differ
only by environment. Kill by *listening port*, not command line:
`Get-NetTCPConnection -LocalPort 7331 -State Listen`. A second instance can't bind, dies silently,
and leaves the first serving stale code — the launcher's own comments warn about this.

---

## 2. What the tool is, and the one law that governs it

A local creative tool. Sean judges grids of 12 photographs — **the reason for a pick is locked in
before the picture is revealed**, a picture is never shown twice, Undo restores a grid. That
compiles into three named **Directions**. **Make** writes prompts in that memory's taste and queues
them to his own GPU. What he decides is right lands in **Gallery**.

**A "memory" is `profile × project`.** Profiles: Sean, a partner (her own business), a client mode
used for sales role-play. A memory starts empty and inherits nothing.

> **THE LAW: a memory generates only from its own evidence.** Sean subscribes to a third-party
> reference archive; only his own memories may draw on it. This was found broken at six separate
> layers in an earlier review. Treat it as constitutional. `test-round3.mjs` (90 assertions) exists
> almost entirely to defend it.

---

## 3. Commits, in order

### swan-taste-brain (`master`, no remote)

| SHA | What |
|---|---|
| `f931c41` | **Slice 1** — design tokens, the profile spine, `.plate` treatment |
| `ed4fdbf` | **Slice 2** — three sections, rail + bottom bar, per-profile landing |
| `e34a0dc` | **Slice 3** — Gallery: `<dialog>` lightbox, filter, image discipline |
| `c878a29` | **Slice 4** — the GPU queue pill, "Again / Four ways" |
| `83d9455` | **Slice 5** — presentation mode, printable brief |
| `b4240c8` | **Three live bugs fixed** (see §6) |

### SS-PT

| SHA | What |
|---|---|
| `72ef9ae40` | Swan launcher icon tooling |
| `229ee88e0` | Icon tool hardened after review; all 15 launchers wired |
| `ad7878bd4` | Taste Console blueprint + Ox/GLM panel |
| `0fc0cc411` | Favourites panel + arbitrated blueprint |

---

## 4. ComfyUI — done, with one manual step still owed by Sean

**Symptom:** ComfyUI opened on `api/minimax-h3…i2v` and kept asking to buy credits.

**Two causes, both fixed:**
- `C:\ComfyUI\user\default\comfy.settings.json` pinned `"MiniMax H3"` as the template default →
  cleared to `[]`. Backup alongside.
- `Desktop\Swan Local Video 5090.cmd` didn't pass `--disable-api-nodes` → added. Backup alongside.

**Proven on a spare port (8189), not by restarting his server:** 227 paid API nodes → **0**, all 13
node types his SWAN workflows use still present, both Swan custom nodes still load, CSP
`connect-src 'self'` so the page can't reach comfy.org. `MiniMaxH3ImageToVideo` reports
`api_node: false` — it's the **local** open-weights node, not the paid endpoint of the same name.
ComfyUI Manager was already off, so nothing was lost.

> ⚠ **STILL OWED BY SEAN:** the stale API-template tab lives in *his browser's* localStorage
> (`Comfy.Workflow.LastActivePath:personal`). One tab-close, once. **Not automatable** — the
> frontend exposes no workflow-open API and his browser profile isn't reachable from the agent.
> A fresh-profile probe confirmed the server's default is the stock graph, so the flag alone would
> have left him staring at missing-node errors. Do not claim this is finished until he closes it.

---

## 5. Launchers — done

All 15 Desktop `.cmd` launchers now have SwanStudios icons. **A `.cmd` cannot carry an icon** —
Windows draws the generic batch glyph and nothing inside the file overrides it. The icon lives on a
`.lnk` shortcut, which is how two of his launchers already worked.

Tooling at `SS-PT/scripts/launchers/icons/`:
- `swan_icon.py` — `build` draws the mark; `convert` turns a PNG into a proper 10-size `.ico`
- `Set-SwanLauncher.ps1` — builds the `.lnk`, wires it, nudges the icon cache. `-List` audits.
- `audit_launchers.py` — is a launcher still alive? **Biased toward false BROKEN; a BROKEN verdict
  is a prompt to read the file, not a verdict.** All 15 are live.
- `README.md` — carries the **ChatGPT prompt** for the real artwork. The shipped mark is an explicit
  placeholder.

Hardened after review: refuses to hijack a pre-existing `.lnk` without `-Force` (it would otherwise
repoint someone's shortcut while its Arguments and Hotkey rode along); icon filenames hash-suffixed
against collision.

---

## 6. The Taste Console — all five slices shipped

### What it looks like now

Three sections — **Judge · Make · Gallery** — with a 72px left rail on desktop and a 60px bottom bar
on phones. A 3px **profile spine** across the top whose colour is the active memory's profile, with
a text label beside it so identity is never colour-only. A **GPU pill** in the header. Gallery has a
lightbox, a filter, and a **Present** mode that strips every internal marking for client viewing.

### Files (all under the 300-line rule)

```
app-shell.js     204   sections, landing, the spine
app-make.js      129   prompt generation (pre-existing, barely touched)
app-judge.js      97   judging (pre-existing, NOT touched)
app-directions.js 128  compiles directions; renders into Make AND Gallery
app-kept.js       70   kept prompts
app-gallery.js   284   lightbox, filter, presentation, render-plate actions  ← nearest the cap
app-status.js    102   the GPU pill
console.css      192   tokens, spine, plate          (slice 1)
console-nav.css  209   rail, bottom bar, Make layout (slice 2)
console-gallery.css 246 lightbox, filter, presentation, print (slices 3+5)
app.html         145
```

### The cascade discipline — read before touching any CSS

Everything lives in **`@layer slice1`** so the two pre-existing stylesheets (`probe.css`, `app.css`)
win every conflict *by cascade*, not by audit. **Unlayered author CSS beats layered CSS regardless
of specificity.**

**Seven rules deliberately sit unlayered**, each because it must beat a pre-existing rule. They are
documented in place with the rule they beat. Do not "tidy" them into the layer:
the rail's layout offset · the phone padding · a checkbox reset · `main > section[hidden]` ·
the presentation block · the print block · a search-field reset.

**I put CSS outside the layer by accident twice.** Check nesting depth after any block insert.
Sometimes unlayered is *correct* — presentation mode must beat `app.css`'s `.picks`/`.dirs` grid
rules — but decide it, don't inherit it from a bad paste.

### Bugs found across the five slices — the pattern is the lesson

| Bug | Root cause |
|---|---|
| **The sections never actually hid** | `main > section { display: block }` in app.css overrode the UA's `[hidden]`. `show()` set `.hidden = true` correctly the whole time with *no visual effect* — switching tabs only scrolled. |
| Every labelled input was **160px tall** | `input { flex: 1 1 160px }` written for a ROW container; the label wrappers are `column`, where that basis becomes *height*. |
| Adding `width`/`height` attributes **broke the layout** | The HTML `height` attribute is also a presentational hint. `height: auto` is the required other half. |
| Two stale section-name guards | After the rename, `current === 'kept'` / `'directions'` never fired — memory switches stopped refreshing Gallery. |
| The printable brief had **no directions** | Slice 2 moved them to Make's rail and never gave Gallery a copy. |
| **14 style codes in the client-facing view** | One Ctrl+P from a client's hands. |

### The three bugs found in the final review (commit `b4240c8`)

1. **`Copy as text` and `Print / PDF` were completely dead — since slice 2.** Bound inside `mount()`,
   which `app-shell.js` only runs for tabs with a matching `#tab-<name>` element. Slice 2 deleted
   `#tab-directions`. **Slice 5 then built an entire printable brief on top and "verified" it with
   print-media emulation — which drives the stylesheet and never presses the button.**
2. **Presentation mode threw a `TypeError` every time** on a fresh page. It *looked* fine because
   the body class toggles before the throw, so every assertion passed while an exception fired.
3. **The Gallery filter silently stopped applying** after a kept-list repaint.

---

## 7. ⚠ The methodological warning — the most valuable thing in this file

**Every console guard across all five slices was a manual browser probe, written ad hoc and thrown
away. There is not one automated test for any of it.** The 10 Node suites cover the corpus law, the
writer, generation and the API — none of them touch the console.

**Three separate times this session, my checks reported success while something was wrong:**
- I read `el.hidden` (the property) instead of computed `display` → missed that nothing ever hid.
- I asserted presentation mode engaged → it did, while throwing an uncaught TypeError underneath.
- I verified the print *stylesheet* → while the print *button* was dead.

**Do this from your first probe:**
```js
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
// ...and assert errors.length === 0 in every browser check you run.
```
Attaching that listener is what found bug #2 after five slices of missing it.

**UPDATE 2026-08-27 — this now has a durable home.** `prompter/test-browser.mjs` (31 checks) is a
real suite with the listener attached before navigation and an assertion after every group. Run it
rather than writing a throwaway. It borrows Playwright from the SS-PT checkout beside it and, when
it cannot find one, **skips loudly and says it proved nothing** — a skip that reads as a pass would
be this same failure in new clothes. The discipline below still binds for anything it does not
cover.

**Corollary, stated as a rule:** proving the mechanism is not proving the symptom. Verify the thing
the *user touches*, in the state *they* have it.

---

## 8. WHERE YOU START — Favourites, blueprinted and unbuilt

Full spec: **`FAVOURITES-BLUEPRINT-2026-08-27.md`**. Raw seat returns in
`panel-favourites-2026-08-27/`. Summary:

### The trap — understand this before writing a line

**`Keep` is not a bookmark.** A kept prompt re-enters generation at **score 1000** — the code's own
words: *"dominates corpus scores; kept work is the strongest signal there is."* A pretty ♥ wired to
Keep would silently reweight every future batch from a gesture that reads as "remember this."

### The ruling

**One list, per memory, two states. Default = SHELF.** `Keep` stays the express steering lane and is
**relabelled `Steer`**. Promote/demote are visible reversible moves. It lives in a **summoned
`<dialog>` drawer** off a header heart chip — **not a fourth section** (both seats refused that
independently; three sections stay three). Force-closed and unreachable in presentation mode.

### ✅ BOTH DECISIONS ANSWERED — 2026-08-27, Sean

1. **Shelf-by-default.** CONFIRMED. The heart saves and does nothing else; a shelved item
   contributes zero exemplars until deliberately promoted.
2. **Relabel `Keep` → `Steer`.** CONFIRMED. Ship the relabel in the same slice as the heart, so the
   pair is never on screen without explaining itself.

Both went the way the blueprint ruled, so §1 of the blueprint stands unamended. **F1 is unblocked.**

### Build order — F0 first, and F0 is not ceremony

| # | Slice | |
|---|---|---|
| ~~**F0**~~ | ~~World epoch + a `pageerror` listener in every browser probe~~ | ✅ **DONE** — `d200a0a`, see §13 |
| **F1** | **Store + `Save`/`Steer` on Make cards; the relabel — START HERE** | |
| F2 | The drawer: chip, `<dialog>`, list, filter, promote/demote |
| F3 | Ink-rise heart + ember + steering-share bar |
| F4 | Presentation/print exclusion + the 11 F-series tests |

F0 first because three of the last three bugs were invisible to the checks in use. Adding a sixth
surface without fixing the instruments repeats the pattern deliberately.

**The signature moment** is best-of-both: Flash's ink-rise heart (`clip-path` fill, purple glow on a
blue surface) plus GLM 5.3's **ember and steering-share bar** — demoting lets the ember gutter out
while an aggregate bar shrinks, so you *watch generation pressure leave the system*. That makes the
danger legible. Flash's edge-light sweep was **cut**: its job is already done by the heart.

---

## 9. House design law (the parts that actually bind here)

Dark-first. Obsidian `#0A0A0F` · Carbon `#141419` · Graphite `#1A1A24` · Midnight Sapphire `#002060`
· Royal Depth `#003080` · Ice Wing `#60C0F0` · Gilded Fern `#C6A84B` · Frost White `#E0ECF4` ·
Wing Purple `#8B5CF6`.

- **Dual-Button Glow:** blue surface → **purple** glow; purple surface → **cyan** glow.
- **Wing Purple is glow/border only, never text.** Measured: 4.66:1 on Obsidian, and it FAILS
  everywhere else — 4.34 Carbon, 4.07 Graphite, 3.61 Sapphire, 2.86 Royal.
- **A Frost White indicator on gold or ice fails 1.4.11** (1.92:1, 1.70:1). The section marker is
  **Obsidian**, which passes on all three profile colours (8.56 / 9.68 / 4.66).
- Governing law for this tool: **the chrome recedes so the photographs carry all the colour.**
- 44px targets · WCAG 4.5:1 text / 3:1 non-text · `prefers-reduced-motion` · `forced-colors` must
  not make state invisible.
- Banned: default equal 4-up grids · decorative motion with no information job · **any control
  without a wired handler** · retired Galaxy-Swan tokens (`#0a0a1a`, `#00FFFF`, `#7851A9`).

---

## 10. Sean's open actions — remind him, don't silently carry them

- [ ] **Rate ~15–20 SREF codes.** Still the blocker for taste-weighted generation.
- [ ] **Start ComfyUI and do one render.** It captures the graph *and* gives the render-plate actions
      their first non-synthetic exercise (they were tested on a card I built by hand).
- [ ] **Close the stale ComfyUI browser tab** (§4).
- [x] ~~Answer the two Favourites decisions~~ — **both answered 2026-08-27** (§8).
- [ ] `favicon.ico` 404s twice per page load — console noise on a client-facing tool, ~2 lines.
- [ ] **34 QA screenshots at SS-PT repo root** — pre-existing; needs classify-then-approve, not a
      blind sweep.

---

## 11. Working notes that will save you time

- **Heredocs mangle backslashes** in this environment. Use the Edit tool for backslash-heavy Python,
  or write the script to a file first. I lost calls to this **four times**.
- **Git Bash `/tmp` ≠ Node `/tmp`** on Windows. Use absolute scratchpad paths.
- **Create a consult's output directory before dispatch.** `consult-glm.mjs` does `mkdirSync`;
  `consult-ox.mjs` does not — it ran to completion and threw on write, losing the whole response.
- **Both seats agreeing is one estimate, not two.** Both called Wing Purple "borderline, passes";
  computing it myself showed it fails on four of five surfaces.
- **Verify a seat's flagship claim before relaying it.** GLM 5.3 claimed the rating write could
  breach the corpus law across a memory switch. It cannot — the control only renders for
  `sean/default` (`app-make.js:19`) *and* the server refuses any other `profileId`
  (`serve.mjs:244`). The *class* it named (async races) is real and worth F0; that instance is closed.
- **The lane ledger is real.** `node scripts/lane.mjs claim` before editing SS-PT files; another
  agent held `docs/ai-workflow/AI-HANDOFF/**` earlier today. The pre-commit guard will block you
  if you stage files outside your claim — that guard caught another agent's files in my index once.

---

## 12. Panel calibration

| Seat | Cost | Verdict |
|---|---|---|
| **Ox Alpha** | $0 | Refused 6 of 10 feature ideas and was right to. Gave the governing visual law and the lazy-loading failure venue. |
| **GLM 5.3** | $0 | Best architecture thinking (one-store/state-not-lists, the world epoch, the ember + share bar). One flagship claim disproven on inspection. |
| **GLM 5.3 Flash** | $0 | Best implementable detail and the correct default. Was **wrong** on its #2-severity claim that Pillow discards ICO frames — a marker probe disproved it. |

**Total external spend across the entire session: $0.00.**

---

## 13. F0 — built, 2026-08-27 (`d200a0a`, swan-taste-brain)

**What it is.** `Swan.profile` and `Swan.project` are now **accessors**. Changing either moves a
counter in the same tick. Any async boundary guards itself:

```js
const world = Swan.world();
const d = await Swan.api(`/api/kept?${Swan.qs()}`);
if (world.changed()) return;            // the memory moved; this result belongs to nobody
```

**The bump is in the setter, not in `memoryChanged()` — and that is the whole finding.** The
profile-switch handler assigns synchronously and only *then* awaits `loadProjects()`, which is where
`memoryChanged()` runs. A counter bumped there would have left a full network round-trip during
which the identity had already changed while every guard still reported "same world" — precisely the
window a guard exists to refuse. The naive implementation of this slice would not have closed the
bug it was written for. Accessors close it by construction, including for code written later by
someone who never reads any of this.

Assigning the value already held does **not** bump. False staleness is a bug too: it would discard
good in-flight work every time Sean re-picks the memory he is already in.

### What the hostile pass turned up

The blueprint named `app-make.js`. There were **five** memory-scoped reads, and only one was on the
list:

| Surface | Before | Why it mattered |
|---|---|---|
| **Make** | ad-hoc string compare | the batch — **and a second, unguarded read: the workflow/render bar** |
| **Judge** | ad-hoc string compare — **not in the blueprint** | the grid — **and a second, unguarded read: the progress count** |
| **Directions** | **unguarded** | the brief — the client-facing, printed surface |
| **Kept** | **unguarded** | the list |
| **Status** | **unguarded** | the queue pill |

Two things worth carrying forward. First, the string compare was **strictly weaker** than the epoch:
it cannot see a memory that changed and changed *back* mid-fetch, which reads as "same world" by
name and is not. Second, the unguarded three do not merely show stale data — each interpolates the
**live** memory (`WHO[Swan.profile]`) around a payload fetched for the **old** one, so a late landing
shows one person's evidence **under the other person's name**. Kept is the worst of them: its cards
carry `Make` and `Drop`, which address the *current* memory while acting on the *stale* card in
front of them. That is the corpus-law breach shape, reachable from the UI.

### Coverage — and its limits

- **`prompter/test-world.mjs`** (38 checks, no deps, no browser). Evaluates `app-shell.js` against a
  stub DOM via `new Function` and inspects the real `window.Swan`. **The first automated coverage any
  client-side `app-*.js` has ever had.** W6 is the regression proper: the epoch moves at assignment,
  *before any listener runs*.
- **`prompter/test-browser.mjs`** (28 checks). The real page, `pageerror` listener attached before
  navigation, asserted after every group. Drives an actual profile switch through the `<select>` and
  proves the epoch moves before `loadProjects()` resolves.
- **Both static sweeps strip comments first**, so a guard written only in prose cannot satisfy them —
  `app-shell.js` documents the pattern in its own JSDoc and would otherwise have passed on that.
- **Positive-controlled both ways:** removing `app-kept.js`'s guard makes W11 and W12 fail; restoring
  it makes them pass. The suites can fail. Skip path checked too — a dead server prints
  `SKIPPED — proved NOTHING`, never a green banner.

**Verified:** 11 node suites, **534/534**, exit 0. Browser suite **28/28**, zero page errors, zero
console errors, across `/app` `/probe` `/make` `/brief`.

**Not covered, say so plainly:** the guards are proven for the *reads*. Writes that name the memory
in their own request body (`/api/make`, `/api/unkeep` from a card) are addressed at click time and
are deliberately unguarded — their hazard is inherited from whichever list rendered the card, which
is why the reads are what got guarded. If F1 adds a favourite-card action, it inherits that same
shape and should be reasoned about the same way.

### One question F0 raises for Sean

`test-browser.mjs` borrows Playwright from the SS-PT checkout next door because this repo has **no
`package.json` and no install step**, on purpose. That works and degrades honestly, but it means the
browser suite is one `rm -rf node_modules` away from silently skipping. **Whether the taste brain
should take a dev-only install of its own is Sean's call, not something to settle by importing.**
Flagged, not decided.

### The second hostile round — my own green was hiding two more (`03291a9`)

Worth reading in full, because it is the §7 lesson repeating **inside the slice written to fix §7.**

After committing F0 I asked a question I nearly skipped: *which* `await` was the sweep actually
matching in each file? **W12 was file-level.** It asked whether a file contained a guard anywhere —
so it could not fail for any file that already had one, which is exactly the set of files most
likely to grow a second read. It reported green while `app-make.js` and `app-judge.js` each held a
**second memory-scoped read, in a different function, with no guard at all**:

- **`app-make.js` `status()`** — the workflow/render bar. The *same read the status pill makes*,
  which I had guarded. Guarded in one place, not the other, and nothing could see the inconsistency.
- **`app-judge.js` `progress()`** — "N of M grids recorded". That number is what decides whether a
  direction is worth trusting; landing late puts the previous memory's count beside the new
  memory's grid.

Both fixed. W12 is now **per call site**: the guard must be captured in a window above each await
and tested in a window below it. It is a heuristic and says so — it enforces the house convention
rather than proving reachability, and a guard written further away fails on purpose.

**The detector still has a blind spot, named rather than left implicit.** It keys on `Swan.qs()`;
Make's generate fetch builds its query with `URLSearchParams`, so W12 cannot see it. **W13** pins
that one read directly. If you add a read that builds its query some third way, W12 will not see it
either — the enumeration in the commit is `grep -nE "await (Swan\.(api|post)|fetch)\("`, and it is
the thing to re-run, not the suite's green.

**Correction:** the browser suite is **28** checks, not the 31 stated in `d200a0a`'s message — that
number was counted off a terminal tail rather than grepped. Node is 534 across 11 suites.

### One thing found and deliberately NOT fixed

**`app-judge.js` `record()` is addressed at click time.** It posts a grid loaded earlier, reading
`Swan.profile` at the moment of the click. `onMemory` sets `judge = null` — but that runs at
`memoryChanged()`, which for a profile switch is *after* `await loadProjects()`. In that window the
grid is still the old memory's and the profile is already the new one, so a click lands one
memory's judgement in another's file.

**What the two new guards are and are not proven by.** They are proven by the per-call-site sweep,
by `node --check`, and by the browser suite showing zero throws across a real profile switch. They
are **not** proven by watching stale content actually get suppressed — that needs two memories
holding *different* data, and the only second memory on this machine (`partner`) has no project. A
probe that created one would write real state into the live server. So: mechanism verified, symptom
not observed. If you build F1 with a second memory that has data, that is the moment to close this
cheaply — switch mid-load and confirm the render bar and grid count go blank rather than stale.

It is narrow (a click inside a network round-trip, mid-switch), and the server's provenance rules
stop it becoming a corpus leak — but it is real. Closing it means `load()` stashing the world with
the grid and `record()` refusing on a move. **That is a change to the most safety-critical write in
the app, and it belongs in its own slice with its own failing test first** — not bolted onto the end
of F0 because I happened to find it there. Left for whoever picks this up; F1 does not depend on it.
