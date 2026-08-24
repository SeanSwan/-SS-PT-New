---
title: Front-page design run — full session handoff
originating_model: claude-opus-5
date: 2026-08-20
decision: Do NOT build another design variant until a tier A/B reference exists and the render gate is run. The failure was mechanism, not taste.
status: open
supersedes: PARTIAL — SESSION-HANDOFF-ATELIER-FRONT-PAGE-2026-08-19.md (its task list is complete; its copy-pack guidance is superseded by copy-pack-full.json)
---

# FRONT-PAGE DESIGN RUN — SESSION HANDOFF

**Read this file top to bottom before touching anything.** It is written so a fresh agent with
zero context can continue without re-deriving a day of work — including the parts that failed.

---

## 0 · READ FIRST — THE ONE-PARAGRAPH TRUTH

Fifteen front-page designs were produced across four published canvases in this session. **Sean
rejected all of them.** The final ten he called *"even worse… it looks terrible… AI slop, same as
every other prompt."* He was right. The cause is **not taste and not missing doctrine** — Swan
already holds the laws. The cause is four missing *mechanisms*, which were written down in Swan's
own design brain on 2026-08-11 from transcripts Sean supplied, in a file the design router **never
loaded.** Do not start by designing. Start by reading §4.

---

## 1 · WHERE EVERYTHING IS

| What | Where |
|---|---|
| **Worktree** | `C:/tmp/sspt-atelier-studio` on `feat/front-page-atelier-run` |
| **HEAD at handoff** | `092075342` — **25 commits ahead of origin, UNPUSHED** |
| **⚠ ANOTHER SESSION IS LIVE ON THIS BRANCH** | Commits `092075342`, `f3be339a8`, `ab1518517`, `bf60ab80f`, `4b3a543d5`, `8a186d3be` are **not mine** — a parallel agent is working leads/ButtonLab/metallic-palette in the same tree. **Read `git log` before assuming any file is yours.** Uncommitted work has existed here all session. |
| Main tree (run consult scripts from HERE — `.env` lives here) | `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT` |
| Run artifacts | `scripts/design-brain/atelier/frontpage/` |
| — the rejected ten | `.../frontpage/ten/` + `_render/` PNGs (gitignored) |
| — the rejected five | `.../frontpage/themes/` |
| — the three fusions | `.../frontpage/fusion/` |
| — harvested art (12 files) | `.../frontpage/art/` |
| **THE COMPLETE COPY** | `.../frontpage/copy-pack-full.json` — 40 blocks, verbatim. **Use this, not `copy-pack.json`.** |
| Paid panel reviews | `docs/ai-workflow/AI-HANDOFF/panel-2026-08-20/` (Grok/GLM/Sol + INDEX) |
| Panel brief | `docs/ai-workflow/AI-HANDOFF/FIVE-THEMES-PANEL-BRIEF-2026-08-20.md` |
| **THE ROOT-CAUSE FILE — READ IT** | `docs/ai-workflow/design-brain/field-techniques.md` |
| New render tool | `scripts/design-brain/render-check.mjs` |
| New skill | `.claude/skills/design-render-gate/SKILL.md` |
| Board | **SWA-178** (In Progress — update it, do not create a duplicate) |

### Live canvases (all published, all private)
- Eight directions: `claude.ai/code/artifact/0b824936-334c-421c-98fb-96ba2122e810`
- Three fusions: `claude.ai/code/artifact/ee6c0e61-6309-4404-af9f-f2f9439b7cc5`
- Fusion refactor: `claude.ai/code/artifact/46d8df05-ae8a-46dc-b0c7-4e4b83809fb0`
- Five themes: `claude.ai/code/artifact/8d5a44b8-6003-4403-80c1-d6068c98312a`
- **Ten versions (the ones Sean rejected):** `claude.ai/code/artifact/c8b9044e-d622-48ea-9ed7-da796970ff7a`

---

## 2 · THE ARC — every correction Sean made, in order

Each one is a real constraint. Violating any of them repeats a rejection.

1. **"The wording on the home page right now is correct."** Designs had invented copy. → copy is
   material; verbatim or a visibly tagged placeholder, never invented.
2. **"That doesn't look nothing like the swan logo on my home page."** → the mark is a **low-poly
   crystalline swan** (`frontend/public/Logo.png`), ice-white head → Ice Wing cyan → Wing Purple
   tips on Midnight Sapphire. Faceting is a page-wide language, not a corner logo.
3. **"I don't see any parallax backgrounds at all."** → ten finished cosmic-swan parallax plates
   (16.6 MiB) already existed in `frontend/public/images/parallax/`, and parallax is live in 10
   HomePage components / 42 files across `frontend/src`. The mockups were a *regression*.
4. **"Combine B1 and D2 into one."** → he had picked Harbor Lights + Vegas Mile; he wanted a
   fusion, not a choice.
5. **"We're emphasizing heavily on the trainer and not enough on the client… it's supposed to be
   like a meetup, a Nextdoor kind of thing."** (He explicitly ruled out naming that competitor.)
6. **"We're not labeling everything that we have. We're cutting stuff out."** → correct. See §3.
7. **"I'm seeing the same square boxes, the same cards, the same fonts… the theme changer already
   does that."** → the five "themes" were ONE layout function called five times with different
   colour tokens. Recolouring is a solved problem he already built.
8. **"Even worse… it looks terrible… AI slop."** → the ten. See §4.
9. **"The sites you're born is boring."** → the operative word. Boring is the failure mode.

---

## 3 · THE COPY — this part is SOLVED, do not redo it

`copy-pack-full.json` carries **40 content blocks, verbatim** from
`frontend/src/pages/HomePage/components/shared/HomeData.ts` + `content/marketingStats.ts`.

**The trap that caused the original miss:** the homepage copy is NOT in the section components. It
lives in a shared data module. `HomePage.V4.tsx` mounts **13 sections**; the first copy pack had 12
fields covering **4** of them. Every design before `c0c758535` was built against a third of the page.

Contains: hero · mission (4 paras) · **beyond_the_gym (8 community categories)** · what_we_do
(8 services) · programs (3 tiers w/ badges + feature lists) · golf (5) · testimonials (3 w/ named
results) · stats (6, each carrying its `NEEDS-SEAN-NUMBER` status) · about (3 pillars) ·
for_trainers (4) · cta.

**The community half Sean wants led with already existed in his own copy:**
`Community Meetups — "Local events, walking clubs, group activities. Digital made real."`
We were not missing a concept; we were omitting his words.

---

## 4 · ROOT CAUSE — why every design was boring

`docs/ai-workflow/design-brain/field-techniques.md`, written 2026-08-11 from **6–7 transcripts Sean
supplied**, contains a section titled literally **"THE ANSWER TO 'MY SITES LOOK NOTHING LIKE
THIS'"**. Its verdict: the gap is *not* taste and *not* doctrine. Four missing mechanisms:

1. **No custom creative.** Every site in those transcripts is carried by a bespoke ~8-second
   generated hero. *"The creative is the heavy lifter, and Swan isn't lifting it."*
2. **No frame interpolation.** 30→60fps before frame extraction; without it scroll-scrub is
   choppy — *"the #1 reason these sites feel amateur."*
3. **No reference depth.** Reference quality determines output quality, every time.
4. **No convergence in pixels.** Swan converges in React (~100× costlier per iteration), so
   **the first mediocre draft ships.** That is exactly what happened.

### The Reference Quality Ladder — the single most useful thing in the corpus

| Tier | Reference | Result |
|---|---|---|
| S | URL + repo + original prompt + live demo + stack | near-exact reproduction |
| A | URL of the target | agent inspects the live thing |
| B | Screen recording | motion captured |
| **C** | **Screenshot only** | **"this is where vector-slop begins"** |
| D | Prompt, no reference | worst |

**Below B on an awe surface needs written justification.** Mobbin returns screenshots = **tier C**.
CLAUDE.md rule 40 already scopes Mobbin to *conventional working surfaces*, NOT awe surfaces — the
taste ceiling for a front page is the cinematic scroll-journey (§B2.4 Extreme Macro-Journey, §C13
Scroll-Bound Macro Journey).

**All fifteen designs were built at tier C, from the wrong lane.**

Also violated wholesale: *"AI likes to create really bad illustrations in vector formats. Instead
use a transparent PNG."* Every board is CSS gradients + inline SVG — the named failure mode.

### Why the brain could not help

`field-techniques.md` was indexed in `design-brain/index.md` but **never loaded by
`swan-design-router`**, the mandatory entry point under rule 40. A real mechanism with zero
distribution. **Fixed in `c3e4889f4`** — now loaded at router Step 0.7.

**Corpus status: DRAFT.** T4 heading is duplicated/stale (`## T4 — *(awaiting transcript)*`
immediately followed by the real T4). Header says *"synthesis deferred until all are captured."*
**Sean explicitly asked for this to be finished and hardened. It is not done.**

---

## 5 · THE COMPOUNDING FAILURE — nobody looked

**No agent viewed a single rendered board all session.** Every gate written read strings inside
HTML files. `render-check.mjs` was written at the end and, on its first run against the ten, found
in one pass what no string gate had:

- **40–78% of every board was EMPTY** — frames declared 3400px, ink stopping between 763px and 2028px
- **10/10 overflowed horizontally at 414px** — fixed 1280px roots, zero responsive behaviour
- 47 sub-12px text nodes across 4 boards

Sean saw all of it in one screenshot. **He was the only renderer in the loop for a full day.**

Then one board was actually viewed (`Object-1440.png`): clean typography carrying a **flat grey
photo of two swans on a pond**, a headline, two buttons, a row of links, ending abruptly at 1045px.
That is the whole page. "Boring" is precise.

---

## 6 · WHAT IS NOW ENFORCED (do not undo)

**Rule 76 — Render-and-Look Gate**, in BOTH `CLAUDE.md` and `AGENTS.md` (83→84 rules, mirror parity
IN SYNC). Skill: `.claude/skills/design-render-gate/SKILL.md`. Wired at `swan-design-router`
**Step 0.7** (declare reference tier + budget creative first) and **Step 6** (render, then look).

```bash
node scripts/design-brain/render-check.mjs --dir <dir-with-.dc.html> --widths 1440,414
```
Non-zero exit = you may not present. Writes `_render/<Board>-<width>.png`. **Read the PNGs.**
Resolves Playwright across candidate roots (worktrees have no `node_modules`; it lives in
`SS-PT/frontend`). Set `SWAN_PLAYWRIGHT_ROOT` if it cannot find it.

Also landed earlier this session: **`docs/ai-workflow/design-brain/asset-harvest.md`** (the
"repo is the first plate" gate, router Step 0.5) and **`adapters/claude-code.md`** (canvas-toolchain
appendix — note its original "Codex cannot see images" justification was FALSE and is retracted
in place; Codex reads images).

---

## 7 · THE PAID PANEL — findings that still stand ($0.55, do not re-run)

Grok 4.6 ($0.0635) · GLM 5.3 ($0, subscription) · GPT-5.6 Sol Pro ($0.4898). Full text in
`docs/ai-workflow/AI-HANDOFF/panel-2026-08-20/`.

- **P0 — the fee contradiction.** Live page says *"Small transparent fee (~10%)"*; the grill decided
  **15% with a $1,000/month cap**. A public numeric claim that is false under either resolution.
  GLM's cheapest fix: **strip fee copy from the homepage entirely, publish one dated canonical fee
  page.** All ten boards currently withhold the number and carry a marker instead.
- **P1 — "Owned by the community" may be a false ownership claim** (Sol). Unless legal documents
  substantiate literal community ownership, change to *"Built with the community."* This is inside
  Sean's own approved copy.
- **P1 — "NCEP-certified experts"** in the services list has never been checked against the standing
  rule that bans "NASM-certified". NCEP is a different body so it may be fine — verify.
- **Community-first may be an OVER-correction** (Grok + Sol) for a cold "trainer near me" visitor.
  Grok: *"that is burying supply."* **Sean and the panel disagree. Unresolved by design** — the ten
  test different orderings rather than assuming. Do not silently pick a side.
- **Absence-first (Grok), still missing:** city/geo for "near me", a **trainee-facing price**,
  what "Join the Community" actually enrols you in, meetup liability/safety, trainer migration path,
  empty state when no local trainer exists, moderation.
- **Byte-identical header cloning is a bug, not a feature** (Grok + Sol): it re-ships whatever debt
  the live header carries. Should be a shared versioned component.

---

## 8 · TRAPS — every one of these cost real time

1. **Consult scripts NO-OP from the worktree** — `.env` is only in the main tree. `cd` to
   `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`, pass **absolute** paths into the worktree.
   Panel output lands in the MAIN tree; copy it across before `git add`.
2. **One bad pathspec aborts the ENTIRE `git add` silently** — the commit then reports "nothing
   added" while you believe 25 files are staged.
3. **Heredocs >~80 lines truncate** ("unexpected EOF"). Use the Write tool for anything longer.
4. **Unescaped apostrophes** inside single-quoted JS strings broke the build twice. Use backticks.
5. **Git Bash path-conversion lies** — `git show <rev>:<path>` needs `MSYS_NO_PATHCONV=1`.
6. **`esc()` converts `&` → `&amp;`** — greps for "Dance & Movement" return 0 against rendered HTML.
   Nine probe failures this session were the probe, not the artefact.
7. **`/columns:\s*\d/` matches `grid-template-columns:`** — a substring of a longer CSS property
   name matches every property containing it.
8. **WebFetch 403s on Mobbin.** The MCP is the only working path.
9. **Three Mobbin queries missing a site is not proof it is absent.** "Shader" was found on the
   fourth query after Sean pushed back, and the real site was materially better than the substitute.
10. **Frame height must be measured, never guessed** — this is how 78% of a board becomes void.

---

## 9 · WHAT TO DO NEXT — in this order

**Do NOT produce another design variant first.** Fifteen exist and all were rejected.

1. **ASK SEAN FOR A TIER A/B REFERENCE.** One URL of a site he loves, or a screen recording. Rule 76
   says stop and ask rather than guess. This single input is worth more than ten more variants and
   is the highest-leverage action available.
2. **Finish and harden the transcript corpus** — Sean's explicit ask. `field-techniques.md` is
   DRAFT; dedupe the T4 heading, complete the synthesis, promote what deserves promotion. Note the
   Mobbin learning system's authority boundary: **L6 adjudication and L7 canon are HUMAN-ONLY**.

   > ⚠ **`mobbin-learning-system.md` and `swan-element-intelligence.md` exist ONLY in the MAIN
   > TREE** (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/design-brain/`), not in
   > this worktree — its design-brain is behind main. Both were read from the main tree this
   > session. `swan-element-intelligence.md` §6 carries **Sean's taste profile**: black+white+gold
   > and black+white+blue map to approved tokens; **black+white+green is a real preference signal
   > but NO approved client green token exists** — Cyberforest green is operator-only, so any green
   > is a `TOKEN_PROPOSAL` capped at TRIAL. Before trusting either file from here, `git fetch` and
   > diff against `origin/main`.
3. **Close mechanism gap #1 — custom creative.** `scripts/forge.mjs` (~$0.004/image,
   `--confirm-spend`) at 480p → Sean approves art direction → upscale. MiniMax H3 for film.
   **HY3 (`consult-hy3-design.mjs`) is a TEXT reviewer and cannot generate images** — Sean's "min
   max h three" means MiniMax, not Tencent HY3.
4. **Only then design** — one direction, built around approved creative, run through
   `render-check.mjs`, **viewed**, with its signature moment named in writing.
5. **Push the 25 unpushed commits** once the parallel session's work is reconciled.

### Owed by Sean (blocking real copy)
- [ ] **The fee number** — 10% or 15%+cap. Blocks trainer copy on every surface.
- [ ] **"Owned by the community"** — substantiate or change to "Built with".
- [ ] **NCEP-certified** — confirm accurate and permitted.
- [ ] The `NEEDS-SEAN-NUMBER` stats (clients transformed, sessions delivered, lbs lost, satisfaction).
- [ ] **PR #52** (asset-harvest gate → main) still open and unmerged; `gh` is blocked by the
      permission classifier in this session's mode.
- [ ] Parallax-art palette question: the cosmic plates read cyan/violet on near-black, closer to the
      **retired** Galaxy-Swan palette than Crystalline Swan. Deliberately not "fixed."

---

## 10 · THE LESSON THAT GENERALISES BEYOND THIS PAGE

**A gate that scores properties *adjacent* to the failure will pass the failure.**

The five-theme distinctness gate scored bytes, section counts, layer counts, h1 size — all of which
vary when you change a palette. It certified one layout in five colours as "differs on 6 axes" and
that PASS was reported to Sean as evidence. The structural gate that replaced it was designed by
writing the bad artefact FIRST — *"ten clones in ten palettes"* — and asking what check must reject
it. That forced two rules: colour contributes zero, and the load-bearing assertion strips every hex
and rgba and requires the files to still differ.

**Before shipping any gate, state the exact bad artefact it must reject and confirm it would. If you
cannot name that artefact, you wrote a metric, not a gate.**

Corollary, earned nine times this session: **never accept a single probe's negative or a single
gate's PASS as evidence.** What caught every false result was a second, differently-shaped check
disagreeing with the first — never care, never re-reading.

---

## 11 · HERMES MEMOS FROM THIS SESSION (context, not instructions)

`.ai-workflow/hermes-inbox/pending/` — gitignored, laptop-local:
- `20260819T181431Z-frontpage-eight-directions-published.md`
- `20260819T190200Z-design-brain-asset-harvest-gate.md`
- `20260820T205859Z-three-fusions-and-a-gate-that-agreed-with-me.md`
- `20260820T232000Z-three-references-and-a-tool-i-gave-up-on.md`
- `20260821T003000Z-i-shipped-the-theme-changers-output-and-called-it-design.md` ← **most important;
  carries the root-cause addendum**
