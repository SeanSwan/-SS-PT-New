---
decision: "Design packet: turn the Swan Taste Brain's plain 4-tab page into a professional creative CONSOLE, and absorb the best of a 'design operating system' pattern without importing its cloud dependencies."
status: open
supersedes: none
board: SWA-186
date: 2026-08-26
author: Opus 5 (VS Code terminal), acting Final Decider in Fable's absence
privacy: "IDs and roles only. The second user is 'the partner'. No names, no keys, no PII."
---

# Panel packet — the Swan Taste Console

You are one seat on a two-seat panel (Ox Alpha, GLM). Answer independently. Do not
agree with a position you cannot defend from what is written here.

---

## 1. What the thing is, today

A local-only tool at `swan-taste-brain/prompter/`. A static server (`serve.mjs`) hands
out **plain HTML + CSS + vanilla JS — there is no build step, no React, no bundler, no
npm dependency at runtime.** Any design you propose must ship as hand-written HTML/CSS/JS
or it does not ship. This is a hard constraint, not a preference.

**The loop it runs:**

1. **Judge** — it shows the owner 12 real photographs in a grid. He picks the one
   *closest* to what he would ship and one that is a *miss*. The reason is locked in
   **before** the picture is revealed, so it records what he actually thought and not a
   rationalisation. A picture is never shown twice. Undo restores a grid.
2. That compiles into **Directions** — three named directions, each with an evidence tier,
   subject chips, and style codes.
3. **Make** — writes Midjourney prompts (stills) or shot prompts (video) *in that memory's
   taste*, then queues one — or four seeds — straight into the owner's own ComfyUI graph
   on his own GPU. Renders come back and can themselves be judged.
4. **Kept** — what he decided was right.

**Multi-tenant by memory.** A "memory" is `profile x project`. Profiles: the owner, the
partner (her own business), and a client mode used as sales role-play. A memory starts
empty; nothing is inherited.

**The law that dominates the architecture:** the owner subscribes to a third-party
reference corpus. **Only the owner's own memories may ever generate from it.** That law
was found broken at six separate layers in a prior review. Any UI you propose that moves
images, style codes, or provenance between memories is refused on sight.

## 2. The current UI, honestly

One `<header>` holding: a Who select, a Memory select, New project, a Taste pictures
button, a hidden create-form, and four tabs (Make / Judge / Directions / Kept). Then one
`<main>` with four `<section>`s. About 110 lines of HTML and 48 lines of CSS beyond the
judging surface. Every control now has a visible label and each tab has an explainer.

It works and it is honest. **It is also plainly a utility page.** Dropdowns in a row,
system-ish buttons, results as a flat list of cards. When the owner opens it to show a
client his pictures, it does not read as a professional creative tool.

## 3. What he asked for

> "Make it more of a console so that everything has its own section. When I pull these
> pictures up, it should be really simple to use and easy. And professional. [Like]
> Midjourney or any other professional apps that are out. [People] should be able to
> easily... they would clearly see my stuff."

So: **a console with real sections, gallery-grade image presentation, professional enough
to open in front of a paying client, and simpler to operate than it is now** — not merely
prettier.

## 4. The pattern he wants absorbed (a "design operating system")

He watched a walkthrough of a self-hosted design OS and wants its best ideas. Here is the
pattern, stripped of its marketing. **Your job includes telling him which of these are
wrong for this tool.**

| # | Idea from the pattern | Its claim |
|---|---|---|
| A | **Model-agnostic routing** — one surface, many engines; if one provider's credits run out, switch and keep working | never blocked by one vendor |
| B | **Use the subscription you already have** rather than API credits | zero marginal cost |
| C | **Library with semantic local scan** — type "burger", get every burger picture on the disk even with no matching filename | your own assets become searchable |
| D | **Insights** — spend/credits per provider, at a glance | cost stays visible |
| E | **Studio + System tabs** — pluggable design systems; pick one, generate in that style | your taste becomes reusable |
| F | **Portfolio view** — one place showing everything you have made | a body of work, not a folder |
| G | **Full-screen preview and open in a new tab** | judge it at real size |
| H | **Live edit and regenerate a single element** of a finished piece | fix one thing, not the whole thing |
| I | **Publish / distribute** to external platforms from inside the tool | creation and distribution in one place |
| J | **Memory plus a nightly "dreaming" pass** over logs to propose improvements | the tool compounds |

**Non-obvious tension to resolve, and the panel must take a position:** this tool's entire
value is that a memory generates **only from its own evidence**. Idea E (pluggable design
systems) and idea F (one portfolio across everything) both move material across memory
boundaries. Idea I (publish) turns a local-only tool into an outward-facing one. Idea J
(an autonomous nightly pass) writes to memory without a witness.

## 5. Hard constraints

1. **No build step.** Hand-written HTML/CSS/JS. No React, no bundler, no runtime npm.
2. **Local-only.** Every request Host-gated; no CORS headers at all; nothing leaves the box.
3. **Dark-first.** Palette in use: Obsidian `#0A0A0F`, Carbon `#141419`, Graphite `#1A1A24`,
   Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0` (glow/accent),
   Gilded Fern `#C6A84B` (gold), Frost White `#E0ECF4` (text), Wing Purple `#8B5CF6`.
   Blue background gets a purple glow; purple background gets a cyan glow.
   Typography available: Plus Jakarta Sans, Sora, Fira Code, Cormorant Garamond Italic.
4. **44px minimum touch targets. WCAG 4.5:1. `prefers-reduced-motion` respected.**
5. **Files stay under about 300 lines.** The UI is already split `app-shell / make / judge /
   directions / kept`. Adding a section means adding a file, not growing one.
6. **The judging surface (`probe.css`) is proven and must not regress** — the grid, the
   reason-before-reveal, never-show-twice, Undo.
7. **No new dependency may be added to reach a visual result.**

## 6. What each seat must return

Write in plain prose and tables. Be specific enough that a builder needs to ask nothing.

1. **A section map.** What are the console's top-level sections, what does each own, and
   what did you MERGE or DELETE from today's four tabs? Justify every section that earns
   its own place; name the ones that should not exist.
2. **An ASCII wireframe** of the primary screen at desktop width, and a second at 640px.
   Show where the images live, where the controls live, and what is visible without scrolling.
3. **The one signature visual move** — the thing that makes it read as a professional
   creative tool in the first two seconds — described concretely enough to implement in CSS.
4. **A verdict on each of A-J** in section 4: ADOPT / ADAPT / REFUSE, with the reason. For
   every ADOPT or ADAPT, say what it looks like in this tool specifically. For REFUSE, name
   the law or constraint it breaks.
5. **The click-cost table.** For the four things he actually does — taste a grid, generate
   prompts, render one, show a client his work — count taps today versus taps in your
   design. If your design costs MORE taps anywhere, say so and defend it.
6. **Three ways your own design fails.** Be concrete.
7. **A test list.** What must be asserted so this cannot regress? Prefer tests that fail if
   the guard is removed. Name the ones that must be browser-level and the ones that can be
   pure node.
8. **"What I checked and found sound."** List what you examined and concluded needs no
   change. This section is required.

## 7. What is NOT in scope

Do not redesign the judging interaction itself, the prompt grammar, the corpus laws, the
render pipeline, or the ComfyUI graph. This is the console around them.
