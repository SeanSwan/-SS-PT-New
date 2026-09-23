# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/design-brain/mockups/hermes-web-chat-mockup-a.html
**Tokens:** 4489 in / 30375 out (reasoning: 24403) | total 34864
**Wall:** 394.3s

---

# Hermes Mockup A — Hostile Review

The skeleton is right — no bubbles, collapsed tool rows, 720px column, mono for machine output, colour-for-state. Everything built *on* that skeleton is either mouse-only, below WCAG AA on the actual hex values, or spends the restraint budget you said you wanted. Ranked by severity.

---

## SEV-1 — Broken / blocking

### S1-1. The mockup's core controls are not controls

`[FRONTEND]` Tool rows, session rows, and the send affordance are `<div>`/`<span>` with `onclick`. The composer is a `<div class="cin">Ask Hermes…</div>` — there is no input on the page. A keyboard user can do exactly one thing: click "New chat". For a tool replacing an xterm, shipping a chat where you cannot type without a mouse is disqualifying.

```html
<!-- composer -->
<div class="cbox">
  <textarea class="cin" id="cin" rows="1" placeholder="Ask Hermes…" aria-label="Message Hermes"></textarea>
  <div class="crow">
    <span class="hint"><kbd>⌘↵</kbd> send · <kbd>/</kbd> commands · <kbd>@</kbd> files</span>
    <button class="send" type="button" aria-label="Send">↑</button>
  </div>
</div>
```

```css
.cin{display:block;width:100%;background:none;border:0;resize:none;outline:none;
     font:14px/1.5 var(--sans);color:var(--ink);max-height:200px}
.cin::placeholder{color:var(--ink-3)}
.send{width:28px;height:28px;cursor:pointer}
```

Tool rows — button semantics, `aria-expanded`, output tied by `aria-controls` (also kills the brittle `.tool.open + .toolout` sibling coupling, which breaks the moment React wraps either node):

```html
<button class="tool fail" type="button" aria-expanded="true" aria-controls="out-2">
  <span class="car" aria-hidden="true">▸</span>
  <span class="g err" aria-hidden="true">✗</span>
  <span class="nm">execute_code</span>
  <span>npm install --workspace web</span>
  <span class="meta"><time>14:31</time> · exit 1 · 6.2s</span>
</button>
<div class="toolout" id="out-2" role="region" aria-label="execute_code output">…</div>
```

```css
.tool{display:flex;align-items:center;gap:9px;width:calc(100% + 16px);margin:0 -8px;padding:6px 8px;
  background:none;border:0;border-radius:4px;text-align:left;cursor:pointer;
  font:13px var(--mono);color:var(--ink-3)}
.tool:hover{background:var(--bg-elev);color:var(--ink-2)}
.tool:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.tool[aria-expanded="true"] .car{transform:rotate(90deg)}
```

```js
document.querySelectorAll('.tool').forEach(t=>{
  const out=document.getElementById(t.getAttribute('aria-controls'));
  t.addEventListener('click',()=>{
    const open=t.getAttribute('aria-expanded')==='true';
    t.setAttribute('aria-expanded',String(!open)); out.hidden=open;
  });
});
```

Sessions likewise: `<nav class="rail" aria-label="Sessions">`, `<ul>`/`<li>`, each row a `<button class="s">` with `aria-current="true"` on the active one. `.s{display:block;width:100%;background:none;border:0;border-left:2px solid transparent;text-align:left;…}`.

### S1-2. `--ink-3: #6b7280` fails AA on every surface it's used on

Computed against the actual hexes in this file:

| Text | Hex | Background | Ratio | Size used | Verdict |
|---|---|---|---|---|---|
| `--ink` | #e7e9ee | #0d0e10 | 15.9 | — | pass |
| `--ink-2` | #a3a8b3 | #0d0e10 / #101114 / #16181c | 8.1 / 7.9 / 7.5 | — | pass |
| **`--ink-3`** | **#6b7280** | **#0d0e10 / #101114 / #16181c** | **4.0 / 3.9 / 3.7** | 11–12.5px | **fail** (needs 4.5; the large-text exemption requires 18.66px bold — nothing here qualifies) |
| `--accent` | #7aa2f7 | #0d0e10 | 7.7 | — | pass |
| `--warn` | #d9a441 | card fill | 8.0 | — | pass |
| `--ok` | #7bc47f | #101114 | 9.0 | — | pass |
| `--err` | #e06c75 | #0d0e10 | 6.0 | — | pass — **and never used in the markup** |

`--ink-3` carries `.who` (speaker labels), `.grp`, `.s-m`, `.model`, `.tool`, `.tool .meta`, `.hint`, `.ev .sub`, `.stat`, `.cm`, `.srv .off`. That's roughly 40% of the functional text — including the entire tool audit trail — at 4.0:1 or worse. One-line fix:

```css
--ink-3:#7d8491;  /* 5.1 on --bg, 5.0 on --bg-rail, 4.7 on --bg-elev — all pass */
```

Non-text (WCAG 1.4.11, 3:1 for component boundaries):

- `.cbox` border `#22252b` on `#0d0e10` = **1.26** — fail
- `.newchat` / `.b-n` borders `#22252b` on `#101114` = **1.23** — fail (arguable for labelled ghost buttons; not arguable for the input)
- Focus state `#333a46` = **1.69** — fail
- The approval card fill `rgba(217,164,65,.055)` over `#0d0e10` blends to ≈ `#181613`, which is **1.02:1 against `--bg-elev` #16181c** — the "loud, because it BLOCKS" card has a *darker* fill than a code block. It is perceptually a `pre`.

The only border that clears 3:1 on both `--bg` and `--bg-rail` on a near-black theme is around `#5c626e` (3.15 / 3.08). Use it for the composer — the one boundary that's functional — and accept `--line` for decoration:

```css
.cbox{background:var(--bg-elev);border:1px solid #5c626e;…}   /* bg-rail was wrong anyway — that's a structural pane colour leaking into a control */
```

### S1-3. No focus indication anywhere

The only focus style on the page is `.cbox:focus-within{border-color:#333a46}` — a 1px change at 1.69:1. Add globally:

```css
:where(button,[tabindex],textarea):focus-visible{
  outline:2px solid var(--accent);outline-offset:2px}
.cbox:focus-within{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
```

Also: `.thread`, `.sessions`, `.act` are scroll regions with no keyboard access — `tabindex="0"` on `.thread`, `role="log"` `aria-label="Conversation"`, `aria-label` on both `<aside>`s, `<h2 class="sr-only">Sessions</h2>` in the rail, and `:root{color-scheme:dark}` so the textarea caret and native scrollbars aren't white.

### S1-4. The approval card fails its one job

`[APPROVAL]` Four separate failures:

**(a) Not prominent.** Filled above — the tint is 1.02:1 against an ordinary code block. The blocking state is styled quieter than the `pre` above it. The header (`⚠ approval required · T2 · shell`, 12px mono, amber) is *smaller in visual mass* than the tool-row hover state. Also `⚠` is an emoji; it renders differently per-OS and reads cheap. Cut it.

**(b) Not self-contained.** The card says "Run the Node upgrade" in prose — the actual command lives in a `pre` further up. Users approve *commands*, not sentences. `T2` is unexplained jargon.

**(c) No stacking story.** Three approvals = three identical amber cards inside one turn = six same-weight buttons, no ordering, no way to tell which is which from the composer, and the activity rail shows "Awaiting approval" once for all of them.

**(d) No resolved state.** After Approve, what renders? The mockup doesn't say — and an audit tool must show what was approved, when.

Rebuild, using the left-bar grammar the sidebar already established (left bar = "active/attention"):

```css
.appr{margin:18px 0 14px;padding:14px 16px;background:var(--bg-elev);
  border:1px solid rgba(217,164,65,.45);border-left:3px solid var(--warn);border-radius:var(--radius)}
.appr .h{display:flex;justify-content:space-between;margin-bottom:8px;
  font:600 12px var(--sans);color:var(--warn)}
.appr .cmd{font:12px/1.6 var(--mono);color:var(--ink);background:rgba(0,0,0,.28);
  border:1px solid var(--line);border-radius:5px;padding:8px 10px;margin-bottom:9px;
  white-space:pre-wrap;overflow-wrap:anywhere}
```

```html
<div class="appr" role="group" aria-label="Approval 1 of 3: shell command" tabindex="-1" id="appr-1">
  <div class="h"><span>Approval required · <abbr title="Tier 2: writes outside the workspace">T2</abbr> shell</span><span>1 of 3</span></div>
  <div class="cmd">sudo apt-get install -y nodejs && npm run build --workspace web</div>
  <div class="d">Modifies system packages.</div>
  <div class="acts">
    <button class="b-y" type="button">Approve once <kbd>⏎</kbd></button>
    <button class="b-n" type="button">Deny <kbd>esc</kbd></button>
  </div>
</div>
```

Stacking rule: **only the first pending card is expanded; the rest collapse to one line**, and focus auto-advances to the next on resolution:

```css
.appr.queued{padding:7px 12px;background:none}
.appr.queued .cmd,.appr.queued .d,.appr.queued .acts{display:none}
.appr.queued .h{margin:0;color:var(--ink-2)}
.appr.resolved{border-color:var(--line);border-left-color:var(--ink-3);background:none;opacity:.75}
.appr.resolved .h{color:var(--ink-3)}
kbd{font:10px var(--mono);border:1px solid var(--line);border-radius:3px;padding:1px 4px;color:var(--ink-3)}
```

Plus: a badge in `.top` — `<button class="pending">3 approvals</button>` styled `font:12px var(--mono);color:var(--warn);border:1px solid rgba(217,164,65,.45);border-radius:99px;padding:2px 9px` — that focuses `#appr-1` on click; an `aria-live="assertive"` region announcing "Approval required: shell command"; **initial focus on Deny**, not Approve, since approve is the destructive branch; and the composer hint swapping to "Hermes is paused — 3 approvals pending". Focus landing on Approve-by-default is how muscle memory `⏎`-fires a `sudo apt-get`.

### S1-5. Zero responsive behaviour — panes hard-clip below ~1000px

`[FRONTEND]` `grid-template-columns:236px 1fr 268px` with `body{overflow:hidden}`: 504px of fixed chrome means at 900px the conversation column is ~396px, and below ~560px the fixed rails overflow a clipped body — content is simply unreachable. No `@media` exists in the file. Exact plan:

```css
body{height:100vh;height:100dvh}

@media (max-width:1279px){
  body{grid-template-columns:236px 1fr}
  .act{position:fixed;top:0;right:0;bottom:0;width:280px;transform:translateX(100%);
       transition:transform .18s;z-index:20;box-shadow:-12px 0 32px rgba(0,0,0,.45)}
  body.act-open .act{transform:none}
}
@media (max-width:959px){
  body{grid-template-columns:1fr}
  .rail{position:fixed;top:0;left:0;bottom:0;width:264px;transform:translateX(-100%);
        transition:transform .18s;z-index:20}
  body.rail-open .rail{transform:none}
}
@media (max-width:639px){
  .turn{padding:0 14px;margin-bottom:22px}
  .composer{padding:10px 12px 12px}
  .top{padding:0 14px}
  .hint{display:none}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
```

with two `aria-expanded` toggle buttons in `.top`. Note the brief said "below 1100px three panes cannot fit" — at 1100px this layout already gives the conversation 596px, less than the 720px column plus padding, so the copy column is squeezed before any breakpoint fires. Move the activity collapse to 1280px, not 1100.

### S1-6. No stop button

Covered in Missing below, but flagging here: an agent UI with approvals and shell execution and **no interrupt control** is a day-one blocker. It belongs in `.top` while a turn is running, plus `Esc` globally when the composer is empty.

---

## SEV-2 — Significant

### S2-1. Information hierarchy is inverted for an agentic tool

`[DESIGN]` You stare at *tool runs*, not prose. Currently the prose (least time-sensitive) is the brightest element (`--ink`, 15px), and the audit trail is the dimmest (12.5px mono, `--ink-3`, sub-AA). There is no per-row success/failure signal — "exit 1" renders in the same grey as "3 lines", and `--err` is defined and never used. And **no timestamps exist anywhere in the thread** — for a log-of-work that's a hole, not a styling choice.

The fix package (glyph column: grey ✓ quiet, red ✗ loud — success is the default state and shouldn't spend colour; only anomalies do):

```css
.tools{margin:16px 0;padding:6px 0;
  border-top:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)}
.tool{font:13px var(--mono);color:var(--ink-3)}        /* was 12.5px */
.tool .nm{color:var(--ink-2)}
.tool .g{width:11px;text-align:center;flex:none}
.tool .g.ok{color:var(--ink-3)}
.tool .g.err{color:var(--err)}
.tool.fail .meta{color:var(--err)}
.who{display:flex;justify-content:space-between}
.who .ts{font:11px var(--mono);color:var(--ink-3);letter-spacing:0;text-transform:none}
```

The hairlines bracket the tool block so a 15-tool turn reads as one unit between prose paragraphs — that's the highest-value design change on the page.

### S2-2. Restraint failures, itemised

`[DESIGN]` The brief says colour for state only, one accent. Violations:

1. `.turn.me .who{color:var(--accent)}` — the accent fires on **every user turn**. That's not an accent, that's a theme colour. Codex/Claude label both speakers identically. Delete the rule.
2. Ambient green: `.dot` glow in brand, green "running" text in `.railfoot`, green `.ev.ok` dots, green `.up` numbers in MCP. Success is the resting state; painting it makes state colour into wallpaper. `--ok` should appear *only* on recovery/confirmation transitions. Concretely: `.railfoot span[style]` → plain `--ink-3` text, no dot while healthy; show the dot only when degraded/reconnecting.
3. `box-shadow` glows on `.dot`, `.ev.run .i`, and the model indicator — three glows on a page claiming "no decoration". Delete all three.
4. The `.model` blue dot in `.top` is decoration next to an already-mono model name. Delete.
5. Four radii (4/5/7/9). Two: `--radius:6px`, composer `8px`.

A top designer's cut-list for this file: both glows, model dot, `⚠` emoji, accent-`YOU`, green ambient, the uppercase-tracked `HERMES` brand (`.brand b{font:600 13px var(--sans);color:var(--ink-2);letter-spacing:0;text-transform:none}` — tracked-out uppercase in four places — brand, `.who`, `.grp`, `.act h2` — is the single loudest "generic dark dashboard" tell; keep it on `.grp` and `.act h2` only), and the fullwidth `＋` → `+`.

### S2-3. The activity rail does not earn 268px

`[ACTIVITY]` As mocked: the Activity section duplicates the thread's tool rows 1:1 in a second notation (read_file/execute_code/grep appear in both). The MCP numbers (`8`, `13`) are unitless — counts of tools? calls? — coloured green. What's genuinely unique: context budget, server up/off, approvals mode, elapsed. That's ~80px of content wearing 268px.

It earns the width only by showing what the thread *can't*: the approval queue, the live run state, background/subagent work. Restructure:

```html
<h2>Now</h2>
<div class="ev run"><span class="i"></span><div>execute_code · 12s
  <button class="stop" aria-label="Stop">stop</button></div></div>

<h2>Approvals</h2>            <!-- mirrors the queue; click focuses the card -->
<div class="ev warn"><span class="i"></span><div>1 of 3 · shell · node upgrade</div></div>

<h2>Session</h2>
<div class="stat"><span>Context</span><b>18.2k / 65k</b></div>
<div class="ctxbar" role="progressbar" aria-valuenow="28" aria-valuemin="0" aria-valuemax="100" aria-label="Context used"><span></span></div>
```

```css
.ctxbar{height:3px;background:var(--line);border-radius:2px;overflow:hidden;margin:4px 0 8px}
.ctxbar>span{display:block;height:100%;width:28%;background:var(--ink-3)}
.ctxbar.hot>span{background:var(--warn)}   /* colour only when it matters: >80% */
.srv .up{color:var(--ink-3)}               /* kill ambient green; keep "off" visible */
```

And make it dismissible at full width — `body.noact{grid-template-columns:236px 1fr} .act{display:none}` — with a toggle in `.top`. If the product never surfaces non-thread work in this rail, cut it to a popover and give the conversation the pixels.

### S2-4. 400-line tool output destroys the thread

`[FRONTEND]` `.toolout` has `white-space:pre-wrap` and **no max-height and no overflow rule**. One open 400-line output becomes a 400-line wall mid-thread, and any unbroken token (JWT, path, hash) overflows the box horizontally since `pre-wrap` doesn't break mid-token. Exact:

```css
.toolout{max-height:264px;overflow:auto;overflow-wrap:anywhere;tab-size:2}
```

Plus a header line per output — `stdout · 388 lines · truncated ▸` — as the expand-full affordance. Same treatment implicit for `pre`.

### S2-5. 200-message thread has no scroll story

`[FRONTEND]` No auto-scroll-pinned-to-bottom, no jump-to-latest, no date separators, no timestamps (fixed in S2-1). Minimum:

```css
.jump{position:sticky;bottom:10px;display:grid;place-items:center;margin:-34px auto 0;
  width:34px;height:34px;border-radius:50%;background:var(--bg-elev);
  border:1px solid var(--line);color:var(--ink-2);cursor:pointer;z-index:2}
```

shown only when the user scrolls >1 viewport from the bottom; scroll position persisted per session. Reuse `.grp` as date separators in the thread (`Today`, `Yesterday`, `Mon 3 Mar`) — the pattern already exists.

---

## SEV-3 — Medium

- **Turn-state row is missing.** The mock shows prose finished *and* approval pending with nothing in the thread indicating the turn's state. Every turn needs a terminal status line: `role="status"` — running (spinner + current tool + elapsed) / awaiting approval / errored / done. Without it the composer-vs-blocked ambiguity is unsolvable.
- **Session metadata is inconsistent** — "now · 24 msgs", "3h · cron", "5h · 12 msgs". Pick one order: `<msgs> · <age>`, suffix cron with `title="started by schedule"`.
- **No hover affordances on sessions** — no rename, no delete, no pin, no search. An owner with 133-msg threads needs at minimum a hover ⋯ menu; day one.
- **Inline styles** on the `railfoot` span and model dot — classes.
- **`.car` at 9px** is below legible; 10px minimum, and the row is the hit target anyway.
- **`.send` duplicates the kbd hint** — fine, but 25px → 28px minimum target.

---

## MISSING on day one, ranked

1. **Stop/interrupt** (S1-6) — button in `.top` while running + `Esc`.
2. **Turn-state indicator + streaming caret** (S2).
3. **Approval resolved/queued states + badge + live region** (S1-4) — the mock only shows the pause state, never before/after.
4. **Error turn design** — `--err` never appears in the markup; no failed-turn, crashed-tool, or gateway-disconnected state is demoed. A mockup that only shows the happy path hasn't done its job; add at least one error turn and one "reconnecting…" railfoot.
5. **Copy buttons** on `pre` and `.toolout` — hover-revealed: `.copy{opacity:0} pre:hover .copy,.toolout:hover .copy{opacity:1}`. Non-negotiable for a dev.
6. **Edit/resend my last message.**
7. **⌘K session search** + rename/delete/pin.
8. **Keyboard map** — `Enter`/`⇧Enter`, `Esc` → focus composer (this replaces a terminal; that muscle memory is the whole reason he'll tolerate the app), `/` and `@` menus.
9. **Context-limit flow** — the meter shows 18.2k/65k but nothing shows what happens at 64k (compaction prompt? auto-truncate?).
10. **Background-tab signalling** — approvals block indefinitely; `document.title = "⚠ 1 approval — Hermes"` minimum.
11. **Per-turn token/latency** on hover of `.who` — he's an experienced dev watching a local model; he will want it by hour two.
12. **Empty states** (new chat, no sessions) and composer draft persistence across session switches.

---

## Ordered punch list

1. `--ink-3` → `#7d8491`; add global `:focus-visible`; `color-scheme:dark`.
2. Convert tool rows, sessions, send to real controls with `aria-expanded`/`aria-controls`; composer → `textarea`.
3. Rebuild the approval card: warn left bar + self-contained `.cmd` + `n of 3` queue + resolved state + focus-to-Deny.
4. Tool-row package: 13px, ✓/✗ glyphs, `exit 1` in `--err`, hairline-bracketed `.tools`, timestamps.
5. Responsive block (1280 / 960 / 640) + rail toggles.
6. `.toolout{max-height:264px;overflow:auto;overflow-wrap:anywhere}`.
7. Restrraint cuts: accent-`YOU`, three glows, model dot, `⚠`, ambient green, tracked brand.
8. Activity rail restructure (queue + Now + context bar) or demote to overlay at all widths.
9. Stop button + turn-state row.
10. Composer border `#5c626e`, `.cbox` bg → `--bg-elev`.

The restraint brief is 70% met in the palette and 30% violated in the accents nobody asked for. The bigger problem is that the two things this owner will actually do all day — scan tool runs and answer approvals — are respectively the dimmest and the quietest elements on the page.
