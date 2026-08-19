---
title: Taste curation — the next slice, reconciled against the Atelier that shipped underneath it
originating_model: claude-opus-5
date: 2026-08-19
decision: Do NOT build a second taste ledger. The verdict row already shipped; build the READ side.
status: open
supersedes: none (extends SWAN-CONTINUATION-HANDOFF-2026-08-14.md)
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

Reader doctrine, already decided: **append-only; for any `brief_id` the LAST line wins.** A
`pending` row is superseded by appending the resolved row with the same `brief_id`.

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

**That is still Sean's original ask failing in production** — his words were *"he picks what he
likes and **says what specifically he likes about each**"*, and from `design-dialogue`, *"a
rejected option with a recorded reason is permanently settled; without one it comes back every
session and Sean re-argues a question he already answered."* The loop asked for one field and
the instrument wants five.

**⚠ The trap this sets for you, and it is the most dangerous thing in this document:**
`kill_rank` is populated with placeholders that are **indistinguishable from real data once
read programmatically.** A distiller that weights kill-rank will manufacture a taste signal out
of canvas ordering — a number that looks measured, is not, and gets more confident with every
session. Treat `reason_code: 'unknown'` as **"not asked"**, and `kill_rank` on such a row as
**absent**, not as rank data. See Slice 0′ criterion 3.

---

## 3. YOUR NEXT SLICE — do this one

**Slice 0′ (revised): make the ledger readable, and make one reason mandatory.**

Not "design a contract" — the contract shipped. Build the read side and close the reason gap.

**Exit criteria, all measurable:**

1. **`readTasteLedger()`** — parses `rejection-log.jsonl`, applies last-line-wins per
   `brief_id`, skips `pending` rows. *Test: the 2 real rows + a synthetic pending/resolved
   pair → correct winner set.* If `log-atelier-session.mjs` already exports usable validation,
   **import it — do not hand-roll a second parser.**
2. **Router consumer stub** — `swan-design-router` builds a pre-brief citing ≥3 real
   `brief_id`/variant ids read from the ledger. *This was the blueprint's original Slice 0 exit
   criterion and it is still the right one:* the router must prove it can read taste before
   anything is built on top of it.
3. **`distil()` → `taste.profile.json`** — surviving skeletons, reason-code histogram,
   `profileVersion`, 90-day half-life weighting (blueprint §4). **`kill_rank` MUST be excluded
   from any weighting unless the row proves Sean stated it** — today's values are canvas-order
   placeholders (§2). If you need ordering later, add a provenance flag distinguishing *stated*
   from *inferred* and default to inferred; never let a placeholder become a weight.
   *Test: a fixture with placeholder kill-ranks and `reason_code: unknown` must produce a
   profile carrying **no** ordering signal — and the test must fail if someone later starts
   weighting it.*
4. **Reason capture becomes non-optional at the kill step.** `reason_code: 'unknown'` is
   permitted by the schema — **do not change the schema**, it is a ruling of record. Change the
   *capture path* so the Studio asks for a reason and falls back to `unknown` only on an
   explicit skip. *Test: a kill with no reason supplied is flagged, not silently defaulted.*
   State in your closeout that historical `unknown` rows **stay** `unknown` — Rule 34, no
   backfilling data Sean never gave.

**Order matters: 1 → 2 → 3.** Getting a reader and a proven consumer in place before the
distiller means the distiller is written against a known-good sink instead of a guess. Same
"the consumer determines the schema" lesson that made the original Slice 0 the contract slice.

### Explicitly NOT in this slice

- **No Mobbin harvest** (blueprint Slice 1). The reference-curation half is real and still
  wanted, but it is worthless until the read path exists — you would be filling a ledger
  nothing consumes, at 30 results per call, with images landing in model context.
- **No `ReviewDeck` UI** (blueprint Slice 2). The Atelier already has a judging surface.
  Whether Slice 2 is needed at all is now an **open question**, not a scheduled slice — see §5.
- **No schema change.** Ruling of record from a reviewed, merged build.

---

## 4. WHAT IS STILL TRUE FROM 08-14 (do not re-litigate)

Re-verified today on `main` @ `4e8394673`:

- **Swan Forge: 16 modules** (13 in `shared/` + 3 providers), CLI `scripts/forge.mjs`,
  **9/9 test files present.** Intact.
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
3. **The blind A/B is still unruled.** `.ai-workflow/forge-runs/ab-blind.html` — **primary
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
