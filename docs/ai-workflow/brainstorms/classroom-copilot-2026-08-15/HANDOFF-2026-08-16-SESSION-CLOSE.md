# SESSION HANDOFF — 2026-08-16 close

**Read `NEXT-AGENT-HANDOFF.md` FIRST. It is the governing plan and it outranks this file.**
This document is a delta: what changed today, one premise change that invalidates old reasoning,
and the traps that cost this session real time. It does not restate the plan.

---

## 0. THE LEAK GATE — before you touch anything

The pattern list lives **outside the repo** at `.ai-workflow/private/scan-patterns.local.txt`
(git-invisible; confirmed with `git check-ignore -v`). **17 patterns.** Never type them inline.

```bash
grep -qEif .ai-workflow/private/scan-patterns.local.txt "$FILE" && { echo "LEAK — ABORT"; exit 1; }
```

**Two ways I got this wrong today — both worth your attention:**

1. I typed my own 10-pattern copy inline in every gate command for ~7 hours and reported
   "GATE PASS" as if it meant something. It was at ~60% coverage. Switching to the real file
   immediately found **two already-committed files** carrying a protected term. Redacted;
   local-only, never pushed; history not rewritten (Sean's call).
2. **My gate printed `LEAK` and then committed anyway**, because the loop echoed a verdict and the
   `git add && git commit` was chained unconditionally after it. A gate that reports instead of
   blocking is not a gate. Use `FAIL=1` + `exit 1` **before** staging, and exercise the failing
   path once before you trust it.

Also: **models invent example names, and they occasionally hit the protected list by coincidence.**
Happened twice today (one in an illustrative roster pair, one in a substring-collision example).
Both were model-invented — the packets carry only `C1..Cn` codes — but coincidence is unfalsifiable
to a later reader. Redact and move on. Consider instructing models to use `C1..Cn` in *examples*
too, not just in data.

**And a subtle one: I injected what the gate protects.** My consult remit told the models to ignore
the owner's brand *by name*, so the protected term entered every packet and came back in the
replies. Write remits that describe what to ignore without naming it.

---

## 1. PREMISE CHANGE — this is a product, not a favour

**Sean, 2026-08-16: "This is a program we're building for her, and it is something we can build for
other teachers. I plan on trying to sell it to schools. It will eventually be a product, but we're
going to start with just her. So it needs to be extremely special and enterprise level."**

Every review round to date was scoped to *"zero second users exist."* That premise is load-bearing
under several locked bans. **The bans may still be right — but their stated justifications have
expired and must be re-argued rather than inherited:**

| Locked ban | Justification given | Status under the new premise |
|---|---|---|
| No accounts / auth / "tiny backend" | *"the developer never sees a byte"* — avoids becoming a regulated operator | **Reasoning expired.** Selling to schools makes you a data processor by definition. The ban is correct for v1-with-her; it cannot be the permanent shape of a product. |
| No enterprise / multi-teacher sharing | *"zero second users exist; shared infra creates operator status and a different buyer"* | **Directly contradicted.** The different buyer is now the intended buyer. |
| No iOS port | *"zero second users exist"* | **Reasoning expired.** Still correct to defer, but for cost reasons now, not absence-of-users. |
| No cloud vendor in the child-data path | sensitivity outranks capability | **Still correct**, and now *more* load-bearing — this becomes a sellable property, not a limitation. |
| No photos | biometric-class PII of minors | **Still correct**, and now a competitive/liability position rather than a scope cut. |

**What does NOT change:** v1 for her. The H0 gate, the freeze, the five-day clock, the current
plan's step order. Do not let the commercial framing pull work forward — the fastest route to a
sellable product is still one teacher who genuinely uses it for a month.

**What this ADDS, unscheduled and unestimated — flag to Sean, do not start:**
- Selling to a school makes you a processor of children's records: DPAs, retention policy as a
  contract term, breach notification, parental access/deletion rights, and a named legal basis.
  The current architecture's *absences* are a strong starting position; the paperwork is not built.
- The "one user, one device, no server" design has no multi-tenant story at all. That is fine
  today and is a from-scratch design problem later — not a refactor.
- **Enterprise-grade for one** is the right near-term reading: robustness, recoverability, and
  provable privacy. That is what the current plan already builds.

---

## 2. WHAT THIS SESSION PRODUCED

**Rule 82 is live on `origin/main` (`8257e42b6`)** — full-spectrum panels, no narrow lenses; roles
declared, never restrictive. Added by hand to both constitution files, byte-identical bodies,
mirror sync deliberately not used; constitution guard confirmed 81→82, 0 removed/renumbered. This
is the governing plan's step 5(a), done as specified.

**Two unlensed panel rounds** (GLM 5.3 · Kimi K3 · HY3 — $0.52 total):
- R4 found six defects the lensed round never produced, incl. Android Auto Backup exfiltrating the
  child DB with zero code written.
- R5 reviewed *my own* decisions and destroyed the biggest one (below).

**The blueprint** (`r4-blueprint.html`, published) now carries a **frozen event-emission contract**:
ordering by monotonic `seq` never wall-clock `at_ut`; one `HANDOFF` + one `HANDOFF_ITEM` per
constituent record with `child_snapshot`; strikes **computed** not emitted; compensating
`unaccepted` event for undo; `record_id` deliberately FK-free so the retention purge cannot erase
kill-criteria evidence. Security floor moved S12 → S1.

**The enum was reconciled to the working sorter** — the document yielded to measured code:
`observation · child_followup · parent · supply · prep · idea · admin`. `child_followup` (the
highest-sensitivity class) had **no home in the schema at all**. Also added `bucket ∈
must|should|extra`, which the sorter already computes and the schema would have discarded on every
record — meaning **S4 is cheaper than its 3-day estimate**.

**One mapping is inferred, not verified:** `activity → idea`. Confirm with the sorter's author.

---

## 3. THE NUMBER THAT MATTERS

From the **existing** harness (`sorter/heldout-run.mjs`), which I ran rather than built:

> **100%** on its own corpus · **53.3%** on held-out phrasing · **0** false positives ·
> **0** child-link violations · **0** unflagged child items

Rules-only is **safe but not sufficient** — it fails by omission, not by error. The model buys
*recall*, not safety. This is the baseline the governing plan's step 5(b) test must beat.

**Both R5 reviewers filed DISSENTs claiming nobody had proposed this test. They were wrong — it
already existed.** Treat panel dissents as hypotheses about the repo, not facts about it.

**One real defect found in it, filed not fixed:** `child_followup` matches only *behavioural*
vocabulary (cried, hit, bit, struggled) and has **no health words**, so "has a rash, told her dad
at pickup" files as `parent`. Highest-sensitivity class, cheapest possible fix. Details in
`.ai-workflow/coordination/review-queue.md`.

---

## 4. TRAPS THAT COST ME TIME

- **I worked the whole session from a superseded handoff.** `NEXT-AGENT-HANDOFF.md` supersedes
  `HANDOFF-PROMPT.md` and says today's primary task was already absorbed into completed rounds. I
  found it by accident, reading a staged file list. **Check for a newer handoff before trusting one.**
- **Another agent is working this same directory concurrently.** Lanes `s5a8468ed` (sorter/desk)
  and `sb25355c2` (h0-setup) were in-progress. **Do not edit `sorter/`, `desk/`, `h0-setup/`** —
  file findings to `review-queue.md` instead. Read `.ai-workflow/coordination/*.lane.md` first.
- **Numbering collision:** two agents independently used `50-`/`51-`/`70-`/`72-` prefixes in this
  folder. Check what exists before you pick a number.
- **`.git/index.lock` was held ~20 minutes** by the other agent. Do not seize it. Wait, retry, and
  say so if it blocks you.
- **My own checkers produced five false positives** — brace counts confused by `||--o{` mermaid
  cardinality, "misaligned" wireframes that were trailing annotations, phrases split by blockquote
  markers and line wraps. **Prove the checker right before acting on it** — but do not dismiss it
  either: behind one false alarm sat two genuine defects.
- **I filed a bug against Sean's Stop gates with evidence that was a measurement artifact** — I ran
  the gate's own logic mid-turn, which changes what it reads. Retracted in a comment on **SWA-167**.
  A probe that runs inside the system it measures needs validating first.

---

## 5. DO THIS NEXT

Straight from the governing plan — **do not add to it:**

1. **Two text messages to T, tonight** (Sean's, not yours): where is the laptop at midday rest
   time? what does the school's parent app already record per child per day? Both have survived
   multiple paid panels while being one text each.
2. **Install H0** — one evening. Everything exists: print `h0-setup/`'s four pages (*Assistant
   Card*, *Incident Record*, *Three Buckets*, *Week One Watchlist*), run `SETUP-RUNBOOK.md`
   end-to-end including the co-design walkthrough, and **let her say when the 5-day clock starts.**
3. **Then freeze.** No new artifacts, no reviews, no slices while the gate runs.
4. **Sanctioned work only during the freeze:** the compressed-coach-contract behavioural test
   against the 53.3% baseline (this test *is* the port decision), and the Village plan-mode fix
   (`debatePanels` into the gate at `validation-orchestrator.mjs:2203`).

**No code is needed for any of the above.** The next action is a printer and an evening.

**The question that outranks all of it, for T directly:** did she want a program for the year, or
relief this month? Her answer is allowed to shrink the whole thing — and if it's the second, most
of what has been designed can wait indefinitely without loss.

---

## 6. METHOD REFERENCE

**What we ran is NOT the AI Village.** The Village is the paid 15-brain orchestrator
(`scripts/validation-orchestrator.mjs`), currently broken in plan mode.

What we ran is the **unlensed full-spectrum panel (Rule 82)** — one identical packet, every model
answering every angle, roles declared but never restrictive, `DISSENT` mandatory:

```bash
node scripts/consult-glm.mjs  --document <packet.md> --out <reply.md> --model glm-5.3   # $0, slow
node scripts/consult-kimi.mjs --document <packet.md> --out <reply.md> --confirm-spend \
  --remit '<explicit full-spectrum remit>'                                              # ~$0.2–0.3
node scripts/consult-hy3-design.mjs --document <packet.md> --out <reply.md> --confirm-spend \
  --remit '<explicit full-spectrum remit>'                                              # ~$0.007
```

**The `--remit` override is mandatory, not optional.** Both paid scripts default to narrow,
brand-specific remits (`options.remit || defaultRemit`); omitting it silently reintroduces exactly
the lensing Rule 82 bans. **Check `completion_tokens` against the cap** — a truncated reply loses
its tail, which is where build order and do-NOT lists live.

Invoke it in conversation as: *"run an unlensed panel on this."*
