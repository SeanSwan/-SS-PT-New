---
title: Taste curation — the next slice, reconciled against the Atelier that shipped underneath it
originating_model: claude-opus-5
date: 2026-08-19
decision: Do NOT build a second taste ledger. The verdict row already shipped; build the READ side.
status: open
supersedes: PARTIAL - SWAN-CONTINUATION-HANDOFF-2026-08-14.md section 4.3 Slice 0 row, and
  KIMI-TASTE-CURATION-BLUEPRINT.md section 5 Slice 0 / the TasteVerdictRow interface. Both
  are annotated in place as of 2026-08-19; everything else in both documents still stands.
---

# TASTE CURATION — NEXT-SLICE HANDOFF

**You are picking up a plan that changed underneath itself.** Read this before the 08-14
continuation handoff, which is still accurate about the Forge but **wrong about what Slice 0
should build.**

- Written by Opus 5 on 2026-08-19 against `origin/main` @ `4e8394673`.
- Prior handoff: `SWAN-CONTINUATION-HANDOFF-2026-08-14.md` (Forge state, capability truths,
  operating rules — all still valid).
- Reviewed plan: `KIMI-TASTE-CURATION-BLUEPRINT.md` (**§4 decisions still hold; §5 Slice 0 is
  now stale**).

---

## 1. THE ONE THING THAT CHANGED

Between 2026-08-14 and 2026-08-19 another agent (**Claude Fable 5**) designed, reviewed and
shipped the **Swan Atelier Studio** (PRs #48, #49). It is the N-up parallel design engine:
Sean talks, it diverges into 4–5 structurally distinct rendered directions on one canvas, he
judges them side-by-side, grafts the winner — **and every pick is logged as the taste
instrument.**

Its own thesis sentence: *"let the picking itself be the measurement instrument."*

**That is the same mechanism the taste-curation blueprint proposed — built for generated
directions rather than harvested references, and it shipped first.**

### What exists now, verified on `main` @ `4e8394673`

| Artifact | Path | State |
|---|---|---|
| Verdict ledger | `docs/ai-workflow/design-brain/rejection-log.jsonl` | **LIVE**, append-only, 2 real rows |
| Schema + validator + writer | `scripts/design-brain/log-atelier-session.mjs` | **LIVE**, schema-enforced |
| Studio skill | `.claude/skills/swan-atelier-studio/SKILL.md` | **LIVE** |
| Rulings of record | `AI-HANDOFF/SWAN-ATELIER-STUDIO-R2-RULINGS-2026-08-18.md` | binding |

**The shipped row schema** (GLM R2, adopted verbatim — this is your `TasteVerdictRow`):

```
{ts, brief_id, archetype_ids[], plate_pack_id,
 variants:[{id, skeleton_id, outcome: killed|survived|winner,
            kill_rank?, pass?, reason_code?: idea|execution|style|structure|unknown,
            lever_deltas?}],
 null_winner, pending?, axes_to_flip?, rounds, wave2_used, cost_usd|null, wall_s|null}
```

Reader doctrine, already decided and **citable** — `scripts/design-brain/log-atelier-session.mjs:17`:
*"READER DOCTRINE: the log is append-only; for any brief_id the LAST line wins."* A `pending`
row is superseded by appending the resolved row with the same `brief_id`.

**What the writer exports** (so you do not hand-roll a parser): `LOG_PATH` (line 27) and
`validate(session)` (line 33). It exports **no reader** — that is your slice.

### The binding constraint this puts on you

The Atelier's R2 ruling **E1/E2/E6** states, in the writer's own header: *"no second log; this
JSONL is the structured form of the design-dialogue rejection log going forward."*

**So blueprint §5 Slice 0 — "create `TasteVerdictRow`" — is superseded. Do not create a second
row type or a second ledger.** Building one would put SwanStudios in the exact state this
workstream exists to prevent: two systems recording Sean's taste, neither authoritative.

---

## 2. THE REAL GAP — and it is larger than it looks

I checked for consumers. **`rejection-log.jsonl` has a writer and no reader.**

```
git grep -ln "rejection-log" -- . | grep -v log-atelier-session.mjs
→ .claude/skills/swan-atelier-studio/SKILL.md      (prose)
  AGENTS.md, CLAUDE.md                             (prose)
  5 × AI-HANDOFF/*.md                              (prose)
→ ZERO code consumers.
```

*Caveat on that grep:* it matches a literal string, so a consumer importing `LOG_PATH` without
naming the file would be missed. I checked that too — a second grep for
`LOG_PATH|design-brain.*jsonl|rejectionLog|readTaste|killOrder` across `*.mjs`/`*.ts`/`*.tsx`
returns **only the writer itself**.

And `git ls-files | grep -iE "taste\.profile|profile\.json"` returns **nothing** — no distilled
profile artifact exists anywhere in the repo.

**Consequence:** the taste instrument records Sean's judgments into a file nothing reads back.
Every pick he makes is captured, then does not influence the next generation. The loop is open.
*"The picking is the instrument"* is true about capture and **not yet true about effect.**

This is precisely the load-bearing question the blueprint answered and nobody has implemented:

> **How does curated taste enter generation?**
> **A router pre-brief consuming a profile artifact** — not compiler slots, which freeze the
> taxonomy too early. (`KIMI-TASTE-CURATION-BLUEPRINT.md` §4)

### The second gap, straight from real data

The only genuinely-resolved session in the log:

```
winner: A-field-report
kills:  reason_code = unknown, unknown, unknown
```

**Read the commit body before you interpret this row** (`b81ec65e8`, and credit to its author
for the honesty):

> *"Winner: A (side-rail, split hero, trust-first). B/C/D killed with reason_code=unknown —
> **Sean named only the winner; kill_rank values are CANVAS-ORDER PLACEHOLDERS, not his stated
> order.** One re-log corrects them if he ever gives reasons/order."*

So the precise truth is narrower and sharper than "three reasons went missing": **Sean was asked
for a winner and gave a winner.** The other three rows are inference, and the author labelled
them as such rather than letting them read as data.

**Hold this claim at the mechanism, not the person.** n = 1 resolved session, over a smoke
fleet. The durable finding is narrow and sufficient: **the capture path lets a kill be
recorded with no reason and nothing objects.** That alone justifies criterion 1 below. Do
**not** carry this row as evidence that "Sean's process is broken" — the only thing it
proves about Sean is that he was asked for a winner and gave one. What he actually wants is
on record from his own words *"he picks what he
likes and **says what specifically he likes about each**"*, and from `design-dialogue`, *"a
rejected option with a recorded reason is permanently settled; without one it comes back every
session and Sean re-argues a question he already answered."* The loop asked for one field and
the instrument wants five.

**⚠ The trap this sets for you, and it is the most dangerous thing in this document:**
`kill_rank` is populated with placeholders that are **indistinguishable from real data once
read programmatically.** A distiller that weights kill-rank will manufacture a taste signal out
of canvas ordering — a number that looks measured, is not, and gets more confident with every
session. Treat `reason_code: 'unknown'` as **"not asked"**, and `kill_rank` on such a row as
**absent**, not as rank data. Enforced in the reader — Slice 0′ criterion 2.

---

## 3. YOUR NEXT SLICE - do this one

**Slice 0-prime (revised): stop banking unrecoverable blanks, then make the ledger readable.**

Not "design a contract" - the contract shipped. Close the capture gap, then build the read side.

**Order is 1 -> 2 -> 3 -> 4, and criterion 1 is first for a reason:** the ledger is append-only
and Rule 34 forbids backfilling reasons Sean never gave. **Every session that runs before
criterion 1 lands banks another permanently-blank row.** The read side can be built any week;
the blanks cannot be recovered.

1. **Reason capture becomes non-optional - enforced in the WRITER, not in prose.**
   `reason_code: 'unknown'` is legal in the schema, and the schema is a ruling of record -
   **do not change it.** Change the writer so `unknown` requires an explicit opt-out (a
   `--skip-reason` style flag or equivalent), so *"Sean declined to say"* and *"nobody asked"*
   stop being the same byte.
   *Exit: a session JSON with a killed variant and no `reason_code` is REJECTED by `validate()`
   unless the explicit skip is present. Test both branches.*
   **Before you touch it:** this is another agent's reviewed, merged artifact. Read **all** of
   `SWAN-ATELIER-STUDIO-R2-RULINGS-2026-08-18.md` first - this handoff cites only E1/E2/E6 and
   does **not** know whether the rulings constrain capture-flow changes - then run
   `node scripts/lane.mjs digest` to find an owner and coordinate. If a ruling forbids it, stop
   and report; do not route around it.

2. **`readTasteLedger()`** - last-line-wins per `brief_id`, `pending` rows skipped. Import
   `validate()` from `log-atelier-session.mjs`; do not hand-roll a second parser.
   **This is where the placeholder quarantine belongs** (Kimi K3's correction to my first
   draft, and it is right): the reader must strip `kill_rank` from any row whose
   `reason_code` is `unknown`, so **every** downstream consumer inherits the protection.
   Quarantining inside `distil()` protects only `distil()` - the next consumer someone writes
   re-introduces the bug, and placeholder ordering becomes a taste signal by default.
   *Exit: a **fixture snapshot** of today's two rows plus a synthetic pending/resolved pair ->
   correct winner set.* **Test against a fixture, never the live ledger** - it is shared and
   append-only, so the next Atelier session in any tree would turn a live-file test red for an
   unrelated agent.
   *Edge case to decide explicitly and state in your closeout:* a `brief_id` whose only row is
   `pending` vanishes entirely under "skip pending". Decide whether that is silence or a warning.

3. **`distil()` -> `taste.profile.json`** - surviving skeletons, reason-code histogram,
   `profileVersion`, 90-day half-life weighting.
   - **Write it to a TRACKED path** (e.g. `docs/ai-workflow/design-brain/taste.profile.json`).
     **Not `.ai-workflow/`** - that is gitignored and tree-local, so a profile there would be
     invisible to every other agent and the loop would still be open.
   - **`kill_rank` weighting stays forbidden** - but the enforcement lives in the reader
     (criterion 2), not here. If you ever need ordering, add a provenance flag separating
     *stated* from *inferred* and default to inferred. *Test at this layer: a fixture with
     placeholder ranks and `reason_code: unknown` produces a profile with **no** ordering
     signal - and the test fails if anyone later starts weighting it.*
   - **The profile must self-mark low confidence at low n.** At n = 1 it is an anecdote. Carry
     `n` and a trust state; the blueprint's kappa >= 0.3 gate is the eventual bar, not this
     slice's.

4. **Router consumer - and it must consume the PROFILE, not the raw ledger.**
   `.claude/skills/swan-design-router/SKILL.md` (verified present on `main`) builds a pre-brief
   from `taste.profile.json`.
   *Exit: the pre-brief cites >=3 real **variant ids*** - **not** `brief_id`s, of which only one
   resolved session exists today, which would make the criterion unsatisfiable.
   *Plus a mutation test, because citation alone is gameable by pasting three strings:*
   **change a fixture row -> the pre-brief output must change.** That is the criterion that
   proves consumption rather than decoration.

**Why this order:** criterion 1 is time-critical and independent. Criteria 3 and 4 ship as a
**pair** so the distiller lands **with** a consumer - this document kills the Mobbin harvest for
"filling a ledger nothing consumes," and a profile nothing reads would be the same sin committed
with the author's own machinery. **If you cannot land 4, defer 3.**

> **Before you build criterion 4, settle open question 3 in section 5.** I specified the
> `swan-design-router` as the consumer because the blueprint said so - and the blueprint is
> mine. Kimi K3 pointed out the more obvious candidate, which I had never once mentioned:
> **the Atelier itself.** Its row already carries `axes_to_flip` and `lever_deltas`, which is a
> writer anticipating that verdicts feed the *next divergence*. If the profile should steer the
> Atelier's generation rather than a separate router pre-brief, criterion 4 changes target.
> **Do not assume my answer; it is the one thing in this slice I have a stake in.**

### Explicitly NOT in this slice

- **No Mobbin harvest** (blueprint Slice 1). Still wanted, but worthless until the read path
  exists - you would fill a ledger nothing consumes, at 30 results per call, with images landing
  in model context.
- **No `ReviewDeck` UI** (blueprint Slice 2). The Atelier already has a judging surface. Whether
  Slice 2 is needed at all is an **open question** now, not a scheduled slice - see section 5.
- **No schema change.** Ruling of record from a reviewed, merged build.

---

## 4. WHAT IS STILL TRUE FROM 08-14 (do not re-litigate)

> **One thing here is NOT re-verified: blueprint section 4's decisions.** This handoff says
> they "still hold." That is **PROVISIONAL** - I did not re-derive them against the shipped
> row, which carries `skeleton_id`, `lever_deltas` and `axes_to_flip`: taste channels the
> blueprint never considered. Treat section 4 as a strong prior and re-check it before
> building on any specific decision. Asserting staleness-free status without re-deriving is
> the exact sin this document accuses the 08-14 handoff of.

Re-verified today on `main` @ `4e8394673`, with the commands that produced each number:

- **Swan Forge: 16 modules.** `ls shared/*.mjs | wc -l` -> 15, minus the 2 non-Forge files
  (`clientOnboardingQuestionBank.mjs`, `sectionPatterns.mjs`) = 13; plus
  `ls shared/providers/*.mjs | wc -l` -> 3. CLI `scripts/forge.mjs` present. **9/9** test
  files present under `backend/tests/unit/`.
- **Seed is dead. Image-to-image is dead.** Both probed with a control arm, with real money.
  **Do not re-test.**
- Images go to OpenRouter **`/api/v1/images`**; the cost field is `usage.cost`.
- **The primary checkout is ~2000 commits behind `origin/main`** and drifting. Measure it, do
  not trust that figure: `git -C <primary> rev-list --count HEAD..origin/main`. **Work from a
  worktree on `main`.**
- **A push to `main` is a production deploy and runs migrations.**
- **`.ai-workflow/` is gitignored** — anything inside it exists only in the tree that made it.

---

## 5. OPEN QUESTIONS — for Sean, not for you to assume

1. **Is the Mobbin reference-curation loop still wanted, now that the Atelier generates
   directions to judge?** Sean's original complaint was *"the AI is just picking ten or twenty
   and automatically using them."* The Atelier answers the **judging** half. It does not answer
   *"I want to see what's out there."* My read: **still wanted, lower priority** — but that is
   his call, and Slice 1–2's cost is much harder to justify than it was on 08-14.
2. **Does the Atelier's judging surface replace `ReviewDeck`?** If yes, blueprint Slice 2
   deletes, and its accessibility criteria (≥44px @375, axe 0, ≤2:30 for 50) transfer to the
   Atelier canvas as a review item.
3. **Should the taste profile feed the ATELIER directly, instead of a router pre-brief?**
   Raised by Kimi K3 against my draft, and it is the sharpest question here. The blueprint's
   answer ("a router pre-brief consuming a profile artifact") predates the Atelier's existence.
   The Atelier's own row schema carries `axes_to_flip` and `lever_deltas` - fields that only
   make sense if verdicts are meant to shape the next generation. **The blueprint's answer is
   mine, so treat my confidence in it as suspect.** Settle this before criterion 4 is built:
   the wrong answer wires taste into a surface Sean does not actually design through.
4. **The blind A/B is still unruled.** `.ai-workflow/forge-runs/ab-blind.html` — **primary
   checkout only**, verified present today. Kill-list still ships OFF (`FORGE_KILL_LIST=1`).
   Sixty seconds of Sean's time unblocks a shipped feature.

---

## 6. HOW TO WORK HERE

- `node scripts/lane.mjs digest` at session start; `claim` before your first edit. **~40 lane
  files from parallel sessions existed today; 13 stale ones still hold locks.** Never write
  another session's lane.
- **Rule 73 — proof before done.** No completion claim without current-session command output
  **and** a hostile pass that ran dry, in the same message.
- **The dry-loop is not ceremony.** On 2026-08-14 it found **nine defects in a handoff document
  already shipped as finished** — a module count that was really the folder count, a path that
  resolved to nothing from the tree the document told the reader to use, and one of my own
  fixes breaking the markdown. Round 8 found the index entry still repeating an error round 1
  had fixed. **Fixing a claim in one place is not fixing it — sweep repo-wide with `git grep`.**
- **Verify before repeating a blocker.** Another agent may have fixed it. One blocker in this
  workstream was reported four times after being fixed days earlier.
- **Committed ≠ delivered.** `local-commit` → `pushed-branch` → `merged-to-main`.

---

## 7. THE LESSON THIS HANDOFF IS ITSELF AN INSTANCE OF

I wrote a blueprint on 08-14 whose Slice 0 was *"define the taste verdict row."* Five days
later that row exists, shipped by a different agent, with a binding ruling against a second
one. **I did not discover this by remembering — I discovered it by grepping `main` before
writing.**

Written from memory, this handoff would have sent the next agent to build a duplicate ledger in
direct violation of a merged ruling, and the collision would have surfaced at integration, days
later, with both halves already built.

**With this many agents on one tree, the first step of any handoff is re-grounding against
`origin/main` — not recalling what you decided. A five-day-old plan is a hypothesis.**
